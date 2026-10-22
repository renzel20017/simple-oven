import { handleSettings } from '../../server/settings.js';
export const onRequestGet = ({ request, env }) => handleSettings(request, env);
export const onRequest = () => new Response(JSON.stringify({ ok: false, error: 'Method not allowed.' }), { status: 405, headers: { Allow: 'GET', 'Content-Type': 'application/json' } });
