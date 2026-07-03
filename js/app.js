/* =============================================================================
   Solstice International Realty — app logic
   ========================================================================== */
const { BRAND, COMMUNITIES, LISTINGS } = window.SOLSTICE;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const state = {
  source: "featured",          // "featured" | "mls"
  all: [...LISTINGS],          // active pool (featured or fetched mls)
  view: "grid",                // "grid" | "map"
  favs: new Set(JSON.parse(localStorage.getItem("sir_favs") || "[]")),
  compare: new Set(),
  filters: { q: "", community: "", type: "", beds: 0, baths: 0, min: 0, max: Infinity, sort: "price-desc" },
  map: null, markers: null,
};

const fmtPrice = (n, lease) =>
  lease ? "$" + n.toLocaleString() + "/mo"
        : n >= 1e6 ? "$" + (n / 1e6).toFixed(n % 1e6 ? 2 : 1) + "M" : "$" + n.toLocaleString();
const fmt$ = n => "$" + Math.round(n).toLocaleString();

/* ---------- AI NATURAL-LANGUAGE SEARCH ----------
   Parses phrases like: "4 bed under 5m ocean view in malibu for lease" */
function aiParse(text) {
  const t = " " + text.toLowerCase() + " ";
  const f = { q: "", community: "", type: "", beds: 0, baths: 0, min: 0, max: Infinity, sort: "price-desc" };

  // price: "under 5m", "below $3,000,000", "5-10m", "over 2m"
  const money = str => {
    let m = str.replace(/[$,\s]/g, "");
    let mult = 1;
    if (/m$/.test(m)) { mult = 1e6; m = m.replace("m", ""); }
    else if (/k$/.test(m)) { mult = 1e3; m = m.replace("k", ""); }
    const v = parseFloat(m);
    return isNaN(v) ? null : v * mult;
  };
  let mm;
  if ((mm = t.match(/(?:under|below|less than|max|up to)\s*\$?([\d.,]+\s?[mk]?)/))) { const v = money(mm[1]); if (v) f.max = v; }
  if ((mm = t.match(/(?:over|above|more than|min|starting)\s*\$?([\d.,]+\s?[mk]?)/))) { const v = money(mm[1]); if (v) f.min = v; }
  if ((mm = t.match(/\$?([\d.,]+\s?[mk]?)\s*(?:-|to)\s*\$?([\d.,]+\s?[mk]?)/))) {
    const a = money(mm[1]), b = money(mm[2]); if (a && b) { f.min = Math.min(a, b); f.max = Math.max(a, b); }
  }
  // beds / baths
  if ((mm = t.match(/(\d+)\s*\+?\s*(?:bed|bd|br|bedroom)/))) f.beds = +mm[1];
  if ((mm = t.match(/(\d+)\s*\+?\s*(?:bath|ba|bathroom)/))) f.baths = +mm[1];
  // lease vs sale
  if (/\b(lease|rent|rental|for rent)\b/.test(t)) f.type = "For Lease";
  if (/\b(buy|for sale|purchase)\b/.test(t)) f.type = "For Sale";
  // communities
  COMMUNITIES.forEach(c => { if (t.includes(c.key.toLowerCase())) f.community = c.key; });
  if (t.includes("lake sherwood") || t.includes("sherwood")) f.community = "Westlake Village";
  // sort hints
  if (/\b(cheap|affordable|lowest|budget)\b/.test(t)) f.sort = "price-asc";
  if (/\b(newest|new|modern)\b/.test(t)) f.sort = "year-desc";
  // keyword remainder (view/feature words)
  const kw = ["ocean", "view", "waterfront", "pool", "beach", "canal", "dock", "gated",
    "furnished", "modern", "estate", "city", "lake", "yacht", "tennis", "wine"]
    .filter(w => t.includes(w));
  f.q = kw.join(" ");
  return f;
}

/* ---------- FILTER + SORT ---------- */
function apply() {
  const f = state.filters;
  let rows = state.all.filter(l => {
    if (f.community && l.community !== f.community) return false;
    if (f.type && l.status !== f.type) return false;
    if (f.beds && l.beds < f.beds) return false;
    if (f.baths && l.baths < f.baths) return false;
    // price: leases and sales share the field; compare within source
    if (!l.lease) { if (l.price < f.min || l.price > f.max) return false; }
    if (f.q) {
      const hay = (l.tagline + " " + l.view + " " + l.features.join(" ") + " " +
        (l.waterfront ? "waterfront" : "") + " " + l.community).toLowerCase();
      if (!f.q.split(" ").every(w => hay.includes(w))) return false;
    }
    return true;
  });
  const s = f.sort;
  rows.sort((a, b) =>
    s === "price-asc" ? a.price - b.price :
    s === "price-desc" ? b.price - a.price :
    s === "year-desc" ? (b.year || 0) - (a.year || 0) :
    s === "sqft-desc" ? (b.sqft || 0) - (a.sqft || 0) : 0);
  return rows;
}

