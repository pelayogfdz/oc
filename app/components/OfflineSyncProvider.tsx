'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { db, OfflineSale } from '@/lib/offlineDB';
import { createSale } from '../actions/sale';

interface OfflineContextType {
  isOnline: boolean;
  pendingSales: OfflineSale[];
  pushOfflineSale: (sale: Omit<OfflineSale, 'id' | 'timestamp' | 'synced'>) => Promise<void>;
  pushOfflineTransfer: (transferParams: any) => Promise<void>;
  pushOfflinePurchase: (purchaseParams: any) => Promise<void>;
  forceSync: () => Promise<void>;
  refreshCatalogs: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextType>({
  isOnline: true,
  pendingSales: [],
  pushOfflineSale: async () => {},
  pushOfflineTransfer: async () => {},
  pushOfflinePurchase: async () => {},
  forceSync: async () => {},
  refreshCatalogs: async () => {},
});


export function OfflineSyncProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [pendingSales, setPendingSales] = useState<OfflineSale[]>([]);
  const [pendingTransfers, setPendingTransfers] = useState<any[]>([]);
  const [pendingPurchases, setPendingPurchases] = useState<any[]>([]);
  const [showToast, setShowToast] = useState<{message: string, type: 'success' | 'warn' | 'error'} | null>(null);

