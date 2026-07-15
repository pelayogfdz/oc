'use client';
import { useState, useEffect } from 'react';
import { ShoppingBag, X, FileText, Download, BellRing } from 'lucide-react';

interface MeliSaleItem {
  id: string;
  productName: string;
  quantity: number;
  price: number;
}

interface MeliSale {
  id: string;
  folio: string;
  total: number;
  createdAt: string;
  buyerName: string;
  orderId: string;
  guideUrl: string | null;
  items: MeliSaleItem[];
}

export default function MeliSalesAlertPopup() {
  const [activeSale, setActiveSale] = useState<MeliSale | null>(null);

  const checkNewSales = async () => {
    try {
      const res = await fetch('/api/mercadolibre/notifications');
      if (!res.ok) return;
      const data = await res.json();
      const sales: MeliSale[] = data.sales || [];

      if (sales.length === 0) return;

      // Obtener ventas ya vistas desde localStorage
      let seenSales: string[] = [];
      try {
        const stored = localStorage.getItem('seenMeliSales');
        if (stored) {
          seenSales = JSON.parse(stored);
        }
      } catch (e) {}

      // Encontrar la venta más reciente que no hayamos visto
      const unseenSale = sales.find(s => !seenSales.includes(s.id));

      if (unseenSale) {
        setActiveSale(unseenSale);
        
        // Intentar reproducir sonido de notificación sutil
        try {
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-600.wav');
          audio.volume = 0.4;
          audio.play().catch(() => {});
        } catch (e) {}
      }
    } catch (err) {
      console.error('[MeliSalesAlertPopup] Error checking new sales:', err);
    }
  };

  useEffect(() => {
    // Primer chequeo a los 5 segundos de montar
    const initialTimer = setTimeout(checkNewSales, 5000);
    
    // Sondeo periódico cada 45 segundos
    const interval = setInterval(checkNewSales, 45000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, []);

  const handleDismiss = () => {
    if (!activeSale) return;

    // Guardar en localStorage como vista
    try {
      let seenSales: string[] = [];
      const stored = localStorage.getItem('seenMeliSales');
      if (stored) {
        seenSales = JSON.parse(stored);
      }
      if (!seenSales.includes(activeSale.id)) {
        seenSales.push(activeSale.id);
        localStorage.setItem('seenMeliSales', JSON.stringify(seenSales));
      }
    } catch (e) {}

    setActiveSale(null);
  };

  if (!activeSale) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      width: '380px',
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
      borderLeft: '6px solid #f59e0b',
      padding: '1.25rem',
      zIndex: 9999,
      animation: 'slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <style>{`
        @keyframes slideIn {
          from { transform: translateY(100px) scale(0.9); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }
      `}</style>

      {/* Cabecera del Popup */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#d97706' }}>
          <BellRing size={20} style={{ animation: 'bounce 1s infinite' }} />
          <span style={{ fontWeight: 'bold', fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            ¡Nueva Venta Online!
          </span>
        </div>
        <button 
          onClick={handleDismiss}
          style={{
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            padding: '2px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Descartar Alerta"
        >
          <X size={18} />
        </button>
      </div>

      {/* Info de Mercado Libre */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', padding: '0.4rem 0.6rem', backgroundColor: '#fffbeb', borderRadius: '6px', border: '1px solid #fef3c7' }}>
        <ShoppingBag size={16} color="#d97706" />
        <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#b45309' }}>
          Mercado Libre • Orden #{activeSale.orderId || 'Desconocida'}
        </span>
      </div>

      {/* Detalles del Comprador y Productos */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.5rem' }}>
          Comprador: <strong style={{ color: '#1e293b' }}>{activeSale.buyerName}</strong>
        </div>

        <div style={{ fontSize: '0.85rem', color: '#1e293b', borderTop: '1px solid #f1f5f9', paddingTop: '0.5rem' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '0.25rem', color: '#475569' }}>Productos:</div>
          <div style={{ maxHeight: '100px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {activeSale.items.map(item => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span>{item.quantity}x {item.productName}</span>
                <span style={{ color: '#64748b', fontWeight: '500' }}>${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Total */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem', marginBottom: '1rem' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#475569' }}>Total de la Venta:</span>
        <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#15803d' }}>
          ${activeSale.total.toFixed(2)}
        </span>
      </div>

      {/* Botones de acción */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        {activeSale.guideUrl ? (
          <a 
            href={activeSale.guideUrl} 
            target="_blank" 
            rel="noreferrer" 
            style={{
              flex: 1,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              backgroundColor: '#f59e0b',
              color: 'white',
              padding: '0.5rem',
              borderRadius: '6px',
              textDecoration: 'none',
              fontWeight: 'bold',
              fontSize: '0.85rem',
              boxShadow: '0 2px 4px rgba(245, 158, 11, 0.2)'
            }}
          >
            <Download size={14} /> Imprimir Guía
          </a>
        ) : (
          <div style={{
            flex: 1,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            backgroundColor: '#e2e8f0',
            color: '#64748b',
            padding: '0.5rem',
            borderRadius: '6px',
            fontSize: '0.8rem',
            fontWeight: '500'
          }}>
            Guía no requerida/disponible
          </div>
        )}

        <button 
          onClick={handleDismiss}
          style={{
            flex: 1,
            backgroundColor: '#1e293b',
            color: 'white',
            border: 'none',
            padding: '0.5rem',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '0.85rem',
            boxShadow: '0 2px 4px rgba(30, 41, 59, 0.2)'
          }}
        >
          Entendido
        </button>
      </div>
    </div>
  );
}
