/* =============================================================================
   Solstice — odometer: every dollar amount and every figure counts up
   -----------------------------------------------------------------------------
   Markup contract — the element already holds its FINAL text, so the number is
   correct with JS off, with motion reduced, or if this file never loads:

     <b data-num="2450000" data-fmt="money">$2,450,000</b>

   `data-fmt`: money ($2,450,000) · moneyc ($2.45M) · int (2,450) · pct (+3.2%)
   Optional `data-from` starts the roll somewhere other than zero.

   Elements are armed once and roll when they scroll into view. Content injected
   later (listing cards, market cards, the valuation result) just calls scan()
   again — already-armed nodes are skipped, so re-renders never double-animate.

   Self-contained on purpose: GSAP/ScrollTrigger scan the DOM once at boot, so
   they can't see anything rendered after a fetch resolves. This can.
   ========================================================================== */
(function () {
  "use strict";

  const REDUCED = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const DUR = 1500;

  function format(v, kind) {
    switch (kind) {
      case "money":  return "$" + Math.round(v).toLocaleString();
      case "moneyc": return v >= 1e6
        ? "$" + (v / 1e6).toFixed(v % 1e6 ? 2 : 1).replace(/\.0$/, "") + "M"
        : "$" + Math.round(v).toLocaleString();
      case "pct":    return (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(1) + "%";
      case "dec1":   return v.toFixed(1);
      case "year":   return String(Math.round(v));   // never grouped — 2021, not 2,021
      default:       return Math.round(v).toLocaleString();
    }
  }

  /* Rolls one element to the number in data-num, then snaps to its exact
     original text so formatting quirks ("/mo", "M", "+") always survive. */
  function animate(el) {
    if (!el || el._sirRolled) return;
    el._sirRolled = true;

    const final = el.textContent;
    const target = parseFloat(el.getAttribute("data-num"));
    const kind = el.getAttribute("data-fmt") || "int";
    const from = parseFloat(el.getAttribute("data-from")) || 0;

    if (!isFinite(target) || REDUCED) { el.textContent = final; return; }

    const t0 = (window.performance || Date).now();
    el.textContent = format(from, kind);

    const step = now => {
      const p = Math.min(1, (now - t0) / DUR);
      const e = 1 - Math.pow(1 - p, 3);          // easeOutCubic
      el.textContent = format(from + (target - from) * e, kind);
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = final;
    };
    requestAnimationFrame(step);
    // rAF is throttled in background tabs — land on the real value regardless.
    setTimeout(() => { el.textContent = final; }, DUR + 250);
  }

  const io = "IntersectionObserver" in window
    ? new IntersectionObserver(entries => {
        entries.forEach(en => {
          if (!en.isIntersecting) return;
          io.unobserve(en.target);
          animate(en.target);
        });
      }, { rootMargin: "0px 0px -6% 0px", threshold: 0.15 })
    : null;

  /* Arms every unarmed [data-num] under `root` (default: whole document).
     `immediate` rolls them now instead of waiting for the viewport — used for
     content the user just opened (the detail modal), whose figures can sit
     below the fold inside their own scroller and would otherwise sit still. */
  function scan(root, immediate) {
    const scope = root && root.querySelectorAll ? root : document;
    const els = scope.querySelectorAll("[data-num]:not([data-armed])");
    for (let i = 0; i < els.length; i++) {
      const el = els[i];
      el.setAttribute("data-armed", "");
      if (immediate || !io) animate(el); else io.observe(el);
    }
    return els.length;
  }

  /* Rolls immediately, ignoring the viewport — for numbers revealed by a click
     (the valuation result) that are already on screen when they change. */
  function roll(el, num, fmt, text) {
    if (!el) return;
    el._sirRolled = false;
    el.setAttribute("data-num", num);
    el.setAttribute("data-fmt", fmt);
    el.setAttribute("data-armed", "");
    if (text != null) el.textContent = text;
    animate(el);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => scan());
  } else {
    scan();
  }

  window.SIR_ODOMETER = { scan, roll, animate, format, reduced: REDUCED };
})();
