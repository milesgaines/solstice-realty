/* ============================================================================
   Solstice — "CLEAN APP" overhaul JS (IIFE, no global collisions).
   1) Injects a native-app bottom tab bar on mobile (Home / Explore / Saved / Contact)
   2) Nav goes solid on scroll
   NOTE: stat count-ups are owned by motion.js ([data-count]); we do NOT touch them.
   All idempotent + reduced-motion safe.
   ============================================================================ */
(function () {
  "use strict";

  /* ---------- 1. mobile bottom tab bar ---------- */
  function ic(p) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + p + "</svg>";
  }
  var ICONS = {
    home: ic('<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>'),
    explore: ic('<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>'),
    saved: ic('<path d="M12 21s-7.5-4.6-10-9.3C.4 8.5 2 5 5.5 5 8 5 9.4 6.6 12 9c2.6-2.4 4-4 6.5-4C22 5 23.6 8.5 22 11.7 19.5 16.4 12 21 12 21Z"/>'),
    contact: ic('<path d="M4 5h16v12H7l-3 3V5Z"/>'),
  };

  function buildTabbar() {
    if (document.querySelector(".sir-tabbar")) return;
    var nav = document.createElement("nav");
    nav.className = "sir-tabbar";
    nav.setAttribute("aria-label", "Primary");
    nav.innerHTML =
      '<a href="#top" data-tab="home">' + ICONS.home + "<span>Home</span></a>" +
      '<a href="#listings-sec" data-tab="explore">' + ICONS.explore + "<span>Explore</span></a>" +
      '<a href="#" data-tab="saved">' + ICONS.saved + '<i class="tb-badge" style="display:none">0</i><span>Saved</span></a>' +
      '<a href="#contact" data-tab="contact">' + ICONS.contact + "<span>Contact</span></a>";
    document.body.appendChild(nav);

    // smooth-scroll for the section tabs (robust across browsers)
    function scrollToSel(sel) {
      var el = document.querySelector(sel);
      if (!el) return;
      var y = el.getBoundingClientRect().top + window.pageYOffset - 8;
      window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
    }
    nav.querySelectorAll('a[href^="#"]').forEach(function (a) {
      var tab = a.getAttribute("data-tab");
      if (tab === "saved") return;
      a.addEventListener("click", function (e) {
        e.preventDefault();
        scrollToSel(a.getAttribute("href"));
      });
    });

    // Saved → open favorites (reuse whatever the app exposes), else scroll to listings
    var savedLink = nav.querySelector('[data-tab="saved"]');
    savedLink.addEventListener("click", function (e) {
      e.preventDefault();
      var opened =
        (window.showFavs && window.showFavs()) ||
        (window.openFavorites && window.openFavorites());
      if (!opened) {
        var el = document.querySelector('.m-right [onclick*="fav" i], .m-right .m-link');
        if (el && el.click) el.click();
        else scrollToSel("#listings-sec");
      }
    });

    // active-state on scroll
    var sections = [
      { tab: "home", el: document.getElementById("top") || document.body },
      { tab: "explore", el: document.getElementById("listings-sec") },
      { tab: "contact", el: document.getElementById("contact") },
    ].filter(function (s) { return s.el; });
    function setActive() {
      var mark = window.innerHeight * 0.42, cur = "home";
      sections.forEach(function (s) {
        if (s.el.getBoundingClientRect().top <= mark) cur = s.tab; // viewport-relative, offsetParent-safe
      });
      nav.querySelectorAll("a").forEach(function (a) {
        a.classList.toggle("active", a.getAttribute("data-tab") === cur);
      });
    }
    window.addEventListener("scroll", setActive, { passive: true });
    setActive();

    // keep the saved-count badge in sync if the app tracks favorites
    function syncBadge() {
      var n = 0;
      try {
        if (window.state && Array.isArray(window.state.favs)) n = window.state.favs.length;
        else if (window.state && window.state.favs && window.state.favs.size != null) n = window.state.favs.size;
        else n = document.querySelectorAll(".fav.on").length;
      } catch (e) {}
      var b = nav.querySelector(".tb-badge");
      if (b) { b.textContent = n; b.style.display = n > 0 ? "grid" : "none"; }
    }
    document.addEventListener("click", function (e) {
      if (e.target && e.target.closest && e.target.closest(".fav")) setTimeout(syncBadge, 60);
    });
    syncBadge();
  }

  /* ---------- 2. nav solid on scroll ---------- */
  function initNav() {
    var nav = document.querySelector("header.nav");
    if (!nav) return;
    function on() { nav.classList.toggle("solid", window.scrollY > 40); }
    window.addEventListener("scroll", on, { passive: true });
    on();
  }

  function boot() { buildTabbar(); initNav(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
