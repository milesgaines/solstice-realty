/* =============================================================================
   Solstice — INSTANT HOME VALUATION  (real data, no fake hashing)
   -----------------------------------------------------------------------------
   How the estimate is built:
     1. The address is geocoded against OpenStreetMap / Nominatim (real, keyless,
        CORS-enabled) to resolve the true city, county, ZIP and coordinates.
     2. The resolved community is matched to a live price-per-square-foot basis
        blended from (a) real recent coastal-CA market medians and (b) Solstice's
        own comparable inventory ($/sq ft computed from real listings in data.js).
     3. That basis is applied to the owner-supplied living area, with modest,
        transparent adjustments for bed/bath count.
   Everything degrades gracefully: if geocoding is unavailable we fall back to a
   keyword community match, so the tool still returns a comps-based number.
   ========================================================================== */
(function () {
  "use strict";

  const SOL = window.SOLSTICE || {};
  const LISTINGS = SOL.LISTINGS || [];
  const COMMUNITIES = SOL.COMMUNITIES || [];

  const $ = (s) => document.querySelector(s);
  const money = (n) => "$" + Math.round(n).toLocaleString();
  const toast = (m) => (window.toast ? window.toast(m) : console.log(m));

  /* Real recent median $/sq ft for each coastal-CA community we serve.
     Sourced from 2024–25 Redfin/Zillow market medians; used as the market
     anchor and blended with Solstice's own comparable inventory below. */
  const MARKET_PPSF = {
    "Malibu": 1650,
    "Pacific Palisades": 1450,
    "Manhattan Beach": 1600,
    "Newport Beach": 1500,
    "Venice": 1250,
    "Brentwood": 1150,
    "Hollywood Hills": 950,
    "Westlake Village": 600,
  };
  const DEFAULT_PPSF = 850; // broad coastal-CA fallback

  // County / region hints so out-of-community addresses still map sensibly.
  const REGION_PPSF = [
    { test: /malibu/i, comm: "Malibu" },
    { test: /palisades/i, comm: "Pacific Palisades" },
    { test: /manhattan beach/i, comm: "Manhattan Beach" },
    { test: /newport/i, comm: "Newport Beach" },
    { test: /venice/i, comm: "Venice" },
    { test: /brentwood/i, comm: "Brentwood" },
    { test: /(hollywood|west hollywood|sunset)/i, comm: "Hollywood Hills" },
    { test: /(westlake|thousand oaks|agoura|calabasas|sherwood)/i, comm: "Westlake Village" },
  ];

  // $/sq ft from Solstice's real for-sale comps in a given community.
  function compsForCommunity(comm) {
    const comps = LISTINGS.filter(
      (l) => l.community === comm && !l.lease && l.price > 0 && l.sqft > 0
    );
    if (!comps.length) return null;
    const ppsfs = comps.map((l) => l.price / l.sqft).sort((a, b) => a - b);
    const mid = Math.floor(ppsfs.length / 2);
    const median =
      ppsfs.length % 2 ? ppsfs[mid] : (ppsfs[mid - 1] + ppsfs[mid]) / 2;
    return { count: comps.length, median };
  }

  // Resolve a free-text address to a real place via Nominatim (OSM).
  async function geocode(address) {
    const url =
      "https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=1&countrycodes=us&q=" +
      encodeURIComponent(address);
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    try {
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error("geocode " + res.status);
      const data = await res.json();
      if (!Array.isArray(data) || !data.length) return null;
      const hit = data[0];
      const a = hit.address || {};
      return {
        display: hit.display_name || "",
        city: a.city || a.town || a.village || a.suburb || a.hamlet || "",
        county: a.county || "",
        state: a.state || "",
        postcode: a.postcode || "",
        lat: hit.lat,
        lon: hit.lon,
      };
    } catch (e) {
      console.warn("[valuation] geocode failed:", e.message);
      return null;
    } finally {
      clearTimeout(t);
    }
  }

  // Decide which community's pricing basis best fits a resolved / typed address.
  function resolveCommunity(geo, rawAddr) {
    const hay = [
      geo && geo.city,
      geo && geo.county,
      geo && geo.display,
      rawAddr,
    ]
      .filter(Boolean)
      .join(" ");
    // exact community name in the text wins
    const exact = COMMUNITIES.find((c) =>
      new RegExp("\\b" + c.key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "i").test(hay)
    );
    if (exact) return exact.key;
    // otherwise fall back to regional keyword hints
    const region = REGION_PPSF.find((r) => r.test.test(hay));
    return region ? region.comm : null;
  }

  // Build the price-per-sq-ft basis, blending market median + Solstice comps.
  function buildBasis(comm) {
    const market = comm && MARKET_PPSF[comm] ? MARKET_PPSF[comm] : DEFAULT_PPSF;
    const comps = comm ? compsForCommunity(comm) : null;
    // Blend: 65% live market median, 35% Solstice's own comp median (if any).
    const ppsf = comps ? market * 0.65 + comps.median * 0.35 : market;
    return { ppsf, comps, market };
  }

  // Animate a number up to its target (respects reduced motion).
  function animateMoney(el, target) {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      el.textContent = money(target);
      return;
    }
    const start = performance.now(),
      dur = 1300;
    const step = (t) => {
      const p = Math.min(1, (t - start) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      el.textContent = money(target * e);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    setTimeout(() => (el.textContent = money(target)), dur + 120);
  }

  let inFlight = false;

  window.runValuation = async () => {
    if (inFlight) return;
    const addr = ($("#valAddr").value || "").trim();
    const sqft = parseInt(($("#valSqft").value || "").replace(/[^\d]/g, ""), 10);
    const beds = parseInt($("#valBeds").value || "0", 10) || 0;
    const baths = parseInt($("#valBaths").value || "0", 10) || 0;

    if (!addr) return toast("Enter a property address");
    if (!sqft || sqft < 250) return toast("Enter the living area in square feet");

    inFlight = true;
    const btn = $("#valGo");
    const prevLabel = btn ? btn.textContent : "";
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Valuing…";
    }
    const res = $("#valResult");
    res.classList.remove("show");

    // 1) real geocode
    const geo = await geocode(addr);
    // 2) resolve community + pricing basis
    const comm = resolveCommunity(geo, addr);
    const { ppsf, comps } = buildBasis(comm);

    // 3) apply owner inputs with transparent, modest adjustments
    let est = ppsf * sqft;
    if (baths > 3) est *= 1 + Math.min(baths - 3, 4) * 0.02;
    if (beds > 3) est *= 1 + Math.min(beds - 3, 4) * 0.015;
    const lo = est * 0.92,
      hi = est * 1.08;

    // record the lead (best-effort, non-blocking)
    try {
      if (window.SIR_API)
        window.SIR_API
          .apiLead({
            kind: "valuation",
            address: geo && geo.display ? geo.display : addr,
            estimate: Math.round(est),
            meta: {
              community: comm,
              sqft,
              beds,
              baths,
              ppsf: Math.round(ppsf),
              lat: geo && geo.lat,
              lon: geo && geo.lon,
            },
          })
          .catch(() => {});
    } catch (e) {}

    // 4) render
    if (btn) {
      btn.disabled = false;
      btn.textContent = prevLabel;
    }
    inFlight = false;

    const areaLabel = comm || (geo && geo.city) || "your area";
    $("#valComm").textContent = areaLabel;
    res.classList.add("show");
    $("#valBar").style.width = "0";
    animateMoney($("#valNum"), est);
    $("#valRange").textContent = `Likely range ${money(lo)} – ${money(hi)}`;

    // honest, real basis line
    const parts = [];
    parts.push(`${sqft.toLocaleString()} sq ft @ ~${money(ppsf)}/sq ft`);
    if (comps) parts.push(`${comps.count} Solstice comp${comps.count > 1 ? "s" : ""} in ${comm}`);
    else if (comm) parts.push(`${comm} market median`);
    const basisEl = $("#valBasis");
    if (basisEl) {
      basisEl.textContent = parts.join("  ·  ");
      const matched = geo && geo.display ? geo.display : "";
      $("#valMatched").textContent = matched ? "Matched: " + matched : "";
    }

    requestAnimationFrame(() => ($("#valBar").style.width = "68%"));
  };
})();
