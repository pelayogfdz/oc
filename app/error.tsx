'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home, Loader2 } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [isNavigating, setIsNavigating] = useState(false);

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

      // Immediate navigation
      window.location.href = target + '?v=' + Date.now();
    }
  };

  useEffect(() => {
    console.error('Unhandled app error:', error);
    
    // Auto-trigger navigation once after 300ms
    if (typeof window !== 'undefined') {
      const lastAutoRecovery = sessionStorage.getItem('caanma_err_recovery');
      const now = Date.now();
      if (!lastAutoRecovery || now - parseInt(lastAutoRecovery, 10) > 10000) {
        sessionStorage.setItem('caanma_err_recovery', now.toString());
        const timer = setTimeout(() => {
          forceNavigate();
        }, 200);
        return () => clearTimeout(timer);
      }
    }
  }, [error]);

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
          backgroundColor: '#ede9fe',
          color: '#8b5cf6',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1.5rem'
        }}>
          {isNavigating ? <Loader2 size={32} className="animate-spin" /> : <RefreshCw size={32} />}
        </div>

        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '0.5rem' }}>
          Sincronizando con el Servidor
        </h2>

        <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: '1.5', marginBottom: '1.75rem' }}>
          Actualizando a la última versión del sistema. Si no carga automáticamente, pulsa el botón abajo.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button
            onClick={forceNavigate}
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
            {isNavigating ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />} 
            {isNavigating ? 'Cargando...' : 'Entrar a Punto de Venta'}
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
              backgroundColor: '#f1f5f9',
              color: '#334155',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '0.9rem',
              cursor: 'pointer'
            }}
          >
            <Home size={18} /> Iniciar Sesión / Recargar
          </button>
        </div>
      </div>
    </div>
  );
}
