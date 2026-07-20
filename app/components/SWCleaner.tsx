'use client';

import { useEffect } from 'react';

const CURRENT_BUILD_VERSION = '2026-07-20-v2';

export default function SWCleaner() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedVersion = localStorage.getItem('caanma_build_version');
      if (storedVersion !== CURRENT_BUILD_VERSION) {
        console.log('[PWA] Nueva versión detectada:', CURRENT_BUILD_VERSION, '. Limpiando cachés y desregistrando service workers sin recargar...');
        
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
    }
  }, []);

  return null;
}
