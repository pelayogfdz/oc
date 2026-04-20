'use client';

import { useEffect } from 'react';

export default function PWAUpdater() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Cuando el nuevo Service Worker toma el control (gracias a skipWaiting: true),
      // forzamos una recarga automática para evitar que el usuario se quede con la PWA vieja.
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    }
  }, []);

  return null;
}
