'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  UserCircle, ShoppingBag, HandCoins, History, Edit, 
  MapPin, Mail, Phone, Building, Briefcase, FileText, CheckCircle, Square, AlertTriangle, CheckSquare, Trash2
} from 'lucide-react';
import { addCustomerPaymentBatch, deleteCustomerPayment } from '@/app/actions/customerPayment';

export default function ClientProfile({ customer, sales, payments }: { customer: any, sales: any[], payments: any[] }) {
  const [activeTab, setActiveTab] = useState('resumen');
  
  // Cobranza State
  const [selectedSales, setSelectedSales] = useState<Record<string, number>>({});
  const [globalAmount, setGlobalAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [requestCfdi, setRequestCfdi] = useState(false);
  const [paymentDate, setPaymentDate] = useState('');
  const [loading, setLoading] = useState(false);

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

  return (
    <div>
      {/* Header Profile */}
      <div className="card" style={{ padding: '2rem', display: 'flex', gap: '2rem', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div style={{ padding: '1.5rem', backgroundColor: '#f1f5f9', borderRadius: '50%' }}>
          <UserCircle size={64} color="#64748b" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#0f172a', margin: '0 0 0.5rem 0' }}>{customer.name}</h1>
              {customer.taxId && <div style={{ display: 'inline-block', backgroundColor: '#eef2ff', color: '#4f46e5', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '1rem' }}>RFC: {customer.taxId}</div>}
            </div>
            <Link href={`/clientes/${customer.id}/editar`} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
              <Edit size={16} /> Editar Perfil
            </Link>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginTop: '1rem' }}>
            <div>
              <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Deuda Total</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: customer.creditBalance > 0 ? '#ef4444' : '#10b981' }}>
                ${Math.max(0, customer.creditBalance || 0).toFixed(2)}
              </div>
            </div>
            <div>
              <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Límite de Crédito</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#0f172a' }}>
                ${(customer.creditLimit || 0).toFixed(2)}
              </div>
            </div>
            <div>
              <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Saldo a Favor</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: customer.storeCredit > 0 ? '#10b981' : '#0f172a' }}>
                ${(customer.storeCredit || 0).toFixed(2)}
              </div>
            </div>
            <div>
              <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Días de Crédito</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#0f172a' }}>
                {customer.creditDays || 0}
              </div>
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
                            <span style={{ fontWeight: 'bold', color: '#dc2626' }}>Deuda: ${sale.balanceDue.toFixed(2)}</span>
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
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
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
                        <td style={{ padding: '1rem', fontWeight: 'bold' }}>${sale.total.toFixed(2)}</td>
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
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
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
                        <td style={{ padding: '1rem', fontWeight: 'bold', color: '#10b981' }}>+${p.amount.toFixed(2)}</td>
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
