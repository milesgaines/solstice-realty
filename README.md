# Solstice International Realty — Web App

A cinematic luxury real-estate site for **Donna Bohana / Solstice International Realty**
(coastal California), plus a private CRM for running her pipeline. Dark, glassmorphic,
WebGL-driven, built with Donna's real photos and branding.

Static, zero-build: no `package.json`, no bundler, no test suite. **Every file in the repo
is a file that gets served.** The repo root *is* the web root.

## Run it

```bash
python3 -m http.server 8137
# → http://localhost:8137
```

Serve it over real HTTP, never `file://` — the `fetch` calls and the same-origin image
requirement for WebGL both need it.

## Two apps, one domain

The repo holds two deliberately uncoupled apps. The CRM pages load **nothing** from `css/`
or `js/` — each is a single self-contained file with inline `<style>` and `<script>`. That
isolation is what keeps the marketing site's heavy WebGL/GSAP layer out of the CRM.

| App | Pages | Audience |
|-----|-------|----------|
| Public marketing site | `index.html`, `privacy.html`, `terms.html` | Buyers & sellers |
| Private CRM | `dashboard.html`, `leads.html`, `listings.html` | Donna only |

### Public site

| File | Role |
|------|------|
| `index.html` | App shell + every section, ending in inline IIFEs (community grid, market cards, typewriter placeholder, hero Ken-Burns) |
| `css/styles.css` | Design system + base layout |
| `css/theme.css` | "Solar Luxe" glassmorphism, layered over `styles.css` |
| `css/overhaul.css` | "Clean app" redesign — loads late, wins the cascade |
| `css/addons.css` | Loads last: off-market CTA strip, pinned-spotlight card |
| `js/data.js` | Brand facts, communities, coords, bundled listings fallback (`window.SOLSTICE`) |
| `js/api.js` | Supabase edge-function client (`window.SIR_API`) |
| `js/idx.js` | Browser-side SimplyRETS adapter (`window.SOLSTICE_IDX`) — loaded but no longer the live path; see MLS below |
| `js/app.js` | Search, filters, cards, detail modal, favorites, compare, Leaflet map, mortgage calc, valuation, contact form |
| `js/atmos-ui.js` | Loader, custom cursor, ambient ocean sound — loads in `<head>`, **not** deferred |
| `js/globe.js` | globe.gl "Global Portfolio" globe with gold arcs |
| `js/motion.js` | Lenis smooth scroll + GSAP/ScrollTrigger cinematics, count-ups |
| `js/overhaul.js` | Mobile bottom tab bar, nav solid-on-scroll |
| `assets/img/` | Local same-origin copies of Donna's photos (required for WebGL) |

`css/immersive.css`, `js/hero-gl.js`, and `js/atmosphere.js` are **orphaned** — earlier
immersive-layer iterations pulled from `index.html` for readability and mobile
performance. They are kept in the tree on purpose; don't wire them back in or delete them.

### CRM

`dashboard.html` (tiles, hot leads, funnel, open houses), `leads.html` (filter/stage/
temperature, notes, lead↔listing matching, CSV export), and `listings.html` (listing CRUD
with drag-drop photo upload and client-side downscaling).

Auth is a bearer token from the backend stored in `localStorage.sir_leads_token`; a `401`
from any CRM endpoint clears it and reloads. Every CRM page carries
`<meta name="robots" content="noindex, nofollow">` — keep it on any new one.

## Backend

All dynamic data comes from **Supabase Edge Functions**, whose source lives outside this
repo:

```
https://enktupvwcsojqthiimvu.supabase.co/functions/v1
```

| Function | Purpose |
|----------|---------|
| `sir-properties` | Public listing feed (`?source=mls` proxies the real MLS server-side) |
| `sir-search` | Natural-language search → filters, explanation, results |
| `sir-lead` | Lead capture (contact form, tour request, valuation) |
| `sir-valuation` | AVM home valuation |
| `sir-market` | Cached market stats for the `#market` section |
| `sir-leads` | CRM auth + lead list/create/update/delete |
| `sir-dashboard` | Aggregated dashboard payload |
| `sir-listings` | CRM listing CRUD + photo upload |
| `sir-social-scan` | Social prospecting sweep |

