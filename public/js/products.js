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
  // ── Ordering rules. These are only the STARTING values: the owner page (/#/admin) overrides them. ──
  minLeadDays: 1,      // order at least this many days before pick-up (1 = order today, pick up tomorrow at the earliest)
  orderCutoff: '',     // e.g. '20:00' = after 8pm, tomorrow is no longer available ('' = no cut-off)
  maxAheadDays: 60,    // how far ahead customers can book
  pickupTimes: ['Morning (9am – 12nn)', 'Afternoon (12nn – 5pm)', 'Evening (5pm – 8pm)'],
  notice: '',          // optional announcement shown at the top of the site
  tips: { enabled: true, amounts: [20, 50, 100] }, // optional tip at checkout (owner page can change)
  ribbonColors: [],    // ribbon colors customers can pick (edit on the owner page). Empty = "our choice"
  maxQtyPerItem: 20,
  // Website look: 'paper' (Option A), 'night' (Option B) or 'sticker' (Option C)
  design: 'paper',

  // ── How customers pay you. Set these on the owner page (/#/admin). Leave '' to hide a line. ──
  requirePayment: true, // customers pay + upload their GCash/bank screenshot BEFORE the order is sent
  payment: {
    gcashName: 'KA*A MA****A C.',
    gcashNumber: '0917 566 7964',
    bankName: 'GoTyme Bank',
    bankAccountName: 'KARA M****** C********',
    bankAccountNumber: '014136433561',
    qr: '',                 // set automatically when a GCash QR is uploaded on the owner page
  },

  // ── Pick-up (we don't deliver; customers can send their own rider) ──
  pickup: {
    place: 'Meshroom Cafe',        // where customers collect their order
    city: 'Dagupan City',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=Meshroom%20Cafe%20Dagupan%20City', // paste the exact Google Maps pin link in the owner page
  },

  // ── Days you DON'T take orders for ──
  closedDates: ['2026-12-24', '2026-12-25', '2026-12-31', '2027-01-01'], // YYYY-MM-DD
  closedWeekdays: [], // 0 = Sun, 1 = Mon … 6 = Sat. Example: [1] = closed every Monday
  openDates: [],      // exceptions: dates you DO open even though that weekday is normally closed

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
    short: 'Brown butter dough loaded with premium dark chocolate chips, finished with sea salt flakes.',
    desc: 'Brown butter dough loaded with premium dark chocolate chips, finished with sea salt flakes.',
    variants: [
      { id: '4', label: 'Box of 4', price: 380 },
      { id: '8', label: 'Box of 8', price: 740 },
    ],
    img: 'photo-bb',
    gallery: ['photo-bb', 'studio-bb', 'bb-cross', 'bb-stack', 'bb-plate', 'bb-milk'],
    cut: 'brownbutter-half',
    tone: '#b47a3e',
  },
  {
    id: 'white-choco-oreo',
    name: 'White Choco Oreo',
    category: 'cookies',
    soldOut: false, // true = shows 'Sold out' and can't be ordered
    badge: null,
    short: 'Brown butter dough with Oreo chunks and premium white chocolate chips.',
    desc: 'Brown butter dough with Oreo chunks and premium white chocolate chips.',
    variants: [
      { id: '4', label: 'Box of 4', price: 380 },
      { id: '8', label: 'Box of 8', price: 740 },
    ],
    img: 'photo-oreo',
    art: 'butter',
    gallery: ['photo-oreo'],
    tone: '#3a2f2c',
  },
  {
    id: 'birthday-bomb',
    name: 'Birthday Bomb',
    category: 'cookies',
    soldOut: false, // true = shows 'Sold out' and can't be ordered
    badge: null,
    short: 'Brown butter dough with rainbow sprinkles and premium white chocolate chips.',
    desc: 'Brown butter dough with rainbow sprinkles and premium white chocolate chips.',
    variants: [
      { id: '4', label: 'Box of 4', price: 380 },
      { id: '8', label: 'Box of 8', price: 740 },
    ],
    img: 'photo-bday',
    art: 'sprinkle',
    gallery: ['photo-bday'],
    tone: '#d9a3b4',
  },
  {
    id: 'red-velvet',
    name: 'Red Velvet Cream Cheese',
    category: 'cookies',
    soldOut: false, // true = shows 'Sold out' and can't be ordered
    badge: 'Fan favorite',
    short: 'Cocoa red velvet dough filled with a homemade cream cheese center and premium white chocolate chips.',
    desc: 'Cocoa red velvet dough filled with a homemade cream cheese center and premium white chocolate chips.',
    variants: [
      { id: '4', label: 'Box of 4', price: 430 },
      { id: '8', label: 'Box of 8', price: 830 },
    ],
    img: 'photo-rv',
    gallery: ['photo-rv', 'studio-rv', 'rv-cross', 'rv-plate', 'rv-hand'],
    cut: 'redvelvet-stack',
    tone: '#7c1d22',
  },
  {
    id: 'sampler',
    name: 'Sampler',
    category: 'cookies',
    soldOut: false, // true = shows 'Sold out' and can't be ordered
    badge: "Can't decide?",
    short: 'A little of everything.',
    desc: 'Try them all: Brown Butter Chocolate Chip, White Choco Oreo, Birthday Bomb and Red Velvet Cream Cheese. Box of 4 has 1 of each flavor. Box of 8 has 2 of each flavor.',
    variants: [
      { id: '4', label: 'Box of 4 (1 of each)', price: 410 },
      { id: '8', label: 'Box of 8 (2 of each)', price: 790 },
    ],
    img: 'photo-sampler',
    gallery: ['photo-sampler', 'photo-bb', 'photo-oreo', 'photo-bday', 'photo-rv'],
    sampler: true,
    tone: '#8a5a33',
  },
  {
    id: 'dark-chocolate-revel',
    name: 'Dark Chocolate Revel Bars',
    category: 'bars',
    soldOut: false,
    badge: 'New',
    short: 'Oatmeal bars topped with a thick layer of dark chocolate fudge.',
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
    short: 'Oatmeal cookie bar layered with dark chocolate fudge and Biscoff cookie butter.',
    desc: 'Oatmeal cookie bar layered with dark chocolate fudge and Biscoff cookie butter.',
    variants: [{ id: 'box', label: 'Per box', price: 660 }],
    img: 'biscoff-bar',
    art: 'biscoff',
    gallery: ['biscoff-bar', 'biscoff-tray'],
    tone: '#b5773a',
  },
];

