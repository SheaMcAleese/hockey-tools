const CACHE_NAME = 'bs2026-v1';
const ASSETS = [
  'black-sticks-2026.html',
  'bs2026-manifest.json',
  'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@300;400;500;600&display=swap'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
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
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(resp => {
      if (resp.ok && e.request.method === 'GET') {
        const clone = resp.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
      }
      return resp;
    }).catch(() => caches.match('black-sticks-2026.html')))
  );
});

// Scheduled notifications
function scheduleNotifications() {
  const now = new Date();
  const morning = new Date(now);
  morning.setHours(7, 0, 0, 0);
  const evening = new Date(now);
  evening.setHours(21, 0, 0, 0);

  if (now < morning) {
    setTimeout(() => {
      self.registration.showNotification('Black Sticks 2026', {
        body: 'Your daily Black Sticks question is ready.',
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%230D0D0D" width="100" height="100"/><text y="70" x="15" font-size="60">🏑</text></svg>',
        tag: 'morning'
      });
    }, morning - now);
  }

  if (now < evening) {
    setTimeout(() => {
      self.registration.showNotification('Black Sticks 2026', {
        body: 'Time for your evening journal.',
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%230D0D0D" width="100" height="100"/><text y="70" x="15" font-size="60">🏑</text></svg>',
        tag: 'evening'
      });
    }, evening - now);
  }

  // Sunday check for weekly rating
  if (now.getDay() === 0 && now < evening) {
    setTimeout(() => {
      self.registration.showNotification('Black Sticks 2026', {
        body: "Don't forget your weekly self-rating.",
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%230D0D0D" width="100" height="100"/><text y="70" x="15" font-size="60">🏑</text></svg>',
        tag: 'sunday-rating'
      });
    }, evening - now);
  }
}

self.addEventListener('activate', () => scheduleNotifications());

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clients => {
      if (clients.length > 0) return clients[0].focus();
      return self.clients.openWindow('black-sticks-2026.html');
    })
  );
});
