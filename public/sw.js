// public/sw.js
// A minimal, pass-through Service Worker.
// Its sole purpose is to satisfy Chrome's requirement for a fetch handler,
// enabling the PWA Install prompt on Desktop and Mobile.
// It actively bypasses all caching mechanisms, forcing the browser to fetch from the network ALWAYS.

self.addEventListener('install', (event) => {
  // Activa el Service Worker inmediatamente sin esperar
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Toma el control de las pestañas abiertas inmediatamente
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      // Elimina cualquier caché anterior que next-pwa haya creado
      return Promise.all(
        cacheNames.map((cacheName) => {
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Pass-through puro. Toda petición va a la red viva.
  // Bypass de cualquier caché local.
  event.respondWith(fetch(event.request));
});
