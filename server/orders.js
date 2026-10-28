// Keeps a copy of every order on the website (KV key "orders", newest first) so the owner page
// can show a summary and baking list. Email + Google Sheet stay the main record.
import { json, clean } from './lib.js';

const KEY = 'orders', MAX = 3000;
const getList = async (env) => { try { const v = await env.SETTINGS.get(KEY, 'json'); return Array.isArray(v) ? v : []; } catch { return []; } };

// called after an order email went out — never blocks or fails the order
export async function recordOrder(env, o) {
  if (!env.SETTINGS) return;
  try {
    const list = await getList(env);
    if (list.some((x) => x.id === o.orderId)) return;
    list.unshift({
      id: o.orderId, at: new Date(o.createdAt).toISOString(), status: 'new',
      name: o.name, phone: o.phone, social: o.social, email: o.email || '',
      date: o.date, time: o.time, pickupBy: o.pickupBy || 'self', payment: o.payment, paid: !!o.paidUpfront,
      gift: o.gift ? o.giftTo : '', notes: o.notes || '',
      lines: o.lines.map((l) => ({ pid: l.pid, vid: l.vid, name: l.name, variant: l.variant, qty: l.qty, total: l.total, adds: l.adds || {} })),
      subtotal: o.subtotal, tip: o.tip || 0, total: o.total,
    });
    list.length = Math.min(list.length, MAX);
    await env.SETTINGS.put(KEY, JSON.stringify(list));
  } catch (e) { console.warn('[orders] not saved', e.message); }
}

// a payment screenshot sent later (Upload payment page) marks the order as paid-pending-check
export async function markProof(env, orderId) {
  if (!env.SETTINGS) return;
  try { const list = await getList(env); const o = list.find((x) => x.id === orderId); if (o && !o.paid) { o.paid = true; await env.SETTINGS.put(KEY, JSON.stringify(list)); } } catch {}
}

// owner actions (password already checked by /api/admin)
export async function ordersAdmin(body, env) {
  if (!env.SETTINGS) return json(503, { ok: false, error: 'Saving isn’t set up yet (KV storage).' });
  const list = await getList(env);
  if (body.action === 'orders') return json(200, { ok: true, orders: list });
  const o = list.find((x) => x.id === clean(body.id, 20));
  if (!o) return json(404, { ok: false, error: 'That order wasn’t found. Please refresh.' });
  if (body.action === 'order-status') {
    if (!['new', 'done', 'cancelled'].includes(body.status)) return json(400, { ok: false, error: 'Unknown status.' });
    o.status = body.status;
  } else if (body.action === 'order-paid') o.paid = !!body.paid;
  else return json(400, { ok: false, error: 'Unknown action.' });
  await env.SETTINGS.put(KEY, JSON.stringify(list));
  return json(200, { ok: true, orders: list });
}
