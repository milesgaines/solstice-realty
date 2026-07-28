# Test coverage analysis & proposal

Status: **no automated tests exist.** No `package.json`, no test runner, no test files, and
the only CI job (`.github/workflows/pages.yml`) checks out the repo and deploys it. Effective
coverage of the ~2,900 lines of hand-written application JS is **0%**, and every push to
`main` goes straight to production with no gate.

This document proposes where to start. It is ordered by expected value, not by ease.

---

## Constraints this proposal respects

The repo is deliberately zero-build (see `CLAUDE.md`): every file shipped is the file served.
Any test setup must not change that.

- Tests live in `test/`, dependencies in `package.json` under `devDependencies` only.
- Nothing in `test/` or `node_modules/` may ever be referenced by a shipped page.
- `.github/workflows/pages.yml` keeps deploying the repo root as-is. Add a **separate**
  `test.yml` workflow rather than adding a build step to the deploy path.
- Because `js/*.js` are classic scripts assigning to `window.*`, they can be loaded into a
  test by evaluating the file in a `jsdom` window or a `vm` context — no module conversion
  and no source changes required for most of what follows.

Suggested stack: **Vitest + jsdom** for units, **Playwright (Chromium)** for the handful of
end-to-end guarantees. Both are devDependencies; neither touches the deployed artifact.

---

## Tier 1 — Pure logic that is silently wrong today

These are the highest-value targets: pure functions, no DOM, no network, and each one
already has a confirmed defect that a first test would have caught.

### 1.1 `aiParse()` — `js/app.js:37`

This is the offline fallback for the entire search experience (`runAI()` calls it whenever
`sir-search` fails), so it runs precisely when the site is already degraded. It is pure,
takes a string, returns a filter object — the easiest thing in the repo to test, and the
least tested.

Confirmed mis-parses:

| Input | Parsed as | Expected |
|---|---|---|
| `"beach house 10 to 20 minutes from pier"` | `min=10, max=20000000` | no price constraint |
| `"3 bed 2 to 4m calabasas"` | `min=2, max=4000000` | `min=2000000` |
| `"homes in malibu or calabasas"` | `community="Calabasas"` | first mentioned, or ambiguous |

The first two share a root cause: `[\d.,]+\s?[mk]?` is unanchored, so the `m` in `minutes`
is consumed as a millions suffix, and in a range only the bound that carries an explicit
suffix gets the multiplier. The third is `COMMUNITIES.forEach` assigning unconditionally —
the result is array order, not mention order.

Also worth pinning: `"modern"` both sets `sort=year-desc` **and** is added to `f.q`, so it
then has to appear literally in a listing's tagline/view/features to survive `apply()`.

### 1.2 `apply()` filter + sort — `js/app.js:77`

Confirmed: a listing with no `beds` field **passes** a "4+ bedrooms" filter, because
`undefined < 4` is `false`. MLS rows routinely arrive with missing fields, so this leaks
studios into bedroom-filtered results. Same shape of bug for `baths`.

Other behaviours that need pinning because they are load-bearing and undocumented:

- Leases skip the price filter entirely (`if (!l.lease)`), so a $25k/mo lease shows up
  under a "$0–$2M" price band. Whether that is right is a product call — test it either
  way so it stops being accidental.
- The sort comparator's `pin` → `featured` → user-choice ordering is called out in
  `CLAUDE.md` as an invariant to preserve. It is exactly the kind of thing a later refactor
  breaks silently. One test, permanently.
- `price-asc` maps POA listings to `Infinity` and `price-desc` maps them to `0`, so
  "Price Upon Request" sorts last in both directions. Intentional; assert it.

### 1.3 `mergePinned()` — `js/app.js:11`

Donna's spotlight listing must survive every backend fetch, deduped by normalized address
so a real DB row wins. Four cases: non-array input, empty feed, feed already containing the
pinned address (must not duplicate), feed with the address in different case/whitespace.

### 1.4 `today()` and `ago()` — `leads.html:206`

Confirmed: `today()` is `new Date().toISOString().slice(0,10)` — **UTC**. Donna is on
Pacific time. Verified at 6:30pm PT it returns the *next* day.

Consequences: the `due` flag in `card()` (`l.next_followup <= today()`) marks follow-ups
overdue a full day early every evening, and exported CSVs are stamped with tomorrow's date.
A three-line test with a frozen clock catches it.

### 1.5 `normalizeRESO()` — `js/idx.js:48`

`CLAUDE.md` designates this the canonical RESO→app field mapping, and it sits on a dead
code path, so nothing exercises it and nobody would notice it rotting.

Confirmed mapping bug: `waterfront: !!p.property?.waterSource`. In RESO, `WaterSource` is
the water *supply* (`"Public"`, `"Well"`) — not waterfront. Essentially every record with a
water utility gets a "Waterfront" badge. Table-driven tests over a few fixture records
(missing photos, missing geo, lot-size acre conversion, `bathsFull` vs `bathrooms`
fallback) cost very little and lock the shape down.

### 1.6 Mortgage math — `updateCalc()`, `js/app.js:262`

