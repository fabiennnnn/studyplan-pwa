const SW_VERSION = '20260221-2355';
const CACHE_NAME = `studyplan-${SW_VERSION}`;

const PRECACHE_ASSETS = [
  './',
  './app.html',
  './offline.html',
  './manifest.json',
  './app-icon-192.png',
  './app-icon-512.png',
  './apple-touch-icon.png',
  './app-icon.svg',
  './sw.js'
];

function isNavigationRequest(request) {
  if (request.mode === 'navigate') return true;
  const accept = request.headers.get('accept') || '';
  return accept.includes('text/html');
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(PRECACHE_ASSETS);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => key !== CACHE_NAME)
        .map((key) => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (isNavigationRequest(request)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const networkResponse = await fetch(request);
        if (networkResponse && networkResponse.ok) {
          await cache.put(request, networkResponse.clone());
          await cache.put('./app.html', networkResponse.clone());
        }
        return networkResponse;
      } catch (_error) {
        const cachedApp = (await cache.match(request)) || (await cache.match('./app.html'));
        if (cachedApp) return cachedApp;
        const offlinePage = await cache.match('./offline.html');
        if (offlinePage) return offlinePage;
        return Response.error();
      }
    })());
    return;
  }

  // Static assets: Stale-While-Revalidate
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    const networkFetch = fetch(request)
      .then((response) => {
        if (response && response.ok) {
          cache.put(request, response.clone());
        }
        return response;
      })
      .catch(() => null);

    if (cached) {
      event.waitUntil(networkFetch);
      return cached;
    }

    const networkResponse = await networkFetch;
    if (networkResponse) return networkResponse;

    const offlinePage = await cache.match('./offline.html');
    if (offlinePage) return offlinePage;

    return Response.error();
  })());
});
