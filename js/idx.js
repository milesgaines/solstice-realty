/* =============================================================================
   IDX / MLS ADAPTER
   -----------------------------------------------------------------------------
   This is the single place Donna's developer swaps to go live with a real feed.

   The app ships pointed at the public SimplyRETS *demo* feed so the "Live MLS"
   toggle works out-of-the-box and proves real IDX connectivity end to end.
   (Demo data is sample MLS inventory — great for showing the pipeline is real.)

   TO GO LIVE with Solstice's own MLS data, choose ONE provider below, drop in
   the credentials, and set PROVIDER accordingly. Every provider returns the
   same normalized listing shape used across the app, so nothing else changes.

     • SimplyRETS   — RESO-compliant, easiest. Sign up, get user/pass. ($$)
     • Bridge/Zillow— free RESO Web API for many MLSs (server token required).
     • IDX Broker   — widget + API; use their JSON API with an accessKey.
     • Realtyna / Repliers / RESO Web API — same pattern, different base URL.

   NOTE: Most production MLS APIs require the call to be made server-side
   (CORS + credential secrecy). For the live site, proxy these through a tiny
   serverless function (Vercel/Netlify) and point BASE at it. The demo feed
   below allows browser calls, which is why it works with no backend today.
   ========================================================================== */

const IDX_CONFIG = {
  PROVIDER: "simplyrets-demo", // "simplyrets-demo" | "simplyrets" | "proxy"

  "simplyrets-demo": {
    base: "https://api.simplyrets.com/properties",
    // public demo credentials, documented by SimplyRETS
    auth: "Basic " + btoa("simplyrets:simplyrets"),
  },

  // When Solstice has a paid SimplyRETS key, fill these and set PROVIDER above.
  "simplyrets": {
    base: "https://api.simplyrets.com/properties",
    auth: "Basic " + btoa("YOUR_KEY:YOUR_SECRET"),
  },

  // Recommended for production: your own serverless proxy that injects secrets.
  "proxy": {
    base: "/api/mls", // e.g. a Vercel function that calls the real MLS
    auth: null,
  },
};

// Normalize a SimplyRETS/RESO record into the app's listing shape
function normalizeRESO(p, i) {
  const a = p.address || {};
  const g = p.geo || {};
  const photos = (p.photos && p.photos.length ? p.photos : []).slice(0, 8);
  return {
    id: p.mlsId ? "MLS-" + p.mlsId : "MLS-" + i,
    status: p.mls?.status || "Active",
    featured: false,
    source: "mls",
    community: a.city || "—",
    address: [a.streetNumber, a.streetName].filter(Boolean).join(" ") || "Address on request",
    city: a.city || "", zip: a.postalCode || "",
    price: p.listPrice || 0,
    lease: (p.property?.type || "").toLowerCase().includes("rent"),
    beds: p.property?.bedrooms || 0,
    baths: p.property?.bathsFull || p.property?.bathrooms || 0,
    sqft: p.property?.area || 0,
    lot: p.property?.lotSize ? +(p.property.lotSize / 43560).toFixed(2) : null,
    year: p.property?.yearBuilt || null,
    type: p.property?.type || "Residential",
    view: (p.property?.view) || "—",
    waterfront: !!p.property?.waterSource,
    tagline: p.remarks ? p.remarks.slice(0, 120) + "…" : "MLS listing",
    hero: photos[0] || window.SOLSTICE.INT.exterior,
    gallery: photos.length ? photos : [window.SOLSTICE.INT.exterior],
    features: [p.property?.subType, p.property?.style, p.property?.cooling]
      .filter(Boolean),
    coords: (g.lat && g.lng) ? [g.lat, g.lng] : null,
    remarks: p.remarks || "",
  };
}

// Fetch live MLS listings. Returns [] on any failure so UI can fall back.
async function fetchMLS({ limit = 24, minprice, maxprice } = {}) {
  const cfg = IDX_CONFIG[IDX_CONFIG.PROVIDER];
  if (!cfg) return [];
  const params = new URLSearchParams({ limit: String(limit) });
  if (minprice) params.set("minprice", String(minprice));
  if (maxprice) params.set("maxprice", String(maxprice));
  const headers = { Accept: "application/json" };
  if (cfg.auth) headers.Authorization = cfg.auth;
  try {
    const res = await fetch(`${cfg.base}?${params}`, { headers });
    if (!res.ok) throw new Error("MLS " + res.status);
    const data = await res.json();
    return (Array.isArray(data) ? data : []).map(normalizeRESO).filter(l => l.price > 0);
  } catch (e) {
    console.warn("[IDX] live MLS fetch failed, staying on featured collection:", e.message);
    return [];
  }
}

window.SOLSTICE_IDX = { fetchMLS, IDX_CONFIG };
