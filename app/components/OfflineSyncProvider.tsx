'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

// Tipos de datos para transacciones offline
export interface OfflineSale {
  id: string;
  items: any[];
  total: number;
  paymentMethod: string;
  customerId?: string | null;
  sessionId?: string;
  notes?: string;
  cashValue?: number;
  cardValue?: number;
  billingData?: any;
  timestamp: string;
  synced: boolean;
}

interface OfflineContextType {
  isOnline: boolean;
  pendingSales: OfflineSale[];
  pushOfflineSale: (sale: Omit<OfflineSale, 'id' | 'timestamp' | 'synced'>) => Promise<void>;
  forceSync: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextType>({
  isOnline: true,
  pendingSales: [],
  pushOfflineSale: async () => {},
  forceSync: async () => {},
});

import { createSale } from '../actions/sale';

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('PulposOfflineDB', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('offlineSales')) {
        db.createObjectStore('offlineSales', { keyPath: 'id' });
      }
    };
  });
};

export function OfflineSyncProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [pendingSales, setPendingSales] = useState<OfflineSale[]>([]);
  const [showToast, setShowToast] = useState<{message: string, type: 'success' | 'warn' | 'error'} | null>(null);

  // Initialize Network status
  useEffect(() => {
    setIsOnline(navigator.onLine);
    
    const handleOnline = () => {
      setIsOnline(true);
      setShowToast({ message: 'Conexión Restablecida. Sincronizando datos...', type: 'success' });
      forceSync();
    };
    const handleOffline = () => {
      setIsOnline(false);
      setShowToast({ message: 'Sin Internet. Las ventas se guardarán localmente.', type: 'warn' });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    loadPendingSales();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadPendingSales = async () => {
    try {
      const db = await openDB();
      const transaction = db.transaction(['offlineSales'], 'readonly');
      const store = transaction.objectStore('offlineSales');
      const request = store.getAll();
      
      request.onsuccess = () => {
        setPendingSales(request.result || []);
      };
    } catch (e) {
      console.error('Error loading offline DB', e);
    }
  };

  const pushOfflineSale = async (saleParams: Omit<OfflineSale, 'id' | 'timestamp' | 'synced'>) => {
    try {
      const newSale: OfflineSale = {
        ...saleParams,
        id: crypto.randomUUID(), // Generar UUID temporal
        timestamp: new Date().toISOString(),
        synced: false
      };

      const db = await openDB();
      const transaction = db.transaction(['offlineSales'], 'readwrite');
      const store = transaction.objectStore('offlineSales');
      store.add(newSale);

      transaction.oncomplete = () => {
        setPendingSales(prev => [...prev, newSale]);
        if (!isOnline) {
          setShowToast({ message: 'Venta guardada en modo Offline.', type: 'warn' });
        } else {
          // Intentar enviar inmediatamente si dice estar online
          forceSync();
        }
      };
    } catch (error) {
      console.error('Error saving offline', error);
      setShowToast({ message: 'Error al intentar guardar la venta.', type: 'error' });
    }
  };

  const forceSync = async () => {
    if (!navigator.onLine) return;
    try {
      const db = await openDB();
      const tx = db.transaction(['offlineSales'], 'readwrite');
      const store = tx.objectStore('offlineSales');
      const request = store.getAll();

      request.onsuccess = async () => {
        const sales = request.result as any[];
        if (sales.length === 0) return;

        let syncCount = 0;
        for (const sale of sales) {
          try {
            // FIRE REAL NEXT.JS SERVER ACTION ON BACKGROUND
            await createSale(
               sale.items,
               sale.total,
               sale.paymentMethod,
               sale.customerId,
               sale.sessionId,
               sale.notes,
               sale.cashValue,
               sale.cardValue,
               sale.billingData
            );
            
            // Borrar de IndexedDB tras subirla a la nube exitosamente
            const deleteTx = db.transaction(['offlineSales'], 'readwrite');
            deleteTx.objectStore('offlineSales').delete(sale.id);
            syncCount++;
          } catch (syncError) {
            console.error('Error syncing individual sale', syncError);
          }
        }
        
        loadPendingSales();
        if (syncCount > 0) {
          setShowToast({ message: `¡Se han sincronizado ${syncCount} ventas locales con la Nube!`, type: 'success' });
        }
      };
    } catch (e) {
      console.error('Sync process failed', e);
    }
  };

  // Toast Auto-hide
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  return (
    <OfflineContext.Provider value={{ isOnline, pendingSales, pushOfflineSale, forceSync }}>
      {children}

      {/* Global Toast UI */}
      {showToast && (
        <div style={{
          position: 'fixed',
          bottom: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: showToast.type === 'error' ? '#ef4444' : showToast.type === 'warn' ? '#fbbf24' : '#10b981',
          color: showToast.type === 'warn' ? '#000' : '#fff',
          padding: '12px 24px',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          zIndex: 9999,
          fontWeight: 600,
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          minWidth: '280px',
          justifyContent: 'center',
          animation: 'slideUp 0.3s ease-out'
        }}>
          {showToast.message}
        </div>
      )}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slideUp {
          from { opacity: 0; transform: translate(-50%, 20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
      `}} />
    </OfflineContext.Provider>
  );
}

export const useOfflineSync = () => useContext(OfflineContext);
