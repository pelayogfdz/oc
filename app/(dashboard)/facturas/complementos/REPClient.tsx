'use client';

import { useState } from 'react';
import { createMultiplePaymentReceipt } from '@/app/actions/facturacion';
import { FileText, Send, Calendar, CreditCard, Layers, X, Check, Loader2, AlertTriangle } from 'lucide-react';

export default function REPClient({ sales }: { sales: any[] }) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState('03'); // 03 = Transferencia default
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10)); // YYYY-MM-DD
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Custom payment amounts for each selected invoice
  const [paymentAmounts, setPaymentAmounts] = useState<Record<string, string>>({});

  const selectedSales = sales.filter(s => selectedIds.includes(s.id));

  // Validation: Check if all selected sales belong to the same customer (legalName/taxId)
  const firstCustomerTaxId = selectedSales[0]?.customer?.taxId || '';
  const isSameCustomer = selectedSales.every(s => (s.customer?.taxId || '') === firstCustomerTaxId);

  const handleSelectSale = (saleId: string, saleTotal: number) => {
    setSelectedIds(prev => {
      const isCurrentlySelected = prev.includes(saleId);
      const nextIds = isCurrentlySelected ? prev.filter(id => id !== saleId) : [...prev, saleId];
      
      // Initialize/clear amount
      if (!isCurrentlySelected) {
        setPaymentAmounts(amounts => ({ ...amounts, [saleId]: saleTotal.toString() }));
      } else {
        setPaymentAmounts(amounts => {
          const next = { ...amounts };
          delete next[saleId];
          return next;
        });
      }
      return nextIds;
    });
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allIds = sales.map(s => s.id);
      setSelectedIds(allIds);
      // Initialize all amounts
      const initialAmounts: Record<string, string> = {};
      sales.forEach(s => {
        initialAmounts[s.id] = s.total.toString();
      });
      setPaymentAmounts(initialAmounts);
    } else {
      setSelectedIds([]);
      setPaymentAmounts({});
    }
  };

  const handleOpenModal = () => {
    if (selectedIds.length === 0) return;
    if (!isSameCustomer) {
      alert("Error: Para emitir un solo complemento de pago, todas las facturas seleccionadas deben pertenecer al mismo cliente.");
      return;
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSales.length === 0) return;

    // Map selected sales to format: { invoiceId, amount }
    const invoicesPayload = selectedSales.map(s => ({
      invoiceId: s.invoiceId,
      amount: parseFloat(paymentAmounts[s.id] || s.total.toString())
    })).filter(inv => inv.invoiceId && inv.amount > 0);

    if (invoicesPayload.length === 0) {
      alert("Error: Ninguna de las facturas tiene un monto de pago válido.");
      return;
    }

    setIsProcessing(true);
    try {
      const result = await createMultiplePaymentReceipt(
        invoicesPayload,
        paymentForm,
        new Date(paymentDate + 'T12:00:00Z') // Safe UTC conversion
      );

      if (result.success) {
        alert("Recibo Electrónico de Pago (REP) emitido exitosamente. ID: " + result.receiptId);
        setSelectedIds([]);
        setPaymentAmounts({});
        setIsModalOpen(false);
      } else {
        alert("Error al emitir el REP: " + result.error);
      }
    } catch (err: any) {
      alert("Excepción: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const totalPaymentSum = selectedSales.reduce((acc, s) => {
    const val = parseFloat(paymentAmounts[s.id] || '0');
    return acc + (isNaN(val) ? 0 : val);
  }, 0);

  return (
    <div>
      {/* Sticky Top warning if customers mismatch */}
      {selectedIds.length > 1 && !isSameCustomer && (
        <div style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fca5a5',
          color: '#991b1b',
          padding: '1rem',
          borderRadius: '8px',
          marginBottom: '1rem',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <AlertTriangle size={20} />
          <span>Las facturas seleccionadas pertenecen a diferentes clientes. Por favor, selecciona solo facturas del mismo cliente para emitir el complemento de pago agrupado.</span>
        </div>
      )}

      {/* Invoices List Card */}
      <div className="card" style={{ marginBottom: '2rem', padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--caanma-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#0f172a' }}>Facturas PPD (A Crédito) Emitidas</h2>
          {selectedIds.length > 0 && (
            <button 
              onClick={handleOpenModal}
              disabled={!isSameCustomer}
              style={{
                backgroundColor: isSameCustomer ? 'var(--caanma-primary)' : '#cbd5e1',
                color: 'white',
                border: 'none',
                padding: '0.6rem 1.25rem',
                borderRadius: '8px',
                fontWeight: 'bold',
                cursor: isSameCustomer ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.85rem'
              }}
            >
              <Layers size={16} /> Emitir REP Agrupado ({selectedIds.length})
            </button>
          )}
        </div>
        
        {sales.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            <FileText size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
            No hay facturas a crédito (PPD) registradas en esta sucursal.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--caanma-border)' }}>
              <tr>
                <th style={{ padding: '1rem', width: '40px', textAlign: 'center' }}>
                  <input 
                    type="checkbox" 
                    onChange={handleSelectAll}
                    checked={selectedIds.length > 0 && selectedIds.length === sales.length}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                </th>
                <th style={{ padding: '1rem', color: '#64748b', fontWeight: '500' }}>Fecha / Venta</th>
                <th style={{ padding: '1rem', color: '#64748b', fontWeight: '500' }}>Cliente Fiscal</th>
                <th style={{ padding: '1rem', color: '#64748b', fontWeight: '500' }}>Monto Total</th>
                <th style={{ padding: '1rem', color: '#64748b', fontWeight: '500' }}>Facturapi UUID</th>
                <th style={{ padding: '1rem', color: '#64748b', fontWeight: '500', textAlign: 'right' }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => {
                const isSelected = selectedIds.includes(sale.id);
                return (
                  <tr 
                    key={sale.id} 
                    style={{ 
                      borderBottom: '1px solid var(--caanma-border)',
                      backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.03)' : 'transparent'
                    }}
                  >
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={isSelected}
                        onChange={() => handleSelectSale(sale.id, sale.total)}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: 'bold' }}>#{sale.folio || sale.id.substring(0, 8).toUpperCase()}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{new Date(sale.createdAt).toLocaleDateString()}</div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: '500', color: '#1e293b' }}>
                        {sale.customer ? (sale.customer.legalName || sale.customer.name) : 'Público en General'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>RFC: {sale.customer?.taxId || 'XAXX010101000'}</div>
                    </td>
                    <td style={{ padding: '1rem', fontWeight: 'bold', color: '#0f172a' }}>
                      ${sale.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '1rem', fontFamily: 'monospace', fontSize: '0.8rem', color: '#475569' }}>
                      {sale.invoiceId}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <button 
                        onClick={() => {
                          setSelectedIds([sale.id]);
                          setPaymentAmounts({ [sale.id]: sale.total.toString() });
                          setIsModalOpen(true);
                        }}
                        style={{
                          padding: '0.4rem 0.8rem',
                          backgroundColor: '#f1f5f9',
                          color: '#0f172a',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          fontSize: '0.8rem'
                        }}
                      >
                        Emitir REP
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Dialog */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          color: '#1e293b'
        }}>
          <div className="card" style={{ 
            width: '90%', 
            maxWidth: '520px', 
            maxHeight: '90vh', 
            overflowY: 'auto', 
            padding: '2rem', 
            backgroundColor: 'white', 
            borderRadius: '16px' 
          }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CreditCard size={22} color="var(--caanma-primary)" />
              Emitir Complemento de Pago
            </h3>
            
            <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
              <div style={{ fontWeight: 'bold', color: '#475569', marginBottom: '0.5rem' }}>DATOS DEL RECEPTOR:</div>
              <div>Razón Social: <strong>{selectedSales[0]?.customer?.legalName || selectedSales[0]?.customer?.name}</strong></div>
              <div>RFC: <strong>{selectedSales[0]?.customer?.taxId || 'XAXX010101000'}</strong></div>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Invoices List inside Modal to adjust amounts */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.5rem' }}>
                  Abono por cada Factura:
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '180px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                  {selectedSales.map(sale => (
                    <div key={sale.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem', backgroundColor: '#f1f5f9', borderRadius: '6px', fontSize: '0.85rem' }}>
                      <span style={{ fontWeight: 'bold' }}>#{sale.folio || sale.id.substring(0,8).toUpperCase()} (Total ${sale.total.toFixed(2)})</span>
                      <input 
                        type="number" 
                        step="0.01"
                        max={sale.total}
                        min="0.01"
                        value={paymentAmounts[sale.id] || ''}
                        onChange={e => setPaymentAmounts(prev => ({ ...prev, [sale.id]: e.target.value }))}
                        style={{ width: '100px', padding: '0.35rem', border: '1px solid #cbd5e1', borderRadius: '4px', textAlign: 'right', fontWeight: 'bold' }}
                        required
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Total display */}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #e2e8f0', paddingTop: '0.75rem', fontSize: '1.1rem' }}>
                <span style={{ color: '#475569', fontWeight: 'bold' }}>Total a Registrar:</span>
                <span style={{ fontWeight: '900', color: 'var(--caanma-primary)' }}>
                  ${totalPaymentSum.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.5rem' }}>Forma de Pago *</label>
                <select 
                  value={paymentForm}
                  onChange={e => setPaymentForm(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: 'white', fontSize: '0.9rem' }}
                >
                  <option value="01">Efectivo (01)</option>
                  <option value="02">Cheque nominativo (02)</option>
                  <option value="03">Transferencia electrónica (03)</option>
                  <option value="04">Tarjeta de crédito (04)</option>
                  <option value="28">Tarjeta de débito (28)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.5rem' }}>Fecha de Recepción del Pago *</label>
                <input 
                  type="date" 
                  value={paymentDate} 
                  onChange={e => setPaymentDate(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  style={{ flex: 1, padding: '0.75rem', backgroundColor: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', color: '#475569' }}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={isProcessing}
                  style={{ flex: 1.5, padding: '0.75rem', backgroundColor: 'var(--caanma-primary)', color: 'white', border: 'none', borderRadius: '8px', cursor: isProcessing ? 'not-allowed' : 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                  {isProcessing ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
                  {isProcessing ? 'Timbrando REP...' : 'Timbrar REP'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
