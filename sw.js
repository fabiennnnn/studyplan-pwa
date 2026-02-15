const CACHE_NAME = 'studyplan-v18';
const CORE_ASSETS = [
  './',
  './index.html',
  './studyplan.html',
  './manifest.json',
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
          caches.open(CACHE_NAME).then(cache => {
            cache.put('./index.html', copy);
            cache.put('./studyplan.html', copy);
          });
          return res;
        })
        .catch(() => caches.match('./offline.html'))
    );
    return;
  }

  if (url.origin === location.origin) {
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