function render() {
  const rows = apply();
  $("#count").textContent = rows.length;
  const grid = $("#listings");
  if (!rows.length) {
    grid.innerHTML = `<div class="empty"><div style="font-size:2rem" class="gold">◇</div>
      No matches. <button class="gold" style="text-decoration:underline" onclick="clearFilters()">Reset filters</button></div>`;
  } else {
    grid.innerHTML = rows.map(cardHTML).join("");
  }
  if (state.view === "map") drawMap(rows);
  syncCompareTray();
}

function cardHTML(l) {
  const fav = state.favs.has(l.id) ? "on" : "";
  const sale = l.lease ? "lease" : "sale";
  return `<article class="card" onclick="openDetail('${l.id}')">
    <div class="card-img">
      <div class="card-badges">
        <span class="badge ${sale}">${l.status}</span>
        ${l.waterfront ? '<span class="badge">Waterfront</span>' : ''}
        ${l.source === 'mls' ? '<span class="badge">Live MLS</span>' : (l.featured ? '<span class="badge">Featured</span>' : '')}
      </div>
      <button class="fav ${fav}" onclick="event.stopPropagation();toggleFav('${l.id}',this)">${state.favs.has(l.id) ? '♥' : '♡'}</button>
      <img loading="lazy" src="${l.hero}" alt="${l.address}">
    </div>
    <div class="card-body">
      <div class="card-price">${fmtPrice(l.price, l.lease)}</div>
      <div class="card-addr">${l.address}</div>
      <div class="card-city">${l.city}${l.zip ? ", CA " + l.zip : ""} · ${l.view} view</div>
      <div class="card-tag">${l.tagline}</div>
      <div class="card-facts">
        <span><b>${l.beds}</b> Beds</span><span><b>${l.baths}</b> Baths</span>
        <span><b>${l.sqft ? l.sqft.toLocaleString() : '—'}</b> Sq Ft</span>
      </div>
      <label class="card-cmp" onclick="event.stopPropagation()">
        <input type="checkbox" ${state.compare.has(l.id) ? 'checked' : ''} onchange="toggleCompare('${l.id}')"> Compare
      </label>
    </div>
  </article>`;
}

/* ---------- FAVORITES ---------- */
window.toggleFav = (id, el) => {
  state.favs.has(id) ? state.favs.delete(id) : state.favs.add(id);
  localStorage.setItem("sir_favs", JSON.stringify([...state.favs]));
  if (el) { el.classList.toggle("on", state.favs.has(id)); el.textContent = state.favs.has(id) ? "♥" : "♡"; }
  $("#favCount").textContent = state.favs.size;
  toast(state.favs.has(id) ? "Saved to your collection" : "Removed from collection");
};

