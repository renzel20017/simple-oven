// Photo Dump (owner's photos) + Sweet Confessions (customer reviews).
// Stored in the same KV as the settings:
//   gallery       → [{ id, caption, at }]             newest first
//   gimg:<id>     → photo (data URL)
//   reviews       → [{ id, name, stars, text, photo, at, ok }]   ok = approved by the owner
//   rimg:<id>     → review photo (data URL)
import { json, readJson, rateLimiter, originAllowed, clean, esc, sendResend, emailConfigured } from './lib.js';

const MAX_GALLERY = 150, MAX_REVIEWS = 500;
const IMG_RE = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;
const newId = (p) => p + '-' + crypto.getRandomValues(new Uint32Array(2)).reduce((s, n) => s + n.toString(36), '').slice(0, 10);
const getList = async (env, k) => { try { const v = await env.SETTINGS.get(k, 'json'); return Array.isArray(v) ? v : []; } catch { return []; } };
const putList = (env, k, v) => env.SETTINGS.put(k, JSON.stringify(v));
const publicReview = (r) => ({ id: r.id, name: r.name, stars: r.stars, text: r.text, photo: !!r.photo, at: r.at });

// GET /api/wall → photos + approved reviews
export async function handleWallGet(request, env) {
  if (!env.SETTINGS) return json(200, { ok: true, photos: [], reviews: [] });
  const [photos, reviews] = await Promise.all([getList(env, 'gallery'), getList(env, 'reviews')]);
  return new Response(JSON.stringify({ ok: true, photos, reviews: reviews.filter((r) => r.ok).map(publicReview) }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=20' },
  });
}

// POST /api/wall → a customer sends a review (waits for the owner's OK before it shows)
const limiter = rateLimiter(4, 60 * 60 * 1000);
export async function handleWallPost(request, env) {
  if (!originAllowed(env, request.headers.get('Origin'))) return json(403, { ok: false, error: 'Not allowed.' });
  if (!env.SETTINGS) return json(503, { ok: false, error: 'Reviews aren’t switched on yet. Please try again later.' });
  const ip = request.headers.get('CF-Connecting-IP') || 'local';
  if (limiter.blocked(ip)) return json(429, { ok: false, error: 'Thank you! You’ve sent a few already. Please try again in an hour.' });
  let b; try { b = await readJson(request, 3.5 * 1024 * 1024); } catch { return json(413, { ok: false, error: 'That photo is too large. Please choose a smaller one.' }); }
  if (b.website) return json(200, { ok: true }); // bot trap
  const stars = Math.round(Number(b.stars)), text = clean(b.text, 400), name = b.anonymous ? '' : clean(b.name, 40);
  const errors = {};
  if (!(stars >= 1 && stars <= 5)) errors.stars = 'Tap the stars to rate us.';
  if (text.length < 3) errors.text = 'Please write a little something.';
  if (!b.anonymous && !name) errors.name = 'Add your name, or choose “Stay anonymous”.';
  const photo = typeof b.photo === 'string' && b.photo ? b.photo : '';
  if (photo && (!IMG_RE.test(photo) || photo.length > 3 * 1024 * 1024)) errors.photo = 'Please use a JPG or PNG photo.';
  if (Object.keys(errors).length) return json(422, { ok: false, errors });
  limiter.hit(ip);
  const r = { id: newId('r'), name, stars, text, photo: !!photo, at: new Date().toISOString(), ok: false };
  try {
    if (photo) await env.SETTINGS.put('rimg:' + r.id, photo);
    const list = await getList(env, 'reviews');
    list.unshift(r);
    for (const old of list.splice(MAX_REVIEWS)) if (old.photo) await env.SETTINGS.delete('rimg:' + old.id).catch(() => {});
    await putList(env, 'reviews', list);
  } catch (e) { console.error('[review] save failed', e); return json(502, { ok: false, error: 'Couldn’t send it right now. Please try again in a minute.' }); }
  if (emailConfigured(env)) {
    const who = name || 'Anonymous';
    try {
      await sendResend(env, { to: env.ORDER_TO_EMAIL, subject: `New sweet confession ${'★'.repeat(stars)} from ${who}`,
        text: `${who} wrote (${stars}/5):\n\n${text}\n\nIt shows on the website after you approve it on the owner page → Sweet confessions.`,
        html: `<p><b>${esc(who)}</b> wrote (${'★'.repeat(stars)}${'☆'.repeat(5 - stars)}):</p><blockquote style="font-family:Courier,monospace">${esc(text).replace(/\n/g, '<br>')}</blockquote>${photo ? '<p>📷 With a photo.</p>' : ''}<p>It shows on the website after you approve it on the owner page → <b>Sweet confessions</b>.</p>` });
    } catch (e) { console.warn('[review] email failed', e.message); }
  }
  return json(200, { ok: true });
}

