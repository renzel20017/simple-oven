import { SHOP, PRODUCTS, CATEGORIES, findProduct, findVariant, fromPrice, peso, addDays, isClosedDate, nextOpenDates, findZone, zoneText, earliestDate, latestDate, applySettings, cleanSettings, defaultSettings, manilaNow, weekdayOf, mustPayFirst, paymentReady, PAY_FIELDS, ADDONS, canWrap, addonPrice, addonText, cleanTip, BASE_PRODUCTS, BASE_TEXT, productOrder } from './products.js';
import { cookieSVG, barSVG } from './cookies.js';
try { const c = JSON.parse(localStorage.getItem('so_settings') || 'null'); if (c && !window.SO_DEMO) applySettings(c); } catch {}

/* ───────────────────────── helpers ───────────────────────── */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const app = $('#app');
// Design option: 'paper' (A), 'night' (B) or 'sticker' (C). Set SHOP.design in products.js, or try ?design=night in the address bar.
const DESIGNS = ['paper', 'night', 'sticker'];
const DESIGN = [new URLSearchParams(location.search).get('design'), window.SO_DESIGN, SHOP.design].find((d) => DESIGNS.includes(d)) || 'paper';
document.documentElement.dataset.design = DESIGN;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(pointer: fine)').matches;
const img = (k, sm) => `/assets/img/${k}${sm ? '-sm' : ''}.webp`;
const cut = (k) => `/assets/cut/${k}.webp`;
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};
const sstore = {
  get(k, d) { try { const v = sessionStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

/* ───────────────────────── illustrated art (no photo yet) ───────────────────────── */
function artSVG(kind) {
  const chips = (fill, n = 9, seed = 1) => Array.from({ length: n }, (_, i) => {
    const a = i * 2.39996 + seed, r = 12 + 52 * Math.sqrt((i + .5) / n);
    const x = 100 + Math.cos(a) * r, y = 100 + Math.sin(a) * r;
    return `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${5 + (i % 3)}" ry="${4 + (i % 2)}" fill="${fill}" transform="rotate(${i * 33} ${x.toFixed(1)} ${y.toFixed(1)})"/>`;
  }).join('');
  const sprinkles = Array.from({ length: 34 }, (_, i) => {
    const a = i * 2.39996, r = 8 + 58 * Math.sqrt((i + .5) / 34);
    const x = 100 + Math.cos(a) * r, y = 100 + Math.sin(a) * r;
    const c = ['#e46b8f', '#f2c14e', '#5bb4d8', '#7ccf8a', '#b689e0', '#fff'][i % 6];
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="10" height="3.4" rx="1.7" fill="${c}" transform="rotate(${i * 47} ${x.toFixed(1)} ${y.toFixed(1)})"/>`;
  }).join('');
  const base = { sprinkle: ['#f0d4a8', '#d9ac72'], butter: ['#e8c48e', '#c4884a'], biscoff: ['#d9a061', '#a8662c'] }[kind] || ['#e0b47a', '#b07a3e'];
  const extra = kind === 'sprinkle' ? sprinkles + chips('#fff8ec', 6, 3)
    : kind === 'butter' ? chips('#fff6e6', 10, 2) + `<path d="M62 86c20-10 52-6 74 6" stroke="#9a5e28" stroke-width="5" fill="none" stroke-linecap="round" opacity=".55"/><path d="M70 122c22 8 44 6 62-6" stroke="#9a5e28" stroke-width="5" fill="none" stroke-linecap="round" opacity=".55"/>`
    : `<rect x="38" y="52" width="124" height="96" rx="10" fill="${base[1]}"/><path d="M38 96h124" stroke="#7a4518" stroke-width="16" opacity=".75"/>` + chips('#f6dcb0', 12, 5);
  const shape = kind === 'biscoff' ? '' : `<path d="M100 22c22 0 30 8 44 14s26 22 30 40-4 34-6 48-14 30-30 38-28 14-44 12-30-4-44-14-24-24-28-40-4-34 2-50 18-30 32-38 26-10 44-10Z" fill="url(#g${kind})"/><path d="M100 22c22 0 30 8 44 14s26 22 30 40-4 34-6 48-14 30-30 38-28 14-44 12-30-4-44-14-24-24-28-40-4-34 2-50 18-30 32-38 26-10 44-10Z" fill="none" stroke="${base[1]}" stroke-width="3" opacity=".6"/>`;
  return `<svg viewBox="0 0 200 200" aria-hidden="true"><defs><radialGradient id="g${kind}" cx=".42" cy=".38" r=".7"><stop offset="0" stop-color="${base[0]}"/><stop offset="1" stop-color="${base[1]}"/></radialGradient></defs>${shape}${extra}</svg>`;
}

function media(p, { sm = true, cls = 'photo', eager = false } = {}) {
  if (p.sampler && !p.img) return `<div class="collage"><img src="${cut('brownbutter-stack')}" alt="" loading="lazy"><img src="${cut('redvelvet-stack')}" alt="" loading="lazy"></div>`;
  if (p.photo) return `<img class="${cls}" src="${esc(p.photo)}" alt="${esc(p.name)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;
  if (p.img) return `<img class="${cls}" src="${img(p.img, sm)}" alt="${esc(p.name)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;
  return `<div class="art" role="img" aria-label="${esc(p.name)} illustration">${artSVG(p.art)}<span class="art__note">Photo soon</span></div>`;
}

/* ───────────────────────── cart ───────────────────────── */
const sameLine = (a, b) => a.pid === b.pid && a.vid === b.vid && !!a.wrap === !!b.wrap && (a.ribbon ?? null) === (b.ribbon ?? null);
const cart = {
  items: store.get('so_cart', []).filter((i) => findVariant(findProduct(i.pid), i.vid) && !findProduct(i.pid).soldOut),
  save() { store.set('so_cart', this.items); updateCount(); },
  add(pid, vid, qty = 1) {
    const it = this.items.find((i) => sameLine(i, { pid, vid }));
    if (it) it.qty = Math.min(SHOP.maxQtyPerItem, it.qty + qty);
    else this.items.push({ pid, vid, qty: Math.min(SHOP.maxQtyPerItem, qty), wrap: false, ribbon: null });
    this.save();
  },
  setAt(idx, qty) {
    const it = this.items[idx]; if (!it) return;
    if (qty <= 0) this.items.splice(idx, 1); else it.qty = Math.min(SHOP.maxQtyPerItem, qty);
    this.save();
  },
  setAddons(idx, a) { // change add-ons on one line, merging with an identical line if there is one
    const it = this.items[idx]; if (!it) return;
    Object.assign(it, a);
    const twin = this.items.findIndex((x, k) => k !== idx && sameLine(x, it));
    if (twin >= 0) { this.items[twin].qty = Math.min(SHOP.maxQtyPerItem, this.items[twin].qty + it.qty); this.items.splice(idx, 1); }
    this.save();
  },
  clear() { this.items = []; this.save(); },
  lines() {
    return this.items.map((i, idx) => {
      const p = findProduct(i.pid), v = findVariant(p, i.vid), unit = v.price + addonPrice(p, v, i);
      return { ...i, idx, p, v, unit, extra: addonText(p, v, i), total: unit * i.qty };
    });
  },
  count() { return this.items.reduce((s, i) => s + i.qty, 0); },
  subtotal() { return this.lines().reduce((s, l) => s + l.total, 0); },
};

function updateCount(bump) {
  const c = cart.count();
  $('#cartCount').textContent = c;
  $('#cartBtn').setAttribute('aria-label', `Open cart, ${c} item${c === 1 ? '' : 's'}`);
  if (bump) { const b = $('#cartBtn'); b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); }
  if (!$('#drawer').hidden) renderDrawer();
}

function addToCart(pid, vid, qty, fromEl) {
  if (findProduct(pid)?.soldOut) { toast('Sorry, that one is sold out right now.'); return; }
  cart.add(pid, vid, qty);
  { const p = findProduct(pid), v = findVariant(p, vid); lastAddedKey = { key: pid + ':' + vid, n: p.category === 'bars' ? qty : (parseInt(v.id, 10) || 1) * qty }; clearTimeout(addedT); addedT = setTimeout(() => (lastAddedKey = null), 2500); }
  const p = findProduct(pid), v = findVariant(p, vid);
  const go = () => { updateCount(true); boxPeek(); toast(`Added ${qty > 1 ? qty + ' × ' : ''}${p.name} · ${v.label}`, 'View cart', openDrawer); };
  if (fromEl && !reduceMotion) flyTo(fromEl, p, go); else go();
}

function flyTo(fromEl, p, done) {
  const a = fromEl.getBoundingClientRect(), b = $('#cartBtn').getBoundingClientRect();
  const el = document.createElement('div');
  el.className = 'fly';
  el.innerHTML = tokenArt(p.sampler ? 'brown-butter' : p.id);
  
  document.body.appendChild(el);
  const sx = a.left + a.width / 2 - 35, sy = a.top + a.height / 2 - 35, ex = b.left + b.width / 2 - 35, ey = b.top + b.height / 2 - 35;
  el.animate([
    { transform: `translate(${sx}px,${sy}px) scale(.6)`, opacity: 0 },
    { transform: `translate(${(sx + ex) / 2}px,${Math.min(sy, ey) - 120}px) scale(1) rotate(-20deg)`, opacity: 1, offset: .5 },
    { transform: `translate(${ex}px,${ey}px) scale(.25) rotate(20deg)`, opacity: .4 },
  ], { duration: 750, easing: 'cubic-bezier(.5,0,.3,1)' }).onfinish = () => { el.remove(); done(); };
}


/* ───────────────────────── the cookie box (cart visual) ───────────────────────── */
const TOKEN_PHOTOS = ['brown-butter', 'white-choco-oreo', 'birthday-bomb', 'red-velvet', 'dark-chocolate-revel', 'biscoff-revel'];
const tokenArt = (pid) => { const p = findProduct(pid); return p?.photo && !TOKEN_PHOTOS.includes(pid) ? `<img class="tok__photo" src="${esc(p.photo)}" alt="" loading="lazy">` : tokenArt0(pid); };
const tokenArt0 = (pid) => (TOKEN_PHOTOS.includes(pid) ? `<img src="${cut('tok-' + pid)}" alt="" loading="lazy" decoding="async">` : findProduct(pid)?.category === 'bars' ? barSVG(pid) : cookieSVG(pid)); // real photos of the cookies
const SAMPLER_MIX = ['brown-butter', 'white-choco-oreo', 'birthday-bomb', 'red-velvet'];
function tokenHTML(pid, i, isNew) {
  const p = findProduct(pid);
  const bar = p?.category === 'bars';
  const inner = tokenArt(pid);
  return `<span class="tok${bar ? ' tok--bar' : ''}${isNew ? ' tok--new' : ''}" style="--i:${i};--r:${((i * 47) % 30) - 15}deg" title="${esc(p?.name || '')}">${inner}</span>`;
}
let lastAddedKey = null, addedT;
function boxPieces() { // one token per cookie (box of 4 = 4 cookies); bars = 1 token per box
  const out = [];
  for (const l of cart.lines()) {
    const n = l.p.category === 'bars' ? l.qty : (parseInt(l.v.id, 10) || 1) * l.qty;
    for (let k = 0; k < n; k++) out.push({ pid: l.p.sampler ? SAMPLER_MIX[k % 4] : l.p.id, key: l.p.id + ':' + l.v.id, k, n });
  }
  return out;
}
function boxMood(cookies, bars) {
  if (!cookies && !bars) return 'Your box is empty. Let’s fill it!';
  if (cookies + bars <= 4) return 'A good start! 🍪';
  if (cookies + bars <= 8) return 'Ooh, that’s a nice little box.';
  if (cookies + bars <= 16) return 'Now we’re talking. Sharing… maybe?';
  return 'That’s a party box! 🎉';
}
// satin bow for the tied box (two loops, knot and tails with soft shading)
const satinBow = `<svg viewBox="0 0 120 96" aria-hidden="true"><defs>
  <linearGradient id="sbL" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3a0f13"/><stop offset=".28" stop-color="#6a2229"/><stop offset=".42" stop-color="#c47680"/><stop offset=".5" stop-color="#8e3c44"/><stop offset=".75" stop-color="#521a1f"/><stop offset="1" stop-color="#2e0b0e"/></linearGradient>
  <linearGradient id="sbR" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a0f13"/><stop offset=".28" stop-color="#6a2229"/><stop offset=".42" stop-color="#c47680"/><stop offset=".5" stop-color="#8e3c44"/><stop offset=".75" stop-color="#521a1f"/><stop offset="1" stop-color="#2e0b0e"/></linearGradient>
  <linearGradient id="sbT" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2e0b0e"/><stop offset=".35" stop-color="#6a2229"/><stop offset=".5" stop-color="#b0606a"/><stop offset=".65" stop-color="#6a2229"/><stop offset="1" stop-color="#2e0b0e"/></linearGradient>
  <radialGradient id="sbK" cx=".38" cy=".3" r=".75"><stop offset="0" stop-color="#d68a94"/><stop offset=".35" stop-color="#8e3c44"/><stop offset="1" stop-color="#2e0b0e"/></radialGradient></defs>
  <path d="M56 50 C40 70 30 84 26 94 L38 90 L42 96 C48 82 54 66 60 54Z" fill="url(#sbT)"/>
  <path d="M64 50 C80 70 92 82 98 92 L86 90 L84 96 C76 82 68 66 60 54Z" fill="url(#sbT)"/>
  <path d="M58 46 C44 22 14 14 8 30 C2 46 26 60 58 52Z" fill="url(#sbL)"/>
  <path d="M62 46 C76 22 106 14 112 30 C118 46 94 60 62 52Z" fill="url(#sbR)"/>
  <path d="M56 47 C42 34 24 28 16 33" fill="none" stroke="#f0b5bc" stroke-width="1.6" stroke-linecap="round" opacity=".55"/>
  <path d="M64 47 C78 34 96 28 104 33" fill="none" stroke="#f0b5bc" stroke-width="1.6" stroke-linecap="round" opacity=".55"/>
  <path d="M50 52 C36 56 22 52 14 42" fill="none" stroke="#2a0a0d" stroke-width="1.4" opacity=".45"/>
  <path d="M70 52 C84 56 98 52 106 42" fill="none" stroke="#2a0a0d" stroke-width="1.4" opacity=".45"/>
  <ellipse cx="60" cy="49" rx="9.5" ry="8.5" fill="url(#sbK)"/>
  <path d="M54.5 45 C58 42.5 62 42.5 65.5 45" fill="none" stroke="#f3c0c6" stroke-width="1.4" stroke-linecap="round" opacity=".75"/>
</svg>`;
function bakeBoxHTML({ closed = false, tag = '' } = {}) {
  const pieces = boxPieces();
  const shown = pieces.slice(0, 16), extra = pieces.length - shown.length;
  const cookies = pieces.filter((p) => findProduct(p.pid)?.category !== 'bars').length, bars = pieces.length - cookies;
  const fresh = lastAddedKey;
  const newIdx = new Set(pieces.map((p, i) => (fresh && p.key === fresh.key && p.k >= p.n - fresh.n ? i : -1)));
  return `<div class="bakebox${closed ? ' is-closed is-tied' : ''}${pieces.length || closed ? '' : ' is-empty'}" aria-label="Your box: ${cookies} cookie${cookies === 1 ? '' : 's'}${bars ? `, ${bars} box${bars === 1 ? '' : 'es'} of bars` : ''}">
    <div class="bakebox__lid"><img class="bakebox__logo" src="/assets/img/logo.png" alt=""></div>
    <div class="bakebox__body">
      <div class="bakebox__tray">${shown.map((p, i) => tokenHTML(p.pid, i, newIdx.has(i))).join('')}${extra > 0 ? `<span class="tok tok--more">+${extra}</span>` : ''}${!pieces.length ? '<span class="bakebox__hint">your cookies go here</span>' : ''}</div>
      <div class="bakebox__front"><span>${esc(tag || boxMood(cookies, bars))}</span></div>
    </div>
    <div class="bakebox__ribbon" aria-hidden="true"><i></i><u></u><b><img src="/assets/cut/bow.webp" alt=""></b>${tag ? `<em class="bakebox__tag">${esc(tag)} ♡</em>` : ''}</div>
  </div>`;
}

// a little box pops out under the cart button and the new cookies drop in
let peekT;
function boxPeek() {
  if (!$('#drawer').hidden) return;
  let pk = $('#boxPeek');
  if (!pk) { pk = document.createElement('div'); pk.id = 'boxPeek'; pk.className = 'peek'; pk.setAttribute('aria-hidden', 'true'); document.body.appendChild(pk); pk.addEventListener('click', () => { pk.classList.remove('show'); openDrawer(); }); }
  pk.innerHTML = bakeBoxHTML();
  pk.classList.remove('show'); void pk.offsetWidth; pk.classList.add('show');
  clearTimeout(peekT); peekT = setTimeout(() => pk.classList.remove('show'), 2600);
}

/* ───────────────────────── toast ───────────────────────── */
let toastT;
function toast(msg, action, fn) {
  const t = $('#toast');
  t.innerHTML = `<span>${esc(msg)}</span>${action ? `<button type="button">${esc(action)}</button>` : ''}`;
  if (action) t.querySelector('button').onclick = () => { t.classList.remove('show'); fn(); };
  t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 3800);
}

/* ───────────────────────── drawer ───────────────────────── */
let lastFocus;
function openDrawer() {
  $('#boxPeek')?.classList.remove('show');
  const d = $('#drawer');
  lastFocus = document.activeElement;
  renderDrawer();
  d.hidden = false; d.classList.remove('closing');
  document.body.style.overflow = 'hidden';
  setTimeout(() => $('.drawer__head .iconbtn').focus(), 50);
}
function closeDrawer() {
  const d = $('#drawer');
  if (d.hidden) return;
  d.classList.add('closing');
  setTimeout(() => { d.hidden = true; d.classList.remove('closing'); document.body.style.overflow = ''; lastFocus?.focus?.(); }, reduceMotion ? 0 : 280);
}
function lineHTML(l) {
  const colors = SHOP.ribbonColors || [];
  const wrapOk = canWrap(l.p, l.v), hasRibbon = l.ribbon != null;
  return `<li class="line">
    <a class="line__img" href="#/product/${l.p.id}" tabindex="-1" aria-hidden="true">${media(l.p)}</a>
    <div>
      <a class="line__name" href="#/product/${l.p.id}">${esc(l.p.name)}</a>
      <div class="line__var">${esc(l.v.label)} · ${peso(l.unit)}</div>
      <div class="line__ctrl">
        <div class="qty qty--sm" role="group" aria-label="Quantity for ${esc(l.p.name)}">
          <button type="button" data-q="-1" data-i="${l.idx}" aria-label="Remove one">−</button>
          <output aria-live="polite">${l.qty}</output>
          <button type="button" data-q="1" data-i="${l.idx}" aria-label="Add one">+</button>
        </div>
        <button type="button" class="line__rm" data-rm data-i="${l.idx}">Remove</button>
      </div>
      <div class="addons" role="group" aria-label="Add-ons for ${esc(l.p.name)}">
        ${wrapOk ? `<label class="addon"><input type="checkbox" data-addon="wrap" data-i="${l.idx}" ${l.wrap ? 'checked' : ''}><span>Individually packed <b>+${peso(ADDONS.wrap.price[l.v.id])}</b></span></label>` : ''}
        <label class="addon"><input type="checkbox" data-addon="ribbon" data-i="${l.idx}" ${hasRibbon ? 'checked' : ''}><span>Ribbon <b>+${peso(ADDONS.ribbon.price)}</b></span></label>
        ${hasRibbon && colors.length ? `<select class="addon__color" data-addon="color" data-i="${l.idx}" aria-label="Ribbon color">${[''].concat(colors).map((c) => `<option value="${esc(c)}" ${c === (l.ribbon || '') ? 'selected' : ''}>${c ? esc(c) : 'Any color'}</option>`).join('')}</select>` : ''}
      </div>
    </div>
    <div class="line__total">${peso(l.total)}</div>
  </li>`;
}
const emptySVG = `<svg viewBox="0 0 120 90" aria-hidden="true"><path d="M10 40h100l-8 44H18z" fill="#c99a5b"/><path d="M10 40h100" stroke="#8e6438" stroke-width="3"/><path d="M14 40 4 22h112l-10 18" fill="#e1c49a"/><circle cx="60" cy="18" r="13" fill="#d9ac72"/><circle cx="55" cy="15" r="2.6" fill="#3b2418"/><circle cx="64" cy="21" r="2.4" fill="#3b2418"/></svg>`;
function renderDrawer() {
  const body = $('#drawerBody');
  if (!cart.items.length) {
    body.innerHTML = `<div class="empty">${bakeBoxHTML()}<p>Fill it with something warm and gooey.</p><a class="btn" href="#/shop" data-close>Browse the menu</a></div>`;
    return;
  }
  body.innerHTML = `<div class="drawer__box">${bakeBoxHTML()}</div><ul class="lines">${cart.lines().map(lineHTML).join('')}</ul>
    <div class="drawer__foot">
      <div class="sumrow sumrow--big"><span>Subtotal</span><span>${peso(cart.subtotal())}</span></div>
      <p class="fine">Pick-up is at ${esc(SHOP.pickup.place)}, ${esc(SHOP.pickup.city)}. If you'd like it delivered, you're welcome to send your own rider to collect it.</p>
      <a class="btn btn--block" href="#/checkout" data-close>Checkout <span class="arrow">→</span></a>
      <a class="btn btn--ghost btn--block" href="#/cart" data-close>View full cart</a>
    </div>`;
}

document.addEventListener('change', (e) => {
  const a = e.target.closest('[data-addon]'); if (!a) return;
  const idx = +a.dataset.i, it = cart.items[idx]; if (!it) return;
  if (a.dataset.addon === 'wrap') cart.setAddons(idx, { wrap: a.checked });
  else if (a.dataset.addon === 'ribbon') cart.setAddons(idx, { ribbon: a.checked ? '' : null });
  else cart.setAddons(idx, { ribbon: a.value });
  refreshCartViews();
});
document.addEventListener('click', (e) => {
  const q = e.target.closest('[data-q]');
  if (q) {
    const it = cart.items[+q.dataset.i];
    if (it) { cart.setAt(+q.dataset.i, it.qty + Number(q.dataset.q)); refreshCartViews(); }
    return;
  }
  const rm = e.target.closest('[data-rm]');
  if (rm) { cart.setAt(+rm.dataset.i, 0); refreshCartViews(); return; }
  if (e.target.closest('[data-close]')) closeDrawer();
  const sz = e.target.closest('[data-size]');
  if (sz) {
    const card = sz.closest('.card');
    $$('[data-size]', card).forEach((b) => { const on = b === sz; b.classList.toggle('is-on', on); b.setAttribute('aria-checked', on); });
    const add = $('[data-add]', card); add.dataset.vid = sz.dataset.size;
    add.setAttribute('aria-label', `Add ${card.querySelector('.card__name').textContent}, ${sz.dataset.label}, to cart`);
    const out = $('[data-price-out]', card); out.textContent = peso(Number(sz.dataset.price));
    out.animate([{ transform: 'scale(1.15)' }, { transform: 'none' }], { duration: 300 });
    return;
  }
  const add = e.target.closest('[data-add]');
  if (add) { e.preventDefault(); addToCart(add.dataset.add, add.dataset.vid, 1, add); }
});
$('#cartBtn').addEventListener('click', openDrawer);
document.addEventListener('keydown', (e) => {
  const d = $('#drawer');
  if (d.hidden) return;
  if (e.key === 'Escape') closeDrawer();
  if (e.key === 'Tab') { // focus trap
    const f = $$('a[href],button,input', d).filter((x) => x.offsetParent);
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f.at(-1).focus(); }
    else if (!e.shiftKey && document.activeElement === f.at(-1)) { e.preventDefault(); f[0].focus(); }
  }
});
function refreshCartViews() {
  if (!$('#drawer').hidden) renderDrawer();
  const r = location.hash;
  if (r.startsWith('#/cart')) renderCart();
  if (r.startsWith('#/checkout')) refreshReceipt();
}

/* ───────────────────────── card ───────────────────────── */
function cardHTML(p, i = 0, wideArg = false) {
  const wide = wideArg === true; // (Array.map passes the array as 3rd argument)
  const v0 = p.variants[0];
  const so = p.soldOut;
  const multi = p.variants.length > 1;
  return `<article class="card rv${wide ? ' card--wide' : ''}${so ? ' card--soldout' : ''}" style="--d:${(i % 4) * 80}ms" ${wide ? '' : 'data-tilt'}>
    <a class="card__media${so ? ' is-soldout' : ''}" href="#/product/${p.id}" tabindex="-1" aria-hidden="true">${so ? '<span class="card__badge card__badge--out">Sold out</span>' : p.badge ? `<span class="card__badge">${esc(p.badge)}</span>` : ''}${media(p)}</a>
    <div class="card__body">
      <h3 class="card__name"><a href="#/product/${p.id}">${esc(p.name)}</a></h3>
      <p class="card__short">${esc(p.short)}</p>
      ${wide && p.sampler ? `<p class="card__mix">1 of each: ${SAMPLER_MIX.map((id) => esc((findProduct(id)?.name || '').replace(' Chocolate Chip', '').replace(' Cream Cheese', ''))).join(' · ')}</p>` : ''}
      ${multi ? `<div class="sizes" role="radiogroup" aria-label="Box size for ${esc(p.name)}">${p.variants.map((v, k) => `<button type="button" role="radio" aria-checked="${k ? 'false' : 'true'}" class="${k ? '' : 'is-on'}" data-size="${v.id}" ${so ? 'disabled' : ''} data-price="${v.price}" data-label="${esc(v.label)}"><b>${esc(v.label.split(' (')[0].replace('Box of ', ''))} pcs</b><span>${peso(v.price)}</span></button>`).join('')}</div>` : ''}
      <div class="card__foot">
        <span class="price" data-price-out>${peso(v0.price)}${multi ? '' : ' <small>per box</small>'}</span>
        ${so ? '<button class="card__add" type="button" disabled>Sold out</button>' : `<button class="card__add" type="button" data-add="${p.id}" data-vid="${v0.id}" aria-label="Add ${esc(p.name)}, ${esc(v0.label)}, to cart">+ Add to cart</button>`}
      </div>
    </div>
  </article>`;
}

/* ───────────────────────── views ───────────────────────── */
const bowSVG = `<svg viewBox="0 0 120 90" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M60 38c-10-14-34-30-44-20s6 30 44 20Z"/><path d="M60 38c10-14 34-30 44-20s-6 30-44 20Z"/><path d="M57 40c-6 14-16 30-24 44"/><path d="M63 40c6 14 14 28 26 42"/><circle cx="60" cy="38" r="4" fill="currentColor"/></svg>`;


// One hero cookie being dunked in milk: 3D cookie (stacked edge layers), milk crown behind
// AND in front (so the cookie looks dipped), droplets/crumbs at three depths.
function soloScene() {
  const fx = (list) => list.map(([k, x, y, w, blur, d]) => `<img class="fx" src="${cut(k)}" alt="" style="left:${x}%;top:${y}%;width:${w}%;--blur:${blur}px;--d:${d}s">`).join('');
  const layers = Array.from({ length: 5 }, (_, i) => `<img class="coin__edge" src="${cut('solo-edge')}" alt="" style="--z:${-(i + 1) * 2}px">`).join('');
  return `
          <div class="float solo__cookie" data-depth="60"><div class="solo__drop"><div class="coin" id="coin">${layers}<img class="coin__top" src="${cut('solo-cookie')}" alt="" width="1100" height="815" fetchpriority="high"><span class="coin__shine" id="coinShine"></span></div></div></div>
`;
}

function heroPaper() {
  return `  <section class="hero">
    <div class="wrap hero__grid">
      <div class="hero__copy">
        <p class="eyebrow">Home-baked · made to order</p>
        <h1 class="sr">Simple Oven: home-baked cookies and revel bars</h1>
        <div class="hero__cta">
          <a class="btn" href="#/shop">Order a box <span class="arrow">→</span></a>
          <a class="btn btn--ghost" href="#/how">How it works</a>
        </div>
      </div>
      <div class="stage stage--solo" id="stage">
        <div class="stage__sheet" aria-hidden="true"><img src="/assets/tex/paper-note.webp" alt=""></div>
        <div class="stage__inner" id="stageInner" aria-hidden="true">
${soloScene()}
        </div>
        <button class="stage__tap" type="button" id="crumbleBtn">tap me ✺</button>
      </div>
    </div>
  </section>`;
}

function heroNight() {
  const chip = (id, cls, depth) => { const p = findProduct(id); if (!p) return ''; return `<a class="nchip ${cls} float" data-depth="${depth}" href="#/product/${p.id}"><b>${esc(p.name.replace(' Revel Bars', ' Revel'))}</b><span>from ${peso(fromPrice(p))}</span></a>`; };
  return `<section class="hero hero--night">
    <div class="wrap night__copy">
      <p class="eyebrow">simple oven · home-baked goods</p>
      <h1 class="h1 hero__title"><span class="ln"><span style="--i:0">Golden edges.</span></span><span class="ln"><span style="--i:1"><em>Molten</em> middles.</span></span></h1>
      <p class="lead">Thick, chunky cookies and fudgy revel bars, baked to order in small batches.</p>
      <div class="hero__cta"><a class="btn" href="#/shop">Order a box <span class="arrow">→</span></a><a class="btn btn--ghost" href="#/how">How it works</a></div>
    </div>
    <div class="stage stage--night" id="stage">
      <div class="stage__inner" id="stageInner">
        <div class="night__glow" aria-hidden="true"></div>
        <div class="night__orbit" aria-hidden="true"></div>
        <div class="float night__b" data-depth="40" aria-hidden="true"><img src="${cut('redvelvet-stack')}" alt="" width="900" height="563"></div>
        <div class="float night__milk" data-depth="60" aria-hidden="true"><img src="${cut('milk-splash')}" alt="" width="1505" height="660"></div>
        <div class="float night__a" data-depth="100" aria-hidden="true"><img src="${cut('brownbutter-half')}" alt="" width="900" height="675" fetchpriority="high"></div>
        <div class="float night__c" data-depth="150" aria-hidden="true"><img src="${cut('revel')}" alt="" width="542" height="383"></div>
        ${chip('brown-butter', 'nchip--1', 170)}${chip('red-velvet', 'nchip--2', 120)}${chip('dark-chocolate-revel', 'nchip--3', 190)}
      </div>
    </div>
  </section>`;
}

function heroSticker() {
  return `<section class="hero hero--sticker">
    <div class="wrap sticker__grid">
      <div class="sticker__copy">
        <p class="eyebrow">home-baked goods · made to order</p>
        <h1 class="mega"><span class="ln"><span style="--i:0">cookies</span></span><span class="ln"><span style="--i:1">worth the</span></span><span class="ln"><span style="--i:2"><mark>crumbs.</mark></span></span></h1>
        <p class="lead">Big, gooey cookies and revel bars, baked fresh in small batches. Pick a box, pick a day, we bake.</p>
        <div class="hero__cta"><a class="btn" href="#/shop">Order a box <span class="arrow">→</span></a><a class="btn btn--ghost" href="#/how">How it works</a></div>
      </div>
      <div class="board" id="board" aria-label="Sticker board: drag the cookies around">
        <div class="stk stk--a" data-drag style="--r:-6deg"><img src="${cut('brownbutter-stack')}" alt="Brown Butter cookies" draggable="false"></div>
        <div class="stk stk--b" data-drag style="--r:8deg"><img src="${cut('redvelvet-stack')}" alt="Red Velvet cookies" draggable="false"></div>
        <div class="stk stk--c" data-drag style="--r:-10deg"><img src="${cut('revel')}" alt="Dark Chocolate Revel Bar" draggable="false"></div>
        <div class="stk stk--price" data-drag style="--r:6deg"><b>${peso(Math.min(...PRODUCTS.map(fromPrice)))}</b><span>boxes from</span></div>
        <div class="stk stk--burst" data-drag style="--r:-12deg" aria-hidden="true"><svg viewBox="0 0 100 100"><path d="M50 2l8 14 15-7 2 16 16 2-7 15 14 8-14 8 7 15-16 2-2 16-15-7-8 14-8-14-15 7-2-16-16-2 7-15L2 50l14-8-7-15 16-2 2-16 15 7z"/></svg><span>fresh<br>daily</span></div>
        <p class="board__hint" aria-hidden="true">↖ psst… drag the cookies</p>
      </div>
    </div>
  </section>`;
}

const HEROES = { paper: heroPaper, night: heroNight, sticker: heroSticker };

function viewHome() {
  // the whole menu on the landing page: 4 cookies, the Sampler (wide card) and the revel bars
  const cookies = PRODUCTS.filter((p) => p.category === 'cookies' && !p.sampler), sampler = PRODUCTS.find((p) => p.sampler), bars = PRODUCTS.filter((p) => p.category === 'bars');
  const names = PRODUCTS.map((p) => p.name);
  const tick = [...names, ...names].map((n) => `<span>${esc(n)}</span>`).join('');
  return `<div class="view">
  ${HEROES[DESIGN]()}

  <div class="ticker" aria-hidden="true"><div class="ticker__track">${tick}</div></div>

  <section class="section">
    <div class="wrap">
      <div class="section__head">
        <div><h2 class="eyebrow rv">The menu</h2></div>
      </div>
      <div class="grid grid--menu">${cookies.map((p, i) => cardHTML(p, i)).join('')}${sampler ? cardHTML(sampler, 0, true) : ''}${bars.map((p, i) => cardHTML(p, i + 1)).join('')}</div>
    </div>
  </section>

  <section class="section" id="how">
    <div class="wrap">
      <div class="section__head"><div><h2 class="eyebrow rv">How to order</h2></div></div>
      <div class="steps">
        <div class="note rv"><div class="note__n">1</div><h3>Fill your box</h3><p>Pick your flavors and box size. Mix cookies and revel bars in one order.</p></div>
        <div class="note rv" style="--d:100ms"><div class="note__n">2</div><h3>Tell us when</h3><p>Pick a date to collect at ${esc(SHOP.pickup.place)}, or send your own rider. No account needed.</p></div>
        <div class="note rv" style="--d:200ms"><div class="note__n">3</div><h3>We confirm</h3><p>We'll message you to confirm your order and send payment details. Then we bake!</p></div>
      </div>
    </div>
  </section>

  <section class="section" style="padding-top:0">
    <div class="wrap">
      <div class="section__head"><div><p class="eyebrow rv">Fresh from the oven</p><h2 class="h2 rv" style="--d:80ms">Follow <em>${esc(SHOP.instagramHandle)}</em></h2></div>
      <a class="btn btn--ghost rv" href="${SHOP.instagram}" target="_blank" rel="noopener">Open Instagram <span class="arrow">↗</span></a></div>
      <div class="strip">${['sq-milk', 'sq-rvhand', 'sq-reveltop', 'sq-rack', 'sq-rvplate', 'sq-revelblack'].map((k, i) => `<a class="rv" style="--d:${i * 60}ms" href="${SHOP.instagram}" target="_blank" rel="noopener" aria-label="Simple Oven on Instagram"><img src="${img(k)}" alt="" loading="lazy"></a>`).join('')}</div>
    </div>
  </section>
  </div>`;
}

function viewShop(cat = 'all') {
  const list = PRODUCTS.filter((p) => cat === 'all' || p.category === cat);
  const title = { all: 'Menu', cookies: 'Cookies', bars: 'Bars' }[cat] || 'Menu';
  return `<div class="view wrap">
    <div class="pagehead">
      <p class="eyebrow">Shop</p>
      <h1 class="h2">${title}</h1>
      <nav class="chips" aria-label="Filter products">${CATEGORIES.map((c) => `<a class="chip ${c.id === cat ? 'is-on' : ''}" href="#/shop${c.id === 'all' ? '' : '/' + c.id}" ${c.id === cat ? 'aria-current="page"' : ''}>${c.label}</a>`).join('')}</nav>
    </div>
    <div class="grid" style="padding-bottom:40px">${list.map(cardHTML).join('')}</div>
  </div>`;
}

function viewProduct(id) {
  const p = findProduct(id);
  if (!p) return viewNotFound();
  // gallery as {big, sm} pictures; the owner's uploaded photo (if any) replaces the built-in main photo
  const gal = p.photo ? [{ big: p.photo, sm: p.photo }, ...p.gallery.slice(1).map((k) => ({ big: img(k), sm: img(k, true) }))] : p.gallery.map((k) => ({ big: img(k), sm: img(k, true) }));
  const others = PRODUCTS.filter((x) => x.id !== p.id && x.category === p.category).slice(0, 4);
  return `<div class="view wrap">
    <nav class="crumbs" aria-label="Breadcrumb"><a href="#/shop">Shop</a> / <a href="#/shop/${p.category}">${p.category === 'bars' ? 'Bars' : 'Cookies'}</a> / <span aria-current="page">${esc(p.name)}</span></nav>
    <div class="pd${p.soldOut ? ' pd--soldout' : ''}">
      <div class="gallery">
        <div class="gallery__main" id="galMain">${gal.length ? `<img id="galImg" src="${esc(gal[0].big)}" alt="${esc(p.name)}" fetchpriority="high">` : media(p, { sm: false })}</div>
        ${gal.length > 1 ? `<div class="gallery__thumbs" role="group" aria-label="More photos">${gal.map((g, i) => `<button type="button" class="${i ? '' : 'is-on'}" data-gal="${esc(g.big)}" aria-label="Show photo ${i + 1}"><img src="${esc(g.sm)}" alt="" loading="lazy"></button>`).join('')}</div>` : ''}
      </div>
      <div class="pd__info">
        ${p.badge ? `<p class="eyebrow">${esc(p.badge)}</p>` : '<p class="eyebrow">Simple Oven</p>'}
        <h1 class="h2">${esc(p.name)}</h1>
        <p class="pd__price"><span id="pdPrice">${peso(p.variants[0].price)}</span><small id="pdVar">${esc(p.variants[0].label)}</small></p>
        <p class="pd__desc">${esc(p.desc)}</p>
        <form id="buyForm">
          ${p.variants.length > 1 ? `<span class="label" id="sizeLbl">Choose a box</span>
          <div class="seg" role="radiogroup" aria-labelledby="sizeLbl">${p.variants.map((v, i) => `<label><input type="radio" name="v" value="${v.id}" ${i ? '' : 'checked'}><span><b>${esc(v.label)}</b><i>${peso(v.price)}</i></span></label>`).join('')}</div>` : `<input type="hidden" name="v" value="${p.variants[0].id}">`}
          <span class="label" id="qtyLbl">How many boxes?</span>
          <div class="buyrow">
            <div class="qty" role="group" aria-labelledby="qtyLbl"><button type="button" data-step="-1" aria-label="Fewer">−</button><output id="pdQty" aria-live="polite">1</output><button type="button" data-step="1" aria-label="More">+</button></div>
            <button class="btn" type="submit" id="addBtn" ${p.soldOut ? 'disabled' : ''}>${p.soldOut ? 'Sold out for now' : `Add to cart · <span id="addTotal">${peso(p.variants[0].price)}</span>`}</button>
          </div>
        </form>
        <ul class="perks">
          <li>Baked fresh to order in small batches</li>
          <li>Pick-up at ${esc(SHOP.pickup.place)}, ${esc(SHOP.pickup.city)}, or send your own rider</li>
          <li>Mix cookies and revel bars in one order</li>
        </ul>
      </div>
    </div>
    ${others.length ? `<section style="padding-bottom:40px"><div class="section__head"><h2 class="h3">You might also like</h2></div><div class="grid">${others.map(cardHTML).join('')}</div></section>` : ''}
    <div class="mobilebar" id="mobilebar"><div><b>${esc(p.name)}</b><small id="mbVar">${esc(p.variants[0].label)} · ${peso(p.variants[0].price)}</small></div><button class="btn" type="button" id="mbAdd" ${p.soldOut ? 'disabled' : ''}>${p.soldOut ? 'Sold out' : 'Add to cart'}</button></div>
  </div>`;
}
function bindProduct(id) {
  const p = findProduct(id);
  if (!p) return;
  const form = $('#buyForm');
  let qty = 1;
  const cur = () => findVariant(p, new FormData(form).get('v'));
  const upd = () => {
    const v = cur();
    $('#pdPrice').textContent = peso(v.price);
    $('#pdVar').textContent = v.label;
    $('#pdQty').textContent = qty;
    if ($('#addTotal')) $('#addTotal').textContent = peso(v.price * qty);
    $('#mbVar').textContent = `${v.label} · ${peso(v.price)}`;
  };
  form.addEventListener('change', upd);
  $$('[data-step]', form).forEach((b) => b.addEventListener('click', () => { qty = Math.max(1, Math.min(SHOP.maxQtyPerItem, qty + Number(b.dataset.step))); upd(); }));
  form.addEventListener('submit', (e) => { e.preventDefault(); addToCart(p.id, cur().id, qty, $('#addBtn')); });
  $('#mbAdd').addEventListener('click', (e) => addToCart(p.id, cur().id, qty, e.currentTarget));
  $$('[data-gal]').forEach((b) => b.addEventListener('click', () => {
    const im = $('#galImg');
    im.style.opacity = 0;
    setTimeout(() => { im.src = b.dataset.gal; im.onload = () => (im.style.opacity = 1); }, 180);
    $$('[data-gal]').forEach((x) => x.classList.toggle('is-on', x === b));
  }));
  // tilt main image
  const gm = $('#galMain');
  if (finePointer) {
    gm.addEventListener('pointermove', (e) => {
      const r = gm.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      gm.style.transform = `rotateY(${x * 6}deg) rotateX(${-y * 6}deg)`;
    });
    gm.addEventListener('pointerleave', () => (gm.style.transform = ''));
    gm.style.transition = 'transform .4s var(--ease)';
  }
  // mobile sticky add bar appears once the main button scrolls away
  const mb = $('#mobilebar');
  const io = new IntersectionObserver(([en]) => mb.classList.toggle('show', !en.isIntersecting && en.boundingClientRect.top < 0), { threshold: 0 });
  io.observe($('#addBtn'));
  cleanups.push(() => io.disconnect());
}

function viewCart() {
  return `<div class="view wrap"><div class="pagehead"><p class="eyebrow">Your order</p><h1 class="h2">Your <em>box</em></h1></div><div id="cartPage"></div></div>`;
}
function renderCart() {
  const el = $('#cartPage');
  if (!el) return;
  if (!cart.items.length) {
    el.innerHTML = `<div class="panel empty">${bakeBoxHTML()}<p>Let's fix that.</p><a class="btn" href="#/shop">Browse the menu</a></div>`;
    return;
  }
  el.innerHTML = `<div class="co"><div class="panel" style="padding:8px 0"><div class="drawer__box">${bakeBoxHTML()}</div><ul class="lines">${cart.lines().map(lineHTML).join('')}</ul>
    <div style="padding:16px 22px"><a href="#/shop" class="line__rm" style="font-size:15px">← Keep shopping</a></div></div>
    ${receiptHTML({ cta: true })}</div>`;
}

/* ───────────── receipt (live on checkout, final on thank-you) ───────────── */
function formState() {
  const f = $('#coForm');
  if (!f) return {};
  const d = Object.fromEntries(new FormData(f));
  return { fulfillment: d.fulfillment, zone: findZone(d.zone), gift: d.gift === 'on' ? { to: d.giftTo, hidePrices: d.giftHidePrices === 'on' } : null };
}
function feeRow(fulfillment, zone) {
  if (fulfillment === 'pickup') return ['Pick-up', `at ${esc(SHOP.pickup.place)}`, ''];
  if (!zone) return ['Rider fee', 'Choose your area', ''];
  if (zone.min == null) return ['Rider fee', 'We’ll quote you', ' + rider'];
  return [`Rider fee <small style="color:var(--muted)">(est.)</small>`, zoneText(zone), ` + ${zoneText(zone)} rider`];
}
function receiptHTML({ cta = false, order = null } = {}) {
  const st = order ? { fulfillment: order.fulfillment, zone: order.zone, gift: order.gift } : formState();
  const lines = order ? order.lines : cart.lines().map((l) => ({ name: l.p.name, variant: l.v.label + (l.extra ? ' · ' + l.extra : ''), qty: l.qty, total: l.total }));
  const subtotal = order ? order.subtotal : cart.subtotal();
  const tip = order ? order.tip || 0 : currentTip(), total = subtotal + tip;
  const date = new Date(order?.createdAt || Date.now()).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  const [feeLabel, feeVal, feeTotal] = feeRow(st.fulfillment || 'pickup', st.zone);
  return `<aside class="receipt" id="receipt" aria-label="Order summary">
    <img class="receipt__logo" src="/assets/img/logo.png" alt="Simple Oven">
    <p class="receipt__sub">${order ? 'Order ' + esc(order.orderId) : 'Order summary'} · ${date}</p>
    ${st.gift ? `<p class="receipt__gift">🎁 Gift${st.gift.to ? ' for ' + esc(st.gift.to) : ''}</p>` : ''}
    <hr>
    ${lines.map((l) => `<div class="rline"><span>${l.qty} × ${esc(l.name)}<br><small style="color:var(--muted)">${esc(l.variant)}</small></span><span>${peso(l.total)}</span></div>`).join('')}
    <hr>
    <div class="rline"><span>Subtotal</span><span>${peso(subtotal)}</span></div>
    ${tip ? `<div class="rline"><span>Tip ♡</span><span>${peso(tip)}</span></div>` : ''}
    <div class="rline"><span>${feeLabel}</span><span>${feeVal}</span></div>
    <div class="rline rline--total"><span>Total</span><span>${peso(total)}${feeTotal ? `<small class="rline__extra">${feeTotal}</small>` : ''}</span></div>
    ${cta ? `<a class="btn btn--block" style="margin-top:18px" href="#/checkout">Checkout <span class="arrow">→</span></a>` : ''}
    <p class="receipt__thanks">thank you!</p>
    ${order ? `<p class="receipt__no">Order no. <b>${esc(order.orderId)}</b></p>` : ''}
  </aside>`;
}
function refreshReceipt() { const r = $('#receipt'); if (r) r.outerHTML = receiptHTML(); if (!cart.items.length && location.hash.startsWith('#/checkout')) route(); }

/* ───────────── checkout ───────────── */
const minDate = () => earliestDate();
const maxDate = () => latestDate();
const fmtTime = (hm) => { const [h, m] = hm.split(':').map(Number); return `${h % 12 || 12}${m ? ':' + String(m).padStart(2, '0') : ''}${h < 12 ? 'am' : 'pm'}`; };
const fmtChip = (ds) => { const d = new Date(ds + 'T00:00:00'); return { wd: d.toLocaleDateString('en-PH', { weekday: 'short' }), day: d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) }; };

function viewCheckout() {
  if (!cart.items.length) return viewCart();
  const saved = store.get('so_customer', {});
  const v = (k) => esc(saved[k] || '');
  const dates = nextOpenDates(minDate(), 6).filter((d) => d <= maxDate());
  const closedSoon = SHOP.closedDates.filter((d) => d >= minDate() && d <= addDays(minDate(), 45));
  const leadTxt = SHOP.minLeadDays <= 0 ? '' : SHOP.minLeadDays === 1 ? 'Please order at least 1 day before pick-up' : `Please order at least ${SHOP.minLeadDays} days before pick-up`;
  return `<div class="view wrap">
    <div class="pagehead pagehead--tight"><h1 class="eyebrow">Checkout</h1></div>
    <div class="co">
      <form id="coForm" novalidate>
        <div class="panel">
          <h2><span class="num">1</span>Your details</h2>
          <p class="fine">We'll use these to confirm your order.</p>
          <div class="fields">
            <div class="field field--full"><label for="f-name">Full name</label><input class="input" id="f-name" name="name" autocomplete="name" required maxlength="80" value="${v('name')}"><span class="err" id="e-name"></span></div>
            <div class="field"><label for="f-phone">Mobile number</label><input class="input" id="f-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="09XX XXX XXXX" required maxlength="20" value="${v('phone')}"><span class="err" id="e-phone"></span></div>
            <div class="field"><label for="f-email">Email <span class="opt">(optional)</span></label><input class="input" id="f-email" name="email" type="email" autocomplete="email" maxlength="120" value="${v('email')}"><span class="err" id="e-email"></span></div>
            <div class="field field--full"><label for="f-social">Instagram or Facebook name</label><input class="input" id="f-social" name="social" required maxlength="80" placeholder="@yourname" value="${v('social')}"><span class="hint">So we can message you about your order.</span><span class="err" id="e-social"></span></div>
          </div>
        </div>

        <div class="panel">
          <h2><span class="num">2</span>Pick-up</h2>
          <input type="hidden" name="fulfillment" value="pickup">
          <span class="label-like" id="byLbl" style="display:block;margin:16px 0 8px">Who's picking up?</span>
          <div class="toggle" role="radiogroup" aria-labelledby="byLbl">
            <label><input type="radio" name="pickupBy" value="self" ${saved.pickupBy !== 'rider' ? 'checked' : ''}><span><b>I'll pick it up</b></span></label>
            <label><input type="radio" name="pickupBy" value="rider" ${saved.pickupBy === 'rider' ? 'checked' : ''}><span><b>I'll send a rider</b></span></label>
          </div>
          <div class="ridernote" id="riderNote" hidden>
            <b>🛵 Please book your own rider</b>
            <p>We don't deliver, but you can book your own rider to pick up your box at ${esc(SHOP.pickup.place)} and bring it to you. The rider fee is paid by you directly to the rider. We'll message you when your box is ready so you can book at the right time.</p>
          </div>
          <div class="fields" style="margin-top:16px">
            <div class="field field--full">
              <span class="label-like" id="dateLbl">Pick-up date</span>${leadTxt ? `<span class="hint" style="margin:0 0 8px">${leadTxt}${SHOP.orderCutoff ? ` (until ${fmtTime(SHOP.orderCutoff)} the day before)` : ''}.</span>` : ''}
              <div class="datechips" role="radiogroup" aria-labelledby="dateLbl">
                ${dates.map((d, i) => { const c = fmtChip(d); return `<label class="datechip"><input type="radio" name="date" value="${d}"><span><i>${c.wd}</i><b>${c.day}</b></span></label>`; }).join('')}
                <label class="datechip datechip--other"><input type="radio" name="date" value="other"><span><i>Other</i><b>date…</b></span></label>
              </div>
              <input class="input" id="f-date-other" name="dateOther" type="date" min="${minDate()}" max="${maxDate()}" hidden aria-label="Pick another date">
              ${closedSoon.length ? `<span class="hint">Closed on: ${closedSoon.map((d) => fmtChip(d).day).join(', ')}${SHOP.closedWeekdays.length ? ' and every ' + SHOP.closedWeekdays.map((w) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][w]).join(', ') : ''}.</span>` : ''}
              <span class="err" id="e-date"></span>
            </div>
            <div class="field field--full"><label for="f-time">Pick-up time</label><select class="input" id="f-time" name="time">${SHOP.pickupTimes.map((t) => `<option ${saved.time === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></div>
          </div>
        </div>

        <div class="panel">
          <h2><span class="num">3</span>Is this a gift?</h2>
          <label class="switchrow"><input type="checkbox" name="gift" id="f-gift"><span class="switch" aria-hidden="true"></span><span><b>Yes, send it as a gift 🎁</b><i>Add who it's for and a little note.</i></span></label>
          <div class="fields giftfields" id="giftFields" hidden>
            <div class="field"><label for="f-giftTo">Gift for (name)</label><input class="input" id="f-giftTo" name="giftTo" maxlength="80"><span class="err" id="e-giftTo"></span></div>
            <div class="field"><label for="f-giftPhone">Their mobile <span class="opt">(optional, for the rider)</span></label><input class="input" id="f-giftPhone" name="giftPhone" type="tel" inputmode="tel" maxlength="20"><span class="err" id="e-giftPhone"></span></div>
            <div class="field field--full"><label for="f-giftNote">Gift note <span class="opt">(we'll write it on a card)</span></label><textarea class="input" id="f-giftNote" name="giftNote" maxlength="200" placeholder="Happy birthday! Love, …"></textarea><span class="hint"><span id="giftCount">0</span>/200</span></div>
            <label class="checkrow field--full"><input type="checkbox" name="giftHidePrices"> Don't include prices in the box</label>
            <p class="fine field--full">Sending it to someone? Book a rider to bring it to them, and we'll add your note.</p>
          </div>
        </div>

        ${mustPayFirst() ? payNowPanel() : `<div class="panel">
          <h2><span class="num">4</span>Payment & notes</h2>
          ${tipHTML()}
          <div class="receipt-slot" id="receiptSlot"></div>
          <p class="fine">No payment yet. After you place your order you'll see how to pay, and you can upload your payment screenshot right there.</p>
          <div class="fields">
            <div class="field field--full"><label for="f-pay">How will you pay?</label><select class="input" id="f-pay" name="payment"><option>GCash</option><option>Bank transfer</option></select><span class="err" id="e-payment"></span></div>
            <div class="field field--full"><label for="f-notes">Notes <span class="opt">(optional)</span></label><textarea class="input" id="f-notes" name="notes" maxlength="500" placeholder="Allergies, special requests…"></textarea></div>
          </div>
          ${placeBtnHTML()}
        </div>`}
      </form>
      ${receiptHTML()}
    </div>
  </div>`;
}


/* tip (optional) */
function tipHTML() {
  const t = SHOP.tips; if (!t?.enabled) return '';
  return `<div class="tipbox">
    <span class="label-like" id="tipLbl">Tip <span class="opt">(optional)</span></span>
    <div class="tipchips" role="radiogroup" aria-labelledby="tipLbl">
      <label class="tipchip"><input type="radio" name="tipChoice" value="0" checked><span>No tip</span></label>
      ${t.amounts.map((a) => `<label class="tipchip"><input type="radio" name="tipChoice" value="${a}"><span>${peso(a)}</span></label>`).join('')}
      <label class="tipchip"><input type="radio" name="tipChoice" value="other"><span>Other</span></label>
    </div>
    <input class="input input--sm tipother" id="f-tipOther" type="number" inputmode="numeric" min="1" max="5000" step="1" placeholder="₱ amount" hidden aria-label="Tip amount">
  </div>`;
}
function currentTip() {
  const f = $('#coForm'); if (!f) return 0;
  const c = f.querySelector('input[name=tipChoice]:checked')?.value;
  if (!c) return 0;
  return cleanTip(c === 'other' ? $('#f-tipOther')?.value : c);
}
function syncTotals() {
  const tot = cart.subtotal() + currentTip();
  if ($('#placeTotal')) $('#placeTotal').textContent = peso(tot);
  if ($('#payAmt')) $('#payAmt').textContent = peso(tot);
}
/* pay-first checkout: customer pays, then adds the reference no. + screenshot before placing the order */
const placeBtnHTML = () => `<div class="hp" aria-hidden="true"><label>Leave this empty<input name="company" tabindex="-1" autocomplete="off"></label></div>
          <div class="alert alert--err" id="coErr" role="alert" hidden></div>
          <button class="btn btn--block" type="submit" id="placeBtn" style="margin-top:18px">Place order · <span id="placeTotal">${peso(cart.subtotal())}</span></button>
          <p class="fine" style="text-align:center;margin-top:10px">By placing your order you agree to be contacted about it.</p>`;
function payNowPanel() {
  const p = window.SO_PAYMENT || SHOP.payment;
  const methods = [p.gcashNumber && 'GCash', p.bankAccountNumber && 'Bank transfer'].filter(Boolean);
  return `<div class="panel">
          <h2><span class="num">4</span>Pay now</h2>
          ${tipHTML()}
          <div class="receipt-slot" id="receiptSlot"></div>
          <p class="fine">Send <b id="payAmt">${peso(cart.subtotal())}</b>, then upload your payment screenshot below. We check every payment before we bake, so orders without a real payment are cancelled.</p>
          ${methods.length > 1 ? `<div class="toggle" role="radiogroup" aria-label="Pay with" style="margin-top:12px">${methods.map((m, i) => `<label><input type="radio" name="payment" value="${m}" ${i ? '' : 'checked'}><span><b>${m === 'Bank transfer' ? esc(p.bankName || m) : m}</b></span></label>`).join('')}</div>` : `<input type="hidden" name="payment" value="${methods[0]}">`}
          <div class="paycards" id="coPay">${payDetailsHTML(methods[0], true)}</div>
          <div class="fields" style="margin-top:14px">
            <div class="field field--full"><span class="label-like">Payment screenshot</span>
              <label class="drop" id="coDrop" for="co-file">
                <input type="file" id="co-file" accept="image/*,application/pdf">
                <span class="drop__empty"><svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true"><path d="M12 16V4m0 0-4 4m4-4 4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg><b>Upload your payment screenshot</b><i>Photo, screenshot or PDF receipt</i></span>
                <span class="drop__preview" hidden><img alt="Your screenshot preview"><span><b id="co-fname"></b><i>Tap to change</i></span></span>
              </label><span class="err" id="e-proof"></span></div>
            <div class="field field--full"><label for="f-notes">Notes <span class="opt">(optional)</span></label><textarea class="input" id="f-notes" name="notes" maxlength="500" placeholder="Allergies, special requests…"></textarea></div>
          </div>
          ${placeBtnHTML()}
          <p class="fine pay-gate" id="payGate">Upload your payment screenshot above to place your order.</p>
        </div>`;
}
let coProof = null;
const gate = () => { const b = $('#placeBtn'), g = $('#payGate'); if (b && g) { b.disabled = !coProof; g.hidden = !!coProof; } };
function bindPayNow(f) {
  coProof = null;
  const file = $('#co-file'); if (!file) return;
  file.addEventListener('change', async () => {
    const fl = file.files?.[0]; $('#e-proof').textContent = ''; $('#e-proof').closest('.field').classList.remove('has-err');
    if (!fl) return;
    try {
      const pdf = fl.type === 'application/pdf';
      if (pdf && fl.size > 3 * 1024 * 1024) throw new Error('big');
      coProof = pdf ? await new Promise((ok, bad) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = bad; r.readAsDataURL(fl); }) : await shrinkImage(fl);
      const pv = $('#coDrop .drop__preview'); pv.hidden = false; $('#coDrop .drop__empty').hidden = true;
      $('img', pv).src = pdf ? 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 50"><rect width="40" height="50" rx="5" fill="#331013"/><text x="20" y="31" font-size="11" font-family="Arial" font-weight="700" fill="#fff" text-anchor="middle">PDF</text></svg>') : coProof; $('#co-fname').textContent = fl.name.length > 28 ? fl.name.slice(0, 25) + '…' : fl.name;
    } catch { coProof = null; $('#e-proof').textContent = 'We couldn’t use that file. Please choose a screenshot, photo or PDF under 3 MB.'; }
    gate();
  });
  $$('input[name=payment]', f).forEach((r) => r.addEventListener('change', () => { $('#coPay').innerHTML = payDetailsHTML(r.value, true); }));
  gate();
}
function bindCheckout() {
  const f = $('#coForm');
  if (!f) return;
  const other = $('#f-date-other');
  const sync = () => {
    $('#riderNote').hidden = f.querySelector('input[name=pickupBy]:checked')?.value !== 'rider';
    other.hidden = f.querySelector('input[name=date]:checked')?.value !== 'other';
    $('#giftFields').hidden = !$('#f-gift').checked;
    $('#giftCount').textContent = $('#f-giftNote').value.length;
    refreshReceipt(); syncTotals();
  };
  f.addEventListener('change', (e) => {
    if (e.target.name === 'date' && e.target.value === 'other') setTimeout(() => { other.focus(); other.showPicker?.(); }, 50);
    sync();
  });
  $('#f-giftNote').addEventListener('input', () => ($('#giftCount').textContent = $('#f-giftNote').value.length));
  $('#f-giftTo').addEventListener('input', () => refreshReceipt());
  sync();
  bindPayNow(f);
  // phones: show the receipt right after the tip, before the payment details
  const mq = matchMedia('(max-width: 1000px)'), co = f.closest('.co');
  const place = () => { const r = $('#receipt'), slot = $('#receiptSlot'); if (!r || !slot) return; if (mq.matches) { if (r.parentElement !== slot) slot.appendChild(r); } else if (r.parentElement !== co) co.appendChild(r); };
  place(); mq.addEventListener('change', place); cleanups.push(() => mq.removeEventListener('change', place));
  f.addEventListener('change', (e) => { if (e.target.name === 'tipChoice') { const o = $('#f-tipOther'); o.hidden = e.target.value !== 'other'; if (!o.hidden) o.focus(); } });
  $('#f-tipOther')?.addEventListener('input', () => { refreshReceipt(); syncTotals(); });
  $$('.input, input[name=date]', f).forEach((i) => i.addEventListener('input', () => { i.closest('.field')?.classList.remove('has-err'); const e = $('#e-' + (i.name === 'dateOther' ? 'date' : i.name)); if (e) e.textContent = ''; }));
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(f));
    d.date = d.date === 'other' ? d.dateOther : d.date || '';
    delete d.dateOther;
    if (mustPayFirst()) d.proof = coProof;
    const errs = validate(d);
    $$('.field', f).forEach((x) => x.classList.remove('has-err'));
    $$('.err', f).forEach((x) => (x.textContent = ''));
    if (Object.keys(errs).length) {
      for (const [k, m] of Object.entries(errs)) { const el = $('#e-' + k); if (el) { el.textContent = m; el.closest('.field').classList.add('has-err'); } }
      const first = $('.has-err .input, .has-err .datechips, .has-err .drop', f); (first?.querySelector?.('input') || first)?.focus(); first?.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
      return;
    }
    store.set('so_customer', { name: d.name, phone: d.phone, email: d.email, social: d.social, pickupBy: d.pickupBy });
    await submitOrder(d);
  });
}
function validate(d) {
  const e = {};
  if (!d.name || d.name.trim().length < 2) e.name = 'Please enter your name.';
  const digits = (d.phone || '').replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 13) e.phone = 'Please enter a valid mobile number (e.g. 0917 123 4567).';
  if (d.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email)) e.email = 'That email doesn’t look right.';
  if (!d.social || d.social.trim().length < 2) e.social = 'Please enter your Instagram or Facebook name.';
  if (!d.date) e.date = 'Please pick a date.';
  else if (d.date < minDate()) e.date = 'Orders need at least a day’s notice. Please pick a later date.';
  else if (d.date > maxDate()) e.date = 'That’s too far ahead. Please pick an earlier date.';
  else if (isClosedDate(d.date)) e.date = 'Sorry, we’re closed that day. Please pick another date.';
  if (mustPayFirst()) {
    if (!d.proof) e.proof = 'Please upload the screenshot of your payment.';
  }
  if (d.gift === 'on') {
    if (!d.giftTo || d.giftTo.trim().length < 2) e.giftTo = 'Who is the gift for?';
    const g = (d.giftPhone || '').replace(/\D/g, '');
    if (g && (g.length < 10 || g.length > 13)) e.giftPhone = 'Please check this number.';
  }
  return e;
}
let submitting = false;
async function submitOrder(d) {
  if (submitting) return;
  submitting = true;
  const btn = $('#placeBtn'), errBox = $('#coErr');
  errBox.hidden = true;
  const label = btn.innerHTML;
  btn.disabled = true; btn.innerHTML = `<span class="spin" aria-hidden="true"></span> Sending your order…`;
  // the same key is reused if the customer retries, so the server can ignore duplicates
  let key = sstore.get('so_idem', null);
  if (!key) { key = (crypto.randomUUID?.() || String(Date.now()) + Math.random()); sstore.set('so_idem', key); }
  const payload = { ...d, gift: d.gift === 'on', giftHidePrices: d.giftHidePrices === 'on', tip: currentTip(), items: cart.items.map(({ pid, vid, qty, wrap, ribbon }) => ({ pid, vid, qty, wrap: !!wrap, ribbon: ribbon ?? null })), idempotencyKey: key };
  try {
    let data;
    if (window.SO_DEMO) { await new Promise((r) => setTimeout(r, 900)); data = demoOrder(payload); }
    else {
      const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 20000);
      const res = await fetch('/api/order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: ctrl.signal });
      clearTimeout(t);
      data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || 'We couldn’t send your order right now.');
    }
    sstore.set('so_last_order', data.order);
    store.set('so_last_order_ref', { orderId: data.order.orderId, phone: data.order.phone || d.phone, name: d.name });
    sstore.set('so_idem', null);
    await packBox(d.name);
    cart.clear();
    location.hash = '#/thanks';
  } catch (err) {
    const msg = err.name === 'AbortError' ? 'The connection timed out.' : err.message;
    errBox.innerHTML = `<span>⚠</span><span><b>${esc(msg)}</b><br>Your cart is saved. Please try again in a moment, or message us on <a href="${SHOP.instagram}" target="_blank" rel="noopener">Instagram</a>.</span>`;
    errBox.hidden = false;
    errBox.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
    btn.disabled = false; btn.innerHTML = label;
  } finally { submitting = false; }
}
// cute moment: the cookies get packed, the lid closes and a ribbon is tied before the thank-you page
async function packBox(name) {
  // plays on every device (also PCs with 'reduce motion' on): it's short and only after the customer taps Place order
  const ov = document.createElement('div');
  ov.className = 'packing'; ov.setAttribute('role', 'status');
  ov.innerHTML = `<div class="packing__card">${bakeBoxHTML({ tag: 'for ' + (name || '').split(' ')[0] })}<p class="packing__msg">Packing your box…</p></div>`;
  document.body.appendChild(ov);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  await wait(700); $('.bakebox', ov).classList.add('is-closed'); $('.packing__msg', ov).textContent = 'Closing the lid…';
  await wait(650); $('.bakebox', ov).classList.add('is-tied'); $('.packing__msg', ov).textContent = 'Tying the ribbon… 🎀';
  await wait(950);
  ov.classList.add('out'); setTimeout(() => ov.remove(), 400);
}
function demoOrder(p) {
  const lines = p.items.map((i) => { const pr = findProduct(i.pid), v = findVariant(pr, i.vid), x = addonText(pr, v, i), u = v.price + addonPrice(pr, v, i); return { name: pr.name, variant: v.label + (x ? ' · ' + x : ''), qty: i.qty, total: u * i.qty }; });
  const z = null;
  const sub = lines.reduce((s, l) => s + l.total, 0), tip = cleanTip(p.tip);
  return { ok: true, order: { orderId: 'SO-261023-DEMO', lines, subtotal: sub, tip, total: sub + tip, fulfillment: p.fulfillment, date: p.date, time: p.time, name: p.name, phone: p.phone, payment: p.payment, paid: mustPayFirst(), payRef: (p.payRef || '').replace(/\s+/g, '').toUpperCase(), pickupBy: p.pickupBy, zone: z, gift: p.gift ? { to: p.giftTo, hidePrices: p.giftHidePrices } : null, createdAt: Date.now() } };
}

/* ───────────── how to pay + payment proof upload ───────────── */
function copyRow(label, value, copy = !/\*/.test(value)) {
  return `<div class="copyrow"><span><i>${esc(label)}</i><b>${esc(value)}</b></span>${copy ? `<button type="button" class="copybtn" data-copy="${esc(value.replace(/\s+/g, ''))}">Copy</button>` : ''}</div>`;
}
function payDetailsHTML(method, only = false) {
  const p = window.SO_PAYMENT || SHOP.payment || {};
  const qr = p.qr && !window.SO_DEMO ? `<div class="paycard__qr"><img src="/api/qr?v=${esc(p.qr)}" alt="GCash QR code" loading="lazy"><a href="/api/qr?v=${esc(p.qr)}" download="simple-oven-gcash-qr">Save QR</a></div>` : '';
  const gcash = p.gcashNumber ? `<div class="paycard"><h3>GCash</h3>${p.gcashName ? copyRow('Account name', p.gcashName) : ''}${copyRow('GCash number', p.gcashNumber)}${qr}</div>` : '';
  const bank = p.bankAccountNumber ? `<div class="paycard"><h3>${esc(p.bankName || 'Bank transfer')}</h3>${p.bankAccountName ? copyRow('Account name', p.bankAccountName) : ''}${copyRow('Account number', p.bankAccountNumber)}</div>` : '';
  const first = only ? (method === 'Bank transfer' ? bank : gcash) || gcash + bank : method === 'Bank transfer' ? bank + gcash : gcash + bank;
  return first || `<p class="fine">We'll send our GCash / bank details when we confirm your order.</p>`;
}
function proofHTML(pref = {}, compact = false) {
  return `<form class="proof" id="proofForm" novalidate>
    ${compact ? '' : `<div class="fields">
      <div class="field"><label for="p-order">Order number</label><input class="input" id="p-order" name="orderId" placeholder="SO-261023-7KQH" maxlength="20" value="${esc(pref.orderId || '')}" autocapitalize="characters"><span class="err" id="pe-orderId"></span></div>
      <div class="field"><label for="p-phone">Mobile number you ordered with</label><input class="input" id="p-phone" name="phone" type="tel" inputmode="tel" maxlength="20" value="${esc(pref.phone || '')}"><span class="err" id="pe-phone"></span></div>
    </div>`}
    ${compact ? `<input type="hidden" name="orderId" value="${esc(pref.orderId || '')}"><input type="hidden" name="phone" value="${esc(pref.phone || '')}">` : ''}
    <input type="hidden" name="name" value="${esc(pref.name || '')}">
    <label class="drop" id="drop" for="p-file">
      <input type="file" id="p-file" accept="image/*">
      <span class="drop__empty"><svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true"><path d="M12 16V4m0 0-4 4m4-4 4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg><b>Choose your payment screenshot</b><i>GCash or bank receipt · JPG or PNG</i></span>
      <span class="drop__preview" hidden><img alt="Your screenshot preview"><span><b id="p-fname"></b><i>Tap to change</i></span></span>
    </label>
    <span class="err" id="pe-image"></span>
    <div class="field"><label for="p-amount">Amount you sent <span class="opt">(optional)</span></label><input class="input" id="p-amount" name="amount" inputmode="decimal" maxlength="20" placeholder="₱"></div>
    <div class="hp" aria-hidden="true"><label>Leave empty<input name="company" tabindex="-1" autocomplete="off"></label></div>
    <div class="alert alert--err" id="proofErr" role="alert" hidden></div>
    <button class="btn btn--block" type="submit" id="proofBtn">Send payment screenshot</button>
  </form>
  <div class="proof-ok" id="proofOk" hidden><div class="check check--sm"><svg viewBox="0 0 24 24"><path d="M5 12.5 10 17l9-10"/></svg></div><div><b>Screenshot sent!</b><p class="fine">We'll check it and message you to confirm. Thank you!</p></div></div>`;
}
async function shrinkImage(file, max = 1600, type = 'image/jpeg') {
  // turn any photo into a small JPEG (also fixes huge phone screenshots)
  const url = URL.createObjectURL(file);
  try {
    const im = await new Promise((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = bad; i.src = url; });
    const s = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight));
    const c = document.createElement('canvas'); c.width = Math.round(im.naturalWidth * s); c.height = Math.round(im.naturalHeight * s);
    c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
    const ctx = c.getContext('2d'); if (type === 'image/jpeg') { ctx.globalCompositeOperation = 'destination-over'; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); }
    return c.toDataURL(type, 0.85);
  } finally { URL.revokeObjectURL(url); }
}
function bindProof() {
  const f = $('#proofForm');
  if (!f) return;
  let dataUrl = null;
  const file = $('#p-file');
  file.addEventListener('change', async () => {
    const fl = file.files?.[0];
    $('#pe-image').textContent = '';
    if (!fl) return;
    try {
      dataUrl = await shrinkImage(fl);
      const pv = $('.drop__preview', f); pv.hidden = false; $('.drop__empty', f).hidden = true;
      $('img', pv).src = dataUrl; $('#p-fname').textContent = fl.name.length > 28 ? fl.name.slice(0, 25) + '…' : fl.name;
    } catch {
      dataUrl = null; $('#pe-image').textContent = 'We couldn’t open that file. Please choose a JPG or PNG screenshot.';
    }
  });
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(f));
    const errs = {};
    if (!/^SO-\d{6}-[A-Z0-9]{4}$/i.test((d.orderId || '').trim())) errs.orderId = 'Please enter your order number (e.g. SO-261023-7KQH).';
    const digits = (d.phone || '').replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 13) errs.phone = 'Please enter the mobile number you ordered with.';
    if (!dataUrl) errs.image = 'Please choose your payment screenshot.';
    $$('.err', f).forEach((x) => (x.textContent = ''));
    if (Object.keys(errs).length) { for (const [k, m] of Object.entries(errs)) { const el = $('#pe-' + k); if (el) el.textContent = m; } return; }
    const btn = $('#proofBtn'), errBox = $('#proofErr'); errBox.hidden = true;
    btn.disabled = true; btn.innerHTML = `<span class="spin" aria-hidden="true"></span> Sending…`;
    try {
      if (window.SO_DEMO) await new Promise((r) => setTimeout(r, 900));
      else {
        const res = await fetch('/api/payment-proof', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...d, orderId: d.orderId.trim().toUpperCase(), image: dataUrl }) });
        const out = await res.json().catch(() => ({}));
        if (!res.ok || !out.ok) throw new Error(out.error || 'We couldn’t send your screenshot right now.');
      }
      f.hidden = true; $('#proofOk').hidden = false;
    } catch (err) {
      errBox.innerHTML = `<span>⚠</span><span><b>${esc(err.message)}</b><br>Please try again, or send the screenshot by DM on <a href="${SHOP.instagram}" target="_blank" rel="noopener">Instagram</a>.</span>`;
      errBox.hidden = false; btn.disabled = false; btn.textContent = 'Send payment screenshot';
    }
  });
}
document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-copy]');
  if (!b) return;
  try { await navigator.clipboard.writeText(b.dataset.copy); b.textContent = 'Copied!'; }
  catch { const r = document.createRange(); r.selectNodeContents(b.previousElementSibling.querySelector('b')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); b.textContent = 'Selected'; }
  setTimeout(() => (b.textContent = 'Copy'), 1600);
});

