'use client';

import { useEffect } from 'react';

export default function SWCleaner() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        if (registrations && registrations.length > 0) {
          console.log('[SWCleaner] Stale Service Workers found. Unregistering and clearing caches...');
          
          // Unregister all service workers
          const unregisterPromises = registrations.map((registration) => {
            console.log('[SWCleaner] Unregistering Service Worker:', registration.scope);
            return registration.unregister();
          });
          
          Promise.all(unregisterPromises).then(() => {
            console.log('[SWCleaner] Service Workers unregistered. Clearing Cache Storage...');
            
            // Delete all cache storage databases
            if ('caches' in window) {
              caches.keys().then((keys) => {
                const deletePromises = keys.map((key) => {
                  console.log('[SWCleaner] Deleting cache database:', key);
                  return caches.delete(key);
                });
                
                Promise.all(deletePromises).finally(() => {
                  console.log('[SWCleaner] Caches cleared. Reloading page...');
                  window.location.reload();
                });
              });
            } else {
              console.log('[SWCleaner] Cache Storage not supported. Reloading page...');
              window.location.reload();
            }
          }).catch((err) => {
            console.error('[SWCleaner] Error during unregistration:', err);
          });
        } else {
          console.log('[SWCleaner] No active Service Workers registered. Browser is clean.');
        }
      });
    }
  }, []);

  return null;
}
