'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { db, OfflineSale, OfflinePendingAttendance, OfflineUser } from '@/lib/offlineDB';
import { invalidateOfflineSearchCache, warmOfflineSearchCache } from '@/lib/offlineSearch';
import { createSale } from '../actions/sale';

interface OfflineContextType {
  isOnline: boolean;
  pendingSales: OfflineSale[];
  pendingTransfers: any[];
  pendingPurchases: any[];
  pendingProducts: any[];
  pendingAttendance: OfflinePendingAttendance[];
  syncMessage: string | null;
  pushOfflineSale: (sale: Omit<OfflineSale, 'id' | 'timestamp' | 'synced' | 'retryCount' | 'failed' | 'errorMessage'> & { id?: string }) => Promise<any>;
  pushOfflineTransfer: (transferParams: any) => Promise<void>;
  pushOfflinePurchase: (purchaseParams: any) => Promise<void>;
  pushOfflineProduct: (productParams: any) => Promise<void>;
  pushOfflineAttendance: (attendanceParams: Omit<OfflinePendingAttendance, 'id' | 'timestamp' | 'synced' | 'retryCount' | 'failed' | 'errorMessage'>) => Promise<void>;
  forceSync: (forceRetryAll?: boolean) => Promise<void>;
  deletePendingSale: (id: string) => Promise<void>;
  retryAllFailed: () => Promise<void>;
  refreshCatalogs: (isBackground?: boolean) => Promise<void>;
  lastSyncTime: number | null;
}

const OfflineContext = createContext<OfflineContextType>({
  isOnline: true,
  pendingSales: [],
  pendingTransfers: [],
  pendingPurchases: [],
  pendingProducts: [],
  pendingAttendance: [],
  syncMessage: null,
  pushOfflineSale: async () => {},
  pushOfflineTransfer: async () => {},
  pushOfflinePurchase: async () => {},
  pushOfflineProduct: async () => {},
  pushOfflineAttendance: async () => {},
  forceSync: async () => {},
  deletePendingSale: async () => {},
  retryAllFailed: async () => {},
  refreshCatalogs: async (isBackground?: boolean) => {},
  lastSyncTime: null,
});

export function isOfflineEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return true;
}


export interface OfflineSyncProviderProps {
  children: React.ReactNode;
  currentTenantId?: string;
  currentUserId?: string;
  currentBranchId?: string;
}

