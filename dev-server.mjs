// Quick local preview without Cloudflare:  node dev-server.mjs  →  http://localhost:3000
// Serves /public and runs the real Pages Functions (functions/api/*) with a fake Cloudflare context.
// Reads settings from .dev.vars. MOCK_RESEND=1 saves emails to ./.mail-outbox instead of sending.
// (To run on Cloudflare's own local runtime instead: `npm run dev:cf`.)
import http from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const root = new URL('.', import.meta.url).pathname;
const env = { ...process.env };
for (const f of ['.dev.vars', '.env.local']) {
  if (!existsSync(join(root, f))) continue;
  for (const line of readFileSync(join(root, f), 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !env[m[1]]) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

if (env.MOCK_RESEND === '1') {
  const real = globalThis.fetch;
  let n = 0;
  globalThis.fetch = async (url, opts) => {
    if (env.SHEETS_WEBHOOK_URL && String(url) === env.SHEETS_WEBHOOK_URL) {
      await mkdir(join(root, '.mail-outbox'), { recursive: true });
      await writeFile(join(root, '.mail-outbox', `${Date.now()}-sheet.json`), opts.body);
      console.log('[mock sheets] ->', JSON.parse(opts.body).action);
      return new Response('{"ok":true}', { status: 200 });
    }
    if (String(url).startsWith('https://api.resend.com')) {
      if (env.MOCK_RESEND_FAIL === '1') return new Response('{"message":"mock failure"}', { status: 500 });
      await mkdir(join(root, '.mail-outbox'), { recursive: true });
      const body = JSON.parse(opts.body);
      await writeFile(join(root, '.mail-outbox', `${Date.now()}-${++n}.json`), JSON.stringify({ headers: { ...opts.headers, Authorization: '[hidden]' }, ...body }, null, 2));
      console.log('[mock resend] ->', body.to, body.subject);
      return new Response(JSON.stringify({ id: 'mock_' + n }), { status: 200 });
    }
    return real(url, opts);
  };
}

// fake Cloudflare KV for the owner page (saved to ./.dev-kv.json)
if (!env.NO_KV) {
  const file = join(root, '.dev-kv.json');
  const read = () => { try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return {}; } };
  env.SETTINGS = {
    async get(k, type) { const v = read()[k]; return v == null ? null : type === 'json' ? JSON.parse(v) : v; },
    async put(k, v) { await writeFile(file, JSON.stringify({ ...read(), [k]: v })); },
    async delete(k) { const o = read(); delete o[k]; await writeFile(file, JSON.stringify(o)); },
  };
}
const routes = {
  '/api/order': await import('./functions/api/order.js'),
  '/api/payment-proof': await import('./functions/api/payment-proof.js'),
  '/api/settings': await import('./functions/api/settings.js'),
  '/api/admin': await import('./functions/api/admin.js'),
  '/api/qr': await import('./functions/api/qr.js'),
  '/api/pimg': await import('./functions/api/pimg.js'),
  '/api/wall': await import('./functions/api/wall.js'),
  '/api/wimg': await import('./functions/api/wimg.js'),
};
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2' };

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const fn = routes[url.pathname];
  if (fn) {
    const chunks = []; for await (const c of req) chunks.push(c);
    const request = new Request(url, { method: req.method, headers: req.headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks) });
    const handler = (req.method === 'POST' && fn.onRequestPost) || (req.method === 'GET' && fn.onRequestGet) || fn.onRequest;
    const out = await handler({ request, env });
    res.writeHead(out.status, Object.fromEntries(out.headers));
    return res.end(Buffer.from(await out.arrayBuffer()));
  }
  let p = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
  if (p === '/' || p === '') p = '/index.html';
  try {
    const data = await readFile(join(root, 'public', p));
    res.setHeader('Content-Type', types[extname(p)] || 'application/octet-stream');
    res.end(data);
  } catch { res.statusCode = 404; res.end('Not found'); }
}).listen(env.PORT || 3000, () => console.log(`Simple Oven running at http://localhost:${env.PORT || 3000}`));
