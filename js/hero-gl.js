/* =============================================================================
   Solstice International Realty — HERO WebGL centerpiece (pure raw WebGL)
   -----------------------------------------------------------------------------
   Cinematic liquid cross-fade slideshow mounted inside .hero-bg, behind the
   hero text. Cover-fit, fbm/simplex-displaced transitions, breathing ripple,
   mouse-reactive parallax + chromatic aberration, cinematic grade.

   Collision-safe: entire file wrapped in an IIFE; exposes exactly ONE global:
   window.SolsticeHero = { init, destroy }.
============================================================================= */
(function () {
  'use strict';

  var GLOBAL_KEY = 'SolsticeHero';

  // ---------------------------------------------------------------------------
  // Configuration
  // ---------------------------------------------------------------------------
  var IMAGE_URLS = [
    'assets/img/hero.jpg',
    'assets/img/malibu.jpg',
    'assets/img/palisades.jpg',
    'assets/img/manhattan.jpg',
    'assets/img/newport.jpg'
  ];

  var HOLD_SECONDS = 7.5;      // time each image is held before transitioning
  var FADE_SECONDS = 2.8;      // duration of the liquid cross-fade
  var MAX_DPR = 2.0;           // cap device pixel ratio

  // ---------------------------------------------------------------------------
  // Module state (single instance; guarded against double-init)
  // ---------------------------------------------------------------------------
  var initialized = false;
  var destroyed = false;

  var canvas = null;
  var gl = null;
  var program = null;
  var quadBuffer = null;
  var rafId = 0;
  var startTime = 0;
  var lastFrameTime = 0;

  var textures = [];          // WebGLTexture[]
  var imageAspects = [];      // number[] (width/height per image)
  var heroImgEl = null;       // fallback <img>
  var heroBgEl = null;        // .hero-bg mount

  var styleEl = null;
  var usingFallback = false;

  // uniform locations
  var u = {};

  // animation / transition bookkeeping
  var current = 0;            // index of "from" texture
  var next = 1;               // index of "to" texture
  var transitioning = false;
  var transitionStart = 0;    // seconds
  var nextTransitionAt = 0;   // seconds

  // mouse (target + lerped)
  var mouseTargetX = 0.5, mouseTargetY = 0.5;
  var mouseX = 0.5, mouseY = 0.5;
  var mouseActiveTarget = 0.0;   // 0..1 how "hovering" we are
  var mouseActive = 0.0;

  var reducedMotion = false;
  var reducedMotionMQ = null;

  // bound handlers (kept for clean removal)
  var onResizeBound = null;
  var onVisibilityBound = null;
  var onPointerMoveBound = null;
  var onPointerLeaveBound = null;
  var onReducedMotionBound = null;
  var onContextLostBound = null;

  var contextLost = false;    // GPU context was lost; content restored to <img>

  // ---------------------------------------------------------------------------
  // Shaders
  // ---------------------------------------------------------------------------
  var VERT_SRC = [
    'attribute vec2 aPos;',
    'varying vec2 vUv;',
    'void main(){',
    '  vUv = aPos * 0.5 + 0.5;',
    '  gl_Position = vec4(aPos, 0.0, 1.0);',
    '}'
  ].join('\n');

  var FRAG_SRC = [
    'precision highp float;',
    '',
    'varying vec2 vUv;',
    '',
    'uniform sampler2D uFrom;',
    'uniform sampler2D uTo;',
    'uniform float uFromAspect;',   // image width/height
    'uniform float uToAspect;',
    'uniform float uCanvasAspect;', // canvas width/height
    'uniform float uProgress;',     // 0..1 cross-fade
    'uniform float uTime;',         // seconds
    'uniform vec2  uMouse;',        // normalized 0..1, y up
    'uniform float uMouseActive;',  // 0..1
    'uniform float uMotion;',       // 1 normal, 0 reduced-motion',
    '',
    // ---- simplex noise (Ashima / McEwan, 2D) --------------------------------
    'vec3 mod289(vec3 x){ return x - floor(x * (1.0/289.0)) * 289.0; }',
    'vec2 mod289(vec2 x){ return x - floor(x * (1.0/289.0)) * 289.0; }',
    'vec3 permute(vec3 x){ return mod289(((x*34.0)+1.0)*x); }',
    'float snoise(vec2 v){',
    '  const vec4 C = vec4(0.211324865405187, 0.366025403784439,',
    '                     -0.577350269189626, 0.024390243902439);',
    '  vec2 i  = floor(v + dot(v, C.yy));',
    '  vec2 x0 = v -   i + dot(i, C.xx);',
    '  vec2 i1 = (x0.x > x0.y) ? vec2(1.0,0.0) : vec2(0.0,1.0);',
    '  vec4 x12 = x0.xyxy + C.xxzz;',
    '  x12.xy -= i1;',
    '  i = mod289(i);',
    '  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0))',
    '        + i.x + vec3(0.0, i1.x, 1.0));',
    '  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),',
    '                          dot(x12.zw,x12.zw)), 0.0);',
    '  m = m*m; m = m*m;',
    '  vec3 x = 2.0 * fract(p * C.www) - 1.0;',
    '  vec3 h = abs(x) - 0.5;',
    '  vec3 ox = floor(x + 0.5);',
    '  vec3 a0 = x - ox;',
    '  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);',
    '  vec3 g;',
    '  g.x  = a0.x  * x0.x  + h.x  * x0.y;',
    '  g.yz = a0.yz * x12.xz + h.yz * x12.yw;',
    '  return 130.0 * dot(m, g);',
    '}',
    '',
    // ---- fractal brownian motion --------------------------------------------
    'float fbm(vec2 p){',
    '  float v = 0.0;',
    '  float a = 0.5;',
    '  mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);',
    '  for(int i=0;i<5;i++){',
    '    v += a * snoise(p);',
    '    p = rot * p * 2.02;',
    '    a *= 0.5;',
    '  }',
    '  return v;',
    '}',
    '',
    // ---- cover-fit UV (background-size:cover) --------------------------------
    'vec2 coverUv(vec2 uv, float imgAspect, float canvasAspect){',
    '  vec2 scale = vec2(1.0);',
    '  if(canvasAspect > imgAspect){',
    '    scale = vec2(1.0, imgAspect / canvasAspect);',
    '  } else {',
    '    scale = vec2(canvasAspect / imgAspect, 1.0);',
    '  }',
    '  return (uv - 0.5) * scale + 0.5;',
    '}',
    '',
    // ---- sample with chromatic aberration -----------------------------------
    'vec3 sampleCA(sampler2D tex, vec2 uv, vec2 dir, float amount){',
    '  float r = texture2D(tex, uv + dir * amount).r;',
    '  float g = texture2D(tex, uv).g;',
    '  float b = texture2D(tex, uv - dir * amount).b;',
    '  return vec3(r, g, b);',
    '}',
    '',
    'void main(){',
    '  vec2 uv = vUv;',
    '',
    // --- mouse vector from cursor, proximity falloff -----------------------
    '  vec2 m = uMouse;',
    '  vec2 toMouse = uv - m;',
    '  float dMouse = length(toMouse);',
    '  float prox = smoothstep(0.55, 0.0, dMouse) * uMouseActive * uMotion;',
    '',
    // --- gentle parallax toward cursor -------------------------------------
    '  vec2 parallax = toMouse * prox * 0.035;',
    '',
    // --- breathing ripple + slow drift (alive between transitions) ---------
    '  float t = uTime * uMotion;',
    '  vec2 driftFrom = vec2(sin(t*0.05)*0.006, cos(t*0.043)*0.006);',
    '  vec2 driftTo   = vec2(cos(t*0.047)*0.006, sin(t*0.052)*0.006);',
    '  float ripple = fbm(uv*3.0 + t*0.06);',
    '  vec2 breathe = vec2(ripple) * 0.0035 * uMotion;',
    '',
    // --- transition displacement (liquid melt) -----------------------------
    '  float p = uProgress;',
    '  float easedP = p*p*(3.0 - 2.0*p);', // smoothstep ease
    '  float turb = fbm(uv*4.0 + vec2(t*0.08, -t*0.05));',
    '  float turb2 = fbm(uv*7.0 - vec2(t*0.04, t*0.09) + turb);',
    '  vec2 dir = normalize(vec2(0.65, 0.35) + vec2(turb, turb2)*0.5);',
    // displacement peaks mid-transition, zero at both ends
    '  float disK = sin(easedP * 3.14159265) ;',
    '  float dispMag = disK * (0.045 + 0.025*turb2) * uMotion;',
    '  vec2 fromDisp = dir * dispMag * (1.0 - easedP) + breathe + driftFrom + parallax;',
    '  vec2 toDisp   = -dir * dispMag * easedP + breathe + driftTo + parallax;',
    '',
    '  vec2 uvFrom = coverUv(uv + fromDisp, uFromAspect, uCanvasAspect);',
    '  vec2 uvTo   = coverUv(uv + toDisp,   uToAspect,   uCanvasAspect);',
    '',
    // --- chromatic aberration amount grows near cursor & in transition -----
    '  vec2 caDir = (dMouse > 0.0001) ? (toMouse / dMouse) : vec2(0.0);',
    '  float caAmt = (prox * 0.0022) + disK * 0.0014 * uMotion;',
    '',
    '  vec3 colFrom = sampleCA(uFrom, uvFrom, caDir, caAmt);',
    '  vec3 colTo   = sampleCA(uTo,   uvTo,   caDir, caAmt);',
    '',
    // --- luminance-based dissolve blended with linear progress -------------
    '  float lumFrom = dot(colFrom, vec3(0.299, 0.587, 0.114));',
    '  float noiseMask = fbm(uv*5.0 + turb*1.5) * 0.5 + 0.5;',
    '  float threshold = mix(-0.15, 1.15, easedP);',
    '  float dissolve = smoothstep(threshold - 0.35, threshold + 0.35, noiseMask + lumFrom*0.35);',
    '  float mixAmt = mix(easedP, dissolve, 0.55);',
    '  mixAmt = clamp(mixAmt, 0.0, 1.0);',
    '',
    '  vec3 col = mix(colFrom, colTo, mixAmt);',
    '',
    // --- faint gold iridescent sheen (subtle) ------------------------------
    '  float sheen = fbm(uv*2.2 + t*0.03);',
    '  vec3 gold = vec3(0.788, 0.663, 0.431);',   // #c9a96e
    '  col += gold * sheen * 0.014 * uMotion;',
    '',
    // --- cinematic grade: gentle contrast ----------------------------------
    '  col = (col - 0.5) * 1.03 + 0.5;',
    '',
    // --- vignette ----------------------------------------------------------
    '  vec2 vc = uv - 0.5;',
    '  float vig = smoothstep(0.95, 0.35, length(vc*vec2(1.05,1.0)));',
    '  col *= mix(0.74, 1.0, vig);',
    '',
    // --- darken toward bottom so overlaid white text stays readable --------
    '  float bottomShade = smoothstep(0.0, 0.6, uv.y);', // uv.y up: 0 bottom
    '  col *= mix(0.42, 1.0, bottomShade);',
    // --- darken the LEFT (headline column) for legibility ------------------
    '  float leftShade = smoothstep(0.0, 0.66, uv.x);', // uv.x: 0 left
    '  col *= mix(0.5, 1.0, leftShade);',
    '',
    '  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);',
    '}'
  ].join('\n');

  // ---------------------------------------------------------------------------
  // Utilities
  // ---------------------------------------------------------------------------
  function nowSec() {
    return (typeof performance !== 'undefined' && performance.now)
      ? performance.now() / 1000
      : Date.now() / 1000;
  }

  function compileShader(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      // Swallow gracefully — caller treats null as failure and uses fallback.
      gl.deleteShader(s);
      return null;
    }
    return s;
  }

  function createProgram() {
    var vs = compileShader(gl.VERTEX_SHADER, VERT_SRC);
    var fs = compileShader(gl.FRAGMENT_SHADER, FRAG_SRC);
    if (!vs || !fs) return null;
    var p = gl.createProgram();
    gl.attachShader(p, vs);
    gl.attachShader(p, fs);
    gl.linkProgram(p);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      gl.deleteProgram(p);
      return null;
    }
    return p;
  }

  function makeTexture(img) {
    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.bindTexture(gl.TEXTURE_2D, null);
    return tex;
  }

  function loadImages(urls) {
    return Promise.all(urls.map(function (url) {
      return new Promise(function (resolve, reject) {
        var img = new Image();
        img.crossOrigin = 'anonymous'; // set BEFORE src
        img.onload = function () { resolve(img); };
        img.onerror = function () { reject(new Error('img load failed: ' + url)); };
        img.src = url;
      });
    }));
  }

  // ---------------------------------------------------------------------------
  // Fallback (no WebGL / init failure): keep <img>, add ken-burns zoom
  // ---------------------------------------------------------------------------
  function injectFallbackCSS() {
    if (document.getElementById('solstice-hero-fallback-style')) return;
    var css =
      '@keyframes solsticeHeroKB{' +
      '0%{transform:scale(1.02) translate3d(0,0,0);}' +
      '100%{transform:scale(1.14) translate3d(0,-1.5%,0);}' +
      '}' +
      '.hero-bg img.solstice-hero-kb{' +
      'animation:solsticeHeroKB 12s ease-out forwards;will-change:transform;' +
      '}' +
      '@media (prefers-reduced-motion: reduce){' +
      '.hero-bg img.solstice-hero-kb{animation:none;transform:scale(1.04);}' +
      '}';
    var s = document.createElement('style');
    s.id = 'solstice-hero-fallback-style';
    s.textContent = css;
    (document.head || document.documentElement).appendChild(s);
    styleEl = styleEl || s;
  }

  function enableFallback() {
    usingFallback = true;
    injectFallbackCSS();
    if (heroImgEl) {
      heroImgEl.style.opacity = '1';
      // add ken-burns unless reduced motion
      if (!reducedMotion) heroImgEl.classList.add('solstice-hero-kb');
    }
  }

  // ---------------------------------------------------------------------------
  // WebGL setup
  // ---------------------------------------------------------------------------
  function getGL(cv) {
    var opts = {
      alpha: false,
      antialias: true,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance',
      failIfMajorPerformanceCaveat: false
    };
    var ctx = null;
    try { ctx = cv.getContext('webgl', opts) || cv.getContext('experimental-webgl', opts); }
    catch (e) { ctx = null; }
    return ctx;
  }

  function setupCanvas() {
    canvas = document.createElement('canvas');
    canvas.className = 'solstice-hero-canvas';
    // Full-bleed inside .hero-bg, behind hero text.
    var st = canvas.style;
    st.position = 'absolute';
    st.top = '0';
    st.left = '0';
    st.width = '100%';
    st.height = '100%';
    st.display = 'block';
    st.zIndex = '0';
    st.pointerEvents = 'none';    // never block clicks/scroll
    st.opacity = '0';             // fade in once first frame drawn
    st.transition = 'opacity 900ms ease';
    // insert as the FIRST child so the fallback <img> paints above until faded
    heroBgEl.insertBefore(canvas, heroBgEl.firstChild);
  }

  function resize() {
    if (!canvas || !gl || destroyed) return;
    var dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    var rect = heroBgEl.getBoundingClientRect();
    var cssW = Math.max(1, Math.round(rect.width));
    var cssH = Math.max(1, Math.round(rect.height));
    var w = Math.max(1, Math.round(cssW * dpr));
    var h = Math.max(1, Math.round(cssH * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    gl.viewport(0, 0, w, h);
  }

  function bindQuad() {
    quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    var verts = new Float32Array([
      -1, -1, 1, -1, -1, 1,
      -1, 1, 1, -1, 1, 1
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(program, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  }

  function cacheUniforms() {
    u.from = gl.getUniformLocation(program, 'uFrom');
    u.to = gl.getUniformLocation(program, 'uTo');
    u.fromAspect = gl.getUniformLocation(program, 'uFromAspect');
    u.toAspect = gl.getUniformLocation(program, 'uToAspect');
    u.canvasAspect = gl.getUniformLocation(program, 'uCanvasAspect');
    u.progress = gl.getUniformLocation(program, 'uProgress');
    u.time = gl.getUniformLocation(program, 'uTime');
    u.mouse = gl.getUniformLocation(program, 'uMouse');
    u.mouseActive = gl.getUniformLocation(program, 'uMouseActive');
    u.motion = gl.getUniformLocation(program, 'uMotion');
  }

  // ---------------------------------------------------------------------------
  // Render loop
  // ---------------------------------------------------------------------------
  function tick() {
    rafId = 0;
    if (destroyed) return;
    if (document.hidden) return; // paused; visibility handler restarts

    var t = nowSec();
    var elapsed = t - startTime;
    lastFrameTime = t;

    // lerp mouse for smoothness
    var lerp = reducedMotion ? 1.0 : 0.06;
    mouseX += (mouseTargetX - mouseX) * lerp;
    mouseY += (mouseTargetY - mouseY) * lerp;
    mouseActive += (mouseActiveTarget - mouseActive) * (reducedMotion ? 1.0 : 0.05);

    // transition scheduling
    var progress = 0.0;
    if (!transitioning && elapsed >= nextTransitionAt && textures.length > 1) {
      transitioning = true;
      transitionStart = elapsed;
    }
    if (transitioning) {
      var tp = (elapsed - transitionStart) / FADE_SECONDS;
      if (tp >= 1.0) {
        // commit transition
        transitioning = false;
        current = next;
        next = (next + 1) % textures.length;
        nextTransitionAt = elapsed + HOLD_SECONDS;
        progress = 0.0;
      } else {
        progress = tp < 0 ? 0 : tp;
      }
    }

    resize();
    draw(elapsed, progress);

    schedule();
  }

  function draw(elapsed, progress) {
    if (!gl || !program || contextLost) return;
    if (gl.isContextLost && gl.isContextLost()) return;

    gl.useProgram(program);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textures[current]);
    gl.uniform1i(u.from, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, textures[next]);
    gl.uniform1i(u.to, 1);

    gl.uniform1f(u.fromAspect, imageAspects[current] || 1.7778);
    gl.uniform1f(u.toAspect, imageAspects[next] || 1.7778);
    gl.uniform1f(u.canvasAspect, canvas.width / Math.max(1, canvas.height));
    gl.uniform1f(u.progress, progress);
    gl.uniform1f(u.time, elapsed);
    gl.uniform2f(u.mouse, mouseX, mouseY);
    gl.uniform1f(u.mouseActive, mouseActive);
    gl.uniform1f(u.motion, reducedMotion ? 0.0 : 1.0);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // fade fallback <img> out & canvas in after first successful frame
    if (canvas.style.opacity !== '1') {
      canvas.style.opacity = '1';
      if (heroImgEl) {
        heroImgEl.style.transition = 'opacity 900ms ease';
        heroImgEl.style.opacity = '0';
      }
    }
  }

  function schedule() {
    if (destroyed || document.hidden || contextLost) return;
    if (!rafId) rafId = requestAnimationFrame(tick);
  }

  // ---------------------------------------------------------------------------
  // WebGL context loss: keep content visible via the fallback <img>.
  // Without this, a lost GPU context would blank the canvas while the poster
  // <img> is already faded to 0 — leaving the hero permanently invisible.
  // ---------------------------------------------------------------------------
  function onContextLost(e) {
    // preventDefault lets the context be restorable, but more importantly we
    // immediately fail over to the poster image so the hero never goes blank.
    if (e && e.preventDefault) e.preventDefault();
    contextLost = true;
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    // Reveal the poster <img> again (it was faded to 0 after first frame) and
    // hide the now-dead canvas so no black rectangle shows.
    if (heroImgEl) {
      heroImgEl.style.transition = 'opacity 600ms ease';
      heroImgEl.style.opacity = '1';
    }
    if (canvas) canvas.style.opacity = '0';
    enableFallback();
  }

  // ---------------------------------------------------------------------------
  // Event handlers
  // ---------------------------------------------------------------------------
  function onPointerMove(e) {
    if (!heroBgEl) return;
    var rect = heroBgEl.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    var px = (e.clientX - rect.left) / rect.width;
    var py = (e.clientY - rect.top) / rect.height;
    // clamp to [0,1]; flip y so shader gets y-up
    mouseTargetX = Math.min(1, Math.max(0, px));
    mouseTargetY = 1.0 - Math.min(1, Math.max(0, py));
    mouseActiveTarget = 1.0;
  }

  function onPointerLeave() {
    mouseActiveTarget = 0.0;
    mouseTargetX = 0.5;
    mouseTargetY = 0.5;
  }

  function onVisibility() {
    if (document.hidden) {
      if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    } else {
      // resync time base so animation doesn't jump
      var t = nowSec();
      var pausedFor = t - lastFrameTime;
      if (pausedFor > 0 && isFinite(pausedFor)) startTime += pausedFor;
      lastFrameTime = t;
      schedule();
    }
  }

  var resizeRaf = 0;
  function onResize() {
    if (resizeRaf) return;
    resizeRaf = requestAnimationFrame(function () {
      resizeRaf = 0;
      resize();
    });
  }

  function onReducedMotionChange() {
    reducedMotion = !!(reducedMotionMQ && reducedMotionMQ.matches);
  }

  // ---------------------------------------------------------------------------
  // Init / destroy
  // ---------------------------------------------------------------------------
  function init() {
    if (initialized || destroyed) return;

    heroBgEl = document.querySelector('.hero .hero-bg') || document.querySelector('.hero-bg');
    if (!heroBgEl) return; // nothing to mount into
    heroImgEl = heroBgEl.querySelector('img');

    initialized = true;

    // reduced-motion preference
    try {
      reducedMotionMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
      reducedMotion = !!reducedMotionMQ.matches;
      onReducedMotionBound = onReducedMotionChange;
      if (reducedMotionMQ.addEventListener) {
        reducedMotionMQ.addEventListener('change', onReducedMotionBound);
      } else if (reducedMotionMQ.addListener) {
        reducedMotionMQ.addListener(onReducedMotionBound);
      }
    } catch (e) { reducedMotion = false; }

    // Feature-detect WebGL by trying to create a real context.
    setupCanvas();
    gl = getGL(canvas);
    if (!gl) {
      // No WebGL: remove canvas, use CSS ken-burns fallback.
      if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
      canvas = null;
      enableFallback();
      return;
    }

    program = createProgram();
    if (!program) {
      if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
      canvas = null;
      gl = null;
      enableFallback();
      return;
    }

    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    gl.clearColor(0.027, 0.035, 0.039, 1.0); // ~ --ink

    cacheUniforms();
    bindQuad();
    resize();

    // Load all images, THEN start.
    loadImages(IMAGE_URLS).then(function (imgs) {
      if (destroyed || !gl) return;
      for (var i = 0; i < imgs.length; i++) {
        var im = imgs[i];
        textures.push(makeTexture(im));
        var aw = im.naturalWidth || im.width || 16;
        var ah = im.naturalHeight || im.height || 9;
        imageAspects.push(aw / Math.max(1, ah));
      }
      if (textures.length < 1) { enableFallback(); return; }
      if (textures.length === 1) { next = 0; } // single image safety

      // wire interaction/lifecycle events
      onResizeBound = onResize;
      onVisibilityBound = onVisibility;
      onPointerMoveBound = onPointerMove;
      onPointerLeaveBound = onPointerLeave;
      onContextLostBound = onContextLost;

      if (canvas) canvas.addEventListener('webglcontextlost', onContextLostBound, false);
      window.addEventListener('resize', onResizeBound, { passive: true });
      document.addEventListener('visibilitychange', onVisibilityBound);
      var hero = heroBgEl.closest ? (heroBgEl.closest('.hero') || heroBgEl) : heroBgEl;
      hero.addEventListener('pointermove', onPointerMoveBound, { passive: true });
      hero.addEventListener('pointerleave', onPointerLeaveBound, { passive: true });
      // keep ref to hero for removal
      init._hero = hero;

      startTime = nowSec();
      lastFrameTime = startTime;
      nextTransitionAt = HOLD_SECONDS;
      schedule();
    }).catch(function () {
      // Any texture failed to load -> graceful fallback.
      if (destroyed) return;
      if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
      canvas = null;
      cleanupGL();
      enableFallback();
    });
  }

  function cleanupGL() {
    if (!gl) return;
    try {
      for (var i = 0; i < textures.length; i++) {
        if (textures[i]) gl.deleteTexture(textures[i]);
      }
      if (quadBuffer) gl.deleteBuffer(quadBuffer);
      if (program) gl.deleteProgram(program);
      var ext = gl.getExtension('WEBGL_lose_context');
      if (ext) ext.loseContext();
    } catch (e) { /* ignore */ }
    textures = [];
    imageAspects = [];
    quadBuffer = null;
    program = null;
    gl = null;
  }

  function destroy() {
    destroyed = true;
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    if (resizeRaf) { cancelAnimationFrame(resizeRaf); resizeRaf = 0; }

    if (canvas && onContextLostBound) canvas.removeEventListener('webglcontextlost', onContextLostBound, false);
    if (onResizeBound) window.removeEventListener('resize', onResizeBound);
    if (onVisibilityBound) document.removeEventListener('visibilitychange', onVisibilityBound);
    if (init._hero && onPointerMoveBound) {
      init._hero.removeEventListener('pointermove', onPointerMoveBound);
      init._hero.removeEventListener('pointerleave', onPointerLeaveBound);
    }
    if (reducedMotionMQ && onReducedMotionBound) {
      if (reducedMotionMQ.removeEventListener) {
        reducedMotionMQ.removeEventListener('change', onReducedMotionBound);
      } else if (reducedMotionMQ.removeListener) {
        reducedMotionMQ.removeListener(onReducedMotionBound);
      }
    }

    cleanupGL();
    if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
    canvas = null;

    // restore fallback img visibility so content never disappears
    if (heroImgEl) heroImgEl.style.opacity = '1';
  }

  // ---------------------------------------------------------------------------
  // Auto-init (guard against double-init)
  // ---------------------------------------------------------------------------
  function boot() {
    try { init(); } catch (e) {
      // Absolute safety net: never leave hero blank.
      try { enableFallback(); } catch (e2) { /* ignore */ }
    }
  }

  if (document.readyState !== 'loading') {
    boot();
  } else {
    document.addEventListener('DOMContentLoaded', boot);
  }

  // ---------------------------------------------------------------------------
  // Expose EXACTLY ONE global.
  // ---------------------------------------------------------------------------
  window[GLOBAL_KEY] = { init: init, destroy: destroy };

})();
