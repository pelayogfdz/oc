'use client';

import { useState, useEffect } from 'react';
import { 
  Search, FileText, Download, UserCircle, Briefcase, ChevronRight, 
  CheckCircle2, Star, Award, TrendingUp, Calendar, CreditCard, 
  ShoppingBag, ListFilter, Percent, Receipt, LogOut, ChevronDown, ChevronUp, AlertTriangle, Check, Loader2
} from 'lucide-react';
import { searchTicket, searchB2BInvoices, searchCustomerPortalData, generateInvoice } from '@/app/actions/portal';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { generateGoogleWalletPassUrl } from '@/app/actions/loyalty';


export default function PortalClient() {
  const searchParams = useSearchParams();
  const ticketIdParam = searchParams.get('ticketId') || searchParams.get('id') || '';

  const [tab, setTab] = useState<'b2c' | 'b2b' | 'loyalty'>('loyalty');
  const [ticketId, setTicketId] = useState('');
  const [rfc, setRfc] = useState('');
  const [emailOrPhone, setEmailOrPhone] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // B2C State
  const [sale, setSale] = useState<any>(null);
  const [isEnteringTaxData, setIsEnteringTaxData] = useState(false);
  
  // Tax Data Form
  const [taxData, setTaxData] = useState({
    legalName: '',
    rfc: '',
    taxRegime: '601',
    zipCode: '',
    cfdiUse: 'G03',
    email: '',
    phone: ''
  });
  
  // B2B State
  const [invoices, setInvoices] = useState<any[]>([]);
  const [b2bSearched, setB2bSearched] = useState(false);

  // Loyalty Portal State
  const [portalData, setPortalData] = useState<any>(null);
  const [expandedSale, setExpandedSale] = useState<string | null>(null);
  const [portalSubTab, setPortalSubTab] = useState<'purchases' | 'payments' | 'quotes' | 'favorites' | 'promos'>('purchases');
  const [generatingWallet, setGeneratingWallet] = useState(false);

  const handleGenerateWalletPass = async () => {
    if (!portalData?.customer?.id) return;
    setGeneratingWallet(true);
    const res = await generateGoogleWalletPassUrl(portalData.customer.id);
    setGeneratingWallet(false);
    if (res.success && res.url) {
      window.open(res.url, '_blank');
    } else {
      alert(res.error || 'Ocurrió un error al generar tu tarjeta de Google Wallet');
    }
  };


  useEffect(() => {
    if (ticketIdParam) {
      setTab('b2c');
      setTicketId(ticketIdParam);
      setError('');
      setLoading(true);
      searchTicket(ticketIdParam).then(result => {
        setLoading(false);
        if (result.error) {
          setError(result.error);
        } else if (result.sale) {
          setSale(result.sale);
          if (result.sale.customer) {
            setTaxData({
              legalName: result.sale.customer.legalName || result.sale.customer.name || '',
              rfc: result.sale.customer.taxId || '',
              taxRegime: result.sale.customer.taxRegime || ((result.sale.customer.taxId && result.sale.customer.taxId.length === 12) ? '601' : '605'),
              zipCode: result.sale.customer.zipCode || '',
              cfdiUse: result.sale.customer.cfdiUse || 'G03',
              email: result.sale.customer.email || '',
              phone: result.sale.customer.phone || ''
            });
          }
        }
      });
    }
  }, [ticketIdParam]);

  const handleSearchB2C = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketId.trim()) return;
    setError('');
    setLoading(true);
    const result = await searchTicket(ticketId.trim());
    setLoading(false);

    if (result.error) {
      setError(result.error);
      setSale(null);
    } else if (result.sale) {
      setSale(result.sale);
      setIsEnteringTaxData(false);
      if (result.sale.customer) {
        setTaxData({
          legalName: result.sale.customer.legalName || result.sale.customer.name || '',
          rfc: result.sale.customer.taxId || '',
          taxRegime: result.sale.customer.taxRegime || ((result.sale.customer.taxId && result.sale.customer.taxId.length === 12) ? '601' : '605'),
          zipCode: result.sale.customer.zipCode || '',
          cfdiUse: result.sale.customer.cfdiUse || 'G03',
          email: result.sale.customer.email || '',
          phone: result.sale.customer.phone || ''
        });
      }
    }
  };

  const handleSearchB2B = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rfc.trim()) return;
    setError('');
    setLoading(true);
    
    const result = await searchB2BInvoices(rfc.trim());
    setLoading(false);

    if (result.error) {
       setError(result.error);
    } else if (result.invoices) {
       setInvoices(result.invoices);
       setB2bSearched(true);
    }
  };

  const handleSearchLoyalty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrPhone.trim()) return;
    setError('');
    setLoading(true);
    
    const result = await searchCustomerPortalData(emailOrPhone.trim());
    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else if (result.success) {
      setPortalData(result);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '4rem auto', padding: '0 1rem', fontFamily: 'var(--font-geist-sans)' }}>
      
      {/* Header Premium */}
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
         <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '80px', height: '80px', borderRadius: '20px', backgroundColor: 'var(--caanma-primary)', marginBottom: '1.5rem', boxShadow: '0 10px 25px -5px rgba(22, 163, 74, 0.4)' }}>
           <FileText color="white" size={40} />
         </div>
         <h1 style={{ fontSize: '2.5rem', fontWeight: '900', color: 'var(--caanma-text)', letterSpacing: '-1px' }}>
           Portal de Clientes CAANMA
         </h1>
         <p style={{ color: 'var(--caanma-text-muted)', fontSize: '1.1rem', maxWidth: '600px', margin: '0.5rem auto' }}>
           Tu espacio para consultar puntos de fidelidad, historial de compras, cotizaciones y comprobantes fiscales.
         </p>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid var(--caanma-border)', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        
        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--caanma-border)' }}>
          <button 
            onClick={() => { setTab('loyalty'); setError(''); setPortalData(null); }}
            style={{ flex: 1, padding: '1.25rem', backgroundColor: tab === 'loyalty' ? 'white' : '#f8fafc', border: 'none', borderBottom: tab === 'loyalty' ? '3px solid var(--caanma-primary)' : '3px solid transparent', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', display: 'flex', justifyContent: 'center', gap: '0.5rem', alignItems: 'center', color: tab === 'loyalty' ? 'var(--caanma-primary)' : 'var(--caanma-text-muted)', transition: 'all 0.2s' }}
          >
            <Star size={20} fill={tab === 'loyalty' ? 'var(--caanma-primary)' : 'transparent'} /> Mi Espacio Cliente (Puntos)
          </button>
          <button 
            onClick={() => { setTab('b2c'); setError(''); setSale(null); }}
            style={{ flex: 1, padding: '1.25rem', backgroundColor: tab === 'b2c' ? 'white' : '#f8fafc', border: 'none', borderBottom: tab === 'b2c' ? '3px solid var(--caanma-primary)' : '3px solid transparent', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', display: 'flex', justifyContent: 'center', gap: '0.5rem', alignItems: 'center', color: tab === 'b2c' ? 'var(--caanma-primary)' : 'var(--caanma-text-muted)', transition: 'all 0.2s' }}
          >
            <UserCircle size={20} /> Facturar un Ticket
          </button>
          <button 
             onClick={() => { setTab('b2b'); setError(''); setB2bSearched(false); }}
             style={{ flex: 1, padding: '1.25rem', backgroundColor: tab === 'b2b' ? 'white' : '#f8fafc', border: 'none', borderBottom: tab === 'b2b' ? '3px solid var(--caanma-primary)' : '3px solid transparent', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', display: 'flex', justifyContent: 'center', gap: '0.5rem', alignItems: 'center', color: tab === 'b2b' ? 'var(--caanma-primary)' : 'var(--caanma-text-muted)', transition: 'all 0.2s' }}
          >
            <Briefcase size={20} /> Soy Cliente Mayorista (B2B)
          </button>
        </div>

        <div style={{ padding: '2.5rem' }}>
          
          {/* TAB 1: LOYALTY PORTAL (Mi Espacio Cliente) */}
          {tab === 'loyalty' && (
            <div>
              {!portalData ? (
                <div style={{ maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Ingresa a tu Espacio Cliente</h2>
                  <p style={{ color: 'var(--caanma-text-muted)', marginBottom: '2rem' }}>
                    Introduce el correo electrónico o teléfono registrado en tu cuenta para ver tus puntos, vigencia y compras.
                  </p>
                  <form onSubmit={handleSearchLoyalty} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <input 
                      type="text" 
                      value={emailOrPhone}
                      onChange={e => setEmailOrPhone(e.target.value)}
                      placeholder="Correo o Teléfono registrado" 
                      required
                      style={{ padding: '1rem', borderRadius: '8px', border: '2px solid var(--caanma-border)', fontSize: '1.25rem', textAlign: 'center', fontWeight: 'bold' }} 
                    />
                    <button disabled={loading} type="submit" className="btn-primary" style={{ padding: '1rem', fontSize: '1.1rem', borderRadius: '8px', border: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
                      {loading ? 'Cargando datos...' : 'Ingresar al Portal'}
                    </button>
                    {error && <div style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '0.9rem', marginTop: '0.5rem' }}>{error}</div>}
                  </form>
                </div>
              ) : (
                <div>
                  {/* Logged in Header Banner */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--caanma-border)', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
                    <div>
                      <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--caanma-primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Portal del Cliente</span>
                      <h2 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#0f172a', marginTop: '0.25rem' }}>
                        ¡Hola, {portalData.customer.name}! 👋
                      </h2>
                      <p style={{ color: 'var(--caanma-text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                        Sucursal asignada: <strong>{portalData.customer.branch?.name || 'Central'}</strong>
                      </p>
                    </div>
                    <button 
                      onClick={() => setPortalData(null)}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.5rem 1rem', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: 'transparent', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold', color: '#64748b' }}
                    >
                      <LogOut size={16} /> Salir
                    </button>
                  </div>

                  {/* Financial & Loyalty Cards Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                    
                    {/* Loyalty Points Card */}
                    <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
                      <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a', flexShrink: 0 }}>
                        <Award size={36} fill="#16a34a" />
                      </div>
                      <div>
                        <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tus Puntos de Fidelidad</span>
                        <div style={{ fontSize: '2.25rem', fontWeight: '900', color: '#14532d', margin: '0.1rem 0' }}>
                          {portalData.customer.pointsBalance || 0} <span style={{ fontSize: '1rem', fontWeight: 'normal', color: '#166534' }}>pts</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#15803d', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
                          <Calendar size={14} /> 
                          {portalData.customer.pointsExpiryDate 
                            ? `Vence: ${new Date(portalData.customer.pointsExpiryDate).toLocaleDateString()}` 
                            : 'Puntos sin vencimiento'}
                        </div>
                        {portalData.googleWalletEnabled && (
                          <div style={{ marginTop: '0.75rem' }}>
                            <button 
                              onClick={handleGenerateWalletPass}
                              disabled={generatingWallet}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                backgroundColor: '#000000',
                                color: '#ffffff',
                                border: '1px solid #5f6368',
                                borderRadius: '8px',
                                padding: '0.4rem 0.8rem',
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                                fontWeight: '500',
                                height: '36px',
                                boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px 0 rgba(0,0,0,0.06)',
                                transition: 'background-color 0.2s'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1f1f1f'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#000000'}
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M19.5 4H4.5A2.5 2.5 0 002 6.5v11A2.5 2.5 0 004.5 20h15a2.5 2.5 0 002.5-2.5v-11A2.5 2.5 0 0019.5 4z" fill="#4285F4"/>
                                <path d="M22 6.5v11c0 .4-.1.8-.3 1.1L16 12l5.7-5.7c.2.3.3.7.3 1.1z" fill="#34A853"/>
                                <path d="M19.5 20H4.5c-.4 0-.8-.1-1.1-.3L9 14h6l5.6 5.7c-.3.2-.7.3-1.1.3z" fill="#EA4335"/>
                                <path d="M2 17.5v-11c0-.4.1-.8.3-1.1L8 11l-5.7 5.7c-.2-.3-.3-.7-.3-1.1z" fill="#FBBC05"/>
                                <path d="M10 9h4v2h-4V9z" fill="#FFF"/>
                              </svg>
                              <span>{generatingWallet ? 'Generando...' : 'Añadir a Google Wallet'}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>


                    {/* Store Credit (Saldo a Favor) */}
                    <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', flexShrink: 0 }}>
                        <CreditCard size={32} />
                      </div>
                      <div>
                        <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Saldo a Favor (Crédito Tienda)</span>
                        <div style={{ fontSize: '2rem', fontWeight: '900', color: '#1e3a8a', margin: '0.1rem 0' }}>
                          {formatCurrency(portalData.customer.storeCredit || 0)}
                        </div>
                        <span style={{ fontSize: '0.75rem', color: '#1e40af' }}>Disponible para tus siguientes compras.</span>
                      </div>
                    </div>

                    {/* B2B Credit Limits (If B2B credit is configured) */}
                    {(portalData.customer.creditLimit > 0) && (
                      <div style={{ backgroundColor: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '12px', padding: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#ffedd5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ea580c', flexShrink: 0 }}>
                          <TrendingUp size={32} />
                        </div>
                        <div>
                          <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#c2410c', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Línea de Crédito Autorizada</span>
                          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#7c2d12', margin: '0.1rem 0' }}>
                            {formatCurrency(portalData.customer.creditBalance)} / {formatCurrency(portalData.customer.creditLimit)}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#9a3412', marginTop: '0.25rem' }}>
                            Crédito disponible: <strong>{formatCurrency(portalData.customer.creditLimit - portalData.customer.creditBalance)}</strong> • Plazo: {portalData.customer.creditDays} días.
                          </div>
                        </div>
                      </div>
                    )}

                  </div>

                  {/* Customer Portal Sub-navigation */}
                  <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', gap: '1rem', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
                    {[
                      { id: 'purchases', label: '🛒 Mis Compras', icon: <ShoppingBag size={16} /> },
                      { id: 'payments', label: '💵 Mis Pagos', icon: <Receipt size={16} /> },
                      { id: 'quotes', label: '📝 Cotizaciones', icon: <FileText size={16} /> },
                      { id: 'favorites', label: '💖 Mis Favoritos', icon: <Star size={16} /> },
                      { id: 'promos', label: '🎁 Promociones', icon: <Percent size={16} /> }
                    ].map(subTab => (
                      <button
                        key={subTab.id}
                        onClick={() => setPortalSubTab(subTab.id as any)}
                        style={{
                          padding: '0.5rem 1rem',
                          background: 'transparent',
                          border: 'none',
                          borderBottom: portalSubTab === subTab.id ? '3px solid var(--caanma-primary)' : '3px solid transparent',
                          color: portalSubTab === subTab.id ? 'var(--caanma-primary)' : '#64748b',
                          fontWeight: portalSubTab === subTab.id ? 'bold' : '500',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          fontSize: '0.9rem',
                          whiteSpace: 'nowrap',
                          transition: 'all 0.15s'
                        }}
                      >
                        {subTab.icon}
                        {subTab.label}
                      </button>
                    ))}
                  </div>

                  {/* SUBTAB 1: PURCHASES */}
                  {portalSubTab === 'purchases' && (
                    <div style={{ border: '1px solid var(--caanma-border)', borderRadius: '10px', overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--caanma-border)' }}>
                            <th style={{ padding: '0.75rem 1rem', color: '#64748b', fontSize: '0.85rem', fontWeight: 'bold' }}>Folio</th>
                            <th style={{ padding: '0.75rem 1rem', color: '#64748b', fontSize: '0.85rem', fontWeight: 'bold' }}>Fecha</th>
                            <th style={{ padding: '0.75rem 1rem', color: '#64748b', fontSize: '0.85rem', fontWeight: 'bold' }}>Método de Pago</th>
                            <th style={{ padding: '0.75rem 1rem', color: '#64748b', fontSize: '0.85rem', fontWeight: 'bold' }}>Estado</th>
                            <th style={{ padding: '0.75rem 1rem', color: '#64748b', fontSize: '0.85rem', fontWeight: 'bold', textAlign: 'right' }}>Total</th>
                            <th style={{ padding: '0.75rem 1rem', color: '#64748b', fontSize: '0.85rem', fontWeight: 'bold', width: '50px' }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {portalData.sales.map((sale: any) => {
                            const isExpanded = expandedSale === sale.id;
                            const shortId = sale.id.slice(-6).toUpperCase();
                            const isCredit = sale.paymentMethod === 'CREDIT';
                            const isMixto = sale.paymentMethod === 'MIXTO';
                            return (
                              <>
                                <tr key={sale.id} className="hover:bg-slate-50 transition-colors" style={{ borderBottom: '1px solid var(--caanma-border)' }}>
                                  <td style={{ padding: '1rem', fontWeight: 'bold', color: 'var(--caanma-primary)' }}>#{shortId}</td>
                                  <td style={{ padding: '1rem' }}>{new Date(sale.createdAt).toLocaleDateString()}</td>
                                  <td style={{ padding: '1rem', fontWeight: 'bold', fontSize: '0.85rem', color: '#475569' }}>
                                    {isCredit ? '💳 A Crédito' : (isMixto ? '⚡ Mixto' : '💵 Contado')}
                                  </td>
                                  <td style={{ padding: '1rem' }}>
                                    <span style={{
                                      padding: '0.2rem 0.5rem',
                                      borderRadius: '4px',
                                      fontSize: '0.75rem',
                                      fontWeight: 'bold',
                                      backgroundColor: sale.status === 'COMPLETED' ? '#dcfce7' : (sale.status === 'REFUNDED' ? '#fee2e2' : '#fef3c7'),
                                      color: sale.status === 'COMPLETED' ? '#15803d' : (sale.status === 'REFUNDED' ? '#b91c1c' : '#b45309')
                                    }}>
                                      {sale.status === 'COMPLETED' ? 'Completado' : (sale.status === 'REFUNDED' ? 'Devuelto' : 'Pendiente')}
                                    </span>
                                  </td>
                                  <td style={{ padding: '1rem', fontWeight: 'bold', textAlign: 'right' }}>{formatCurrency(sale.total)}</td>
                                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                                    <button 
                                      onClick={() => setExpandedSale(isExpanded ? null : sale.id)}
                                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                                    >
                                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                    </button>
                                  </td>
                                </tr>
                                {isExpanded && (
                                  <tr style={{ backgroundColor: '#f8fafc' }}>
                                    <td colSpan={6} style={{ padding: '1rem 2rem' }}>
                                      <div style={{ borderLeft: '3px solid var(--caanma-primary)', paddingLeft: '1rem' }}>
                                        <h5 style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#334155', marginBottom: '0.5rem' }}>Artículos Adquiridos:</h5>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                          {sale.items.map((item: any) => (
                                            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#64748b' }}>
                                              <span>{item.product?.name} <strong style={{ color: '#0f172a' }}>x{item.quantity}</strong></span>
                                              <span style={{ fontWeight: '500' }}>{formatCurrency(item.quantity * item.price)}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </>
                            );
                          })}
                          {portalData.sales.length === 0 && (
                            <tr>
                              <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                                No se encontraron registros de compras.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* SUBTAB 2: PAYMENTS */}
                  {portalSubTab === 'payments' && (
                    <div style={{ border: '1px solid var(--caanma-border)', borderRadius: '10px', overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--caanma-border)' }}>
                            <th style={{ padding: '0.75rem 1rem', color: '#64748b', fontSize: '0.85rem', fontWeight: 'bold' }}>Fecha</th>
                            <th style={{ padding: '0.75rem 1rem', color: '#64748b', fontSize: '0.85rem', fontWeight: 'bold' }}>Concepto / Razón</th>
                            <th style={{ padding: '0.75rem 1rem', color: '#64748b', fontSize: '0.85rem', fontWeight: 'bold', textAlign: 'right' }}>Monto</th>
                            <th style={{ padding: '0.75rem 1rem', color: '#64748b', fontSize: '0.85rem', fontWeight: 'bold', textAlign: 'right' }}>Factura Timbrada</th>
                          </tr>
                        </thead>
                        <tbody>
                          {portalData.payments.map((p: any) => (
                            <tr key={p.id} style={{ borderBottom: '1px solid var(--caanma-border)' }}>
                              <td style={{ padding: '1rem', fontSize: '0.85rem' }}>{new Date(p.createdAt).toLocaleDateString()}</td>
                              <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#475569' }}>{p.reason || 'Abono / Pago de Cuenta'}</td>
                              <td style={{ padding: '1rem', fontWeight: 'bold', textAlign: 'right', color: '#16a34a' }}>{formatCurrency(p.amount)}</td>
                              <td style={{ padding: '1rem', textAlign: 'right' }}>
                                {p.cfdiStatus === 'STAMPED' ? (
                                  <span style={{ fontSize: '0.75rem', fontWeight: 'bold', backgroundColor: '#dcfce7', color: '#15803d', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                                    Timbrada ✓
                                  </span>
                                ) : (
                                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>N/A</span>
                                )}
                              </td>
                            </tr>
                          ))}
                          {portalData.payments.length === 0 && (
                            <tr>
                              <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                                No se registran abonos o pagos a tu nombre.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* SUBTAB 3: QUOTES */}
                  {portalSubTab === 'quotes' && (
                    <div style={{ border: '1px solid var(--caanma-border)', borderRadius: '10px', overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--caanma-border)' }}>
                            <th style={{ padding: '0.75rem 1rem', color: '#64748b', fontSize: '0.85rem', fontWeight: 'bold' }}>Folio</th>
                            <th style={{ padding: '0.75rem 1rem', color: '#64748b', fontSize: '0.85rem', fontWeight: 'bold' }}>Fecha</th>
                            <th style={{ padding: '0.75rem 1rem', color: '#64748b', fontSize: '0.85rem', fontWeight: 'bold' }}>Artículos</th>
                            <th style={{ padding: '0.75rem 1rem', color: '#64748b', fontSize: '0.85rem', fontWeight: 'bold' }}>Estado</th>
                            <th style={{ padding: '0.75rem 1rem', color: '#64748b', fontSize: '0.85rem', fontWeight: 'bold', textAlign: 'right' }}>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {portalData.quotes.map((q: any) => (
                            <tr key={q.id} style={{ borderBottom: '1px solid var(--caanma-border)' }}>
                              <td style={{ padding: '1rem', fontWeight: 'bold' }}>#{q.id.slice(-6).toUpperCase()}</td>
                              <td style={{ padding: '1rem' }}>{new Date(q.createdAt).toLocaleDateString()}</td>
                              <td style={{ padding: '1rem', fontSize: '0.85rem', color: '#475569', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {q.items.map((i: any) => i.product?.name).join(', ')}
                              </td>
                              <td style={{ padding: '1rem' }}>
                                <span style={{
                                  padding: '0.2rem 0.5rem',
                                  borderRadius: '4px',
                                  fontSize: '0.75rem',
                                  fontWeight: 'bold',
                                  backgroundColor: q.status === 'CONVERTED' ? '#eff6ff' : '#fef3c7',
                                  color: q.status === 'CONVERTED' ? '#1d4ed8' : '#d97706'
                                }}>
                                  {q.status === 'CONVERTED' ? 'Vendido' : 'Vigente'}
                                </span>
                              </td>
                              <td style={{ padding: '1rem', fontWeight: 'bold', textAlign: 'right' }}>{formatCurrency(q.total)}</td>
                            </tr>
                          ))}
                          {portalData.quotes.length === 0 && (
                            <tr>
                              <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                                No cuentas con cotizaciones registradas.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* SUBTAB 4: FAVORITES */}
                  {portalSubTab === 'favorites' && (
                    <div style={{ border: '1px solid var(--caanma-border)', borderRadius: '10px', overflow: 'hidden' }}>
                      <div style={{ padding: '1.5rem', backgroundColor: '#f8fafc', borderBottom: '1px solid var(--caanma-border)' }}>
                        <h4 style={{ fontWeight: 'bold', fontSize: '0.95rem', color: '#334155' }}>Tus Favoritos (Más Comprados)</h4>
                        <p style={{ color: 'var(--caanma-text-muted)', fontSize: '0.8rem', marginTop: '0.2rem' }}>Estos son los artículos que compras con mayor regularidad en nuestras sucursales.</p>
                      </div>
                      
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#ffffff', borderBottom: '1px solid var(--caanma-border)' }}>
                            <th style={{ padding: '0.75rem 1.5rem', color: '#64748b', fontSize: '0.85rem', fontWeight: 'bold' }}>SKU</th>
                            <th style={{ padding: '0.75rem 1.5rem', color: '#64748b', fontSize: '0.85rem', fontWeight: 'bold' }}>Producto</th>
                            <th style={{ padding: '0.75rem 1.5rem', color: '#64748b', fontSize: '0.85rem', fontWeight: 'bold', textAlign: 'center' }}>Unidades Compradas</th>
                            <th style={{ padding: '0.75rem 1.5rem', color: '#64748b', fontSize: '0.85rem', fontWeight: 'bold', textAlign: 'right' }}>Total Consolidado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {portalData.favoriteProducts.map((p: any, idx: number) => (
                            <tr key={idx} style={{ borderBottom: '1px solid var(--caanma-border)' }}>
                              <td style={{ padding: '1rem 1.5rem', fontWeight: 'bold', fontSize: '0.85rem', color: '#64748b' }}>{p.sku}</td>
                              <td style={{ padding: '1rem 1.5rem', fontWeight: 'bold', color: '#0f172a' }}>{p.name}</td>
                              <td style={{ padding: '1rem 1.5rem', textAlign: 'center', fontWeight: 'bold', color: 'var(--caanma-primary)', fontSize: '1.1rem' }}>{p.quantity}</td>
                              <td style={{ padding: '1rem 1.5rem', fontWeight: 'bold', textAlign: 'right' }}>{formatCurrency(p.totalSpent)}</td>
                            </tr>
                          ))}
                          {portalData.favoriteProducts.length === 0 && (
                            <tr>
                              <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                                Aún no has realizado suficientes compras para calcular tus productos favoritos.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* SUBTAB 5: PROMOTIONS */}
                  {portalSubTab === 'promos' && (
                    <div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                        {portalData.promotions.map((promo: any) => (
                          <div key={promo.id} style={{ border: '1px solid #fed7aa', borderRadius: '12px', padding: '1.5rem', backgroundColor: '#fff7ed', display: 'flex', flexDirection: 'column', gap: '0.75rem', position: 'relative' }}>
                            <div style={{ position: 'absolute', top: '1rem', right: '1rem', backgroundColor: '#ea580c', color: 'white', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                              OFERTA EXCLUSIVA
                            </div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#7c2d12', marginTop: '0.5rem' }}>{promo.name}</div>
                            <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#ea580c' }}>
                              {promo.type === 'PERCENTAGE' ? `${promo.value}%` : formatCurrency(promo.value)}
                              <span style={{ fontSize: '1rem', fontWeight: 'normal', color: '#9a3412', marginLeft: '0.25rem' }}>de descuento</span>
                            </div>
                            <span style={{ fontSize: '0.8rem', color: '#9a3412' }}>Válido únicamente en tu sucursal de registro.</span>
                          </div>
                        ))}
                        {portalData.promotions.length === 0 && (
                          <div style={{ gridColumn: '1 / -1', padding: '3rem', textAlign: 'center', border: '1px dashed var(--caanma-border)', borderRadius: '12px', color: '#94a3b8', fontStyle: 'italic', backgroundColor: '#f8fafc' }}>
                            No hay promociones especiales disponibles para tu sucursal en este momento. ¡Vuelve pronto!
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>
          )}

          {/* TAB 2: B2C Ticket Invoicing */}
          {tab === 'b2c' && (
             <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                {!sale ? (
                  <div style={{ textAlign: 'center', maxWidth: '500px', margin: '0 auto' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Identifica tu compra</h2>
                    <p style={{ color: 'var(--caanma-text-muted)', marginBottom: '2rem' }}>
                      Ingresa el folio de la venta que aparece en la parte inferior de tu ticket impreso.
                    </p>
                    <form onSubmit={handleSearchB2C} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <input 
                        type="text" 
                        value={ticketId}
                        onChange={e => setTicketId(e.target.value)}
                        placeholder="Ej. A4F2C9" 
                        required
                        style={{ padding: '1.25rem', borderRadius: '8px', border: '2px solid var(--caanma-border)', fontSize: '1.5rem', textAlign: 'center', fontWeight: 'bold', letterSpacing: '2px', textTransform: 'uppercase' }} 
                      />
                      <button disabled={loading} type="submit" className="btn-primary" style={{ padding: '1rem', fontSize: '1.1rem', borderRadius: '8px', border: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
                        {loading ? 'Buscando...' : <><Search size={20} /> Buscar Ticket</>}
                      </button>
                      {error && <div style={{ color: '#ef4444', fontWeight: 'bold', marginTop: '0.5rem' }}>{error}</div>}
                    </form>
                  </div>
                ) : sale.invoiceId ? (
                  /* Already Invoiced View */
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#16a34a', fontWeight: 'bold', fontSize: '1.25rem', marginBottom: '1.5rem', justifyContent: 'center' }}>
                      <CheckCircle2 size={28} /> ¡Ticket Facturado Exitosamente!
                    </div>
                    <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--caanma-border)', marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                       <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--caanma-text-muted)' }}>Folio:</span>
                          <span style={{ fontWeight: 'bold' }}>#{sale.folio || sale.id.slice(-6).toUpperCase()}</span>
                       </div>
                       <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--caanma-text-muted)' }}>Receptor Fiscal:</span>
                          <span style={{ fontWeight: 'bold' }}>{sale.customer?.legalName || sale.customer?.name}</span>
                       </div>
                       <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--caanma-text-muted)' }}>RFC:</span>
                          <span style={{ fontWeight: 'bold' }}>{sale.customer?.taxId}</span>
                       </div>
                       <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--caanma-text-muted)' }}>UUID Factura (SAT):</span>
                          <span style={{ fontWeight: 'bold', fontSize: '0.85rem', fontFamily: 'monospace' }}>{sale.invoiceId}</span>
                       </div>
                       <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--caanma-border)' }}>
                          <span>Total:</span>
                          <span style={{ fontWeight: 'bold', color: 'var(--caanma-primary)' }}>{formatCurrency(sale.total)}</span>
                       </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                      <a 
                        href={`/api/facturacion/download?invoiceId=${sale.invoiceId}&format=pdf`}
                        style={{ flex: 1, padding: '1rem', backgroundColor: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: '8px', fontWeight: 'bold', textDecoration: 'none', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '1.1rem' }}
                      >
                        <Download size={20} /> Descargar PDF
                      </a>
                      <a 
                        href={`/api/facturacion/download?invoiceId=${sale.invoiceId}&format=xml`}
                        style={{ flex: 1, padding: '1rem', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: 'bold', textDecoration: 'none', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '1.1rem' }}
                      >
                        <Download size={20} /> Descargar XML
                      </a>
                    </div>

                    <button 
                      onClick={() => { setSale(null); setTicketId(''); }}
                      style={{ width: '100%', padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: 'transparent', cursor: 'pointer', fontWeight: 'bold', color: '#64748b' }}
                    >
                      Facturar otro ticket
                    </button>
                  </div>
                ) : !isEnteringTaxData ? (
                  /* Ticket Found, Show Preview and prompt for tax data */
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#16a34a', fontWeight: 'bold', fontSize: '1.25rem', marginBottom: '1.5rem', justifyContent: 'center' }}>
                      <CheckCircle2 size={28} /> Ticket Encontrado
                    </div>
                    <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px dashed var(--caanma-border)', marginBottom: '2rem' }}>
                       <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <span style={{ color: 'var(--caanma-text-muted)' }}>Folio:</span>
                          <span style={{ fontWeight: 'bold' }}>#{sale.folio || sale.id.slice(-6).toUpperCase()}</span>
                       </div>
                       <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <span style={{ color: 'var(--caanma-text-muted)' }}>Fecha:</span>
                          <span style={{ fontWeight: 'bold' }}>{new Date(sale.createdAt).toLocaleDateString()}</span>
                       </div>
                       <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.5rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '2px solid var(--caanma-border)' }}>
                          <span>Total:</span>
                          <span style={{ fontWeight: 'bold', color: 'var(--caanma-text)' }}>{formatCurrency(sale.total)}</span>
                       </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <button 
                        onClick={() => { setSale(null); setTicketId(''); }}
                        style={{ flex: 1, padding: '1rem', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: 'transparent', cursor: 'pointer', fontWeight: 'bold', color: '#64748b' }}
                      >
                        Atrás
                      </button>
                      <button 
                        onClick={() => setIsEnteringTaxData(true)}
                        className="btn-primary" 
                        style={{ flex: 2, padding: '1rem', borderRadius: '8px', fontSize: '1.1rem', display: 'flex', justifyContent: 'center', gap: '0.5rem', border: 'none', cursor: 'pointer' }}
                      >
                        Ingresar Datos Fiscales <ChevronRight size={20} />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Enter Tax Data Form */
                  <div style={{ textAlign: 'left' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem', color: '#0f172a' }}>Datos de Facturación Fiscal</h3>
                    
                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      if (!taxData.legalName || !taxData.rfc || !taxData.zipCode || !taxData.email) {
                        alert("Por favor completa los campos obligatorios: Razón Social, RFC, CP y Correo Electrónico.");
                        return;
                      }
                      
                      setLoading(true);
                      setError('');
                      try {
                        const res = await generateInvoice(sale.id, taxData);
                        if (res.error) {
                          setError(res.error);
                        } else if (res.success) {
                          // Update sale state with the invoice ID and updated customer details
                          setSale((prev: any) => ({
                            ...prev,
                            invoiceId: res.invoiceId,
                            customer: {
                              legalName: taxData.legalName,
                              taxId: taxData.rfc
                            }
                          }));
                        }
                      } catch (err: any) {
                        setError(err.message || "Error al emitir la factura.");
                      } finally {
                        setLoading(false);
                      }
                    }} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#475569' }}>Razón Social / Nombre Completo *</label>
                        <input 
                          type="text" 
                          placeholder="Ej. Distribuidora del Bajío S.A. de C.V."
                          value={taxData.legalName}
                          onChange={e => setTaxData(prev => ({ ...prev, legalName: e.target.value }))}
                          required
                          style={{ padding: '0.65rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem' }}
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#475569' }}>RFC *</label>
                          <input 
                            type="text" 
                            placeholder="RFC a 12 o 13 caracteres"
                            value={taxData.rfc}
                            onChange={e => {
                              const newRfc = e.target.value.toUpperCase().replace(/[^A-Z0-9&]/g, '');
                              setTaxData(prev => {
                                let newRegime = prev.taxRegime;
                                if (newRfc.length === 13 && (prev.taxRegime === '601' || prev.taxRegime === '603')) {
                                  newRegime = '605';
                                } else if (newRfc.length === 12 && (prev.taxRegime !== '601' && prev.taxRegime !== '603')) {
                                  newRegime = '601';
                                }
                                return { ...prev, rfc: newRfc, taxRegime: newRegime };
                              });
                            }}
                            required
                            style={{ padding: '0.65rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem' }}
                          />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#475569' }}>Código Postal *</label>
                          <input 
                            type="text" 
                            placeholder="Ej. 76000"
                            value={taxData.zipCode}
                            onChange={e => setTaxData(prev => ({ ...prev, zipCode: e.target.value }))}
                            required
                            style={{ padding: '0.65rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem' }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#475569' }}>Régimen Fiscal *</label>
                          <select 
                            value={taxData.taxRegime}
                            onChange={e => setTaxData(prev => ({ ...prev, taxRegime: e.target.value }))}
                            style={{ padding: '0.65rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem', backgroundColor: 'white' }}
                          >
                            <option value="601">General de Ley Personas Morales (601)</option>
                            <option value="603">Personas Morales con Fines no Lucrativos (603)</option>
                            <option value="605">Sueldos y Salarios (605)</option>
                            <option value="606">Arrendamiento (606)</option>
                            <option value="612">Actividades Empresariales y Profesionales (612)</option>
                            <option value="616">Sin obligaciones fiscales (616)</option>
                            <option value="621">Incorporación Fiscal (621)</option>
                            <option value="626">RESICO (626)</option>
                          </select>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#475569' }}>Uso de CFDI *</label>
                          <select 
                            value={taxData.cfdiUse}
                            onChange={e => setTaxData(prev => ({ ...prev, cfdiUse: e.target.value }))}
                            style={{ padding: '0.65rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem', backgroundColor: 'white' }}
                          >
                            <option value="G01">Adquisición de mercancías (G01)</option>
                            <option value="G03">Gastos en general (G03)</option>
                            <option value="I01">Construcciones (I01)</option>
                            <option value="I02">Mobiliario y equipo de oficina (I02)</option>
                            <option value="I03">Equipo de transporte (I03)</option>
                            <option value="I04">Equipo de cómputo y accesorios (I04)</option>
                            <option value="I08">Otra maquinaria y equipo (I08)</option>
                            <option value="D01">Honorarios médicos y dentales (D01)</option>
                            <option value="D02">Gastos médicos por incapacidad (D02)</option>
                            <option value="S01">Sin efectos fiscales (S01)</option>
                            <option value="CP01">Pagos (CP01)</option>
                          </select>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#475569' }}>Correo Electrónico * (Para envío)</label>
                          <input 
                            type="email" 
                            placeholder="cliente@correo.com"
                            value={taxData.email}
                            onChange={e => setTaxData(prev => ({ ...prev, email: e.target.value }))}
                            required
                            style={{ padding: '0.65rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem' }}
                          />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#475569' }}>Teléfono</label>
                          <input 
                            type="tel" 
                            placeholder="10 dígitos"
                            value={taxData.phone}
                            onChange={e => setTaxData(prev => ({ ...prev, phone: e.target.value }))}
                            style={{ padding: '0.65rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem' }}
                          />
                        </div>
                      </div>

                      {error && (
                        <div style={{ padding: '0.75rem', backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#b91c1c', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <AlertTriangle size={16} />
                          <span>{error}</span>
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        <button 
                          type="button" 
                          onClick={() => setIsEnteringTaxData(false)}
                          disabled={loading}
                          style={{ flex: 1, padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: 'transparent', cursor: 'pointer', fontWeight: 'bold', color: '#64748b' }}
                        >
                          Atrás
                        </button>
                        <button 
                          type="submit"
                          disabled={loading}
                          className="btn-primary" 
                          style={{ flex: 2, padding: '0.75rem', borderRadius: '8px', fontSize: '1rem', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', border: 'none', cursor: 'pointer' }}
                        >
                          {loading ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
                          {loading ? 'Generando CFDI...' : 'Emitir Factura SAT'}
                        </button>
                      </div>

                    </form>
                  </div>
                )}
             </div>
          )}

          {/* TAB 3: B2B RFC Invoicing */}
          {tab === 'b2b' && (
             <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                {!b2bSearched ? (
                  <div style={{ textAlign: 'center' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Accede a tus Facturas</h2>
                    <p style={{ color: 'var(--caanma-text-muted)', marginBottom: '2rem' }}>
                      Ingresa tu RFC asociado a tu cuenta de cliente mayorista para ver tu historial de CFDI.
                    </p>
                    <form onSubmit={handleSearchB2B} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <input 
                        type="text" 
                        value={rfc}
                        onChange={e => setRfc(e.target.value.toUpperCase())}
                        placeholder="RFC (Ej. XAXX010101000)" 
                        required
                        style={{ padding: '1.25rem', borderRadius: '8px', border: '2px solid var(--caanma-border)', fontSize: '1.5rem', textAlign: 'center', fontWeight: 'bold', letterSpacing: '2px' }} 
                      />
                      <button disabled={loading} type="submit" className="btn-primary" style={{ padding: '1rem', fontSize: '1.1rem', borderRadius: '8px', border: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
                        {loading ? 'Cargando portal...' : 'Ingresar al Portal'}
                      </button>
                    </form>
                  </div>
                ) : (
                  <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Historial Fiscal</h2>
                    <p style={{ color: 'var(--caanma-text-muted)', marginBottom: '2rem' }}>RFC: <strong>{rfc}</strong></p>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {invoices.map((inv) => (
                        <div key={inv.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', border: '1px solid var(--caanma-border)', borderRadius: '8px' }}>
                          <div>
                            <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Factura {inv.id}</div>
                            <div style={{ color: 'var(--caanma-text-muted)', fontSize: '0.85rem' }}>{new Date(inv.date).toLocaleDateString()} • UUID: {inv.uuid}</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                             <div style={{ fontWeight: 'bold', color: 'var(--caanma-text)' }}>{formatCurrency(inv.total)}</div>
                             <div style={{ display: 'flex', gap: '0.5rem' }}>
                               <a 
                                 href={`/api/facturacion/download?invoiceId=${inv.uuid}&format=pdf`} 
                                 style={{ padding: '0.5rem', backgroundColor: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 'bold' }} 
                                 title="Descargar PDF"
                               >
                                  <Download size={16} /> PDF
                               </a>
                               <a 
                                 href={`/api/facturacion/download?invoiceId=${inv.uuid}&format=xml`} 
                                 style={{ padding: '0.5rem', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 'bold' }} 
                                 title="Descargar XML"
                               >
                                  <Download size={16} /> XML
                               </a>
                             </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button onClick={() => setB2bSearched(false)} style={{ background: 'none', border: 'none', color: 'var(--caanma-primary)', fontWeight: 'bold', textDecoration: 'underline', marginTop: '2rem', cursor: 'pointer' }}>
                      Salir del portal
                    </button>
                  </div>
                )}
             </div>
          )}

        </div>
      </div>
      
      <div style={{ textAlign: 'center', marginTop: '3rem' }}>
         <Link href="/login" style={{ color: 'var(--caanma-text-muted)', textDecoration: 'none', fontSize: '0.9rem' }}>
           ← Volver al login para empleados
         </Link>
      </div>
    </div>
  );
}