// GET /api/wimg?id=g-… or r-… → a photo
export async function handleWallImg(request, env) {
  const id = new URL(request.url).searchParams.get('id') || '';
  if (!env.SETTINGS || !/^[gr]-[a-z0-9]{4,12}$/.test(id)) return new Response('Not found', { status: 404 });
  const v = await env.SETTINGS.get((id[0] === 'g' ? 'gimg:' : 'rimg:') + id).catch(() => null);
  const m = v && /^data:(image\/(?:png|jpeg|webp));base64,(.+)$/.exec(v);
  if (!m) return new Response('Not found', { status: 404 });
  const bin = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0));
  return new Response(bin, { headers: { 'Content-Type': m[1], 'Cache-Control': 'public, max-age=31536000, immutable' } });
}

// owner actions (password already checked by /api/admin)
export async function wallAdmin(body, env) {
  if (!env.SETTINGS) return json(503, { ok: false, error: 'Saving isn’t set up yet (KV storage).' });
  const a = body.action;
  if (a === 'wall') {
    const [photos, reviews] = await Promise.all([getList(env, 'gallery'), getList(env, 'reviews')]);
    return json(200, { ok: true, photos, reviews });
  }
  if (a === 'gallery-add') {
    const imgs = Array.isArray(body.images) ? body.images.slice(0, 12) : [];
    if (!imgs.length) return json(400, { ok: false, error: 'Please choose a photo.' });
    const list = await getList(env, 'gallery'), added = [];
    for (const it of imgs) {
      if (typeof it?.image !== 'string' || !IMG_RE.test(it.image) || it.image.length > 3 * 1024 * 1024) return json(422, { ok: false, error: 'One of the photos is too large. Please try a smaller one.' });
      const g = { id: newId('g'), caption: clean(it.caption, 80), at: new Date().toISOString() };
      await env.SETTINGS.put('gimg:' + g.id, it.image); added.push(g);
    }
    list.unshift(...added.reverse());
    for (const old of list.splice(MAX_GALLERY)) await env.SETTINGS.delete('gimg:' + old.id).catch(() => {});
    await putList(env, 'gallery', list);
    return json(200, { ok: true, photos: list });
  }
  const list = await getList(env, a.startsWith('gallery') ? 'gallery' : 'reviews');
  const i = list.findIndex((x) => x.id === body.id);
  if (i < 0) return json(404, { ok: false, error: 'That one is already gone. Please refresh.' });
  if (a === 'gallery-caption') { list[i].caption = clean(body.caption, 80); await putList(env, 'gallery', list); return json(200, { ok: true, photos: list }); }
  if (a === 'gallery-move') { const j = i + (body.dir < 0 ? -1 : 1); if (j >= 0 && j < list.length) [list[i], list[j]] = [list[j], list[i]]; await putList(env, 'gallery', list); return json(200, { ok: true, photos: list }); }
  if (a === 'gallery-del') { const [g] = list.splice(i, 1); await env.SETTINGS.delete('gimg:' + g.id).catch(() => {}); await putList(env, 'gallery', list); return json(200, { ok: true, photos: list }); }
  if (a === 'review-status') { list[i].ok = !!body.ok; await putList(env, 'reviews', list); return json(200, { ok: true, reviews: list }); }
  if (a === 'review-del') { const [r] = list.splice(i, 1); if (r.photo) await env.SETTINGS.delete('rimg:' + r.id).catch(() => {}); await putList(env, 'reviews', list); return json(200, { ok: true, reviews: list }); }
  return json(400, { ok: false, error: 'Unknown action.' });
}
