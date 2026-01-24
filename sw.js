// Service worker v7.2 – navigate fallback on non-OK (bijv. 404)
const CACHE_NAME = 'fiets-inruil-cache-v7.2';
const ASSETS = [
  './index.html',
  './styles.css',
  './app.js',
  './data.json',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(ASSETS.map(async (url) => {
      try {
        const resp = await fetch(url, { cache: 'no-cache' });
        if (resp && resp.ok) await cache.put(url, resp);
      } catch (e) { /* overslaan */ }
    }));
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k !== CACHE_NAME) ? caches.delete(k) : null));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const net = await fetch(req);
        if (!net.ok) {
          const cached = await caches.match('./index.html');
          return cached || net;
        }
        return net;
      } catch {
        return (await caches.match('./index.html')) || Response.error();
      }
    })());
    return;
  }
  event.respondWith((async () => {
    const cached = await caches.match(req);
    const fetchPromise = fetch(req).then(async resp => {
      const copy = resp.clone();
      const cache = await caches.open(CACHE_NAME);
      cache.put(req, copy);
      return resp;
    }).catch(() => cached);
    return cached || fetchPromise;
  })());
});
