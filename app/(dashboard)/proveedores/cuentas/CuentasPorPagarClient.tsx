'use client';

import { useState, useEffect } from 'react';
import { HandCoins, Search, X, FileText, CheckCircle, AlertTriangle, ChevronRight, CheckSquare, Square, Truck } from 'lucide-react';
import { addSupplierPaymentBatch } from '@/app/actions/supplierPayment';

export default function CuentasPorPagarClient({ suppliers }: { suppliers: any[] }) {
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [selectedPurchases, setSelectedPurchases] = useState<any[]>([]);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [requestCfdi, setRequestCfdi] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isGeneralPayment, setIsGeneralPayment] = useState(false);

  useEffect(() => {
     if (isGeneralPayment) {
        setSelectedPurchases([]);
        setAmount('');
        return;
     }
     if (selectedPurchases.length > 0) {
        const total = selectedPurchases.reduce((acc, purchase) => acc + purchase.balanceDue, 0);
        setAmount(total.toFixed(2));
     } else {
        setAmount('');
     }
  }, [selectedPurchases, isGeneralPayment]);

  const togglePurchase = (purchase: any) => {
     setIsGeneralPayment(false);
     if (selectedPurchases.find(p => p.id === purchase.id)) {
        setSelectedPurchases(selectedPurchases.filter(p => p.id !== purchase.id));
     } else {
        setSelectedPurchases([...selectedPurchases, purchase]);
     }
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier || !amount) return;
    
    setLoading(true);
    try {
      await addSupplierPaymentBatch(
        selectedSupplier.id, 
        parseFloat(amount), 
        paymentMethod, 
        selectedPurchases.map(p => p.id),
        requestCfdi
      );
      setSelectedSupplier(null);
      setSelectedPurchases([]);
      setIsGeneralPayment(false);
      setAmount('');
      setRequestCfdi(false);
    } catch (err: any) {
      alert(err.message || 'Error al procesar el abono a cuenta por pagar');
    } finally {
      setLoading(false);
    }
  };

  const isOverdue = (dateDate: Date | string | null) => {
     if (!dateDate) return false;
     return new Date(dateDate) < new Date();
  };

  return (
    <div className="card" style={{ padding: 0 }}>
      {selectedSupplier && (
         <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
           <div style={{ backgroundColor: 'white', borderRadius: '8px', width: '850px', maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
             
             {/* HEADER */}
             <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: '8px 8px 0 0' }}>
               <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Truck size={24} /> {selectedSupplier.name}
                  </h3>
                  <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem', display: 'flex', gap: '1rem' }}>
                    <span>Límite Crédito: ${selectedSupplier.creditLimit.toFixed(2)}</span>
                    <span>Plazo: {selectedSupplier.creditDays} días</span>
                    <span style={{ color: selectedSupplier.storeCredit > 0 ? '#16a34a' : 'inherit', fontWeight: selectedSupplier.storeCredit > 0 ? 'bold' : 'normal' }}>Saldo a Favor: ${selectedSupplier.storeCredit.toFixed(2)}</span>
                  </div>
               </div>
               <button onClick={() => { setSelectedSupplier(null); setSelectedPurchases([]); setIsGeneralPayment(false); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem' }}>
                 <X size={24} color="#64748b" />
               </button>
             </div>

             {/* MAIN CONTENT SPLIT */}
             <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.5fr) minmax(0,1fr)', gap: '1.5rem', padding: '1.5rem' }}>
                
                {/* LEFT COL: INVOICE LIST */}
                <div style={{ borderRight: '1px solid #e2e8f0', paddingRight: '1.5rem' }}>
                   <h4 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '1rem', color: '#334155' }}>Cuentas por Pagar</h4>
                   
                   {selectedSupplier.purchases?.filter((p:any) => p.paymentMethod === 'CREDIT' && p.balanceDue > 0).length === 0 ? (
                      <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                        <HandCoins size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
                        <p>No tienes cuentas pendientes con este proveedor</p>
                      </div>
                   ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '400px', overflowY: 'auto', paddingRight: '5px' }}>
                        {selectedSupplier.purchases?.filter((p:any) => p.paymentMethod === 'CREDIT' && p.balanceDue > 0)
                           .sort((a:any, b:any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                           .map((purchase: any) => {
                             const overdue = isOverdue(purchase.dueDate);
                             const isSelected = !!selectedPurchases.find(s => s.id === purchase.id);
                             
                             return (
                               <div 
                                 key={purchase.id}
                                 onClick={() => togglePurchase(purchase)}
                                 style={{ 
                                   border: `2px solid ${isSelected ? '#6366f1' : '#e2e8f0'}`, 
                                   borderRadius: '8px', padding: '1rem', 
                                   cursor: 'pointer',
                                   backgroundColor: isSelected ? '#eef2ff' : 'white',
                                   transition: 'all 0.2s',
                                   display: 'flex',
                                   gap: '1rem',
                                   alignItems: 'center'
                                 }}
                               >
                                  <div>
                                     {isSelected ? <CheckSquare size={24} color="#6366f1" /> : <Square size={24} color="#cbd5e1" />}
                                  </div>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                      <span style={{ fontWeight: 'bold', color: '#334155' }}>Nota: #{purchase.id.slice(0,8).toUpperCase()}</span>
                                      <span style={{ fontWeight: 'bold', color: '#dc2626' }}>${purchase.balanceDue.toFixed(2)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                                      <span style={{ color: '#64748b' }}>C: {new Date(purchase.createdAt).toLocaleDateString()}</span>
                                      {purchase.dueDate && (
                                        <span style={{ color: overdue ? '#ef4444' : '#16a34a', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                          {overdue && <AlertTriangle size={14} />} V: {new Date(purchase.dueDate).toLocaleDateString()}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                               </div>
                             );
                           })}
                      </div>
                   )}
                </div>

                {/* RIGHT COL: PAYMENT FORM */}
                <div>
                   <h4 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '1rem', color: '#334155' }}>Liquidar Cuentas</h4>
                   
                   {selectedPurchases.length === 0 && !isGeneralPayment ? (
                      <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                        <ChevronRight size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
                        <p>Palomea las cuentas por pagar a la izquierda.</p>
                        <p style={{ fontSize: '0.75rem', marginTop: '1rem' }}>Si deseas hacer un pago para saldo a favor (general) al proveedor, haz <span style={{ color: '#6366f1', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setIsGeneralPayment(true)}>clic aquí</span>.</p>
                      </div>
                   ) : (
                      <form onSubmit={handlePay}>
                         {isGeneralPayment ? (
                           <div style={{ padding: '0.75rem', backgroundColor: '#f0fdf4', borderRadius: '6px', color: '#166534', fontSize: '0.875rem', fontWeight: '500', marginBottom: '1rem', border: '1px solid #bbf7d0' }}>
                             Abono General (Anticipo / Saldo a Favor)
                           </div>
                         ) : (
                           <div style={{ padding: '0.75rem', backgroundColor: '#eef2ff', borderRadius: '6px', color: '#4f46e5', fontSize: '0.875rem', fontWeight: '500', marginBottom: '1rem', border: '1px solid #c7d2fe' }}>
                             Aplicando abono a {selectedPurchases.length} nota(s) de remisión
                           </div>
                         )}

                         <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Monto a Pagar (Global)</label>
                            <input 
                              type="number" 
                              step="0.01" 
                              required 
                              value={amount} 
                              onChange={e => setAmount(e.target.value)} 
                              style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '1.25rem', fontWeight: 'bold', color: '#0f172a' }} 
                            />
                            {!isGeneralPayment && selectedPurchases.length > 0 && parseFloat(amount) > selectedPurchases.reduce((a,b)=>a+b.balanceDue,0) && (
                              <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#16a34a' }}>
                                Nota: El remanente pasará a Saldo a Favor con el Proveedor.
                              </div>
                            )}
                         </div>
                         
                         <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Método de Pago o Egreso</label>
                            <select 
                              value={paymentMethod} 
                              onChange={e => setPaymentMethod(e.target.value)} 
                              style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                            >
                              <option value="CASH">Efectivo (Retira de Caja)</option>
                              <option value="TRANSFER">Transferencia / Mov. Bancario</option>
                              <option value="CARD">Tarjeta Institucional</option>
                            </select>
                         </div>

                         <div style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '6px', backgroundColor: '#f8fafc' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: '500', fontSize: '0.9rem' }}>
                              <input 
                                type="checkbox" 
                                checked={requestCfdi} 
                                onChange={e => setRequestCfdi(e.target.checked)} 
                                style={{ width: '18px', height: '18px' }} 
                              />
                              El Proveedor emitirá CFDI de Pago (REP)
                            </label>
                            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                              Si se selecciona, se marcará el pago y se esperará el comprobante fiscal del proveedor.
                            </p>
                         </div>
                         
                         <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1rem', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                           {loading ? 'Procesando...' : <><CheckCircle size={20}/> Confirmar Cobro/Egreso</>}
                         </button>
                      </form>
                   )}
                </div>
             </div>
           </div>
         </div>
      )}

      <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead style={{ backgroundColor: '#f8fafc' }}>
          <tr>
            <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Proveedor</th>
            <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)', textAlign: 'right' }}>Deuda Total / Cuenta por Pagar</th>
            <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)', textAlign: 'center' }}>Estado</th>
            <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)', textAlign: 'right' }}>Límite Disp. con Prov.</th>
            <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)', textAlign: 'center' }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {suppliers.map((s: any) => {
            const overduePurchases = s.purchases?.filter((p:any) => p.paymentMethod === 'CREDIT' && p.balanceDue > 0 && isOverdue(p.dueDate)) || [];
            
            return (
              <tr key={s.id} style={{ borderBottom: '1px solid var(--pulpos-border)' }}>
                <td data-label="Proveedor" style={{ padding: '1rem' }}>
                  <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Truck size={18} color="var(--pulpos-text-muted)" />
                    {s.name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--pulpos-text-muted)', marginTop: '0.25rem' }}>
                     Plazo Acordado: {s.creditDays} días
                  </div>
                </td>
                <td data-label="Deuda Total" style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold', color: s.creditBalance > 0 ? '#dc2626' : '#22c55e' }}>
                  ${(s.creditBalance || 0).toFixed(2)}
                </td>
                <td data-label="Estado" style={{ padding: '1rem', textAlign: 'center' }}>
                   {overduePurchases.length > 0 ? (
                      <span style={{ padding: '0.25rem 0.5rem', backgroundColor: '#fef2f2', color: '#ef4444', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        <AlertTriangle size={14} /> {overduePurchases.length} Vencida(s)
                      </span>
                   ) : s.creditBalance > 0 ? (
                     <span style={{ padding: '0.25rem 0.5rem', backgroundColor: '#eef2ff', color: '#4f46e5', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                        Al Corriente
                      </span>
                   ) : (
                     <span style={{ padding: '0.25rem 0.5rem', backgroundColor: '#f0fdf4', color: '#16a34a', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                        Sin Deuda
                      </span>
                   )}
                </td>
                <td data-label="Límite Disponible" style={{ padding: '1rem', textAlign: 'right', color: 'var(--pulpos-text-muted)' }}>
                  <div style={{ fontWeight: '500' }}>
                    ${(s.creditLimit - (s.creditBalance || 0)).toFixed(2)}
                  </div>
                  <div style={{ fontSize: '0.75rem' }}>de ${(s.creditLimit || 0).toFixed(2)}</div>
                </td>
                <td data-label="Acciones" style={{ padding: '1rem', textAlign: 'center' }}>
                  <button 
                     onClick={() => { setSelectedSupplier(s); setSelectedPurchases([]); setAmount(''); setIsGeneralPayment(false); }} 
                     style={{ backgroundColor: 'white', color: '#475569', padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 'bold', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                  >
                    <FileText size={16} /> Ver Cuentas por Pagar
                  </button>
                </td>
              </tr>
            );
          })}
          {suppliers.length === 0 && (
            <tr>
              <td colSpan={5} style={{ padding: '4rem', textAlign: 'center', color: 'var(--pulpos-text-muted)' }}>
                <HandCoins size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                Ningún proveedor tiene historial de crédito documentado.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
