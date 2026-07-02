'use client';

import { useEffect } from 'react';

const CURRENT_BUILD_VERSION = '2026-07-02-v1';

export default function SWCleaner() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (isStandalone || isLocalhost) {
        console.log('[PWA] Standalone or Localhost mode: skipping SWCleaner.');
        return;
      }

      const storedVersion = localStorage.getItem('caanma_build_version');
      if (storedVersion !== CURRENT_BUILD_VERSION) {
        console.log('[PWA] Nueva versión detectada:', CURRENT_BUILD_VERSION, '. Limpiando cachés y desregistrando service workers...');
        
        // 1. Limpiar localStorage de permisos obsoletos
        localStorage.removeItem('caanma_user_permissions');
        localStorage.removeItem('caanma_user_is_admin');
        
        // 2. Desregistrar Service Workers
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations().then((registrations) => {
            for (const reg of registrations) {
              reg.unregister();
            }
          }).catch(err => console.warn('Error unregistering SW:', err));
        }

        // 3. Limpiar todas las cachés de red y de la app
        if (typeof caches !== 'undefined') {
          caches.keys().then((keys) => {
            Promise.all(keys.map(key => caches.delete(key))).finally(() => {
              localStorage.setItem('caanma_build_version', CURRENT_BUILD_VERSION);
              window.location.reload();
            });
          }).catch(() => {
            localStorage.setItem('caanma_build_version', CURRENT_BUILD_VERSION);
            window.location.reload();
          });
        } else {
          localStorage.setItem('caanma_build_version', CURRENT_BUILD_VERSION);
          window.location.reload();
        }
      }
    }
  }, []);

  return null;
}
