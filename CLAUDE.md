# CLAUDE.md

Guidance for Claude Code (and other AI assistants) working in this repository.

## What this repo is

A **static, zero-build website** for Solstice International Realty (Donna Bohana,
Broker/Owner — coastal California luxury real estate). There is no `package.json`, no
bundler, no transpiler, no test suite, and no dependency directory. Every file shipped
is the file served.

The repo actually contains **two apps** that happen to share a domain:

| App | Pages | Audience | Styling |
|-----|-------|----------|---------|
| **Public marketing site** | `index.html` (+ `privacy.html`, `terms.html`) | Buyers/sellers | External CSS in `css/`, JS in `js/` |
| **Private CRM** | `dashboard.html`, `leads.html`, `listings.html` | Donna only | Fully self-contained: inline `<style>` + inline `<script>` per page |

They are deliberately **not** coupled. The CRM pages do not load anything from `css/` or
`js/` — each is a single-file app. Don't "refactor" them into shared modules without
being asked; the isolation is what keeps the marketing site's heavy WebGL/GSAP layer out
of the CRM.

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
js/idx.js           Direct-from-browser IDX/MLS adapter (SimplyRETS). Loaded but its
                    fetchMLS() is never called — app.js uses SIR_API instead. See below.
js/app.js           Main app logic: filters, sort, cards, detail modal, mortgage calc,
                    favorites, compare, Leaflet map, valuation, contact form.
js/atmos-ui.js      Loader + custom cursor + ambient sound. Loaded in <head>, NOT deferred.
js/globe.js         globe.gl "Global Portfolio" globe with gold arcs
js/motion.js        Lenis smooth scroll + GSAP/ScrollTrigger cinematics, [data-count] count-ups
js/overhaul.js      Mobile bottom tab bar + nav solid-on-scroll
js/hero-gl.js       ⚠️ ORPHANED — raw-WebGL liquid hero, superseded by the CSS Ken-Burns
js/atmosphere.js    ⚠️ ORPHANED — raw-WebGL aurora background, removed for readability/perf

assets/img/         Donna's real photos, local same-origin copies (required for WebGL)
.github/workflows/pages.yml   GitHub Pages deploy
.nojekyll           Stops Pages from filtering underscore-prefixed paths
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
3. Core: `data.js` → `idx.js` → `api.js` → `app.js` (each depends on the previous).
4. Deferred immersive layer: `globe.js`, `motion.js`, `overhaul.js`.

**Cache busting.** Local CSS/JS are referenced with a `?v=N` query string
(`theme.css?v=22`, `app.js?v=6`). **Bump the version whenever you edit that file**, or
returning visitors get a stale cached copy. This is the only cache-invalidation mechanism
in the project.

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

**localStorage keys.** `sir_favs` (favorite listing IDs, public site), `sir_leads_token`
(CRM bearer token, shared across all three CRM pages).

**CRM pages carry `<meta name="robots" content="noindex, nofollow">`.** Keep it on any new
CRM page.

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

## Git workflow

- Deploys fire on push to `main`, so anything merged is live immediately.
- Commit subjects in this repo are short and imperative, no conventional-commit prefixes:
  `Add Listings Manager (view/add/edit/delete + photo upload)`,
  `Listings: add MLS #, virtual-tour link, open-house`.
- Do not open a pull request unless explicitly asked.

## Known rough edges

Real, pre-existing issues. Fix them only if the task asks; don't be surprised by them.

- **The CRM triplicates its boilerplate.** Auth gate, `H()`, `esc`, `cssBg`, `safeUrl`,
  login/logout, and the anon key are copy-pasted across `dashboard.html`, `leads.html`, and
  `listings.html`. A change to auth behavior must be made in all three.
- **`showFavs()` in `app.js`** (~line 423) is knowingly messy — it renders saved listings by
  overwriting `#listings` directly after `render()`, with a comment admitting the hack.
- **Photo uploads are base64 data URLs.** `listings.html` downscales client-side to
  1600px/JPEG q0.82 via canvas, then POSTs a data URL to `sir-listings`. Large batches are
  slow and sequential by design.
