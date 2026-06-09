const CACHE_PAGES_NAME = 'caanma-pages-v1';
const CACHE_STATIC_NAME = 'caanma-static-v1';

// Essential pages and resources to pre-cache on install
const PRECACHE_ASSETS = [
  '/',
  '/ventas/nueva',
  '/rh/kiosko',
  '/mi-portal',
  '/manifest.json',
  '/favicon.ico',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/globe.svg',
  '/file.svg'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_PAGES_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[PWA] Failed to pre-cache some assets:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_PAGES_NAME && cacheName !== CACHE_STATIC_NAME) {
            console.log('[PWA] Deleting old cache:', cacheName);
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
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Avoid handling non-http protocols (like chrome-extension://, file://, etc.)
  if (!url.protocol.startsWith('http')) return;

  // Bypass API requests and Next.js data/internal requests
  if (
    url.pathname.startsWith('/api/') || 
    url.pathname.includes('/_next/data/') || 
    url.pathname.includes('/_next/image') ||
    url.searchParams.has('_rsc') // Next.js App Router RSC payload parameter
  ) {
    return;
  }

  // Network-First for HTML pages (documents) and manifest/icons
  const isPageNavigation = event.request.mode === 'navigate';
  const isHTMLPage = url.pathname === '/' || 
                     url.pathname.startsWith('/ventas') || 
                     url.pathname.startsWith('/rh') || 
                     url.pathname.startsWith('/clientes') || 
                     url.pathname.startsWith('/productos') || 
                     url.pathname.startsWith('/mi-portal') || 
                     url.pathname.startsWith('/preferencias') || 
                     url.pathname.startsWith('/caja');

  if (isPageNavigation || isHTMLPage || url.pathname === '/manifest.json' || url.pathname === '/favicon.ico') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          // Cache the fresh response
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_PAGES_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // If offline, serve from cache
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Fallback: if navigating to a page not in cache, try serving the cached root `/`
            if (isPageNavigation) {
              return caches.match('/');
            }
          });
        })
    );
    return;
  }

  // Cache-First for static assets (Next.js static chunks, CSS, images, fonts)
  const isStaticAsset = url.pathname.startsWith('/_next/static/') ||
                        url.pathname.startsWith('/img/') ||
                        url.pathname.endsWith('.js') ||
                        url.pathname.endsWith('.css') ||
                        url.pathname.endsWith('.png') ||
                        url.pathname.endsWith('.jpg') ||
                        url.pathname.endsWith('.svg') ||
                        url.pathname.includes('/fonts.gstatic.com/') ||
                        url.pathname.includes('/fonts.googleapis.com/');

  if (isStaticAsset) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_STATIC_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        });
      })
    );
    return;
  }
});
