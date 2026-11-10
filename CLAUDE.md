# CLAUDE.md

Guidance for Claude Code (and other AI assistants) working in this repository.

## What this repo is

The repo root is a **static, zero-build website** for Solstice International Realty
(Donna Bohana, Broker/Owner — coastal California luxury real estate). There is no
`package.json`, no bundler, no transpiler, no test suite, and no dependency directory.
Every file shipped is the file served.

That website is itself **two apps** that happen to share a domain:

| App | Pages | Audience | Styling |
|-----|-------|----------|---------|
| **Public marketing site** | `index.html` (+ `privacy.html`, `terms.html`) | Buyers/sellers | External CSS in `css/`, JS in `js/` |
| **Private CRM** | `dashboard.html`, `leads.html`, `listings.html` | Donna only | Fully self-contained: inline `<style>` + inline `<script>` per page |

They are deliberately **not** coupled. The CRM pages do not load anything from `css/` or
`js/` — each is a single-file app. Don't "refactor" them into shared modules without
being asked; the isolation is what keeps the marketing site's heavy WebGL/GSAP layer out
of the CRM.

### …and an unrelated side project rides along

`concepts/` and `ios/` hold **BeMeh**, a virtual-esthetician app concept that has nothing
to do with real estate. It shares this repo only because it shares the git history — no
realty page links to it, and no BeMeh file imports anything from `css/`, `js/`, or
`assets/`. See "The BeMeh side project" below.

**Assume a task is about the realty site unless BeMeh, `ios/`, `concepts/`, TestFlight,
or the esthetician app is named.** Changes to one side never require changes to the
other.

## Backend (lives outside this repo)

All dynamic data comes from **Supabase Edge Functions** at:

```
https://enktupvwcsojqthiimvu.supabase.co/functions/v1
```

**The edge function source code is NOT in this repository.** You can only change how the
frontend calls these endpoints, not what they do. Functions in use:

| Function | Called from | Purpose |
|----------|-------------|---------|
| `sir-properties` | `js/api.js`, `leads.html` | Public listing feed (`?source=mls` proxies the real MLS server-side) |
| `sir-search` | `js/api.js` | Server-side natural-language search → `{filters, explanation, count, results, ai}` |
| `sir-lead` | `js/api.js` | Lead capture (contact form, tour request, valuation) |
| `sir-valuation` | `js/api.js` | AVM home valuation |
| `sir-market` | `js/api.js` | Cached market stats (RentCast) for the `#market` section |
| `sir-leads` | `dashboard.html`, `leads.html`, `listings.html` | CRM auth (`action:"login"`), lead list/create/update/delete |
| `sir-dashboard` | `dashboard.html` | Aggregated dashboard payload |
| `sir-listings` | `listings.html` | CRM listing CRUD + `action:"upload"` photo upload |
| `sir-social-scan` | `leads.html` | Social prospecting sweep |

**The Supabase anon key is intentionally committed** and duplicated in four places
(`js/api.js` and each of the three CRM pages). It is a public key protected by RLS +
server-side validation — do not treat it as a leaked secret, and do not try to "hide" it
in a static site. Real credentials (MLS, AI, RentCast) live server-side in the edge
functions.

CRM auth is a bearer token from `sir-leads` stored in `localStorage.sir_leads_token`. A
`401` from any CRM endpoint clears the token and reloads the page.

## File map

