const CACHE_NAME = 'caanma-offline-v2';

// Recursos mínimos para que la app cargue (App Router)
const ASSETS_TO_CACHE = [
  '/',
  '/ventas/nueva',
  '/productos/pedidos/nuevo',
  '/productos/traspasos',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.warn('Algunos recursos estáticos no pudieron cachearse:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Borrando caché antigua:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Ignorar peticiones de API, devolviendo directamente a la red
  if (event.request.url.includes('/api/')) {
    return;
  }

  // Estrategia Network First para navegación y páginas
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Guardar la respuesta más fresca en caché si es posible
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        // En caso de estar offline, buscar en caché
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // Si es una navegación (abrir la app offline) y no hay caché exacta, intentar devolver la raíz '/'
        if (event.request.mode === 'navigate') {
          const rootCache = await caches.match('/');
          return rootCache;
        }

        return new Response('Estás desconectado y este recurso no está en caché.', {
          status: 503,
          statusText: 'Service Unavailable'
        });
      })
  );
});