function viewThanks() {
  const o = sstore.get('so_last_order', null);
  if (!o) return viewHome();
  const when = o.date ? new Date(o.date + 'T00:00').toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' }) : '';
  const cash = o.payment === 'Cash on pick-up';
  return `<div class="view wrap thanks">
    <div class="thanks__main">
      <div class="thanks__box">${bakeBoxHTML({ closed: true, tag: 'for ' + (o.name || '').split(' ')[0] })}</div>
      <p class="eyebrow">Order received</p>
      <h1 class="h2">Thank you, <em>${esc((o.name || '').split(' ')[0])}</em>!</h1>
      <p class="lead" style="margin-top:16px">Your order <b>${esc(o.orderId)}</b> has been sent to us${when ? ` for <b>${esc(when)}</b>` : ''}. Take a screenshot of this page for reference.</p>
      <ol class="next">
        <li><b>1.</b>We'll message you to confirm your order. Pick-up is at ${SHOP.pickup.mapUrl ? `<a href="${esc(SHOP.pickup.mapUrl)}" target="_blank" rel="noopener">${esc(SHOP.pickup.place)} (map pin)</a>` : esc(SHOP.pickup.place)}.</li>
        <li><b>2.</b>${o.paid ? `We received your payment screenshot. We'll check it and confirm your date.` : 'Send your payment and upload the screenshot below. Your date is booked once we receive it.'}</li>
        <li><b>3.</b>We bake it fresh. ${o.pickupBy === 'rider' ? `Book your rider when we tell you it's ready.` : 'Pick it up and enjoy!'}</li>
      </ol>
      ${cash || o.paid ? '' : `<section class="panel paypanel">
        <h2><span class="num">₱</span>How to pay</h2>
        <p class="fine">Amount: <b>${peso(o.total ?? o.subtotal)}</b>. Please pay after we confirm your order.</p>
        <div class="paycards">${payDetailsHTML(o.payment)}</div>
        <h3 class="paypanel__h">Upload your payment screenshot</h3>
        ${proofHTML({ orderId: o.orderId, phone: o.phone, name: o.name }, true)}
        <p class="fine" style="margin-top:10px">Paying later? Come back anytime to <a href="#/pay">Upload payment</a> with your order number.</p>
      </section>`}
      <div class="hero__cta" style="animation:none;margin-top:24px"><a class="btn" href="#/shop">Back to the menu</a><a class="btn btn--ghost" href="${SHOP.instagram}" target="_blank" rel="noopener">Follow us ↗</a></div>
    </div>
    ${receiptHTML({ order: o })}
  </div>`;
}

function viewPay() {
  const ref = store.get('so_last_order_ref', {});
  return `<div class="view wrap paypage">
    <div class="pagehead"><p class="eyebrow">Payment</p><h1 class="h2">Upload your <em>payment</em></h1><p class="lead" style="margin-top:12px">Paid by GCash or bank transfer? Send us your screenshot here so we can confirm your order faster.</p></div>
    <div class="co">
      <section class="panel">${proofHTML(ref)}</section>
      <aside class="panel"><h2>Where to pay</h2><div class="paycards">${payDetailsHTML()}</div><p class="fine" style="margin-top:12px">Can't find your order number? It's on your thank-you page screenshot, or message us on <a href="${SHOP.instagram}" target="_blank" rel="noopener">Instagram</a>.</p></aside>
    </div>
  </div>`;
}

function viewNotFound() {
  return `<div class="view wrap nf">${emptySVG.replace('<svg', '<svg style="width:140px"')}<h1 class="h2">Hmm, that's not on the menu.</h1><a class="btn" href="#/">Go home</a></div>`;
}