```
index.html          Public site — all sections in one file; ends with inline IIFEs
                    (community grid, market cards, typewriter placeholder, hero Ken-Burns)
dashboard.html      CRM home: tiles, "needs you now" hot leads, funnel, open houses
leads.html          CRM lead radar: filter/stage/temperature, notes, lead↔listing match, CSV export
listings.html       CRM listing manager: CRUD, drag-drop photo upload w/ client-side downscale
privacy.html        Static legal page (no JS)
terms.html          Static legal page (no JS)

css/styles.css      Design system + base layout. Palette sampled from solsticeir.com.
css/theme.css       "Solar Luxe" glassmorphism, layered over styles.css
css/overhaul.css    "Clean app" redesign — loads late, wins the cascade
css/addons.css      Loads LAST: off-market CTA strip, pinned-spotlight card
css/immersive.css   ⚠️ ORPHANED — not referenced by any page

js/data.js          BRAND facts, COMMUNITIES, COORDS, and the bundled LISTINGS fallback.
                    Exposes window.SOLSTICE.
js/api.js           Supabase edge-function client. Exposes window.SIR_API.
js/predict.js       Live 12-month market projections off the sir-market feed.
                    Exposes window.SIR_PREDICT. See "Live money & predictions".
js/odometer.js      Count-up animator for every $ amount / figure on the page.
                    Exposes window.SIR_ODOMETER. See "Rolling numbers".
js/idx.js           Direct-from-browser IDX/MLS adapter (SimplyRETS). Loaded but its
                    fetchMLS() is never called — app.js uses SIR_API instead. See below.
js/app.js           Main app logic: filters, sort, cards, detail modal, mortgage calc,
                    favorites, compare, Leaflet map, valuation, contact form.
js/atmos-ui.js      Loader + custom cursor + ambient sound. Loaded in <head>, NOT deferred.
js/globe.js         globe.gl "Global Portfolio" globe with gold arcs
js/motion.js        GSAP/ScrollTrigger cinematics, [data-count] count-ups. Supports Lenis
                    smooth scroll but degrades to its own rAF loop — Lenis isn't loaded.
js/overhaul.js      Mobile bottom tab bar + nav solid-on-scroll
js/hero-gl.js       ⚠️ ORPHANED — raw-WebGL liquid hero, superseded by the CSS Ken-Burns
js/atmosphere.js    ⚠️ ORPHANED — raw-WebGL aurora background, removed for readability/perf

assets/img/         Donna's real photos, local same-origin copies (required for WebGL)
.nojekyll           Stops Pages from filtering underscore-prefixed paths

.github/workflows/pages.yml       GitHub Pages deploy (whole repo root, on push to main)
.github/workflows/testflight.yml  iOS compile check + manual TestFlight upload — BeMeh only

concepts/bemeh/     BeMeh pitch page + installable PWA prototype (unrelated to realty)
ios/BeMeh/          BeMeh SwiftUI iOS app + Xcode project + ship.sh
```

### The three orphans

`css/immersive.css`, `js/hero-gl.js`, and `js/atmosphere.js` are dead code kept in the
tree — earlier immersive-layer iterations that were pulled from `index.html` for
readability and mobile performance (see the comment above the script tags in
`index.html`). Don't wire them back in, and don't delete them, unless asked.

### The `idx.js` dead path

`js/idx.js` is a working browser-side SimplyRETS adapter pointed at the public demo feed.
It is still loaded by `index.html` and exposes `window.SOLSTICE_IDX`, but `app.js`'s
`setSource("mls")` calls `SIR_API.apiListings({source:"mls"})` instead, so the MLS now
flows through the server-side proxy. Keep `normalizeRESO()` in mind as the canonical
RESO→app field mapping if you ever touch listing shapes.

## Running and deploying

```bash
# from the repo root — the repo root IS the web root
python3 -m http.server 8137
# → http://localhost:8137
```

Open with a real HTTP server, never `file://` — the `fetch` calls, module loading, and
same-origin image requirements for WebGL all need it.

Deploy is automatic: **push to `main`** → `.github/workflows/pages.yml` uploads the repo
root as a Pages artifact and deploys it. There is no build step to run or verify.

The artifact path is `'.'` — **everything in the repo is published**, including
`concepts/` and the `ios/` Swift sources. Nothing is excluded and there is no ignore
list. `concepts/bemeh/` carries `noindex, nofollow` so it stays out of search results,
but it is still fetchable by URL. Treat any file you add here as public: don't commit
anything to this repo you wouldn't serve.

## Conventions to follow

**JS module style.** Every file in `js/` is a *classic* script (no ES modules), wrapped in
an IIFE, exposing **exactly one** `window.*` global. This is enforced by convention and
called out in each file's header comment. Follow it:

```js
(function () {
  'use strict';
  // ...
  window.SolsticeThing = { init, destroy };
})();
```

`js/app.js` is the exception — it runs at top level and attaches many `window.*` handlers
because the HTML uses inline `onclick="..."` attributes throughout.

**Script order in `index.html` matters.**
1. `atmos-ui.js` in `<head>`, **not deferred**, so the loader covers first paint.
2. Libraries from CDN; **Leaflet last** among libraries so nothing clobbers the global `L`.
3. Core, in this order — each depends on the ones before it:
   `data.js` → `idx.js` → `api.js` → `predict.js` → `odometer.js` → `app.js`.
   `app.js` calls `SIR_PREDICT` and `SIR_ODOMETER` at render time, so both must be
   parsed before it.
4. Deferred immersive layer: `globe.js`, `motion.js`, `overhaul.js`.

**Lenis is not loaded.** `motion.js` is written against Lenis + GSAP + ScrollTrigger, but
`index.html` only serves GSAP and ScrollTrigger from CDN. `motion.js` guards with
`HAS_LENIS` and drives its own rAF loop when Lenis is absent — which is the shipping
state. Don't "fix" the missing `<script>` tag; adding it changes scroll behavior site-wide.