/* ---------- COMPARE ---------- */
window.toggleCompare = id => {
  if (state.compare.has(id)) state.compare.delete(id);
  else { if (state.compare.size >= 3) return toast("Compare up to 3 homes"); state.compare.add(id); }
  syncCompareTray();
};
function syncCompareTray() {
  const tray = $("#cmpTray"), items = $("#cmpItems");
  tray.classList.toggle("show", state.compare.size > 0);
  items.innerHTML = [...state.compare].map(id => {
    const l = state.all.find(x => x.id === id) || LISTINGS.find(x => x.id === id);
    return l ? `<img class="cmp-thumb" src="${l.hero}" title="${l.address}">` : "";
  }).join("");
  $("#cmpCount").textContent = state.compare.size;
}
window.openCompare = () => {
  const rows = [...state.compare].map(id => state.all.find(x => x.id === id) || LISTINGS.find(x => x.id === id)).filter(Boolean);
  if (rows.length < 2) return toast("Add at least 2 homes to compare");
  const fields = [["Price", l => fmtPrice(l.price, l.lease)], ["Community", l => l.community], ["Beds", l => l.beds],
    ["Baths", l => l.baths], ["Sq Ft", l => l.sqft?.toLocaleString() || "—"], ["$/Sq Ft", l => l.sqft ? fmt$(l.price / l.sqft) : "—"],
    ["View", l => l.view], ["Year", l => l.year || "—"], ["Status", l => l.status]];
  $("#modalContent").innerHTML = `<button class="modal-close" onclick="closeModal()">✕</button>
    <div style="padding:clamp(1.4rem,3vw,2.4rem)">
      <div class="eyebrow">Side by side</div><h2 style="font-size:2.2rem;margin:.4rem 0 1.5rem">Compare Homes</h2>
      <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;min-width:520px">
      <tr><td></td>${rows.map(l => `<td style="padding:.8rem;text-align:center"><img src="${l.hero}" style="width:100%;height:110px;object-fit:cover;border-radius:10px">
        <div style="font-size:.8rem;color:var(--gold-soft);margin-top:.4rem">${l.address}</div></td>`).join("")}</tr>
      ${fields.map(([lab, fn]) => `<tr style="border-top:1px solid var(--line)">
        <td style="padding:.7rem;color:var(--muted);font-size:.78rem;letter-spacing:.1em;text-transform:uppercase">${lab}</td>
        ${rows.map(l => `<td style="padding:.7rem;text-align:center;font-size:.95rem">${fn(l)}</td>`).join("")}</tr>`).join("")}
      </table></div></div>`;
  $("#overlay").classList.add("open");
};
window.clearCompare = () => { state.compare.clear(); syncCompareTray(); };

/* ---------- DETAIL MODAL + MORTGAGE CALC ---------- */
window.openDetail = id => {
  const l = state.all.find(x => x.id === id) || LISTINGS.find(x => x.id === id);
  if (!l) return;
  const g = l.gallery && l.gallery.length ? l.gallery : [l.hero];
  $("#modalContent").innerHTML = `
    <div class="modal-hero">
      <img class="main" id="mdMain" src="${g[0]}" alt="${l.address}">
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-thumbs">${g.map((src, i) =>
      `<img src="${src}" class="${i === 0 ? 'on' : ''}" onclick="setMain(this,'${src}')">`).join("")}</div>
    <div class="modal-body">
      <div>
        <div style="display:flex;justify-content:space-between;align-items:start;gap:1rem;flex-wrap:wrap">
          <div><div class="tag">${l.status}${l.waterfront ? " · Waterfront" : ""}</div>
            <div class="md-price">${fmtPrice(l.price, l.lease)}</div>
            <div style="color:var(--gold-soft);font-size:1.05rem;margin-top:.2rem">${l.address}</div>
            <div style="color:var(--muted);font-size:.85rem">${l.city}${l.zip ? ", CA " + l.zip : ""} · ${l.community}</div>
          </div>
          <button class="btn btn-ghost" onclick="toggleFav('${l.id}');this.textContent=SOLSTICE_fav('${l.id}')">${SOLSTICE_fav(l.id)}</button>
        </div>
        <div class="md-facts">
          <div><div class="n">${l.beds}</div><div class="l">Bedrooms</div></div>
          <div><div class="n">${l.baths}</div><div class="l">Bathrooms</div></div>
          <div><div class="n">${l.sqft ? l.sqft.toLocaleString() : '—'}</div><div class="l">Sq Ft</div></div>
          <div><div class="n">${l.lot ?? '—'}</div><div class="l">Acres</div></div>
          <div><div class="n">${l.year || '—'}</div><div class="l">Built</div></div>
        </div>
        <p style="color:#c9cfc8;line-height:1.7">${l.remarks || l.tagline + ". An exceptional offering presented by Donna Bohana of Solstice International Realty, with the discretion and white-glove representation her clientele expect."}</p>
        ${l.features?.length ? `<div class="md-feat">${l.features.map(x => `<span class="tag">${x}</span>`).join("")}</div>` : ""}
        <div style="margin-top:1.6rem;display:flex;gap:.8rem;flex-wrap:wrap">
          <button class="btn btn-gold" onclick="requestTour('${l.id}')">Request Private Tour</button>
          <a class="btn btn-ghost" href="tel:${BRAND.phoneRaw}">Call Donna</a>
        </div>
      </div>
      ${l.lease ? "" : calcHTML(l.price)}
    </div>`;
  $("#overlay").classList.add("open");
  if (!l.lease) initCalc(l.price);
};
window.SOLSTICE_fav = id => state.favs.has(id) ? "♥ Saved" : "♡ Save";
window.setMain = (el, src) => { $("#mdMain").src = src; $$(".modal-thumbs img").forEach(i => i.classList.remove("on")); el.classList.add("on"); };
window.closeModal = () => $("#overlay").classList.remove("open");

