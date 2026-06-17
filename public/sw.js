const CACHE_NAME = 'caanma-offline-cache-v2';

const PRECACHE_ASSETS = [
  '/',
  '/login',
  '/ventas/nueva',
  '/manifest.json?v=6',
  '/favicon.ico',
  '/icon-192x192.png',
  '/icon-512x512.png'
];

// 1. Install Event - Precache critical shell assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing and precaching shell assets...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch(err => {
        console.warn('[Service Worker] Failed to precache some assets: ', err);
      });
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// 2. Activate Event - Clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting obsolete cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// 3. Fetch Event - Implement Network-First with Cache fallback strategy
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Ignore WebSockets, Chrome Extensions, Live Reloading, or Whatsapp APIs
  if (
    url.protocol !== 'http:' && url.protocol !== 'https:' ||
    url.pathname.includes('/_next/webpack-hmr') ||
    url.pathname.includes('/api/whatsapp') ||
    url.hostname.includes('whatsapp') ||
    url.hostname.includes('localhost') && url.port === '3000' // MCP dev server bypass
  ) {
    return;
  }

  // Strategy choice based on asset type
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
    // Cache-First Strategy for static assets (static assets are hashed and immutable)
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
          // Fallback if network fails and not in cache
          return new Response('Asset not available offline', { status: 404 });
        });
      })
    );
  } else {
    // Network-First Strategy for Pages, Next.js Server Actions, API calls
    event.respondWith(
      fetch(request).then((networkResponse) => {
        // Cache successful page/data responses
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      }).catch((err) => {
        console.log('[Service Worker] Network request failed. Falling back to cache for:', url.pathname);
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // If a page navigation request fails completely (offline fallback)
          if (request.mode === 'navigate') {
            console.log('[Service Worker] Page navigation failed offline, falling back to cotizaciones/nueva');
            return caches.match('/ventas/nueva').then((posResponse) => {
              if (posResponse) return posResponse;
              return caches.match('/');
            });
          }
          
          // Return generic error response
          return new Response(
            JSON.stringify({ error: 'Estás sin conexión y esta información no está guardada localmente.' }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
          );
        });
      })
    );
  }
});
