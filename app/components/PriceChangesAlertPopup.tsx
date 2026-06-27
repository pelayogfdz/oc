'use client';

import React, { useEffect, useState } from 'react';
import { getPriceChangesInLast24Hours } from '@/app/actions/product';
import { Bell, TrendingUp, TrendingDown, X } from 'lucide-react';

type PriceChange = {
  id: string;
  productId: string;
  name: string;
  sku: string;
  oldPrice: number;
  newPrice: number;
  createdAt: Date;
};

export default function PriceChangesAlertPopup() {
  const [changes, setChanges] = useState<PriceChange[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const checkPriceChanges = async () => {
      try {
        const now = new Date();
        const currentHours = now.getHours();
        
        // Solo disparar a partir de las 9:00 AM hora local
        if (currentHours < 9) return;

        // Obtener fecha local en formato YYYY-MM-DD
        const localDateKey = now.toLocaleDateString('en-CA');
        const lastShownDate = localStorage.getItem('price_changes_alert_last_date');

        if (lastShownDate === localDateKey) return;

        // Consultar los cambios
        const priceChanges = await getPriceChangesInLast24Hours();
        if (priceChanges && priceChanges.length > 0) {
          const formattedChanges = priceChanges.map(c => ({
            ...c,
            createdAt: new Date(c.createdAt)
          }));
          setChanges(formattedChanges);
          setIsOpen(true);
        } else {
          // Si no hubo cambios, marcar como verificado hoy para no consultar repetidamente
          localStorage.setItem('price_changes_alert_last_date', localDateKey);
        }
      } catch (err) {
        console.error("Error checking price changes:", err);
      }
    };

    // Correr al montar
    checkPriceChanges();

    // Revisar cada minuto por si cruzan las 9am con la pestaña abierta
    const interval = setInterval(checkPriceChanges, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleClose = () => {
    try {
      const now = new Date();
      const localDateKey = now.toLocaleDateString('en-CA');
      localStorage.setItem('price_changes_alert_last_date', localDateKey);
    } catch (e) {}
    setIsOpen(false);
  };

  if (!isOpen || changes.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(15, 23, 42, 0.4)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '1rem',
      animation: 'priceChangesFadeIn 0.2s ease-out'
    }}>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes priceChangesFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes priceChangesSlideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}} />
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '540px',
        maxHeight: '80vh',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: '1px solid #e2e8f0',
        animation: 'priceChangesSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.5rem',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              backgroundColor: '#dbeafe',
              color: '#2563eb',
              padding: '0.5rem',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Bell size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>Precios Actualizados</h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>Cambios en las últimas 24 horas</p>
            </div>
          </div>
          <button 
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#94a3b8',
              padding: '0.25rem',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f1f5f9';
              e.currentTarget.style.color = '#475569';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#94a3b8';
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{
          padding: '1.5rem',
          overflowY: 'auto',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          {changes.map((item) => {
            const diff = item.newPrice - item.oldPrice;
            const pct = item.oldPrice > 0 ? (diff / item.oldPrice) * 100 : 0;
            const isUp = diff >= 0;

            return (
              <div key={item.id} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem',
                border: '1px solid #f1f5f9',
                borderRadius: '12px',
                backgroundColor: '#f8fafc',
                transition: 'transform 0.2s'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1, marginRight: '1rem' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e293b', wordBreak: 'break-word' }}>
                    {item.name}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>
                    SKU: {item.sku}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', textAlign: 'right' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                    <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
                      ${item.newPrice.toFixed(2)}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', textDecoration: 'line-through' }}>
                      ${item.oldPrice.toFixed(2)}
                    </span>
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    backgroundColor: isUp ? '#ecfdf5' : '#fef2f2',
                    color: isUp ? '#059669' : '#dc2626',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: 600
                  }}>
                    {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    {isUp ? '+' : ''}{pct.toFixed(1)}%
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderTop: '1px solid #f1f5f9',
          display: 'flex',
          justifyContent: 'flex-end',
          backgroundColor: '#ffffff'
        }}>
          <button
            onClick={handleClose}
            style={{
              backgroundColor: '#2563eb',
              color: '#ffffff',
              border: 'none',
              padding: '0.625rem 1.5rem',
              borderRadius: '10px',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.1), 0 2px 4px -1px rgba(37, 99, 235, 0.06)',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
