'use client';

import { useEffect } from 'react';

export default function SWCleaner() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // 1. Desregistrar TODOS los service workers de forma inmediata
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const reg of registrations) {
            reg.unregister().then((success) => {
              if (success) {
                console.log('[PWA] Service Worker desregistrado con éxito.');
              }
            });
          }
        }).catch((err) => {
          console.warn('[PWA] Error al desregistrar service workers:', err);
        });
      }

      // 2. Limpiar de forma agresiva todas las cachés del navegador
      if (typeof caches !== 'undefined') {
        caches.keys().then((keys) => {
          Promise.all(keys.map(key => {
            console.log('[PWA] Borrando caché:', key);
            return caches.delete(key);
          })).then(() => {
            console.log('[PWA] Limpieza completa de todas las cachés finalizada.');
          }).catch((err) => {
            console.error('[PWA] Falló la limpieza de cachés:', err);
          });
        });
      }
    }
  }, []);

  return null;
}
