import { handleAdmin } from '../../server/settings.js';
export const onRequestPost = ({ request, env }) => handleAdmin(request, env);
export const onRequest = () => new Response(JSON.stringify({ ok: false, error: 'Method not allowed.' }), { status: 405, headers: { Allow: 'POST', 'Content-Type': 'application/json' } });