This publishes dollar figures to prospective buyers and is currently unreachable by a test
because it reads sliders from the DOM and writes back to the DOM in one function. Extract a
pure `monthlyPayment(principal, annualRatePct, years)` and test it against known amortization
values plus the zero-rate branch. Small, safe refactor; the DOM wrapper keeps working.

---

## Tier 2 — Security regression tests

The CRM pages have an escaping discipline (`esc`, `safeUrl`, `cssBg`) that `CLAUDE.md`
documents as mandatory for untrusted content. Nothing enforces it, and it has **already
drifted**.

### 2.1 The escaping helpers have no contract tests

`esc()` handles `& < > "` but not `'`. That is safe only as long as every attribute in every
template stays double-quoted — an invariant currently held by convention alone. Test the
helper's actual contract (including the `'` gap, so the limit is explicit), and test
`safeUrl()` against `javascript:`, `data:`, protocol-relative `//evil`, and leading
whitespace/control characters.

### 2.2 `listings.html` never declares `safeUrl` — drift already happened

`CLAUDE.md` states all three CRM pages redeclare the helper trio. `dashboard.html` and
`leads.html` do. `listings.html` declares only `esc` and `cssBg`. This is the documented
"CRM triplicates its boilerplate" rough edge producing a real divergence.

### 2.3 `js/app.js` has no escaping at all — confirmed stored-XSS path

The public site renders backend and MLS data with raw template interpolation throughout:

```
js/app.js:131   <img loading="lazy" src="${l.hero}" alt="${l.address}">
js/app.js:227   <a class="btn btn-ghost" href="${l.tour}" target="_blank" rel="noopener">
js/app.js:123   <article class="card" onclick="openDetail('${l.id}')">
```

`l.tour` reaches `href` with no `safeUrl`, and `listings.html:188` (`#f_tour`) is a free-text
input with no validation whose value is persisted via `sir-listings` and served to every
public visitor. CRM input → public `href` with nothing in between. `l.id` is interpolated
into a single-quoted JS string literal inside a double-quoted attribute; for MLS rows that id
is `"MLS-" + p.mlsId` from a third-party feed.

Whether the fix is escaping in `app.js` or validation server-side, the tests are the same
shape: render `cardHTML()` / `openDetail()` against a hostile listing fixture and assert no
script executes and no attribute breaks out.

### 2.4 CSV injection in `exportCSV()` — `leads.html:398`

The `q()` helper is correct RFC-4180 quoting but has no formula guard. A lead note or name
beginning with `=`, `+`, `-`, or `@` is written verbatim and executes when the export is
opened in Excel. Verified: `=cmd|' /C calc'!A0` round-trips unmodified. Lead names and notes
come from the social-prospecting sweep, so they are untrusted by definition.

---

## Tier 3 — The graceful-degradation guarantee

`CLAUDE.md` calls this a hard requirement: *"Never introduce a code path that leaves a blank
page when the backend is unreachable."* Nothing verifies it. This is where a small Playwright
suite earns its keep — four specs, all offline:

1. Block `**/*.supabase.co/**`, load `index.html`, assert listing cards still render from the
   bundled `LISTINGS` fallback and `#count` is non-zero.
2. Stub `sir-search` to fail, run a search, assert `aiParse()` took over and results narrowed.
3. Stub `sir-properties?source=mls` to fail, flip the MLS toggle, assert it reverts to
   "Solstice featured" and the featured grid is intact.
4. Force `withTimeout` to fire (`js/api.js:20`, 9s) and assert the same fallbacks hold —
   timeout and error take different paths through the callers.

Chromium is already available in this environment, so this needs no download step.

---

## Tier 4 — Contract tests worth having, lower urgency

- **`js/api.js`** — each of the five wrappers against a mocked `fetch`: non-2xx, `{error}` in
  a 200 body, malformed JSON, and timeout. `apiListings` drops `Infinity` and empty-string
  params when building the query string; that is deliberate and untested.
- **CRM auth** — the 401-clears-token-and-reloads behaviour is copy-pasted in three files.
  One shared test run against all three catches the next drift the way §2.2 would have
  caught this one.
- **`downscale()`** (`listings.html:301`) — aspect-ratio preservation and the no-upscale
  branch for images already under 1600px.
- **`matchHomes()`** (`leads.html:365`) — bidirectional `includes` matching means a lead
  located in `"CA"` matches nothing while `"Malibu, CA"` matches Malibu; short location
  strings produce surprising matches. Worth pinning before anyone tunes it.

---

## Suggested sequence

1. Add `package.json` (devDependencies only), `test/` and a `test.yml` CI workflow that runs
   on PRs and on `main`. Leave `pages.yml` untouched.
2. Tier 1.1–1.4 as the first suite — pure functions, no DOM, immediate red tests against the
   confirmed defects above.
3. Fix those defects with the tests as the spec.
4. Tier 2 next; §2.3 is the one with real external exposure.
5. Tier 3 last — highest setup cost, but it is the only thing that can enforce the
   degradation requirement `CLAUDE.md` treats as non-negotiable.

Note that Tiers 1 and 2 describe **bugs that currently exist**, not hypothetical regressions.
The tests are worth adding on their own; finding these while writing them is the argument.
