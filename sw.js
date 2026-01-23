// Tolerante service worker voor GitHub Pages subpad
const CACHE_NAME = 'fiets-inruil-cache-v7.0';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './data.json',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
  // Voeg hier extra assets toe als ze zeker bestaan
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(ASSETS.map(async (url) => {
      try {
        const resp = await fetch(url, { cache: 'no-cache' });
        if (resp && resp.ok) await cache.put(url, resp);
      } catch (e) {
        // Asset overslaan; voorkomt dat één 404 de hele install breekt
      }
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
  // Navigatie: netwerk eerst, fallback naar cache/index
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try { return await fetch(req); }
      catch { return (await caches.match('./index.html')) || Response.error(); }
    })());
    return;
  }
  // Stale-while-revalidate voor overige assets
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
