# Solstice International Realty — the pitch

How to explain this project so it lands. Facts below are drawn from the actual tree
(41 tracked files, ~7,100 lines of hand-written HTML/CSS/JS, 11 MB of assets, zero
dependencies).

---

## The short version

> "It's a real estate website. Except it's 41 files, zero dependencies, no build step,
> no framework — and it has a spinning WebGL globe with gold arcs, an AI that parses
> 'ocean view under 4M in Malibu' into structured filters, a full CRM with social-media
> prospecting, and it still works with the backend completely offline."

---

## The longer version

**There's no build.** No `package.json`, no bundler, no `node_modules`, no test runner.
Every file that ships is the file that was written. It deploys by pushing to `main`.
Cache invalidation is a hand-incremented `?v=22` on the stylesheet — and that's not a
shortcut, it's the *entire* infrastructure.

**It's actually two apps wearing one domain.** A public marketing site with a
Lenis-smooth-scrolled, GSAP-pinned, globe.gl-rendered, Ken-Burns-hero luxury experience —
and a private CRM (`dashboard.html`, `leads.html`, `listings.html`) that shares *nothing*
with it. Each CRM page is a single self-contained file: inline `<style>`, inline
`<script>`, its own copy of `esc()`, its own auth gate. Deliberately. The isolation is
what keeps a WebGL layer from loading when Donna just wants to check her hot leads.

**Four CSS files fight each other on purpose.** `styles.css` → `theme.css` →
`overhaul.css` → `addons.css`, loaded in that order specifically so the later ones win.
The cascade *is* the architecture. New overrides go in the newest layer. It's git history
expressed as specificity.

**Nothing is allowed to show a blank page.** Every single network call has a fallback.
Backend down? It boots from listings bundled into `data.js`. AI search endpoint dies? It
silently downgrades to a regex parser running on-device that still understands "3 bed
waterfront under 5M." MLS proxy times out? Reverts to the featured collection. Every
fetch is wrapped in a 9-second timeout. The failure mode of the whole system is "slightly
less impressive website," never "broken website."

**The CRM does social prospecting.** `sir-social-scan` sweeps for people posting about
moving, then surfaces suggested replies. Which means untrusted strangers' text renders
into `innerHTML` template literals — so every field goes through `esc()`, `safeUrl()`
(http/https/tel/mailto only), or `cssBg()` (strips quotes, parens, backslashes) before it
touches the DOM. A hand-rolled XSS boundary, in a site with no framework to do it for you.

**Photo uploads are base64 data URLs.** `listings.html` takes a drag-drop, downscales it
to 1600px JPEG q0.82 through a canvas in the browser, and POSTs the data URL. Sequential.
Slow on big batches. Documented as intentional.

**Everything respects `prefers-reduced-motion`.** The globe, the scroll cinematics, the
hero, even the *typewriter animation in the search placeholder*.

---

## One-liners, pick your audience

| Audience | Line |
|----------|------|
| A developer | "I built a CRM with an AI search layer and zero dependencies. `python3 -m http.server` is the dev environment." |
| A founder | "One person is running a luxury brokerage's marketing site, MLS integration, lead pipeline, AVM valuations, and social prospecting off a static site and nine serverless functions." |
| A designer | "There's a globe. It has gold arcs. It knows if you don't want it moving." |
| Someone who hates JS frameworks | "No framework. Four CSS files. It's fine. It's genuinely fine." |

---

## The actual thesis

The insane part isn't any single piece — it's that a zero-build static site is carrying
an AI search pipeline, an MLS proxy, and a three-page CRM, and every one of those
degrades gracefully instead of falling over.

---

## Receipts

```
41      tracked files
7,101   lines across *.html, css/*.css, js/*.js
11 MB   assets/
0       dependencies, build steps, test runners
9       Supabase edge functions behind it
4       CSS layers, load-order-dependent
3       CRM pages, each fully self-contained
3       knowingly orphaned files kept in the tree on purpose
```
