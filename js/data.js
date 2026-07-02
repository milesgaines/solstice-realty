/* =============================================================================
   Solstice International Realty — curated featured listings
   Photos are Donna's own site imagery + freely-hotlinkable Unsplash interiors.
   This is the "Featured / Off-Market" collection. Live MLS results come from
   the IDX adapter in idx.js (see SOURCE toggle in the UI).
   ========================================================================== */

(function(){
const SITE = "https://solsticeir.com/wp-content/uploads";
const IMG = "assets/img"; // local, same-origin copies of Donna's real photos (WebGL-safe)

// Brand / company facts pulled from solsticeir.com
const BRAND = {
  name: "Solstice International Realty",
  agent: "Donna Bohana",
  role: "Broker / Owner",
  dre: "DRE# 01194141",
  tagline: "Your Coastal California & Westlake Village Expert",
  phone: "(310) 801-0265",
  phoneRaw: "3108010265",
  email: "info@solsticeir.com",
  address: "23465 Civic Center Way, Building 9, Malibu, CA 90265",
  logoWhite: `${IMG}/logo-white.webp`,
  hero: `${IMG}/hero.jpg`,
  heroAlt: `${IMG}/hero2.jpg`,
  hero3: `${IMG}/hero3.jpg`,
  headshot: `${IMG}/donna-headshot.jpg`,
  donnaPortrait: `${IMG}/donna-portrait.jpg`,
  donnaBuy: `${IMG}/donna-buy.jpg`,
  donnaCTA: `${IMG}/donna-cta.jpg`,
};

// Community imagery (her real photos)
const COMMUNITIES = [
  { key: "Malibu",           img: `${IMG}/malibu.jpg`,     blurb: "27 miles of coastline" },
  { key: "Pacific Palisades", img: `${IMG}/palisades.jpg`, blurb: "Bluff-top serenity" },
  { key: "Westlake Village", img: `${IMG}/westlake.jpg`,   blurb: "Lakeside luxury" },
  { key: "Venice",           img: `${IMG}/venice.jpg`,     blurb: "Canals & creativity" },
  { key: "Manhattan Beach",  img: `${IMG}/manhattan.jpg`,  blurb: "The Strand life" },
  { key: "Newport Beach",    img: `${IMG}/newport.jpg`,    blurb: "Harbor & yachts" },
  { key: "Brentwood",        img: `${IMG}/brentwood.jpg`,  blurb: "Gated estates" },
  { key: "Hollywood Hills",  img: `${IMG}/hollywood.jpg`,  blurb: "City-light views" },
];

// A few freely-hotlinkable Unsplash luxury interior/exterior shots for galleries
const U = (id, w = 1600) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;
const INT = {
  kitchen:  U("1502005229762-cf1b2da7c5d6"),
  living:   U("1600210492486-724fe5c67fb0"),
  living2:  U("1600607687920-4e2a09cf159d"),
  bedroom:  U("1600566753086-00f18fb6b3ea"),
  bath:     U("1600566752355-35792bedcfea"),
  pool:     U("1512917774080-9991f1c4c750"),
  pool2:    U("1613977257363-707ba9348227"),
  exterior: U("1600585154340-be6161a56a0c"),
  exterior2:U("1512918728675-ed5a9ecdebfd"),
  ocean:    U("1416331108676-a22ccb276e35"),
  dusk:     U("1613490493576-7fde63acd811"),
  great:    U("1560448204-e02f11c3d0e2"),
};

// Coordinates roughly centered on each community for the map
const COORDS = {
  "Malibu": [34.0259, -118.7798],
  "Pacific Palisades": [34.0452, -118.5265],
  "Westlake Village": [34.1459, -118.8055],
  "Venice": [33.9850, -118.4695],
  "Manhattan Beach": [33.8847, -118.4109],
  "Newport Beach": [33.6189, -117.9298],
  "Brentwood": [34.0520, -118.4738],
  "Hollywood Hills": [34.1341, -118.3215],
};

// jitter helper so markers don't stack
const near = (c, i) => [c[0] + (i % 5 - 2) * 0.006, c[1] + ((i * 7) % 5 - 2) * 0.007];

const LISTINGS = [
  {
    id: "SIR-001", status: "For Sale", featured: true, community: "Malibu",
    address: "27400 Pacific Coast Hwy", city: "Malibu", zip: "90265",
    price: 18950000, beds: 5, baths: 6, sqft: 6200, lot: 0.9, year: 2021,
    type: "Single Family", view: "Ocean", waterfront: true,
    tagline: "Oceanfront glass masterpiece on Broad Beach",
    hero: COMMUNITIES[0].img,
    gallery: [COMMUNITIES[0].img, INT.living, INT.kitchen, INT.pool, INT.bedroom, INT.ocean],
    features: ["Private beach access", "Infinity pool", "Wine cellar", "Smart home", "6-car motor court"],
  },
  {
    id: "SIR-002", status: "For Sale", featured: true, community: "Pacific Palisades",
    address: "1487 Palisades Bluff Rd", city: "Pacific Palisades", zip: "90272",
    price: 12400000, beds: 6, baths: 7, sqft: 7800, lot: 0.7, year: 2019,
    type: "Single Family", view: "Ocean & City", waterfront: false,
    tagline: "Bluff-top contemporary with panoramic canyon-to-sea views",
    hero: COMMUNITIES[1].img,
    gallery: [COMMUNITIES[1].img, INT.great, INT.kitchen, INT.living2, INT.bath, INT.dusk],
    features: ["Chef's kitchen", "Home theater", "Gym & spa", "Elevator", "Guest house"],
  },
  {
    id: "SIR-003", status: "For Lease", featured: true, community: "Westlake Village",
    address: "2055 Lakeshore Cir", city: "Westlake Village", zip: "91361",
    price: 32000, lease: true, beds: 5, baths: 5, sqft: 5400, lot: 0.5, year: 2016,
    type: "Single Family", view: "Lake", waterfront: true,
    tagline: "Lakefront estate with private dock — offered furnished",
    hero: COMMUNITIES[2].img,
    gallery: [COMMUNITIES[2].img, INT.living, INT.pool2, INT.bedroom, INT.exterior],
    features: ["Private boat dock", "Resort pool", "Furnished", "Lake views throughout"],
  },
  {
    id: "SIR-004", status: "For Sale", featured: true, community: "Venice",
    address: "418 Carroll Canal Ct", city: "Venice", zip: "90291",
    price: 6750000, beds: 4, baths: 4, sqft: 3600, lot: 0.15, year: 2020,
    type: "Single Family", view: "Canal", waterfront: true,
    tagline: "Architectural canal home steps from Abbot Kinney",
    hero: COMMUNITIES[3].img,
    gallery: [COMMUNITIES[3].img, INT.living2, INT.kitchen, INT.bedroom, INT.bath],
    features: ["Canal frontage", "Rooftop deck", "Design-forward", "2-car garage"],
  },
  {
    id: "SIR-005", status: "For Sale", featured: false, community: "Manhattan Beach",
    address: "312 The Strand", city: "Manhattan Beach", zip: "90266",
    price: 21500000, beds: 5, baths: 6, sqft: 5200, lot: 0.1, year: 2022,
    type: "Single Family", view: "Ocean", waterfront: true,
    tagline: "Brand-new Strand-front trophy home on the sand",
    hero: COMMUNITIES[4].img,
    gallery: [COMMUNITIES[4].img, INT.ocean, INT.kitchen, INT.living, INT.pool],
    features: ["Directly on The Strand", "Rooftop spa", "Elevator", "Bulthaup kitchen"],
  },
  {
    id: "SIR-006", status: "For Sale", featured: false, community: "Newport Beach",
    address: "2600 Bayshore Dr", city: "Newport Beach", zip: "92663",
    price: 15900000, beds: 5, baths: 6, sqft: 6800, lot: 0.3, year: 2018,
    type: "Single Family", view: "Harbor", waterfront: true,
    tagline: "Bayfront estate with private dock for a 60' yacht",
    hero: COMMUNITIES[5].img,
    gallery: [COMMUNITIES[5].img, INT.pool2, INT.great, INT.bedroom, INT.dusk],
    features: ["Private yacht dock", "Bay-view primary suite", "Waterfront pool", "Catering kitchen"],
  },
  {
    id: "SIR-007", status: "For Sale", featured: false, community: "Brentwood",
    address: "155 Bristol Gate Pl", city: "Los Angeles", zip: "90049",
    price: 9800000, beds: 6, baths: 8, sqft: 9100, lot: 1.1, year: 2015,
    type: "Single Family", view: "Canyon", waterfront: false,
    tagline: "Gated Cape Cod estate on a private promontory",
    hero: COMMUNITIES[6].img,
    gallery: [COMMUNITIES[6].img, INT.exterior, INT.living2, INT.kitchen, INT.bath],
    features: ["Motor court", "Tennis court", "Pool & spa", "Staff quarters", "Gated"],
  },
  {
    id: "SIR-008", status: "For Sale", featured: false, community: "Hollywood Hills",
    address: "8210 Mulholland Crest", city: "Los Angeles", zip: "90046",
    price: 8250000, beds: 4, baths: 5, sqft: 4700, lot: 0.4, year: 2021,
    type: "Single Family", view: "City Lights", waterfront: false,
    tagline: "Glass-walled view home above the Sunset Strip",
    hero: COMMUNITIES[7].img,
    gallery: [COMMUNITIES[7].img, INT.dusk, INT.pool, INT.living, INT.bedroom],
    features: ["Jetliner city views", "Infinity edge pool", "Auto gallery", "Control4 smart home"],
  },
  {
    id: "SIR-009", status: "For Sale", featured: false, community: "Malibu",
    address: "6021 Ramirez Canyon Rd", city: "Malibu", zip: "90265",
    price: 7350000, beds: 4, baths: 4, sqft: 4100, lot: 2.4, year: 2009,
    type: "Single Family", view: "Mountain", waterfront: false,
    tagline: "Private Ramirez Canyon compound with equestrian potential",
    hero: INT.exterior2,
    gallery: [INT.exterior2, INT.great, INT.kitchen, INT.pool2, INT.bedroom],
    features: ["2.4 acres", "Guest house", "Organic gardens", "Room for horses"],
  },
  {
    id: "SIR-010", status: "For Lease", featured: false, community: "Malibu",
    address: "20802 Pacific Coast Hwy", city: "Malibu", zip: "90265",
    price: 45000, lease: true, beds: 4, baths: 5, sqft: 4400, lot: 0.2, year: 2020,
    type: "Single Family", view: "Ocean", waterfront: true,
    tagline: "Furnished oceanfront lease on La Costa Beach",
    hero: INT.ocean,
    gallery: [INT.ocean, INT.living, INT.kitchen, INT.bedroom, INT.bath],
    features: ["On the sand", "Fully furnished", "Short or long term", "Chef's kitchen"],
  },
  {
    id: "SIR-011", status: "For Sale", featured: false, community: "Pacific Palisades",
    address: "870 Riviera Rancho Rd", city: "Pacific Palisades", zip: "90272",
    price: 5450000, beds: 4, baths: 4, sqft: 3900, lot: 0.35, year: 2017,
    type: "Single Family", view: "Canyon", waterfront: false,
    tagline: "Modern farmhouse in the coveted Riviera",
    hero: INT.exterior,
    gallery: [INT.exterior, INT.kitchen, INT.living2, INT.bedroom, INT.pool],
    features: ["Open great room", "Chef's kitchen", "Pool & spa", "Top school district"],
  },
  {
    id: "SIR-012", status: "For Sale", featured: false, community: "Westlake Village",
    address: "1330 Lake Sherwood Dr", city: "Lake Sherwood", zip: "91361",
    price: 4200000, beds: 5, baths: 5, sqft: 5100, lot: 0.6, year: 2012,
    type: "Single Family", view: "Golf & Lake", waterfront: false,
    tagline: "Guard-gated Sherwood Country Club estate",
    hero: INT.dusk,
    gallery: [INT.dusk, INT.great, INT.kitchen, INT.pool2, INT.bath],
    features: ["Guard-gated", "Golf frontage", "Wine room", "Resort backyard"],
  },
];

// attach coordinates
LISTINGS.forEach((l, i) => { l.coords = near(COORDS[l.community] || COORDS.Malibu, i); l.source = "featured"; });

window.SOLSTICE = { BRAND, COMMUNITIES, LISTINGS, INT };
})();
