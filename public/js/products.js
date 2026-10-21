// ─────────────────────────────────────────────────────────────
//  Simple Oven — menu & shop settings
//  This ONE file is used by both the website and the order
//  server (api/order.js). The server always re-checks prices
//  from here, so customers can't change prices in their browser.
//  To change a price / add a flavor: edit here, then redeploy.
// ─────────────────────────────────────────────────────────────

export const SHOP = {
  name: 'Simple Oven',
  tagline: 'home-baked goods',
  instagram: 'https://www.instagram.com/simple.oven/',
  instagramHandle: '@simple.oven',
  facebook: 'https://www.facebook.com/simpleoven.ph',
  currency: 'PHP',
  minLeadDays: 1, // earliest preferred date = today + this many days
  maxQtyPerItem: 20,
  // Website look: 'paper' (Option A), 'night' (Option B) or 'sticker' (Option C)
  design: 'paper',

  // ── How customers pay you (shown on the thank-you page). Leave '' to hide a line. ──
  payment: {
    gcashName: '',          // e.g. 'Juan D.'
    gcashNumber: '',        // e.g. '0917 123 4567'
    bankName: '',           // e.g. 'BPI'
    bankAccountName: '',    // e.g. 'Juan Dela Cruz'
    bankAccountNumber: '',  // e.g. '1234 5678 90'
  },

  // ── Pick-up (we don't deliver; customers can send their own rider) ──
  pickup: {
    place: 'Meshroom',             // where customers collect their order
    city: 'Dagupan City',
  },

  // ── Days you DON'T take orders for ──
  closedDates: ['2026-12-24', '2026-12-25', '2026-12-31', '2027-01-01'], // YYYY-MM-DD
  closedWeekdays: [], // 0 = Sun, 1 = Mon … 6 = Sat. Example: [1] = closed every Monday

  // ── Delivery fee estimates (SAMPLE numbers – change to your real areas/rates) ──
  // The rider fee is still confirmed when you book the rider.
  deliveryZones: [
    { id: 'near', label: 'Near us (within ~5 km)', min: 80, max: 150 },
    { id: 'mid', label: '5–12 km away', min: 150, max: 250 },
    { id: 'far', label: '12–25 km away', min: 250, max: 400 },
    { id: 'quote', label: 'Farther / not sure', min: null, max: null },
  ],
};

