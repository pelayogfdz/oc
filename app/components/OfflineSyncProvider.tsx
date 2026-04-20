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
      const { syncBasicCatalogs, syncProductsPage } = await import('../actions/sync');
      setShowToast({ message: 'Preparando sincronización de catálogos...', type: 'warn' });
      
      const basicData = await syncBasicCatalogs();
      
      await db.transaction('rw', db.customers, db.suppliers, db.branches, db.settings, async () => {
        await db.customers.clear();
        await db.customers.bulkAdd(basicData.customers);
        
        await db.suppliers.clear();
        await db.suppliers.bulkAdd(basicData.suppliers);
        
        await db.branches.clear();
        await db.branches.bulkAdd(basicData.branches);
        
        if (basicData.settings) {
          await db.settings.clear();
          await db.settings.add({
            id: 'branch_config',
            ventasConfig: JSON.parse(basicData.settings.configJson || '{}').ventas || {},
            ticketConfig: JSON.parse(basicData.settings.configJson || '{}').tickets || {},
            metodosConfig: JSON.parse(basicData.settings.configJson || '{}').metodos || {}
          });
        }
      });

      const totalProducts = basicData.totalProducts;
      const pageSize = 1500;
      const totalPages = Math.ceil(totalProducts / pageSize);
      
      await db.products.clear();
      
      for (let i = 1; i <= totalPages; i++) {
        setShowToast({ message: `Descargando Catálogo de Productos... (${i}/${totalPages})`, type: 'warn' });
        const productsChunk = await syncProductsPage(i, pageSize);
        await db.products.bulkAdd(productsChunk);
      }

      setShowToast({ message: 'Catálogos Offline Actualizados', type: 'success' });
    } catch (e) {
      console.error('Failed to sync catalogs', e);
      setShowToast({ message: 'Error descargando catálogos en Offline', type: 'error' });
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
