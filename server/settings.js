// Owner settings (what's available, pick-up days/times, ordering rules).
// Saved by the owner page (/#/admin) into Cloudflare KV under the binding "SETTINGS".
// If KV isn't set up yet, everything falls back to the values in public/js/products.js.
import { cleanSettings, defaultSettings, applySettings, BASE_PRODUCTS } from '../public/js/products.js';
import { json, readJson, rateLimiter, originAllowed } from './lib.js';
import { wallAdmin } from './wall.js';
import { ordersAdmin } from './orders.js';

const KEY = 'settings';
const QR_KEY = 'gcash-qr';
let cache = { at: 0, value: null };

export async function loadSettings(env, { fresh = false } = {}) {
  if (!env.SETTINGS) return { ...defaultSettings(), storage: false };
  if (!fresh && cache.value && Date.now() - cache.at < 15000) return cache.value;
  let raw = null;
  try { raw = await env.SETTINGS.get(KEY, 'json'); } catch (e) { console.error('[settings] read failed', e); }
  const value = { ...cleanSettings(raw || {}), updatedAt: raw?.updatedAt || null, storage: true };
  cache = { at: Date.now(), value };
  return value;
}

// Loads the owner's settings into the shared menu (SHOP / PRODUCTS) before validating an order.
export async function useSettings(env) { const s = await loadSettings(env); applySettings(s); return s; }

export async function handleSettings(request, env) {
  const s = await loadSettings(env);
  const { storage, ...pub } = s;
  return new Response(JSON.stringify({ ok: true, settings: pub }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=20' },
  });
}

