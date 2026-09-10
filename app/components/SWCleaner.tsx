'use client';

import { useEffect } from 'react';

export default function SWCleaner() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const purgeCachesAndSW = async () => {
        try {
          if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const reg of registrations) {
              await reg.unregister();
            }
          }
          if (typeof caches !== 'undefined') {
            const keys = await caches.keys();
            await Promise.all(keys.map(key => caches.delete(key)));
          }
        } catch (err) {
          console.warn('Error during SW & cache cleanup:', err);
        }
      };

      // Background version polling every 60 seconds to detect server deployments
      const checkServerVersion = async () => {
        try {
          const res = await fetch('/api/version', { cache: 'no-store' });
          if (res.ok) {
            const data = await res.json();
            const storedVersion = localStorage.getItem('caanma_server_version');
            if (data.version) {
              if (!storedVersion) {
                localStorage.setItem('caanma_server_version', data.version);
              } else if (storedVersion !== data.version) {
                console.log('[PWA] Nueva versión en servidor detectada:', data.version, '. Actualizando cliente...');
                localStorage.setItem('caanma_server_version', data.version);
                await purgeCachesAndSW();
                const target = window.location.pathname.indexOf('/ventas') > -1
                  ? window.location.pathname + '?force=' + Date.now()
                  : '/ventas/nueva?force=' + Date.now();
                window.location.replace(target);
              }
            }
          }
        } catch (e) {
          // Ignore network errors in background check
        }
      };

      // Initial check on mount
      checkServerVersion();

      const intervalId = setInterval(checkServerVersion, 60000);
      return () => clearInterval(intervalId);
    }
  }, []);

  return null;
}
