'use client';

import { useState, useEffect } from 'react';
import { Download, CheckCircle } from 'lucide-react';

export default function InstallPWAButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Escuchar el evento que indica que se puede instalar la PWA
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Detectar si ya está instalada
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
       // Si no hay prompt guardado, alertar al usuario cómo hacerlo manualmente si gusta
       alert("No es posible instalar automáticamente ahora. Asegúrate de estar en Chrome o Edge, o instálalo desde la barra URL.");
       return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  if (isInstalled) {
    return (
      <div style={{ marginTop: 'auto', padding: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderRadius: '6px', backgroundColor: '#f0fdf4', color: '#166534', fontWeight: 'bold', fontSize: '0.9rem' }}>
          <CheckCircle size={18} />
          App Desktop Instalada
        </div>
      </div>
    );
  }

  // Si no está instalada, mostramos el botón (incluso si no está el prompt, porque pueden forzarla si se les da instrucciones, pero idealmente funciona con click)
  return (
    <div style={{ marginTop: 'auto', padding: '1rem', borderTop: '1px solid var(--pulpos-border)' }}>
      <button 
        onClick={handleInstallClick}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.75rem 1rem',
          borderRadius: '6px',
          backgroundColor: 'var(--pulpos-primary)',
          color: 'white',
          fontWeight: 'bold',
          fontSize: '0.9rem',
          cursor: 'pointer',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
          transition: 'transform 0.2s',
          border: 'none',
        }}
        onMouseOver={e => e.currentTarget.style.transform = 'scale(1.02)'}
        onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        <Download size={18} />
        Instalar Versión Desktop
      </button>
      <p style={{ fontSize: '0.75rem', color: 'var(--pulpos-text-muted)', textAlign: 'center', marginTop: '0.5rem' }}>
        Trabaja sin internet desde tu computadora.
      </p>
    </div>
  );
}