The **Supabase anon key is committed on purpose** and duplicated in `js/api.js` and each
CRM page. It's a public key guarded by RLS and server-side validation — not a leaked
secret, and not something a static site can hide. Real credentials (MLS, AI, RentCast)
live server-side in the edge functions.

## MLS data

The "Live MLS" toggle used to call SimplyRETS straight from the browser via `js/idx.js`.
It now goes through the server-side proxy instead — `app.js` calls
`SIR_API.apiListings({source:"mls"})`. `idx.js` is still loaded and still works, and its
`normalizeRESO()` remains the canonical RESO→app field mapping worth consulting if you
touch listing shapes.

## Conventions

- **One global per file.** Every `js/` file is a classic script (no ES modules) wrapped in
  an IIFE exposing exactly one `window.*`. `js/app.js` is the deliberate exception — it
  runs at top level and attaches many handlers, because the HTML uses inline `onclick`.
- **Script order in `index.html` matters.** `atmos-ui.js` first and undeferred; CDN
  libraries next with Leaflet last so nothing clobbers `L`; then `data.js` → `idx.js` →
  `api.js` → `app.js`; then the deferred immersive layer.
- **CSS cascade order is load order:** `styles.css` → `theme.css` → `overhaul.css` →
  `addons.css`. Put a new override in the latest layer.
- **Bump `?v=N` whenever you edit a local CSS/JS file.** It is the only cache-invalidation
  mechanism here — skip it and returning visitors get a stale copy.
- **Escape untrusted content.** Rendering is `innerHTML` with template literals, no
  framework. Lead-sourced values (names, notes, social post bodies) must go through each
  CRM page's `esc()`, `safeUrl()`, and `cssBg()` helpers.
- **Graceful degradation is a hard requirement.** Every network call has a fallback: the
  app boots from the bundled listings and only replaces them if the backend answers, AI
  search falls back to an on-device regex parser, the MLS toggle reverts to the featured
  collection, and every fetch has a 9s timeout. No code path may leave a blank page when
  the backend is unreachable.
- **Motion respects `prefers-reduced-motion`** everywhere. New animation must too.

## Features

- **Natural-language search** — "5 bed under $15M with ocean views in Malibu" resolves
  server-side, with an on-device parser as fallback.
- **Live MLS toggle** — flip from Donna's featured collection to the live feed.
- Interactive map, favorites (`localStorage.sir_favs`), compare up to 3 homes, per-listing
  mortgage calculator, instant home valuation, lightbox galleries, schedule-a-tour.
- Immersive layer: 3D globe, smooth scroll, scroll cinematics, custom cursor, ambient
  sound, cinematic loader.
- CRM: lead radar with stage/temperature triage, lead↔listing matching, CSV export,
  listing management with photo upload.

## Deploy

Automatic. Push to `main` → `.github/workflows/pages.yml` uploads the repo root as a Pages
artifact and deploys it. There is no build step to run or verify, and anything merged is
live immediately.

## Notes

- Featured listings in `data.js` are illustrative demo data using Donna's real community
  photos, and act as the offline fallback.
- Donna's spotlight listing is marked `pin: true`; `mergePinned()` re-inserts pinned
  listings after any backend fetch (deduped by address, so a real DB row wins), and sort
  order is pinned → featured → the user's chosen sort.
- Photo uploads are base64 data URLs, downscaled client-side to 1600px JPEG q0.82. Large
  batches are slow and sequential by design.
- `backdrop-filter` frosted glass needs a GPU browser; it degrades to a plain translucent
  panel.
- `CLAUDE.md` carries the deeper working notes for AI assistants, including the shared
  listing object shape and the known rough edges.
