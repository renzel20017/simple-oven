// Cloudflare Pages Function → POST /api/payment-proof
import { handleProof } from '../../server/payment-proof.js';

export const onRequestPost = ({ request, env }) => handleProof(request, env);
export const onRequest = () => new Response(JSON.stringify({ ok: false, error: 'Method not allowed.' }), { status: 405, headers: { Allow: 'POST', 'Content-Type': 'application/json' } });
