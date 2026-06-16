'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  UserCircle, ShoppingBag, HandCoins, History, Edit, 
  MapPin, Mail, Phone, Building, Briefcase, FileText, CheckCircle, Square, AlertTriangle, CheckSquare, Trash2,
  Star
} from 'lucide-react';
import { addCustomerPaymentBatch, deleteCustomerPayment } from '@/app/actions/customerPayment';
import { toggleCustomerBlock } from '@/app/actions/customer';
import { formatCurrency } from '@/lib/utils';
import { getGoogleWalletSettings, generateGoogleWalletPassUrl } from '@/app/actions/loyalty';

export default function ClientProfile({ customer, sales, payments }: { customer: any, sales: any[], payments: any[] }) {

  const [activeTab, setActiveTab] = useState('resumen');
  
  // Cobranza State
  const [selectedSales, setSelectedSales] = useState<Record<string, number>>({});
  const [globalAmount, setGlobalAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [requestCfdi, setRequestCfdi] = useState(false);
  const [paymentDate, setPaymentDate] = useState('');
  const [loading, setLoading] = useState(false);

  // Google Wallet Integration State
  const [googleWalletEnabled, setGoogleWalletEnabled] = useState(false);
  const [generatingWallet, setGeneratingWallet] = useState(false);

  useEffect(() => {
    async function checkWallet() {
      if (customer.branchId) {
        const res = await getGoogleWalletSettings(customer.branchId);
        if (res.success && res.settings?.enabled) {
          setGoogleWalletEnabled(true);
        }
      }
    }
    checkWallet();
  }, [customer.branchId]);

  const handleGenerateWalletUrl = async () => {
    setGeneratingWallet(true);
    const res = await generateGoogleWalletPassUrl(customer.id);
    setGeneratingWallet(false);
    if (res.success && res.url) {
      window.open(res.url, '_blank');
    } else {
      alert(res.error || 'Error al generar la tarjeta de Google Wallet');
    }
  };

  const pendingSales = sales.filter((s:any) => s.paymentMethod === 'CREDIT' && s.balanceDue > 0);

  const isOverdue = (dateDate: Date | string | null) => dateDate ? new Date(dateDate) < new Date() : false;

  const toggleSale = (sale: any) => {
    const newSelected = { ...selectedSales };
    if (newSelected[sale.id] !== undefined) {
      delete newSelected[sale.id];
    } else {
      newSelected[sale.id] = sale.balanceDue;
    }
    setSelectedSales(newSelected);
    
    // Auto-sum to global amount
    const total = Object.values(newSelected).reduce((a, b) => a + Number(b), 0);
    setGlobalAmount(total > 0 ? total.toFixed(2) : '');
  };

  const handleSaleAmountChange = (saleId: string, val: string, maxAmount: number) => {
    const num = Math.min(Number(val) || 0, maxAmount);
    const newSelected = { ...selectedSales, [saleId]: num };
    setSelectedSales(newSelected);
    
    // Auto-sum
    const total = Object.values(newSelected).reduce((a, b) => a + Number(b), 0);
    setGlobalAmount(total > 0 ? total.toFixed(2) : '');
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!globalAmount) return;
    
    setLoading(true);
    try {
      const salePayments = Object.entries(selectedSales).map(([id, amount]) => ({ id, amount: Number(amount) }));
      const response = await addCustomerPaymentBatch(
        customer.id, 
        parseFloat(globalAmount), 
        paymentMethod, 
        salePayments,
        requestCfdi,
        paymentDate ? new Date(paymentDate).toISOString() : undefined
      );

      if (!response?.success) {
        throw new Error(response?.error || 'Error desconocido al procesar el pago');
      }
      
      setSelectedSales({});
      setGlobalAmount('');
      setRequestCfdi(false);
      setPaymentDate('');
      alert('Pago registrado correctamente');
    } catch (err: any) {
      alert(err.message || 'Error al procesar el pago');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePayment = async (id: string) => {
     if (!confirm("¿Seguro que deseas eliminar este abono? Esto revertirá saldos e ingresos en caja.")) return;
     try {
        const response = await deleteCustomerPayment(id);
        if (!response?.success) throw new Error(response?.error || 'Error desconocido');
     } catch (err: any) {
        alert(err.message);
     }
  };

  const handleToggleBlock = async () => {
    if (!confirm(`¿Seguro que deseas ${customer.isBlocked ? 'DESBLOQUEAR' : 'BLOQUEAR'} a este cliente?`)) return;
    try {
      await toggleCustomerBlock(customer.id, !customer.isBlocked);
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div>
      {/* Header Profile */}
      <div className="card" style={{ padding: '2rem', display: 'flex', gap: '2rem', alignItems: 'flex-start', marginBottom: '2rem', position: 'relative', overflow: 'hidden' }}>
        {customer.isBlocked && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: '#ef4444', color: 'white', textAlign: 'center', padding: '0.25rem', fontSize: '0.75rem', fontWeight: 'bold' }}>
            CLIENTE BLOQUEADO PARA VENTAS
          </div>
        )}
        <div style={{ padding: '1.5rem', backgroundColor: customer.isBlocked ? '#fee2e2' : '#f1f5f9', borderRadius: '50%', marginTop: customer.isBlocked ? '1rem' : '0' }}>
          <UserCircle size={64} color={customer.isBlocked ? '#ef4444' : '#64748b'} />
        </div>
        <div style={{ flex: 1, marginTop: customer.isBlocked ? '1rem' : '0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: customer.isBlocked ? '#ef4444' : '#0f172a', margin: '0 0 0.5rem 0' }}>{customer.name}</h1>
              {customer.taxId && <div style={{ display: 'inline-block', backgroundColor: '#eef2ff', color: '#4f46e5', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '1rem' }}>RFC: {customer.taxId}</div>}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                onClick={handleToggleBlock}
                className={customer.isBlocked ? "btn-secondary" : "btn-danger"}
                style={{ 
                   display: 'flex', alignItems: 'center', gap: '0.5rem', 
                   backgroundColor: customer.isBlocked ? '#f1f5f9' : '#fee2e2', 
                   color: customer.isBlocked ? '#0f172a' : '#ef4444', 
                   border: customer.isBlocked ? '1px solid #e2e8f0' : '1px solid #fca5a5', 
                   padding: '0.5rem 1rem', borderRadius: '6px', fontWeight: '500', cursor: 'pointer' 
                }}
              >
                <AlertTriangle size={16} /> {customer.isBlocked ? 'Desbloquear' : 'Bloquear'}
              </button>
              <Link href={`/clientes/${customer.id}/editar`} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
                <Edit size={16} /> Editar Perfil
              </Link>
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1.5rem', marginTop: '1rem' }}>
            <div>
              <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Deuda Total</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: customer.creditBalance > 0 ? '#ef4444' : '#10b981' }}>
                {formatCurrency(Math.max(0, customer.creditBalance || 0))}
              </div>
            </div>
            <div>
              <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Límite de Crédito</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#0f172a' }}>
                {formatCurrency(customer.creditLimit || 0)}
              </div>
            </div>
            <div>
              <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Saldo a Favor</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: customer.storeCredit > 0 ? '#10b981' : '#0f172a' }}>
                {formatCurrency(customer.storeCredit || 0)}
              </div>
            </div>
            <div>
              <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Días de Crédito</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#0f172a' }}>
                {customer.creditDays || 0}
              </div>
            </div>
            <div>
              <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '0.25rem' }}>🌟 Puntos (Lealtad)</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--pulpos-primary)' }}>
                {customer.pointsBalance || 0} pts
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.1rem' }}>
                {customer.pointsExpiryDate 
                  ? `Vence: ${new Date(customer.pointsExpiryDate).toLocaleDateString()}` 
                  : 'Sin vencimiento'}
              </div>
              {googleWalletEnabled && (
                <button 
                  onClick={handleGenerateWalletUrl}
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
                    transition: 'background-color 0.2s',
                    marginTop: '0.5rem'
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
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Tabs Menu */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '2rem' }}>
        <button onClick={() => setActiveTab('resumen')} style={{ padding: '1rem 2rem', background: 'none', border: 'none', borderBottom: activeTab === 'resumen' ? '2px solid #0ea5e9' : '2px solid transparent', color: activeTab === 'resumen' ? '#0ea5e9' : '#64748b', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileText size={18} /> Información General
        </button>
        <button onClick={() => setActiveTab('ventas')} style={{ padding: '1rem 2rem', background: 'none', border: 'none', borderBottom: activeTab === 'ventas' ? '2px solid #0ea5e9' : '2px solid transparent', color: activeTab === 'ventas' ? '#0ea5e9' : '#64748b', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ShoppingBag size={18} /> Historial de Ventas
        </button>
        <button onClick={() => setActiveTab('cobranza')} style={{ padding: '1rem 2rem', background: 'none', border: 'none', borderBottom: activeTab === 'cobranza' ? '2px solid #0ea5e9' : '2px solid transparent', color: activeTab === 'cobranza' ? '#0ea5e9' : '#64748b', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <HandCoins size={18} /> Cobranza y Abonos
        </button>
        <button onClick={() => setActiveTab('pagos')} style={{ padding: '1rem 2rem', background: 'none', border: 'none', borderBottom: activeTab === 'pagos' ? '2px solid #0ea5e9' : '2px solid transparent', color: activeTab === 'pagos' ? '#0ea5e9' : '#64748b', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <History size={18} /> Historial de Pagos
        </button>
      </div>

      {/* TAB CONTENT */}
      {activeTab === 'resumen' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '2rem' }}>
          <div className="card">
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <UserCircle size={20} color="#64748b" /> Contacto Principal
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <Mail size={18} color="#94a3b8" /> <span>{customer.email || 'No registrado'}</span>
              </div>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <Phone size={18} color="#94a3b8" /> <span>{customer.phone || 'No registrado'}</span>
              </div>
            </div>
          </div>
          
          <div className="card">
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Building size={20} color="#64748b" /> Dirección Corporativa
            </h3>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <MapPin size={18} color="#94a3b8" style={{ marginTop: '0.2rem' }} /> 
              <span>
                {customer.street ? `${customer.street} ${customer.exteriorNumber || ''}` : 'No registrada'}
                <br/>
                {customer.neighborhood} {customer.city ? `, ${customer.city}` : ''}
              </span>
            </div>
          </div>

          <div className="card" style={{ gridColumn: '1 / -1' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Star size={20} color="var(--pulpos-primary)" fill="var(--pulpos-primary)" /> Control de Puntos de Fidelidad
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--pulpos-text-muted)', marginBottom: '1rem' }}>
              Ajusta manualmente el saldo de puntos de lealtad del cliente. Esto registrará una transacción en el log.
            </p>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const ptsVal = parseFloat(fd.get('adjust_points') as string || '0');
              const reasonVal = fd.get('adjust_reason') as string || '';
              if (!ptsVal) return;
              
              const { adjustCustomerPoints } = await import('@/app/actions/loyalty');
              const res = await adjustCustomerPoints(customer.id, ptsVal, reasonVal);
              if (res.success) {
                alert('Puntos ajustados correctamente');
                window.location.reload();
              } else {
                alert(res.error);
              }
            }} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>Puntos a Ajustar (Negativo para restar)</label>
                <input type="number" name="adjust_points" required placeholder="Ej: 50 o -20" style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
              </div>
              <div style={{ flex: 2 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>Razón del Ajuste</label>
                <input type="text" name="adjust_reason" required placeholder="Ej: Corrección por devolución o Bono especial" style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
              </div>
              <button type="submit" className="btn-primary" style={{ padding: '0.5rem 1.5rem', borderRadius: '4px' }}>
                Aplicar Ajuste
              </button>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'cobranza' && (
        <div className="card" style={{ padding: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.5fr) minmax(0,1fr)' }}>
            
            {/* LADO IZQUIERDO: FACTURAS */}
            <div style={{ padding: '1.5rem', borderRight: '1px solid #e2e8f0' }}>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '1rem', color: '#334155' }}>Selecciona Facturas a Abonar</h4>
              {pendingSales.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                  <HandCoins size={32} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                  <p>No hay facturas o cuentas pendientes</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '500px', overflowY: 'auto', paddingRight: '5px' }}>
                  {pendingSales.map((sale: any) => {
                    const overdue = isOverdue(sale.dueDate);
                    const isSelected = selectedSales[sale.id] !== undefined;
                    
                    return (
                      <div key={sale.id} style={{ border: `2px solid ${isSelected ? '#6366f1' : '#e2e8f0'}`, borderRadius: '8px', padding: '1rem', backgroundColor: isSelected ? '#eef2ff' : 'white', transition: 'all 0.2s', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <div onClick={() => toggleSale(sale)} style={{ cursor: 'pointer' }}>
                          {isSelected ? <CheckSquare size={24} color="#6366f1" /> : <Square size={24} color="#cbd5e1" />}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', alignItems: 'center' }}>
                            <span style={{ fontWeight: 'bold', color: '#334155' }}>#{sale.id.slice(0,8).toUpperCase()}</span>
                            <span style={{ fontWeight: 'bold', color: '#dc2626' }}>Deuda: {formatCurrency(sale.balanceDue)}</span>
                          </div>
                          
                          {/* Input Parcial Editable */}
                          {isSelected ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                              <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#6366f1' }}>Abonar a esta cuenta:</label>
                              <div style={{ position: 'relative', flex: 1 }}>
                                <span style={{ position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>$</span>
                                <input 
                                  type="number" 
                                  step="0.01" 
                                  max={sale.balanceDue}
                                  value={selectedSales[sale.id] || ''}
                                  onChange={(e) => handleSaleAmountChange(sale.id, e.target.value, sale.balanceDue)}
                                  style={{ width: '100%', padding: '0.4rem 0.5rem 0.4rem 1.5rem', borderRadius: '4px', border: '1px solid #c7d2fe', fontWeight: 'bold', color: '#4f46e5' }}
                                />
                              </div>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                              <span style={{ color: '#64748b' }}>Registro: {new Date(sale.createdAt).toLocaleDateString()}</span>
                              {sale.dueDate && (
                                <span style={{ color: overdue ? '#ef4444' : '#16a34a', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                  {overdue && <AlertTriangle size={14} />} Vence: {new Date(sale.dueDate).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* LADO DERECHO: FORMULARIO */}
            <div style={{ padding: '1.5rem' }}>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '1.5rem', color: '#334155' }}>Consolidar Abono</h4>
              
              <form onSubmit={handlePay}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Monto a Abonar (Global) *</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    required 
                    value={globalAmount} 
                    onChange={e => setGlobalAmount(e.target.value)} 
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '1.5rem', fontWeight: 'bold', color: '#0f172a' }} 
                  />
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem' }}>
                    Si ingresas más del total de las facturas seleccionadas, el remanente irá a Saldo a Favor.
                  </div>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Método de Pago *</label>
                  <select 
                    value={paymentMethod} 
                    onChange={e => setPaymentMethod(e.target.value)} 
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="CASH">Efectivo</option>
                    <option value="CARD">Tarjeta de Débito/Crédito</option>
                    <option value="TRANSFER">Transferencia (SPEI)</option>
                    <option value="CHECK">Cheque</option>
                  </select>
                </div>

                <div style={{ marginBottom: '1.5rem', padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '6px', backgroundColor: '#f8fafc' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem', color: '#334155' }}>
                    <input 
                      type="checkbox" 
                      checked={requestCfdi} 
                      onChange={e => setRequestCfdi(e.target.checked)} 
                      style={{ width: '18px', height: '18px' }} 
                    />
                    Requerir CFDI de Pago (Múltiple)
                  </label>
                  
                  {requestCfdi && (
                    <div style={{ marginTop: '1rem' }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>Fecha de Pago (Para el REP) *</label>
                      <input 
                        type="datetime-local" 
                        required 
                        value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)}
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                      />
                    </div>
                  )}
                </div>

                <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                  {loading ? 'Procesando...' : <><CheckCircle size={20}/> Confirmar Cobranza</>}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'ventas' && (
         <div className="card" style={{ padding: 0 }}>
            <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
               <thead style={{ backgroundColor: '#f8fafc' }}>
                  <tr>
                     <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Ticket / Factura</th>
                     <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Fecha</th>
                     <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Total</th>
                     <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Estado</th>
                  </tr>
               </thead>
               <tbody>
                  {sales.map((sale: any) => (
                     <tr key={sale.id} style={{ borderBottom: '1px solid var(--pulpos-border)' }}>
                        <td style={{ padding: '1rem', fontWeight: 'bold' }}>#{sale.id.slice(0,8).toUpperCase()}</td>
                        <td style={{ padding: '1rem', color: '#64748b' }}>{new Date(sale.createdAt).toLocaleDateString()}</td>
                        <td style={{ padding: '1rem', fontWeight: 'bold' }}>{formatCurrency(sale.total)}</td>
                        <td style={{ padding: '1rem' }}>
                           {sale.paymentMethod === 'CREDIT' ? (
                              <span style={{ padding: '0.25rem 0.5rem', backgroundColor: '#fef3c7', color: '#d97706', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>CRÉDITO</span>
                           ) : (
                              <span style={{ padding: '0.25rem 0.5rem', backgroundColor: '#dcfce7', color: '#16a34a', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>PAGADO</span>
                           )}
                        </td>
                     </tr>
                  ))}
                  {sales.length === 0 && (
                     <tr><td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Aún no hay ventas para este cliente</td></tr>
                  )}
               </tbody>
            </table>
         </div>
      )}

      {activeTab === 'pagos' && (
         <div className="card" style={{ padding: 0 }}>
            <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
               <thead style={{ backgroundColor: '#f8fafc' }}>
                  <tr>
                     <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>ID Pago</th>
                     <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Fecha</th>
                     <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Detalle / Razón</th>
                     <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Monto</th>
                     <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Acción</th>
                  </tr>
               </thead>
               <tbody>
                  {payments.map((p: any) => (
                     <tr key={p.id} style={{ borderBottom: '1px solid var(--pulpos-border)' }}>
                        <td style={{ padding: '1rem', fontWeight: 'bold', color: '#64748b' }}>{p.id.slice(0,8).toUpperCase()}</td>
                        <td style={{ padding: '1rem' }}>
                           <div>{new Date(p.paymentDate || p.createdAt).toLocaleDateString()}</div>
                           <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{new Date(p.paymentDate || p.createdAt).toLocaleTimeString()}</div>
                        </td>
                        <td style={{ padding: '1rem' }}>{p.reason}</td>
                        <td style={{ padding: '1rem', fontWeight: 'bold', color: '#10b981' }}>+{formatCurrency(p.amount)}</td>
                        <td style={{ padding: '1rem' }}>
                           <button onClick={() => handleDeletePayment(p.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}>
                              <Trash2 size={16} /> Revertir Pago
                           </button>
                        </td>
                     </tr>
                  ))}
                  {payments.length === 0 && (
                     <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Aún no hay abonos registrados</td></tr>
                  )}
               </tbody>
            </table>
         </div>
      )}

    </div>
  );
}
