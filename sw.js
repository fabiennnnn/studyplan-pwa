const CACHE_NAME = 'studyplan-v31';
const CORE_ASSETS = [
  './',
  './index.html',
  './studyplan.html',
  './manifest.json',
  './app-icon-192.png',
  './app-icon-512.png',
  './apple-touch-icon.png',
  './app-icon.svg',
  './offline.html'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => key !== CACHE_NAME && caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          return res;
        })
        .catch(async () => {
          const cachedRequest = await caches.match(request);
          if (cachedRequest) return cachedRequest;
          const cachedIndex = await caches.match('./index.html');
          if (cachedIndex) return cachedIndex;
          return caches.match('./offline.html');
        })
    );
    return;
  }

  if (request.method === 'GET' && url.origin === location.origin) {
    event.respondWith(
      caches.match(request).then(cached =>
        cached || fetch(request).then(res => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          return res;
        })
      )
    );
  }
});
