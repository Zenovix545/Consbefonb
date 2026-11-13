
const CACHE = 'consistly-v34';

const FILES = [
  './',
  'index.html',
  'style.css',
  'app.js',
  'manifest.json',
  'icon-192.png',
  'icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(async cache => {
      for (const file of FILES) {
        try {
          await cache.add(file);
        } catch (error) {
          console.warn('Cache-Datei übersprungen:', file, error);
        }
      }
    })
  );

  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE)
          .map(key => caches.delete(key))
      )
    )
  );

  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request);
    })
  );
});

self.addEventListener('message', event => {
  if (event.data?.type !== 'TEST_REMINDER') return;

  event.waitUntil(
    self.registration.showNotification('Consistly 🔔', {
      body: 'Zeit für deine Habits!',
      icon: 'icon-192.png',
      tag: 'consistly-reminder'
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();

  event.waitUntil(
    clients.openWindow('./')
  );
});
