/* globe.js — Solstice International Realty · "Global Portfolio" (globe.gl)
 * WEB3 dark iridescent globe with animated gold arcs Malibu -> the world.
 * Classic (non-module) script. Wrapped in an IIFE. Exposes exactly one global:
 * window.SolsticeGlobe = { init, world }.
 * Requires: <script src="https://unpkg.com/globe.gl"></script>  (UMD global `Globe`)
 */
(function () {
  'use strict';

  var STYLE_ID = 'solstice-globe-style';
  var SECTION_ID = 'global-portfolio';
  var GLOBE_ID = 'solstice-globe-canvas';

  var state = {
    inited: false,
    world: null,
    resizeHandler: null,
    ro: null,
    reduced: false,
    onScreen: true
  };

  /* ---- geo data ---- */
  var MALIBU = { lat: 34.0259, lng: -118.7798, name: 'Malibu' };
  var DEST = [
    { lat: 48.8566, lng: 2.3522, name: 'Paris' },
    { lat: 51.5072, lng: -0.1276, name: 'London' },
    { lat: 41.3874, lng: 2.1686, name: 'Barcelona' },
    { lat: 45.4642, lng: 9.19, name: 'Milan' },
    { lat: 40.7128, lng: -74.006, name: 'New York' },
    { lat: 25.2048, lng: 55.2708, name: 'Dubai' }
  ];

  var GOLD = '#c9a96e';
  var GOLD_SOFT = '#e3cfa4';

  /* ---------------------------------------------------------------- styles */
  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var css =
      '#' + SECTION_ID + '{position:relative;overflow:hidden}' +
      '#' + SECTION_ID + ' .sg-wrap{max-width:1180px;margin:0 auto;padding:0 clamp(1.1rem,4vw,2.4rem)}' +
      '#' + SECTION_ID + ' .sg-head{max-width:640px;margin:0 auto 2.4rem;text-align:center}' +
      '#' + SECTION_ID + ' .sg-eyebrow{font-family:"JetBrains Mono",ui-monospace,monospace;' +
        'font-size:.7rem;letter-spacing:.32em;text-transform:uppercase;color:' + GOLD + ';' +
        'display:inline-block;margin-bottom:1.1rem;opacity:.92}' +
      '#' + SECTION_ID + ' .sg-title{font-family:"Cormorant Garamond",Georgia,serif;font-weight:600;' +
        'font-size:clamp(2.1rem,5.2vw,3.7rem);line-height:1.04;letter-spacing:-.01em;color:var(--cream,#fbfaf5);' +
        'margin:0 0 1.1rem}' +
      '#' + SECTION_ID + ' .sg-title em{font-style:italic;' +
        'background:linear-gradient(100deg,' + GOLD + ' 0%,#e8b4c8 34%,#7fd9d4 66%,var(--sage,#7a9f4e) 100%);' +
        '-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent}' +
      '#' + SECTION_ID + ' .sg-lede{font-family:"Manrope",system-ui,sans-serif;font-size:clamp(.95rem,1.5vw,1.08rem);' +
        'line-height:1.75;color:#c3c9c1;margin:0 auto;max-width:560px}' +
      '#' + SECTION_ID + ' .sg-stage{position:relative;margin-top:2.6rem;border-radius:26px;overflow:hidden;' +
        'min-height:62vh;display:flex;align-items:center;justify-content:center;' +
        'background:radial-gradient(120% 120% at 50% 12%,rgba(201,169,110,.09),rgba(7,9,10,0) 58%),' +
        'linear-gradient(180deg,rgba(20,26,24,.42),rgba(7,9,10,.28));' +
        'border:1px solid rgba(201,169,110,.16);' +
        'box-shadow:0 40px 120px -50px rgba(0,0,0,.85),inset 0 1px 0 rgba(255,255,255,.05);' +
        'backdrop-filter:blur(9px) saturate(120%);-webkit-backdrop-filter:blur(9px) saturate(120%)}' +
      '#' + SECTION_ID + ' .sg-stage::after{content:"";position:absolute;inset:0;pointer-events:none;' +
        'border-radius:inherit;box-shadow:inset 0 0 120px -30px rgba(201,169,110,.28)}' +
      '#' + GLOBE_ID + '{width:100%;height:62vh;touch-action:pan-y}' +
      '#' + GLOBE_ID + ' canvas{outline:none;display:block}' +
      '#' + SECTION_ID + ' .sg-tip{position:absolute;left:50%;bottom:1.1rem;transform:translateX(-50%);' +
        'font-family:"JetBrains Mono",ui-monospace,monospace;font-size:.62rem;letter-spacing:.26em;' +
        'text-transform:uppercase;color:rgba(227,207,164,.55);pointer-events:none;z-index:2;white-space:nowrap}' +
      '#' + SECTION_ID + ' .sg-label{font-family:"JetBrains Mono",ui-monospace,monospace;font-size:10px;' +
        'letter-spacing:.14em;text-transform:uppercase;color:' + GOLD_SOFT + ';' +
        'text-shadow:0 0 8px rgba(0,0,0,.9),0 1px 2px rgba(0,0,0,.9);white-space:nowrap;pointer-events:none;' +
        'transform:translate(9px,-50%);opacity:.9}' +
      '#' + SECTION_ID + ' .sg-fallback{display:none;padding:2.4rem;text-align:center;color:#c3c9c1;' +
        'font-family:"Manrope",system-ui,sans-serif;line-height:1.7}' +
      '#' + SECTION_ID + ' .sg-fallback ul{list-style:none;padding:0;margin:1.4rem 0 0;display:flex;' +
        'flex-wrap:wrap;gap:.6rem;justify-content:center}' +
      '#' + SECTION_ID + ' .sg-fallback li{font-family:"JetBrains Mono",ui-monospace,monospace;font-size:.72rem;' +
        'letter-spacing:.12em;text-transform:uppercase;color:' + GOLD_SOFT + ';border:1px solid rgba(201,169,110,.24);' +
        'border-radius:999px;padding:.42rem .9rem;background:rgba(201,169,110,.06)}' +
      '@media (max-width:760px){#' + SECTION_ID + ' .sg-stage{min-height:52vh;border-radius:20px}#' + GLOBE_ID + '{height:52vh}}' +
      '@media (max-width:420px){#' + SECTION_ID + ' .sg-stage{min-height:46vh}#' + GLOBE_ID + '{height:46vh}}' +
      '@media (prefers-reduced-motion:reduce){#' + SECTION_ID + ' .sg-tip{opacity:.4}}';
    var el = document.createElement('style');
    el.id = STYLE_ID;
    el.textContent = css;
    document.head.appendChild(el);
  }

  /* ---------------------------------------------------------------- markup */
  function buildSection() {
    var existing = document.getElementById(SECTION_ID);
    if (existing) return existing;

    var sec = document.createElement('section');
    sec.id = SECTION_ID;
    sec.className = 'sec';
    sec.innerHTML =
      '<div class="sg-wrap">' +
        '<div class="sg-head reveal">' +
          '<span class="sg-eyebrow">Beyond the Coast</span>' +
          '<h2 class="sg-title">A global portfolio,<br><em>quietly connected.</em></h2>' +
          '<p class="sg-lede">Donna represents clients from Malibu to Europe&rsquo;s most coveted ' +
            'addresses &mdash; Paris, London, Barcelona, Milan &mdash; with the same discretion.</p>' +
        '</div>' +
        '<div class="sg-stage reveal">' +
          '<div id="' + GLOBE_ID + '" role="img" ' +
            'aria-label="Interactive globe showing connections from Malibu to Paris, London, Barcelona, Milan, New York and Dubai"></div>' +
          '<div class="sg-tip">Malibu &rarr; the world</div>' +
          '<div class="sg-fallback">Donna represents clients across the globe.' +
            '<ul><li>Malibu</li><li>Paris</li><li>London</li><li>Barcelona</li>' +
            '<li>Milan</li><li>New York</li><li>Dubai</li></ul></div>' +
        '</div>' +
      '</div>';

    var about = document.getElementById('about');
    if (about && about.parentNode) {
      about.parentNode.insertBefore(sec, about);
    } else {
      document.body.appendChild(sec);
    }
    return sec;
  }

  /* ---------------------------------------------------------------- helpers */
  function hasWebGL() {
    try {
      var c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext &&
        (c.getContext('webgl') || c.getContext('experimental-webgl')));
    } catch (e) {
      return false;
    }
  }

  function showFallback(sec) {
    var stage = sec.querySelector('.sg-stage');
    var globe = document.getElementById(GLOBE_ID);
    var tip = sec.querySelector('.sg-tip');
    var fb = sec.querySelector('.sg-fallback');
    if (globe) globe.style.display = 'none';
    if (tip) tip.style.display = 'none';
    if (stage) { stage.style.minHeight = '0'; stage.style.padding = '1.4rem'; }
    if (fb) fb.style.display = 'block';
  }

  function sizeOf(el) {
    var r = el.getBoundingClientRect();
    var w = Math.max(1, Math.round(r.width));
    var h = Math.max(1, Math.round(r.height));
    /* Fallbacks: if layout hasn't resolved a real height, derive from viewport */
    if (h < 80) h = Math.round((window.innerHeight || 800) * 0.62);
    if (w < 80) {
      var pr = el.parentElement ? el.parentElement.getBoundingClientRect().width : 0;
      w = Math.max(320, Math.round(pr || window.innerWidth || 1000));
    }
    return { w: w, h: h };
  }

  /* ---------------------------------------------------------------- init */
  function init() {
    if (state.inited) return;
    state.inited = true;

    injectStyle();
    var sec = buildSection();

    // globe.gl missing -> hide the whole section, no broken hole.
    if (typeof window.Globe !== 'function') {
      sec.style.display = 'none';
      return;
    }
    // No WebGL -> graceful text fallback.
    if (!hasWebGL()) {
      showFallback(sec);
      return;
    }

    state.reduced = !!(window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion:reduce)').matches);

    var container = document.getElementById(GLOBE_ID);
    if (!container) { sec.style.display = 'none'; return; }

    var size = sizeOf(container);
    var isMobile = window.matchMedia && window.matchMedia('(max-width:760px)').matches;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);

    var world;
    try {
      world = window.Globe()(container);
    } catch (e) {
      sec.style.display = 'none';
      return;
    }
    state.world = world;

    /* ---- appearance ---- */
    world
      .backgroundColor('rgba(0,0,0,0)')
      .globeImageUrl('//unpkg.com/three-globe/example/img/earth-night.jpg')
      .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
      .showAtmosphere(true)
      .atmosphereColor(GOLD)
      .atmosphereAltitude(0.16)
      .width(size.w)
      .height(size.h);

    // Cap devicePixelRatio on the underlying renderer.
    try {
      if (typeof world.renderer === 'function' && world.renderer()) {
        world.renderer().setPixelRatio(dpr);
      }
    } catch (e) { /* non-fatal */ }

    /* ---- arcs Malibu -> destinations ---- */
    var arcs = DEST.map(function (d) {
      return {
        startLat: MALIBU.lat, startLng: MALIBU.lng,
        endLat: d.lat, endLng: d.lng
      };
    });
    world
      .arcsData(arcs)
      .arcColor(function () {
        return ['rgba(201,169,110,0.1)', GOLD_SOFT, 'rgba(201,169,110,0.1)'];
      })
      .arcStroke(0.5)
      .arcsTransitionDuration(0);

    if (state.reduced) {
      // Static, solid arcs: full-length dash, no gap, no cycle.
      // Avoids arcDashAnimateTime(0) which can produce NaN in the dash progress math.
      world
        .arcDashLength(1)
        .arcDashGap(0)
        .arcDashInitialGap(function () { return 0; })
        .arcDashAnimateTime(0);
    } else {
      world
        .arcDashLength(0.4)
        .arcDashGap(0.2)
        .arcDashInitialGap(function () { return Math.random(); })
        .arcDashAnimateTime(3500);
    }

    /* ---- animated rings at every city ---- */
    var ringPts = [MALIBU].concat(DEST).map(function (p) {
      return { lat: p.lat, lng: p.lng, name: p.name };
    });
    world
      .ringsData(state.reduced ? [] : ringPts)
      .ringColor(function () {
        return function (t) { return 'rgba(201,169,110,' + (1 - t) + ')'; };
      })
      .ringMaxRadius(3)
      .ringPropagationSpeed(2)
      .ringRepeatPeriod(1200);

    /* ---- solid gold points as anchors ---- */
    world
      .pointsData(ringPts)
      .pointLat(function (d) { return d.lat; })
      .pointLng(function (d) { return d.lng; })
      .pointColor(function () { return GOLD_SOFT; })
      .pointAltitude(0.01)
      .pointRadius(0.32)
      .pointsMerge(false);

    /* ---- HTML city labels (skip on small screens to reduce clutter) ---- */
    if (!isMobile && typeof world.htmlElementsData === 'function') {
      world
        .htmlElementsData(ringPts)
        .htmlLat(function (d) { return d.lat; })
        .htmlLng(function (d) { return d.lng; })
        .htmlAltitude(0.012)
        .htmlElement(function (d) {
          var el = document.createElement('div');
          el.className = 'sg-label';
          el.textContent = d.name;
          return el;
        });
    }

    /* ---- controls & initial camera ---- */
    try {
      var controls = world.controls();
      controls.enableZoom = false;
      controls.autoRotate = !state.reduced;
      controls.autoRotateSpeed = 0.6;
      controls.enablePan = false;
    } catch (e) { /* non-fatal */ }

    // Center near LA / Malibu initially (Malibu longitude), framing the arc origin.
    try {
      world.pointOfView({ lat: 34, lng: -118, altitude: 2.3 }, 0);
    } catch (e) { /* non-fatal */ }

    /* ---- resize handling ---- */
    function resize() {
      if (!state.world) return;
      var s = sizeOf(container);
      var ndpr = Math.min(window.devicePixelRatio || 1, 2);
      try {
        state.world.width(s.w).height(s.h);
        if (typeof state.world.renderer === 'function' && state.world.renderer()) {
          state.world.renderer().setPixelRatio(ndpr);
        }
      } catch (e) { /* non-fatal */ }
    }
    state.resizeHandler = resize;

    if (typeof ResizeObserver === 'function') {
      state.ro = new ResizeObserver(function () { resize(); });
      state.ro.observe(container);
    }
    window.addEventListener('resize', resize, { passive: true });

    /* ---- pause rotation when tab hidden OR section off-screen ---- *
     * Single source of truth: rotate only when visible AND on-screen AND
     * motion is not reduced. This prevents visibilitychange from re-enabling
     * rotation while the section is scrolled out of view. */
    function computeAnimate() {
      try {
        var ctrls = state.world.controls();
        ctrls.autoRotate = !state.reduced && state.onScreen && !document.hidden;
      } catch (e) { /* non-fatal */ }
    }

    document.addEventListener('visibilitychange', computeAnimate);

    if (typeof IntersectionObserver === 'function') {
      var io = new IntersectionObserver(function (entries) {
        for (var i = 0; i < entries.length; i++) {
          state.onScreen = entries[i].isIntersecting;
        }
        computeAnimate();
      }, { threshold: 0.05 });
      io.observe(sec);
    } else {
      state.onScreen = true;
    }

    // Final size sync after layout settles.
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(resize);
    }
  }

  /* ---------------------------------------------------------------- boot */
  function boot() {
    try { init(); } catch (e) { /* never break the page */ }
  }

  if (document.readyState !== 'loading') {
    boot();
  } else {
    document.addEventListener('DOMContentLoaded', boot);
  }

  window.SolsticeGlobe = {
    init: boot,
    get world() { return state.world; }
  };
})();