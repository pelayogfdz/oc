'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home, Loader2, RotateCcw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    console.error('Unhandled app error:', error);
  }, [error]);

  const forceNavigate = () => {
    setIsNavigating(true);
    if (typeof window !== 'undefined') {
      try {
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations().then((regs) => {
            regs.forEach(r => r.unregister());
          }).catch(() => {});
        }
        if (typeof caches !== 'undefined') {
          caches.keys().then((keys) => {
            keys.forEach(k => caches.delete(k));
          }).catch(() => {});
        }
        sessionStorage.clear();
      } catch (e) {}

      const target = window.location.pathname.startsWith('/ventas')
        ? window.location.pathname
        : '/ventas/nueva';

      window.location.href = target + '?v=' + Date.now();
    }
  };

  const errorMessage = error?.message || (typeof error === 'string' ? error : 'Error inesperado en la interfaz');

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
        maxWidth: '520px',
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
          marginBottom: '1.25rem'
        }}>
          <AlertTriangle size={32} />
        </div>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '0.5rem' }}>
          Error al cargar el Punto de Venta
        </h2>

        <div style={{
          backgroundColor: '#fff1f2',
          border: '1px solid #fecdd3',
          borderRadius: '8px',
          padding: '0.85rem',
          color: '#9f1239',
          fontSize: '0.85rem',
          textAlign: 'left',
          marginBottom: '1.5rem',
          wordBreak: 'break-word',
          maxHeight: '120px',
          overflowY: 'auto'
        }}>
          <strong>Detalle:</strong> {errorMessage}
          {error?.digest && (
            <div style={{ fontSize: '0.75rem', color: '#be123c', marginTop: '0.25rem' }}>
              Digest: {error.digest}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button
            onClick={() => reset()}
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
            <RotateCcw size={18} /> Reintentar Cargar
          </button>

          <button
            onClick={forceNavigate}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              width: '100%',
              padding: '0.85rem',
              backgroundColor: '#f1f5f9',
              color: '#1e293b',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '0.9rem',
              cursor: 'pointer'
            }}
          >
            {isNavigating ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />} 
            {isNavigating ? 'Limpiando...' : 'Limpiar Caché y Recargar'}
          </button>

          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.location.href = '/login?open=true';
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              width: '100%',
              padding: '0.85rem',
              backgroundColor: 'transparent',
              color: '#64748b',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '500',
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            <Home size={16} /> Cerrar Sesión / Ir a Login
          </button>
        </div>
      </div>
    </div>
  );
}