/* ───────────────────────── effects ───────────────────────── */
let cleanups = [];
// springy state for touching the hero cookie (read by the 3D loop every frame)
const touchFx = {
  rx: 0, ry: 0, y: 0, sx: 1, sy: 1, hold: 0,
  _t: { rx: 0, ry: 0, s: 1, y: 0 }, _v: { rx: 0, ry: 0, s: 0, y: 0 }, _held: false, _s: 1,
  press() { this._held = true; this._t.s = .96; this._t.y = 4; },
  setTilt(dx, dy) { const c = (v, m) => Math.max(-m, Math.min(m, v)); this._t.ry = c(dx * .35, 45); this._t.rx = c(-dy * .3, 35); },
  setScale(k) { this._s = Math.max(.75, Math.min(1.35, .5 + k * .5)); this._t.s = this._s; },
  release() { const k = this._s; this._held = false; this._t = { rx: 0, ry: 0, s: 1, y: 0 }; this._s = 1; return k; },
  kick(p = 1) { this._v.s -= .09 * p; this._v.y += 7 * p; this._v.rx += (Math.random() - .5) * 10 * p; this._v.ry += (Math.random() - .5) * 14 * p; },
  reset() { Object.assign(this, { rx: 0, ry: 0, y: 0, sx: 1, sy: 1, hold: 0 }); this._t = { rx: 0, ry: 0, s: 1, y: 0 }; this._v = { rx: 0, ry: 0, s: 0, y: 0 }; this._held = false; },
  step() { // damped springs → natural wobble when you let go
    const k = this._held ? .22 : .09, d = this._held ? .6 : .8;
    for (const key of ['rx', 'ry', 'y']) { this._v[key] = (this._v[key] + (this._t[key] - this[key]) * k) * d; this[key] += this._v[key]; }
    const s = (this.sx + this.sy) / 2; this._v.s = (this._v.s + (this._t.s - s) * k) * d; const ns = s + this._v.s;
    const squash = Math.max(-.12, Math.min(.12, -this._v.s * 1.6)); // jelly: stretch one axis while the other shrinks
    this.sx = ns * (1 + squash); this.sy = ns * (1 - squash);
    this.hold += ((this._held ? 1 : 0) - this.hold) * .15;
  },
};
let zTop = 10;
function initEffects() {
  // reveal on scroll
  const io = new IntersectionObserver((ents) => ents.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
  $$('.rv', app).forEach((el) => io.observe(el));
  cleanups.push(() => io.disconnect());

  // card tilt
  if (finePointer) {
    $$('[data-tilt]', app).forEach((c) => {
      c.addEventListener('pointermove', (e) => {
        const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        c.style.transform = `perspective(900px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg) translateY(-6px)`;
      });
      c.addEventListener('pointerleave', () => (c.style.transform = ''));
    });
  }

  // hero 3D parallax stage
  const stage = $('#stage');
  if (stage) { // runs even with Windows/Mac "reduce motion" on; only the idle sway is toned down
    const calmK = reduceMotion ? .4 : 1;
    const inner = $('#stageInner'), floats = $$('.float', stage), coin = $('#coin'), shine = $('#coinShine');
    let tx = 0, ty = 0, cx = 0, cy = 0, sy = 0, raf, lastMove = -1e9;
    const onMove = (e) => { tx = (e.clientX / innerWidth - .5) * 2; ty = (e.clientY / innerHeight - .5) * 2; lastMove = performance.now(); };
    const loop = (now = 0) => {
      // no mouse (phones) or idle → a slow figure-eight sway so the scene always feels alive
      if (now - lastMove > 2500) { const t = now / 1000; tx = Math.sin(t * .55) * .55 * calmK; ty = Math.sin(t * 1.1) * .3 * calmK; }
      cx += (tx - cx) * .06; cy += (ty - cy) * .06;
      const s = reduceMotion ? 0 : Math.min(1, scrollY / 600); sy += (s - sy) * .1;
      inner.style.transform = `rotateY(${cx * 7}deg) rotateX(${-cy * 5 + sy * 8}deg)`;
      floats.forEach((f) => { const d = +f.dataset.depth; f.style.transform = `translate3d(${cx * d * .18}px, ${cy * d * .14 - sy * d * .5}px, ${d}px)`; });
      if (coin) {
        const t = now / 1000;
        touchFx.step();
        const T = touchFx, calm = (1 - Math.min(1, T.hold)) * calmK; // idle bob fades while the cookie is held
        coin.style.transform = `translateY(${(Math.sin(t * 1.3) * 6) * calm - sy * 30 + T.y}px) rotateX(${(-cy * 16 + 6) * calm + T.rx}deg) rotateY(${cx * 20 * calm + T.ry}deg) rotateZ(${-7 + Math.sin(t * .8) * 2.5 * calm + sy * 18}deg) scale(${T.sx}, ${T.sy})`;
        if (shine) shine.style.backgroundPosition = `${50 + cx * 40 + T.ry * 1.4}% ${45 + cy * 40 - T.rx * 1.4}%`;
      }
      raf = requestAnimationFrame(loop);
    };
    if (finePointer) addEventListener('pointermove', onMove, { passive: true });
    raf = requestAnimationFrame(loop);
    cleanups.push(() => { cancelAnimationFrame(raf); removeEventListener('pointermove', onMove); });
  }

  // hero: touch the cookie — tap = crumbs burst, drag = turn it in 3D, pinch/squeeze = squash it
  const cb = $('#crumbleBtn'), st = $('#stage');
  if (cb && st) {
    const solo = st.classList.contains('stage--solo');
    const live = new Set();
    const spawnCrumbs = (ox, oy, n, power = 1) => {
      const r = st.getBoundingClientRect();
      for (let i = 0; i < n; i++) {
        if (live.size > 45) { const old = live.values().next().value; old.remove(); live.delete(old); }
        const c = document.createElement('img');
        c.src = cut('crumb-' + Math.floor(Math.random() * 10)); c.alt = ''; c.className = 'crumb-fly';
        const size = (8 + Math.random() * 16) * (Math.random() < .2 ? 1.5 : 1);
        c.style.width = size + 'px'; c.style.left = ox + 'px'; c.style.top = oy + 'px';
        st.appendChild(c); live.add(c);
        const dx = (Math.random() - .5) * r.width * .5 * power, up = -(30 + Math.random() * 110) * power;
        const floor = r.height * (solo ? .74 + Math.random() * .1 : .72) - oy;
        const rot = (Math.random() - .5) * 900;
        c.animate([
          { transform: 'translate(-50%,-50%) scale(.4)', opacity: 0 },
          { transform: `translate(calc(-50% + ${dx * .4}px), calc(-50% + ${up}px)) rotate(${rot * .35}deg) scale(1)`, opacity: 1, offset: .28 },
          { transform: `translate(calc(-50% + ${dx * .9}px), calc(-50% + ${floor}px)) rotate(${rot * .9}deg)`, offset: .62, easing: 'ease-out' },
          { transform: `translate(calc(-50% + ${dx * .97}px), calc(-50% + ${floor - 10}px)) rotate(${rot}deg)`, offset: .7, easing: 'ease-in' },
          { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${floor}px)) rotate(${rot}deg)`, opacity: 1, offset: .78 },
          { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${floor}px)) rotate(${rot}deg)`, opacity: 0 },
        ], { duration: 1150 + Math.random() * 400, easing: 'cubic-bezier(.33,0,.67,1)', fill: 'forwards' }).onfinish = () => { c.remove(); live.delete(c); };
      }
    };
    const puff = (ox, oy) => { // soft sugar-dust puff + sparkles where you touched
      const p = document.createElement('span'); p.className = 'dust'; p.style.left = ox + 'px'; p.style.top = oy + 'px'; st.appendChild(p);
      p.animate([{ transform: 'translate(-50%,-50%) scale(.2)', opacity: .9 }, { transform: 'translate(-50%,-50%) scale(1.6)', opacity: 0 }], { duration: 450, easing: 'cubic-bezier(.2,.8,.3,1)' }).onfinish = () => p.remove();
      for (let i = 0; i < 10; i++) {
        const k = document.createElement('span'); k.className = 'spark'; k.style.left = ox + 'px'; k.style.top = oy + 'px'; st.appendChild(k);
        const a = (i / 10) * Math.PI * 2 + Math.random() * .5, d = 30 + Math.random() * 50;
        k.animate([{ transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }, { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d}px)) scale(.2)`, opacity: 0 }], { duration: 380 + Math.random() * 180, easing: 'cubic-bezier(.1,.7,.3,1)' }).onfinish = () => k.remove();
      }
    };
    const bump = (power = 1, buzz = true) => { touchFx.kick(power); if (buzz && navigator.userActivation?.hasBeenActive) try { navigator.vibrate?.(10); } catch {} };
    const tapAt = (x, y) => { const r = st.getBoundingClientRect(); bump(1); puff(x - r.left, y - r.top); spawnCrumbs(x - r.left, y - r.top, 10); };

    // pointer gestures on the cookie area
    const pts = new Map();
    let start = null, pinch0 = 0, lastCrumb = 0;
    const area = solo ? $('.solo__cookie', st) : st;
    area.addEventListener('pointerdown', (e) => {
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      try { area.setPointerCapture(e.pointerId); } catch {}
      if (pts.size === 1) { start = { x: e.clientX, y: e.clientY, t: performance.now(), moved: false }; touchFx.press(); }
      if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y) || 1; start.moved = true; }
    });
    area.addEventListener('pointermove', (e) => {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size >= 2) { // pinch → squeeze (in) or stretch (out)
        const [a, b] = [...pts.values()]; const k = Math.hypot(a.x - b.x, a.y - b.y) / pinch0;
        touchFx.setScale(k);
        const now = performance.now();
        if (Math.abs(k - 1) > .18 && now - lastCrumb > 140) { lastCrumb = now; const r = st.getBoundingClientRect(); spawnCrumbs((a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top, 2, .7); }
      } else if (start) { // drag → turn the cookie
        const dx = e.clientX - start.x, dy = e.clientY - start.y;
        if (Math.hypot(dx, dy) > 8) start.moved = true;
        touchFx.setTilt(dx, dy);
      }
    });
    const end = (e) => {
      if (!pts.has(e.pointerId)) return;
      const wasPinch = pts.size >= 2;
      pts.delete(e.pointerId);
      if (wasPinch) { const k = touchFx.release(); if (k < .9 || k > 1.15) { const r = st.getBoundingClientRect(); spawnCrumbs(r.width * .5, r.height * .45, 14, 1.2); } return; }
      if (pts.size) return;
      const wasTap = start && !start.moved && performance.now() - start.t < 450;
      touchFx.release();
      if (wasTap && e.type === 'pointerup') tapAt(e.clientX, e.clientY);
      start = null;
    };
    area.addEventListener('pointerup', end);
    area.addEventListener('pointercancel', end);
    area.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); const r = area.getBoundingClientRect(); tapAt(r.left + r.width / 2, r.top + r.height / 2); } });
    cb.addEventListener('click', (e) => { e.stopPropagation(); const r = area.getBoundingClientRect(); tapAt(r.left + r.width / 2, r.top + r.height * .45); });
    const t = setTimeout(() => { const r = area.getBoundingClientRect(); if (r.width) tapAt(r.left + r.width / 2, r.top + r.height * .4); }, 1700); // one little demo on load
    cleanups.push(() => { clearTimeout(t); touchFx.reset(); });
  }

  // sticker board: drag & drop
  $$('[data-drag]', app).forEach((el) => {
    let sx, sy, ox = 0, oy = 0, id = null;
    el.addEventListener('pointerdown', (e) => {
      id = e.pointerId; el.setPointerCapture(id); sx = e.clientX - ox; sy = e.clientY - oy;
      el.classList.add('is-drag'); el.style.zIndex = ++zTop;
    });
    el.addEventListener('pointermove', (e) => { if (e.pointerId !== id) return; ox = e.clientX - sx; oy = e.clientY - sy; el.style.translate = `${ox}px ${oy}px`; });
    const up = (e) => { if (e.pointerId !== id) return; id = null; el.classList.remove('is-drag'); };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  });

  // scroll parallax images + rotating revel
  const px = $$('[data-parallax]', app), spin = $$('[data-spin]', app);
  if ((px.length || spin.length) && !reduceMotion) {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return; ticking = true;
      requestAnimationFrame(() => {
        px.forEach((el) => { const r = el.parentElement.getBoundingClientRect(); const p = Math.max(-1, Math.min(1, (r.top + r.height / 2 - innerHeight / 2) / innerHeight)); el.style.transform = `translateY(${p * -4 - 4}%)`; });
        spin.forEach((el) => { const r = el.getBoundingClientRect(); const p = Math.max(-1, Math.min(1, (r.top - innerHeight / 2) / innerHeight)); el.style.transform = `perspective(800px) rotateX(${p * 25}deg) rotateZ(${p * -8}deg) translateY(${p * 30}px)`; });
        ticking = false;
      });
    };
    addEventListener('scroll', onScroll, { passive: true }); onScroll();
    cleanups.push(() => removeEventListener('scroll', onScroll));
  }
}

/* ───────────── owner page (#/admin) ─────────────
   Lets the owner change what's available, pick-up days/times and ordering rules from her phone.
   Saved on Cloudflare (KV) through /api/admin, protected by the ADMIN_PASSWORD secret. */
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const adm = { pw: sstore.get('so_admin', ''), s: null, saved: '', storage: true, busy: false, pimgs: {} };
const demoSettings = () => { try { return JSON.parse(sessionStorage.getItem('so_demo_settings')) || null; } catch { return null; } };
async function adminCall(action, extra = {}) {
  if (window.SO_DEMO) { // preview page: no server, keep changes in this tab only
    if (action === 'save') { try { sessionStorage.setItem('so_demo_settings', JSON.stringify(extra.settings)); } catch {} return { ok: true, settings: { ...cleanSettings(extra.settings), updatedAt: new Date().toISOString() } }; }
    return { ok: true, storage: true, settings: cleanSettings(demoSettings() || defaultSettings()) };
  }
  const res = await fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: adm.pw, action, ...extra }), signal: AbortSignal.timeout(15000) });
  const j = await res.json().catch(() => ({ ok: false, error: 'Something went wrong. Please try again.' }));
  return j;
}
const draftEarliest = (s, now = manilaNow()) => { let d = addDays(now.date, s.minLeadDays); if (s.orderCutoff && now.time >= s.orderCutoff) d = addDays(d, 1); return d; };
const draftClosed = (s, d) => s.closedDates.includes(d) || (s.closedWeekdays.includes(weekdayOf(d)) && !s.openDates.includes(d));
const dirty = () => adm.s && (!!adm.qrImage || Object.keys(adm.pimgs).length > 0 || JSON.stringify(adm.s.extraProducts) !== JSON.stringify(cleanSettings(adm.s).extraProducts) || JSON.stringify(cleanSettings(adm.s)) !== adm.saved);

function viewAdmin() {
  return `<div class="view wrap admin"><div class="pagehead pagehead--tight"><h1 class="eyebrow">Owner page</h1></div><div id="adm"></div></div>`;
}
function bindAdmin() {
  const box = $('#adm');
  const onUnload = (e) => { if (dirty()) { e.preventDefault(); e.returnValue = ''; } };
  addEventListener('beforeunload', onUnload); cleanups.push(() => removeEventListener('beforeunload', onUnload));
  if (adm.s) return renderAdmin(box);
  if (adm.pw) return login(box, adm.pw, true);
  renderLogin(box);
}
function renderLogin(box, msg = '') {
  box.innerHTML = `<form class="panel adm-login" id="admLogin" novalidate>
    <h2>Hi! Please log in</h2>
    <p class="fine">This page is only for the Simple Oven owner. Here you can change what's available and when customers can pick up.</p>
    <div class="field"><label for="a-pw">Password</label><input class="input" id="a-pw" type="password" autocomplete="current-password" required><span class="err" id="a-err">${esc(msg)}</span></div>
    <button class="btn" type="submit" id="a-go">Log in</button>
  </form>`;
  $('#admLogin').addEventListener('submit', (e) => { e.preventDefault(); const pw = $('#a-pw').value; if (pw) login(box, pw); });
  $('#a-pw').focus();
}
async function login(box, pw, silent) {
  adm.pw = pw;
  const btn = $('#a-go'); if (btn) { btn.disabled = true; btn.textContent = 'Checking…'; }
  let j;
  try { j = await adminCall('login'); } catch { j = { ok: false, error: 'Can’t reach the website right now. Check your internet and try again.' }; }
  if (!j.ok) { adm.pw = ''; sstore.set('so_admin', ''); return renderLogin(box, silent ? '' : j.error); }
  sstore.set('so_admin', pw);
  adm.s = cleanSettings(j.settings); adm.saved = JSON.stringify(adm.s); adm.storage = j.storage !== false; adm.updatedAt = j.settings.updatedAt;
  renderAdmin(box);
}

function calHTML(s) {
  const now = manilaNow(), first = draftEarliest(s, now);
  const end = addDays(now.date, Math.min(s.maxAheadDays, 92));
  let html = '', m0 = now.date.slice(0, 7) + '-01';
  while (m0 <= end) {
    const title = new Date(m0 + 'T00:00:00Z').toLocaleDateString('en-PH', { month: 'long', year: 'numeric', timeZone: 'UTC' });
    const wk = addDays(now.date, -weekdayOf(now.date)); // skip weeks that are already over
    let d = m0 < wk ? wk : m0, cells = '<span class="cal__d is-past"></span>'.repeat(weekdayOf(d));
    while (d.slice(0, 7) === m0.slice(0, 7)) {
      const dn = +d.slice(8);
      if (d < now.date || d > end) cells += `<span class="cal__d is-past">${dn}</span>`;
      else {
        const closed = draftClosed(s, d), early = d < first;
        cells += `<button type="button" class="cal__d${closed ? ' is-closed' : ''}${early ? ' is-early' : ''}${d === now.date ? ' is-today' : ''}" data-day="${d}" aria-pressed="${!closed}" aria-label="${d}${closed ? ' closed' : ' open'}">${dn}</button>`;
      }
      d = addDays(d, 1);
    }
    html += `<div class="cal__month">${title}</div><div class="cal__row cal__head">${WD.map((w) => `<span>${w[0]}</span>`).join('')}</div><div class="cal__row">${cells}</div>`;
    m0 = d;
  }
  return `<div class="cal">${html}</div>`;
}
function renderAdmin(box) {
  const s = adm.s;
  const ago = adm.updatedAt ? new Date(adm.updatedAt).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';
  box.innerHTML = `
  ${adm.storage ? '' : `<div class="adm-warn"><b>Saving isn't switched on yet.</b> You can look around, but changes can't be saved until the KV storage is connected in Cloudflare (README step 10).</div>`}
  <div class="adm-top"><span class="fine">${ago ? `Last saved ${esc(ago)}` : 'Using the starting settings'}</span><button type="button" class="linkbtn" id="admOut">Log out</button></div>

  ${pmSectionHTML()}

  <section class="panel adm-sec">
    <h2><span class="num">+</span>Add-on prices</h2>
    <div class="adm-price__vars adm-addons">
      <label><span>Individually packed · 4 pcs</span><span class="adm-peso"><i>₱</i><input class="input input--sm" type="number" inputmode="numeric" min="0" step="1" data-addonprice="wrap4" value="${s.addonPrices.wrap4}"></span></label>
      <label><span>Individually packed · 8 pcs</span><span class="adm-peso"><i>₱</i><input class="input input--sm" type="number" inputmode="numeric" min="0" step="1" data-addonprice="wrap8" value="${s.addonPrices.wrap8}"></span></label>
      <label><span>Ribbon (per box)</span><span class="adm-peso"><i>₱</i><input class="input input--sm" type="number" inputmode="numeric" min="0" step="1" data-addonprice="ribbon" value="${s.addonPrices.ribbon}"></span></label>
    </div>
  </section>

  ${admWallSections()}

  <section class="panel adm-sec">
    <h2><span class="num">2</span>How customers pay</h2>
    <label class="adm-item adm-item--plain"><span class="adm-item__name">Customers must pay before ordering<i>${s.requirePayment ? 'On: they send the reference no. + screenshot with the order' : 'Off: they pay after you confirm'}</i></span><input type="checkbox" class="sw" id="a-req" ${s.requirePayment ? 'checked' : ''} aria-label="Customers must pay before ordering"></label>
    ${!paymentReady(s.payment) ? '<p class="adm-warn" style="margin-top:10px">Add your GCash or bank details below. Until then, customers pay after you confirm.</p>' : ''}
    <div class="fields" style="margin-top:12px">
      <div class="field"><label for="a-gname">GCash account name</label><input class="input" id="a-gname" data-pay="gcashName" value="${esc(s.payment.gcashName)}" maxlength="60" placeholder="e.g. Kara C."></div>
      <div class="field"><label for="a-gnum">GCash number</label><input class="input" id="a-gnum" data-pay="gcashNumber" value="${esc(s.payment.gcashNumber)}" maxlength="20" inputmode="tel" placeholder="0917 123 4567"></div>
      <div class="field field--full"><span class="label-like">GCash QR <span class="opt">(optional)</span></span>
        <div class="adm-qr">${adm.qrImage && adm.qrImage !== 'remove' ? `<img src="${adm.qrImage}" alt="New QR">` : s.payment.qr && adm.qrImage !== 'remove' ? `<img src="/api/qr?v=${esc(s.payment.qr)}" alt="Current QR">` : '<span class="adm-qr__none">No QR yet</span>'}
          <div><label class="btn btn--ghost btn--sm" for="a-qr">Upload QR<input type="file" id="a-qr" accept="image/*" hidden></label>${(s.payment.qr || adm.qrImage) && adm.qrImage !== 'remove' ? ' <button type="button" class="linkbtn" id="a-qr-x">Remove</button>' : ''}<span class="hint">In GCash: QR → Receive → save the QR, then upload it here.</span></div></div></div>
      <div class="field field--full"><label for="a-bname">Bank name <span class="opt">(optional)</span></label><input class="input" id="a-bname" data-pay="bankName" value="${esc(s.payment.bankName)}" maxlength="60" placeholder="e.g. BPI"></div>
      <div class="field"><label for="a-baname">Bank account name</label><input class="input" id="a-baname" data-pay="bankAccountName" value="${esc(s.payment.bankAccountName)}" maxlength="60"></div>
      <div class="field"><label for="a-banum">Bank account number</label><input class="input" id="a-banum" data-pay="bankAccountNumber" value="${esc(s.payment.bankAccountNumber)}" maxlength="30" inputmode="numeric"></div>
    </div>
  </section>

  <section class="panel adm-sec">
    <h2><span class="num">3</span>Pick-up days</h2>
    <p class="fine">Tap a day to close or open it. <span class="key key--open"></span> open <span class="key key--closed"></span> closed <span class="key key--early"></span> too soon to order</p>
    <span class="label-like">Closed every week on</span>
    <div class="wdchips">${WD.map((w, i) => `<label class="wdchip"><input type="checkbox" data-wd="${i}" ${s.closedWeekdays.includes(i) ? 'checked' : ''}><span>${w}</span></label>`).join('')}</div>
    <div id="admCal">${calHTML(s)}</div>
  </section>

  <section class="panel adm-sec">
    <h2><span class="num">4</span>Pick-up times</h2>
    <p class="fine">Customers choose one of these at checkout.</p>
    <div id="admTimes" class="adm-times">${s.pickupTimes.map((t, i) => `<div class="adm-time"><input class="input" data-time="${i}" value="${esc(t)}" maxlength="40" aria-label="Pick-up time ${i + 1}"><button type="button" class="iconbtn" data-deltime="${i}" aria-label="Remove this time" ${s.pickupTimes.length < 2 ? 'disabled' : ''}>✕</button></div>`).join('')}</div>
    <button type="button" class="btn btn--ghost btn--sm" id="admAddTime" ${s.pickupTimes.length >= 20 ? 'disabled' : ''}>+ Add a time</button>
  </section>

  <section class="panel adm-sec">
    <h2><span class="num">✿</span>Ribbon colors</h2>
    <p class="fine">Colors customers can choose for the ₱${ADDONS.ribbon.price} ribbon add-on. Separate with commas. Leave empty and customers get "any color".</p>
    <input class="input" id="a-ribbons" value="${esc((s.ribbonColors || []).join(', '))}" maxlength="400" placeholder="e.g. Red, Pink, White, Gold">
  </section>

  <section class="panel adm-sec">
    <h2><span class="num">₱</span>Tips</h2>
    <label class="adm-item adm-item--plain"><span class="adm-item__name">Ask customers for a tip<i>${s.tips.enabled ? 'On: tip buttons show at checkout' : 'Off'}</i></span><input type="checkbox" class="sw" id="a-tipon" ${s.tips.enabled ? 'checked' : ''} aria-label="Ask customers for a tip"></label>
    <div class="field" style="margin-top:10px"><label for="a-tips">Tip amounts (₱, separated by commas)</label><input class="input" id="a-tips" value="${esc(s.tips.amounts.join(', '))}" maxlength="60" inputmode="numeric" placeholder="20, 50, 100"><span class="hint">Customers can also type their own amount with "Other".</span></div>
  </section>

  <section class="panel adm-sec">
    <h2><span class="num">5</span>Ordering rules</h2>
    <div class="adm-rule"><span>Order at least</span><div class="stepper"><button type="button" data-step="minLeadDays:-1" aria-label="Less">−</button><b id="v-lead">${s.minLeadDays}</b><button type="button" data-step="minLeadDays:1" aria-label="More">+</button></div><span>day${s.minLeadDays === 1 ? '' : 's'} before pick-up</span></div>
    <div class="adm-rule"><label for="a-cut">Last order time the day before</label><input class="input input--sm" type="time" id="a-cut" value="${esc(s.orderCutoff)}"><button type="button" class="linkbtn" id="a-cut-x" ${s.orderCutoff ? '' : 'hidden'}>No limit</button></div>
    <p class="fine adm-ex">${ruleExample(s)}</p>
    <div class="adm-rule"><span>Customers can book up to</span><div class="stepper"><button type="button" data-step="maxAheadDays:-7" aria-label="Less">−</button><b>${s.maxAheadDays}</b><button type="button" data-step="maxAheadDays:7" aria-label="More">+</button></div><span>days ahead</span></div>
  </section>

  <section class="panel adm-sec">
    <h2><span class="num">6</span>Pick-up place</h2>
    <div class="fields">
      <div class="field"><label for="a-place">Place name</label><input class="input" id="a-place" data-pick="place" value="${esc(s.pickup.place)}" maxlength="60"></div>
      <div class="field"><label for="a-city">City</label><input class="input" id="a-city" data-pick="city" value="${esc(s.pickup.city)}" maxlength="60"></div>
      <div class="field field--full"><label for="a-map">Google Maps pin link</label><input class="input" id="a-map" data-pick="mapUrl" type="url" inputmode="url" value="${esc(s.pickup.mapUrl)}" maxlength="500" placeholder="https://maps.app.goo.gl/…"><span class="hint">In Google Maps, tap the place → Share → Copy link, then paste it here. <a href="${esc(s.pickup.mapUrl)}" target="_blank" rel="noopener" id="a-map-test">Test the link ↗</a></span></div>
    </div>
  </section>

  <section class="panel adm-sec">
    <h2><span class="num">7</span>Announcement <span class="opt">(optional)</span></h2>
    <p class="fine">Shows as a small bar at the top of the website. Leave empty to hide it.</p>
    <textarea class="input" id="a-notice" rows="2" maxlength="200" placeholder="e.g. Christmas orders are open until Dec 20!">${esc(s.notice)}</textarea>
  </section>

  <div class="adm-save"><span id="admState" class="fine"></span><button class="btn" type="button" id="admSave">Save changes</button></div>`;
  bindAdminEvents(box);
  syncSave();
}
function ruleExample(s) {
  let first = draftEarliest(s); for (let i = 0; i < 60 && draftClosed(s, first); i++) first = addDays(first, 1);
  const nice = (ds) => new Date(ds + 'T00:00:00Z').toLocaleDateString('en-PH', { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'UTC' });
  return `Right now, the earliest pick-up a customer can choose is <b>${nice(first)}</b>.`;
}
function syncSave() {
  const b = $('#admSave'), st = $('#admState'); if (!b) return;
  const d = dirty(); b.disabled = !d || adm.busy || !adm.storage; st.textContent = d ? 'You have unsaved changes' : 'All changes saved ✓';
  st.classList.toggle('is-dirty', d);
}
function bindAdminEvents(box) {
  const s = adm.s;
  const rerender = () => { const y = scrollY; renderAdmin(box); window.scrollTo(0, y); };
  $('#admOut').onclick = () => { if (dirty() && !confirmLeave()) return; adm.pw = ''; adm.s = null; sstore.set('so_admin', ''); renderLogin(box); };
  $$('[data-wd]', box).forEach((c) => c.addEventListener('change', () => {
    const w = +c.dataset.wd; s.closedWeekdays = c.checked ? [...new Set([...s.closedWeekdays, w])] : s.closedWeekdays.filter((x) => x !== w);
    s.openDates = s.openDates.filter((d) => weekdayOf(d) !== w); // a fresh weekly rule replaces old one-off exceptions for that weekday
    $('#admCal').innerHTML = calHTML(s); syncSave();
  }));
  $('#admCal').addEventListener('click', (e) => {
    const b = e.target.closest('[data-day]'); if (!b) return; const d = b.dataset.day;
    const weekly = s.closedWeekdays.includes(weekdayOf(d));
    if (s.closedDates.includes(d)) s.closedDates = s.closedDates.filter((x) => x !== d);
    else if (weekly) s.openDates = s.openDates.includes(d) ? s.openDates.filter((x) => x !== d) : [...s.openDates, d].sort();
    else s.closedDates = [...s.closedDates, d].sort();
    $('#admCal').innerHTML = calHTML(s); syncSave();
    $(`#admCal [data-day="${d}"]`)?.focus();
  });
  $$('[data-time]', box).forEach((inp) => inp.addEventListener('input', () => { s.pickupTimes[+inp.dataset.time] = inp.value; syncSave(); }));
  $$('[data-deltime]', box).forEach((b) => b.addEventListener('click', () => { s.pickupTimes.splice(+b.dataset.deltime, 1); rerender(); }));
  $('#admAddTime').onclick = () => { s.pickupTimes.push(''); rerender(); const ins = $$('[data-time]', box); ins[ins.length - 1]?.focus(); };
  $$('[data-step]', box).forEach((b) => b.addEventListener('click', () => {
    const [k, n] = b.dataset.step.split(':'); const lim = k === 'minLeadDays' ? [0, 14] : [7, 180];
    s[k] = Math.min(lim[1], Math.max(lim[0], s[k] + +n)); rerender();
  }));
  $('#a-cut').addEventListener('change', (e) => { s.orderCutoff = e.target.value || ''; rerender(); });
  $('#a-cut-x').onclick = () => { s.orderCutoff = ''; rerender(); };
  $$('[data-pick]', box).forEach((inp) => inp.addEventListener('input', () => { s.pickup[inp.dataset.pick] = inp.value.trim(); if (inp.dataset.pick === 'mapUrl') $('#a-map-test').href = inp.value.trim(); syncSave(); }));
  $('#a-notice').addEventListener('input', (e) => { s.notice = e.target.value; syncSave(); });
  $('#a-tipon').addEventListener('change', (e) => { s.tips.enabled = e.target.checked; rerender(); });
  $('#a-tips').addEventListener('input', (e) => { const a = e.target.value.split(',').map((x) => Math.round(+x.replace(/[^\d.]/g, ''))).filter((x) => x > 0); if (a.length) s.tips.amounts = a; syncSave(); });
  $('#a-ribbons').addEventListener('input', (e) => { s.ribbonColors = e.target.value.split(',').map((x) => x.trim()).filter(Boolean); syncSave(); });
  $$('[data-addonprice]', box).forEach((inp) => inp.addEventListener('input', () => { const n = Math.round(+inp.value); if (inp.value !== '' && n >= 0) s.addonPrices[inp.dataset.addonprice] = n; syncSave(); }));
  $('#a-req').addEventListener('change', (e) => { s.requirePayment = e.target.checked; rerender(); });
  $$('[data-pay]', box).forEach((inp) => inp.addEventListener('input', () => { s.payment[inp.dataset.pay] = inp.value.trim(); syncSave(); }));
  $('#a-qr').addEventListener('change', async (e) => {
    const fl = e.target.files?.[0]; if (!fl) return;
    try { adm.qrImage = await shrinkImage(fl, 900, 'image/png'); rerender(); } catch { toast('Couldn’t open that image. Please try a PNG or JPG.'); }
  });
  $('#a-qr-x')?.addEventListener('click', () => { adm.qrImage = s.payment.qr ? 'remove' : null; rerender(); });
  $('#admSave').onclick = () => admSave(box);
  bindProducts(box);
  bindAdminWall();
}
async function admSave(box, okMsg = 'Saved! Customers see the changes right away.') {
  const s = adm.s, rerender = () => { const y = scrollY; renderAdmin(box); window.scrollTo(0, y); };
  {
    const b = $('#admSave'); adm.busy = true; b.disabled = true; b.textContent = 'Saving…';
    s.pickupTimes = s.pickupTimes.map((t) => t.trim()).filter(Boolean);
    if (s.pickup.mapUrl && !/^https:\/\//.test(s.pickup.mapUrl)) { adm.busy = false; b.textContent = 'Save changes'; syncSave(); toast('The map link should start with https://'); $('#a-map').focus(); return false; }
    const bad = s.extraProducts.find((x) => !x.name.trim() || !(x.price4 > 0));
    if (bad) { adm.busy = false; b.textContent = 'Save changes'; syncSave(); toast('Each new product needs a name and a price.'); return false; }
    let j; try { j = await adminCall('save', { settings: s, productImages: adm.pimgs, ...(adm.qrImage ? { qrImage: adm.qrImage } : {}) }); } catch { j = { ok: false, error: 'Can’t reach the website right now. Please try again.' }; }
    adm.busy = false; b.textContent = 'Save changes';
    if (!j.ok) { if (/password/i.test(j.error || '')) { adm.pw = ''; sstore.set('so_admin', ''); } toast(j.error || 'Couldn’t save. Please try again.'); syncSave(); return false; }
    adm.qrImage = null; adm.pimgs = {};
    adm.s = cleanSettings(j.settings); adm.saved = JSON.stringify(adm.s); adm.updatedAt = j.settings.updatedAt;
    applySettings(adm.s); store.set('so_settings', adm.s); showNotice();
    rerender(); toast(okMsg); return true;
  }
}
/* ───── owner page: Products (list + edit sheet) ───── */
const LABEL_IDEAS = ['New', 'Hot', 'Popular', 'Bestseller', 'Limited', 'Holiday special'];
const pm = { filter: 'all', q: '', cat: 'all' };
const pmVariants = (x) => (x.category === 'cookies' && x.price8 ? [{ id: '4', label: 'Box of 4', price: x.price4 }, { id: '8', label: 'Box of 8', price: x.price8 }] : [{ id: 'box', label: x.category === 'cookies' ? 'Box of 4' : 'Per box', price: x.price4 }]);
function admPhotoSrc(s, id, sm = true) {
  const up = adm.pimgs[id]; if (up && up !== 'remove') return up;
  const b = BASE_PRODUCTS.find((p) => p.id === id);
  if (b) return up !== 'remove' && s.photos[id] ? `/api/pimg?id=${id}&v=${s.photos[id]}` : b.img ? img(b.img, sm) : null;
  const x = s.extraProducts.find((e) => e.id === id);
  return x?.photo && up !== 'remove' ? `/api/pimg?id=${id}&v=${x.photo}` : null;
}
// every product (built-in + added) as the owner's draft sees it, in menu order
function admProducts(s) {
  const base = Object.fromEntries(BASE_PRODUCTS.map((p) => [p.id, p])), extra = Object.fromEntries(s.extraProducts.map((x) => [x.id, x]));
  return productOrder(s).map((id) => {
    const b = base[id], x = extra[id];
    if (b) return { id, base: true, sampler: !!b.sampler, category: b.category, art: b.art, name: s.names[id] || BASE_TEXT[id].name, desc: s.descs[id] || BASE_TEXT[id].desc,
      variants: b.variants.map((v) => ({ id: v.id, label: v.label, price: s.prices[id][v.id] })), badge: s.badges[id] || '', soldOut: !!s.soldOut[id], hidden: !!s.hidden[id], photo: admPhotoSrc(s, id), ownPhoto: !!s.photos[id] };
    if (x) return { id, base: false, category: x.category, art: x.category === 'bars' ? 'biscoff' : 'butter', name: x.name, desc: x.desc, variants: pmVariants(x), badge: x.badge || '', soldOut: !!x.soldOut, hidden: !!x.hidden, photo: admPhotoSrc(s, id), ownPhoto: !!x.photo, x };
    return null;
  }).filter(Boolean);
}
const pmSectionHTML = () => `<section class="panel adm-sec pm" id="pmSec">
    <div class="pm-head"><h2><span class="num">1</span>Products</h2><button type="button" class="btn btn--sm" id="pmAdd">+ Add product</button></div>
    <p class="fine">Tap a product to change its photo, name, price or description. Use the switch when something is sold out.</p>
    <div class="pm-stats" id="pmStats" role="group" aria-label="Show"></div>
    <div class="pm-tools">
      <label class="pm-search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg><input class="input" id="pmQ" type="search" placeholder="Find a product" value="${esc(pm.q)}" aria-label="Find a product"></label>
      <select class="input" id="pmCat" aria-label="Type"><option value="all">All types</option><option value="cookies" ${pm.cat === 'cookies' ? 'selected' : ''}>Cookies</option><option value="bars" ${pm.cat === 'bars' ? 'selected' : ''}>Bars</option></select>
    </div>
    <div id="pmList" class="pm-list"></div>
  </section>`;
function pmRowHTML(p) {
  return `<div class="pm-row${p.hidden ? ' is-hidden' : ''}${p.soldOut && !p.hidden ? ' is-out' : ''}">
    <button type="button" class="pm-row__main" data-pmedit="${p.id}" aria-label="Edit ${esc(p.name)}">
      <span class="pm-thumb">${p.photo ? `<img src="${esc(p.photo)}" alt="" loading="lazy">` : artSVG(p.art)}</span>
      <span class="pm-row__txt"><b>${esc(p.name)}</b><span>${p.variants.map((v) => peso(v.price)).join(' / ')}${p.badge ? ` <i class="pm-tag">${esc(p.badge)}</i>` : ''}${p.soldOut && !p.hidden ? ' <i class="pm-tag pm-tag--out">Sold out</i>' : ''}</span></span>
      <svg class="pm-row__go" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>
    </button>
    ${p.hidden ? `<span class="pm-row__side"><i class="pm-tag pm-tag--hidden">Hidden</i><button type="button" class="linkbtn" data-pmshow="${p.id}">Show again</button></span>`
      : `<label class="pm-sw" title="${p.soldOut ? 'Sold out' : 'Available'}"><input type="checkbox" class="sw" data-pmavail="${p.id}" ${p.soldOut ? '' : 'checked'} aria-label="${esc(p.name)} available"></label>`}
  </div>`;
}
function pmRender() {
  const all = admProducts(adm.s), q = pm.q.trim().toLowerCase();
  const n = { all: all.length, soldout: all.filter((p) => p.soldOut && !p.hidden).length, hidden: all.filter((p) => p.hidden).length };
  $('#pmStats').innerHTML = [['all', 'All products'], ['soldout', 'Sold out'], ['hidden', 'Hidden']].map(([k, l]) => `<button type="button" class="pm-stat pm-stat--${k}${pm.filter === k ? ' is-on' : ''}" data-pmf="${k}" aria-pressed="${pm.filter === k}"><b>${n[k]}</b><span>${l}</span></button>`).join('');
  const list = all.filter((p) => (pm.filter === 'all' || (pm.filter === 'soldout' ? p.soldOut && !p.hidden : p.hidden)) && (pm.cat === 'all' || p.category === pm.cat) && (!q || p.name.toLowerCase().includes(q)));
  const groups = [['cookies', 'Cookies'], ['bars', 'Bars']].map(([c, l]) => [l, list.filter((p) => p.category === c)]).filter((g) => g[1].length);
  $('#pmList').innerHTML = groups.length ? groups.map(([l, ps]) => `<div class="pm-group"><h3>${l} <span>${ps.length}</span></h3>${ps.map(pmRowHTML).join('')}</div>`).join('')
    : `<p class="pm-empty">Nothing here. <button type="button" class="linkbtn" data-pmclear>Show all products</button></p>`;
}
function bindProducts(box) {
  const s = adm.s; pmRender();
  $('#pmQ').addEventListener('input', (e) => { pm.q = e.target.value; pmRender(); });
  $('#pmCat').addEventListener('change', (e) => { pm.cat = e.target.value; pmRender(); });
  $('#pmAdd').onclick = () => pmOpen(box, null);
  $('#pmSec').addEventListener('click', (e) => {
    const f = e.target.closest('[data-pmf]'); if (f) { pm.filter = f.dataset.pmf; pmRender(); return; }
    if (e.target.closest('[data-pmclear]')) { pm.filter = 'all'; pm.q = ''; pm.cat = 'all'; $('#pmQ').value = ''; $('#pmCat').value = 'all'; pmRender(); return; }
    const ed = e.target.closest('[data-pmedit]'); if (ed) { pmOpen(box, ed.dataset.pmedit); return; }
    const sh = e.target.closest('[data-pmshow]'); if (sh) { pmSetStatus(sh.dataset.pmshow, { hidden: false }); admSave(box, 'It’s back on the menu ✓'); }
  });
  $('#pmSec').addEventListener('change', (e) => {
    const c = e.target.closest('[data-pmavail]'); if (!c) return;
    pmSetStatus(c.dataset.pmavail, { soldOut: !c.checked });
    if (adm.storage) admSave(box, c.checked ? 'Marked as available ✓' : 'Marked as sold out ✓'); else { pmRender(); syncSave(); }
  });
}
function pmSetStatus(id, { soldOut, hidden }) {
  const s = adm.s, x = s.extraProducts.find((e) => e.id === id);
  if (x) { if (soldOut !== undefined) x.soldOut = soldOut; if (hidden !== undefined) x.hidden = hidden; return; }
  if (soldOut !== undefined) s.soldOut[id] = soldOut;
  if (hidden !== undefined) { if (hidden) s.hidden[id] = true; else delete s.hidden[id]; }
}
const pmOrdinal = (n) => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : { 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th');

function pmOpen(box, id) {
  const s = adm.s, isNew = !id;
  const cur = isNew ? null : admProducts(s).find((p) => p.id === id); if (!isNew && !cur) return;
  const pid = isNew ? 'c-' + Math.random().toString(36).slice(2, 10) : id;
  const d = isNew ? { id: pid, base: false, category: 'cookies', name: '', desc: '', badge: 'New', status: 'available', price4: '', price8: '' }
    : { id, base: cur.base, sampler: cur.sampler, category: cur.category, art: cur.art, name: cur.name, desc: cur.desc, badge: cur.badge, status: cur.hidden ? 'hidden' : cur.soldOut ? 'soldout' : 'available',
      prices: Object.fromEntries(cur.variants.map((v) => [v.id, v.price])), price4: cur.x?.price4 ?? '', price8: cur.x?.price8 ?? '' };
  let photo; // undefined = keep, data URL = new photo, 'remove' = back to the original / no photo
  const orderFor = (cat) => productOrder({ ...s, order: (order || s.order).filter((x) => x !== pid || !isNew), extraProducts: isNew ? [...s.extraProducts, { id: pid, category: cat }] : s.extraProducts });
  let order = null; order = orderFor(d.category);
  const snap = () => JSON.stringify([d, photo, order]); const start = snap();
  const catOf = (oid) => (oid === pid ? d.category : (BASE_PRODUCTS.find((p) => p.id === oid) || s.extraProducts.find((x) => x.id === oid))?.category);
  const siblings = () => order.filter((oid) => catOf(oid) === d.category);
  const curPhoto = () => (photo && photo !== 'remove' ? photo : photo === 'remove' ? (d.base ? (BASE_PRODUCTS.find((p) => p.id === pid).img ? img(BASE_PRODUCTS.find((p) => p.id === pid).img) : null) : null) : (isNew ? null : admPhotoSrc(s, pid, false)));
  const hasOwn = () => (photo ? photo !== 'remove' : !!cur?.ownPhoto);
  const variantsOf = () => (d.base ? cur.variants.map((v) => ({ ...v, price: Math.round(+d.prices[v.id]) || 0 })) : pmVariants({ category: d.category, price4: Math.round(+d.price4) || 0, price8: Math.round(+d.price8) || 0 }));

  const el = document.createElement('div'); el.className = 'pm-sheet'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'pmT');
  document.body.appendChild(el); document.documentElement.classList.add('pm-lock');
  const lastFocus = document.activeElement;
  const formHTML = () => {
    const sib = siblings(), pos = sib.indexOf(pid), ph = curPhoto();
    return `
    <div class="pm-drop${ph ? ' has-photo' : ''}" id="pmDrop">
      <span class="pm-drop__img">${ph ? `<img src="${esc(ph)}" alt="">` : artSVG(d.art || (d.category === 'bars' ? 'biscoff' : 'butter'))}</span>
      <div class="pm-drop__act"><span class="pm-drop__hint">${ph ? 'Drop a new photo here, or' : 'Drop a photo here, or'}</span>
        <label class="btn btn--sm" for="pmFile">${ph ? 'Change photo' : 'Take or choose a photo'}<input type="file" id="pmFile" accept="image/*" hidden></label>
        ${hasOwn() ? `<button type="button" class="linkbtn" id="pmPhotoX">${d.base ? 'Use the original photo' : 'Remove photo'}</button>` : ''}</div>
    </div>
    <div class="field"><label for="pmName">Name</label><input class="input" id="pmName" maxlength="60" value="${esc(d.name)}" placeholder="e.g. Matcha White Choco"><span class="err" id="pmNameErr"></span></div>
    <div class="field"><label for="pmDesc">Description <span class="pm-count" id="pmDescN">${d.desc.length}/300</span></label><textarea class="input" id="pmDesc" rows="3" maxlength="300" placeholder="One or two short lines about the taste and what's in it">${esc(d.desc)}</textarea></div>
    ${d.base ? '' : `<div class="field"><span class="label-like">Type</span><div class="pm-seg" role="radiogroup" aria-label="Type">${[['cookies', 'Cookie'], ['bars', 'Bar']].map(([v, l]) => `<button type="button" role="radio" aria-checked="${d.category === v}" class="${d.category === v ? 'is-on' : ''}" data-pmcat="${v}">${l}</button>`).join('')}</div></div>`}
    <div class="field"><span class="label-like">Price</span><div class="pm-prices">${d.base
      ? cur.variants.map((v) => `<label><span>${esc(v.label.replace(/ \(.*\)/, ''))}</span><span class="pm-peso"><i>₱</i><input class="input" type="number" inputmode="numeric" min="1" step="1" data-pmprice="${v.id}" value="${esc(d.prices[v.id])}"></span></label>`).join('')
      : `<label><span>${d.category === 'cookies' ? 'Box of 4' : 'Per box'}</span><span class="pm-peso"><i>₱</i><input class="input" type="number" inputmode="numeric" min="1" step="1" data-pmprice="price4" value="${esc(d.price4)}" placeholder="0"></span></label>
         ${d.category === 'cookies' ? `<label><span>Box of 8 <span class="opt">(optional)</span></span><span class="pm-peso"><i>₱</i><input class="input" type="number" inputmode="numeric" min="1" step="1" data-pmprice="price8" value="${esc(d.price8)}" placeholder="—"></span></label>` : ''}`}</div><span class="err" id="pmPriceErr"></span></div>
    <div class="field"><span class="label-like">Label on the photo <span class="opt">(optional)</span></span>
      <div class="pm-chips">${['', ...LABEL_IDEAS].map((l) => `<button type="button" class="pm-chip${d.badge === l ? ' is-on' : ''}" data-pmlabel="${esc(l)}" aria-pressed="${d.badge === l}">${l ? esc(l) : 'None'}</button>`).join('')}</div>
      <input class="input input--sm pm-ownlabel" id="pmLabel" maxlength="24" value="${esc(LABEL_IDEAS.includes(d.badge) ? '' : d.badge)}" placeholder="…or type your own label" aria-label="Your own label"></div>
    <div class="field"><span class="label-like">Status</span><div class="pm-seg pm-seg--3" role="radiogroup" aria-label="Status">${[['available', 'Available'], ['soldout', 'Sold out'], ['hidden', 'Hidden']].map(([v, l]) => `<button type="button" role="radio" aria-checked="${d.status === v}" class="${d.status === v ? 'is-on' : ''} pm-seg--${v}" data-pmstatus="${v}">${l}</button>`).join('')}</div>
      <span class="hint">${d.status === 'hidden' ? 'Hidden: not on the menu at all, until you show it again.' : d.status === 'soldout' ? 'Sold out: still on the menu, but customers can’t order it.' : 'Customers can see and order it.'}</span></div>
    <div class="field"><span class="label-like">Place on the menu</span><div class="pm-move"><button type="button" class="btn btn--ghost btn--sm" data-pmmove="-1" ${pos <= 0 ? 'disabled' : ''}>↑ Move up</button><button type="button" class="btn btn--ghost btn--sm" data-pmmove="1" ${pos >= sib.length - 1 ? 'disabled' : ''}>↓ Move down</button><span class="hint">${pmOrdinal(pos + 1)} of ${sib.length} ${d.category === 'bars' ? 'bars' : 'cookies'}</span></div></div>`;
  };
  const previewHTML = () => {
    const ph = curPhoto(), v = variantsOf();
    const p = { id: 'pm-preview', name: d.name || 'Product name', short: d.desc, desc: d.desc, category: d.category, badge: d.badge || null, soldOut: d.status === 'soldout', sampler: false, variants: v, photo: ph, img: null, art: d.art || (d.category === 'bars' ? 'biscoff' : 'butter'), gallery: [] };
    return (d.status === 'hidden' ? '<p class="pm-prev__note">Hidden products don’t show on the menu.</p>' : '') + cardHTML(p, 0);
  };
  el.innerHTML = `<div class="pm-sheet__back" data-pmclose></div>
    <div class="pm-sheet__card">
      <header class="pm-sheet__head"><h2 id="pmT">${isNew ? 'Add a product' : 'Edit product'}</h2><button type="button" class="linkbtn" data-pmclose>Close</button></header>
      <div class="pm-sheet__body">
        <div class="pm-form" id="pmForm">${formHTML()}</div>
        <aside class="pm-prev"><span class="label-like">How customers will see it</span><div class="pm-prev__card${d.status === 'hidden' ? ' is-hidden' : ''}" id="pmPrev" inert>${previewHTML()}</div></aside>
      </div>
      <footer class="pm-sheet__foot"><button type="button" class="btn" id="pmSave">${isNew ? 'Add to menu' : 'Save changes'}</button><button type="button" class="btn btn--ghost" data-pmclose>Cancel</button>
        ${!isNew && !d.base ? '<button type="button" class="linkbtn pm-del" id="pmDel">Delete product</button>' : ''}</footer>
    </div>`;
  const form = $('#pmForm', el), prev = $('#pmPrev', el);
  const paintPrev = () => { prev.innerHTML = previewHTML(); prev.classList.toggle('is-hidden', d.status === 'hidden'); };
  const paint = (focusSel) => { const y = form.scrollTop, bodyY = $('.pm-sheet__body', el).scrollTop; form.innerHTML = formHTML(); paintPrev(); form.scrollTop = y; $('.pm-sheet__body', el).scrollTop = bodyY; if (focusSel) $(focusSel, el)?.focus(); };
  const setPhoto = async (fl) => {
    if (!fl || !/^image\//.test(fl.type)) { toast('Please choose a photo (JPG or PNG).'); return; }
    try { photo = await shrinkImage(fl, 1200); paint(); } catch { toast('Couldn’t open that photo. Please try a JPG or PNG.'); }
  };
  const close = (force) => {
    if (!force && snap() !== start && !confirm('Close without saving your changes?')) return;
    document.removeEventListener('keydown', onKey); el.remove(); document.documentElement.classList.remove('pm-lock'); lastFocus?.focus?.();
  };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  el.addEventListener('click', (e) => {
    if (e.target.closest('[data-pmclose]')) return close();
    const c = e.target.closest('[data-pmcat]'); if (c) { d.category = c.dataset.pmcat; d.art = d.category === 'bars' ? 'biscoff' : 'butter'; if (d.category === 'bars') d.price8 = ''; order = orderFor(d.category); return paint(); }
    const l = e.target.closest('[data-pmlabel]'); if (l) { d.badge = l.dataset.pmlabel; return paint(); }
    const st = e.target.closest('[data-pmstatus]'); if (st) { d.status = st.dataset.pmstatus; return paint(); }
    const mv = e.target.closest('[data-pmmove]'); if (mv) {
      const sib = siblings(), i = sib.indexOf(pid), other = sib[i + +mv.dataset.pmmove]; if (!other) return;
      const a = order.indexOf(pid), b = order.indexOf(other); [order[a], order[b]] = [order[b], order[a]];
      return paint(`[data-pmmove="${mv.dataset.pmmove}"]:not([disabled])`);
    }
    if (e.target.closest('#pmPhotoX')) { photo = 'remove'; return paint(); }
  });
  el.addEventListener('input', (e) => {
    const t = e.target;
    if (t.id === 'pmName') { d.name = t.value; $('#pmNameErr', el).textContent = ''; }
    else if (t.id === 'pmDesc') { d.desc = t.value; $('#pmDescN', el).textContent = `${t.value.length}/300`; }
    else if (t.id === 'pmLabel') { d.badge = t.value.trim(); $$('[data-pmlabel]', el).forEach((b) => { const on = b.dataset.pmlabel === d.badge; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', on); }); }
    else if (t.dataset.pmprice) { const k = t.dataset.pmprice; if (d.base) d.prices[k] = t.value; else d[k] = t.value; $('#pmPriceErr', el).textContent = ''; }
    else return;
    paintPrev();
  });
  el.addEventListener('change', (e) => { if (e.target.id === 'pmFile') setPhoto(e.target.files?.[0]); });
  el.addEventListener('dragover', (e) => { if (!e.target.closest('#pmDrop')) return; e.preventDefault(); $('#pmDrop', el).classList.add('is-over'); });
  el.addEventListener('dragleave', (e) => { if (e.target.closest('#pmDrop')) $('#pmDrop', el).classList.remove('is-over'); });
  el.addEventListener('drop', (e) => { if (!e.target.closest('#pmDrop')) return; e.preventDefault(); setPhoto(e.dataTransfer?.files?.[0]); });
  $('#pmDel', el)?.addEventListener('click', async () => {
    if (!confirm(`Delete “${cur.name}”? Customers won't see it anymore. (To take it off the menu for a while, choose “Hidden” instead.)`)) return;
    s.extraProducts = s.extraProducts.filter((x) => x.id !== pid); s.order = s.order.filter((x) => x !== pid); delete adm.pimgs[pid];
    close(true); await admSave(box, 'Product deleted');
  });
  $('#pmSave', el).addEventListener('click', async () => {
    const name = d.name.trim(), v = variantsOf();
    if (!name) { $('#pmNameErr', el).textContent = 'Please give it a name.'; $('#pmName', el).focus(); return; }
    const bad = d.base ? v.find((x) => !(x.price > 0)) : !(Math.round(+d.price4) > 0) || (d.price8 !== '' && d.price8 != null && !(Math.round(+d.price8) > 0));
    if (bad) { $('#pmPriceErr', el).textContent = 'Please type a price (numbers only).'; $('[data-pmprice]', el)?.focus(); return; }
    const badge = d.badge.trim(), soldOut = d.status === 'soldout', hidden = d.status === 'hidden';
    if (d.base) {
      const t = BASE_TEXT[pid];
      if (name !== t.name) s.names[pid] = name; else delete s.names[pid];
      if (d.desc.trim() && d.desc.trim() !== t.desc) s.descs[pid] = d.desc.trim(); else delete s.descs[pid];
      for (const x of v) s.prices[pid][x.id] = x.price;
      s.badges[pid] = badge; s.soldOut[pid] = soldOut; if (hidden) s.hidden[pid] = true; else delete s.hidden[pid];
    } else {
      const x = { id: pid, name, category: d.category, desc: d.desc.trim(), price4: Math.round(+d.price4), price8: d.category === 'cookies' && Math.round(+d.price8) > 0 ? Math.round(+d.price8) : null, badge, soldOut, hidden, photo: cur?.x?.photo || '' };
      const i = s.extraProducts.findIndex((e) => e.id === pid); if (i < 0) s.extraProducts.push(x); else s.extraProducts[i] = x;
    }
    s.order = order.slice();
    if (photo) adm.pimgs[pid] = photo;
    const b = $('#pmSave', el); b.disabled = true; b.textContent = 'Saving…';
    if (!adm.storage) { close(true); pmRender(); syncSave(); return; }
    const ok = await admSave(box, isNew ? `${name} is on the menu ✓` : 'Saved! Customers see it right away ✓');
    if (ok || !document.body.contains(el)) close(true); else { b.disabled = false; b.textContent = isNew ? 'Add to menu' : 'Save changes'; }
  });
  setTimeout(() => (isNew ? $('#pmName', el) : $('.pm-sheet__head h2', el))?.focus(), 30);
  $('.pm-sheet__head h2', el).tabIndex = -1;
}

const confirmLeave = () => window.confirm('You have unsaved changes. Leave without saving?');

/* announcement bar */
function showNotice() {
  let bar = $('#notice');
  if (!SHOP.notice) { bar?.remove(); return; }
  if (!bar) { bar = document.createElement('div'); bar.id = 'notice'; bar.className = 'notice'; bar.setAttribute('role', 'status'); document.body.prepend(bar); }
  bar.textContent = SHOP.notice;
}
/* load the owner's latest settings (cached copy first so the page shows instantly) */
async function loadShopSettings() {
  const cached = store.get('so_settings', null);
  if (window.SO_DEMO) { const d = demoSettings(); if (d) applySettings(d); return false; }
  if (cached) applySettings(cached);
  try {
    const res = await fetch('/api/settings', { signal: AbortSignal.timeout(4000) });
    const j = await res.json();
    if (!j.ok) return false;
    const fresh = cleanSettings(j.settings);
    const changed = JSON.stringify(fresh) !== JSON.stringify(cached && cleanSettings(cached));
    applySettings(fresh); store.set('so_settings', fresh);
    return changed;
  } catch { return false; }
}
function refreshCart() { const before = cart.items.length; cart.items = cart.items.filter((i) => findVariant(findProduct(i.pid), i.vid) && !findProduct(i.pid).soldOut); if (cart.items.length !== before) cart.save(); }



/* ───────────── Photo Dump + Sweet Confessions ───────────── */
const WALL = { data: null, at: 0 };
async function loadWall(force) {
  if (!force && WALL.data && Date.now() - WALL.at < 30000) return WALL.data;
  try {
    const r = await fetch('/api/wall', { signal: AbortSignal.timeout(8000) }); const j = await r.json();
    if (j.ok) { WALL.data = { photos: j.photos || [], reviews: j.reviews || [] }; WALL.at = Date.now(); }
  } catch {}
  return WALL.data || { photos: [], reviews: [] };
}
const wimg = (id) => `/api/wimg?id=${encodeURIComponent(id)}`;
const tilt = (id, max = 5) => { let h = 0; for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) | 0; return ((Math.abs(h) % (max * 20 + 1)) / 10 - max).toFixed(1); };
const shortDate = (iso) => { try { return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Manila' }); } catch { return ''; } };

// Photo Dump
function viewPhotos() {
  return `<div class="view wrap dump">
    <div class="pagehead"><h1 class="eyebrow">Photo Dump</h1>
      <p class="lead" style="margin-top:12px">Little moments from our kitchen: new batches, packed boxes and treats on their way to you.</p></div>
    <div class="dump__wall" id="dumpWall" aria-busy="true">${[0, 1, 2, 3].map((i) => `<figure class="pol pol--ghost" style="--r:${[-3, 2, -1, 3][i]}deg"><span class="pol__img"></span><img class="pol__frame" src="/assets/wall/polaroid.webp" alt=""></figure>`).join('')}</div>
  </div>`;
}
const polHTML = (p, i) => `<figure class="pol" style="--r:${tilt(p.id, 4)}deg;--d:${Math.min(i, 12) * 70}ms">
    <button type="button" class="pol__btn" data-pol="${i}" aria-label="Open photo${p.caption ? ': ' + esc(p.caption) : ''}">
      <span class="pol__img"><img src="${wimg(p.id)}" alt="" loading="${i < 6 ? 'eager' : 'lazy'}" decoding="async"></span>
      <img class="pol__frame" src="/assets/wall/polaroid.webp" alt="">
      <figcaption class="pol__cap">${p.caption ? esc(p.caption) : '&nbsp;'}<small>${shortDate(p.at)}</small></figcaption>
    </button></figure>`;
async function bindPhotos() {
  const { photos } = await loadWall(), el = $('#dumpWall'); if (!el) return;
  el.removeAttribute('aria-busy');
  if (!photos.length) { el.innerHTML = `<figure class="pol pol--empty" style="--r:-2deg"><span class="pol__img"><span>Photos coming soon ♡</span></span><img class="pol__frame" src="/assets/wall/polaroid.webp" alt=""><figcaption class="pol__cap">the oven is still warm</figcaption></figure>`; return; }
  el.innerHTML = photos.map(polHTML).join('');
  el.addEventListener('click', (e) => { const b = e.target.closest('[data-pol]'); if (b) lightbox(photos.map((p) => ({ src: wimg(p.id), cap: p.caption, sub: shortDate(p.at) })), +b.dataset.pol); });
}

// big photo viewer (Photo Dump + review photos)
function lightbox(items, start = 0) {
  let i = start;
  const el = document.createElement('div'); el.className = 'lb'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Photo');
  el.innerHTML = `<div class="lb__back" data-lbx></div>
    <figure class="lb__fig"><img id="lbImg" alt=""><figcaption class="lb__cap" id="lbCap"></figcaption></figure>
    ${items.length > 1 ? '<button type="button" class="lb__nav lb__nav--prev" data-lbgo="-1" aria-label="Previous photo">‹</button><button type="button" class="lb__nav lb__nav--next" data-lbgo="1" aria-label="Next photo">›</button>' : ''}
    <button type="button" class="lb__x" data-lbx aria-label="Close">✕</button>
    ${items.length > 1 ? '<span class="lb__n" id="lbN"></span>' : ''}`;
  document.body.appendChild(el); document.documentElement.classList.add('pm-lock');
  const last = document.activeElement;
  const show = () => { const it = items[i]; $('#lbImg', el).src = it.src; $('#lbCap', el).innerHTML = (it.cap ? esc(it.cap) : '') + (it.sub ? `<small>${esc(it.sub)}</small>` : ''); const n = $('#lbN', el); if (n) n.textContent = `${i + 1} / ${items.length}`; };
  const go = (d) => { i = (i + d + items.length) % items.length; show(); };
  const close = () => { document.removeEventListener('keydown', key); el.remove(); document.documentElement.classList.remove('pm-lock'); last?.focus?.(); };
  const key = (e) => { if (e.key === 'Escape') close(); else if (e.key === 'ArrowRight' && items.length > 1) go(1); else if (e.key === 'ArrowLeft' && items.length > 1) go(-1); };
  document.addEventListener('keydown', key);
  el.addEventListener('click', (e) => { if (e.target.closest('[data-lbx]')) close(); const g = e.target.closest('[data-lbgo]'); if (g) go(+g.dataset.lbgo); });
  let x0 = null; el.addEventListener('pointerdown', (e) => { x0 = e.clientX; }); el.addEventListener('pointerup', (e) => { if (x0 != null && items.length > 1 && Math.abs(e.clientX - x0) > 50) go(e.clientX < x0 ? 1 : -1); x0 = null; });
  show(); $('.lb__x', el).focus();
}

// Sweet Confessions
const starsHTML = (n, cls = '') => Array.from({ length: 5 }, (_, k) => `<img class="cnote__star${cls}${k >= n ? ' is-empty' : ''}" src="/assets/wall/star2${k >= n ? '-empty' : ''}.webp" alt="">`).join('');
function noteHTML(r, i) {
  return `<article class="cnote" style="--r:${tilt(r.id, 1.6)}deg;--d:${Math.min(i, 10) * 70}ms">
    <div class="cnote__paper" aria-hidden="true"><i class="cnote__top"></i><i class="cnote__mid"></i><i class="cnote__bot"></i></div>
    <div class="cnote__stars" role="img" aria-label="${r.stars} out of 5 stars">${starsHTML(r.stars)}</div>
    ${r.photo ? `<button type="button" class="cnote__photo" data-nphoto="${esc(r.id)}" aria-label="See the photo from ${esc(r.name || 'this customer')}"><img src="${wimg(r.id)}" alt="" loading="lazy"></button>` : ''}
    <img class="cnote__clip" src="/assets/wall/clip.webp" alt="" aria-hidden="true">
    <div class="cnote__body">${r.photo ? '<span class="cnote__float" aria-hidden="true"></span>' : ''}
      <p class="cnote__text">${esc(r.text).replace(/\n/g, '<br>')}</p>
      <p class="cnote__sig">— ${r.name ? esc(r.name) : 'Anonymous'}<small>${shortDate(r.at)}</small></p></div>
  </article>`;
}
function viewConfessions() {
  return `<div class="view wrap conf">
    <div class="pagehead conf__head"><div><h1 class="eyebrow">Sweet Confessions</h1>
      <p class="lead" style="margin-top:12px">Had one of our treats? Tell us everything. We read every single note ♡</p></div>
      <div class="conf__sum" id="confSum"><button type="button" class="btn" id="confWrite">Write a confession</button></div></div>
    <div class="cnotes" id="notesWall" aria-busy="true"><p class="conf__loading">Opening the mailbox…</p></div>
  </div>`;
}
async function bindConfessions() {
  $('#confWrite').onclick = () => confessForm();
  const { reviews } = await loadWall(), el = $('#notesWall'); if (!el) return;
  el.removeAttribute('aria-busy');
  if (reviews.length) {
    const avg = reviews.reduce((s, r) => s + r.stars, 0) / reviews.length;
    $('#confSum').insertAdjacentHTML('afterbegin', `<div class="conf__avg"><span class="conf__stars">${starsHTML(Math.round(avg), ' cnote__star--sm')}</span><b>${avg.toFixed(1)}</b><span>from ${reviews.length} confession${reviews.length === 1 ? '' : 's'}</span></div>`);
  }
  el.innerHTML = reviews.length ? reviews.map(noteHTML).join('')
    : `<article class="cnote cnote--empty" style="--r:-1deg"><div class="cnote__paper" aria-hidden="true"><i class="cnote__top"></i><i class="cnote__mid"></i><i class="cnote__bot"></i></div><img class="cnote__clip" src="/assets/wall/clip.webp" alt="" aria-hidden="true"><div class="cnote__body"><p class="cnote__text">No confessions yet... be the very first one to tell us how your cookies were!</p><p class="cnote__sig">— Simple Oven</p></div></article>`;
  el.addEventListener('click', (e) => { const b = e.target.closest('[data-nphoto]'); if (!b) return; const r = reviews.find((x) => x.id === b.dataset.nphoto); lightbox([{ src: wimg(r.id), cap: r.name ? `from ${r.name}` : 'from Anonymous', sub: shortDate(r.at) }]); });
}
function confessForm() {
  const d = { stars: 0, text: '', name: store.get('so_conf_name', ''), anonymous: false, photo: '' };
  const el = document.createElement('div'); el.className = 'pm-sheet cf'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'cfT');
  document.body.appendChild(el); document.documentElement.classList.add('pm-lock');
  const last = document.activeElement;
  el.innerHTML = `<div class="pm-sheet__back" data-cfx></div>
    <div class="pm-sheet__card cf__card">
      <header class="pm-sheet__head"><h2 id="cfT">Write a confession</h2><button type="button" class="linkbtn" data-cfx>Close</button></header>
      <form class="pm-sheet__body cf__body" id="cfForm" novalidate>
        <div class="cnote cnote--form">
          <div class="cnote__paper" aria-hidden="true"><i class="cnote__top"></i><i class="cnote__mid"></i><i class="cnote__bot"></i></div>
          <div class="cnote__stars cf__stars" role="radiogroup" aria-label="Your rating">${[1, 2, 3, 4, 5].map((n) => `<button type="button" role="radio" aria-checked="false" aria-label="${n} star${n > 1 ? 's' : ''}" data-cfstar="${n}"><img class="cnote__star" src="/assets/wall/star2-empty.webp" alt=""></button>`).join('')}</div>
          <span class="cf__rate" id="cfRate">Tap a star to rate us</span>
          <div class="cf__photo" id="cfPhoto"></div>
          <img class="cnote__clip" src="/assets/wall/clip.webp" alt="" aria-hidden="true">
          <div class="cnote__body">
            <span class="cnote__float cf__float" id="cfFloat" hidden></span>
            <p class="cf__dear">Dear Simple Oven,</p>
            <label class="sr" for="cfText">Your confession</label>
            <textarea id="cfText" class="cf__text" maxlength="400" rows="5" placeholder="I have a confession to make… I ate the whole box in one sitting."></textarea>
            <span class="cf__count" id="cfCount">0/400</span>
            <div class="cf__sign"><span>—</span><label class="sr" for="cfName">Your name</label><input id="cfName" class="cf__name" maxlength="40" placeholder="your name" autocomplete="given-name" value="${esc(d.name)}"></div>
          </div>
        </div>
        <span class="err cf__err" id="cfErr" role="alert"></span>
        <div class="cf__opts">
          <label class="switchrow"><input type="checkbox" id="cfAnon"><span class="switch" aria-hidden="true"></span><span><b>Stay anonymous</b><i>Your name won't show on the note.</i></span></label>
          <label class="btn btn--ghost btn--sm cf__add" for="cfFile"><span id="cfFileLbl">📷 Add a photo</span> <span class="opt">(optional)</span><input type="file" id="cfFile" accept="image/*" hidden></label>
        </div>
        <input type="text" name="website" id="cfWeb" tabindex="-1" autocomplete="off" class="hp" aria-hidden="true">
      </form>
      <footer class="pm-sheet__foot"><button type="submit" form="cfForm" class="btn" id="cfSend">Send my confession ♡</button><button type="button" class="btn btn--ghost" data-cfx>Cancel</button></footer>
    </div>`;
  const paintStars = () => { $$('[data-cfstar]', el).forEach((b) => { const on = +b.dataset.cfstar <= d.stars; b.classList.toggle('is-on', on); $('img', b).src = `/assets/wall/star2${on ? '' : '-empty'}.webp`; b.setAttribute('aria-checked', +b.dataset.cfstar === d.stars); }); $('#cfRate', el).textContent = d.stars ? ['', 'Hmm, okay', 'Not bad', 'Pretty good!', 'So good!', 'Obsessed!'][d.stars] : 'Tap a star to rate us'; };
  const paintPhoto = () => { $('#cfPhoto', el).innerHTML = d.photo ? `<span class="cnote__photo"><img src="${d.photo}" alt="Your photo"></span><button type="button" class="cf__rm" id="cfRm" aria-label="Remove photo">✕</button>` : ''; $('#cfFloat', el).hidden = !d.photo; $('#cfFileLbl', el).textContent = d.photo ? '📷 Change photo' : '📷 Add a photo'; };
  const close = (force) => { if (!force && (d.text.trim() || d.photo) && !confirm('Close without sending your confession?')) return; document.removeEventListener('keydown', key); el.remove(); document.documentElement.classList.remove('pm-lock'); last?.focus?.(); };
  const key = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', key);
  el.addEventListener('click', (e) => {
    if (e.target.closest('[data-cfx]')) return close();
    const s = e.target.closest('[data-cfstar]'); if (s) { d.stars = +s.dataset.cfstar; paintStars(); $('#cfErr', el).textContent = ''; }
    if (e.target.closest('#cfRm')) { d.photo = ''; paintPhoto(); }
  });
  $('#cfText', el).addEventListener('input', (e) => { d.text = e.target.value; $('#cfCount', el).textContent = `${d.text.length}/400`; });
  $('#cfName', el).addEventListener('input', (e) => { d.name = e.target.value; });
  $('#cfAnon', el).addEventListener('change', (e) => { d.anonymous = e.target.checked; $('#cfName', el).disabled = d.anonymous; $('.cf__sign', el).classList.toggle('is-anon', d.anonymous); $('#cfName', el).placeholder = d.anonymous ? 'Anonymous' : 'your name'; });
  $('#cfFile', el).addEventListener('change', async (e) => { const f = e.target.files?.[0]; if (!f) return; try { d.photo = await shrinkImage(f, 1200); paintPhoto(); } catch { toast('Couldn’t open that photo. Please try a JPG or PNG.'); } e.target.value = ''; });
  $('#cfForm', el).addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('#cfErr', el), name = d.name.trim();
    if (!d.stars) { err.textContent = 'Please tap the stars to rate us.'; $('[data-cfstar="5"]', el).focus(); return; }
    if (d.text.trim().length < 3) { err.textContent = 'Please write a little something.'; $('#cfText', el).focus(); return; }
    if (!d.anonymous && !name) { err.textContent = 'Add your name, or turn on “Stay anonymous”.'; $('#cfName', el).focus(); return; }
    const b = $('#cfSend', el); b.disabled = true; b.textContent = 'Sending…'; err.textContent = '';
    let j; try { const r = await fetch('/api/wall', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stars: d.stars, text: d.text.trim(), name, anonymous: d.anonymous, photo: d.photo, website: $('#cfWeb', el).value }), signal: AbortSignal.timeout(20000) }); j = await r.json(); }
    catch { j = { ok: false, error: 'Can’t reach the website right now. Please try again.' }; }
    if (!j.ok) { b.disabled = false; b.textContent = 'Send my confession ♡'; err.textContent = j.error || Object.values(j.errors || {})[0] || 'Couldn’t send it. Please try again.'; return; }
    if (!d.anonymous) store.set('so_conf_name', name);
    $('.cf__body', el).outerHTML = `<div class="pm-sheet__body cf__done"><div class="cnote cnote--empty"><div class="cnote__paper" aria-hidden="true"><i class="cnote__top"></i><i class="cnote__mid"></i><i class="cnote__bot"></i></div><div class="cnote__stars">${starsHTML(d.stars)}</div><img class="cnote__clip" src="/assets/wall/clip.webp" alt="" aria-hidden="true"><div class="cnote__body"><p class="cnote__text">Thank you! Your confession is safe with us. It will appear on the page once we've read it ♡</p><p class="cnote__sig">— Simple Oven</p></div></div></div>`;
    $('.pm-sheet__foot', el).innerHTML = '<button type="button" class="btn" data-cfx>Done</button>';
  });
  paintStars(); setTimeout(() => $('[data-cfstar="1"]', el)?.focus(), 40);
}