// ── owner page API ──
const fails = rateLimiter(8, 15 * 60 * 1000);
async function sha(s) { return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(s)))); }
async function passwordOk(env, given) {
  if (!env.ADMIN_PASSWORD || typeof given !== 'string' || !given) return false;
  const [a, b] = await Promise.all([sha(given), sha(env.ADMIN_PASSWORD)]);
  let diff = 0; for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function handleAdmin(request, env) {
  if (!originAllowed(env, request.headers.get('Origin'))) return json(403, { ok: false, error: 'Not allowed.' });
  const ip = request.headers.get('CF-Connecting-IP') || 'local';
  if (fails.blocked(ip)) return json(429, { ok: false, error: 'Too many wrong passwords. Please wait 15 minutes and try again.' });
  if (!env.ADMIN_PASSWORD) return json(503, { ok: false, error: 'The owner password isn’t set up yet (ADMIN_PASSWORD in Cloudflare).', setup: true });
  let body;
  try { body = await readJson(request, 12 * 1024 * 1024); } catch { return json(400, { ok: false, error: 'That upload is too large. Please use a smaller QR image.' }); }
  if (!(await passwordOk(env, body?.password))) { fails.hit(ip); return json(401, { ok: false, error: 'Wrong password.' }); }

  if (/^(wall$|gallery-|review-)/.test(String(body.action))) return wallAdmin(body, env);
  if (/^(orders$|order-)/.test(String(body.action))) return ordersAdmin(body, env);
  if (body.action === 'login') {
    const s = await loadSettings(env, { fresh: true });
    return json(200, { ok: true, settings: s, storage: !!env.SETTINGS });
  }
  if (body.action === 'save') {
    if (!env.SETTINGS) return json(503, { ok: false, error: 'Saving isn’t set up yet: connect a KV storage called SETTINGS in Cloudflare (see README step 10).', setup: true });
    const clean = { ...cleanSettings(body.settings || {}), updatedAt: new Date().toISOString() };
    // GCash QR image: stored separately so the settings stay small
    if (body.qrImage === 'remove') { try { await env.SETTINGS.delete(QR_KEY); } catch {} clean.payment.qr = ''; }
    else if (typeof body.qrImage === 'string' && body.qrImage) {
      const m = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.exec(body.qrImage);
      if (!m || body.qrImage.length > 2 * 1024 * 1024) return json(422, { ok: false, error: 'Please upload the QR as a JPG or PNG under 1.5 MB.' });
      try { await env.SETTINGS.put(QR_KEY, body.qrImage); } catch { return json(502, { ok: false, error: 'Couldn’t save the QR right now. Please try again.' }); }
      clean.payment.qr = String(Date.now());
    }
    // product photos (built-in and owner-added products), stored one per key: pimg:<id>
    const pim = body.productImages && typeof body.productImages === 'object' ? body.productImages : {};
    const targets = [
      ...BASE_PRODUCTS.map((p) => ({ id: p.id, name: clean.names[p.id] || p.name, set: (v) => { if (v) clean.photos[p.id] = v; else delete clean.photos[p.id]; } })),
      ...clean.extraProducts.map((x) => ({ id: x.id, name: x.name, set: (v) => { x.photo = v; } })),
      ...Object.values(clean.gallery).flatMap((g) => g.extra.map((e) => ({ id: e.id, name: 'an extra photo', set: (v) => { e.v = v; } }))),
    ];
    for (const t of targets) {
      const v = pim[t.id];
      if (v === 'remove') { try { await env.SETTINGS.delete('pimg:' + t.id); } catch {} t.set(''); }
      else if (typeof v === 'string' && v) {
        if (!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(v) || v.length > 2.5 * 1024 * 1024) return json(422, { ok: false, error: `The photo for ${t.name} is too large. Please use a smaller photo.` });
        try { await env.SETTINGS.put('pimg:' + t.id, v); } catch { return json(502, { ok: false, error: 'Couldn’t save the photo right now. Please try again.' }); }
        t.set(String(Date.now()));
      }
    }
    // extra photos that never got their picture are dropped
    for (const [pid, g] of Object.entries(clean.gallery)) { g.extra = g.extra.filter((e) => e.v); if (!g.hide.length && !g.extra.length) delete clean.gallery[pid]; }
    // clean up photos of products / extra photos that were deleted
    try {
      const old = await env.SETTINGS.get(KEY, 'json');
      for (const o of old?.extraProducts || []) if (!clean.extraProducts.some((x) => x.id === o.id)) await env.SETTINGS.delete('pimg:' + o.id);
      const keep = new Set(Object.values(clean.gallery).flatMap((g) => g.extra.map((e) => e.id)));
      for (const g of Object.values(old?.gallery || {})) for (const e of g?.extra || []) if (!keep.has(e.id)) await env.SETTINGS.delete('pimg:' + e.id);
    } catch {}
    try { await env.SETTINGS.put(KEY, JSON.stringify(clean)); }
    catch (e) { console.error('[settings] save failed', e); return json(502, { ok: false, error: 'Couldn’t save right now. Please try again in a minute.' }); }
    cache = { at: Date.now(), value: { ...clean, storage: true } };
    return json(200, { ok: true, settings: clean });
  }
  return json(400, { ok: false, error: 'Unknown action.' });
}

// GET /api/qr?v=… → the owner's GCash QR image
export async function handleQr(request, env) {
  if (!env.SETTINGS) return new Response('Not found', { status: 404 });
  const v = await env.SETTINGS.get(QR_KEY).catch(() => null);
  const m = v && /^data:(image\/(?:png|jpeg|webp));base64,(.+)$/.exec(v);
  if (!m) return new Response('Not found', { status: 404 });
  const bin = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0));
  return new Response(bin, { headers: { 'Content-Type': m[1], 'Cache-Control': 'public, max-age=86400' } });
}

// Remembers GCash/bank reference numbers so the same payment screenshot can't be used for two orders.
export async function refUsed(env, ref) {
  if (!env.SETTINGS || !ref) return null;
  try { return await env.SETTINGS.get('ref:' + ref); } catch { return null; }
}
export async function rememberRef(env, ref, orderId) {
  if (!env.SETTINGS || !ref) return;
  try { await env.SETTINGS.put('ref:' + ref, orderId, { expirationTtl: 60 * 60 * 24 * 120 }); } catch (e) { console.warn('[ref] not saved', e); }
}

// GET /api/pimg?id=<product id> → the owner's uploaded photo for that product
export async function handlePimg(request, env) {
  const id = new URL(request.url).searchParams.get('id') || '';
  if (!env.SETTINGS || !/^[a-z0-9-]{2,40}(\.g[a-z0-9]{4,10})?$/.test(id)) return new Response('Not found', { status: 404 });
  const v = await env.SETTINGS.get('pimg:' + id).catch(() => null);
  const m = v && /^data:(image\/(?:png|jpeg|webp));base64,(.+)$/.exec(v);
  if (!m) return new Response('Not found', { status: 404 });
  const bin = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0));
  return new Response(bin, { headers: { 'Content-Type': m[1], 'Cache-Control': 'public, max-age=31536000, immutable' } });
}
