/* =============================================================================
   Solstice — live market prediction engine
   -----------------------------------------------------------------------------
   Turns the live RentCast payload from `sir-market` into a forward-looking
   12-month price projection per community, plus a projected value for any
   address the AVM prices in `sir-valuation`.

   Everything here runs on REAL money already on the wire — median price,
   median rent, days on market, new vs. standing inventory. Nothing is invented
   and nothing is hard-coded per community: change the feed and every number
   below changes with it.

   Two sources feed a projection:
     1. MODEL  — supply/pace/yield signals scored against coastal-luxury
                 baselines and anchored to long-run nominal appreciation.
     2. DRIFT  — the genuinely observed change in median price between stored
                 snapshots of the live feed. Weight ramps up as the observation
                 window widens, so the longer a visitor's browser has been
                 watching the market, the more the projection leans on measured
                 reality instead of the model.

   Projections are modeled estimates, not appraisals — the UI says so too.
   ========================================================================== */
(function () {
  "use strict";

  /* ---------- baselines (coastal California luxury) ---------- */
  const BALANCED_DOM = 55;      // days on market in a balanced coastal market
  const BALANCED_STOCK = 28;    // standing listings per new listing/month
  const BALANCED_YIELD = 0.030; // gross annual rent ÷ price
  const BASE_TREND = 2.6;       // long-run nominal appreciation, %/yr

  /* ---------- signal weights (max % swing each can contribute) ---------- */
  const W_PACE = 4.5, W_STOCK = 3.0, W_YIELD = 2.0;

  /* ---------- guard rails ---------- */
  const FLOOR = -9, CEIL = 14;      // a 12-mo projection never leaves this band
  const DRIFT_CAP = 20;             // annualized observed drift is clamped here
  const MIN_DRIFT_DAYS = 3;         // below this, observed change is just noise
  const FULL_DRIFT_DAYS = 60;       // observation window that earns full weight
  const MAX_DRIFT_WEIGHT = 0.55;    // measured reality never fully owns the call

  /* ---------- snapshot store ---------- */
  const HISTORY_KEY = "sir_market_history";
  const SNAPSHOT_EVERY = 6 * 3600e3; // don't re-record more than every 6h
  const MAX_SNAPSHOTS = 40;

  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
  const num = n => (typeof n === "number" && isFinite(n) ? n : null);

  /* ---------- persistence (never let a bad/blocked store break the page) --- */
  function readHistory() {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr.filter(s => s && s.t && s.m) : [];
    } catch (e) { return []; }
  }
  function writeHistory(arr) {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(arr.slice(-MAX_SNAPSHOTS))); }
    catch (e) { /* private mode / quota — projections just fall back to model */ }
  }

  /* Records one snapshot of the live feed, throttled. Keyed by zip so a
     community rename upstream doesn't orphan its own history. */
  function recordSnapshot(markets) {
    if (!Array.isArray(markets) || !markets.length) return readHistory();
    const hist = readHistory();
    const now = Date.now();
    const last = hist[hist.length - 1];
    if (last && now - last.t < SNAPSHOT_EVERY) return hist;

    const m = {};
    markets.forEach(x => {
      if (!x || !x.zip) return;
      m[x.zip] = { p: num(x.medianPrice), r: num(x.medianRent), d: num(x.daysOnMarket),
                   n: num(x.newListings), l: num(x.totalListings) };
    });
    if (!Object.keys(m).length) return hist;
    hist.push({ t: now, m });
    writeHistory(hist);
    return hist;
  }

  /* Observed annualized drift for a zip, from the oldest usable snapshot. */
  function observedDrift(zip, currentPrice) {
    if (!zip || !currentPrice) return null;
    const hist = readHistory();
    const now = Date.now();
    for (let i = 0; i < hist.length; i++) {
      const snap = hist[i], prev = snap.m && snap.m[zip];
      if (!prev || !prev.p) continue;
      const days = (now - snap.t) / 86400e3;
      if (days < MIN_DRIFT_DAYS) continue;
      const total = ((currentPrice - prev.p) / prev.p) * 100;
      const annualized = clamp(total * (365 / days), -DRIFT_CAP, DRIFT_CAP);
      const weight = clamp((days - MIN_DRIFT_DAYS) / (FULL_DRIFT_DAYS - MIN_DRIFT_DAYS), 0, 1) * MAX_DRIFT_WEIGHT;
      return { annualized, weight, days: Math.round(days), from: prev.p, total };
    }
    return null;
  }

  /* ---------- the model ---------- */
  function forecast(m) {
    if (!m) return null;
    const price = num(m.medianPrice);
    const dom = num(m.daysOnMarket);
    const rent = num(m.medianRent);
    const nw = num(m.newListings);
    const total = num(m.totalListings);

    const signals = [];

    // 1. Pace — fast sales pull prices up, stale markets drag them down.
    let paceC = 0;
    if (dom != null) {
      const z = clamp((BALANCED_DOM - dom) / BALANCED_DOM, -1, 1);
      paceC = z * W_PACE;
      signals.push({ key: "pace", label: dom + " days on market", pts: paceC });
    }

    // 2. Standing inventory per month of new supply — how stale the shelf is.
    let stockC = 0, stockRatio = null;
    if (total != null && nw) {
      stockRatio = total / Math.max(1, nw);
      const z = clamp((BALANCED_STOCK - stockRatio) / BALANCED_STOCK, -1, 1);
      stockC = z * W_STOCK;
      signals.push({ key: "supply", label: Math.round(stockRatio) + " listings per new listing", pts: stockC });
    }

    // 3. Gross rent yield — the affordability anchor prices revert toward.
    let yieldC = 0, gross = null;
    if (rent != null && price) {
      gross = (rent * 12) / price;
      const z = clamp((gross - BALANCED_YIELD) / BALANCED_YIELD, -1, 1);
      yieldC = z * W_YIELD;
      signals.push({ key: "yield", label: (gross * 100).toFixed(1) + "% gross yield", pts: yieldC });
    }

    const modelPct = BASE_TREND + paceC + stockC + yieldC;

    // 4. Blend in what we've actually watched happen since the first snapshot.
    const drift = observedDrift(m.zip, price);
    const pct = clamp(
      drift ? modelPct * (1 - drift.weight) + drift.annualized * drift.weight : modelPct,
      FLOOR, CEIL
    );

    // Confidence: how much real sample and real observation time is behind it.
    let conf = 0.45;
    if (total != null) conf += 0.30 * clamp(total / 250, 0, 1);
    if (nw != null) conf += 0.10 * clamp(nw / 12, 0, 1);
    if (drift) conf += 0.15 * (drift.weight / MAX_DRIFT_WEIGHT);
    conf = clamp(conf, 0, 1);

    return {
      pct,
      projected: price ? Math.round(price * (1 + pct / 100)) : null,
      direction: pct > 0.4 ? "up" : pct < -0.4 ? "down" : "flat",
      confidence: conf,
      confidenceLabel: conf >= 0.8 ? "High confidence" : conf >= 0.62 ? "Moderate confidence" : "Emerging signal",
      momentum: momentumLabel(dom, stockRatio),
      signals: signals.sort((a, b) => Math.abs(b.pts) - Math.abs(a.pts)),
      observed: drift,
      modelPct,
    };
  }

  function momentumLabel(dom, stockRatio) {
    if (dom == null) return "Tracking";
    if (dom <= 40 && (stockRatio == null || stockRatio <= 22)) return "Seller's market";
    if (dom >= 75 || (stockRatio != null && stockRatio >= 45)) return "Buyer's market";
    return "Balanced market";
  }

  /* ---------- public surface ---------- */
  let latest = [];

  /* Records a snapshot, then hands back the same array with `.forecast` on
     each row. Callers render straight off the result. */
  function enrich(markets) {
    if (!Array.isArray(markets)) return [];
    recordSnapshot(markets);
    latest = markets.map(m => Object.assign({}, m, { forecast: forecast(m) }));
    return latest;
  }

  /* Projects a single AVM value forward using its community's forecast,
     falling back to the listing-weighted average across the whole feed. */
  function projectValue(value, community) {
    const v = num(value);
    if (!v) return null;
    let f = null;
    if (community) {
      const hit = latest.find(m => m.community && m.community.toLowerCase() === String(community).toLowerCase());
      if (hit) f = hit.forecast;
    }
    if (!f && latest.length) {
      const rows = latest.filter(m => m.forecast);
      if (rows.length) {
        const wsum = rows.reduce((a, m) => a + (m.totalListings || 1), 0);
        const pct = rows.reduce((a, m) => a + m.forecast.pct * (m.totalListings || 1), 0) / wsum;
        f = { pct, confidence: 0.5, confidenceLabel: "Coastal average", momentum: "Coastal average" };
      }
    }
    if (!f) return null;
    // A projection is not an appraisal — don't print it to the dollar.
    const raw = v * (1 + f.pct / 100);
    const step = raw >= 1e6 ? 1e4 : 1e3;
    return {
      pct: f.pct,
      projected: Math.round(raw / step) * step,
      direction: f.pct > 0.4 ? "up" : f.pct < -0.4 ? "down" : "flat",
      confidenceLabel: f.confidenceLabel,
      momentum: f.momentum,
    };
  }

  /* "+3.2%" / "−1.4%" — the sign is the point, so it is always shown. */
  function fmtPct(pct, digits) {
    if (pct == null || !isFinite(pct)) return "—";
    const d = digits == null ? 1 : digits;
    return (pct >= 0 ? "+" : "−") + Math.abs(pct).toFixed(d) + "%";
  }

  function fmtMoney(n) {
    if (n == null || !isFinite(n)) return "—";
    if (n >= 1e6) return "$" + (n / 1e6).toFixed(n % 1e6 ? 2 : 1).replace(/\.0$/, "") + "M";
    if (n >= 1e3) return "$" + Math.round(n).toLocaleString();
    return "$" + Math.round(n);
  }

  /* "updated 4 min ago" for the live badge. */
  function ago(iso) {
    const t = iso ? Date.parse(iso) : NaN;
    if (!isFinite(t)) return "";
    const s = Math.max(0, (Date.now() - t) / 1000);
    if (s < 90) return "just now";
    if (s < 3600) return Math.round(s / 60) + " min ago";
    if (s < 86400) return Math.round(s / 3600) + "h ago";
    return Math.round(s / 86400) + "d ago";
  }

  window.SIR_PREDICT = {
    enrich, forecast, projectValue, recordSnapshot,
    fmtPct, fmtMoney, ago,
    history: readHistory,
    markets: () => latest,
    ready: true,
  };
})();
