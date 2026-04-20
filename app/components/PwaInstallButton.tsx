'use client';

import { useState, useEffect } from 'react';
import { Download } from 'lucide-react';

export default function PwaInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(true); // Default true to avoid hydration mismatch layout shift

  useEffect(() => {
    // Check if app is already installed
    const standsAlone = window.matchMedia('(display-mode: standalone)').matches;
    const isIosStandalone = (window.navigator as any).standalone === true;
    setIsInstalled(standsAlone || isIosStandalone);

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstalled(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setIsInstalled(true);
      }
    }
  };

  // Only show if prompt is available and it's not currently installed
  if (!deferredPrompt || isInstalled) {
    return null;
  }

  return (
    <button
      onClick={handleInstallClick}
      title="Descargar Versión de Escritorio"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.4rem 0.8rem',
        backgroundColor: 'var(--pulpos-primary)',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '0.875rem',
        fontWeight: '500',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        transition: 'background-color 0.2s ease',
      }}
      onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--pulpos-primary-hover, #7c3aed)'}
      onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--pulpos-primary)'}
    >
      <Download size={16} />
      <span className="hidden sm:inline">Instalar PWA</span>
    </button>
  );
}
