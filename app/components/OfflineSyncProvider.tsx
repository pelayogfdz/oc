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
  pushOfflineProduct: (productParams: any) => Promise<void>;
  forceSync: () => Promise<void>;
  refreshCatalogs: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextType>({
  isOnline: true,
  pendingSales: [],
  pushOfflineSale: async () => {},
  pushOfflineTransfer: async () => {},
  pushOfflinePurchase: async () => {},
  pushOfflineProduct: async () => {},
  forceSync: async () => {},
  refreshCatalogs: async () => {},
});


export function OfflineSyncProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [pendingSales, setPendingSales] = useState<OfflineSale[]>([]);
  const [pendingTransfers, setPendingTransfers] = useState<any[]>([]);
  const [pendingPurchases, setPendingPurchases] = useState<any[]>([]);
  const [pendingProducts, setPendingProducts] = useState<any[]>([]);
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
      const products = await db.pendingProducts.toArray();
      setPendingProducts(products);
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

  const pushOfflineProduct = async (productParams: any) => {
    try {
      const newProduct = {
        ...productParams,
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        synced: false
      };
      await db.pendingProducts.add(newProduct);
      setPendingProducts(prev => [...prev, newProduct]);
      
      // Mirror to products table so it's instantly available offline for search/sale
      const mirrorProduct = {
        id: crypto.randomUUID(), // fake id
        branchId: newProduct.branchId,
        name: newProduct.name,
        sku: newProduct.sku,
        barcode: newProduct.barcode,
        stock: Number(newProduct.stock) || 0,
        cost: Number(newProduct.cost) || 0,
        averageCost: Number(newProduct.cost) || 0,
        price: Number(newProduct.price) || 0,
        category: newProduct.category,
        variants: JSON.parse(newProduct.variantsJson || '[]'),
        prices: [] 
      };
      await db.products.add(mirrorProduct);

      if (!isOnline) setShowToast({ message: 'Producto registrado localmente.', type: 'warn' });
      else forceSync();
    } catch (e) {
      setShowToast({ message: 'Error guardando producto offline', type: 'error' });
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

      // Sync Products
      const products = await db.pendingProducts.toArray();
      for (const p of products) {
        try {
          // Import dynamic to avoid circular reqs
          const { createProduct } = await import('../actions/product');
          const formData = new FormData();
          formData.append('branchId', p.branchId);
          formData.append('name', p.name);
          formData.append('sku', p.sku);
          if (p.barcode) formData.append('barcode', p.barcode);
          formData.append('stock', p.stock.toString());
          formData.append('minStock', p.minStock.toString());
          formData.append('cost', p.cost.toString());
          formData.append('price', p.price.toString());
          formData.append('taxRate', p.taxRate.toString());
          formData.append('category', p.category);
          formData.append('brand', p.brand);
          formData.append('unit', p.unit);
          formData.append('isActive', p.isActive.toString());
          if (p.supplierId) formData.append('supplierId', p.supplierId);
          formData.append('hasVariants', p.hasVariants ? "1" : "0");
          formData.append('variantsJson', p.variantsJson);
          if (p.imageUrl) formData.append('imageUrl', p.imageUrl);
          if (p.youtubeUrl) formData.append('youtubeUrl', p.youtubeUrl);
          if (p.satKey) formData.append('satKey', p.satKey);
          if (p.satUnit) formData.append('satUnit', p.satUnit);
          if (p.description) formData.append('description', p.description);

          if (p.dynamicPrices) {
             Object.entries(p.dynamicPrices).forEach(([listId, val]) => {
                formData.append(`priceList_${listId}`, val.toString());
             });
          }

          // Use formstate logic by passing an initial state. createProduct is (prevState, formData)
          const result = await createProduct({} as any, formData);
          if (result && result.error) {
             console.error('Failed to sync offline product', p.name, result.error);
             // We can choose to keep it in DB if it failed validation, or delete. Let's keep it if it failed? Actually, we'll delete it to not block the queue, but in a real enterprise app, we'd flag it as failed. 
             // To be robust, let's just delete it for now once attempted if it's a hard error, but skip deletion if network error.
             throw new Error(result.error);
          }
          await db.pendingProducts.delete(p.id);
          syncedAny = true;
        } catch (e: any) { 
          console.error('Sync error product', e); 
        }
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
    <OfflineContext.Provider value={{ isOnline, pendingSales, pushOfflineSale, forceSync, pushOfflineTransfer, pushOfflinePurchase, pushOfflineProduct, refreshCatalogs }}>
      {children}
      {showToast && (
        <div style={{ position: 'fixed', bottom: '80px', left: '50%', transform: 'translateX(-50%)', backgroundColor: showToast.type === 'error' ? '#ef4444' : showToast.type === 'warn' ? '#fbbf24' : '#10b981', color: showToast.type === 'warn' ? '#000' : '#fff', padding: '12px 24px', borderRadius: '8px', zIndex: 9999, fontWeight: 600 }}>{showToast.message}</div>
      )}
    </OfflineContext.Provider>
  );
}

export const useOfflineSync = () => useContext(OfflineContext);