// img  = photo key in /assets/img (null = "photo coming soon" art)
// cut  = background-removed cutout key in /assets/cut (optional)
export const PRODUCTS = [
  {
    id: 'brown-butter',
    name: 'Brown Butter Chocolate Chip',
    category: 'cookies',
    soldOut: false, // true = shows 'Sold out' and can't be ordered
    badge: 'Bestseller',
    short: 'Brown butter dough, dark chocolate chips, sea salt.',
    desc: 'Brown butter dough loaded with premium dark chocolate chips, finished with sea salt flakes.',
    variants: [
      { id: '4', label: 'Box of 4', price: 380 },
      { id: '8', label: 'Box of 8', price: 740 },
    ],
    img: 'studio-bb',
    gallery: ['studio-bb', 'bb-cross', 'bb-stack', 'bb-plate', 'bb-milk'],
    cut: 'brownbutter-half',
    tone: '#b47a3e',
  },
  {
    id: 'red-velvet',
    name: 'Red Velvet Cream Cheese',
    category: 'cookies',
    soldOut: false, // true = shows 'Sold out' and can't be ordered
    badge: 'Fan favorite',
    short: 'Cream cheese center and white chocolate chips.',
    desc: 'Cocoa red velvet dough filled with a homemade cream cheese center and premium white chocolate chips.',
    variants: [
      { id: '4', label: 'Box of 4', price: 430 },
      { id: '8', label: 'Box of 8', price: 830 },
    ],
    img: 'studio-rv',
    gallery: ['studio-rv', 'rv-cross', 'rv-plate', 'rv-hand'],
    cut: 'redvelvet-stack',
    tone: '#7c1d22',
  },
  {
    id: 'birthday-bomb',
    name: 'Birthday Bomb',
    category: 'cookies',
    soldOut: false, // true = shows 'Sold out' and can't be ordered
    badge: null,
    short: 'Rainbow sprinkles and white chocolate chips.',
    desc: 'Brown butter dough with rainbow sprinkles and premium white chocolate chips.',
    variants: [
      { id: '4', label: 'Box of 4', price: 380 },
      { id: '8', label: 'Box of 8', price: 740 },
    ],
    img: null,
    art: 'sprinkle',
    gallery: [],
    tone: '#d9a3b4',
  },
  {
    id: 'white-cookie-butter',
    name: 'White Biscoff',
    category: 'cookies',
    soldOut: false, // true = shows 'Sold out' and can't be ordered
    badge: null,
    short: 'Gooey Biscoff center and white chocolate chips.',
    desc: 'Brown butter dough with a gooey Biscoff center and premium white chocolate chips.',
    variants: [
      { id: '4', label: 'Box of 4', price: 430 },
      { id: '8', label: 'Box of 8', price: 830 },
    ],
    img: null,
    art: 'butter',
    gallery: [],
    tone: '#c99a5b',
  },
  {
    id: 'sampler',
    name: 'Sampler',
    category: 'cookies',
    soldOut: false, // true = shows 'Sold out' and can't be ordered
    badge: "Can't decide?",
    short: 'A little of everything.',
    desc: 'Try them all. Box of 4 has 1 of each flavor. Box of 8 has 2 of each flavor.',
    variants: [
      { id: '4', label: 'Box of 4 (1 of each)', price: 410 },
      { id: '8', label: 'Box of 8 (2 of each)', price: 790 },
    ],
    img: 'studio-sampler',
    gallery: ['studio-sampler', 'studio-bb', 'studio-rv', 'bb-rack'],
    sampler: true,
    tone: '#8a5a33',
  },
  {
    id: 'dark-chocolate-revel',
    name: 'Dark Chocolate Revel Bars',
    category: 'bars',
    soldOut: false,
    badge: 'New',
    short: 'Oatmeal bars with a thick dark chocolate fudge.',
    desc: 'Oatmeal bars topped with a thick layer of dark chocolate fudge.',
    variants: [{ id: 'box', label: 'Per box', price: 580 }],
    img: 'studio-revel',
    gallery: ['studio-revel', 'revel-top', 'revel-black', 'revel-front', 'revel-poster'],
    cut: 'revel',
    tone: '#3b2418',
  },
  {
    id: 'biscoff-revel',
    name: 'Biscoff Revel Bars',
    category: 'bars',
    soldOut: false,
    badge: 'New',
    short: 'Oatmeal bar with dark chocolate fudge and Biscoff.',
    desc: 'Oatmeal cookie bar layered with dark chocolate fudge and Biscoff cookie butter.',
    variants: [{ id: 'box', label: 'Per box', price: 660 }],
    img: null,
    art: 'biscoff',
    gallery: [],
    tone: '#b5773a',
  },
];

export const CATEGORIES = [
  { id: 'all', label: 'Everything' },
  { id: 'cookies', label: 'Cookies' },
  { id: 'bars', label: 'Revel Bars' },
];

export const findProduct = (id) => PRODUCTS.find((p) => p.id === id);
export const findVariant = (p, vid) => p && p.variants.find((v) => v.id === vid);
export const fromPrice = (p) => Math.min(...p.variants.map((v) => v.price));
export const peso = (n) => '₱' + Number(n).toLocaleString('en-PH');

// ── date helpers (work on 'YYYY-MM-DD' strings, no time-zone surprises) ──
export const addDays = (ds, n) => { const d = new Date(ds + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
export const isClosedDate = (ds) => SHOP.closedDates.includes(ds) || SHOP.closedWeekdays.includes(new Date(ds + 'T00:00:00Z').getUTCDay());
export function nextOpenDates(fromDs, count = 6, maxLook = 60) {
  const out = [];
  for (let i = 0; i < maxLook && out.length < count; i++) { const d = addDays(fromDs, i); if (!isClosedDate(d)) out.push(d); }
  return out;
}
export const findZone = (id) => SHOP.deliveryZones.find((z) => z.id === id);
export const zoneText = (z) => (!z ? '' : z.min == null ? 'We\'ll quote you' : `${peso(z.min)}–${peso(z.max)}`);
