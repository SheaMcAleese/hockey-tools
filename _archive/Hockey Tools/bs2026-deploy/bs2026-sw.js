const CACHE_NAME = 'bs2026-v2';
const ASSETS = [
  'index.html',
  'black-sticks-2026.html',
  'bs2026-manifest.json',
  'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@300;400;500;600&display=swap'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
  scheduleNotifications();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(resp => {
      if (resp.ok && e.request.method === 'GET') {
        const clone = resp.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
      }
      return resp;
    }).catch(() => caches.match('index.html')))
  );
});

function scheduleNotifications() {
  const now = new Date();
  const morning = new Date(now);
  morning.setHours(7, 0, 0, 0);

  if (now < morning) {
    setTimeout(() => {
      self.registration.showNotification('Black Sticks 2026', {
        body: 'Your habits are waiting. What will you put in today? 🏑',
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%230D0D0D" width="100" height="100"/><text y="70" x="15" font-size="60">🏑</text></svg>',
        tag: 'morning',
        requireInteraction: false
      });
    }, morning - now);
  }
}

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clients => {
      if (clients.length > 0) return clients[0].focus();
      return self.clients.openWindow('index.html');
    })
  );
});
