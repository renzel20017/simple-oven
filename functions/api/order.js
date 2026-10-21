// Cloudflare Pages Function → POST /api/order
import { handleOrder } from '../../server/order.js';

export const onRequestPost = ({ request, env }) => handleOrder(request, env);
export const onRequest = () => new Response(JSON.stringify({ ok: false, error: 'Method not allowed.' }), { status: 405, headers: { Allow: 'POST', 'Content-Type': 'application/json' } });
