/* =====================================================================
   Solstice International Realty — MOTION SYSTEM (motion.js)
   Apple-grade motion: Lenis smooth scroll + GSAP + ScrollTrigger.
   CLASSIC script. ONE global exposed: window.SolsticeMotion.
   Entire file wrapped in an IIFE to avoid collisions with app.js.
   scriptSrcs (UMD): lenis, gsap, ScrollTrigger.
   ===================================================================== */
(function () {
  'use strict';

  /* ---- Guard against double-init ---- */
  if (window.SolsticeMotion && window.SolsticeMotion.__ready) return;

  /* ---- Environment / capability flags ---- */
  var REDUCED = false;
  try {
    REDUCED = window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) { REDUCED = false; }

  var FINE_POINTER = false;
  try {
    FINE_POINTER = window.matchMedia &&
      window.matchMedia('(pointer: fine)').matches;
  } catch (e) { FINE_POINTER = false; }

  var HAS_GSAP = typeof window.gsap !== 'undefined';
  var HAS_ST = typeof window.ScrollTrigger !== 'undefined';
  var HAS_LENIS = typeof window.Lenis !== 'undefined';

  var gsap = window.gsap;
  var ScrollTrigger = window.ScrollTrigger;

  if (HAS_GSAP && HAS_ST) {
    try { gsap.registerPlugin(ScrollTrigger); } catch (e) { HAS_ST = false; }
  }

  /* ---- Module state ---- */
  var lenis = null;
  var heroStarted = false;
  var initialized = false;

  /* ---- Tiny helpers (all local — no global leakage) ---- */
  function q(sel, root) { return (root || document).querySelector(sel); }
  function qa(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }
  function onReady(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn, { once: true });
  }
  /* Force an element fully visible (failsafe / reduced-motion) */
  function forceVisible(el) {
    if (!el) return;
    el.style.opacity = '1';
    el.style.transform = 'none';
    el.style.visibility = 'visible';
    el.style.clipPath = 'none';
    el.classList.add('in');
    el.classList.remove('pre');
  }
  /* Is an element within or above the viewport bottom (i.e. it should
     already have been revealed)? Used by the stuck-content failsafe. */
  function isWithinViewport(el) {
    try {
      var r = el.getBoundingClientRect();
      var vh = window.innerHeight || document.documentElement.clientHeight || 0;
      /* top has scrolled past the reveal start line (or is on screen) */
      return r.top < vh * 0.98;
    } catch (e) { return true; }
  }
  /* Current effective opacity (0..1); tolerant of missing getComputedStyle. */
  function effectiveOpacity(el) {
    try {
      var cs = window.getComputedStyle(el);
      var o = parseFloat(cs && cs.opacity);
      return isNaN(o) ? 1 : o;
    } catch (e) { return 1; }
  }

  /* =====================================================================
     0) INJECT STYLES (progress bar, split wrappers, hidden states)
     ===================================================================== */
  function injectStyles() {
    if (document.getElementById('solstice-motion-css')) return;
    var css = [
      /* scroll-progress bar */
      '#solstice-progress{position:fixed;top:0;left:0;height:2px;width:0%;',
      'z-index:65;pointer-events:none;transform-origin:0 50%;',
      'background:linear-gradient(90deg,var(--gold,#c9a96e),var(--gold-soft,#e3cfa4));',
      'box-shadow:0 0 10px rgba(201,169,110,.55),0 0 22px rgba(201,169,110,.30);',
      'border-radius:0 2px 2px 0;will-change:width;}',
      /* split line wrappers for the hero headline */
      '.sm-line{display:block;overflow:hidden;padding-bottom:.02em;}',
      '.sm-word{display:inline-block;white-space:pre;will-change:transform;}',
      /* hidden pre-state for hero pieces (JS-driven; only applied when motion active) */
      '.sm-hide{opacity:0;}',
      '.sm-word-hide{transform:translateY(110%);}',
      /* respect reduced-motion: never keep anything hidden via our classes */
      '@media (prefers-reduced-motion: reduce){',
      '.sm-hide,.sm-word-hide{opacity:1 !important;transform:none !important;}',
      '.sm-line{overflow:visible;}}'
    ].join('');
    var s = document.createElement('style');
    s.id = 'solstice-motion-css';
    s.textContent = css;
    (document.head || document.documentElement).appendChild(s);
  }

  /* =====================================================================
     1) SCROLL PROGRESS BAR
     ===================================================================== */
  var progressEl = null;
  function buildProgressBar() {
    progressEl = document.getElementById('solstice-progress');
    if (!progressEl) {
      progressEl = document.createElement('div');
      progressEl.id = 'solstice-progress';
      progressEl.setAttribute('aria-hidden', 'true');
      (document.body || document.documentElement).appendChild(progressEl);
    }
    updateProgress();
  }
  function updateProgress() {
    if (!progressEl) return;
    var doc = document.documentElement;
    var scrollTop = window.pageYOffset || doc.scrollTop || 0;
    var max = (doc.scrollHeight - doc.clientHeight) || 1;
    var p = Math.max(0, Math.min(1, scrollTop / max));
    progressEl.style.width = (p * 100) + '%';
  }

  /* =====================================================================
     2) LENIS SMOOTH SCROLL
     ===================================================================== */
  function initLenis() {
    /* Smooth-scroll momentum disabled — users read it as "auto-scrolling".
       Native scroll is used instead; ScrollTrigger listens to native scroll
       and anchor clicks fall back to window.scrollTo (see initAnchorScroll). */
    return;
    /* eslint-disable no-unreachable */
    if (REDUCED || !HAS_LENIS) return;
    try {
      lenis = new window.Lenis({
        lerp: 0.09,
        wheelMultiplier: 1,
        smoothWheel: true,
        touchMultiplier: 1.4
      });
    } catch (e) { lenis = null; return; }

    /* Wire to GSAP ticker for a single unified rAF loop */
    if (HAS_GSAP) {
      gsap.ticker.add(function (t) {
        if (document.hidden) return;
        try { lenis.raf(t * 1000); } catch (e) {}
      });
      gsap.ticker.lagSmoothing(0);
    } else {
      /* No GSAP — drive Lenis with our own rAF */
      var loop = function (time) {
        if (!document.hidden) {
          try { lenis.raf(time); } catch (e) {}
        }
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }

    /* Sync ScrollTrigger + progress bar */
    lenis.on('scroll', function () {
      if (HAS_ST) { try { ScrollTrigger.update(); } catch (e) {} }
      updateProgress();
    });

    /* Pause Lenis while tab hidden to save battery */
    document.addEventListener('visibilitychange', function () {
      if (!lenis) return;
      try { document.hidden ? lenis.stop() : lenis.start(); } catch (e) {}
    });
  }

  /* Add data-lenis-prevent to elements Lenis should not hijack. */
  function markLenisPrevent() {
    ['#overlay', '#map', '#mapWrap', '.modal-thumbs'].forEach(function (sel) {
      qa(sel).forEach(function (el) {
        el.setAttribute('data-lenis-prevent', '');
      });
    });
    /* #overlay content is injected dynamically — observe for it */
    var overlay = document.getElementById('overlay');
    if (overlay && typeof MutationObserver !== 'undefined') {
      var mo = new MutationObserver(function () {
        qa('.modal-thumbs', overlay).forEach(function (el) {
          el.setAttribute('data-lenis-prevent', '');
        });
      });
      try { mo.observe(overlay, { childList: true, subtree: true }); } catch (e) {}
    }
  }

  /* Smooth anchor navigation */
  function initAnchorScroll() {
    document.addEventListener('click', function (e) {
      var a = e.target && e.target.closest ? e.target.closest('a[href^="#"]') : null;
      if (!a) return;
      var href = a.getAttribute('href');
      if (!href || href === '#' || href.length < 2) return;
      var target;
      try { target = document.querySelector(href); } catch (err) { return; }
      if (!target) return;
      e.preventDefault();
      if (lenis && !REDUCED) {
        try { lenis.scrollTo(target, { offset: -80, duration: 1.2 }); } catch (er) {}
      } else {
        var top = target.getBoundingClientRect().top +
          (window.pageYOffset || 0) - 80;
        window.scrollTo({
          top: top,
          behavior: REDUCED ? 'auto' : 'smooth'
        });
      }
    }, false);
  }

  /* =====================================================================
     3) HERO SPLIT + INTRO TIMELINE
     ===================================================================== */
  var heroEyebrow, heroH1, heroLede, heroSearch, heroStats, heroBg;
  var heroWordEls = [];

  /* Split a headline into line wrappers + word spans, preserving inner
     markup like <br> and <span class="gold">. Returns array of word spans. */
  function splitHeadline(h1) {
    if (!h1 || h1.getAttribute('data-sm-split') === '1') {
      return qa('.sm-word', h1);
    }
    var words = [];
    var line = document.createElement('span');
    line.className = 'sm-line';

    function flushLine(parent) {
      parent.appendChild(line);
      line = document.createElement('span');
      line.className = 'sm-line';
    }

    /* Walk original child nodes, rebuilding into line wrappers. */
    var srcNodes = Array.prototype.slice.call(h1.childNodes);
    var frag = document.createDocumentFragment();

    function wrapText(text, styleClass) {
      /* split on whitespace but keep words */
      var parts = text.split(/(\s+)/);
      for (var i = 0; i < parts.length; i++) {
        var part = parts[i];
        if (part === '') continue;
        if (/^\s+$/.test(part)) {
          /* whitespace: add a space text node inside current line */
          line.appendChild(document.createTextNode(' '));
          continue;
        }
        var w = document.createElement('span');
        w.className = 'sm-word';
        if (styleClass) w.className += ' ' + styleClass;
        w.textContent = part;
        line.appendChild(w);
        words.push(w);
      }
    }

    for (var n = 0; n < srcNodes.length; n++) {
      var node = srcNodes[n];
      if (node.nodeType === 3) {
        /* text node */
        wrapText(node.nodeValue, null);
      } else if (node.nodeType === 1) {
        var tag = node.tagName.toLowerCase();
        if (tag === 'br') {
          flushLine(frag);
        } else {
          /* element like <span class="gold"> — preserve its classes,
             split its text content into words that keep those classes. */
          var cls = node.className || '';
          var inner = node.textContent || '';
          wrapText(inner, cls);
        }
      }
    }
    /* flush trailing line */
    if (line.childNodes.length) frag.appendChild(line);

    h1.innerHTML = '';
    h1.appendChild(frag);
    h1.setAttribute('data-sm-split', '1');
    return words;
  }

  function cacheHeroEls() {
    var hero = q('.hero');
    if (!hero) return false;
    heroEyebrow = q('.eyebrow', hero);
    heroH1 = q('h1', hero);
    heroLede = q('.lede', hero);
    heroSearch = q('.ai-search', hero);
    heroStats = q('.hero-stats', hero);
    heroBg = q('.hero-bg', hero);
    return true;
  }

  /* Prepare hidden pre-states in JS (do not rely on integrator CSS). */
  function prepHeroHidden() {
    if (REDUCED || !HAS_GSAP) return; /* keep visible if we can't animate */
    /* No word-split — reveal the headline as one clean block (calmer + never
       gets stuck mid-stagger). */
    heroWordEls = [];
    var pieces = [heroEyebrow, heroH1, heroLede, heroSearch, heroStats];
    pieces.forEach(function (el) {
      if (el) { try { gsap.set(el, { opacity: 0, y: 20 }); } catch (e) {} }
    });
  }

  function runHeroIntro() {
    if (heroStarted) return;
    heroStarted = true;

    if (REDUCED || !HAS_GSAP) {
      /* Ensure everything visible, no animation */
      [heroEyebrow, heroH1, heroLede, heroSearch, heroStats].forEach(forceVisible);
      heroWordEls.forEach(function (w) {
        w.style.transform = 'none'; w.style.opacity = '1';
      });
      return;
    }

    try {
      var tl = gsap.timeline({ defaults: { ease: 'expo.out' } });

      if (heroEyebrow) {
        tl.to(heroEyebrow, { opacity: 1, y: 0, duration: 0.8 }, 0.0);
      }
      if (heroWordEls.length) {
        tl.to(heroWordEls, {
          yPercent: 0,
          opacity: 1,
          duration: 1.1,
          stagger: 0.08
        }, 0.12);
      } else if (heroH1) {
        tl.to(heroH1, { opacity: 1, y: 0, duration: 1.0 }, 0.12);
      }
      if (heroLede) {
        tl.to(heroLede, { opacity: 1, y: 0, duration: 0.9 }, '-=0.55');
      }
      if (heroSearch) {
        tl.to(heroSearch, { opacity: 1, y: 0, duration: 0.9 }, '-=0.6');
      }
      if (heroStats) {
        tl.to(heroStats, { opacity: 1, y: 0, duration: 0.9 }, '-=0.6');
      }
    } catch (e) {
      /* If the timeline blows up, never leave the hero hidden. */
      [heroEyebrow, heroH1, heroLede, heroSearch, heroStats].forEach(forceVisible);
      heroWordEls.forEach(function (w) {
        w.style.transform = 'none'; w.style.opacity = '1';
      });
    }
  }

  function armHeroTrigger() {
    /* Start on solstice:loaded, else failsafe after 2.2s */
    var started = false;
    var kick = function () {
      if (started) return;
      started = true;
      runHeroIntro();
    };
    window.addEventListener('solstice:loaded', kick, { once: true });
    setTimeout(kick, 1600);
    /* Hard failsafe: no matter what, the hero must be fully visible. */
    setTimeout(function () {
      [heroEyebrow, heroH1, heroLede, heroSearch, heroStats].forEach(forceVisible);
    }, 3200);
  }

  /* =====================================================================
     4) SCROLL REVEALS
     ===================================================================== */
  function collectReveals() {
    var set = [];
    var seen = [];
    qa('[data-reveal], .reveal').forEach(function (el) {
      if (seen.indexOf(el) === -1) { seen.push(el); set.push(el); }
    });
    return set;
  }

  function initReveals() {
    var els = collectReveals();
    if (!els.length) return;

    if (REDUCED || !HAS_GSAP || !HAS_ST) {
      els.forEach(forceVisible);
      return;
    }

    els.forEach(function (el) {
      /* skip hero pieces already handled by intro timeline */
      if (el.closest && el.closest('.hero')) { return; }
      try {
        gsap.set(el, { opacity: 0, y: 40 });
        ScrollTrigger.create({
          trigger: el,
          start: 'top 85%',
          once: true,
          onEnter: function () {
            gsap.to(el, {
              opacity: 1,
              y: 0,
              duration: 0.9,
              ease: 'power3.out'
            });
            el.classList.add('in');
          }
        });
      } catch (e) {
        /* Any failure per-element must not hide content or abort the loop. */
        forceVisible(el);
      }
    });

    /* backup: any reveal in hero (not animated above) → visible */
    els.forEach(function (el) {
      if (el.closest && el.closest('.hero')) forceVisible(el);
    });
  }

  /* Failsafe sweep — nothing on/above the viewport may stay stuck hidden. */
  function revealFailsafe() {
    var els = collectReveals();
    if (!els.length) return;

    if (REDUCED || !HAS_GSAP || !HAS_ST) {
      els.forEach(forceVisible);
      return;
    }

    /* GSAP/ScrollTrigger present: only rescue elements that SHOULD already
       be visible (within/above the viewport) but are still ~invisible —
       i.e. a trigger that never fired. Below-fold items are left alone so
       their reveal can still play on scroll. */
    els.forEach(function (el) {
      if (el.closest && el.closest('.hero')) { forceVisible(el); return; }
      if (isWithinViewport(el) && effectiveOpacity(el) < 0.05) {
        forceVisible(el);
      }
    });
  }

  /* =====================================================================
     5) PARALLAX
     ===================================================================== */
  function initParallax() {
    if (REDUCED || !HAS_GSAP || !HAS_ST) return;

    qa('[data-parallax]').forEach(function (el) {
      var speed = parseFloat(el.getAttribute('data-speed'));
      if (isNaN(speed)) speed = 0.2;
      try {
        gsap.to(el, {
          yPercent: speed * 100,
          ease: 'none',
          scrollTrigger: {
            trigger: el,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true
          }
        });
      } catch (e) { /* parallax is purely decorative — skip on failure */ }
    });

    /* Hero background: subtle upward drift on scroll */
    if (heroBg) {
      var heroSec = heroBg.closest('.hero') || heroBg.parentElement;
      try {
        gsap.to(heroBg, {
          yPercent: -14,
          ease: 'none',
          scrollTrigger: {
            trigger: heroSec,
            start: 'top top',
            end: 'bottom top',
            scrub: true
          }
        });
      } catch (e) {}
    }
  }

  /* =====================================================================
     6) COUNT-UP
     ===================================================================== */
  /* Parse "$2B+" / "Top 2%" / "20+" / "20+ yrs" → {prefix,num,suffix,dec} */
  function parseCount(text) {
    var m = text.match(/-?\d[\d,]*\.?\d*/);
    if (!m) return null;
    var raw = m[0];
    var idx = text.indexOf(raw);
    var prefix = text.slice(0, idx);
    var suffix = text.slice(idx + raw.length);
    var numStr = raw.replace(/,/g, '');
    var num = parseFloat(numStr);
    if (isNaN(num)) return null;
    var decPart = numStr.split('.')[1];
    var dec = decPart ? decPart.length : 0;
    var grouped = raw.indexOf(',') !== -1;
    return { prefix: prefix, num: num, suffix: suffix, dec: dec, grouped: grouped };
  }

  function formatNum(v, dec, grouped) {
    var out = dec > 0 ? v.toFixed(dec) : String(Math.round(v));
    if (grouped) {
      var parts = out.split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      out = parts.join('.');
    }
    return out;
  }

  function initCountUp() {
    var els = qa('[data-count]');
    if (!els.length) return;

    els.forEach(function (el) {
      var original = el.textContent.trim();
      /* snapshot original so we can restore exactly on any failure */
      el.setAttribute('data-count-original', original);
      var parsed = parseCount(original);

      if (!parsed || REDUCED || !HAS_GSAP || !HAS_ST) {
        el.textContent = original; /* leave as-is, fully visible */
        return;
      }

      var obj = { v: 0 };
      var applyCount = function () {
        el.textContent = parsed.prefix +
          formatNum(obj.v, parsed.dec, parsed.grouped) + parsed.suffix;
      };
      /* start at zero display */
      applyCount();

      try {
        ScrollTrigger.create({
          trigger: el,
          start: 'top 90%',
          once: true,
          onEnter: function () {
            gsap.to(obj, {
              v: parsed.num,
              duration: 1.6,
              ease: 'power2.out',
              onUpdate: applyCount,
              onComplete: function () {
                /* guarantee exact original text at the end */
                el.textContent = original;
              }
            });
          }
        });
      } catch (e) {
        /* Could not arm the trigger — never leave it stuck at zero. */
        el.textContent = original;
      }
    });
  }

  /* Failsafe: every [data-count] must show its exact original string.
     Restores whenever the current text differs from the snapshot, which
     covers the zero-display case ("$0B+", "Top 0%") and any interrupted
     tween — not just literal '' / '0'. */
  function countUpFailsafe() {
    qa('[data-count]').forEach(function (el) {
      var orig = el.getAttribute('data-count-original');
      if (orig == null) return;
      if (el.textContent.trim() !== orig) {
        el.textContent = orig;
      }
    });
  }

  /* =====================================================================
     7) MAGNETIC (desktop, fine pointer only)
     ===================================================================== */
  function initMagnetic() {
    if (REDUCED || !FINE_POINTER || !HAS_GSAP) return;

    var els = [];
    var seen = [];
    qa('[data-magnetic], .btn-gold').forEach(function (el) {
      if (seen.indexOf(el) === -1) { seen.push(el); els.push(el); }
    });

    els.forEach(function (el) {
      var strengthAttr = parseFloat(el.getAttribute('data-magnetic'));
      var strength = isNaN(strengthAttr) ? 0.3 : strengthAttr;

      var move = function (e) {
        var r = el.getBoundingClientRect();
        var relX = e.clientX - (r.left + r.width / 2);
        var relY = e.clientY - (r.top + r.height / 2);
        gsap.to(el, {
          x: relX * strength,
          y: relY * strength,
          duration: 0.4,
          ease: 'power3.out'
        });
      };
      var leave = function () {
        gsap.to(el, {
          x: 0,
          y: 0,
          duration: 0.6,
          ease: 'elastic.out(1, 0.4)'
        });
      };
      el.addEventListener('mousemove', move);
      el.addEventListener('mouseleave', leave);
    });
  }

  /* =====================================================================
     8) RESIZE / REFRESH
     ===================================================================== */
  function handleResize() {
    updateProgress();
    if (HAS_ST) { try { ScrollTrigger.refresh(); } catch (e) {} }
  }
  function bindResize() {
    var t = null;
    window.addEventListener('resize', function () {
      if (t) clearTimeout(t);
      t = setTimeout(handleResize, 180);
    });
    /* Update progress on native scroll too (covers no-Lenis / reduced) */
    window.addEventListener('scroll', updateProgress, { passive: true });
  }

  /* Public refresh */
  function refresh() {
    updateProgress();
    if (HAS_ST) { try { ScrollTrigger.refresh(); } catch (e) {} }
  }

  /* =====================================================================
     INIT
     ===================================================================== */
  function init() {
    if (initialized) return;
    initialized = true;

    injectStyles();
    buildProgressBar();

    /* Hero setup */
    var haveHero = cacheHeroEls();
    if (haveHero) {
      prepHeroHidden();
      armHeroTrigger();
    }

    /* Smooth scroll + anchors */
    initLenis();
    markLenisPrevent();
    initAnchorScroll();

    /* Reveals / parallax / count / magnetic */
    initReveals();
    initParallax();
    initCountUp();
    initMagnetic();

    bindResize();

    /* Immediate + delayed failsafes so content is NEVER stuck hidden */
    setTimeout(function () {
      revealFailsafe();
      countUpFailsafe();
      updateProgress();
      if (HAS_ST) { try { ScrollTrigger.refresh(); } catch (e) {} }
    }, 400);

    setTimeout(function () {
      /* Hard failsafe at 3s: if GSAP/ScrollTrigger failed, reveal all. */
      if (!HAS_GSAP || !HAS_ST) {
        collectReveals().forEach(forceVisible);
      } else {
        /* Still rescue anything on/above the fold that never fired. */
        revealFailsafe();
      }
      countUpFailsafe();
      if (!heroStarted) runHeroIntro();
      updateProgress();
    }, 3000);

    /* Expose API */
    window.SolsticeMotion.lenis = lenis;
    window.SolsticeMotion.refresh = refresh;
    window.SolsticeMotion.__ready = true;
  }

  /* Pre-create the namespace so consumers can reference it early. */
  window.SolsticeMotion = window.SolsticeMotion || {};
  window.SolsticeMotion.lenis = null;
  window.SolsticeMotion.refresh = refresh;
  window.SolsticeMotion.__ready = false;

  onReady(init);
})();