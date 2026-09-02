'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Search, Loader2, ArrowRight, CheckCircle, FileText, AlertTriangle, Mail, Send, MessageCircle } from 'lucide-react';
import { searchSaleForReturn, createCreditNoteAction, sendCreditNoteEmailAction } from '@/app/actions/creditNote';

export default function DevolucionesNuevoClient() {
  const [step, setStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  
  // Loaded sale details
  const [sale, setSale] = useState<any>(null);

  // Form states
  const [noteType, setNoteType] = useState<'03' | '01'>('03'); // '03' = Devolución Física, '01' = Bonificación / Descuento
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [taxRate, setTaxRate] = useState<number>(0.16); // default 16% IVA
  const [returnQuantities, setReturnQuantities] = useState<{ [saleItemId: string]: number }>({});
  const [reason, setReason] = useState('');
  const [cfdiUse, setCfdiUse] = useState('G02');
  const [paymentForm, setPaymentForm] = useState('01');

  // Submit states
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveResult, setSaveResult] = useState<any>(null);

  // Email modal / send states
  const [emailToSend, setEmailToSend] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchError(null);
    setSale(null);

    const res = await searchSaleForReturn(searchQuery.trim());
    setIsSearching(false);

    if (res.success && res.sale) {
      setSale(res.sale);
      
      // Initialize return quantities to 0
      const initialQty: { [key: string]: number } = {};
      res.sale.items.forEach((item: any) => {
        const alreadyReturned = (res.sale.returns || []).reduce((sum: number, ret: any) => {
          const retItem = ret.items.find((i: any) => i.saleItemId === item.id);
          return sum + (retItem ? retItem.quantity : 0);
        }, 0);
        
        item.maxReturn = Math.max(0, item.quantity - alreadyReturned);
        initialQty[item.id] = 0;
      });

      setReturnQuantities(initialQty);

      // Preselect default payment form
      if (res.sale.paymentMethod === 'CREDIT') {
        setPaymentForm('17'); // Compensación
      } else {
        setPaymentForm('01'); // Efectivo
      }

      if (res.sale.customer?.email) {
        setEmailToSend(res.sale.customer.email);
      }

      setStep(2);
    } else {
      setSearchError(res.error || 'No se encontró la venta o factura con el criterio ingresado.');
    }
  };

  const handleQtyChange = (itemId: string, val: number, max: number) => {
    const qty = Math.min(max, Math.max(0, val));
    setReturnQuantities(prev => ({ ...prev, [itemId]: qty }));
  };

  // Calculate dynamic totals for preview
  const getTotals = () => {
    if (!sale) return { subtotal: 0, iva: 0, total: 0 };

    if (noteType === '03') {
      // Option A: Devolución Física
      let total = 0;
      sale.items.forEach((item: any) => {
        const qty = returnQuantities[item.id] || 0;
        total += qty * item.price;
      });
      const subtotal = total / (1 + 0.16);
      const iva = total - subtotal;
      return { 
        subtotal: Number(subtotal.toFixed(2)), 
        iva: Number(iva.toFixed(2)), 
        total: Number(total.toFixed(2)) 
      };
    } else {
      // Option B: Descuento Comercial / Bonificación
      const total = discountAmount;
      const subtotal = total / (1 + taxRate);
      const iva = total - subtotal;
      return { 
        subtotal: Number(subtotal.toFixed(2)), 
        iva: Number(iva.toFixed(2)), 
        total: Number(total.toFixed(2)) 
      };
    }
  };

  const { subtotal, iva, total: refundTotal } = getTotals();

  const handleSaveNCR = async () => {
    if (!sale) return;
    setIsSaving(true);
    setSaveError(null);

    const payload: any = {
      saleId: sale.id,
      type: noteType,
      reason,
      cfdiUse,
      paymentForm
    };

    if (noteType === '03') {
      const items = Object.entries(returnQuantities)
        .filter(([_, qty]) => qty > 0)
        .map(([itemId, qty]) => {
          const orig = sale.items.find((i: any) => i.id === itemId);
          return {
            saleItemId: itemId,
            productId: orig.productId,
            quantity: qty,
            refundPrice: orig.price
          };
        });

      if (items.length === 0) {
        setSaveError("Debes seleccionar al menos un artículo para devolver.");
        setIsSaving(false);
        return;
      }
      payload.returnedItems = items;
    } else {
      if (discountAmount <= 0) {
        setSaveError("El monto del descuento debe ser mayor a $0.00.");
        setIsSaving(false);
        return;
      }
      payload.amount = discountAmount;
      payload.taxRate = taxRate;
    }

    const res = await createCreditNoteAction(payload);
    setIsSaving(false);

    if (res.success) {
      setSaveResult(res);
      setStep(4);
    } else {
      setSaveError(res.error || 'Ocurrió un error al procesar y timbrar la Nota de Crédito.');
    }
  };

  const handleSendEmail = async () => {
    if (!emailToSend.trim() || !saveResult?.id) return;
    setIsSendingEmail(true);
    setEmailStatus(null);
    try {
      const res = await sendCreditNoteEmailAction(saveResult.id, emailToSend.trim());
      if (res.success) {
        setEmailStatus({ success: true, message: 'Correo enviado exitosamente con PDF y XML adjuntos.' });
      } else {
        setEmailStatus({ success: false, message: res.error || 'No se pudo enviar el correo.' });
      }
    } catch (err: any) {
      setEmailStatus({ success: false, message: err.message || 'Error al enviar correo.' });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleShareWhatsApp = () => {
    const customerPhone = sale?.customer?.phone?.replace(/\D/g, '') || '';
    const folio = sale?.folio || sale?.id?.slice(0, 8);
    const amountStr = refundTotal.toFixed(2);
    let msg = `Hola ${sale?.customer?.name || ''}, te compartimos tu Nota de Crédito por $${amountStr} MXN relacionada a tu compra #${folio}.`;
    if (saveResult?.pdfUrl) {
      msg += ` Puedes descargar tu PDF oficial aquí: ${saveResult.pdfUrl}`;
    }
    const url = customerPhone
      ? `https://wa.me/${customerPhone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', fontFamily: 'var(--font-geist-sans)', paddingBottom: '4rem' }}>
      
      {/* Step Progress Indicator */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', backgroundColor: '#f8fafc', padding: '1rem 2rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        {[
          { num: 1, label: '1. Buscar Origen' },
          { num: 2, label: '2. Definir Ajustes' },
          { num: 3, label: '3. Parámetros SAT' },
          { num: 4, label: '4. Completado' }
        ].map((s) => (
          <div key={s.num} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: step === s.num ? '#f43f5e' : step > s.num ? '#10b981' : '#cbd5e1',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              fontSize: '0.85rem'
            }}>
              {s.num}
            </div>
            <span style={{ fontSize: '0.9rem', fontWeight: step === s.num ? 'bold' : 'normal', color: step === s.num ? '#0f172a' : '#64748b' }}>
              {s.label}
            </span>
            {s.num < 4 && <ArrowRight size={14} color="#94a3b8" style={{ marginLeft: '1rem' }} />}
          </div>
        ))}
      </div>

      {/* STEP 1: Search Form */}
      {step === 1 && (
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem' }}>
            <Link href="/facturas/notas-credito" style={{ textDecoration: 'none', color: '#f43f5e', fontSize: '1rem', fontWeight: '500' }}>
              ← Volver al Panel de Notas de Crédito
            </Link>
          </div>

          <form onSubmit={handleSearch} className="card" style={{ padding: '3.5rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }}>
            <div style={{ textAlign: 'center', maxWidth: '500px' }}>
              <div style={{ width: '80px', height: '80px', backgroundColor: '#ffe4e6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: '#f43f5e' }}>
                <Search size={40} />
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#0f172a' }}>Buscar Factura / Venta Origen</h2>
              <p style={{ color: '#64748b', fontSize: '0.95rem', marginBottom: '2rem' }}>
                Ingresa el Folio de venta (ej. V-1001) o el Folio Fiscal (UUID) del comprobante que deseas afectar con la Nota de Crédito.
              </p>

              {searchError && (
                <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c', padding: '0.75rem', borderRadius: '6px', fontSize: '0.9rem', marginBottom: '1.5rem', textAlign: 'left' }}>
                  {searchError}
                </div>
              )}

              <input 
                type="text" 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                required 
                placeholder="Folio ej. V-1001 o UUID..." 
                style={{ width: '100%', padding: '0.85rem', borderRadius: '8px', border: '2px solid #cbd5e1', fontSize: '1.1rem', textAlign: 'center', marginBottom: '1.5rem', outline: 'none', transition: 'border-color 0.2s' }}
                onFocus={(e) => e.target.style.borderColor = '#f43f5e'}
                onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
              />

              <button 
                type="submit" 
                className="btn-primary" 
                disabled={isSearching}
                style={{ width: '100%', padding: '0.85rem', fontSize: '1.1rem', backgroundColor: '#f43f5e', borderColor: '#f43f5e', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer' }}
              >
                {isSearching ? <Loader2 className="animate-spin" size={20} /> : null}
                {isSearching ? 'Buscando...' : 'Buscar Comprobante'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* STEP 2: Configure adjustments */}
      {step === 2 && sale && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer', fontSize: '1rem', fontWeight: '500' }}>
              ← Cambiar Comprobante
            </button>
            <span style={{ fontSize: '0.9rem', color: '#64748b' }}>
              Folio: <strong>{sale.folio || sale.id.substring(0,8).toUpperCase()}</strong> | Cliente: <strong>{sale.customer?.name || 'Público General'}</strong> | Total: <strong>${sale.total.toFixed(2)}</strong>
            </span>
          </div>

          {/* Alert if not invoiced in SAT */}
          {!sale.invoiceId && (
            <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fef3c7', color: '#b45309', padding: '1rem', borderRadius: '8px', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: '0.15rem' }} />
              <div>
                <strong style={{ display: 'block', marginBottom: '0.15rem' }}>Aviso de Registro Administrativo</strong>
                Esta venta no cuenta con factura del SAT vinculada. Se registrará la nota de crédito y el reingreso de inventario/saldo a nivel administrativo interno sin timbrado de CFDI de egreso.
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '2rem' }}>
            {/* Left Column: Form & Items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div className="card" style={{ padding: '2rem' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1.25rem' }}>Tipo de Ajuste Requerido</h3>
                
                {/* Select between Option A and Option B */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                  <button 
                    onClick={() => setNoteType('03')}
                    style={{
                      padding: '1rem',
                      borderRadius: '8px',
                      border: '2px solid',
                      borderColor: noteType === '03' ? '#f43f5e' : '#e2e8f0',
                      backgroundColor: noteType === '03' ? '#fff1f2' : 'white',
                      color: noteType === '03' ? '#e11d48' : '#0f172a',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontWeight: 'bold',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>Por Devolución</div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: '#64748b' }}>
                      Reintegra productos físicos al inventario y genera el movimiento en Kardex.
                    </span>
                  </button>

                  <button 
                    onClick={() => setNoteType('01')}
                    style={{
                      padding: '1rem',
                      borderRadius: '8px',
                      border: '2px solid',
                      borderColor: noteType === '01' ? '#f43f5e' : '#e2e8f0',
                      backgroundColor: noteType === '01' ? '#fff1f2' : 'white',
                      color: noteType === '01' ? '#e11d48' : '#0f172a',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontWeight: 'bold',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>Por Bonificación / Descuento</div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: '#64748b' }}>
                      Acreditación monetaria directa. No afecta las existencias físicas del almacén.
                    </span>
                  </button>
                </div>

                {/* Option A View: List Items */}
                {noteType === '03' ? (
                  <div>
                    <h4 style={{ fontWeight: 'bold', marginBottom: '0.75rem', fontSize: '0.95rem', color: '#475569' }}>Selecciona los artículos a devolver:</h4>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid #cbd5e1', textAlign: 'left' }}>
                            <th style={{ padding: '0.5rem' }}>Producto</th>
                            <th style={{ padding: '0.5rem', textAlign: 'center' }}>Vendido</th>
                            <th style={{ padding: '0.5rem', textAlign: 'center' }}>Disponible</th>
                            <th style={{ padding: '0.5rem', width: '100px', textAlign: 'right' }}>Devolver</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sale.items.map((item: any) => (
                            <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '0.75rem 0.5rem' }}>
                                <div style={{ fontWeight: '500' }}>{item.product.name}</div>
                                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>SKU: {item.product.sku || 'N/A'} | ${item.price.toFixed(2)}</span>
                              </td>
                              <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>{item.quantity}</td>
                              <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontWeight: 'bold', color: item.maxReturn === 0 ? '#94a3b8' : 'inherit' }}>
                                {item.maxReturn}
                              </td>
                              <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                                <input 
                                  type="number"
                                  min="0"
                                  max={item.maxReturn}
                                  value={returnQuantities[item.id] || 0}
                                  onChange={e => handleQtyChange(item.id, parseInt(e.target.value) || 0, item.maxReturn)}
                                  disabled={item.maxReturn === 0}
                                  style={{
                                    width: '65px',
                                    padding: '0.25rem 0.5rem',
                                    borderRadius: '4px',
                                    border: '1px solid #cbd5e1',
                                    textAlign: 'center',
                                    outline: 'none'
                                  }}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  // Option B View: Amount input
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#475569' }}>
                        Monto Total a Acreditar (con IVA incluido):
                      </label>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '0.75rem', top: '0.6rem', color: '#64748b', fontWeight: 'bold' }}>$</span>
                        <input 
                          type="number" 
                          step="0.01"
                          min="0.01"
                          max={sale.total}
                          value={discountAmount}
                          onChange={e => setDiscountAmount(parseFloat(e.target.value) || 0)}
                          style={{ width: '100%', padding: '0.5rem 0.5rem 0.5rem 1.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '1.1rem', outline: 'none' }}
                        />
                      </div>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem', display: 'block' }}>
                        El monto máximo es el total de la venta original: <strong>${sale.total.toFixed(2)}</strong>.
                      </span>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#475569' }}>
                        Tasa de IVA aplicada a la bonificación:
                      </label>
                      <select 
                        value={taxRate}
                        onChange={e => setTaxRate(parseFloat(e.target.value))}
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.95rem', outline: 'none' }}
                      >
                        <option value="0.16">16% IVA (Tasa General)</option>
                        <option value="0.08">8% IVA (Zona Fronteriza)</option>
                        <option value="0">0% IVA (Tasa Cero / Exento)</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Preview & Apply Button */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="card" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                  Resumen de Acreditación
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.95rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Subtotal:</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>IVA:</span>
                    <span>${iva.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.1rem', borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem', marginTop: '0.25rem', color: '#f43f5e' }}>
                    <span>Total de Nota:</span>
                    <span>${refundTotal.toFixed(2)}</span>
                  </div>
                </div>

                <div style={{ marginTop: '1.5rem', fontSize: '0.85rem', color: '#64748b', backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '6px' }}>
                  {sale.customer ? (
                    <div>
                      {sale.paymentMethod === 'CREDIT' && sale.balanceDue > 0 ? (
                        <span>
                          💳 <strong>Venta a Crédito:</strong> Se aplicará como abono para amortizar la deuda de <strong>${sale.balanceDue.toFixed(2)}</strong> del cliente.
                        </span>
                      ) : (
                        <span>
                          👛 <strong>Venta Pagada:</strong> El importe se abonará automáticamente como <strong>Saldo a Favor</strong> (Monedero) del cliente para futuras compras.
                        </span>
                      )}
                    </div>
                  ) : (
                    <span>Se registrará la salida del reembolso administrativo.</span>
                  )}
                </div>

                <button 
                  onClick={() => setStep(3)}
                  disabled={refundTotal <= 0}
                  className="btn-primary"
                  style={{ width: '100%', padding: '0.75rem', fontSize: '1.05rem', backgroundColor: '#f43f5e', borderColor: '#f43f5e', borderRadius: '6px', marginTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: refundTotal <= 0 ? 'not-allowed' : 'pointer' }}
                >
                  Siguiente Paso <ArrowRight size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: Preview and CFDI config */}
      {step === 3 && sale && (
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div>
            <button onClick={() => setStep(2)} style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer', fontSize: '1rem', fontWeight: '500' }}>
              ← Modificar Importes y Partidas
            </button>
          </div>

          {saveError && (
            <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c', padding: '1rem', borderRadius: '8px', fontSize: '0.95rem' }}>
              {saveError}
            </div>
          )}

          <div className="card" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 'bold', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
              Parámetros Fiscales del SAT (CFDI 4.0)
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {sale.invoiceId && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#475569' }}>
                      Clave de Uso del CFDI (SAT):
                    </label>
                    <select 
                      value={cfdiUse}
                      onChange={e => setCfdiUse(e.target.value)}
                      style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.95rem', outline: 'none' }}
                    >
                      <option value="G02">G02 - Devoluciones, descuentos o bonificaciones</option>
                      <option value="S01">S01 - Sin efectos fiscales</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#475569' }}>
                      Forma de Pago del SAT (CFDI):
                    </label>
                    <select 
                      value={paymentForm}
                      onChange={e => setPaymentForm(e.target.value)}
                      style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.95rem', outline: 'none' }}
                    >
                      <option value="01">01 - Efectivo</option>
                      <option value="03">03 - Transferencia electrónica de fondos</option>
                      <option value="04">04 - Tarjeta de crédito</option>
                      <option value="28">28 - Tarjeta de débito</option>
                      <option value="17">17 - Compensación (Amortización de Saldo / Crédito)</option>
                      <option value="15">15 - Condonación</option>
                      <option value="99">99 - Por definir</option>
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#475569' }}>
                  Motivo de la Nota de Crédito:
                </label>
                <textarea 
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="Ej. Devolución de producto por defecto, bonificación por precio pactado, etc..."
                  rows={3}
                  required
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.95rem', outline: 'none', resize: 'vertical' }}
                />
              </div>

              <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ fontWeight: 'bold', marginBottom: '0.75rem', fontSize: '1rem', color: '#0f172a' }}>Resumen de la Transacción</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.9rem', color: '#475569' }}>
                  <div>• Comprobante Origen: <strong>{sale.folio || sale.id}</strong></div>
                  <div>• Cliente: <strong>{sale.customer?.name || 'Público en General'}</strong> ({sale.customer?.taxId || 'XAXX010101000'})</div>
                  <div>• Modalidad: <strong>{noteType === '03' ? 'Devolución de Mercancía (Kardex)' : 'Bonificación / Descuento Directo'}</strong></div>
                  <div>• Tipo de CFDI: <strong>Egreso (Tipo E)</strong> | Método: <strong>PUE</strong></div>
                  <div style={{ fontSize: '1.15rem', color: '#f43f5e', fontWeight: 'bold', marginTop: '0.5rem' }}>
                    • Total a Acreditar: ${refundTotal.toFixed(2)} MXN
                  </div>
                </div>
              </div>

              <button 
                onClick={handleSaveNCR}
                disabled={isSaving}
                className="btn-primary"
                style={{ width: '100%', padding: '1rem', fontSize: '1.15rem', backgroundColor: '#f43f5e', borderColor: '#f43f5e', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: isSaving ? 'not-allowed' : 'pointer' }}
              >
                {isSaving ? <Loader2 className="animate-spin" size={22} /> : null}
                {isSaving ? 'Procesando y Timbrando en SAT...' : 'Autorizar y Timbrar Nota de Crédito'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: Success / Completed page */}
      {step === 4 && saveResult && (
        <div style={{ maxWidth: '650px', margin: '0 auto', textAlign: 'center' }}>
          <div className="card" style={{ padding: '3.5rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center' }}>
            
            <div style={{ width: '80px', height: '80px', backgroundColor: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
              <CheckCircle size={45} />
            </div>

            <h2 style={{ fontSize: '1.6rem', fontWeight: 'bold', color: '#0f172a' }}>
              ¡Nota de Crédito Procesada con Éxito!
            </h2>

            <p style={{ color: '#64748b', fontSize: '1rem', maxWidth: '500px', margin: '0 auto' }}>
              El movimiento se ha registrado y los saldos del cliente e inventarios fueron actualizados en tiempo real.
            </p>

            {saveResult.uuid ? (
              <div style={{ width: '100%', backgroundColor: '#f8fafc', padding: '1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'left' }}>
                <h4 style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#475569', marginBottom: '0.5rem' }}>Detalles de Certificación Fiscal SAT:</h4>
                <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div>• Folio Fiscal (UUID): <strong style={{ color: '#0f172a', wordBreak: 'break-all' }}>{saveResult.uuid}</strong></div>
                  <div>• Tipo de Comprobante: <strong style={{ color: '#16a34a' }}>E (Egreso - CFDI 4.0)</strong></div>
                </div>
              </div>
            ) : (
              <div style={{ width: '100%', backgroundColor: '#fef3c7', padding: '1rem', borderRadius: '8px', border: '1px solid #fde68a', color: '#b45309', textAlign: 'left', fontSize: '0.9rem' }}>
                Nota: Este movimiento se guardó como un ajuste interno local de inventario y saldos puesto que el comprobante original no tenía factura del SAT.
              </div>
            )}

            {/* Download PDF/XML files buttons */}
            {saveResult.pdfUrl && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', width: '100%' }}>
                <a 
                  href={saveResult.pdfUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="btn-primary" 
                  style={{
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '0.5rem', 
                    textDecoration: 'none', 
                    backgroundColor: '#475569', 
                    borderColor: '#475569',
                    padding: '0.75rem',
                    borderRadius: '6px'
                  }}
                >
                  <FileText size={18} /> Descargar PDF
                </a>
                
                <a 
                  href={saveResult.xmlUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="btn-primary" 
                  style={{
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '0.5rem', 
                    textDecoration: 'none', 
                    backgroundColor: '#0f172a', 
                    borderColor: '#0f172a',
                    padding: '0.75rem',
                    borderRadius: '6px'
                  }}
                >
                  <FileText size={18} /> Descargar XML
                </a>
              </div>
            )}

            {/* Email & WhatsApp Sharing section */}
            <div style={{ width: '100%', borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input 
                  type="email" 
                  value={emailToSend}
                  onChange={e => setEmailToSend(e.target.value)}
                  placeholder="correo@cliente.com" 
                  style={{ flex: 1, padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none' }}
                />
                <button
                  type="button"
                  onClick={handleSendEmail}
                  disabled={isSendingEmail || !emailToSend.trim()}
                  style={{
                    padding: '0.6rem 1rem',
                    borderRadius: '6px',
                    backgroundColor: '#2563eb',
                    color: 'white',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    cursor: isSendingEmail || !emailToSend.trim() ? 'not-allowed' : 'pointer',
                    fontWeight: '500',
                    fontSize: '0.9rem'
                  }}
                >
                  {isSendingEmail ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  Enviar Correo
                </button>
              </div>

              {emailStatus && (
                <div style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  textAlign: 'left',
                  backgroundColor: emailStatus.success ? '#dcfce7' : '#fee2e2',
                  color: emailStatus.success ? '#166534' : '#991b1b',
                  border: `1px solid ${emailStatus.success ? '#86efac' : '#fca5a5'}`
                }}>
                  {emailStatus.message}
                </div>
              )}

              <button
                type="button"
                onClick={handleShareWhatsApp}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '6px',
                  backgroundColor: '#16a34a',
                  color: 'white',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '0.95rem'
                }}
              >
                <MessageCircle size={18} />
                Compartir por WhatsApp
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', width: '100%', marginTop: '1rem' }}>
              <Link href="/facturas/notas-credito" className="btn-primary" style={{ padding: '0.85rem', textDecoration: 'none', backgroundColor: '#f43f5e', borderColor: '#f43f5e', borderRadius: '6px', fontWeight: 'bold' }}>
                Ver Notas de Crédito
              </Link>
              <Link href={`/ventas/detalle/${sale.id}`} style={{ padding: '0.85rem', textDecoration: 'none', backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                Ver Venta Original
              </Link>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