**Cache busting.** Local CSS/JS are referenced with a `?v=N` query string. **Bump the
version whenever you edit that file**, or returning visitors get a stale cached copy.
This is the only cache-invalidation mechanism in the project. Current versions:

```
styles.css   (none)    data.js      v=3      atmos-ui.js  v=2
theme.css    v=22      idx.js       v=2      motion.js    v=3
overhaul.css v=12      api.js       v=5      overhaul.js  v=6
addons.css   v=3       predict.js   v=1      globe.js     (none)
                       odometer.js  v=2
                       app.js       v=9
```

`styles.css` and `globe.js` ship unversioned. If you edit either, add a `?v=1` so it can
be busted next time.

**CSS cascade order is load order.** `styles.css` → `theme.css` → `overhaul.css` →
`addons.css`. Later files intentionally override earlier ones; put a new override in the
latest layer rather than editing an earlier file, unless you're changing the design system
itself.

**Rendering.** Everything is `innerHTML` with template literals — no framework. In the CRM
pages, user-controlled values **must** go through the local helpers:
- `esc(s)` — HTML-escapes `& < > "` for text interpolation
- `safeUrl(u)` — allows only `http:`/`https:`/`tel:`/`mailto:`, else `#`
- `cssBg(u)` — strips quotes/parens/backslashes before `background-image:url(...)`

These helpers are re-declared in each CRM page. If you add a field to a card template,
wrap it. Lead-sourced content (names, notes, social post bodies, suggested replies) is
untrusted.

**Graceful degradation is a hard requirement.** Every network call has a fallback:
`app.js` boots from the bundled `LISTINGS` in `data.js` and only replaces them if the
backend answers; `runAI()` falls back to the on-device `aiParse()` regex parser when
`sir-search` fails; the MLS toggle reverts to the featured collection; `js/api.js` wraps
every fetch in a 9s `withTimeout`. Never introduce a code path that leaves a blank page
when the backend is unreachable.

**Motion respects `prefers-reduced-motion`** everywhere (globe, motion, hero Ken-Burns,
typewriter placeholder). New animation must check it too.

**Pinned listings.** `data.js` marks Donna's spotlight listing with `pin: true`.
`mergePinned()` in `app.js` re-inserts pinned listings (deduped by normalized address, so a
real DB row wins) after any backend fetch replaces the pool, and the sort in `apply()`
puts `pin` first, then `featured`, then the user's chosen sort. Preserve that ordering.

**The saved view is a filter, never a pool swap.** `showFavs()` toggles `state.favsOnly`,
and `render()` sources from `favRows()` instead of `state.all`. It does *not* overwrite
`#listings` after the fact — an earlier version did, and the comments in `app.js` exist to
keep it from coming back. Because it's a filter, pin/featured sort order, the map view and
the compare tray all stay correct through a re-render. `favRows()` resolves ids against the
active pool **and** the bundled `LISTINGS`, deduped by id, so a home saved off the MLS feed
doesn't silently vanish when the user flips back to the featured collection. Preserve both
properties.

**localStorage keys.** `sir_favs` (favorite listing IDs, public site), `sir_leads_token`
(CRM bearer token, shared across all three CRM pages), `sir_market_history` (market
snapshots feeding the drift signal — see "Live money & predictions").

**CRM pages carry `<meta name="robots" content="noindex, nofollow">`.** Keep it on any new
CRM page.

## Live money & predictions

The money on the public site is real and server-sourced — nothing about it is
hard-coded per community:

- **`sir-market`** returns live RentCast figures per zip (`medianPrice`, `medianRent`,
  `pricePerSqft`, `daysOnMarket`, `newListings`, `totalListings`) plus an `updated`
  stamp. `apiMarket()` returns the **whole payload** (`{updated, markets}`), not just
  the rows — the `updated` stamp drives the "live" badge above the grid.
- **`sir-valuation`** returns a real AVM value/range for a typed address.

`js/predict.js` turns that live payload into a 12-month projection per community.
It never invents a number — every input comes off the wire:

| Signal | Source | Meaning |
|--------|--------|---------|
| Pace | `daysOnMarket` vs. a 55-day balanced baseline | fast sales push prices up |
| Supply | `totalListings ÷ newListings` vs. a baseline of 28 | a stale shelf drags prices down |
| Yield | `medianRent × 12 ÷ medianPrice` vs. 3.0% | the affordability anchor prices revert toward |
| **Drift** | measured change between stored snapshots | what actually happened |

