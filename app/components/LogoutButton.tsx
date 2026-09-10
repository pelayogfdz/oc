'use client';

import React, { useState } from 'react';
import { logout } from '@/app/actions/auth-actions';

export default function LogoutButton() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      // 1. Clear Service Worker caches
      if (typeof window !== 'undefined' && 'caches' in window) {
        try {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(name => caches.delete(name)));
        } catch (e) {
          console.warn('Error clearing caches on logout:', e);
        }
      }

      // 2. Clear Dexie IndexedDB catalog tables
      try {
        const { db } = await import('@/lib/offlineDB');
        await db.transaction('rw', [db.customers, db.suppliers, db.branches, db.settings, db.users, db.products, db.sales], async () => {
          await db.customers.clear();
          await db.suppliers.clear();
          await db.branches.clear();
          await db.users.clear();
          await db.products.clear();
          await db.settings.clear();
          await db.sales.clear();
        });
      } catch (e) {
        console.warn('Error clearing Dexie on logout:', e);
      }

      // 3. Invalidate search cache
      try {
        const { invalidateOfflineSearchCache } = await import('@/lib/offlineSearch');
        invalidateOfflineSearchCache();
      } catch (e) {}

      // 4. Clear localStorage flags
      if (typeof window !== 'undefined') {
        localStorage.removeItem('caanma_cached_tenant_id');
        localStorage.removeItem('caanma_active_tenant_id');
        localStorage.removeItem('caanma_active_user_id');
        localStorage.removeItem('last_catalog_sync_timestamp');
        localStorage.removeItem('cached_branch_id');
      }
    } catch (err) {
      console.error('Error during client logout cleanup:', err);
    }

    // 5. Server logout
    await logout();
  };

  return (
    <button
      onClick={handleLogout}
      type="button"
      disabled={isLoggingOut}
      style={{
        background: 'none',
        border: 'none',
        padding: 0,
        margin: 0,
        color: '#ef4444',
        fontSize: '0.75rem',
        cursor: isLoggingOut ? 'wait' : 'pointer',
        fontWeight: '600'
      }}
    >
      {isLoggingOut ? 'Saliendo...' : 'Salir'}
    </button>
  );
}