// owner page: Photo Dump + Sweet confessions
const admWallSections = () => `
  <section class="panel adm-sec" id="admDumpSec">
    <div class="pm-head"><h2><span class="num">✦</span>Photo Dump</h2><label class="btn btn--sm" for="admDumpFile">+ Upload photos<input type="file" id="admDumpFile" accept="image/*" multiple hidden></label></div>
    <p class="fine">Photos of your bakes for the Photo Dump page. Add a short caption if you like (it's written under the photo). Newest show first.</p>
    <div id="admDump" class="adm-dump"><p class="fine">Loading…</p></div>
  </section>
  <section class="panel adm-sec" id="admConfSec">
    <h2><span class="num">♡</span>Sweet confessions</h2>
    <p class="fine">Reviews from customers. New ones wait here until you approve them, so nothing shows without your OK.</p>
    <div id="admConf"><p class="fine">Loading…</p></div>
  </section>`;
const admStars = (n) => `<span class="adm-stars" aria-label="${n} out of 5">${'★'.repeat(n)}<i>${'★'.repeat(5 - n)}</i></span>`;
function admWallRender() {
  const w = adm.wall; if (!w || !$('#admDump')) return;
  $('#admDump').innerHTML = w.photos.length ? w.photos.map((p, i) => `<div class="adm-dump__item">
      <a class="adm-dump__img" href="${wimg(p.id)}" target="_blank" rel="noopener"><img src="${wimg(p.id)}" alt="" loading="lazy"></a>
      <input class="input input--sm" data-dcap="${p.id}" maxlength="80" value="${esc(p.caption)}" placeholder="Add a caption…" aria-label="Caption">
      <div class="adm-dump__act"><button type="button" class="iconbtn" data-dmove="${p.id}:-1" ${i ? '' : 'disabled'} aria-label="Move earlier">←</button><button type="button" class="iconbtn" data-dmove="${p.id}:1" ${i < w.photos.length - 1 ? '' : 'disabled'} aria-label="Move later">→</button><button type="button" class="linkbtn adm-dump__del" data-ddel="${p.id}">Delete</button></div>
    </div>`).join('') : '<p class="pm-empty">No photos yet. Tap “Upload photos” to add your first ones.</p>';
  const waiting = w.reviews.filter((r) => !r.ok), live = w.reviews.filter((r) => r.ok), tab = adm.confTab || (waiting.length ? 'wait' : 'live');
  const card = (r) => `<div class="adm-conf__item${r.ok ? '' : ' is-wait'}">
      ${r.photo ? `<a class="adm-conf__img" href="${wimg(r.id)}" target="_blank" rel="noopener"><img src="${wimg(r.id)}" alt="Photo from the customer" loading="lazy"></a>` : ''}
      <div class="adm-conf__txt"><div class="adm-conf__top">${admStars(r.stars)}<b>${r.name ? esc(r.name) : 'Anonymous'}</b><span class="fine">${shortDate(r.at)}</span></div>
        <p>${esc(r.text).replace(/\n/g, '<br>')}</p>
        <div class="adm-conf__act">${r.ok ? `<button type="button" class="btn btn--ghost btn--sm" data-rstat="${r.id}:0">Hide from page</button>` : `<button type="button" class="btn btn--sm" data-rstat="${r.id}:1">Approve &amp; show</button>`}<button type="button" class="linkbtn adm-dump__del" data-rdel="${r.id}">Delete</button></div></div>
    </div>`;
  $('#admConf').innerHTML = `<div class="pm-seg adm-conf__tabs" role="tablist">${[['wait', `Waiting (${waiting.length})`], ['live', `On the page (${live.length})`]].map(([k, l]) => `<button type="button" role="tab" aria-selected="${tab === k}" class="${tab === k ? 'is-on' : ''}" data-ctab="${k}">${l}</button>`).join('')}</div>
    <div class="adm-conf__list">${(tab === 'wait' ? waiting : live).map(card).join('') || `<p class="pm-empty">${tab === 'wait' ? 'Nothing waiting. New confessions will show up here.' : 'No confessions on the page yet.'}</p>`}</div>`;
}
async function admWallCall(action, extra, okMsg) {
  let j; try { j = await adminCall(action, extra); } catch { j = { ok: false, error: 'Can’t reach the website right now. Please try again.' }; }
  if (!j.ok) { toast(j.error || 'Couldn’t save. Please try again.'); return false; }
  adm.wall = { photos: j.photos || adm.wall.photos, reviews: j.reviews || adm.wall.reviews }; WALL.data = null;
  admWallRender(); if (okMsg) toast(okMsg); return true;
}
async function bindAdminWall() {
  if (!$('#admDump')) return;
  if (!adm.wall) {
    let j; try { j = await adminCall('wall'); } catch { j = null; }
    adm.wall = j?.ok ? { photos: j.photos || [], reviews: j.reviews || [] } : { photos: [], reviews: [] };
    if (j && !j.ok && $('#admDump')) { $('#admDump').innerHTML = `<p class="fine">${esc(j.error || 'Couldn’t load the photos.')}</p>`; }
  }
  admWallRender();
  $('#admDumpFile').addEventListener('change', async (e) => {
    const files = [...(e.target.files || [])].slice(0, 20); e.target.value = ''; if (!files.length) return;
    const lbl = $('#admDumpSec .pm-head .btn'); let done = 0;
    for (const f of files) {
      lbl.firstChild.textContent = `Uploading ${done + 1} of ${files.length}…`;
      let image; try { image = await shrinkImage(f, 1600); } catch { toast(`Couldn’t open ${f.name}.`); continue; }
      if (await admWallCall('gallery-add', { images: [{ image, caption: '' }] })) done++;
    }
    lbl.firstChild.textContent = '+ Upload photos';
    if (done) toast(`${done} photo${done > 1 ? 's' : ''} added to the Photo Dump ✓`);
  });
  $('#admDumpSec').addEventListener('change', (e) => { const c = e.target.closest('[data-dcap]'); if (c) admWallCall('gallery-caption', { id: c.dataset.dcap, caption: c.value }, 'Caption saved ✓'); });
  $('#admDumpSec').addEventListener('click', (e) => {
    const m = e.target.closest('[data-dmove]'); if (m) { const [id, dir] = m.dataset.dmove.split(':'); admWallCall('gallery-move', { id, dir: +dir }); }
    const d = e.target.closest('[data-ddel]'); if (d && confirm('Delete this photo from the Photo Dump?')) admWallCall('gallery-del', { id: d.dataset.ddel }, 'Photo deleted');
  });
  $('#admConfSec').addEventListener('click', (e) => {
    const t = e.target.closest('[data-ctab]'); if (t) { adm.confTab = t.dataset.ctab; admWallRender(); return; }
    const s = e.target.closest('[data-rstat]'); if (s) { const [id, ok] = s.dataset.rstat.split(':'); admWallCall('review-status', { id, ok: ok === '1' }, ok === '1' ? 'It’s on the Sweet Confessions page ✓' : 'Hidden from the page'); }
    const d = e.target.closest('[data-rdel]'); if (d && confirm('Delete this confession for good?')) admWallCall('review-del', { id: d.dataset.rdel }, 'Deleted');
  });
}