export const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'cookies', label: 'Cookies' },
  { id: 'bars', label: 'Bars' },
];

export const findProduct = (id) => PRODUCTS.find((p) => p.id === id);
export const findVariant = (p, vid) => p && p.variants.find((v) => v.id === vid);
export const fromPrice = (p) => Math.min(...p.variants.map((v) => v.price));
export const peso = (n) => '₱' + Number(n).toLocaleString('en-PH');

// ── date helpers (work on 'YYYY-MM-DD' strings, no time-zone surprises) ──
export const addDays = (ds, n) => { const d = new Date(ds + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
export const weekdayOf = (ds) => new Date(ds + 'T00:00:00Z').getUTCDay();
export const isClosedDate = (ds) => SHOP.closedDates.includes(ds) || (SHOP.closedWeekdays.includes(weekdayOf(ds)) && !SHOP.openDates.includes(ds));
// Philippine time, so the rules are the same for every customer and for the server
export const manilaNow = () => { const iso = new Date(Date.now() + 8 * 3600 * 1000).toISOString(); return { date: iso.slice(0, 10), time: iso.slice(11, 16) }; };
export function earliestDate(now = manilaNow()) {
  let d = addDays(now.date, Math.max(0, SHOP.minLeadDays | 0));
  if (SHOP.orderCutoff && now.time >= SHOP.orderCutoff) d = addDays(d, 1);
  return d;
}
export const latestDate = (now = manilaNow()) => addDays(now.date, SHOP.maxAheadDays || 60);

// ── Owner settings (saved from /#/admin). Same rules on the website and on the order server. ──
export const settingsKeys = ['soldOut', 'closedDates', 'closedWeekdays', 'openDates', 'pickupTimes', 'minLeadDays', 'orderCutoff', 'maxAheadDays', 'pickup', 'notice', 'payment', 'requirePayment', 'ribbonColors', 'tips', 'prices', 'addonPrices', 'badges', 'names', 'descs', 'extraProducts', 'hidden', 'photos', 'order'];
export const PAY_FIELDS = ['gcashName', 'gcashNumber', 'bankName', 'bankAccountName', 'bankAccountNumber'];
export const paymentReady = (p = SHOP.payment) => !!(p && (p.gcashNumber || p.bankAccountNumber));
export const mustPayFirst = () => !!SHOP.requirePayment && paymentReady();
// ── Add-ons (prices in pesos). The server re-checks these too. ──
export const ADDONS = {
  wrap: { label: 'Individually packed', price: { '4': 5, '8': 10 } }, // cookies only, per box
  ribbon: { label: 'Ribbon', price: 10 },                              // per box
};
// built-in products (the owner can rename them); products the owner adds are stored in settings.extraProducts
export const BASE_PRODUCTS = PRODUCTS.slice();
export const BASE_TEXT = Object.fromEntries(PRODUCTS.map((p) => [p.id, { name: p.name, short: p.short, desc: p.desc }]));
export const isCustomId = (id) => /^c-[a-z0-9]{4,12}$/.test(String(id));
const DEFAULTS = JSON.parse(JSON.stringify({ ...SHOP, names: {}, descs: {}, extraProducts: [], hidden: {}, photos: {}, order: [], soldOut: Object.fromEntries(PRODUCTS.map((p) => [p.id, !!p.soldOut])),
  prices: Object.fromEntries(PRODUCTS.map((p) => [p.id, Object.fromEntries(p.variants.map((v) => [v.id, v.price]))])),
  badges: Object.fromEntries(PRODUCTS.map((p) => [p.id, p.badge || ''])),
  addonPrices: { wrap4: ADDONS.wrap.price['4'], wrap8: ADDONS.wrap.price['8'], ribbon: ADDONS.ribbon.price } }));
export function defaultSettings() {
  const d = JSON.parse(JSON.stringify(DEFAULTS));
  return Object.fromEntries(settingsKeys.map((k) => [k, d[k]]));
}
const isDs = (x) => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x);
const str = (x, max) => String(x ?? '').replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, max);
// cleans anything coming from storage or the owner page; missing/broken values fall back to the defaults
export function cleanSettings(raw) {
  const d = defaultSettings(), r = raw && typeof raw === 'object' ? raw : {};
  const out = { ...d };
  if (r.soldOut && typeof r.soldOut === 'object') for (const p of BASE_PRODUCTS) if (p.id in r.soldOut) out.soldOut[p.id] = !!r.soldOut[p.id];
  for (const k of ['closedDates', 'openDates']) if (Array.isArray(r[k])) out[k] = [...new Set(r[k].filter(isDs))].sort().slice(0, 400);
  if (Array.isArray(r.closedWeekdays)) out.closedWeekdays = [...new Set(r.closedWeekdays.map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n <= 6))].sort();
  if (Array.isArray(r.pickupTimes)) { const t = [...new Set(r.pickupTimes.map((x) => str(x, 40)).filter(Boolean))].slice(0, 20); if (t.length) out.pickupTimes = t; }
  if (r.minLeadDays !== undefined && Number.isFinite(+r.minLeadDays)) out.minLeadDays = Math.min(14, Math.max(0, Math.round(+r.minLeadDays)));
  if (r.maxAheadDays !== undefined && Number.isFinite(+r.maxAheadDays)) out.maxAheadDays = Math.min(180, Math.max(3, Math.round(+r.maxAheadDays)));
  if (typeof r.orderCutoff === 'string') out.orderCutoff = /^([01]\d|2[0-3]):[0-5]\d$/.test(r.orderCutoff) ? r.orderCutoff : '';
  if (r.pickup && typeof r.pickup === 'object') {
    out.pickup = { place: (str(r.pickup.place, 60) === 'Meshroom' ? 'Meshroom Cafe' : str(r.pickup.place, 60)) || d.pickup.place, city: str(r.pickup.city, 60) || d.pickup.city, mapUrl: d.pickup.mapUrl };
    const u = str(r.pickup.mapUrl, 500).replace('query=Meshroom%20Dagupan%20City', 'query=Meshroom%20Cafe%20Dagupan%20City');
    if (/^https:\/\/[^\s"'<>]+$/.test(u)) out.pickup.mapUrl = u;
  }
  if (typeof r.notice === 'string') out.notice = str(r.notice, 200);
  if (r.payment && typeof r.payment === 'object') {
    out.payment = { ...d.payment };
    for (const k of PAY_FIELDS) if (typeof r.payment[k] === 'string' && r.payment[k].trim()) out.payment[k] = str(r.payment[k], 60); // empty = keep the default
    out.payment.qr = /^\d{10,16}$/.test(String(r.payment.qr || '')) ? String(r.payment.qr) : '';
  }
  if (typeof r.requirePayment === 'boolean') out.requirePayment = r.requirePayment;
  if (r.tips && typeof r.tips === 'object') {
    out.tips = { enabled: r.tips.enabled !== false, amounts: d.tips.amounts };
    if (Array.isArray(r.tips.amounts)) { const a = [...new Set(r.tips.amounts.map((x) => Math.round(+x)).filter((x) => x > 0 && x <= 5000))].sort((x, y) => x - y).slice(0, 5); if (a.length) out.tips.amounts = a; }
  }
  const money = (x, lo, hi) => { const n = Math.round(Number(x)); return Number.isFinite(n) && n >= lo && n <= hi ? n : null; };
  if (r.prices && typeof r.prices === 'object') for (const p of BASE_PRODUCTS) for (const v of p.variants) { const n = money(r.prices?.[p.id]?.[v.id], 1, 100000); if (n != null) out.prices[p.id][v.id] = n; }
  if (r.addonPrices && typeof r.addonPrices === 'object') for (const k of ['wrap4', 'wrap8', 'ribbon']) { const n = money(r.addonPrices[k], 0, 10000); if (n != null) out.addonPrices[k] = n; }
  if (r.badges && typeof r.badges === 'object') for (const p of BASE_PRODUCTS) if (typeof r.badges[p.id] === 'string') out.badges[p.id] = str(r.badges[p.id], 24);
  for (const k of ['names', 'descs']) if (r[k] && typeof r[k] === 'object') { out[k] = {}; for (const p of BASE_PRODUCTS) { const v = str(r[k][p.id], k === 'names' ? 60 : 300); if (v) out[k][p.id] = v; } }
  if (Array.isArray(r.extraProducts)) {
    const seen = new Set();
    out.extraProducts = r.extraProducts.slice(0, 30).map((x) => {
      if (!x || typeof x !== 'object' || !isCustomId(x.id) || seen.has(x.id)) return null; seen.add(x.id);
      const name = str(x.name, 60); const price4 = money(x.price4, 1, 100000); if (!name || price4 == null) return null;
      return { id: x.id, name, category: x.category === 'bars' ? 'bars' : 'cookies', desc: str(x.desc, 300), price4, price8: money(x.price8, 1, 100000),
        badge: str(x.badge, 24), soldOut: !!x.soldOut, hidden: !!x.hidden, photo: /^\d{10,16}$/.test(String(x.photo || '')) ? String(x.photo) : '' };
    }).filter(Boolean);
  }
  const ver = (v) => (/^\d{10,16}$/.test(String(v || '')) ? String(v) : '');
  if (r.hidden && typeof r.hidden === 'object') for (const p of BASE_PRODUCTS) if (r.hidden[p.id]) out.hidden[p.id] = true;
  if (r.photos && typeof r.photos === 'object') for (const p of BASE_PRODUCTS) if (ver(r.photos[p.id])) out.photos[p.id] = ver(r.photos[p.id]);
  if (Array.isArray(r.order)) out.order = [...new Set(r.order.map(String).filter((id) => /^[a-z0-9-]{1,40}$/.test(id)))].slice(0, 80);
  if (Array.isArray(r.ribbonColors)) out.ribbonColors = [...new Set(r.ribbonColors.map((x) => str(x, 30)).filter(Boolean))].slice(0, 20);
  return out;
}
// menu order: the owner's saved order, with anything not in it kept in its usual place
// (new cookies go before the Sampler, new bars at the end)
export function productOrder(s) {
  const ids = BASE_PRODUCTS.map((p) => p.id);
  for (const x of s.extraProducts || []) { const at = x.category === 'cookies' ? BASE_PRODUCTS.findIndex((p) => p.sampler) : -1; const j = at < 0 ? ids.length : ids.indexOf(BASE_PRODUCTS[at].id); ids.splice(j, 0, x.id); }
  const out = (s.order || []).filter((id) => ids.includes(id));
  if (!out.length) return ids;
  ids.forEach((id, i) => { if (out.includes(id)) return; const prev = ids.slice(0, i).reverse().find((x) => out.includes(x)); out.splice(prev ? out.indexOf(prev) + 1 : 0, 0, id); });
  return out;
}
export function applySettings(raw) {
  const s = cleanSettings(raw);
  for (const k of settingsKeys) if (k !== 'soldOut') SHOP[k] = s[k];
  for (const p of BASE_PRODUCTS) {
    p.soldOut = !!s.soldOut[p.id]; for (const v of p.variants) v.price = s.prices[p.id][v.id]; p.badge = s.badges[p.id] || null;
    const t = BASE_TEXT[p.id]; p.name = s.names[p.id] || t.name; if (s.descs[p.id]) { p.short = p.desc = s.descs[p.id]; } else { p.short = t.short; p.desc = t.desc; }
    p.hidden = !!s.hidden[p.id];
    p.photo = s.photos[p.id] ? `/api/pimg?id=${p.id}&v=${s.photos[p.id]}` : null; // owner's own photo replaces the built-in one
  }
  const all = Object.fromEntries(BASE_PRODUCTS.map((p) => [p.id, p]));
  for (const x of s.extraProducts) {
    const cp = { id: x.id, name: x.name, category: x.category, custom: true, soldOut: x.soldOut, badge: x.badge || null, short: x.desc, desc: x.desc,
      variants: x.price8 ? [{ id: '4', label: 'Box of 4', price: x.price4 }, { id: '8', label: 'Box of 8', price: x.price8 }] : [{ id: 'box', label: 'Per box', price: x.price4 }],
      hidden: x.hidden, img: null, photo: x.photo ? `/api/pimg?id=${x.id}&v=${x.photo}` : null, art: x.category === 'bars' ? 'biscoff' : 'butter', gallery: [], tone: '#b47a3e' };
    all[x.id] = cp;
  }
  // menu order (owner can move products up/down); hidden products are left off the menu entirely
  PRODUCTS.length = 0; PRODUCTS.push(...productOrder(s).map((id) => all[id]).filter((p) => p && !p.hidden));
  ADDONS.wrap.price['4'] = s.addonPrices.wrap4; ADDONS.wrap.price['8'] = s.addonPrices.wrap8; ADDONS.ribbon.price = s.addonPrices.ribbon;
  return s;
}
export function nextOpenDates(fromDs, count = 6, maxLook = 60) {
  const out = [];
  for (let i = 0; i < maxLook && out.length < count; i++) { const d = addDays(fromDs, i); if (!isClosedDate(d)) out.push(d); }
  return out;
}
export const findZone = (id) => SHOP.deliveryZones.find((z) => z.id === id);
export const zoneText = (z) => (!z ? '' : z.min == null ? 'We\'ll quote you' : `${peso(z.min)}–${peso(z.max)}`);

export const canWrap = (p, v) => !!p && p.category === 'cookies' && ADDONS.wrap.price[v?.id] != null;
export function addonPrice(p, v, a = {}) {
  let x = 0;
  if (a.wrap && canWrap(p, v)) x += ADDONS.wrap.price[v.id];
  if (a.ribbon != null && a.ribbon !== false) x += ADDONS.ribbon.price;
  return x;
}
export function addonText(p, v, a = {}) {
  const t = [];
  if (a.wrap && canWrap(p, v)) t.push(ADDONS.wrap.label);
  if (a.ribbon != null && a.ribbon !== false) t.push(`Ribbon (${a.ribbon || 'our choice'})`);
  return t.join(' · ');
}

export const MAX_TIP = 5000;
export const cleanTip = (v) => { const n = Math.round(Number(v)); return SHOP.tips?.enabled && Number.isFinite(n) && n > 0 ? Math.min(MAX_TIP, n) : 0; };
