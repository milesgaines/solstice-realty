/* =============================================================================
   Solstice International Realty — Atmosphere (atmosphere.js)
   Full-page ambient WEB3 aurora background. Pure raw WebGL (no three.js).
   A fixed canvas behind translucent glass sections renders a slowly drifting
   fbm mesh-gradient — deep forest, warm gold, muted teal, faint rose over a
   near-black ink base, with a subtle iridescent sheen and edge vignette.

   Exposes exactly ONE global: window.SolsticeAtmosphere = { init, destroy }.
   Entire file wrapped in an IIFE to avoid the global-collision rule.
   ========================================================================== */
(function () {
  'use strict';

  /* ---------------------------------------------------------------------------
     Module-local state (never leaks to global scope thanks to the IIFE)
     ------------------------------------------------------------------------ */
  var canvas = null;        // the fixed aurora <canvas>
  var gl = null;            // WebGL rendering context
  var program = null;       // compiled shader program
  var buffer = null;        // fullscreen triangle vertex buffer
  var rafId = 0;            // requestAnimationFrame handle
  var running = false;      // init guard / lifecycle flag
  var startTime = 0;        // performance.now() at start
  var pausedElapsed = 0;    // frozen time value while paused (for static frame)
  var styleEl = null;       // injected <style> element
  var grainEl = null;       // injected film-grain overlay div
  var usingFallback = false;// true when WebGL is unavailable

  // Uniform locations
  var uTime = null, uRes = null;

  // Reduced-motion / visibility flags
  var reduceMotion = false;
  var mql = null;           // matchMedia handle

  var DPR_CAP = 1.5;        // per project spec: cap DPR at 1.5 for fullscreen

  /* ---------------------------------------------------------------------------
     Shaders
     ------------------------------------------------------------------------ */
  var VERT_SRC = [
    'attribute vec2 aPos;',
    'void main(){',
    '  gl_Position = vec4(aPos, 0.0, 1.0);',
    '}'
  ].join('\n');

  // Fragment shader: layered fbm noise mapped to the brand palette.
  // Kept dark & low-contrast — color pools read like northern lights through
  // smoked glass. Slow evolution, iridescent sheen at color boundaries,
  // radial edge darkening, and a very subtle in-shader film grain.
  // Fragment highp is optional in WebGL1; fall back to mediump on GPUs that
  // lack GL_FRAGMENT_PRECISION_HIGH so the shader still compiles everywhere.
  var FRAG_SRC = [
    '#ifdef GL_FRAGMENT_PRECISION_HIGH',
    'precision highp float;',
    '#else',
    'precision mediump float;',
    '#endif',
    '',
    'uniform float uTime;',
    'uniform vec2  uRes;',
    '',
    '// Brand palette',
    'const vec3 INK    = vec3(0.027, 0.035, 0.039); // #07090a',
    'const vec3 FOREST = vec3(0.184, 0.231, 0.200); // #2f3b33',
    'const vec3 GOLD   = vec3(0.788, 0.663, 0.431); // #c9a96e',
    'const vec3 TEAL   = vec3(0.498, 0.851, 0.831); // #7fd9d4',
    'const vec3 ROSE   = vec3(0.910, 0.706, 0.784); // #e8b4c8',
    'const vec3 SAGE   = vec3(0.478, 0.624, 0.306); // #7a9f4e',
    '',
    '// Hash / value noise ----------------------------------------------------',
    'float hash(vec2 p){',
    '  p = fract(p * vec2(123.34, 456.21));',
    '  p += dot(p, p + 45.32);',
    '  return fract(p.x * p.y);',
    '}',
    '',
    'float noise(vec2 p){',
    '  vec2 i = floor(p);',
    '  vec2 f = fract(p);',
    '  vec2 u = f * f * (3.0 - 2.0 * f);',
    '  float a = hash(i + vec2(0.0, 0.0));',
    '  float b = hash(i + vec2(1.0, 0.0));',
    '  float c = hash(i + vec2(0.0, 1.0));',
    '  float d = hash(i + vec2(1.0, 1.0));',
    '  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);',
    '}',
    '',
    '// Fractional Brownian motion — 4 octaves ------------------------------',
    'float fbm(vec2 p){',
    '  float v = 0.0;',
    '  float amp = 0.5;',
    '  mat2 rot = mat2(0.80, 0.60, -0.60, 0.80);',
    '  for(int i = 0; i < 4; i++){',
    '    v += amp * noise(p);',
    '    p = rot * p * 2.0;',
    '    amp *= 0.5;',
    '  }',
    '  return v;',
    '}',
    '',
    'void main(){',
    '  // Aspect-correct, centered coordinates',
    '  vec2 uv = gl_FragCoord.xy / uRes.xy;',
    '  vec2 p  = (gl_FragCoord.xy - 0.5 * uRes.xy) / uRes.y;',
    '',
    '  float t = uTime * 0.035;',
    '',
    '  // Domain-warp the field so blobs drift and fold slowly',
    '  vec2 q = vec2(fbm(p * 1.4 + vec2(0.0, t)),',
    '               fbm(p * 1.4 + vec2(5.2, -t * 0.8)));',
    '  vec2 r = vec2(fbm(p * 1.4 + 3.5 * q + vec2(1.7, 9.2) + t * 0.5),',
    '               fbm(p * 1.4 + 3.5 * q + vec2(8.3, 2.8) - t * 0.4));',
    '  float f = fbm(p * 1.6 + 3.0 * r + t * 0.25);',
    '',
    '  // Secondary large-scale field for palette pooling',
    '  float g = fbm(p * 0.9 - r * 1.5 + vec2(t * 0.3, -t * 0.2));',
    '',
    '  // Build color from ink base, pooling brand hues by noise thresholds.',
    '  vec3 col = INK;',
    '',
    '  // Deep forest wash (broad, low)',
    '  col = mix(col, FOREST, smoothstep(0.30, 0.85, f) * 0.55);',
    '',
    '  // Warm gold pools (the primary accent) — where two fields agree',
    '  float goldMask = smoothstep(0.45, 0.95, f * 0.6 + g * 0.6);',
    '  col = mix(col, GOLD, goldMask * 0.30);',
    '',
    '  // Muted teal/cyan pools in the low-mid of the secondary field',
    '  float tealMask = smoothstep(0.55, 0.95, g) * (1.0 - goldMask);',
    '  col = mix(col, TEAL, tealMask * 0.22);',
    '',
    '  // Faint rose kisses at the crest of the warped field',
    '  float roseMask = smoothstep(0.72, 1.0, f) * smoothstep(0.5, 0.9, r.x);',
    '  col = mix(col, ROSE, roseMask * 0.16);',
    '',
    '  // Sage glints threaded through the forest',
    '  float sageMask = smoothstep(0.60, 0.9, q.y) * smoothstep(0.3, 0.7, f);',
    '  col = mix(col, SAGE, sageMask * 0.12);',
    '',
    '  // Iridescent sheen where color fields meet — a thin oil-slick band',
    '  float edge = abs(fract(f * 3.0 + g * 2.0 + t) - 0.5);',
    '  float sheen = smoothstep(0.06, 0.0, edge) * smoothstep(0.35, 0.75, f);',
    '  vec3 irid = mix(TEAL, ROSE, 0.5 + 0.5 * sin(f * 6.2831 + t * 2.0));',
    '  irid = mix(irid, GOLD, 0.5 + 0.5 * sin(g * 6.2831 - t));',
    '  col += irid * sheen * 0.10;',
    '',
    '  // Keep it dark: gently compress toward ink in the lows',
    '  col = mix(INK, col, smoothstep(0.05, 0.65, f * 0.7 + g * 0.5) * 0.5 + 0.05);',
    '',
    '  // Radial edge vignette (subtle darkening toward corners)',
    '  float d = distance(uv, vec2(0.5));',
    '  float vig = smoothstep(0.95, 0.35, d);',
    '  col *= mix(0.55, 1.0, vig);',
    '',
    '  // Very subtle film grain (hash noise modulated by time)',
    '  float grain = hash(gl_FragCoord.xy + fract(uTime) * 133.7) - 0.5;',
    '  col += grain * 0.020;',
    '',
    '  // Final tasteful lift so it is never pure black',
    '  col = max(col, INK * 0.9);',
    '',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');

  /* ---------------------------------------------------------------------------
     WebGL helpers
     ------------------------------------------------------------------------ */
  function compileShader(type, src) {
    var sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      gl.deleteShader(sh);
      return null;
    }
    return sh;
  }

  function buildProgram() {
    var vs = compileShader(gl.VERTEX_SHADER, VERT_SRC);
    var fs = compileShader(gl.FRAGMENT_SHADER, FRAG_SRC);
    if (!vs || !fs) return null;
    var prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.bindAttribLocation(prog, 0, 'aPos');
    gl.linkProgram(prog);
    // Shaders can be flagged for deletion once linked
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      gl.deleteProgram(prog);
      return null;
    }
    return prog;
  }

  function getContext(cv) {
    var opts = { alpha: false, antialias: false, depth: false, stencil: false,
                 premultipliedAlpha: false, preserveDrawingBuffer: false,
                 powerPreference: 'low-power', failIfMajorPerformanceCaveat: false };
    var ctx = null;
    try { ctx = cv.getContext('webgl', opts) || cv.getContext('experimental-webgl', opts); }
    catch (e) { ctx = null; }
    return ctx;
  }

  /* ---------------------------------------------------------------------------
     Sizing
     ------------------------------------------------------------------------ */
  function currentDPR() {
    var dpr = window.devicePixelRatio || 1;
    return Math.min(dpr, DPR_CAP);
  }

  function resize() {
    if (!canvas) return;
    var dpr = currentDPR();
    var w = Math.max(1, Math.round(window.innerWidth * dpr));
    var h = Math.max(1, Math.round(window.innerHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    if (gl) {
      gl.viewport(0, 0, canvas.width, canvas.height);
      // If paused/static, re-render one frame at the new size.
      if (!isAnimating()) renderStatic();
    }
  }

  /* ---------------------------------------------------------------------------
     Render loop
     ------------------------------------------------------------------------ */
  function isAnimating() {
    return running && !reduceMotion && !document.hidden;
  }

  function drawFrame(elapsedSeconds) {
    if (!gl || !program) return;
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    if (uTime) gl.uniform1f(uTime, elapsedSeconds);
    if (uRes) gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function renderStatic() {
    // A single frozen frame (reduced motion or hidden tab).
    drawFrame(pausedElapsed || 8.0);
  }

  function loop(now) {
    if (!running) return;
    if (!isAnimating()) {
      // Paused: don't schedule further frames; the last static frame stays.
      rafId = 0;
      pausedElapsed = (now - startTime) / 1000;
      renderStatic();
      return;
    }
    var elapsed = (now - startTime) / 1000;
    pausedElapsed = elapsed;
    drawFrame(elapsed);
    rafId = window.requestAnimationFrame(loop);
  }

  function startLoop() {
    if (rafId) return;
    if (isAnimating()) {
      rafId = window.requestAnimationFrame(loop);
    } else {
      renderStatic();
    }
  }

  function stopLoop() {
    if (rafId) {
      window.cancelAnimationFrame(rafId);
      rafId = 0;
    }
  }

  /* ---------------------------------------------------------------------------
     Event handlers
     ------------------------------------------------------------------------ */
  function onResize() { resize(); }

  function onVisibility() {
    if (document.hidden) {
      stopLoop();
    } else if (running) {
      // Rebase the clock so we resume smoothly rather than jumping.
      startTime = (window.performance && performance.now ? performance.now() : Date.now())
                  - pausedElapsed * 1000;
      startLoop();
    }
  }

  function onMotionChange(e) {
    reduceMotion = e.matches;
    if (reduceMotion) {
      stopLoop();
      if (gl) renderStatic();
    } else if (running) {
      startTime = (window.performance && performance.now ? performance.now() : Date.now())
                  - pausedElapsed * 1000;
      startLoop();
    }
  }

  function onContextLost(e) {
    e.preventDefault();
    stopLoop();
  }

  function onContextRestored() {
    // Rebuild GL objects on the same canvas.
    setupGL();
    resize();
    if (running) startLoop();
  }

  /* ---------------------------------------------------------------------------
     CSS injection (background wiring + optional film grain overlay)
     ------------------------------------------------------------------------ */
  function injectCSS() {
    if (styleEl) return;
    styleEl = document.createElement('style');
    styleEl.id = 'solstice-atmosphere-style';
    // html bg = ink so the fixed aurora shows behind transparent body/glass.
    styleEl.textContent = [
      'html{background:var(--ink,#07090a);}',
      'body{background:transparent;}',
      '#solstice-aurora{position:fixed;inset:0;width:100vw;height:100vh;',
      '  z-index:-1;pointer-events:none;display:block;}',
      // Fallback animated multi-radial gradient (only shown if WebGL absent).
      '#solstice-aurora.sa-fallback{',
      '  background:',
      '    radial-gradient(60% 55% at 22% 28%, rgba(201,169,110,0.14), transparent 60%),',
      '    radial-gradient(55% 50% at 78% 30%, rgba(127,217,212,0.10), transparent 62%),',
      '    radial-gradient(65% 60% at 60% 78%, rgba(47,59,51,0.55), transparent 65%),',
      '    radial-gradient(50% 48% at 30% 80%, rgba(232,180,200,0.07), transparent 60%),',
      '    var(--ink,#07090a);',
      '  background-size:180% 180%,180% 180%,200% 200%,180% 180%,100% 100%;',
      '  background-position:0% 0%,100% 0%,50% 100%,0% 100%,0 0;',
      '  animation:sa-drift 46s ease-in-out infinite alternate;}',
      '@keyframes sa-drift{',
      '  0%{background-position:0% 0%,100% 0%,50% 100%,0% 100%,0 0;}',
      '  50%{background-position:20% 30%,70% 20%,40% 70%,30% 60%,0 0;}',
      '  100%{background-position:10% 60%,80% 50%,60% 40%,10% 80%,0 0;}}',
      // Film grain overlay
      '#solstice-grain{position:fixed;inset:0;z-index:9000;pointer-events:none;',
      '  opacity:0.05;mix-blend-mode:overlay;',
      "  background-image:url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\");",
      '  background-size:140px 140px;}',
      '@media (prefers-reduced-motion: reduce){',
      '  #solstice-aurora.sa-fallback{animation:none;}}'
    ].join('\n');
    (document.head || document.documentElement).appendChild(styleEl);
  }

  function injectGrain() {
    if (grainEl) return;
    grainEl = document.createElement('div');
    grainEl.id = 'solstice-grain';
    grainEl.setAttribute('aria-hidden', 'true');
    document.body.appendChild(grainEl);
  }

  /* ---------------------------------------------------------------------------
     Fallback (no WebGL): animated CSS gradient on the canvas element
     ------------------------------------------------------------------------ */
  function enableFallback() {
    usingFallback = true;
    if (canvas) canvas.classList.add('sa-fallback');
  }

  /* ---------------------------------------------------------------------------
     GL setup (also used on context restore)
     ------------------------------------------------------------------------ */
  function setupGL() {
    gl = getContext(canvas);
    if (!gl) return false;

    program = buildProgram();
    if (!program) {
      gl = null;
      return false;
    }

    // Fullscreen triangle (covers the viewport, cheaper than a quad).
    buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

    uTime = gl.getUniformLocation(program, 'uTime');
    uRes = gl.getUniformLocation(program, 'uRes');

    gl.clearColor(0.027, 0.035, 0.039, 1.0);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    return true;
  }

  /* ---------------------------------------------------------------------------
     Public: init
     ------------------------------------------------------------------------ */
  function init() {
    if (running) return;           // double-init guard
    if (!document.body) return;    // called too early — init() re-invoked on DOM ready

    injectCSS();

    // Create the fixed aurora canvas.
    canvas = document.getElementById('solstice-aurora');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'solstice-aurora';
      canvas.setAttribute('aria-hidden', 'true');
      document.body.appendChild(canvas);
    }

    // Determine reduced-motion preference.
    try {
      mql = window.matchMedia('(prefers-reduced-motion: reduce)');
      reduceMotion = mql.matches;
      if (mql.addEventListener) mql.addEventListener('change', onMotionChange);
      else if (mql.addListener) mql.addListener(onMotionChange);
    } catch (e) { reduceMotion = false; }

    // Attempt WebGL; gracefully degrade to CSS gradient otherwise.
    var ok = false;
    try { ok = setupGL(); } catch (e) { ok = false; }

    running = true;

    if (!ok) {
      enableFallback();
      // Wire resize only for cosmetic correctness; no rAF needed for fallback.
      window.addEventListener('resize', onResize, { passive: true });
      injectGrain();
      return;
    }

    // Context-loss resilience.
    canvas.addEventListener('webglcontextlost', onContextLost, false);
    canvas.addEventListener('webglcontextrestored', onContextRestored, false);

    // Sizing + lifecycle listeners.
    window.addEventListener('resize', onResize, { passive: true });
    document.addEventListener('visibilitychange', onVisibility, false);

    startTime = (window.performance && performance.now ? performance.now() : Date.now());
    pausedElapsed = 0;

    resize();
    injectGrain();
    startLoop();
  }

  /* ---------------------------------------------------------------------------
     Public: destroy — full teardown, safe to call repeatedly
     ------------------------------------------------------------------------ */
  function destroy() {
    running = false;
    stopLoop();

    window.removeEventListener('resize', onResize);
    document.removeEventListener('visibilitychange', onVisibility);

    if (mql) {
      if (mql.removeEventListener) mql.removeEventListener('change', onMotionChange);
      else if (mql.removeListener) mql.removeListener(onMotionChange);
      mql = null;
    }

    if (canvas) {
      canvas.removeEventListener('webglcontextlost', onContextLost);
      canvas.removeEventListener('webglcontextrestored', onContextRestored);
    }

    // Release GL objects.
    if (gl) {
      try {
        if (buffer) gl.deleteBuffer(buffer);
        if (program) gl.deleteProgram(program);
        var lose = gl.getExtension('WEBGL_lose_context');
        if (lose) lose.loseContext();
      } catch (e) { /* ignore */ }
    }
    buffer = null;
    program = null;
    uTime = null;
    uRes = null;
    gl = null;

    if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
    canvas = null;

    if (grainEl && grainEl.parentNode) grainEl.parentNode.removeChild(grainEl);
    grainEl = null;

    if (styleEl && styleEl.parentNode) styleEl.parentNode.removeChild(styleEl);
    styleEl = null;

    usingFallback = false;
    pausedElapsed = 0;
  }

  /* ---------------------------------------------------------------------------
     Expose exactly ONE global, then auto-initialize.
     ------------------------------------------------------------------------ */
  window.SolsticeAtmosphere = { init: init, destroy: destroy };

  if (document.readyState !== 'loading') {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }
})();
