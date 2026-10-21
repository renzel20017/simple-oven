// Shared server helpers for the Cloudflare Pages Functions (functions/api/*).

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const clean = (s, max) => String(s ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max);
export const peso = (n) => '₱' + Number(n).toLocaleString('en-PH');

export function todayManila(offsetDays = 0) {
  return new Date(Date.now() + 8 * 3600 * 1000 + offsetDays * 86400000).toISOString().slice(0, 10);
}


export const json = (status, data) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });

// best-effort per-instance rate limiter (resets when Cloudflare recycles the worker)
export function rateLimiter(max, windowMs) {
  const hits = new Map();
  return {
    blocked(ip) { const now = Date.now(); const h = (hits.get(ip) || []).filter((t) => now - t < windowMs); hits.set(ip, h); return h.length >= max; },
    hit(ip) { const h = hits.get(ip) || []; h.push(Date.now()); hits.set(ip, h); },
  };
}

export function originAllowed(env, origin) {
  const allowed = env.ALLOWED_ORIGIN;
  return !(allowed && origin && !allowed.split(',').map((s) => s.trim()).includes(origin));
}

export async function sendResend(env, { to, subject, html, text, replyTo, idempotencyKey, attachments }) {
  const from = env.ORDER_FROM_EMAIL || 'Simple Oven Orders <onboarding@resend.dev>';
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
      ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
    },
    body: JSON.stringify({ from, to: [to], subject, html, text, ...(replyTo ? { reply_to: replyTo } : {}), ...(attachments ? { attachments } : {}) }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Resend ${res.status}: ${detail.slice(0, 300)}`);
  }
  return res.json();
}

// Optional: log to Google Sheets through an Apps Script web app. Never blocks or fails an order.
export async function logToSheet(env, payload) {
  const url = env.SHEETS_WEBHOOK_URL;
  if (!url) return { skipped: true };
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ secret: env.SHEETS_SECRET || '', ...payload }),
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
    });
    const txt = await res.text().catch(() => '');
    if (!res.ok || txt.includes('"ok":false')) console.warn('[sheets] not saved:', res.status, txt.slice(0, 200));
    return { ok: res.ok };
  } catch (err) {
    console.warn('[sheets] failed:', err.message);
    return { ok: false };
  }
}

export const emailConfigured = (env) => Boolean(env.RESEND_API_KEY && env.ORDER_TO_EMAIL);

// read a JSON body with a size cap
export async function readJson(request, limit) {
  const len = Number(request.headers.get('content-length') || 0);
  if (len > limit) throw new Error('too large');
  const txt = await request.text();
  if (txt.length > limit) throw new Error('too large');
  return JSON.parse(txt || '{}');
}