  // Initialize Network status
  useEffect(() => {
    setIsOnline(navigator.onLine);
    
    const handleOnline = () => {
      setIsOnline(true);
      setShowToast({ message: 'Conexión Restablecida. Sincronizando datos...', type: 'success' });
      forceSync();
      refreshCatalogs();
    };
    const handleOffline = () => {
      setIsOnline(false);
      setShowToast({ message: 'Sin Internet. Cambiando a base de datos de respaldo (Offline).', type: 'warn' });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    loadPendingQueues();
    if (navigator.onLine) {
       refreshCatalogs();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadPendingQueues = async () => {
    try {
      const sales = await db.pendingSales.toArray();
      setPendingSales(sales);
      const transfers = await db.pendingTransfers.toArray();
      setPendingTransfers(transfers);
      const purchases = await db.pendingPurchases.toArray();
      setPendingPurchases(purchases);
    } catch (e) {
      console.error('Error loading offline DB', e);
    }
  };

  const pushOfflineSale = async (saleParams: Omit<OfflineSale, 'id' | 'timestamp' | 'synced'>) => {
    try {
      const newSale: OfflineSale = {
        ...saleParams,
        id: crypto.randomUUID(), 
        timestamp: new Date().toISOString(),
        synced: false
      };
      await db.pendingSales.add(newSale);
      setPendingSales(prev => [...prev, newSale]);
      if (!isOnline) {
        setShowToast({ message: 'Venta guardada en modo Offline.', type: 'warn' });
      } else {
        forceSync();
      }
    } catch (error) {
      setShowToast({ message: 'Error al intentar guardar la venta.', type: 'error' });
    }
  };

  const pushOfflineTransfer = async (transferParams: any) => {
    try {
      const newTransfer = {
        ...transferParams,
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        synced: false
      };
      await db.pendingTransfers.add(newTransfer);
      setPendingTransfers(prev => [...prev, newTransfer]);
      if (!isOnline) setShowToast({ message: 'Traspaso en cola Offline.', type: 'warn' });
      else forceSync();
    } catch (e) {
      setShowToast({ message: 'Error guardando traspaso', type: 'error' });
    }
  };

  const pushOfflinePurchase = async (purchaseParams: any) => {
    try {
      const newPurchase = {
        ...purchaseParams,
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        synced: false
      };
      await db.pendingPurchases.add(newPurchase);
      setPendingPurchases(prev => [...prev, newPurchase]);
      if (!isOnline) setShowToast({ message: 'Compra en cola Offline.', type: 'warn' });
      else forceSync();
    } catch (e) {
      setShowToast({ message: 'Error guardando compra', type: 'error' });
    }
  };

  const forceSync = async () => {
    if (!navigator.onLine) return;
    try {
      let syncedAny = false;
      
      // Sync Sales
      const sales = await db.pendingSales.toArray();
      for (const sale of sales) {
        try {
          await createSale(sale.items, sale.total, sale.paymentMethod, sale.customerId, sale.sessionId, sale.notes, sale.cashValue, sale.cardValue, sale.billingData);
          await db.pendingSales.delete(sale.id);
          syncedAny = true;
        } catch (e) { console.error('Sync error sale', e); }
      }

      // Sync Transfers
      const transfers = await db.pendingTransfers.toArray();
      for (const t of transfers) {
        try {
           // We dynamically import actions to avoid circular dependencies
           const { requestTransfer, dispatchDirectTransfer } = await import('../actions/transfer');
           if (t.isDirectDispatch) {
             await dispatchDirectTransfer({ toBranchId: t.toBranchId!, reason: t.reason, items: t.items });
           } else {
             await requestTransfer({ fromBranchId: t.fromBranchId, reason: t.reason, items: t.items });
           }
           await db.pendingTransfers.delete(t.id);
           syncedAny = true;
        } catch (e) { console.error('Sync error transfer', e); }
      }

      // Sync Purchases (Pedidos)
      const purchases = await db.pendingPurchases.toArray();
      for (const p of purchases) {
        try {
          const { createPurchaseOrder } = await import('../actions/pedidos');
          await createPurchaseOrder(p.supplierId, p.notes, p.items, p.total);
          await db.pendingPurchases.delete(p.id);
          syncedAny = true;
        } catch (e) { console.error('Sync error purchase', e); }
      }

      if (syncedAny) {
        loadPendingQueues();
        setShowToast({ message: 'Caché Offline Sincronizado a la Nube.', type: 'success' });
      }
    } catch (e) {
      console.error('Sync process failed', e);
    }
  };

  const refreshCatalogs = async () => {
    if (!navigator.onLine) return;
    try {
      const { syncAllCatalogs } = await import('../actions/sync');
      const data = await syncAllCatalogs();
      
      await db.transaction('rw', db.products, db.customers, db.suppliers, db.branches, db.settings, async () => {
        await db.products.clear();
        await db.products.bulkAdd(data.products);
        
        await db.customers.clear();
        await db.customers.bulkAdd(data.customers);
        
        await db.suppliers.clear();
        await db.suppliers.bulkAdd(data.suppliers);
        
        await db.branches.clear();
        await db.branches.bulkAdd(data.branches);
        
        if (data.settings) {
          await db.settings.clear();
          await db.settings.add({
            id: 'branch_config',
            ventasConfig: JSON.parse(data.settings.configJson || '{}').ventas || {},
            ticketConfig: JSON.parse(data.settings.configJson || '{}').tickets || {},
            metodosConfig: JSON.parse(data.settings.configJson || '{}').metodos || {}
          });
        }
      });
      setShowToast({ message: 'Catálogos Offline Actualizados', type: 'success' });
    } catch (e) {
      console.error('Failed to sync catalogs', e);
    }
  };

  return (
    <OfflineContext.Provider value={{ isOnline, pendingSales, pushOfflineSale, forceSync, pushOfflineTransfer, pushOfflinePurchase, refreshCatalogs }}>
      {children}
      {showToast && (
        <div style={{ position: 'fixed', bottom: '80px', left: '50%', transform: 'translateX(-50%)', backgroundColor: showToast.type === 'error' ? '#ef4444' : showToast.type === 'warn' ? '#fbbf24' : '#10b981', color: showToast.type === 'warn' ? '#000' : '#fff', padding: '12px 24px', borderRadius: '8px', zIndex: 9999, fontWeight: 600 }}>{showToast.message}</div>
      )}
    </OfflineContext.Provider>
  );
}

export const useOfflineSync = () => useContext(OfflineContext);
