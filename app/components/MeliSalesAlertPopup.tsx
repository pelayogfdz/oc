'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ShoppingBag, X, FileText, Download, BellRing, Store, 
  Globe, Truck, MapPin, CreditCard, Phone, Mail, ExternalLink, Printer 
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface OnlineSaleItem {
  id: string;
  productName: string;
  sku?: string;
  quantity: number;
  price: number;
  total: number;
  imageUrl?: string | null;
}

interface OnlineSale {
  id: string;
  folio: string;
  total: number;
  createdAt: string;
  channel: 'MERCADO_LIBRE' | 'B2C_WEB' | 'GOOGLE_PAY' | 'RAPPI' | 'UBER_EATS' | 'ONLINE_GENERIC';
  channelLabel: string;
  buyerName: string;
  buyerEmail?: string | null;
  buyerPhone?: string | null;
  deliveryMode: 'delivery' | 'pickup' | 'standard';
  deliveryAddress?: string | null;
  pickupCode?: string | null;
  orderId?: string | null;
  guideUrl?: string | null;
  notes?: string | null;
  paymentMethod?: string;
  items: OnlineSaleItem[];
}

export default function MeliSalesAlertPopup() {
  const [activeSale, setActiveSale] = useState<OnlineSale | null>(null);
  const [pendingSales, setPendingSales] = useState<OnlineSale[]>([]);

  const checkNewSales = async () => {
    try {
      const res = await fetch('/api/mercadolibre/notifications', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      const sales: OnlineSale[] = data.sales || [];

      if (sales.length === 0) return;

      // Obtener ventas ya vistas desde localStorage
      let seenSales: string[] = [];
      try {
        const stored = localStorage.getItem('seenOnlineSales') || localStorage.getItem('seenMeliSales');
        if (stored) {
          seenSales = JSON.parse(stored);
        }
      } catch (e) {}

      // Filtrar ventas no vistas
      const unseenSales = sales.filter(s => !seenSales.includes(s.id));

      if (unseenSales.length > 0) {
        setPendingSales(unseenSales);
        
        // Si no hay ninguna activa actualmente, activar la primera
        if (!activeSale || !unseenSales.some(s => s.id === activeSale.id)) {
          setActiveSale(unseenSales[0]);

          // Reproducir sonido de notificación
          try {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-600.wav');
            audio.volume = 0.5;
            audio.play().catch(() => {});
          } catch (e) {}
        }
      }
    } catch (err) {
      console.error('[OnlineSalesAlertPopup] Error al consultar nuevas ventas:', err);
    }
  };

  useEffect(() => {
    // Primer chequeo a los 3 segundos de montar
    const initialTimer = setTimeout(checkNewSales, 3000);
    
    // Sondeo periódico cada 30 segundos
    const interval = setInterval(checkNewSales, 30000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, []);

  const handleDismiss = (saleId?: string) => {
    const idToDismiss = saleId || activeSale?.id;
    if (!idToDismiss) return;

    // Guardar en localStorage como vista
    try {
      let seenSales: string[] = [];
      const stored = localStorage.getItem('seenOnlineSales') || localStorage.getItem('seenMeliSales');
      if (stored) {
        seenSales = JSON.parse(stored);
      }
      if (!seenSales.includes(idToDismiss)) {
        seenSales.push(idToDismiss);
        localStorage.setItem('seenOnlineSales', JSON.stringify(seenSales));
        localStorage.setItem('seenMeliSales', JSON.stringify(seenSales));
      }
    } catch (e) {}

    // Pasar a la siguiente venta no vista si existe
    const remaining = pendingSales.filter(s => s.id !== idToDismiss);
    setPendingSales(remaining);
    if (remaining.length > 0) {
      setActiveSale(remaining[0]);
    } else {
      setActiveSale(null);
    }
  };

  if (!activeSale) return null;

  // Estilos y badges según el canal
  const isMeli = activeSale.channel === 'MERCADO_LIBRE';
  const isGooglePay = activeSale.channel === 'GOOGLE_PAY';
  const isB2C = activeSale.channel === 'B2C_WEB' || activeSale.channel === 'ONLINE_GENERIC';

  const themeBorderColor = isMeli ? '#f59e0b' : isGooglePay ? '#6366f1' : '#10b981';
  const themeBgBadge = isMeli ? '#fffbeb' : isGooglePay ? '#eef2ff' : '#ecfdf5';
  const themeBorderBadge = isMeli ? '#fde68a' : isGooglePay ? '#c7d2fe' : '#a7f3d0';
  const themeTextBadge = isMeli ? '#b45309' : isGooglePay ? '#4338ca' : '#047857';

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      width: '420px',
      maxWidth: 'calc(100vw - 32px)',
      backgroundColor: '#ffffff',
      borderRadius: '16px',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0,0,0,0.05)',
      borderLeft: `6px solid ${themeBorderColor}`,
      padding: '1.25rem',
      zIndex: 99999,
      animation: 'slideInAlert 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
      fontFamily: 'var(--font-geist-sans), system-ui, -apple-system, sans-serif'
    }}>
      <style>{`
        @keyframes slideInAlert {
          from { transform: translateY(80px) scale(0.92); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes bellRingAlert {
          0%, 100% { transform: rotate(0); }
          20%, 60% { transform: rotate(15deg); }
          40%, 80% { transform: rotate(-15deg); }
        }
      `}</style>

      {/* Cabecera del Popup */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: themeBorderColor }}>
          <BellRing size={20} style={{ animation: 'bellRingAlert 1.5s infinite ease-in-out' }} />
          <span style={{ fontWeight: '800', fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {isMeli ? '¡Nueva Venta Mercado Libre!' : isGooglePay ? '¡Nueva Venta Google Pay!' : '¡Nueva Compra Web (B2C)!'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          {pendingSales.length > 1 && (
            <span style={{
              fontSize: '0.75rem',
              fontWeight: '700',
              backgroundColor: '#f1f5f9',
              color: '#475569',
              padding: '0.15rem 0.5rem',
              borderRadius: '999px'
            }}>
              1 de {pendingSales.length}
            </span>
          )}
          <button 
            onClick={() => handleDismiss()}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.15s'
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            title="Descartar Alerta"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Badge de Origen / Canal */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '0.85rem',
        padding: '0.45rem 0.75rem',
        backgroundColor: themeBgBadge,
        borderRadius: '8px',
        border: `1px solid ${themeBorderBadge}`
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          {isMeli ? <ShoppingBag size={16} color={themeTextBadge} /> : isGooglePay ? <CreditCard size={16} color={themeTextBadge} /> : <Globe size={16} color={themeTextBadge} />}
          <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: themeTextBadge }}>
            {activeSale.channelLabel}
          </span>
        </div>
        <span style={{ fontSize: '0.75rem', fontWeight: '600', color: themeTextBadge, opacity: 0.85 }}>
          Folio: {activeSale.folio}
        </span>
      </div>

      {/* Tarjeta del Comprador */}
      <div style={{ backgroundColor: '#f8fafc', padding: '0.65rem 0.75rem', borderRadius: '8px', marginBottom: '0.75rem', border: '1px solid #f1f5f9' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Comprador</span>
          {activeSale.paymentMethod && (
            <span style={{ fontSize: '0.7rem', color: '#475569', backgroundColor: '#e2e8f0', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 'bold' }}>
              {activeSale.paymentMethod}
            </span>
          )}
        </div>
        <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#0f172a' }}>
          {activeSale.buyerName}
        </div>
        {(activeSale.buyerPhone || activeSale.buyerEmail) && (
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.35rem', fontSize: '0.78rem', color: '#475569', flexWrap: 'wrap' }}>
            {activeSale.buyerPhone && (
              <a 
                href={`https://wa.me/${activeSale.buyerPhone.replace(/\D/g, '')}`} 
                target="_blank" 
                rel="noreferrer" 
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#059669', textDecoration: 'none', fontWeight: '600' }}
              >
                <Phone size={12} /> {activeSale.buyerPhone}
              </a>
            )}
            {activeSale.buyerEmail && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#64748b' }}>
                <Mail size={12} /> {activeSale.buyerEmail}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Modalidad de Entrega / Recolección */}
      {activeSale.pickupCode ? (
        <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '0.6rem 0.75rem', borderRadius: '8px', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#166534', fontSize: '0.8rem', fontWeight: '600' }}>
            <Store size={15} /> Recolección en Tienda
          </div>
          <div style={{ backgroundColor: '#15803d', color: 'white', padding: '0.2rem 0.5rem', borderRadius: '4px', fontFamily: 'monospace', fontWeight: 'bold', fontSize: '0.85rem' }}>
            {activeSale.pickupCode}
          </div>
        </div>
      ) : activeSale.deliveryAddress ? (
        <div style={{ backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', padding: '0.6rem 0.75rem', borderRadius: '8px', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#0369a1', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.2rem' }}>
            <Truck size={15} /> Envío a Domicilio
          </div>
          <div style={{ fontSize: '0.78rem', color: '#334155', lineHeight: '1.3' }}>
            {activeSale.deliveryAddress}
          </div>
        </div>
      ) : null}

      {/* Lista de Artículos */}
      <div style={{ marginBottom: '0.85rem' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '0.35rem', letterSpacing: '0.02em' }}>
          Artículos ({activeSale.items.reduce((sum, it) => sum + it.quantity, 0)} uds.)
        </div>
        <div style={{ maxHeight: '110px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.35rem', paddingRight: '0.25rem' }}>
          {activeSale.items.map((item, idx) => (
            <div key={item.id || idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', padding: '0.2rem 0', borderBottom: '1px solid #f8fafc' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '270px' }}>
                <span style={{ fontWeight: '700', color: '#0f172a' }}>{item.quantity}x</span>
                <span style={{ color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.productName}>
                  {item.productName}
                </span>
              </div>
              <span style={{ fontWeight: '600', color: '#475569', fontSize: '0.8rem', flexShrink: 0 }}>
                {formatCurrency(item.total || item.price * item.quantity)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Total a Pagar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '2px solid #f1f5f9', paddingTop: '0.65rem', marginBottom: '1rem' }}>
        <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#475569' }}>Total de la Venta:</span>
        <span style={{ fontSize: '1.35rem', fontWeight: '900', color: '#15803d' }}>
          {formatCurrency(activeSale.total)}
        </span>
      </div>

      {/* Botones de Acción */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <Link 
          href={`/ventas/detalle/${activeSale.id}`}
          onClick={() => handleDismiss()}
          style={{
            flex: 1,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem',
            backgroundColor: themeBorderColor,
            color: 'white',
            padding: '0.55rem 0.75rem',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: 'bold',
            fontSize: '0.85rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            minWidth: '110px'
          }}
        >
          <FileText size={15} /> Ver Detalle
        </Link>

        <a 
          href={`/ventas/detalle/${activeSale.id}/imprimir-ticket`}
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.35rem',
            backgroundColor: '#f1f5f9',
            color: '#334155',
            padding: '0.55rem 0.75rem',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: '600',
            fontSize: '0.85rem',
            border: '1px solid #cbd5e1'
          }}
          title="Imprimir Ticket de Venta"
        >
          <Printer size={15} /> Ticket
        </a>

        {activeSale.guideUrl && (
          <a 
            href={activeSale.guideUrl} 
            target="_blank" 
            rel="noreferrer" 
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.35rem',
              backgroundColor: '#f59e0b',
              color: 'white',
              padding: '0.55rem 0.75rem',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 'bold',
              fontSize: '0.85rem'
            }}
            title="Imprimir Guía de Envío"
          >
            <Download size={15} /> Guía
          </a>
        )}

        <button 
          onClick={() => handleDismiss()}
          style={{
            backgroundColor: '#1e293b',
            color: 'white',
            border: 'none',
            padding: '0.55rem 0.9rem',
            borderRadius: '8px',
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

