/* ==========================================================================
   Solstice International Realty — AtmosUI (atmos-ui.js)
   Cinematic UI atmosphere: LOADER + CUSTOM CURSOR + AMBIENT SOUND.
   Apple-grade spatial polish × web3 iridescent glow. Dark, premium.

   COLLISION-SAFE: entire file is wrapped in one IIFE. Exposes exactly one
   global — window.SolsticeAtmosUI. No other top-level identifiers.

   Plug-and-play: injects its own <style> + DOM. Integrator only adds ONE
   tag, placed in <head> and NOT deferred so the loader covers first paint
   synchronously:
     <script src="js/atmos-ui.js"></script>
   ========================================================================== */
(function () {
  'use strict';

  if (window.SolsticeAtmosUI) return; // guard against double-load

  /* ----------------------------------------------------------------------
     Shared helpers / feature detection
     ---------------------------------------------------------------------- */
  var DOC = document;
  var ROOT = DOC.documentElement;
  var win = window;

  var reduceMotion = false;
  try {
    reduceMotion = win.matchMedia &&
      win.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) { reduceMotion = false; }

  var finePointer = false;
  try {
    finePointer = win.matchMedia &&
      win.matchMedia('(hover: hover) and (pointer: fine)').matches;
  } catch (e) { finePointer = false; }

  function onReady(fn) {
    if (DOC.readyState !== 'loading') { fn(); }
    else { DOC.addEventListener('DOMContentLoaded', fn, { once: true }); }
  }

  function make(tag, cls) {
    var el = DOC.createElement(tag);
    if (cls) el.className = cls;
    return el;
  }

  /* ----------------------------------------------------------------------
     STYLE injection — one <style> element for the whole module.
     Also pulls Space Grotesk + JetBrains Mono (not loaded by the page).
     ---------------------------------------------------------------------- */
  function injectFonts() {
    try {
      if (DOC.getElementById('sir-atmos-fonts')) return;
      var link = make('link');
      link.id = 'sir-atmos-fonts';
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Space+Grotesk:wght@400;500;600&display=swap';
      (DOC.head || ROOT).appendChild(link);
    } catch (e) { /* fonts are decorative; ignore */ }
  }

  function injectStyle() {
    if (DOC.getElementById('sir-atmos-style')) return;
    var css = [
      /* ---- font stacks (graceful fallback if the CDN fonts fail) ---- */
      ':root{--sir-grotesk:"Space Grotesk","Manrope",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;',
      '--sir-mono:"JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;',
      '--sir-serif:"Cormorant Garamond",Georgia,serif}',

      /* =================================================================
         LOADER
         ================================================================= */
      '#sir-loader{position:fixed;inset:0;z-index:9999;background:var(--ink,#0c0f0d);',
      'display:flex;flex-direction:column;align-items:center;justify-content:center;',
      'overflow:hidden;will-change:transform;',
      'transition:transform .9s cubic-bezier(.76,0,.24,1);',
      'transform:translateY(0)}',
      '#sir-loader.sir-lift{transform:translateY(-100%)}',
      /* faint aurora wash behind the wordmark */
      '#sir-loader::before{content:"";position:absolute;left:50%;top:50%;',
      'width:120vmax;height:120vmax;transform:translate(-50%,-50%);pointer-events:none;',
      'background:radial-gradient(closest-side,rgba(201,169,110,.10),transparent 70%);',
      'opacity:.9}',
      '.sir-load-inner{position:relative;text-align:center;padding:0 6vw}',
      '.sir-word{display:flex;justify-content:center;align-items:baseline;',
      'font-family:var(--sir-serif);color:var(--cream,#fbfaf5);',
      'font-weight:500;line-height:1;letter-spacing:.16em;',
      'font-size:clamp(2.4rem,11vw,6.5rem);',
      'position:relative}',
      '.sir-word .l{display:inline-block;opacity:0;transform:translateY(0.7em);',
      'will-change:transform,opacity}',
      /* iridescent shimmer sweep over the wordmark */
      '.sir-word .shine{position:absolute;inset:0;pointer-events:none;',
      'background:linear-gradient(105deg,transparent 30%,',
      'rgba(227,207,164,.55) 44%,rgba(232,180,200,.45) 50%,',
      'rgba(127,217,212,.40) 56%,transparent 70%);',
      'mix-blend-mode:screen;opacity:0;',
      '-webkit-mask-image:linear-gradient(#000,#000);mask-image:linear-gradient(#000,#000)}',
      '.sir-line{height:1px;width:0;margin:1.2rem auto .9rem;',
      'background:linear-gradient(90deg,transparent,var(--gold,#c9a96e) 20%,',
      'var(--gold-soft,#e3cfa4) 50%,var(--gold,#c9a96e) 80%,transparent);',
      'box-shadow:0 0 12px rgba(201,169,110,.55)}',
      '.sir-sub{font-family:var(--sir-grotesk);font-size:clamp(.55rem,1.6vw,.72rem);',
      'letter-spacing:.42em;text-transform:uppercase;color:var(--gold,#c9a96e);',
      'opacity:0;transform:translateY(6px)}',

      /* keyframes */
      '@keyframes sirLetter{to{opacity:1;transform:translateY(0)}}',
      '@keyframes sirLine{to{width:min(360px,64vw)}}',
      '@keyframes sirSub{to{opacity:.9;transform:translateY(0)}}',
      '@keyframes sirShine{0%{opacity:0;transform:translateX(-60%)}',
      '20%{opacity:1}80%{opacity:1}100%{opacity:0;transform:translateX(60%)}}',

      /* =================================================================
         CUSTOM CURSOR
         ================================================================= */
      'html.sir-cursor-on,html.sir-cursor-on *{cursor:none !important}',
      '#sir-cur-dot,#sir-cur-ring{position:fixed;top:0;left:0;z-index:10000;',
      'pointer-events:none;border-radius:50%;',
      'transform:translate3d(-50%,-50%,0);will-change:transform}',
      '#sir-cur-dot{width:7px;height:7px;margin-left:0;margin-top:0;',
      'background:var(--gold,#c9a96e);',
      'box-shadow:0 0 8px rgba(201,169,110,.9),0 0 3px rgba(232,180,200,.8)}',
      '#sir-cur-ring{width:34px;height:34px;border:1px solid rgba(201,169,110,.55);',
      'display:flex;align-items:center;justify-content:center;',
      'box-shadow:0 0 14px rgba(201,169,110,.28),',
      '0 0 22px rgba(127,217,212,.14),inset 0 0 10px rgba(232,180,200,.10);',
      'transition:width .28s cubic-bezier(.22,1,.36,1),',
      'height .28s cubic-bezier(.22,1,.36,1),',
      'border-color .28s ease,background-color .28s ease}',
      '#sir-cur-ring.sir-grow{width:56px;height:56px;border-color:rgba(201,169,110,.85);',
      'background:rgba(201,169,110,.06)}',
      '#sir-cur-ring.sir-view{width:74px;height:74px;border-color:rgba(232,180,200,.75);',
      'background:rgba(12,15,13,.28)}',
      '#sir-cur-ring .lab{font-family:var(--sir-mono);font-size:8.5px;',
      'letter-spacing:.22em;color:var(--gold-soft,#e3cfa4);',
      'opacity:0;transform:scale(.8);transition:opacity .2s ease,transform .2s ease;',
      'text-transform:uppercase}',
      '#sir-cur-ring.sir-view .lab{opacity:1;transform:scale(1)}',
      '#sir-cur-dot.sir-hidden,#sir-cur-ring.sir-hidden{opacity:0}',

      /* =================================================================
         AMBIENT SOUND TOGGLE
         ================================================================= */
      '#sir-sound{position:fixed;left:16px;bottom:16px;z-index:70;',
      'width:44px;height:44px;border-radius:14px;',
      'display:flex;align-items:center;justify-content:center;',
      'background:rgba(33,43,37,.42);',
      'border:1px solid var(--line,rgba(201,169,110,.22));',
      '-webkit-backdrop-filter:blur(14px) saturate(1.2);',
      'backdrop-filter:blur(14px) saturate(1.2);',
      'box-shadow:0 6px 20px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.06);',
      'cursor:pointer;transition:transform .25s cubic-bezier(.22,1,.36,1),',
      'border-color .25s ease,box-shadow .25s ease}',
      '#sir-sound:hover{transform:translateY(-2px);',
      'border-color:var(--gold,#c9a96e)}',
      '#sir-sound.sir-on{border-color:rgba(201,169,110,.7);',
      'box-shadow:0 6px 22px rgba(0,0,0,.4),0 0 18px rgba(201,169,110,.28),',
      'inset 0 1px 0 rgba(255,255,255,.08)}',
      '#sir-sound .eq{display:flex;align-items:flex-end;gap:3px;height:16px}',
      '#sir-sound .eq b{display:block;width:3px;height:5px;border-radius:2px;',
      'background:var(--gold-soft,#e3cfa4);transform-origin:bottom;',
      'transition:background-color .25s ease}',
      '#sir-sound.sir-on .eq b{background:var(--gold,#c9a96e)}',
      '#sir-sound.sir-on .eq b:nth-child(1){animation:sirEq1 .9s ease-in-out infinite}',
      '#sir-sound.sir-on .eq b:nth-child(2){animation:sirEq2 1.15s ease-in-out infinite}',
      '#sir-sound.sir-on .eq b:nth-child(3){animation:sirEq3 .78s ease-in-out infinite}',
      '@keyframes sirEq1{0%,100%{height:5px}50%{height:15px}}',
      '@keyframes sirEq2{0%,100%{height:14px}50%{height:6px}}',
      '@keyframes sirEq3{0%,100%{height:7px}45%{height:16px}80%{height:5px}}',
      '@media (max-width:420px){#sir-sound{left:12px;bottom:12px}}',

      /* reduced-motion: stop equalizer animation but keep it visible */
      '@media (prefers-reduced-motion: reduce){',
      '#sir-sound.sir-on .eq b{animation:none !important}',
      '.sir-word .shine{animation:none !important}}'
    ].join('');

    var style = make('style');
    style.id = 'sir-atmos-style';
    style.textContent = css;
    (DOC.head || ROOT).appendChild(style);
  }

  /* ======================================================================
     (1) LOADER  — runs synchronously at script execution (before DOMReady)
     ====================================================================== */
  var Loader = (function () {
    var node = null;
    var lifted = false;
    var removed = false;

    function build() {
      injectFonts();
      injectStyle();

      // Lock scroll while loading; cover instantly on first paint.
      try { ROOT.style.overflow = 'hidden'; } catch (e) {}

      node = make('div');
      node.id = 'sir-loader';
      node.setAttribute('role', 'presentation');
      node.setAttribute('aria-hidden', 'true');

      var inner = make('div', 'sir-load-inner');

      var word = make('div', 'sir-word');
      var letters = 'SOLSTICE'.split('');
      var stagger = reduceMotion ? 0.02 : 0.075;
      var dur = reduceMotion ? 0.28 : 0.62;
      for (var i = 0; i < letters.length; i++) {
        var span = make('span', 'l');
        span.textContent = letters[i];
        span.style.animation = 'sirLetter ' + dur + 's cubic-bezier(.22,1,.36,1) forwards';
        span.style.animationDelay = (0.12 + i * stagger) + 's';
        word.appendChild(span);
      }
      var shine = make('span', 'shine');
      if (!reduceMotion) {
        shine.style.animation = 'sirShine 1.1s ease-in-out forwards';
        shine.style.animationDelay = '0.55s';
      }
      word.appendChild(shine);

      var line = make('div', 'sir-line');
      var lineDur = reduceMotion ? 0.25 : 0.7;
      var lineDelay = reduceMotion ? 0.18 : 0.55;
      line.style.animation = 'sirLine ' + lineDur + 's cubic-bezier(.76,0,.24,1) forwards';
      line.style.animationDelay = lineDelay + 's';

      var sub = make('div', 'sir-sub');
      sub.textContent = 'International Realty';
      var subDelay = reduceMotion ? 0.3 : 0.85;
      sub.style.animation = 'sirSub .6s ease forwards';
      sub.style.animationDelay = subDelay + 's';

      inner.appendChild(word);
      inner.appendChild(line);
      inner.appendChild(sub);
      node.appendChild(inner);

      // Insert as early as possible so first paint is covered.
      if (DOC.body) DOC.body.appendChild(node);
      else if (ROOT) ROOT.appendChild(node);

      var total = reduceMotion ? 600 : 1800;
      win.setTimeout(lift, total);

      // Safety net: never trap the user if something stalls.
      win.setTimeout(function () { if (!removed) lift(); }, total + 4000);
    }

    function lift() {
      if (lifted || !node) return;
      lifted = true;

      // Restore scroll FIRST so any listener that measures layout on the
      // 'solstice:loaded' event (e.g. Lenis / GSAP intro in motion.js) reads
      // an unlocked, correctly-sized document rather than one still held at
      // html{overflow:hidden}.
      try { ROOT.style.overflow = ''; } catch (e) {}

      // Dispatch "loaded" as the curtain STARTS lifting.
      try { win.dispatchEvent(new Event('solstice:loaded')); } catch (e) {}

      node.classList.add('sir-lift');

      var kill = function () { finish(); };
      node.addEventListener('transitionend', kill, { once: true });
      // Fallback in case transitionend never fires.
      win.setTimeout(finish, reduceMotion ? 200 : 1100);
    }

    function finish() {
      if (removed) return;
      removed = true;
      try { ROOT.style.overflow = ''; } catch (e) {}
      if (node && node.parentNode) node.parentNode.removeChild(node);
      node = null;
    }

    // If <body> isn't there yet (script in <head>), append on the fly.
    function init() {
      if (DOC.body) { build(); }
      else {
        // observe for body, but also fall back to DOMContentLoaded
        var attempted = false;
        var tryBuild = function () {
          if (attempted) return;
          if (DOC.body) { attempted = true; build(); }
        };
        var obs;
        try {
          obs = new MutationObserver(function () {
            if (DOC.body) { tryBuild(); if (obs) obs.disconnect(); }
          });
          obs.observe(ROOT, { childList: true, subtree: true });
        } catch (e) {}
        DOC.addEventListener('DOMContentLoaded', function () {
          if (obs) obs.disconnect();
          tryBuild();
        }, { once: true });
      }
    }

    return { init: init, lift: lift };
  })();

  /* ======================================================================
     (2) CUSTOM CURSOR
     ====================================================================== */
  var Cursor = (function () {
    var enabled = false;
    var dot = null, ring = null;
    var mx = 0, my = 0;          // target (mouse)
    var rx = 0, ry = 0;          // ring lerp position
    var raf = 0;
    var visible = false;
    var started = false;

    var VIEW_SEL = '.card,.show-card,[data-cursor-view]';
    var GROW_SEL = 'a,button,[data-magnetic],input,select,textarea,label,.seg button,[role="button"]';

    function build() {
      dot = make('div');
      dot.id = 'sir-cur-dot';
      dot.className = 'sir-hidden';
      ring = make('div');
      ring.id = 'sir-cur-ring';
      ring.className = 'sir-hidden';
      var lab = make('span', 'lab');
      lab.textContent = 'View';
      ring.appendChild(lab);
      DOC.body.appendChild(dot);
      DOC.body.appendChild(ring);
    }

    function onMove(e) {
      mx = e.clientX; my = e.clientY;
      if (!visible) {
        visible = true;
        dot.classList.remove('sir-hidden');
        ring.classList.remove('sir-hidden');
      }
      // dot tracks tightly
      dot.style.transform = 'translate3d(' + mx + 'px,' + my + 'px,0) translate(-50%,-50%)';
      if (!started) { rx = mx; ry = my; started = true; }
    }

    function onOver(e) {
      var t = e.target;
      if (!t || t.nodeType !== 1) return;
      if (t.closest && t.closest(VIEW_SEL)) {
        ring.classList.add('sir-view');
        ring.classList.remove('sir-grow');
      } else if (t.closest && t.closest(GROW_SEL)) {
        ring.classList.add('sir-grow');
        ring.classList.remove('sir-view');
      } else {
        ring.classList.remove('sir-grow');
        ring.classList.remove('sir-view');
      }
    }

    function onLeaveWin() {
      visible = false;
      if (dot) dot.classList.add('sir-hidden');
      if (ring) ring.classList.add('sir-hidden');
    }

    function onEnterWin() {
      // re-show on next move
    }

    function loop() {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      ring.style.transform = 'translate3d(' +
        rx.toFixed(2) + 'px,' + ry.toFixed(2) + 'px,0) translate(-50%,-50%)';
      raf = win.requestAnimationFrame(loop);
    }

    function start() {
      if (raf) return;
      raf = win.requestAnimationFrame(loop);
    }
    function stop() {
      if (raf) { win.cancelAnimationFrame(raf); raf = 0; }
    }

    function onVisibility() {
      if (DOC.hidden) stop();
      else start();
    }

    function init() {
      if (!finePointer) return;      // touch / coarse → do nothing
      enabled = true;
      build();
      ROOT.classList.add('sir-cursor-on');

      win.addEventListener('mousemove', onMove, { passive: true });
      DOC.addEventListener('mouseover', onOver, { passive: true });
      DOC.addEventListener('mouseleave', onLeaveWin);
      DOC.addEventListener('mouseenter', onEnterWin);
      win.addEventListener('blur', onLeaveWin);
      DOC.addEventListener('visibilitychange', onVisibility);

      start();
    }

    return { init: init, isEnabled: function () { return enabled; } };
  })();

  /* ======================================================================
     (3) AMBIENT SOUND  — WebAudio ocean/wave bed, lazy-created on click
     ====================================================================== */
  var Sound = (function () {
    var btn = null;
    var ctx = null;
    var noiseSrc = null;
    var lowpass = null;
    var master = null;
    var lfoOsc = null;
    var lfoGain = null;
    var playing = false;
    var built = false;
    var STORE_KEY = 'sir_sound';

    function readPref() {
      try { return win.localStorage.getItem(STORE_KEY) === 'on'; }
      catch (e) { return false; }
    }
    function writePref(on) {
      try { win.localStorage.setItem(STORE_KEY, on ? 'on' : 'off'); }
      catch (e) {}
    }

    function makeNoiseBuffer(audioCtx) {
      // ~4s of brownian (brown) noise, looped.
      var len = Math.floor(audioCtx.sampleRate * 4);
      var buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
      var data = buf.getChannelData(0);
      var last = 0;
      for (var i = 0; i < len; i++) {
        var white = Math.random() * 2 - 1;
        // brownian integration
        last = (last + 0.02 * white) / 1.02;
        data[i] = last * 3.2;      // boost — brown noise is quiet
        if (data[i] > 1) data[i] = 1;
        if (data[i] < -1) data[i] = -1;
      }
      return buf;
    }

    function buildGraph() {
      if (built) return true;
      var AC = win.AudioContext || win.webkitAudioContext;
      if (!AC) return false;      // no WebAudio → graceful (button just no-ops audio)
      try {
        ctx = new AC();

        master = ctx.createGain();
        master.gain.value = 0.0;           // fade in later
        master.connect(ctx.destination);

        lowpass = ctx.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.value = 420;
        lowpass.Q.value = 0.7;
        lowpass.connect(master);

        noiseSrc = ctx.createBufferSource();
        noiseSrc.buffer = makeNoiseBuffer(ctx);
        noiseSrc.loop = true;
        noiseSrc.connect(lowpass);

        // Slow LFO modulating the lowpass cutoff → gentle wave swell.
        lfoOsc = ctx.createOscillator();
        lfoOsc.type = 'sine';
        lfoOsc.frequency.value = 0.08;     // ~one swell every 12.5s
        lfoGain = ctx.createGain();
        lfoGain.gain.value = 240;          // +/- Hz on cutoff
        lfoOsc.connect(lfoGain);
        lfoGain.connect(lowpass.frequency);

        noiseSrc.start(0);
        lfoOsc.start(0);
        built = true;
        return true;
      } catch (e) {
        built = false;
        return false;
      }
    }

    function fadeMaster(target, seconds) {
      if (!ctx || !master) return;
      var now = ctx.currentTime;
      try {
        master.gain.cancelScheduledValues(now);
        master.gain.setValueAtTime(master.gain.value, now);
        master.gain.linearRampToValueAtTime(target, now + seconds);
      } catch (e) {
        master.gain.value = target;
      }
    }

    function play() {
      if (!built && !buildGraph()) { reflect(false); return; }
      if (ctx && ctx.state === 'suspended') {
        try { ctx.resume(); } catch (e) {}
      }
      playing = true;
      fadeMaster(0.06, 1.4);
      reflect(true);
      writePref(true);
    }

    function pause() {
      playing = false;
      fadeMaster(0.0, 0.6);
      // Suspend shortly after the fade to save CPU.
      win.setTimeout(function () {
        if (!playing && ctx && ctx.state === 'running') {
          try { ctx.suspend(); } catch (e) {}
        }
      }, 700);
      reflect(false);
      writePref(false);
    }

    function toggle() {
      if (playing) pause(); else play();
    }

    function reflect(on) {
      if (!btn) return;
      btn.classList.toggle('sir-on', !!on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    }

    function onVisibility() {
      // Pause audio processing when tab hidden; resume if it was playing.
      if (!ctx) return;
      if (DOC.hidden) {
        if (ctx.state === 'running') { try { ctx.suspend(); } catch (e) {} }
      } else if (playing) {
        if (ctx.state === 'suspended') { try { ctx.resume(); } catch (e) {} }
      }
    }

    function build() {
      btn = make('button');
      btn.id = 'sir-sound';
      btn.type = 'button';
      btn.setAttribute('aria-label', 'Ambient sound');
      btn.setAttribute('aria-pressed', 'false');
      btn.title = 'Ambient sound';
      var eq = make('span', 'eq');
      eq.innerHTML = '<b></b><b></b><b></b>';
      btn.appendChild(eq);
      DOC.body.appendChild(btn);

      btn.addEventListener('click', function () {
        // AudioContext must be created inside a user gesture.
        toggle();
      });

      DOC.addEventListener('visibilitychange', onVisibility);

      // If the user previously enabled sound, show the intent but DO NOT
      // autoplay (autoplay policy). We wait for the first gesture anywhere;
      // the very first click on the button will start it. To honor the
      // stored preference without violating autoplay, arm a one-time
      // gesture listener that starts playback only if pref === 'on'.
      if (readPref()) {
        var armed = function () {
          win.removeEventListener('pointerdown', armed, true);
          win.removeEventListener('keydown', armed, true);
          if (readPref() && !playing) {
            // start softly; still a real user gesture
            play();
          }
        };
        win.addEventListener('pointerdown', armed, true);
        win.addEventListener('keydown', armed, true);
      }
    }

    function init() { build(); }

    return {
      init: init,
      play: function () { play(); },
      pause: function () { pause(); },
      toggle: function () { toggle(); },
      isPlaying: function () { return playing; }
    };
  })();

  /* ======================================================================
     BOOT
     ====================================================================== */
  // Loader must run NOW (synchronously) so first paint is covered.
  injectStyle();
  Loader.init();

  // Cursor + Sound need <body>; wire on DOM ready.
  onReady(function () {
    injectStyle();          // idempotent — ensures style exists
    // Custom cursor disabled — native cursor is less distracting.
    // try { Cursor.init(); } catch (e) {}
    try { Sound.init(); } catch (e) {}
  });

  /* ----------------------------------------------------------------------
     Public API — exactly one global identifier.
     ---------------------------------------------------------------------- */
  win.SolsticeAtmosUI = {
    version: '1.0.0',
    liftLoader: function () { try { Loader.lift(); } catch (e) {} },
    sound: {
      play: function () { Sound.play(); },
      pause: function () { Sound.pause(); },
      toggle: function () { Sound.toggle(); },
      isPlaying: function () { return Sound.isPlaying(); }
    },
    cursorEnabled: function () { return Cursor.isEnabled(); },
    reducedMotion: reduceMotion
  };
})();