/* =============================================================================
   Solstice — backend API layer (Supabase Edge Functions)
   -----------------------------------------------------------------------------
   Real data + real lead capture + server-side AI search + secure MLS proxy.
   The frontend never talks to the database directly — everything routes through
   these three functions, so credentials stay server-side and RLS stays locked.
   Every call degrades gracefully (callers fall back to bundled data if offline).
   ========================================================================== */
(function () {
  "use strict";

  const SUPABASE_URL = "https://enktupvwcsojqthiimvu.supabase.co";
  // Public anon key — safe to ship in the browser (RLS + edge validation protect data).
  const ANON =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVua3R1cHZ3Y3NvanF0aGlpbXZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4NTAyMTksImV4cCI6MjA5ODQyNjIxOX0.tf3oGT6_yPoqBwtBe6-WELQd1pYrfH7TO6Y0kuBr6BI";
  const FN = SUPABASE_URL + "/functions/v1";
  const HEADERS = { "Content-Type": "application/json", apikey: ANON, Authorization: "Bearer " + ANON };
  const TIMEOUT = 9000;

  function withTimeout(promise, ms) {
    return Promise.race([
      promise,
      new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms)),
    ]);
  }

  async function apiListings(params = {}) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "" && v !== Infinity) qs.set(k, String(v));
    });
    const res = await withTimeout(fetch(`${FN}/sir-properties?${qs}`, { headers: HEADERS }), TIMEOUT);
    if (!res.ok) throw new Error("listings " + res.status);
    const d = await res.json();
    if (d.error) throw new Error(d.error);
    return d.results || [];
  }

  async function apiSearch(query) {
    const res = await withTimeout(
      fetch(`${FN}/sir-search`, { method: "POST", headers: HEADERS, body: JSON.stringify({ query }) }),
      TIMEOUT
    );
    if (!res.ok) throw new Error("search " + res.status);
    const d = await res.json();
    if (d.error) throw new Error(d.error);
    return d; // { filters, explanation, count, results, ai }
  }

  async function apiLead(payload) {
    const res = await withTimeout(
      fetch(`${FN}/sir-lead`, { method: "POST", headers: HEADERS, body: JSON.stringify(payload) }),
      TIMEOUT
    );
    const d = await res.json().catch(() => ({}));
    if (!res.ok || d.error) throw new Error(d.error || "lead " + res.status);
    return d; // { ok, id, message }
  }

  async function apiValuation(address) {
    const res = await withTimeout(
      fetch(`${FN}/sir-valuation`, { method: "POST", headers: HEADERS, body: JSON.stringify({ address }) }),
      TIMEOUT
    );
    const d = await res.json().catch(() => ({}));
    if (!res.ok || d.error) throw new Error(d.error || "valuation " + res.status);
    return d; // { value, low, high, source, label, community }
  }

  async function apiMarket() {
    const res = await withTimeout(fetch(`${FN}/sir-market`, { headers: HEADERS }), TIMEOUT);
    const d = await res.json().catch(() => ({}));
    if (!res.ok || d.error) throw new Error(d.error || "market " + res.status);
    return d.markets || [];
  }

  window.SIR_API = { apiListings, apiSearch, apiLead, apiValuation, apiMarket, url: SUPABASE_URL, ready: true };
})();