export function OfflineSyncProvider({ 
  children,
  currentTenantId,
  currentUserId,
  currentBranchId
}: OfflineSyncProviderProps) {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [pendingSales, setPendingSales] = useState<OfflineSale[]>([]);
  const [pendingTransfers, setPendingTransfers] = useState<any[]>([]);
  const [pendingPurchases, setPendingPurchases] = useState<any[]>([]);
  const [pendingProducts, setPendingProducts] = useState<any[]>([]);
  const [pendingAttendance, setPendingAttendance] = useState<OfflinePendingAttendance[]>([]);
  const [showToast, setShowToast] = useState<{message: string, type: 'success' | 'warn' | 'error'} | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const isSyncingRef = useRef(false);

  // Auto-clear toasts
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  // Tenant Switch Detection & Strict Cache Purge
  useEffect(() => {
    if (typeof window === 'undefined' || !currentTenantId) return;

    const storedTenantId = localStorage.getItem('caanma_cached_tenant_id');
    if (storedTenantId && storedTenantId !== currentTenantId) {
      console.warn(`[OfflineSync] Tenant switch detected (${storedTenantId} -> ${currentTenantId}). Purging old tenant data.`);
      
      const purgeOldTenantData = async () => {
        try {
          // 1. Clear Dexie IndexedDB catalog tables
          await db.transaction('rw', [db.customers, db.suppliers, db.branches, db.settings, db.users, db.products, db.sales], async () => {
            await db.customers.clear();
            await db.suppliers.clear();
            await db.branches.clear();
            await db.users.clear();
            await db.products.clear();
            await db.settings.clear();
            await db.sales.clear();
          });

          // 2. Clear Service Worker caches
          if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => caches.delete(name)));
          }

          // 3. Clear in-memory product search index
          invalidateOfflineSearchCache();

          // 4. Reset local storage sync flags
          localStorage.removeItem('last_catalog_sync_timestamp');
          localStorage.removeItem('cached_branch_id');
          localStorage.setItem('caanma_cached_tenant_id', currentTenantId);
          if (currentUserId) localStorage.setItem('caanma_active_user_id', currentUserId);

          setLastSyncTime(null);
          // 5. Automatically download the new tenant's fresh catalogs!
          if (navigator.onLine) {
            await refreshCatalogs(false);
          }
        } catch (e) {
          console.error('[OfflineSync] Error during tenant switch cleanup:', e);
        }
      };

      purgeOldTenantData();
    } else {
      localStorage.setItem('caanma_cached_tenant_id', currentTenantId);
      if (currentUserId) localStorage.setItem('caanma_active_user_id', currentUserId);
    }
  }, [currentTenantId, currentUserId]);

  // Initialize Network status
  useEffect(() => {
    const isMockOffline = typeof window !== 'undefined' && window.location.search.includes('mock-offline=true');
    setIsOnline(isMockOffline ? false : navigator.onLine);
    
    // Load last sync time from localStorage
    if (typeof window !== 'undefined') {
      const ts = localStorage.getItem('last_catalog_sync_timestamp');
      if (ts) {
        setLastSyncTime(parseInt(ts));
      }
      // Purge any legacy SVG placeholder URLs from local Dexie IndexedDB cache
      db.products.filter((p: any) => !!p.imageUrl && (p.imageUrl.includes('.svg') || p.imageUrl.includes('placeholder') || p.imageUrl.includes('/placeholders/'))).modify({ imageUrl: null } as any).catch(() => {});
    }
    
    const handleOnline = () => {
      const isMockOffline = typeof window !== 'undefined' && window.location.search.includes('mock-offline=true');
      setIsOnline(isMockOffline ? false : true);
      if (isOfflineEnabled() && !isMockOffline) {
        setShowToast({ message: 'Conexión Restablecida. Sincronizando datos...', type: 'success' });
        forceSync();
        refreshCatalogs();
      }
    };
    const handleOffline = () => {
      setIsOnline(false);
      if (isOfflineEnabled()) {
        setShowToast({ message: 'Sin Internet. Cambiando a base de datos de respaldo (Offline).', type: 'warn' });
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    const isEnabled = isOfflineEnabled();
    
    if (isEnabled) {
      loadPendingQueues();
      // Pre-warm the in-memory search caches in background
      warmOfflineSearchCache(db).catch(() => {});
      
      const shouldRefreshOnStart = async () => {
        if (!navigator.onLine) return;
        
        const lastSync = localStorage.getItem('last_catalog_sync_timestamp');
        const fourHours = 4 * 60 * 60 * 1000;
        const productCount = await db.products.count();
        if (productCount === 0 || !lastSync || (Date.now() - parseInt(lastSync)) > fourHours) {
          await refreshCatalogs(true);
        }
      };
      
      shouldRefreshOnStart();
    } else {
      // Clear IndexedDB for non-supported offline clients to reclaim storage space
      db.transaction('rw', [db.customers, db.suppliers, db.branches, db.settings, db.users, db.products], async () => {
        await db.customers.clear();
        await db.suppliers.clear();
        await db.branches.clear();
        await db.users.clear();
        await db.products.clear();
      }).catch(e => console.error('[Offline] Error clearing IndexedDB:', e));
    }

    // Configurar intervalos de sincronización continua en segundo plano solo para la versión descargable en escritorio (PWA)
    let syncInterval: NodeJS.Timeout | null = null;
    let catalogInterval: NodeJS.Timeout | null = null;

    if (isEnabled) {
      console.log('[PWA] Inicializando sincronización en segundo plano...');
      // Cada 30 segundos: sincronizar transacciones offline pendientes
      syncInterval = setInterval(() => {
        console.log('[PWA] Sincronización automática de transacciones iniciada...');
        forceSync();
      }, 30 * 1000);

      // Sincronizar silenciosamente los catálogos desde el servidor cada 6 horas (en lugar de cada 3 minutos)
      // para evitar bloqueos y lentitud extrema mientras la plataforma está online
      catalogInterval = setInterval(() => {
        console.log('[PWA] Sincronización automática de catálogos en segundo plano iniciada...');
        refreshCatalogs(true);
      }, 6 * 60 * 60 * 1000);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (syncInterval) clearInterval(syncInterval);
      if (catalogInterval) clearInterval(catalogInterval);
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
      const attendance = await db.pendingAttendance.toArray();
      setPendingAttendance(attendance);
    } catch (e) {
      console.error('Error loading offline DB', e);
    }
  };

  const pushOfflineSale = async (saleParams: Omit<OfflineSale, 'id' | 'timestamp' | 'synced' | 'retryCount' | 'failed' | 'errorMessage'> & { id?: string }) => {
    try {
      const now = new Date();
      const recentSales = await db.pendingSales
        .where('timestamp')
        .above(new Date(now.getTime() - 10000).toISOString())
        .toArray();

      const isDuplicate = recentSales.some(s => 
        s.customerId === saleParams.customerId &&
        s.total === saleParams.total &&
        JSON.stringify(s.items) === JSON.stringify(saleParams.items)
      );

      if (isDuplicate) {
        console.warn('[Offline] Duplicate sale submission detected within 10s, ignoring.');
        return recentSales.find(s => 
          s.customerId === saleParams.customerId &&
          s.total === saleParams.total &&
          JSON.stringify(s.items) === JSON.stringify(saleParams.items)
        );
      }

      const newSale: OfflineSale = {
        ...saleParams,
        id: saleParams.id || crypto.randomUUID(), 
        timestamp: now.toISOString(),
        synced: false,
        retryCount: 0,
        failed: false
      };
      await db.pendingSales.add(newSale);
      setPendingSales(prev => [...prev, newSale]);

      // Deduct stock immediately from local IndexedDB mirror
      if (saleParams.items && Array.isArray(saleParams.items)) {
        let stockModified = false;
        for (const item of saleParams.items) {
          if (item.productId) {
            try {
              const localProd = await db.products.get(item.productId);
              if (localProd) {
                const currentStock = Number(localProd.stock) || 0;
                const soldQty = Number(item.quantity) || 0;
                const newStock = Math.max(0, currentStock - soldQty);
                await db.products.update(item.productId, { stock: newStock });
                stockModified = true;
              }
            } catch (errStock) {
              console.warn('[OfflineDB] Error updating local stock mirror:', errStock);
            }
          }
        }
        if (stockModified) {
          invalidateOfflineSearchCache();
        }
      }

      if (!isOnline) {
        const typeLabel = saleParams.type === 'QUOTE' ? 'Cotización' : saleParams.type === 'CONSIGNMENT' ? 'Consignación' : 'Venta';
        setShowToast({ message: `${typeLabel} registrada localmente y descontada de inventario (Modo Offline).`, type: 'warn' });
      } else {
        forceSync();
      }
      return newSale;
    } catch (error) {
      setShowToast({ message: 'Error al intentar guardar la operación.', type: 'error' });
      return null;
    }
  };

  const pushOfflineTransfer = async (transferParams: any) => {
    try {
      const now = new Date();
      const recentTransfers = await db.pendingTransfers
        .where('timestamp')
        .above(new Date(now.getTime() - 10000).toISOString())
        .toArray();

      const isDuplicate = recentTransfers.some(t => 
        t.toBranchId === transferParams.toBranchId &&
        JSON.stringify(t.items) === JSON.stringify(transferParams.items)
      );

      if (isDuplicate) {
        console.warn('[Offline] Duplicate transfer submission detected within 10s, ignoring.');
        return;
      }

      const newTransfer = {
        ...transferParams,
        id: crypto.randomUUID(),
        timestamp: now.toISOString(),
        synced: false,
        retryCount: 0,
        failed: false
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
      const now = new Date();
      const recentPurchases = await db.pendingPurchases
        .where('timestamp')
        .above(new Date(now.getTime() - 10000).toISOString())
        .toArray();

      const isDuplicate = recentPurchases.some(p => 
        p.supplierId === purchaseParams.supplierId &&
        p.total === purchaseParams.total &&
        JSON.stringify(p.items) === JSON.stringify(purchaseParams.items)
      );

      if (isDuplicate) {
        console.warn('[Offline] Duplicate purchase submission detected within 10s, ignoring.');
        return;
      }

      const newPurchase = {
        ...purchaseParams,
        id: crypto.randomUUID(),
        timestamp: now.toISOString(),
        synced: false,
        retryCount: 0,
        failed: false
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
        synced: false,
        retryCount: 0,
        failed: false
      };
      await db.pendingProducts.add(newProduct);
      setPendingProducts(prev => [...prev, newProduct]);
      
      // Mirror to products table so it's instantly available offline for search/sale
      const mirrorProduct = {
        id: newProduct.productId || crypto.randomUUID(),
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
      if (newProduct.productId) {
        await db.products.put(mirrorProduct);
        invalidateOfflineSearchCache();
        if (!isOnline) setShowToast({ message: 'Cambios de producto guardados localmente.', type: 'warn' });
      } else {
        await db.products.add(mirrorProduct);
        invalidateOfflineSearchCache();
        if (!isOnline) setShowToast({ message: 'Producto registrado localmente.', type: 'warn' });
      }

      if (isOnline) forceSync();
    } catch (e) {
      setShowToast({ message: 'Error guardando producto offline', type: 'error' });
    }
  };

  const pushOfflineAttendance = async (attendanceParams: Omit<OfflinePendingAttendance, 'id' | 'timestamp' | 'synced' | 'retryCount' | 'failed' | 'errorMessage'>) => {
    try {
      const newAttendance: OfflinePendingAttendance = {
        ...attendanceParams,
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        synced: false,
        retryCount: 0,
        failed: false
      };
      await db.pendingAttendance.add(newAttendance);
      setPendingAttendance(prev => [...prev, newAttendance]);
      if (!isOnline) {
        setShowToast({ message: 'Asistencia registrada localmente en modo Offline.', type: 'warn' });
      } else {
        forceSync();
      }
    } catch (e) {
      setShowToast({ message: 'Error guardando registro de asistencia offline', type: 'error' });
    }
  };

  const deletePendingSale = async (id: string) => {
    try {
      await db.pendingSales.delete(id);
      await loadPendingQueues();
      setShowToast({ message: 'Registro descartado de la cola.', type: 'warn' });
    } catch (e: any) {
      console.error('Error deleting pending sale:', e);
      setShowToast({ message: 'Error al descartar registro', type: 'error' });
    }
  };

  const retryAllFailed = async () => {
    try {
      const sales = await db.pendingSales.toArray();
      for (const s of sales) {
        await db.pendingSales.update(s.id, { failed: false, retryCount: 0, errorMessage: undefined });
      }
      const transfers = await db.pendingTransfers.toArray();
      for (const t of transfers) {
        await db.pendingTransfers.update(t.id, { failed: false, retryCount: 0, errorMessage: undefined });
      }
      const purchases = await db.pendingPurchases.toArray();
      for (const p of purchases) {
        await db.pendingPurchases.update(p.id, { failed: false, retryCount: 0, errorMessage: undefined });
      }
      const products = await db.pendingProducts.toArray();
      for (const pr of products) {
        await db.pendingProducts.update(pr.id, { failed: false, retryCount: 0, errorMessage: undefined });
      }
      const attendance = await db.pendingAttendance.toArray();
      for (const a of attendance) {
        await db.pendingAttendance.update(a.id, { failed: false, retryCount: 0, errorMessage: undefined });
      }
      await loadPendingQueues();
      await forceSync(true);
    } catch (e) {
      console.error('Error resetting failed sync queue:', e);
    }
  };

  const forceSync = async (forceRetryAll?: boolean) => {
    if (!isOnline) return;
    if (isSyncingRef.current) {
      console.log('[PWA] Sincronización en curso, omitiendo ejecución paralela.');
      return;
    }
    isSyncingRef.current = true;
    try {
      let syncedAny = false;
      
      // Sync Sales
      const sales = await db.pendingSales.toArray();
      for (const sale of sales) {
        if (!forceRetryAll && sale.failed && (sale.retryCount || 0) >= 5) continue;
        try {
          if (sale.type === 'QUOTE') {
            const { createQuote } = await import('../actions/quote');
            const quoteRes = await createQuote(
              sale.items.map(item => ({
                productId: item.productId,
                variantId: item.variantId || null,
                quantity: item.quantity,
                price: item.price
              })),
              sale.total,
              sale.paymentMethod,
              sale.customerId,
              undefined,
              sale.breakdownDiscounts,
              sale.notes || (sale as any).observations || null,
              sale.observationImageUrl || null
            );
            if (!quoteRes || (quoteRes as any).error) {
              throw new Error((quoteRes as any)?.error || 'Error al procesar cotización');
            }
          } else if (sale.type === 'CANCEL') {
            const { cancelSaleInternal } = await import('../actions/sale');
            const { getActiveUser } = await import('../actions/auth');
            const user = await getActiveUser();
            if (user) {
              await cancelSaleInternal(sale.id, user.id);
            }
          } else if (sale.type === 'CONSIGNMENT') {
            const { createConsignment } = await import('../actions/consignment');
            const consRes = await createConsignment(
              sale.items.map(item => ({
                productId: item.productId,
                variantId: item.variantId || null,
                quantity: item.quantity,
                price: item.price
              })),
              sale.total,
              sale.paymentMethod,
              sale.customerId
            );
            if (!consRes || (consRes as any).error) {
              throw new Error((consRes as any)?.error || 'Error al procesar consignación');
            }
          } else {
            // Dynamic import to avoid cycles
            const { createSale } = await import('../actions/sale');
            const saleAny = sale as any;
            const res = await createSale(
              sale.items, 
              sale.total, 
              sale.paymentMethod, 
              sale.customerId, 
              sale.sessionId, 
              sale.notes, 
              sale.cashValue, 
              sale.cardValue, 
              sale.transferValue,
              sale.billingData,
              undefined,
              undefined,
              0,
              sale.branchId,
              sale.breakdownDiscounts,
              saleAny.isPedido || false,
              saleAny.deliveryDate,
              saleAny.deliveryTime,
              saleAny.deliveryStreet,
              saleAny.deliveryType,
              {
                isDelivery: saleAny.isDelivery,
                street: saleAny.deliveryStreet,
                exteriorNumber: saleAny.deliveryExtNumber,
                interiorNumber: saleAny.deliveryIntNumber,
                neighborhood: saleAny.deliveryColonia,
                city: saleAny.deliveryCity,
                state: saleAny.deliveryState,
                zipCode: saleAny.deliveryZipCode,
                notes: saleAny.deliveryNotes,
                shippingDate: saleAny.shippingDate,
                deliveryDate: saleAny.deliveryDate,
                deliveryTime: saleAny.deliveryTime,
                driverId: saleAny.deliveryDriverId
              }
            );
            if (!res || !res.success) {
              throw new Error(res?.error || 'Error al procesar la venta en el servidor');
            }
            if (res.updatedStocks && Array.isArray(res.updatedStocks)) {
              for (const s of res.updatedStocks) {
                const localProd = await db.products.get(s.id);
                if (localProd) {
                  let updatedVariants = localProd.variants;
                  if (Array.isArray(localProd.variants) && Array.isArray(s.variants)) {
                    updatedVariants = localProd.variants.map((v: any) => {
                      const sv = s.variants.find((x: any) => x.id === v.id);
                      return sv ? { ...v, stock: sv.stock } : v;
                    });
                  }
                  await db.products.update(s.id, { stock: s.stock, variants: updatedVariants });
                }
              }
              const { invalidateOfflineSearchCache } = await import('@/lib/offlineSearch');
              invalidateOfflineSearchCache();
            }
          }
          await db.pendingSales.delete(sale.id);
          syncedAny = true;

        } catch (e: any) { 
          console.error('Sync error sale', e);
          const newCount = (sale.retryCount || 0) + 1;
          await db.pendingSales.update(sale.id, { retryCount: newCount, failed: newCount >= 5, errorMessage: e?.message || 'Error Desconocido' });
        }
      }

      // Sync Transfers
      const transfers = await db.pendingTransfers.toArray();
      for (const t of transfers) {
        if (!forceRetryAll && t.failed && (t.retryCount || 0) >= 5) continue;
        try {
           const { requestTransfer, dispatchDirectTransfer } = await import('../actions/transfer');
           let res;
           if (t.isDirectDispatch) {
             res = await dispatchDirectTransfer({ toBranchId: t.toBranchId!, reason: t.reason, items: t.items });
           } else {
             res = await requestTransfer({ fromBranchId: t.fromBranchId, reason: t.reason, items: t.items });
           }
           if (res && !res.success) {
             throw new Error(res.error || "Error de validación en traspaso");
           }
           await db.pendingTransfers.delete(t.id);
           syncedAny = true;
        } catch (e: any) { 
           console.error('Sync error transfer', e);
           const newCount = (t.retryCount || 0) + 1;
           await db.pendingTransfers.update(t.id, { retryCount: newCount, failed: newCount >= 5, errorMessage: e?.message });
        }
      }

      // Sync Purchases & Purchase Orders
      const purchases = await db.pendingPurchases.toArray();
      for (const p of purchases) {
        if (!forceRetryAll && p.failed && (p.retryCount || 0) >= 5) continue;
        try {
          if (p.isDirectPurchase) {
            const { createPurchase } = await import('../actions/purchase');
            const res = await createPurchase(
              p.items,
              p.total || 0,
              p.paymentMethod || 'CASH',
              p.supplierId || null,
              p.freightCost || 0,
              p.discount || 0,
              p.id,
              p.supplierFolio || null,
              undefined,
              p.creditDays,
              p.notes
            );
            if (res && !res.success) {
              if (res.error && (res.error.includes('Unique constraint') || res.error.includes('already exists') || res.error.includes('duplicate key'))) {
                console.log('[PWA] Compra ya sincronizada previamente (duplicada en BD), eliminando de la cola:', p.id);
              } else {
                throw new Error(res.error);
              }
            }
          } else {
            const { createPurchaseOrder } = await import('../actions/pedidos');
            await createPurchaseOrder(p.supplierId || null, p.notes || '', p.items, p.total || 0);
          }
          await db.pendingPurchases.delete(p.id);
          syncedAny = true;
        } catch (e: any) { 
           console.error('Sync error purchase', e);
           const newCount = (p.retryCount || 0) + 1;
           await db.pendingPurchases.update(p.id, { retryCount: newCount, failed: newCount >= 5, errorMessage: e?.message });
        }
      }

      // Sync Products
      const products = await db.pendingProducts.toArray();
      for (const p of products) {
        if (!forceRetryAll && p.failed && (p.retryCount || 0) >= 5) continue;
        try {
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
          if (p.taxType) formData.append('taxType', p.taxType);
          if (p.iepsRate !== undefined) formData.append('iepsRate', p.iepsRate.toString());
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

          // Append any dynamic price fields from p (flat keys starting with priceList_)
          Object.entries(p).forEach(([key, val]) => {
            if (key.startsWith('priceList_') && val !== undefined && val !== null) {
              formData.append(key, val.toString());
            }
          });

          if (p.productId) {
            const { updateProduct } = await import('../actions/product');
            await updateProduct(p.productId, formData);
          } else {
            const { createProduct } = await import('../actions/product');
            const result = await createProduct({} as any, formData);
            if (result && result.error) {
               throw new Error(result.error);
            }
          }
          await db.pendingProducts.delete(p.id);
          syncedAny = true;
        } catch (e: any) { 
          console.error('Sync error product', e); 
          const newCount = (p.retryCount || 0) + 1;
          await db.pendingProducts.update(p.id, { retryCount: newCount, failed: newCount >= 5, errorMessage: e?.message });
        }
      }

      // Sync Attendance
      const attendanceLogs = await db.pendingAttendance.toArray();
      for (const log of attendanceLogs) {
        if (!forceRetryAll && log.failed && (log.retryCount || 0) >= 5) continue;
        try {
          const { registerAttendance } = await import('../actions/hr');
          const res = await registerAttendance({
            userId: log.userId,
            type: log.type,
            latitude: log.latitude,
            longitude: log.longitude,
            photoUrl: log.photoUrl,
            deviceInfo: log.deviceInfo,
            timestamp: log.timestamp
          });
          if (res && !res.success) {
            throw new Error(res.error || "Error de validación en asistencia");
          }
          await db.pendingAttendance.delete(log.id);
          syncedAny = true;
        } catch (e: any) { 
          console.error('Sync error attendance', e);
          const newCount = (log.retryCount || 0) + 1;
          await db.pendingAttendance.update(log.id, { retryCount: newCount, failed: newCount >= 5, errorMessage: e?.message });
        }
      }

      if (syncedAny) {
        setShowToast({ message: 'Caché Offline Sincronizado a la Nube.', type: 'success' });
      }
    } catch (e) {
      console.error('Sync process failed', e);
    } finally {
      isSyncingRef.current = false;
      await loadPendingQueues();
    }
  };

  const refreshCatalogs = async (isBackground?: boolean) => {
    if (!isOfflineEnabled()) return;
    if (!isOnline) return;
    try {
      const { syncBasicCatalogs, syncProductsPage } = await import('../actions/sync');
      if (!isBackground) {
        setShowToast({ message: 'Sincronizando catálogo de sucursal...', type: 'warn' });
      }
      
      const basicData = await syncBasicCatalogs();
      const targetBranchId = (basicData as any).syncBranchId || '';
      const lastCachedBranchId = localStorage.getItem('cached_branch_id');
      const isBranchSwitch = lastCachedBranchId && targetBranchId && lastCachedBranchId !== targetBranchId;
      
      const totalProducts = basicData.totalProducts;
      const pageSize = 2500;
      const totalPages = Math.max(1, Math.ceil(totalProducts / pageSize));
      
      // Perform a transaction to update basic tables
      await db.transaction('rw', [db.customers, db.suppliers, db.branches, db.settings, db.users, db.products, db.sales], async () => {
        await db.customers.clear();
        await db.customers.bulkAdd(basicData.customers);
        
        await db.suppliers.clear();
        await db.suppliers.bulkAdd(basicData.suppliers);
        
        await db.branches.clear();
        await db.branches.bulkAdd(basicData.branches);

        await db.users.clear();
        await db.users.bulkAdd(basicData.users || []);
        
        if (basicData.settings) {
          await db.settings.clear();
          await db.settings.add({
            id: 'branch_config',
            ventasConfig: JSON.parse(basicData.settings.configJson || '{}').ventas || {},
            ticketConfig: JSON.parse(basicData.settings.configJson || '{}').tickets || {},
            metodosConfig: JSON.parse(basicData.settings.configJson || '{}').metodos || {}
          });
        }

        await db.sales.clear();
        await db.sales.bulkAdd(basicData.recentSales || []);

        if (isBranchSwitch) {
          await db.products.clear();
        }
      });

      // Fetch and write branch products page by page smoothly using bulkPut and micro-yields
      for (let i = 1; i <= totalPages; i++) {
        if (!isBackground) {
          setSyncMessage(`Sincronizando Catálogo... (${i}/${totalPages})`);
        }
        const productsChunk = await syncProductsPage(i, pageSize, targetBranchId);
        if (productsChunk && productsChunk.length > 0) {
          await db.products.bulkPut(productsChunk);
        }
        // Yield to event loop to keep UI 100% responsive
        await new Promise(resolve => setTimeout(resolve, 20));
      }

      if (targetBranchId) {
        localStorage.setItem('cached_branch_id', targetBranchId);
      }
      localStorage.setItem('last_catalog_sync_timestamp', Date.now().toString());
      setLastSyncTime(Date.now());
      
      try {
        invalidateOfflineSearchCache();
        // Warm up the new index immediately in the background
        warmOfflineSearchCache(db).catch(() => {});
      } catch (eCache) {
        console.warn('Could not invalidate offline search cache', eCache);
      }

      // Pre-warm the POS shell in Cache API for instant 0ms offline startup
      if (typeof window !== 'undefined' && 'caches' in window) {
        caches.open('caanma-offline-cache-v4').then(async (cache) => {
          try {
            const htmlRes = await fetch('/ventas/nueva', { credentials: 'same-origin' });
            if (htmlRes.ok) {
              await cache.put('/ventas/nueva', htmlRes);
            }
            const rscRes = await fetch('/ventas/nueva', {
              headers: { 'RSC': '1' },
              credentials: 'same-origin'
            });
            if (rscRes.ok) {
              await cache.put('/ventas/nueva__rsc', rscRes);
            }
          } catch (eWarm) {}
        }).catch(() => {});
      }

      if (!isBackground) {
        setSyncMessage(null);
        setShowToast({ message: `Catálogo (${totalProducts.toLocaleString()} productos) listo para vender offline.`, type: 'success' });
      }
    } catch (e) {
      console.error('Failed to sync catalogs', e);
      if (!isBackground) {
        setSyncMessage(null);
        setShowToast({ message: 'Error al actualizar catálogos. Se mantiene la versión local anterior.', type: 'error' });
      }
    }
  };

  return (
    <OfflineContext.Provider value={{ 
      isOnline, 
      pendingSales, 
      pendingTransfers, 
      pendingPurchases, 
      pendingProducts, 
      pendingAttendance, 
      syncMessage, 
      pushOfflineSale, 
      forceSync, 
      deletePendingSale, 
      retryAllFailed, 
      pushOfflineTransfer, 
      pushOfflinePurchase, 
      pushOfflineProduct, 
      pushOfflineAttendance, 
      refreshCatalogs, 
      lastSyncTime 
    }}>
      {children}
      {showToast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 99999,
          padding: '12px 18px',
          borderRadius: '8px',
          color: '#fff',
          fontWeight: 500,
          fontSize: '0.9rem',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: showToast.type === 'success' ? '#10b981' : showToast.type === 'warn' ? '#f59e0b' : '#ef4444',
          animation: 'slideIn 0.2s ease-out'
        }}>
          {showToast.message}
          <button onClick={() => setShowToast(null)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 'bold', marginLeft: '8px' }}>×</button>
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes slideIn {
              from { transform: translateY(20px); opacity: 0; }
              to { transform: translateY(0); opacity: 1; }
            }
          `}} />
        </div>
      )}
    </OfflineContext.Provider>
  );
}

export const useOfflineSync = () => useContext(OfflineContext);
