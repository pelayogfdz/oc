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
  event.respondWith(
    fetch(event.request).catch(() => {
      // Chrome PWA Installability offline check corta la red físicamente para verificar si la PWA "falla".
      // Si dejamos que tire error de red, nos apaga el botón de instalar Desktop.
      // Al devolver una respuesta genérica 200 OK HTML, Chrome aprueba la instalación.
      return new Response(
        '<html><body style="font-family:sans-serif;text-align:center;padding:50px;"><h2>Sin Conexión</h2><p>Estás desconectado. Reconecta a internet para usar el ERP en tiempo real.</p></body></html>',
        { headers: { 'Content-Type': 'text/html' } }
      );
    })
  );
});