function calcHTML(price) {
  return `<div class="calc">
    <h4>Payment Estimator</h4>
    <label>Home Price</label><div class="val" id="cPrice">${fmt$(price)}</div>
    <label>Down Payment · <span id="cDpPct">20%</span></label>
    <input type="range" id="cDp" min="5" max="60" value="20">
    <div class="val" id="cDpVal"></div>
    <label>Interest Rate · <span id="cRate">6.5%</span></label>
    <input type="range" id="cRateS" min="30" max="90" value="65">
    <label>Term</label>
    <div class="seg" style="margin-top:.4rem">
      <button class="on" data-term="30" onclick="setTerm(this,30)">30 yr</button>
      <button data-term="15" onclick="setTerm(this,15)">15 yr</button>
    </div>
    <div class="pay" id="cPay">—<small> / mo est.</small></div>
    <div class="val" style="color:var(--muted);font-size:.72rem;margin-top:.4rem">Principal & interest only. Contact Donna for a full breakdown.</div>
  </div>`;
}
let calcCtx = { price: 0, term: 30 };
function initCalc(price) { calcCtx = { price, term: 30 };
  ["cDp", "cRateS"].forEach(id => $("#" + id).addEventListener("input", updateCalc)); updateCalc(); }
window.setTerm = (el, t) => { $$(".calc .seg button").forEach(b => b.classList.remove("on")); el.classList.add("on"); calcCtx.term = t; updateCalc(); };
function updateCalc() {
  const dp = +$("#cDp").value, rate = +$("#cRateS").value / 10;
  $("#cDpPct").textContent = dp + "%"; $("#cRate").textContent = rate.toFixed(1) + "%";
  const loan = calcCtx.price * (1 - dp / 100);
  $("#cDpVal").textContent = fmt$(calcCtx.price * dp / 100) + " down";
  const r = rate / 100 / 12, n = calcCtx.term * 12;
  const pay = r ? loan * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1) : loan / n;
  $("#cPay").innerHTML = fmt$(pay) + "<small> / mo est.</small>";
}
window.requestTour = id => { closeModal();
  const form = document.querySelector("#contact form"); if (form) form.dataset.propId = id;
  const l = state.all.find(x => x.id === id) || LISTINGS.find(x => x.id === id);
  document.querySelector("#contact").scrollIntoView({ behavior: "smooth" });
  setTimeout(() => { $("#cMsg").value = `I'd like to schedule a private tour of ${l ? l.address : "listing " + id}.`; $("#cName").focus(); }, 600); };

/* ---------- MAP ---------- */
function drawMap(rows) {
  if (!state.map) {
    state.map = L.map("map", { scrollWheelZoom: false }).setView([34.03, -118.68], 10);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: "© OpenStreetMap © CARTO", maxZoom: 19 }).addTo(state.map);
    state.markers = L.layerGroup().addTo(state.map);
  }
  state.markers.clearLayers();
  const pts = [];
  rows.forEach(l => {
    if (!l.coords) return;
    pts.push(l.coords);
    const icon = L.divIcon({ className: "", html: `<div class="map-pin">${fmtPrice(l.price, l.lease)}</div>`, iconSize: [1, 1] });
    L.marker(l.coords, { icon }).addTo(state.markers)
      .bindPopup(`<div class="map-pop"><img src="${l.hero}"><div class="p">${fmtPrice(l.price, l.lease)}</div>
        <div class="a">${l.address}</div><div style="font-size:.72rem;color:var(--muted);margin:.3rem 0 .5rem">${l.beds} bd · ${l.baths} ba · ${l.sqft ? l.sqft.toLocaleString() : '—'} sf</div>
        <button class="btn btn-gold" style="padding:.5rem 1rem;font-size:.72rem" onclick="closeMapPop();openDetail('${l.id}')">View Home</button></div>`);
  });
  if (pts.length) state.map.fitBounds(pts, { padding: [50, 50], maxZoom: 12 });
  setTimeout(() => state.map.invalidateSize(), 50);
}
window.closeMapPop = () => state.map && state.map.closePopup();

