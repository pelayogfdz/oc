'use client';

import { useEffect } from 'react';

export default function SWCleaner() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Register our custom clean no-op service worker
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('[PWA] Service Worker registered with scope:', registration.scope);
          
          // Force immediate update check on the Service Worker & PWA Manifest
          // This forces Chrome/Edge to check for icon changes and update the desktop shortcut automatically.
          registration.update().then(() => {
            console.log('[PWA] Forced immediate manifest and icon update check.');
          }).catch((err) => {
            console.warn('[PWA] Failed to trigger update check:', err);
          });
        })
        .catch((err) => {
          console.error('[PWA] Service Worker registration failed:', err);
        });

      // Periodically clean up legacy/stale caches from older Workbox setups once, without infinite reload loop
      if (typeof caches !== 'undefined') {
        const hasCleanedKey = 'caanma_pwa_cache_cleaned_v6';
        if (!localStorage.getItem(hasCleanedKey)) {
          caches.keys().then((keys) => {
            if (keys.length > 0) {
              console.log('[PWA] Legacy cache stores found. Performing one-time cleanup...');
              Promise.all(keys.map(key => caches.delete(key))).finally(() => {
                localStorage.setItem(hasCleanedKey, 'true');
                console.log('[PWA] Legacy cache cleanup completed.');
              });
            } else {
              localStorage.setItem(hasCleanedKey, 'true');
            }
          });
        }
      }
    }
  }, []);

  return null;
}
