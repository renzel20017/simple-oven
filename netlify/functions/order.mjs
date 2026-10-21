// Netlify Function → POST /api/order (same logic as the Cloudflare version in functions/api/)
import { handleOrder } from '../../server/order.js';

const env = new Proxy({}, { get: (_, key) => Netlify.env.get(String(key)) });

export default async (req) => {
  if (req.method !== 'POST') return Response.json({ ok: false, error: 'Method not allowed.' }, { status: 405, headers: { Allow: 'POST' } });
  return handleOrder(req, env);
};

export const config = { path: '/api/order' };
