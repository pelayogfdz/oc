'use client';

import { useEffect } from 'react';

export default function PWAUpdater() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').then(
          function (registration) {
            console.log('[PWA] Service Worker registrado exitosamente con scope: ', registration.scope);
            
            // Forzar la comprobación de actualización del SW cada vez que se carga la app
            registration.update();
            
            // Detectar errores 404 almacenados en caché o Next.js ChunkLoadError
            if (document.title.includes('404') || document.body.innerText.includes('This page could not be found') || document.body.innerText.includes('ChunkLoadError')) {
               console.log('[PWA] Detectado caché corrupto o versión antigua. Limpiando Service Worker...');
               registration.unregister().then(() => {
                  caches.keys().then((names) => {
                    for (let name of names) caches.delete(name);
                  }).finally(() => {
                    window.location.reload();
                  });
               });
            }
          },
          function (err) {
            console.log('[PWA] Service Worker registration failed: ', err);
          }
        );

        // Escuchar cuando el nuevo Service Worker toma el control (gracias a skipWaiting)
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          console.log('[PWA] Nueva versión disponible, recargando aplicación...');
          window.location.reload();
        });
      }
    }
  }, []);

  return null;
}
