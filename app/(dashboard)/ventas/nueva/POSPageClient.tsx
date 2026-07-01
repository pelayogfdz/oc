'use client';

import { useState, useEffect, Suspense } from 'react';
import { useOfflineSync } from '@/app/components/OfflineSyncProvider';
import POSClient from './POSClient';
import { Lock, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface POSPageClientProps {
  products: any[];
  customers: any[];
  suppliers: any[];
  promotions: any[];
  dynamicPriceLists: any[];
  pendingQuotes: any[];
  session: any;
  branchId: string;
  branchName: string;
  ticketConfig: any;
  metodosConfig: any;
  ventasConfig: any;
  impresorasConfig: any;
  qzCert: string;
  userPermissions?: Record<string, boolean>;
  userRole?: string;
  isSuperAdmin?: boolean;
}

export default function POSPageClient({
  products,
  customers,
  suppliers,
  promotions,
  dynamicPriceLists,
  pendingQuotes,
  session,
  branchId,
  branchName,
  ticketConfig,
  metodosConfig,
  ventasConfig,
  impresorasConfig,
  qzCert,
  userPermissions = {},
  userRole = 'USER',
  isSuperAdmin = false
}: POSPageClientProps) {
  const { isOnline } = useOfflineSync();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Determine if we should show the closed cashier session block
  // If we are offline, we bypass the session check to allow recording offline sales
  // If we are online, we require an active server-side session
  const showClosedBlock = mounted && isOnline && !session;
  const activeSessionId = session?.id || 'offline-session';

  return (
    <div style={{ position: 'relative' }}>
      {showClosedBlock && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.9)', zIndex: 50, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', borderRadius: '12px' }}>
          <Lock size={64} color="#ef4444" style={{ marginBottom: '1.5rem' }} />
          <h2 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem', color: '#1e293b' }}>Caja Cerrada</h2>
          <p style={{ color: 'var(--caanma-text-muted)', fontSize: '1.1rem', marginBottom: '2rem', textAlign: 'center', maxWidth: '400px' }}>
            No puedes procesar ventas en este momento. Debes realizar la apertura de turno y declarar tu fondo inicial en efectivo para {branchName}.
          </p>
          <Link href="/caja/actual" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.25rem', padding: '1rem 2rem', textDecoration: 'none' }}>
            Abrir Caja Ahora <ArrowRight size={20} />
          </Link>
        </div>
      )}

      <div style={{ filter: showClosedBlock ? 'blur(8px) grayscale(100%)' : 'none', pointerEvents: showClosedBlock ? 'none' : 'auto', transition: 'all 0.3s' }}>
        <Suspense fallback={<div>Cargando Caja...</div>}>
          <POSClient 
            products={products} 
            customers={customers} 
            suppliers={suppliers}
            promotions={promotions}
            dynamicPriceLists={dynamicPriceLists}
            pendingQuotes={pendingQuotes}
            sessionId={activeSessionId} 
            branchId={branchId} 
            ticketConfig={ticketConfig} 
            metodosConfig={metodosConfig}
            ventasConfig={ventasConfig}
            impresorasConfig={impresorasConfig}
            qzCert={qzCert}
            userPermissions={userPermissions}
            userRole={userRole}
            isSuperAdmin={isSuperAdmin}
          />
        </Suspense>
      </div>
    </div>
  );
}
