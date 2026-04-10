// public/sw.js - Service Worker para PWA (SPA: sempre devolve uma Response válida)
const CACHE = 'pontofacil-v5';

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(['/', '/index.html'])).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try {
    url = new URL(req.url);
  } catch {
    return;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
  // API: não interceptar (axios); só passa direto
  if (url.pathname.includes('/api')) return;

  event.respondWith(
    (async () => {
      try {
        const res = await fetch(req);
        if (res.ok && url.origin === self.location.origin) {
          try {
            const cache = await caches.open(CACHE);
            await cache.put(req, res.clone());
          } catch (_) {
            /* ignore cache write errors */
          }
        }
        return res;
      } catch {
        // Offline ou falha de rede: tenta cache da URL exata, depois shell do SPA
        const hit = await caches.match(req);
        if (hit) return hit;
        const shell = await caches.match('/index.html');
        if (shell) return shell;
        try {
          return await fetch('/index.html', { cache: 'reload' });
        } catch {
          return new Response('Sem conexão. Tente novamente.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          });
        }
      }
    })()
  );
});
