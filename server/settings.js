// Owner settings (what's available, pick-up days/times, ordering rules).
// Saved by the owner page (/#/admin) into Cloudflare KV under the binding "SETTINGS".
// If KV isn't set up yet, everything falls back to the values in public/js/products.js.
import { cleanSettings, defaultSettings, applySettings } from '../public/js/products.js';
import { json, readJson, rateLimiter, originAllowed } from './lib.js';

const KEY = 'settings';
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
  try { body = await readJson(request, 64 * 1024); } catch { return json(400, { ok: false, error: 'Bad request.' }); }
  if (!(await passwordOk(env, body?.password))) { fails.hit(ip); return json(401, { ok: false, error: 'Wrong password.' }); }

  if (body.action === 'login') {
    const s = await loadSettings(env, { fresh: true });
    return json(200, { ok: true, settings: s, storage: !!env.SETTINGS });
  }
  if (body.action === 'save') {
    if (!env.SETTINGS) return json(503, { ok: false, error: 'Saving isn’t set up yet: connect a KV storage called SETTINGS in Cloudflare (see README step 10).', setup: true });
    const clean = { ...cleanSettings(body.settings || {}), updatedAt: new Date().toISOString() };
    try { await env.SETTINGS.put(KEY, JSON.stringify(clean)); }
    catch (e) { console.error('[settings] save failed', e); return json(502, { ok: false, error: 'Couldn’t save right now. Please try again in a minute.' }); }
    cache = { at: Date.now(), value: { ...clean, storage: true } };
    return json(200, { ok: true, settings: clean });
  }
  return json(400, { ok: false, error: 'Unknown action.' });
}