/* ---------- LIVE MLS TOGGLE (backend-powered) ---------- */
async function setSource(src) {
  state.source = src;
  $("#srcSwitch").classList.toggle("on", src === "mls");
  $("#srcLabel").textContent = src === "mls" ? "Live MLS feed" : "Solstice featured";
  const grid = $("#listings");
  if (src === "featured") {
    grid.innerHTML = `<div class="empty"><span class="spin"></span> Loading collection…</div>`;
    try { const rows = await SIR_API.apiListings({ limit: 48 }); if (rows.length) LISTINGS.splice(0, LISTINGS.length, ...rows); } catch (e) {}
    state.all = [...LISTINGS]; render(); return;
  }
  // Live MLS — proxied server-side (credentials never touch the browser)
  grid.innerHTML = `<div class="empty"><span class="spin"></span> Connecting to the MLS…</div>`;
  let rows = [];
  try { rows = await SIR_API.apiListings({ source: "mls", limit: 24 }); } catch (e) {}
  if (!rows.length) {
    toast("MLS feed unreachable — showing featured collection");
    state.source = "featured"; $("#srcSwitch").classList.remove("on"); $("#srcLabel").textContent = "Solstice featured";
    state.all = [...LISTINGS]; render(); return;
  }
  state.all = rows;
  toast(`Loaded ${rows.length} live MLS listings`);
  render();
}

/* ---------- CONTROLS WIRING ---------- */
function bindControls() {
  $("#fCommunity").addEventListener("change", e => { state.filters.community = e.target.value; render(); });
  $("#fType").addEventListener("change", e => { state.filters.type = e.target.value; render(); });
  $("#fBeds").addEventListener("change", e => { state.filters.beds = +e.target.value; render(); });
  $("#fBaths").addEventListener("change", e => { state.filters.baths = +e.target.value; render(); });
  $("#fSort").addEventListener("change", e => { state.filters.sort = e.target.value; render(); });
  $("#fPrice").addEventListener("change", e => {
    const [mn, mx] = e.target.value.split("-").map(Number);
    state.filters.min = mn || 0; state.filters.max = mx || Infinity; render();
  });
  $$(".view-seg button").forEach(b => b.addEventListener("click", () => {
    $$(".view-seg button").forEach(x => x.classList.remove("on")); b.classList.add("on");
    state.view = b.dataset.view;
    $("#gridWrap").style.display = state.view === "grid" ? "" : "none";
    $("#mapWrap").style.display = state.view === "map" ? "" : "none";
    render();
  }));
  $("#srcSwitch").addEventListener("click", () => setSource(state.source === "featured" ? "mls" : "featured"));
}
window.clearFilters = () => {
  state.filters = { q: "", community: "", type: "", beds: 0, baths: 0, min: 0, max: Infinity, sort: "price-desc" };
  ["fCommunity", "fType", "fBeds", "fBaths", "fPrice"].forEach(id => $("#" + id).value = "");
  $("#fSort").value = "price-desc"; $("#aiInput").value = ""; render();
};

/* ---------- AI SEARCH (server-side, Claude-ready) ---------- */
async function runAI(text) {
  if (!text.trim()) return;
  document.querySelector("#listings-sec").scrollIntoView({ behavior: "smooth" });
  const grid = $("#listings");
  grid.innerHTML = `<div class="empty"><span class="spin"></span> Searching…</div>`;
  try {
    const d = await SIR_API.apiSearch(text);
    const f = d.filters || {};
    state.source = "featured";
    state.all = d.results || [];
    state.filters = { q: "", community: f.community || "", type: f.type || "", beds: f.beds || 0,
      baths: f.baths || 0, min: f.min || 0, max: f.max || Infinity, sort: f.sort || "price-desc" };
    $("#fCommunity").value = f.community || ""; $("#fType").value = f.type || "";
    $("#fBeds").value = f.beds || ""; $("#fBaths").value = f.baths || "";
    $("#fSort").value = f.sort || "price-desc"; $("#fPrice").value = "";
    render();
    toast((d.ai ? "✦ " : "") + (d.explanation || "Search complete"));
  } catch (e) {
    // graceful fallback to the on-device parser
    const f = aiParse(text);
    state.filters = f;
    $("#fCommunity").value = f.community || ""; $("#fType").value = f.type || "";
    $("#fBeds").value = f.beds || ""; $("#fBaths").value = f.baths || ""; $("#fSort").value = f.sort;
    render();
    const bits = [];
    if (f.community) bits.push(f.community);
    if (f.beds) bits.push(f.beds + "+ bd");
    if (f.max < Infinity) bits.push("under " + fmtPrice(f.max));
    toast(bits.length ? "Searching: " + bits.join(" · ") : "Showing all homes");
  }
}