Signals are scored around `BASE_TREND` (long-run nominal appreciation) and clamped to
a −9%…+14% band. Every successful feed is snapshotted to `localStorage.sir_market_history`
(throttled to 6h, capped at 40); once snapshots span 3+ days, real observed drift blends
in, its weight ramping to 55% at 60 days. So the longer a visitor's browser has watched
the market, the more the projection leans on measured reality instead of the model.

`projectValue(value, community)` reuses the matching community's forecast to project an
AVM result forward, falling back to the listing-weighted coastal average.

**Tuning lives in the constants at the top of `predict.js`** — baselines, weights, clamps.
Change those, not the call sites. If the feed is unreachable the whole market section
hides and the valuation projection stays hidden: never show a made-up trend.

Projections are labelled as modelled estimates, not appraisals, in the UI. Keep that
disclosure on any new surface that shows one — this is a licensed brokerage.

## Rolling numbers

Every dollar amount and figure counts up via `js/odometer.js`. The markup contract keeps
the **final text in the HTML**, so the number is correct with JS off, with reduced motion,
or if the odometer never loads:

```html
<b data-num="2450000" data-fmt="money">$2,450,000</b>
```

`data-fmt`: `money` ($2,450,000) · `moneyc` ($2.45M) · `int` (2,450) · `pct` (+3.2%) ·
`dec1` (5.5) · `year` (2021, never grouped).

Elements are armed once and roll when scrolled into view (IntersectionObserver), then snap
to their exact original text. **Anything injected after a fetch must call
`SIR_ODOMETER.scan(container)`** — GSAP/ScrollTrigger only scan the DOM at boot, so the
existing `[data-count]` path in `motion.js` (hero stats) cannot see dynamic content.
Pass `scan(el, true)` to roll immediately for content the user just opened, like the
detail modal, whose figures sit below the fold in their own scroller.
Use the `roll()` / `rollPrice()` / `rollText()` helpers in `app.js` when building card
templates; they leave non-numeric strings ("Price Upon Request") untouched, and
`rollText()` escapes then rolls the figures inside backend copy.

What deliberately does **not** roll: phone numbers, addresses, zips, DRE#, the © year,
label copy ("12-mo outlook"), and the payment estimator's live slider readouts — a
count-up there would fight the thumb. `updateCalc(true)` rolls the estimator when it
opens; drags call `updateCalc()` for an instant response.

`dashboard.html` carries its own ~20-line inline copy (`roll()` + `rollScan()`) for the
tiles, funnel and portfolio figures, since CRM pages never load anything from `js/`.

## Listing object shape

The shared shape across `data.js`, the `sir-properties` feed, and `normalizeRESO()`:

```js
{
  id, status,              // "For Sale" | "For Lease" | "Sold"
  featured, pin, source,   // source: "featured" | "mls"
  community, address, city, zip,
  price, poa, lease,       // price 0 + poa → "Price Upon Request"; lease → "$X/mo"
  beds, baths, sqft, lot, year,
  type, view, waterfront,
  tagline, remarks,
  hero, gallery: [],       // hero is gallery[0] by convention
  features: [],
  coords: [lat, lng],       // jittered per-community in data.js so pins don't stack
  mls, tour, openHouse      // CRM writes snake_case open_house; readers accept both
}
```

Note the `openHouse`/`open_house` split — `listings.html` reads `l.openHouse || l.open_house`
and writes `open_house`. Keep accepting both.

## The BeMeh side project

**BeMeh** is a virtual-esthetician concept — video consults with a skincare pro, guided
face scans, a regimen tracker. It is unrelated to the realty business and shares only
this repo's git history. It exists in three forms:

| Where | What | Notes |
|-------|------|-------|
| `concepts/bemeh/index.html` | Single-file pitch/concept page | 660 lines, all inline. Warm bronze palette, light/dark/system aware. |
| `concepts/bemeh/app/` | Installable PWA prototype | `index.html` + `manifest.webmanifest` + two icons. Standalone display, `noindex`. |
| `ios/BeMeh/` | Real SwiftUI app, shipped to TestFlight | The only part of this repo that compiles. |

Nothing links these to each other or to the realty site — each is entered by URL or by
opening the Xcode project.

### The iOS app

SwiftUI, iOS 17.0+, dark-only, no third-party packages — nothing to resolve, no
`pod install`. `BeMeh.xcodeproj` is checked in (objectVersion 77, synchronized folders)
and opens directly in Xcode 16+:

```bash
open ios/BeMeh/BeMeh.xcodeproj    # pick a simulator, Run
```

