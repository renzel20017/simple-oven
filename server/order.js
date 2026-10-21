// Order logic for POST /api/order (used by functions/api/order.js).
// Re-checks every field, recomputes prices from public/js/products.js, rejects sold-out items
// and closed dates, emails the order via Resend, then logs it to Google Sheets (optional).
import { SHOP, findProduct, findVariant, findZone, isClosedDate } from '../public/js/products.js';
import { esc, clean, peso, todayManila, json, readJson, rateLimiter, originAllowed, sendResend, logToSheet, emailConfigured } from './lib.js';

const MAX_LINES = 20;
const limiter = rateLimiter(6, 10 * 60 * 1000);
const recent = new Map(); // idempotencyKey -> response (best-effort dedupe)

const TIMES = ['Morning (9am – 12nn)', 'Afternoon (12nn – 5pm)', 'Evening (5pm – 8pm)', 'Any time'];
const PAYMENTS = ['GCash', 'Bank transfer', 'Cash on pick-up'];

function makeOrderId() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let r = '';
  for (const b of crypto.getRandomValues(new Uint8Array(4))) r += alphabet[b % alphabet.length];
  return `SO-${todayManila().slice(2).replace(/-/g, '')}-${r}`;
}

export function validateOrder(body) {
  const errors = {};
  const b = body && typeof body === 'object' ? body : {};
  const o = {
    name: clean(b.name, 80),
    phone: clean(b.phone, 20),
    email: clean(b.email, 120),
    social: clean(b.social, 80),
    fulfillment: 'pickup', // we only do pick-up; customers may send their own rider
    pickupBy: b.pickupBy === 'rider' ? 'rider' : 'self',
    address: clean(b.address, 300),
    zone: clean(b.zone, 20),
    date: clean(b.date, 10),
    time: TIMES.includes(b.time) ? b.time : 'Any time',
    payment: PAYMENTS.includes(b.payment) ? b.payment : 'GCash',
    notes: clean(b.notes, 500),
    gift: b.gift === true || b.gift === 'on' || b.gift === 'true',
    giftTo: clean(b.giftTo, 80),
    giftPhone: clean(b.giftPhone, 20),
    giftNote: clean(b.giftNote, 200),
    giftHidePrices: b.giftHidePrices === true || b.giftHidePrices === 'on' || b.giftHidePrices === 'true',
  };
  if (o.name.length < 2) errors.name = 'Please enter your name.';
  const digits = o.phone.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 13) errors.phone = 'Please enter a valid mobile number.';
  if (o.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(o.email)) errors.email = 'Please check your email address.';
  o.address = ''; o.zone = '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(o.date) || o.date < todayManila(0)) errors.date = 'Please choose a valid date.';
  else if (isClosedDate(o.date)) errors.date = 'Sorry, we’re closed on that date. Please pick another day.';
  if (o.gift) {
    if (o.giftTo.length < 2) errors.giftTo = 'Please enter who the gift is for.';
    if (o.giftPhone && (o.giftPhone.replace(/\D/g, '').length < 10 || o.giftPhone.replace(/\D/g, '').length > 13)) errors.giftPhone = 'Please check the recipient’s number.';
  } else { o.giftTo = ''; o.giftPhone = ''; o.giftNote = ''; o.giftHidePrices = false; }

  // items — recompute everything from the server-side menu
  const items = Array.isArray(b.items) ? b.items.slice(0, MAX_LINES) : [];
  const merged = new Map();
  const soldOut = [];
  for (const it of items) {
    const p = findProduct(String(it?.pid));
    const v = findVariant(p, String(it?.vid));
    const q = Math.floor(Number(it?.qty));
    if (!p || !v || !Number.isFinite(q) || q < 1) continue;
    if (p.soldOut) { soldOut.push(p.name); continue; }
    const k = p.id + ':' + v.id;
    merged.set(k, Math.min(SHOP.maxQtyPerItem, (merged.get(k) || 0) + q));
  }
  const lines = [...merged].map(([k, qty]) => {
    const [pid, vid] = k.split(':');
    const p = findProduct(pid), v = findVariant(p, vid);
    return { pid, vid, name: p.name, variant: v.label, price: v.price, qty, total: v.price * qty };
  });
  if (soldOut.length) errors.items = `Sorry, ${soldOut.join(', ')} just sold out. Please remove it from your cart.`;
  else if (!lines.length) errors.items = 'Your cart is empty.';
  o.lines = lines;
  o.subtotal = lines.reduce((s, l) => s + l.total, 0);
  return { order: o, errors };
}