/* ---------- HOME VALUATION ----------
   Moved to js/valuation.js — now a real geocoding + comps estimate,
   not a hash of the address string. window.runValuation lives there. */

/* ---------- MISC ---------- */
function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("show"), 2600); }
window.filterByCommunity = key => { clearFilters(); state.filters.community = key; $("#fCommunity").value = key;
  document.querySelector("#listings-sec").scrollIntoView({ behavior: "smooth" }); render(); };
window.showFavs = () => {
  if (!state.favs.size) return toast("Tap ♡ on any home to save it");
  clearFilters();
  const saved = LISTINGS.filter(l => state.favs.has(l.id));
  state.source = "featured"; state.all = saved.length ? saved : [...LISTINGS];
  document.querySelector("#listings-sec").scrollIntoView({ behavior: "smooth" }); render();
  setTimeout(() => { state.all = [...LISTINGS]; }, 100); // keep pool but render already used saved
  // simpler: temporarily render saved
  $("#listings").innerHTML = saved.map(cardHTML).join(""); $("#count").textContent = saved.length;
};
window.submitContact = async e => {
  e.preventDefault();
  const form = e.target;
  const email = form.querySelector('input[type=email]');
  const phone = form.querySelector('input[type=tel]');
  const interest = form.querySelector('select');
  const btn = form.querySelector('button[type=submit]');
  const payload = {
    kind: form.dataset.propId ? "tour" : "contact",
    name: ($("#cName").value || "").trim(),
    email: email ? email.value.trim() : "",
    phone: phone ? phone.value.trim() : "",
    interest: interest ? interest.value : "",
    message: ($("#cMsg").value || "").trim(),
    property_id: form.dataset.propId || null,
  };
  if (btn) { btn.disabled = true; btn._t = btn.textContent; btn.textContent = "Sending…"; }
  try {
    const r = await SIR_API.apiLead(payload);
    toast(r.message || "Thank you — Donna's team will reach out shortly.");
    form.reset(); delete form.dataset.propId;
  } catch (err) {
    toast("Thank you — we'll be in touch shortly.");
    form.reset(); delete form.dataset.propId;
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = btn._t || "Send to Donna"; }
  }
  return false;
};

/* ---------- BOOT ---------- */
function boot() {
  bindControls();
  $("#favCount").textContent = state.favs.size;
  render();
  // Pull live listings from the Solstice backend; keep bundled data if offline.
  if (window.SIR_API) {
    SIR_API.apiListings({ limit: 48 }).then(rows => {
      if (rows && rows.length) {
        LISTINGS.splice(0, LISTINGS.length, ...rows);
        if (state.source === "featured") { state.all = [...LISTINGS]; render(); }
      }
    }).catch(() => {});
  }
  // AI search enter
  $("#aiInput").addEventListener("keydown", e => { if (e.key === "Enter") runAI(e.target.value); });
  $("#aiGo").addEventListener("click", () => runAI($("#aiInput").value));
  $$(".ai-chips button").forEach(b => b.addEventListener("click", () => { $("#aiInput").value = b.dataset.q; runAI(b.dataset.q); }));
  // nav scroll state
  const nav = $(".nav");
  addEventListener("scroll", () => nav.classList.toggle("solid", scrollY > 40));
  // reveal
  const io = new IntersectionObserver(es => es.forEach(x => x.isIntersecting && x.target.classList.add("in")), { threshold: .12 });
  $$(".reveal").forEach(el => io.observe(el));
  // mobile menu
  $("#burger").addEventListener("click", () => $("#mobileMenu").classList.add("open"));
  $("#mClose").addEventListener("click", () => $("#mobileMenu").classList.remove("open"));
  $$("#mobileMenu a").forEach(a => a.addEventListener("click", () => $("#mobileMenu").classList.remove("open")));
  // close modal on backdrop
  $("#overlay").addEventListener("click", e => { if (e.target.id === "overlay") closeModal(); });
  addEventListener("keydown", e => e.key === "Escape" && closeModal());
}
document.addEventListener("DOMContentLoaded", boot);
