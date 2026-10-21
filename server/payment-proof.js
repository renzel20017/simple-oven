// ─────────────────────────────────────────────────────────────
//  POST /api/payment-proof — customer uploads a GCash / bank screenshot.
//  The image is emailed to you as an attachment (nothing is stored on a server),
//  and the order row in Google Sheets is marked "Proof received" if Sheets is set up.
// ─────────────────────────────────────────────────────────────
import { esc, clean, json, readJson, rateLimiter, originAllowed, sendResend, logToSheet, emailConfigured } from './lib.js';

const limiter = rateLimiter(5, 10 * 60 * 1000);
const MAX_BYTES = 3 * 1024 * 1024; // the site shrinks screenshots before sending, so real ones are far smaller
const TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

export function validateProof(b) {
  const errors = {};
  const o = {
    orderId: clean(b?.orderId, 20).toUpperCase(),
    name: clean(b?.name, 80),
    phone: clean(b?.phone, 20),
    amount: clean(b?.amount, 20),
    note: clean(b?.note, 200),
  };
  if (!/^SO-\d{6}-[A-Z0-9]{4}$/.test(o.orderId)) errors.orderId = 'Please enter your order number (it looks like SO-261023-7KQH).';
  const digits = o.phone.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 13) errors.phone = 'Please enter the mobile number you ordered with.';
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(b?.image || ''));
  if (!m) errors.image = 'Please choose a screenshot (JPG, PNG or WebP).';
  else {
    const bytes = Math.floor(m[2].length * 3 / 4);
    if (bytes > MAX_BYTES) errors.image = 'That image is too large. Please send a smaller screenshot.';
    o.mime = m[1]; o.base64 = m[2]; o.bytes = bytes;
  }
  return { proof: o, errors };
}

export async function handleProof(request, env) {
  if (!originAllowed(env, request.headers.get('origin'))) return json(403, { ok: false, error: 'This form can only be used on the Simple Oven website.' });
  const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'x';
  if (limiter.blocked(ip)) return json(429, { ok: false, error: 'Too many uploads. Please wait a few minutes and try again.' });

  let body;
  try { body = await readJson(request, 4.5 * 1024 * 1024); } catch { return json(400, { ok: false, error: 'The upload was too large or broken. Please try a smaller screenshot.' }); }
  if (body.company) return json(200, { ok: true });

  const { proof, errors } = validateProof(body);
  if (Object.keys(errors).length) return json(422, { ok: false, error: Object.values(errors)[0], fields: errors });
  if (!emailConfigured(env)) return json(500, { ok: false, error: 'Uploads are not set up yet. Please send your screenshot by DM.' });

  const when = new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' });
  const html = `<!doctype html><html><body style="margin:0;background:#f3ece0;font-family:Arial,Helvetica,sans-serif;color:#17120e"><div style="max-width:520px;margin:0 auto;padding:24px 16px"><div style="background:#fffdf8;border-radius:14px;padding:24px;border:1px solid #e6dccb">
    <p style="margin:0;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#7b6a5c">Payment proof · simple oven</p>
    <h1 style="margin:6px 0 10px;font-family:Georgia,serif;font-size:26px">${esc(proof.orderId)}</h1>
    <p style="margin:0 0 4px">From <b>${esc(proof.name || 'customer')}</b> · ${esc(proof.phone)}</p>
    ${proof.amount ? `<p style="margin:0 0 4px">Amount sent: <b>${esc(proof.amount)}</b></p>` : ''}
    ${proof.note ? `<p style="margin:0 0 4px">Note: ${esc(proof.note)}</p>` : ''}
    <p style="margin:14px 0 0;color:#7b6a5c;font-size:13px">The screenshot is attached. Please check it against your GCash / bank app before confirming. Received ${esc(when)}.</p>
  </div></div></body></html>`;
  try {
    await sendResend(env, {
      to: env.ORDER_TO_EMAIL,
      subject: `💸 Payment proof for ${proof.orderId} · ${proof.name || proof.phone}`,
      html,
      text: `Payment proof for ${proof.orderId}\nFrom: ${proof.name} (${proof.phone})\nAmount: ${proof.amount || '-'}\nNote: ${proof.note || '-'}`,
      attachments: [{ filename: `${proof.orderId}-payment.${TYPES[proof.mime]}`, content: proof.base64 }],
    });
  } catch (err) {
    console.error('[proof] email failed', err.message);
    return json(502, { ok: false, error: 'We couldn’t send your screenshot right now.' });
  }
  limiter.hit(ip);
  await logToSheet(env, { action: 'payment', orderId: proof.orderId, phone: proof.phone, amount: proof.amount, at: new Date().toISOString() });
  return json(200, { ok: true });
}