const fmtDate = (ds) => new Date(ds + 'T00:00:00').toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
const feeText = (z) => (!z ? '' : z.min == null ? 'to quote' : `${peso(z.min)}–${peso(z.max)} (est.)`);

export function ownerEmail(o) {
  const row = (k, v) => v ? `<tr><td style="padding:6px 12px 6px 0;color:#7b6a5c;white-space:nowrap;vertical-align:top">${k}</td><td style="padding:6px 0;font-weight:600">${v}</td></tr>` : '';
  const when = fmtDate(o.date);
  const tel = o.phone.replace(/[^\d+]/g, '');
  const html = `<!doctype html><html><body style="margin:0;background:#f3ece0;font-family:Arial,Helvetica,sans-serif;color:#17120e">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px">
    <div style="background:#fffdf8;border-radius:14px;padding:26px 24px;border:1px solid #e6dccb">
      <p style="margin:0;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#7b6a5c">New order · simple oven</p>
      <h1 style="margin:6px 0 4px;font-family:Georgia,serif;font-size:28px">${esc(o.orderId)}</h1>
      <p style="margin:0 0 6px;color:#4a3c32">${o.pickupBy === 'rider' ? '🛵 Pick-up by their own rider' : '🛍️ Customer picks up'} at ${esc(SHOP.pickup.place)} · <b>${esc(when)}</b> · ${esc(o.time)}</p>
      ${o.gift ? `<p style="margin:0 0 6px;display:inline-block;background:#8b1d24;color:#fff;border-radius:99px;padding:4px 10px;font-size:13px;font-weight:700">🎁 GIFT ORDER${o.giftHidePrices ? ' · hide prices' : ''}</p>` : ''}
      <table style="width:100%;border-collapse:collapse;font-size:15px;margin-top:12px">
        ${o.lines.map((l) => `<tr><td style="padding:8px 0;border-bottom:1px dashed #d8ccb8"><b>${l.qty} ×</b> ${esc(l.name)}<br><span style="color:#7b6a5c;font-size:13px">${esc(l.variant)} · ${peso(l.price)}</span></td><td style="padding:8px 0;border-bottom:1px dashed #d8ccb8;text-align:right;font-weight:700">${peso(l.total)}</td></tr>`).join('')}
        <tr><td style="padding:12px 0 0;font-size:18px;font-weight:800">Subtotal</td><td style="padding:12px 0 0;text-align:right;font-size:18px;font-weight:800">${peso(o.subtotal)}</td></tr>
        ${o.fulfillment === 'delivery' ? `<tr><td style="color:#7b6a5c;font-size:13px;padding-top:4px">Rider fee (${esc(o.zoneInfo?.label || '')})</td><td style="color:#7b6a5c;font-size:13px;padding-top:4px;text-align:right">${esc(feeText(o.zoneInfo))}</td></tr>` : ''}
      </table>
      <h2 style="font-family:Georgia,serif;font-size:19px;margin:26px 0 8px">Customer</h2>
      <table style="border-collapse:collapse;font-size:15px">
        ${row('Name', esc(o.name))}
        ${row('Mobile', `<a href="tel:${esc(tel)}" style="color:#8b1d24">${esc(o.phone)}</a>`)}
        ${row('Email', o.email ? `<a href="mailto:${esc(o.email)}" style="color:#8b1d24">${esc(o.email)}</a>` : '')}
        ${row('IG / FB', esc(o.social))}
        ${row('Payment', esc(o.payment))}
        ${row('Notes', esc(o.notes).replace(/\n/g, '<br>'))}
      </table>
      ${o.gift ? `<h2 style="font-family:Georgia,serif;font-size:19px;margin:22px 0 8px">🎁 Gift for</h2><table style="border-collapse:collapse;font-size:15px">
        ${row('Recipient', esc(o.giftTo))}${row('Their mobile', esc(o.giftPhone))}${row('Gift note', esc(o.giftNote).replace(/\n/g, '<br>'))}${row('Prices', o.giftHidePrices ? 'Do NOT include prices in the box' : '')}</table>` : ''}
      ${o.fulfillment === 'delivery' ? `<h2 style="font-family:Georgia,serif;font-size:19px;margin:22px 0 8px">Deliver to</h2><p style="margin:0;font-size:15px;font-weight:600">${esc(o.address).replace(/\n/g, '<br>')}</p><p style="margin:4px 0 0;color:#7b6a5c;font-size:13px">Area: ${esc(o.zoneInfo?.label || '')}</p>` : ''}
      <p style="margin:24px 0 0;font-size:12px;color:#7b6a5c">Received ${esc(new Date(o.createdAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila' }))} (Manila time). ${o.email ? 'Hit “Reply” to email the customer directly.' : ''}</p>
    </div>
  </div></body></html>`;
  const text = [
    `NEW ORDER ${o.orderId}`,
    `${o.pickupBy === 'rider' ? 'Pick-up by own rider' : 'Customer picks up'} at ${SHOP.pickup.place} · ${when} · ${o.time}`,
    o.gift ? `GIFT ORDER for ${o.giftTo}${o.giftHidePrices ? ' (hide prices)' : ''}` : null,
    '',
    ...o.lines.map((l) => `${l.qty} x ${l.name} (${l.variant}) — ${peso(l.total)}`),
    `Subtotal: ${peso(o.subtotal)}`,
    o.fulfillment === 'delivery' ? `Rider fee: ${feeText(o.zoneInfo)} — ${o.zoneInfo?.label}` : null,
    '',
    `Name: ${o.name}`, `Mobile: ${o.phone}`, o.email ? `Email: ${o.email}` : null, o.social ? `IG/FB: ${o.social}` : null,
    o.fulfillment === 'delivery' ? `Address: ${o.address}` : null, `Payment: ${o.payment}`, o.notes ? `Notes: ${o.notes}` : null,
    o.gift && o.giftPhone ? `Recipient mobile: ${o.giftPhone}` : null, o.gift && o.giftNote ? `Gift note: ${o.giftNote}` : null,
  ].filter((x) => x != null).join('\n');
  return { html, text, subject: `${o.gift ? '🎁' : '🍪'} New order ${o.orderId} · ${o.name} · ${peso(o.subtotal)}` };
}

