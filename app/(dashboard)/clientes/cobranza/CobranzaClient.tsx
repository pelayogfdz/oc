'use client';

import { useState } from 'react';
import { HandCoins, UserCircle, History, X } from 'lucide-react';
import { addCustomerPayment } from '@/app/actions/customerPayment';

export default function CobranzaClient({ customers }: { customers: any[] }) {
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [loading, setLoading] = useState(false);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !amount) return;
    
    setLoading(true);
    try {
      await addCustomerPayment(selectedCustomer.id, parseFloat(amount), paymentMethod);
      setSelectedCustomer(null);
      setAmount('');
    } catch (err: any) {
      alert(err.message || 'Error al procesar el pago');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ padding: 0 }}>
      {selectedCustomer && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', width: '400px', maxWidth: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Abonar a {selectedCustomer.name}</h3>
              <button onClick={() => setSelectedCustomer(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handlePay}>
               <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Monto a Abonar</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    max={selectedCustomer.creditBalance}
                    required 
                    value={amount} 
                    onChange={e => setAmount(e.target.value)} 
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} 
                  />
               </div>
               
               <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Método de Pago</label>
                  <select 
                    value={paymentMethod} 
                    onChange={e => setPaymentMethod(e.target.value)} 
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="CASH">Efectivo</option>
                    <option value="CARD">Tarjeta</option>
                    <option value="TRANSFER">Transferencia</option>
                  </select>
               </div>
               
               <button type="submit" disabled={loading} style={{ width: '100%', padding: '0.75rem', backgroundColor: '#6366f1', color: 'white', fontWeight: 'bold', borderRadius: '4px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer' }}>
                 {loading ? 'Procesando...' : 'Confirmar Abono'}
               </button>
            </form>
          </div>
        </div>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead style={{ backgroundColor: '#f8fafc' }}>
          <tr>
            <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Cliente</th>
            <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)', textAlign: 'right' }}>Deuda Actual</th>
            <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)', textAlign: 'right' }}>Límite</th>
            <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)', textAlign: 'center' }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((c: any) => (
            <tr key={c.id} style={{ borderBottom: '1px solid var(--pulpos-border)' }}>
              <td style={{ padding: '1rem' }}>
                <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <UserCircle size={18} color="var(--pulpos-text-muted)" />
                  {c.name}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--pulpos-text-muted)' }}>{c.phone || c.email || 'Sin datos de contacto'}</div>
              </td>
              <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold', color: c.creditBalance > 0 ? '#dc2626' : '#22c55e' }}>
                ${(c.creditBalance || 0).toFixed(2)}
              </td>
              <td style={{ padding: '1rem', textAlign: 'right', color: 'var(--pulpos-text-muted)' }}>
                ${(c.creditLimit || 0).toFixed(2)}
              </td>
              <td style={{ padding: '1rem', textAlign: 'center', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                <button 
                   onClick={() => setSelectedCustomer(c)} 
                   disabled={!c.creditBalance || c.creditBalance <= 0}
                   style={{ backgroundColor: '#f1f5f9', color: (!c.creditBalance || c.creditBalance <= 0) ? '#94a3b8' : '#475569', padding: '0.5rem 1rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontWeight: 'bold', cursor: (!c.creditBalance || c.creditBalance <= 0) ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <HandCoins size={16} /> Abonar
                </button>
              </td>
            </tr>
          ))}
          {customers.length === 0 && (
            <tr>
              <td colSpan={4} style={{ padding: '4rem', textAlign: 'center', color: 'var(--pulpos-text-muted)' }}>
                <HandCoins size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                Ningún cliente tiene línea de crédito activa.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
