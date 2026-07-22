/* Match Timing — service worker. Bump CACHE on every content change. */
const CACHE = 'match-timing-v1';
const ASSETS = [
  './Match%20Timing.html',
  './match-timing.webmanifest',
  './match-timing-icon-192.png',
  './match-timing-icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

/* Cache-first: the app is fully self-contained, so once installed it runs on the
   sideline with no signal. Falls back to network for anything not precached. */
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request).catch(() => hit))
  );
});
