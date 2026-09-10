'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home, Loader2, Sparkles } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [isReloading, setIsReloading] = useState(true);
  const [statusText, setStatusText] = useState('Sincronizando con la última versión...');

  const purgeAndReload = async () => {
    setIsReloading(true);
    setStatusText('Actualizando aplicación y limpiando cachés...');
    if (typeof window !== 'undefined') {
      try {
        if ('serviceWorker' in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map(reg => reg.unregister()));
        }
        if (typeof caches !== 'undefined') {
          const keys = await caches.keys();
          await Promise.all(keys.map(k => caches.delete(k)));
        }
        sessionStorage.clear();
      } catch (e) {
        console.error('Error during hard reload cache cleanup:', e);
      }

      // Hard redirect with cache buster
      const targetUrl = window.location.pathname.startsWith('/ventas') 
        ? window.location.pathname + '?force=' + Date.now()
        : '/ventas/nueva?force=' + Date.now();
      
      window.location.replace(targetUrl);
    }
  };

  useEffect(() => {
    console.error('Unhandled app error:', error);
    
    // Auto-recovery mechanism: Check if we haven't looped recently
    if (typeof window !== 'undefined') {
      const lastAutoRecovery = sessionStorage.getItem('caanma_auto_recovery_time');
      const now = Date.now();
      
      // If no recovery within the last 15 seconds, auto-heal immediately!
      if (!lastAutoRecovery || now - parseInt(lastAutoRecovery, 10) > 15000) {
        sessionStorage.setItem('caanma_auto_recovery_time', now.toString());
        const timer = setTimeout(() => {
          purgeAndReload();
        }, 300);
        return () => clearTimeout(timer);
      } else {
        // If already recovered in last 15 seconds, allow user manual control
        setIsReloading(false);
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
          backgroundColor: isReloading ? '#ede9fe' : '#fef2f2',
          color: isReloading ? '#8b5cf6' : '#ef4444',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1.5rem'
        }}>
          {isReloading ? <RefreshCw size={32} className="animate-spin" /> : <AlertTriangle size={32} />}
        </div>

        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '0.5rem' }}>
          {isReloading ? 'Sincronizando Sistema' : 'Actualización Disponible'}
        </h2>

        <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: '1.5', marginBottom: '1.75rem' }}>
          {isReloading 
            ? 'Se ha detectado una nueva versión del sistema en el servidor. Actualizando automáticamente...'
            : 'Se actualizó la aplicación en el servidor. Presiona el botón para sincronizar con la última versión.'}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button
            onClick={purgeAndReload}
            disabled={isReloading}
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
              cursor: isReloading ? 'wait' : 'pointer',
              opacity: isReloading ? 0.8 : 1,
              boxShadow: '0 4px 6px -1px rgba(139, 92, 246, 0.25)'
            }}
          >
            {isReloading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />} 
            {isReloading ? statusText : 'Recargar y Sincronizar'}
          </button>

          {!isReloading && (
            <button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.location.replace('/ventas/nueva?force=' + Date.now());
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
              <Home size={18} /> Ir a Punto de Venta
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
