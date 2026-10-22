import { SHOP, PRODUCTS, CATEGORIES, findProduct, findVariant, fromPrice, peso, addDays, isClosedDate, nextOpenDates, findZone, zoneText, earliestDate, latestDate, applySettings, cleanSettings, defaultSettings, manilaNow, weekdayOf } from './products.js';
import { cookieSVG, barSVG } from './cookies.js';

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
  if (p.img) return `<img class="${cls}" src="${img(p.img, sm)}" alt="${esc(p.name)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;
  return `<div class="art" role="img" aria-label="${esc(p.name)} illustration">${artSVG(p.art)}<span class="art__note">Photo soon</span></div>`;
}

/* ───────────────────────── cart ───────────────────────── */
const cart = {
  items: store.get('so_cart', []).filter((i) => findVariant(findProduct(i.pid), i.vid) && !findProduct(i.pid).soldOut),
  save() { store.set('so_cart', this.items); updateCount(); },
  add(pid, vid, qty = 1) {
    const it = this.items.find((i) => i.pid === pid && i.vid === vid);
    if (it) it.qty = Math.min(SHOP.maxQtyPerItem, it.qty + qty);
    else this.items.push({ pid, vid, qty: Math.min(SHOP.maxQtyPerItem, qty) });
    this.save();
  },
  set(pid, vid, qty) {
    const it = this.items.find((i) => i.pid === pid && i.vid === vid);
    if (!it) return;
    if (qty <= 0) this.items = this.items.filter((i) => i !== it);
    else it.qty = Math.min(SHOP.maxQtyPerItem, qty);
    this.save();
  },
  clear() { this.items = []; this.save(); },
  lines() {
    return this.items.map((i) => {
      const p = findProduct(i.pid), v = findVariant(p, i.vid);
      return { ...i, p, v, total: v.price * i.qty };
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
const tokenArt = (pid) => (findProduct(pid)?.category === 'bars' ? barSVG(pid) : cookieSVG(pid)); // illustrated, so every flavor looks the same style
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
function bakeBoxHTML({ closed = false, tag = '' } = {}) {
  const pieces = boxPieces();
  const shown = pieces.slice(0, 16), extra = pieces.length - shown.length;
  const cookies = pieces.filter((p) => findProduct(p.pid)?.category !== 'bars').length, bars = pieces.length - cookies;
  const fresh = lastAddedKey;
  const newIdx = new Set(pieces.map((p, i) => (fresh && p.key === fresh.key && p.k >= p.n - fresh.n ? i : -1)));
  return `<div class="bakebox${closed ? ' is-closed is-tied' : ''}${pieces.length || closed ? '' : ' is-empty'}" aria-label="Your box: ${cookies} cookie${cookies === 1 ? '' : 's'}${bars ? `, ${bars} box${bars === 1 ? '' : 'es'} of revel bars` : ''}">
    <div class="bakebox__lid"><span class="bakebox__logo">simple<br>oven</span></div>
    <div class="bakebox__body">
      <div class="bakebox__tray">${shown.map((p, i) => tokenHTML(p.pid, i, newIdx.has(i))).join('')}${extra > 0 ? `<span class="tok tok--more">+${extra}</span>` : ''}${!pieces.length ? '<span class="bakebox__hint">your cookies go here</span>' : ''}</div>
      <div class="bakebox__front"><span>${esc(tag || boxMood(cookies, bars))}</span></div>
    </div>
    <div class="bakebox__ribbon" aria-hidden="true"><i></i><b>${bowSVG}</b>${tag ? `<em class="bakebox__tag">${esc(tag)} ♡</em>` : ''}</div>
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
  return `<li class="line">
    <a class="line__img" href="#/product/${l.p.id}" tabindex="-1" aria-hidden="true">${media(l.p)}</a>
    <div>
      <a class="line__name" href="#/product/${l.p.id}">${esc(l.p.name)}</a>
      <div class="line__var">${esc(l.v.label)} · ${peso(l.v.price)}</div>
      <div class="line__ctrl">
        <div class="qty qty--sm" role="group" aria-label="Quantity for ${esc(l.p.name)}">
          <button type="button" data-q="-1" data-pid="${l.p.id}" data-vid="${l.v.id}" aria-label="Remove one">−</button>
          <output aria-live="polite">${l.qty}</output>
          <button type="button" data-q="1" data-pid="${l.p.id}" data-vid="${l.v.id}" aria-label="Add one">+</button>
        </div>
        <button type="button" class="line__rm" data-rm data-pid="${l.p.id}" data-vid="${l.v.id}">Remove</button>
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
      <p class="fine">Pick-up at ${esc(SHOP.pickup.place)}, ${esc(SHOP.pickup.city)}. Want it delivered? Send your own rider.</p>
      <a class="btn btn--block" href="#/checkout" data-close>Checkout <span class="arrow">→</span></a>
      <a class="btn btn--ghost btn--block" href="#/cart" data-close>View full cart</a>
    </div>`;
}

