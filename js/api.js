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

  const SUPABASE_URL = "https://tgkgdquivdoquxamtgcr.supabase.co";
  // Public anon key — safe to ship in the browser (RLS + edge validation protect data).
  const ANON =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRna2dkcXVpdmRvcXV4YW10Z2NyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5MDU5NTEsImV4cCI6MjA4MDQ4MTk1MX0.JA67D0g9FCt5VWZAqhqxYvG3UoZ97RnBK3EarwTDuIY";
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

  window.SIR_API = { apiListings, apiSearch, apiLead, url: SUPABASE_URL, ready: true };
})();
