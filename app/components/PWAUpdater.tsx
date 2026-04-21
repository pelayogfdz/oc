'use client';

import { useEffect } from 'react';

export default function PWAUpdater() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Registrar manualmente el service worker en App Router
      navigator.serviceWorker.register('/sw.js').then(
        function (registration) {
          console.log('Service Worker registration successful with scope: ', registration.scope);
          
          // Si por alguna razón el caché guardó un error 404 de Netlify (Next.js Error)
          if (document.title.includes('404') || document.body.innerText.includes('This page could not be found')) {
             console.log('Detectado caché corrupto de 404. Limpiando Service Worker...');
             registration.unregister().then(() => {
                window.location.reload();
             });
          }
        },
        function (err) {
          console.log('Service Worker registration failed: ', err);
        }
      );

      // Escuchar cambios para nuevas versiones
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    }
  }, []);

  return null;
}
