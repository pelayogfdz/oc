const CACHE_NAME = 'caanma-offline-cache-v6';

const PRECACHE_ASSETS = [
  '/',
  '/login',
  '/ventas/nueva',
  '/ventas',
  '/ventas/cotizaciones/nueva',
  '/ventas/consignaciones/nueva',
  '/manifest.json?v=7',
  '/favicon.ico',
  '/icon-192x192.png',
  '/icon-512x512.png'
];

// Helper: fetch con límite estricto de tiempo para evitar los 15-30s de congelamiento por reintentos TCP
function fetchWithTimeout(request, timeoutMs = 1200) {
  return new Promise((resolve, reject) => {
    let finished = false;
    const timer = setTimeout(() => {
      if (!finished) {
        finished = true;
        reject(new Error('NETWORK_TIMEOUT'));
      }
    }, timeoutMs);

    fetch(request)
      .then((res) => {
        if (!finished) {
          finished = true;
          clearTimeout(timer);
          resolve(res);
        }
      })
      .catch((err) => {
        if (!finished) {
          finished = true;
          clearTimeout(timer);
          reject(err);
        }
      });
  });
}

// 1. Install Event - Precache shell crítico
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Instalando y precacheando cascarón offline...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch(err => {
        console.warn('[Service Worker] Aviso al precachear algunos assets: ', err);
      });
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// 2. Activate Event - Limpiar cachés antiguos
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activando versión v5...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Eliminando caché obsoleta:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// 3. Fetch Event - Estrategia ultrarrápida para páginas y estáticos
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Solo gestionar peticiones GET
  if (request.method !== 'GET') {
    return;
  }

  // Ignorar WebSockets, Chrome Extensions, Live Reloading de desarrollo o WhatsApp
  if (
    (url.protocol !== 'http:' && url.protocol !== 'https:') ||
    url.pathname.includes('/_next/webpack-hmr') ||
    url.pathname.includes('/api/whatsapp') ||
    url.hostname.includes('whatsapp')
  ) {
    return;
  }

  // 3a. Imágenes de Productos: Estrategia Stale-While-Revalidate
  // Devuelve inmediatamente de caché (0ms) y revalida en paralelo con la red
  if (url.pathname.includes('/img/products/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(request);
        const fetchPromise = fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => null);

        if (cachedResponse) {
          return cachedResponse;
        }
        const networkResponse = await fetchPromise;
        if (networkResponse) return networkResponse;
        return new Response('Imagen no disponible offline', { status: 404 });
      })
    );
    return;
  }

  const isStaticAsset = (
    url.pathname.includes('/_next/static/') ||
    url.pathname.includes('/img/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.woff2')
  );

  if (isStaticAsset) {
    // Cache-First Strategy para estáticos (archivos con hash inmutables)
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        }).catch(() => {
          return new Response('Recurso no disponible offline', { status: 404 });
        });
      })
    );
    return;
  }

  // Rutas dinámicas, Páginas, Next.js RSC y Acciones
  const isPosRoute = url.pathname === '/ventas/nueva';
  const isVentasRoute = url.pathname === '/ventas';
  const isRscRequest = url.searchParams.has('_rsc') || request.headers.get('RSC') === '1';
  const isOffline = typeof self.navigator !== 'undefined' && self.navigator.onLine === false;

  // Función de resolución offline inmediata (0ms)
  const getOfflineFallback = async () => {
    // 1. Coincidencia directa o ignorando querystring
    let match = await caches.match(request, { ignoreSearch: true });
    if (match) return match;

    // 2. Si es la ruta del POS (/ventas/nueva)
    if (isPosRoute) {
      if (isRscRequest) {
        const rscMatch = await caches.match('/ventas/nueva__rsc');
        if (rscMatch) return rscMatch;
      }
      const posMatch = await caches.match('/ventas/nueva');
      if (posMatch) return posMatch;
    }

    // 2b. Si es la ruta de Historial de Ventas (/ventas)
    if (isVentasRoute) {
      if (isRscRequest) {
        const rscMatch = await caches.match('/ventas__rsc');
        if (rscMatch) return rscMatch;
      }
      const ventasMatch = await caches.match('/ventas');
      if (ventasMatch) return ventasMatch;
    }

    // 3. Si es una navegación completa de página a cualquier otra ruta
    if (request.mode === 'navigate') {
      if (isVentasRoute) {
        const vFallback = await caches.match('/ventas');
        if (vFallback) return vFallback;
      }
      const posFallback = await caches.match('/ventas/nueva');
      if (posFallback) return posFallback;
      const rootFallback = await caches.match('/');
      if (rootFallback) return rootFallback;
    }

    // 4. Respuesta 503 limpia si el recurso no existe en caché local
    return new Response(
      JSON.stringify({ error: 'Modo Offline: recurso no disponible localmente.' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  };

  // Si el navegador ya sabe que está desconectado, responder de inmediato sin tocar la red
  if (isOffline) {
    event.respondWith(getOfflineFallback());
    return;
  }

  // Si parece haber red, competir con timeout de 1.2 segundos para responder al instante si la red está colgada
  event.respondWith(
    fetchWithTimeout(request, 1200)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && (networkResponse.type === 'basic' || networkResponse.type === 'cors')) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
            if (isPosRoute) {
              if (isRscRequest) {
                cache.put('/ventas/nueva__rsc', responseToCache.clone());
              } else {
                cache.put('/ventas/nueva', responseToCache.clone());
              }
            } else if (isVentasRoute) {
              if (isRscRequest) {
                cache.put('/ventas__rsc', responseToCache.clone());
              } else {
                cache.put('/ventas', responseToCache.clone());
              }
            }
          });
        }
        return networkResponse;
      })
      .catch(async (err) => {
        console.log('[Service Worker] Red no respondió o tardó más de 1200ms. Recuperando de caché para:', url.pathname);
        return getOfflineFallback();
      })
  );
});
