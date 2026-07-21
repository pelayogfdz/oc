'use client';

import { useEffect } from 'react';

export const CURRENT_BUILD_VERSION = '2026-07-21-v7';

export default function SWCleaner() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedVersion = localStorage.getItem('caanma_build_version');
      if (storedVersion !== CURRENT_BUILD_VERSION) {
        console.log('[PWA] Nueva versión detectada:', CURRENT_BUILD_VERSION, '. Limpiando cachés y desregistrando service workers...');
        
        // 1. Guardar versión inmediatamente para evitar bucles de recarga
        localStorage.setItem('caanma_build_version', CURRENT_BUILD_VERSION);

        // 2. Limpiar localStorage de permisos obsoletos
        localStorage.removeItem('caanma_user_permissions');
        localStorage.removeItem('caanma_user_is_admin');
        
        // 3. Desregistrar Service Workers
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations().then((registrations) => {
            for (const reg of registrations) {
              reg.unregister();
            }
          }).catch(err => console.warn('Error unregistering SW:', err));
        }

        // 4. Limpiar todas las cachés de red y de la app
        if (typeof caches !== 'undefined') {
          caches.keys().then((keys) => {
            Promise.all(keys.map(key => caches.delete(key)));
          }).catch(err => console.warn('Error deleting caches:', err));
        }
      }

      // Background version polling every 60 seconds to detect server deployments
      const checkServerVersion = async () => {
        try {
          const res = await fetch('/api/version', { cache: 'no-store' });
          if (res.ok) {
            const data = await res.json();
            if (data.version && data.version !== CURRENT_BUILD_VERSION) {
              console.log('[PWA] Nueva versión en servidor detectada:', data.version, '. Recargando cliente...');
              localStorage.setItem('caanma_build_version', data.version);
              if ('serviceWorker' in navigator) {
                const regs = await navigator.serviceWorker.getRegistrations();
                for (const reg of regs) reg.unregister();
              }
              if (typeof caches !== 'undefined') {
                const keys = await caches.keys();
                await Promise.all(keys.map(k => caches.delete(k)));
              }
              window.location.reload();
            }
          }
        } catch (e) {
          // Ignore network errors in background check
        }
      };

      const intervalId = setInterval(checkServerVersion, 60000);
      return () => clearInterval(intervalId);
    }
  }, []);

  return null;
}
