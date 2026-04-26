'use client';

import { useEffect } from 'react';

export default function PWAUpdater() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then(
        function (registration) {
          console.log('Service Worker registration successful with scope: ', registration.scope);
          
          // Forzar la comprobación de actualización del SW cada vez que se carga la app
          registration.update();
          
          // Detectar errores 404 almacenados en caché o Next.js ChunkLoadError
          if (document.title.includes('404') || document.body.innerText.includes('This page could not be found') || document.body.innerText.includes('ChunkLoadError')) {
             console.log('Detectado caché corrupto o versión antigua. Limpiando Service Worker...');
             registration.unregister().then(() => {
                // Borrar caché de Workbox si existe
                caches.keys().then((names) => {
                  for (let name of names) caches.delete(name);
                }).finally(() => {
                  window.location.reload();
                });
             });
          }
        },
        function (err) {
          console.log('Service Worker registration failed: ', err);
        }
      );

      // Escuchar cuando el nuevo Service Worker toma el control (gracias a skipWaiting)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('Nueva versión disponible, recargando aplicación...');
        window.location.reload();
      });
    }
  }, []);

  return null;
}
