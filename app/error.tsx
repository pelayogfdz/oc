'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled app error:', error);
  }, [error]);

  const handleHardReload = () => {
    if (typeof window !== 'undefined') {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(regs => {
          for (const reg of regs) reg.unregister();
        });
      }
      if (typeof caches !== 'undefined') {
        caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))));
      }
      window.location.reload();
    }
  };

  return (
    <div style={{
      minHeight: '80vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      backgroundColor: '#f8fafc',
      fontFamily: 'sans-serif'
    }}>
      <div style={{
        maxWidth: '480px',
        width: '100%',
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '2.5rem',
        textAlign: 'center',
        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.05)',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          backgroundColor: '#fef2f2',
          color: '#ef4444',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1.5rem'
        }}>
          <AlertTriangle size={32} />
        </div>

        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '0.5rem' }}>
          Algo no salió como se esperaba
        </h2>

        <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: '1.5', marginBottom: '1.75rem' }}>
          Es posible que se haya actualizado la aplicación en el servidor. Presiona el botón para sincronizar con la última versión.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button
            onClick={handleHardReload}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              width: '100%',
              padding: '0.85rem',
              backgroundColor: '#8b5cf6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 'bold',
              fontSize: '0.95rem',
              cursor: 'pointer',
              boxShadow: '0 4px 6px -1px rgba(139, 92, 246, 0.25)'
            }}
          >
            <RefreshCw size={18} /> Recargar y Sincronizar
          </button>

          <Link
            href="/ventas/nueva"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              width: '100%',
              padding: '0.85rem',
              backgroundColor: '#f1f5f9',
              color: '#334155',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '0.9rem',
              textDecoration: 'none'
            }}
          >
            <Home size={18} /> Ir a Punto de Venta
          </Link>
        </div>
      </div>
    </div>
  );
}