document.addEventListener('click', (e) => {
  const q = e.target.closest('[data-q]');
  if (q) {
    const it = cart.items.find((i) => i.pid === q.dataset.pid && i.vid === q.dataset.vid);
    if (it) { cart.set(it.pid, it.vid, it.qty + Number(q.dataset.q)); refreshCartViews(); }
    return;
  }
  const rm = e.target.closest('[data-rm]');
  if (rm) { cart.set(rm.dataset.pid, rm.dataset.vid, 0); refreshCartViews(); return; }
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
  return `<article class="card rv${wide ? ' card--wide' : ''}" style="--d:${(i % 4) * 80}ms" ${wide ? '' : 'data-tilt'}>
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
        <div class="hero__meta">
          <div><strong>${PRODUCTS.filter((p) => p.category === 'cookies' && !p.sampler).length}</strong>cookie flavors</div>
          <div><strong>2</strong>kinds of revel bars</div>
          <div><strong>${peso(Math.min(...PRODUCTS.map(fromPrice)))}</strong>boxes from</div>
        </div>
      </div>
      <div class="stage stage--solo" id="stage">
        <div class="stage__inner" id="stageInner" aria-hidden="true">
          <div class="stage__sheet"><img src="/assets/tex/paper-sheet.webp" alt="" width="1200" height="1200"></div>
${soloScene()}
        </div>
        <button class="stage__tap" type="button" id="crumbleBtn">tap me ✺</button>
      </div>
    </div>
  </section>`;
}

function heroNight() {
  const chip = (id, cls, depth) => { const p = findProduct(id); return `<a class="nchip ${cls} float" data-depth="${depth}" href="#/product/${p.id}"><b>${esc(p.name.replace(' Revel Bars', ' Revel'))}</b><span>from ${peso(fromPrice(p))}</span></a>`; };
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
        <div><p class="eyebrow rv">The menu</p><h2 class="h2 rv" style="--d:80ms">Pick your <em>favorite</em></h2></div>
      </div>
      <div class="grid grid--menu">${cookies.map((p, i) => cardHTML(p, i)).join('')}${sampler ? cardHTML(sampler, 0, true) : ''}${bars.map((p, i) => cardHTML(p, i + 1)).join('')}</div>
    </div>
  </section>

  <section class="section" id="how">
    <div class="wrap">
      <div class="section__head"><div><p class="eyebrow rv">Ordering is easy</p><h2 class="h2 rv" style="--d:80ms">Three <em>simple</em> steps</h2></div></div>
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
  const title = { all: 'The <em>whole</em> menu', cookies: 'Cookies', bars: 'Revel <em>bars</em>' }[cat] || 'Menu';
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
  const gal = p.gallery.length ? p.gallery : [];
  const others = PRODUCTS.filter((x) => x.id !== p.id && x.category === p.category).slice(0, 4);
  return `<div class="view wrap">
    <nav class="crumbs" aria-label="Breadcrumb"><a href="#/shop">Shop</a> / <a href="#/shop/${p.category}">${p.category === 'bars' ? 'Revel Bars' : 'Cookies'}</a> / <span aria-current="page">${esc(p.name)}</span></nav>
    <div class="pd">
      <div class="gallery">
        <div class="gallery__main" id="galMain">${gal.length ? `<img id="galImg" src="${img(gal[0])}" alt="${esc(p.name)}" fetchpriority="high">` : media(p, { sm: false })}</div>
        ${gal.length > 1 ? `<div class="gallery__thumbs" role="group" aria-label="More photos">${gal.map((k, i) => `<button type="button" class="${i ? '' : 'is-on'}" data-gal="${k}" aria-label="Show photo ${i + 1}"><img src="${img(k, true)}" alt="" loading="lazy"></button>`).join('')}</div>` : ''}
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
    setTimeout(() => { im.src = img(b.dataset.gal); im.onload = () => (im.style.opacity = 1); }, 180);
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
  const lines = order ? order.lines : cart.lines().map((l) => ({ name: l.p.name, variant: l.v.label, qty: l.qty, total: l.total }));
  const subtotal = order ? order.subtotal : cart.subtotal();
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
    <div class="rline"><span>${feeLabel}</span><span>${feeVal}</span></div>
    <div class="rline rline--total"><span>Total</span><span>${peso(subtotal)}${feeTotal ? `<small class="rline__extra">${feeTotal}</small>` : ''}</span></div>
    ${cta ? `<a class="btn btn--block" style="margin-top:18px" href="#/checkout">Checkout <span class="arrow">→</span></a>` : ''}
    <p class="receipt__thanks">thank you!</p>
    <p class="receipt__sub" style="margin:0">${esc(SHOP.instagramHandle)}</p>
    <div class="barcode" aria-hidden="true"></div>
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
            <div class="field field--full"><label for="f-social">Instagram or Facebook name <span class="opt">(optional, so we can message you)</span></label><input class="input" id="f-social" name="social" maxlength="80" placeholder="@yourname" value="${v('social')}"></div>
          </div>
        </div>

        <div class="panel">
          <h2><span class="num">2</span>Pick-up</h2>
          <input type="hidden" name="fulfillment" value="pickup">
          <div class="pickspot">
            <span class="pickspot__pin" aria-hidden="true">📍</span>
            <div><b>Pick up at ${esc(SHOP.pickup.place)}</b><span>${esc(SHOP.pickup.city)}</span>${SHOP.pickup.mapUrl ? `<a class="pickspot__map" href="${esc(SHOP.pickup.mapUrl)}" target="_blank" rel="noopener">Open map pin ↗</a>` : ''}</div>
          </div>
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

        <div class="panel">
          <h2><span class="num">4</span>Payment & notes</h2>
          <p class="fine">No payment yet. After you place your order you'll see how to pay, and you can upload your payment screenshot right there.</p>
          <div class="fields">
            <div class="field field--full"><label for="f-pay">How will you pay?</label><select class="input" id="f-pay" name="payment"><option>GCash</option><option>Bank transfer</option></select><span class="err" id="e-payment"></span></div>
            <div class="field field--full"><label for="f-notes">Notes <span class="opt">(optional)</span></label><textarea class="input" id="f-notes" name="notes" maxlength="500" placeholder="Allergies, special requests…"></textarea></div>
          </div>
          <div class="hp" aria-hidden="true"><label>Leave this empty<input name="company" tabindex="-1" autocomplete="off"></label></div>
          <div class="alert alert--err" id="coErr" role="alert" hidden></div>
          <button class="btn btn--block" type="submit" id="placeBtn" style="margin-top:18px">Place order · <span id="placeTotal">${peso(cart.subtotal())}</span></button>
          <p class="fine" style="text-align:center;margin-top:10px">By placing your order you agree to be contacted about it.</p>
        </div>
      </form>
      ${receiptHTML()}
    </div>
  </div>`;
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
    refreshReceipt();
  };
  f.addEventListener('change', (e) => {
    if (e.target.name === 'date' && e.target.value === 'other') setTimeout(() => { other.focus(); other.showPicker?.(); }, 50);
    sync();
  });
  $('#f-giftNote').addEventListener('input', () => ($('#giftCount').textContent = $('#f-giftNote').value.length));
  $('#f-giftTo').addEventListener('input', () => refreshReceipt());
  sync();
  $$('.input, input[name=date]', f).forEach((i) => i.addEventListener('input', () => { i.closest('.field')?.classList.remove('has-err'); const e = $('#e-' + (i.name === 'dateOther' ? 'date' : i.name)); if (e) e.textContent = ''; }));
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(f));
    d.date = d.date === 'other' ? d.dateOther : d.date || '';
    delete d.dateOther;
    const errs = validate(d);
    $$('.field', f).forEach((x) => x.classList.remove('has-err'));
    $$('.err', f).forEach((x) => (x.textContent = ''));
    if (Object.keys(errs).length) {
      for (const [k, m] of Object.entries(errs)) { const el = $('#e-' + k); if (el) { el.textContent = m; el.closest('.field').classList.add('has-err'); } }
      const first = $('.has-err .input, .has-err .datechips', f); (first?.querySelector?.('input') || first)?.focus(); first?.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
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
  if (!d.date) e.date = 'Please pick a date.';
  else if (d.date < minDate()) e.date = 'Orders need at least a day’s notice. Please pick a later date.';
  else if (d.date > maxDate()) e.date = 'That’s too far ahead. Please pick an earlier date.';
  else if (isClosedDate(d.date)) e.date = 'Sorry, we’re closed that day. Please pick another date.';
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
  const payload = { ...d, gift: d.gift === 'on', giftHidePrices: d.giftHidePrices === 'on', items: cart.items.map(({ pid, vid, qty }) => ({ pid, vid, qty })), idempotencyKey: key };
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
  if (reduceMotion) return;
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
  const lines = p.items.map((i) => { const pr = findProduct(i.pid), v = findVariant(pr, i.vid); return { name: pr.name, variant: v.label, qty: i.qty, total: v.price * i.qty }; });
  const z = null;
  return { ok: true, order: { orderId: 'SO-261023-DEMO', lines, subtotal: lines.reduce((s, l) => s + l.total, 0), fulfillment: p.fulfillment, date: p.date, time: p.time, name: p.name, phone: p.phone, payment: p.payment, pickupBy: p.pickupBy, zone: z, gift: p.gift ? { to: p.giftTo, hidePrices: p.giftHidePrices } : null, createdAt: Date.now() } };
}