function customerEmail(o) {
  const html = `<!doctype html><html><body style="margin:0;background:#f3ece0;font-family:Arial,Helvetica,sans-serif;color:#17120e"><div style="max-width:520px;margin:0 auto;padding:24px 16px"><div style="background:#fffdf8;border-radius:14px;padding:26px 24px">
  <h1 style="font-family:Georgia,serif;margin:0 0 8px">Thank you, ${esc(o.name.split(' ')[0])}!</h1>
  <p>We received your order <b>${esc(o.orderId)}</b>. We'll message you soon to confirm it and the final total.</p>
  <table style="width:100%;border-collapse:collapse;font-size:15px">${o.lines.map((l) => `<tr><td style="padding:6px 0">${l.qty} × ${esc(l.name)} <span style="color:#7b6a5c">(${esc(l.variant)})</span></td><td style="text-align:right">${peso(l.total)}</td></tr>`).join('')}
  <tr><td style="padding-top:10px;font-weight:800">Subtotal</td><td style="text-align:right;font-weight:800;padding-top:10px">${peso(o.subtotal)}</td></tr></table>
  <p style="color:#7b6a5c;font-size:13px">simple oven · home-baked goods</p></div></div></body></html>`;
  return { html, subject: `We got your order ${o.orderId} 🍪` };
}

