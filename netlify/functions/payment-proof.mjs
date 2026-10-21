// Netlify Function → POST /api/payment-proof
import { handleProof } from '../../server/payment-proof.js';

const env = new Proxy({}, { get: (_, key) => Netlify.env.get(String(key)) });

export default async (req) => {
  if (req.method !== 'POST') return Response.json({ ok: false, error: 'Method not allowed.' }, { status: 405, headers: { Allow: 'POST' } });
  return handleProof(req, env);
};

export const config = { path: '/api/payment-proof' };