/* ───────────── how to pay + payment proof upload ───────────── */
function copyRow(label, value) {
  return `<div class="copyrow"><span><i>${esc(label)}</i><b>${esc(value)}</b></span><button type="button" class="copybtn" data-copy="${esc(value)}">Copy</button></div>`;
}
function payDetailsHTML(method) {
  const p = window.SO_PAYMENT || SHOP.payment || {};
  const gcash = p.gcashNumber ? `<div class="paycard"><h3>GCash</h3>${p.gcashName ? copyRow('Account name', p.gcashName) : ''}${copyRow('GCash number', p.gcashNumber)}</div>` : '';
  const bank = p.bankAccountNumber ? `<div class="paycard"><h3>${esc(p.bankName || 'Bank transfer')}</h3>${p.bankAccountName ? copyRow('Account name', p.bankAccountName) : ''}${copyRow('Account number', p.bankAccountNumber)}</div>` : '';
  const first = method === 'Bank transfer' ? bank + gcash : gcash + bank;
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
async function shrinkImage(file) {
  // turn any photo into a small JPEG (also fixes huge phone screenshots)
  const url = URL.createObjectURL(file);
  try {
    const im = await new Promise((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = bad; i.src = url; });
    const max = 1600, s = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight));
    const c = document.createElement('canvas'); c.width = Math.round(im.naturalWidth * s); c.height = Math.round(im.naturalHeight * s);
    c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.85);
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
        <li><b>2.</b>${cash ? 'Pay in cash when you pick up your box.' : 'Send your payment and upload the screenshot below. Your date is booked once we receive it.'}</li>
        <li><b>3.</b>We bake it fresh. ${o.pickupBy === 'rider' ? `Book your rider when we tell you it's ready.` : 'Pick it up and enjoy!'}</li>
      </ol>
      ${cash ? '' : `<section class="panel paypanel">
        <h2><span class="num">₱</span>How to pay</h2>
        <p class="fine">Amount: <b>${peso(o.subtotal)}</b>. Please pay after we confirm your order.</p>
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
        ], { duration: 2600 + Math.random() * 900, easing: 'cubic-bezier(.33,0,.67,1)', fill: 'forwards' }).onfinish = () => { c.remove(); live.delete(c); };
      }
    };
    const puff = (ox, oy) => { // soft sugar-dust puff + sparkles where you touched
      const p = document.createElement('span'); p.className = 'dust'; p.style.left = ox + 'px'; p.style.top = oy + 'px'; st.appendChild(p);
      p.animate([{ transform: 'translate(-50%,-50%) scale(.2)', opacity: .9 }, { transform: 'translate(-50%,-50%) scale(1.6)', opacity: 0 }], { duration: 700, easing: 'cubic-bezier(.2,.8,.3,1)' }).onfinish = () => p.remove();
      for (let i = 0; i < 10; i++) {
        const k = document.createElement('span'); k.className = 'spark'; k.style.left = ox + 'px'; k.style.top = oy + 'px'; st.appendChild(k);
        const a = (i / 10) * Math.PI * 2 + Math.random() * .5, d = 30 + Math.random() * 50;
        k.animate([{ transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }, { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d}px)) scale(.2)`, opacity: 0 }], { duration: 600 + Math.random() * 300, easing: 'cubic-bezier(.1,.7,.3,1)' }).onfinish = () => k.remove();
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
const adm = { pw: sstore.get('so_admin', ''), s: null, saved: '', storage: true, busy: false };
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
const dirty = () => adm.s && JSON.stringify(cleanSettings(adm.s)) !== adm.saved;

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

  <section class="panel adm-sec">
    <h2><span class="num">1</span>What's available</h2>
    <p class="fine">Switch off anything you can't bake right now. Customers will see “Sold out” and can't order it.</p>
    <div class="adm-list">${PRODUCTS.map((p) => `<label class="adm-item">
      <span class="adm-item__img">${p.img ? `<img src="${img(p.img, true)}" alt="">` : artSVG(p.art)}</span>
      <span class="adm-item__name">${esc(p.name)}<i>${s.soldOut[p.id] ? 'Sold out' : 'Available'}</i></span>
      <input type="checkbox" class="sw" data-avail="${p.id}" ${s.soldOut[p.id] ? '' : 'checked'} aria-label="${esc(p.name)} available">
    </label>`).join('')}</div>
  </section>

  <section class="panel adm-sec">
    <h2><span class="num">2</span>Pick-up days</h2>
    <p class="fine">Tap a day to close or open it. <span class="key key--open"></span> open <span class="key key--closed"></span> closed <span class="key key--early"></span> too soon to order</p>
    <span class="label-like">Closed every week on</span>
    <div class="wdchips">${WD.map((w, i) => `<label class="wdchip"><input type="checkbox" data-wd="${i}" ${s.closedWeekdays.includes(i) ? 'checked' : ''}><span>${w}</span></label>`).join('')}</div>
    <div id="admCal">${calHTML(s)}</div>
  </section>

  <section class="panel adm-sec">
    <h2><span class="num">3</span>Pick-up times</h2>
    <p class="fine">Customers choose one of these at checkout.</p>
    <div id="admTimes" class="adm-times">${s.pickupTimes.map((t, i) => `<div class="adm-time"><input class="input" data-time="${i}" value="${esc(t)}" maxlength="40" aria-label="Pick-up time ${i + 1}"><button type="button" class="iconbtn" data-deltime="${i}" aria-label="Remove this time" ${s.pickupTimes.length < 2 ? 'disabled' : ''}>✕</button></div>`).join('')}</div>
    <button type="button" class="btn btn--ghost btn--sm" id="admAddTime" ${s.pickupTimes.length >= 8 ? 'disabled' : ''}>+ Add a time</button>
  </section>

  <section class="panel adm-sec">
    <h2><span class="num">4</span>Ordering rules</h2>
    <div class="adm-rule"><span>Order at least</span><div class="stepper"><button type="button" data-step="minLeadDays:-1" aria-label="Less">−</button><b id="v-lead">${s.minLeadDays}</b><button type="button" data-step="minLeadDays:1" aria-label="More">+</button></div><span>day${s.minLeadDays === 1 ? '' : 's'} before pick-up</span></div>
    <div class="adm-rule"><label for="a-cut">Last order time the day before</label><input class="input input--sm" type="time" id="a-cut" value="${esc(s.orderCutoff)}"><button type="button" class="linkbtn" id="a-cut-x" ${s.orderCutoff ? '' : 'hidden'}>No limit</button></div>
    <p class="fine adm-ex">${ruleExample(s)}</p>
    <div class="adm-rule"><span>Customers can book up to</span><div class="stepper"><button type="button" data-step="maxAheadDays:-7" aria-label="Less">−</button><b>${s.maxAheadDays}</b><button type="button" data-step="maxAheadDays:7" aria-label="More">+</button></div><span>days ahead</span></div>
  </section>

  <section class="panel adm-sec">
    <h2><span class="num">5</span>Pick-up place</h2>
    <div class="fields">
      <div class="field"><label for="a-place">Place name</label><input class="input" id="a-place" data-pick="place" value="${esc(s.pickup.place)}" maxlength="60"></div>
      <div class="field"><label for="a-city">City</label><input class="input" id="a-city" data-pick="city" value="${esc(s.pickup.city)}" maxlength="60"></div>
      <div class="field field--full"><label for="a-map">Google Maps pin link</label><input class="input" id="a-map" data-pick="mapUrl" type="url" inputmode="url" value="${esc(s.pickup.mapUrl)}" maxlength="500" placeholder="https://maps.app.goo.gl/…"><span class="hint">In Google Maps, tap the place → Share → Copy link, then paste it here. <a href="${esc(s.pickup.mapUrl)}" target="_blank" rel="noopener" id="a-map-test">Test the link ↗</a></span></div>
    </div>
  </section>

  <section class="panel adm-sec">
    <h2><span class="num">6</span>Announcement <span class="opt">(optional)</span></h2>
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
  $$('[data-avail]', box).forEach((c) => c.addEventListener('change', () => { s.soldOut[c.dataset.avail] = !c.checked; c.closest('.adm-item').querySelector('i').textContent = c.checked ? 'Available' : 'Sold out'; syncSave(); }));
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
  $('#admSave').onclick = async () => {
    const b = $('#admSave'); adm.busy = true; b.disabled = true; b.textContent = 'Saving…';
    s.pickupTimes = s.pickupTimes.map((t) => t.trim()).filter(Boolean);
    if (s.pickup.mapUrl && !/^https:\/\//.test(s.pickup.mapUrl)) { adm.busy = false; b.textContent = 'Save changes'; syncSave(); toast('The map link should start with https://'); $('#a-map').focus(); return; }
    let j; try { j = await adminCall('save', { settings: s }); } catch { j = { ok: false, error: 'Can’t reach the website right now. Please try again.' }; }
    adm.busy = false; b.textContent = 'Save changes';
    if (!j.ok) { if (/password/i.test(j.error || '')) { adm.pw = ''; sstore.set('so_admin', ''); } toast(j.error || 'Couldn’t save. Please try again.'); syncSave(); return; }
    adm.s = cleanSettings(j.settings); adm.saved = JSON.stringify(adm.s); adm.updatedAt = j.settings.updatedAt;
    applySettings(adm.s); store.set('so_settings', adm.s); showNotice();
    rerender(); toast('Saved! Customers see the changes right away.');
  };
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
function refreshCart() { const before = cart.items.length; cart.items = cart.items.filter((i) => !findProduct(i.pid)?.soldOut); if (cart.items.length !== before) cart.save(); }

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
