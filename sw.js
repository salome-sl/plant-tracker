// sw.js — Service worker for offline support and installability.
//
// Strategy: cache-first for the app shell (it's fully static), so the app
// opens instantly and works with no network. Bump CACHE when files change.

const CACHE = 'plant-tracker-v15';

const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css',
  './js/app.js',
  './js/db.js',
  './js/species.js',
  './js/season.js',
  './js/schedule.js',
  './js/diagnostics.js',
  './js/settings.js',
  './js/util.js',
  './js/coach.js',
  './js/ai.js',
  './js/handoff.js',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      // Fetch with cache:'reload' so a version bump always pulls fresh files,
      // never a stale copy from the browser's HTTP cache.
      .then((cache) => cache.addAll(ASSETS.map((u) => new Request(u, { cache: 'reload' })))),
    // NOTE: no skipWaiting() here — the new worker waits so the app can prompt
    // the user to update, rather than swapping code out from under them.
  );
});

// The page asks us to activate immediately when the user taps "Update".
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((res) => {
          // Runtime-cache same-origin GETs so newly added files work offline too.
          if (res.ok && new URL(request.url).origin === self.location.origin) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
          }
          return res;
        })
        .catch(() => caches.match('./index.html'));
    }),
  );
});