/* ───────────── care guide (cookies + bars) ───────────── */
const CARE = {
  cookies: {
    label: 'Cookies',
    storage: [
      ['Room temperature', 'Up to <b>2 days</b> in an airtight container, away from sunlight and heat.'],
      ['Fridge', 'Up to <b>5 days</b>, airtight.'],
      ['Freezer', 'Up to <b>1 month</b>. Wrap each cookie individually, then store in an airtight container or freezer bag.'],
      ['Red Velvet Cream Cheese', '<b>Refrigerate right away</b> because of the cream cheese filling. Best within 4 to 5 days.'],
    ],
    heating: [
      ['Oven or toaster oven', '<b>160°C</b> for <b>5 to 8 minutes</b>.'],
      ['Air fryer', '<b>150°C</b> for <b>2 to 3 minutes</b>.'],
      ['Microwave', '<b>10 to 15 seconds</b>. For Red Velvet, <b>8 to 10 seconds</b>.'],
      ['From frozen', 'Add <b>3 to 5 minutes</b> in the oven, or thaw at room temperature for 30 minutes first.'],
    ],
  },
  bars: {
    label: 'Bars',
    storage: [
      ['Room temperature', 'Up to <b>2 days</b> in an airtight container, away from sunlight and heat.'],
      ['Fridge', 'Up to <b>5 days</b>, airtight.'],
      ['Freezer', 'Up to <b>1 month</b>. Wrap each bar individually, then store in an airtight container or freezer bag.'],
    ],
    heating: [
      ['Oven or toaster oven', '<b>160°C</b> for <b>6 to 8 minutes</b>.'],
      ['Air fryer', '<b>150°C</b> for <b>3 minutes</b>.'],
      ['Microwave', '<b>10 to 15 seconds</b>, in short bursts.'],
      ['From frozen', 'Add <b>3 to 5 minutes</b> in the oven, or thaw at room temperature for 30 minutes first.'],
    ],
  },
};
function viewCare(which = 'cookies') {
  const g = CARE[which] ? which : 'cookies', c = CARE[g];
  const rows = (list) => `<dl class="care__list">${list.map(([t, d]) => `<div class="care__row"><dt>${t}</dt><dd>${d}</dd></div>`).join('')}</dl>`;
  return `<div class="view wrap care">
    <div class="pagehead"><p class="eyebrow">How to store and warm up</p><h1 class="h2">Keep them gooey</h1><p class="lead" style="margin-top:12px">How to store and warm up your treats so every bite tastes fresh from the oven.</p>
      <nav class="chips" aria-label="Choose a treat" style="margin-top:18px">${Object.entries(CARE).map(([k, v]) => `<a class="chip ${k === g ? 'is-on' : ''}" href="#/care/${k}" ${k === g ? 'aria-current="page"' : ''}>${v.label}</a>`).join('')}</nav></div>
    <section class="panel care__sec"><h2><span class="num">1</span>Storage</h2>${rows(c.storage)}</section>
    <section class="panel care__sec"><h2><span class="num">2</span>Heating</h2>${rows(c.heating)}</section>
    <div class="hero__cta" style="animation:none;margin-top:8px"><a class="btn" href="#/shop">Order a box <span class="arrow">→</span></a></div>
  </div>`;
}