// Cloudflare Pages Function entry: POST /api/order
export async function handleOrder(request, env) {
  if (!originAllowed(env, request.headers.get('origin'))) return json(403, { ok: false, error: 'This form can only be used on the Simple Oven website.' });
  const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'x';
  if (limiter.blocked(ip)) return json(429, { ok: false, error: 'Too many orders from this device. Please wait a few minutes and try again.' });

  let body;
  try { body = await readJson(request, 20000); } catch { return json(400, { ok: false, error: 'Invalid request.' }); }

  // honeypot: bots fill hidden fields — pretend success, send nothing
  if (body.company) return json(200, { ok: true, order: { orderId: 'SO-000000-0000', lines: [], subtotal: 0 } });

  const idem = clean(body.idempotencyKey, 80);
  if (idem && recent.has(idem)) return json(200, recent.get(idem));

  const { order, errors } = validateOrder(body);
  if (Object.keys(errors).length) return json(422, { ok: false, error: Object.values(errors)[0], fields: errors });

  if (!emailConfigured(env)) {
    console.error('[order] Missing RESEND_API_KEY or ORDER_TO_EMAIL');
    return json(500, { ok: false, error: 'Online ordering is not set up yet.' });
  }

  order.orderId = makeOrderId();
  order.createdAt = Date.now();

  try {
    const mail = ownerEmail(order);
    await sendResend(env, { to: env.ORDER_TO_EMAIL, subject: mail.subject, html: mail.html, text: mail.text, replyTo: order.email || undefined, idempotencyKey: idem ? `owner-${idem}` : undefined });
  } catch (err) {
    console.error('[order] email failed', err.message);
    return json(502, { ok: false, error: 'We couldn’t send your order right now.' });
  }
  limiter.hit(ip);

  // extras that must never break a successful order
  const extras = [logToSheet(env, { action: 'order', order: {
    orderId: order.orderId, createdAt: new Date(order.createdAt).toISOString(), name: order.name, phone: order.phone, email: order.email, social: order.social,
    fulfillment: order.pickupBy === 'rider' ? 'Pick-up (own rider)' : 'Pick-up', date: order.date, time: order.time, address: '', zone: '',
    items: order.lines.map((l) => `${l.qty}× ${l.name} (${l.variant})`).join(', '), subtotal: order.subtotal, payment: order.payment,
    gift: order.gift ? `For ${order.giftTo}${order.giftNote ? ' — “' + order.giftNote + '”' : ''}` : '', notes: order.notes,
  } })];
  if (env.SEND_CUSTOMER_CONFIRMATION === 'true' && order.email) {
    const c = customerEmail(order);
    extras.push(sendResend(env, { to: order.email, subject: c.subject, html: c.html, idempotencyKey: idem ? `cust-${idem}` : undefined }).catch((err) => console.warn('[order] customer email failed', err.message)));
  }
  await Promise.allSettled(extras);

  const response = {
    ok: true,
    order: {
      orderId: order.orderId, createdAt: order.createdAt, name: order.name, phone: order.phone,
      fulfillment: order.fulfillment, pickupBy: order.pickupBy, date: order.date, time: order.time, payment: order.payment,
      pickupBy: order.pickupBy, zone: null, gift: order.gift ? { to: order.giftTo, hidePrices: order.giftHidePrices } : null,
      lines: order.lines.map(({ name, variant, qty, total }) => ({ name, variant, qty, total })),
      subtotal: order.subtotal,
    },
  };
  if (idem) { recent.set(idem, response); if (recent.size > 500) recent.delete(recent.keys().next().value); }
  return json(200, response);
}
