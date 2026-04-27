'use client';

import { useState } from 'react';
import { createPaymentReceipt } from '@/app/actions/facturacion';

export default function REPClient({ sales }: { sales: any[] }) {
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [paymentForm, setPaymentForm] = useState('03'); // 03 = Transferencia default
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10)); // YYYY-MM-DD
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSale || !amount) return;

    setIsProcessing(true);
    try {
      const result = await createPaymentReceipt(
        selectedSale.invoiceId,
        parseFloat(amount),
        paymentForm,
        new Date(date + 'T12:00:00Z') // Añadir hora segura
      );

      if (result.success) {
        alert("Recibo Electrónico de Pago emitido exitosamente. ID: " + result.receiptId);
        setSelectedSale(null);
        setAmount('');
      } else {
        alert("Error al emitir REP: " + result.error);
      }
    } catch (err: any) {
      alert("Excepción: " + err.message);
    }
    setIsProcessing(false);
  };

  return (
    <div>
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1rem' }}>Facturas PPD Disponibles</h2>
        
        {sales.length === 0 ? (
          <p style={{ color: '#64748b' }}>No hay facturas a crédito registradas que requieran complemento.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '0.75rem', color: '#64748b', fontWeight: '500' }}>Fecha</th>
                <th style={{ padding: '0.75rem', color: '#64748b', fontWeight: '500' }}>Cliente</th>
                <th style={{ padding: '0.75rem', color: '#64748b', fontWeight: '500' }}>Total</th>
                <th style={{ padding: '0.75rem', color: '#64748b', fontWeight: '500' }}>ID Factura</th>
                <th style={{ padding: '0.75rem', color: '#64748b', fontWeight: '500', textAlign: 'right' }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '0.75rem' }}>{new Date(sale.createdAt).toLocaleDateString()}</td>
                  <td style={{ padding: '0.75rem', fontWeight: '500' }}>
                    {sale.customer ? (sale.customer.legalName || sale.customer.name) : 'Desconocido'}
                  </td>
                  <td style={{ padding: '0.75rem' }}>${sale.total.toFixed(2)}</td>
                  <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontSize: '0.875rem' }}>
                    {sale.invoiceId}
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                    <button 
                      onClick={() => {
                        setSelectedSale(sale);
                        setAmount(sale.total.toString());
                      }}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#f1f5f9',
                        color: '#0f172a',
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0',
                        cursor: 'pointer',
                        fontWeight: '500',
                        fontSize: '0.875rem'
                      }}
                    >
                      Emitir REP
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selectedSale && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="card" style={{ width: '400px', padding: '1.5rem', backgroundColor: 'white' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1rem' }}>Emitir Recibo de Pago</h3>
            <p style={{ marginBottom: '1.5rem', color: '#64748b', fontSize: '0.9rem' }}>
              Factura: {selectedSale.invoiceId}
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>Monto Pagado</label>
                <input 
                  type="number" 
                  step="0.01" 
                  value={amount} 
                  onChange={e => setAmount(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>Forma de Pago</label>
                <select 
                  value={paymentForm}
                  onChange={e => setPaymentForm(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '6px', backgroundColor: 'white' }}
                >
                  <option value="01">Efectivo (01)</option>
                  <option value="02">Cheque nominativo (02)</option>
                  <option value="03">Transferencia electrónica de fondos (03)</option>
                  <option value="04">Tarjeta de crédito (04)</option>
                  <option value="28">Tarjeta de débito (28)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>Fecha de Pago</label>
                <input 
                  type="date" 
                  value={date} 
                  onChange={e => setDate(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button 
                  type="button" 
                  onClick={() => setSelectedSale(null)}
                  style={{ flex: 1, padding: '0.75rem', backgroundColor: '#f1f5f9', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={isProcessing}
                  style={{ flex: 1, padding: '0.75rem', backgroundColor: 'var(--pulpos-primary)', color: 'white', border: 'none', borderRadius: '6px', cursor: isProcessing ? 'not-allowed' : 'pointer', fontWeight: '500' }}
                >
                  {isProcessing ? 'Procesando...' : 'Timbrar REP'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
