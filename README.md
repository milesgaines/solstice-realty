# Solstice International Realty — Web App

A cinematic, "Apple × web3" luxury real-estate web app for **Donna Bohana / Solstice
International Realty** (coastal California). Dark, glassmorphic, WebGL-driven — built to
replace the boring WordPress site. Uses Donna's real photos and branding.

## Run it
Static site, no build step:
```bash
cd solstice-app
python3 -m http.server 8137
# open http://localhost:8137
```
(Or any static host — see Deploy.)

## What's inside
| File | Role |
|------|------|
| `index.html` | App shell + all sections |
| `css/styles.css` | Base layout / components |
| `css/theme.css` | "Solar Luxe" glassmorphism theme (Apple × web3) |
| `js/data.js` | Curated featured listings (Donna's real photos) + brand facts |
| `js/idx.js` | **IDX / MLS adapter** — swap to a real feed here |
| `js/app.js` | Search, AI parser, filters, favorites, compare, map, mortgage calc, valuation |
| `js/hero-gl.js` | WebGL liquid cross-fade hero (raw WebGL) |
| `js/atmosphere.js` | WebGL animated aurora background |
| `js/globe.js` | 3D "Global Portfolio" globe with glowing arcs (globe.gl) |
| `js/motion.js` | Lenis smooth scroll + GSAP scroll cinematics, kinetic type, count-ups |
| `js/atmos-ui.js` | Cinematic loader, glowing custom cursor, ambient ocean sound (WebAudio) |
| `assets/img/` | Local copies of Donna's photos (same-origin → WebGL-safe) |

## Features
- **AI natural-language search** — "5 bed under $15M with ocean views in Malibu" parses to filters (no API key).
- **Live MLS toggle** — flip the search from Donna's featured collection to a live MLS feed.
- Interactive **map** view, **favorites** (saved locally), **compare** up to 3 homes, per-listing **mortgage calculator**, **instant home valuation**, lightbox galleries, schedule-a-tour.
- Immersive layer: WebGL hero, animated aurora, 3D globe, smooth scroll, kinetic type, custom cursor, ambient sound, cinematic loader.

## Going live with real MLS data
The app ships pointed at the **SimplyRETS public demo feed** so the "Live MLS" toggle works
out of the box (demo inventory). To use Donna's real listings, edit **`js/idx.js`**:

1. Pick a provider (SimplyRETS, Bridge/Zillow RESO Web API, IDX Broker, Realtyna, Repliers…).
2. Put credentials in `IDX_CONFIG` and set `PROVIDER`.
3. Every provider returns the same normalized shape (`normalizeRESO`), so nothing else changes.

⚠️ Production MLS APIs require server-side calls (CORS + secret keys). Add a tiny serverless
function (Vercel/Netlify) that injects credentials and set `PROVIDER: "proxy"` with `base: "/api/mls"`.

## Notes
- Featured listings are **illustrative demo data** using Donna's real community photos. Replace with her actual listings or wire the MLS feed before launch.
- `backdrop-filter` frosted glass needs a GPU browser (all modern Safari/Chrome). It degrades to a plain translucent panel if unsupported.
- Everything respects `prefers-reduced-motion` and falls back gracefully if WebGL is unavailable.

## Deploy
Drag the `solstice-app/` folder to Vercel / Netlify / Cloudflare Pages, or any static host.
Point `solsticeir.com` (or a subdomain) at it when ready.