/* ───────────────────────── router ───────────────────────── */
let lastHash = location.hash;
function route() {
  if (lastHash.startsWith('#/admin') && !location.hash.startsWith('#/admin') && dirty() && !confirmLeave()) { history.replaceState(null, '', lastHash); return; }
  lastHash = location.hash;
  if (!$('#drawer').hidden) closeDrawer();
  $('#boxPeek')?.classList.remove('show');
  cleanups.forEach((f) => f()); cleanups = [];
  const h = location.hash.replace(/^#\/?/, '');
  const [a, b] = h.split('/');
  let html, after, scrollTo = null, title = 'Simple Oven · Home-baked cookies & revel bars';
  switch (a) {
    case '': html = viewHome(); break;
    case 'how': html = viewHome(); scrollTo = '#how'; break;
    case 'care': html = viewCare(b); title = 'How to store and warm up · Simple Oven'; break;
    case 'photos': html = viewPhotos(); after = bindPhotos; title = 'Photo Dump · Simple Oven'; break;
    case 'confessions': html = viewConfessions(); after = bindConfessions; title = 'Sweet Confessions · Simple Oven'; break;
    case 'shop': html = viewShop(b || 'all'); title = 'Shop · Simple Oven'; break;
    case 'product': html = viewProduct(b); after = () => bindProduct(b); title = `${findProduct(b)?.name || 'Product'} · Simple Oven`; break;
    case 'cart': html = viewCart(); after = renderCart; title = 'Your cart · Simple Oven'; break;
    case 'checkout': html = viewCheckout(); after = cart.items.length ? bindCheckout : renderCart; title = 'Checkout · Simple Oven'; break;
    case 'thanks': html = viewThanks(); after = bindProof; title = 'Thank you · Simple Oven'; break;
    case 'pay': html = viewPay(); after = bindProof; title = 'Upload payment · Simple Oven'; break;
    case 'admin': html = viewAdmin(); after = bindAdmin; title = 'Owner page · Simple Oven'; break;
    default: html = viewNotFound();
  }
  document.title = title;
  app.innerHTML = html;
  after?.();
  initEffects();
  $$('.nav__links a').forEach((l) => l.classList.toggle('is-active', ('#/' + h).startsWith(l.getAttribute('href')) && h !== ''));
  if (scrollTo) setTimeout(() => $(scrollTo)?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' }), 60);
  else window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  if (a) app.focus({ preventScroll: true });
}
addEventListener('hashchange', route);

// nav shadow on scroll
addEventListener('scroll', () => $('#nav').classList.toggle('is-scrolled', scrollY > 10), { passive: true });
$('#yr').textContent = new Date().getFullYear();
updateCount();
// show the page right away (with the last-known settings), then refresh if the owner changed something
loadShopSettings().then((changed) => { refreshCart(); showNotice(); updateCount(); if (changed && !location.hash.startsWith('#/admin')) route(); });
if (window.SO_DEMO) { refreshCart(); showNotice(); }
route();
