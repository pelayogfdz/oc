'use client';

import { useState, useEffect } from 'react';
import { Download, CheckCircle, Laptop } from 'lucide-react';

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
       alert(
         "El botón de instalación automática no está disponible en este momento. Esto suele suceder si:\n\n" +
         "1. Ya tienes la aplicación instalada en tu equipo sin saberlo.\n" +
         "2. Rechazaste la instalación previamente.\n\n" +
         "Para forzar la instalación, busca un ícono de un monitor con una flecha en el lado derecho de tu BARRA DE DIRECCIONES (junto a la estrella de Favoritos) en Google Chrome o Edge y haz clic ahí."
       );
       return;
     }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <div style={{ marginTop: 'auto', padding: '1rem', borderTop: '1px solid var(--caanma-border)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      
      {/* Botón de Descarga Standalone (Windows .zip) */}
      <a 
        href="/desktop/CaanmaPOS-portable.zip"
        download="CaanmaPOS-portable.zip"
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.75rem 1rem',
          borderRadius: '6px',
          backgroundColor: '#10b981', // green emerald premium color
          color: 'white',
          fontWeight: 'bold',
          fontSize: '0.9rem',
          textDecoration: 'none',
          textAlign: 'center',
          boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)',
          transition: 'all 0.2s',
          cursor: 'pointer',
          border: 'none',
        }}
        onMouseOver={e => {
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.backgroundColor = '#059669';
        }}
        onMouseOut={e => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.backgroundColor = '#10b981';
        }}
      >
        <Laptop size={18} />
        Descargar CaanmaPOS (Win)
      </a>

      {/* Botón de PWA (Instalar en Navegador) */}
      {!isInstalled ? (
        <button 
          onClick={handleInstallClick}
          style={{
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.6rem 1rem',
            borderRadius: '6px',
            backgroundColor: 'transparent',
            color: 'var(--caanma-text)',
            border: '1px solid var(--caanma-border)',
            fontWeight: 'bold',
            fontSize: '0.85rem',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseOver={e => {
            e.currentTarget.style.backgroundColor = 'var(--caanma-bg-hover)';
            e.currentTarget.style.borderColor = 'var(--caanma-text)';
          }}
          onMouseOut={e => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.borderColor = 'var(--caanma-border)';
          }}
        >
          <Download size={16} />
          Instalar Versión PWA
        </button>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.5rem', borderRadius: '6px', backgroundColor: '#f0fdf4', color: '#166534', fontWeight: '600', fontSize: '0.8rem' }}>
          <CheckCircle size={14} />
          Versión PWA Instalada
        </div>
      )}

      <p style={{ fontSize: '0.75rem', color: 'var(--caanma-text-muted)', textAlign: 'center', margin: 0, lineHeight: '1.2' }}>
        Sincroniza precios y existencias localmente.
      </p>
    </div>
  );
}