```
BeMehApp.swift      @main entry
RootView.swift      TabView shell
Theme.swift         Palette + type scale (Didot display face)
Components.swift    Card, Pill, GoldButtonStyle, RingGauge, Monogram
Models.swift        Esthetician, Appointment, ScanReading, RegimenStep
AppState.swift      All sample data lives here
TodayView · ScanView · CameraView · BookView · SessionView · RegimenView
SignUpView · LegalView · MeetingWebView   (Jitsi over WKWebView)
```

`project.yml` is an **XcodeGen fallback only** — it regenerates the project if it's ever
lost (`brew install xcodegen && cd ios/BeMeh && xcodegen generate`). It is not the source
of truth and has drifted: it still says `MARKETING_VERSION: "0.1"` while the checked-in
project is at **0.7**. Edit build settings in the Xcode project; if you touch `project.yml`,
re-sync the version fields by hand.

### Shipping BeMeh to TestFlight

Two paths, both documented in detail in `ios/BeMeh/README.md`:

- **`.github/workflows/testflight.yml`** — a `compile` job (no signing, no secrets) and a
  `testflight` job that archives with cloud signing and uploads. The upload job is
  `workflow_dispatch` only. It needs four repo secrets (`APPSTORE_ISSUER_ID`,
  `APPSTORE_KEY_ID`, `APPSTORE_P8`, `APPLE_TEAM_ID`) and fails fast with a clear error
  listing any that are missing. Build number = `GITHUB_RUN_NUMBER`.
- **`ios/BeMeh/ship.sh`** — the same pipeline from a Mac, no GitHub involvement. It clones
  a fresh copy of the repo to a temp dir and builds that, so it can be run from anywhere.

⚠️ **`ship.sh` has the owner's real Apple account identifiers hardcoded** (key ID, issuer
ID, team ID, bundle ID). These are identifiers rather than credentials — the actual secret
is the `.p8` private key, which is *not* committed and which the script expects to find in
`~/Downloads` or at `$P8_PATH`. Don't paste a `.p8` into this repo, and don't swap these
IDs for someone else's without being asked.

## Editor tooling (not shipped)

`.mcp.json` registers the **Magic MCP** (21st.dev — the successor to the Magic Labs
"magic" CLI, which no longer exists on npm) for AI-assisted UI generation. It is dev-only
tooling: nothing in it is served, and the static site has no dependency on it.

It needs a free key from https://21st.dev/mcp, exported before starting the editor:

```bash
export TWENTY_FIRST_API_KEY="…"   # then reopen Claude Code so .mcp.json picks it up
```

Optional CLIs: `npm i -g @21st-dev/magic` (the `magic` binary) and `@21st-dev/cli`
(the current `21st` binary — `21st login`, `21st search`, `21st generate`).
Without a key the MCP starts and cleanly reports "Not authenticated"; it never blocks
the site. Do not commit the key.

## Git workflow

- Default branch is `main`. Deploys fire on push to `main`, so anything merged is live
  immediately.
- Commit subjects in this repo are short and imperative, no conventional-commit prefixes:
  `Add Listings Manager (view/add/edit/delete + photo upload)`,
  `Listings: add MLS #, virtual-tour link, open-house`.
- Feature work happens on `claude/<topic>-<suffix>` branches merged into `main` via PR.
- Do not open a pull request unless explicitly asked.

## Known rough edges

Real, pre-existing issues. Fix them only if the task asks; don't be surprised by them.

- **`README.md` is stale.** It describes a `solstice-app/` subdirectory (the repo root is
  the app), documents `js/idx.js` as the live MLS path (superseded by the Supabase proxy),
  lists `hero-gl.js` and `atmosphere.js` as live features (both orphaned), and never
  mentions the Supabase backend, the CRM pages, `predict.js`, `odometer.js`, or BeMeh.
- **`ios/BeMeh/README.md` is partly stale too.** It describes five screens and says
  "nothing talks to a network"; the app has since grown sign-up, legal-consent, a real
  camera view, and a Jitsi meeting web view, which very much does.
- **The CRM triplicates its boilerplate.** Auth gate, `H()`, `esc`, `cssBg`, `safeUrl`,
  login/logout, and the anon key are copy-pasted across `dashboard.html`, `leads.html`, and
  `listings.html`. A change to auth behavior must be made in all three.
- **`testflight.yml`'s push trigger points at a merged branch.** It fires the compile job
  on pushes to `claude/virtual-esthetician-app-gjdls9`, which no longer exists — so in
  practice only `workflow_dispatch` runs it. Harmless, but don't read it as live CI.
- **Photo uploads are base64 data URLs.** `listings.html` downscales client-side to
  1600px/JPEG q0.82 via canvas, then POSTs a data URL to `sir-listings`. Large batches are
  slow and sequential by design.
