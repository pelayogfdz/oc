'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Search, Loader2, ArrowRight, HelpCircle, CheckCircle, FileText, AlertTriangle } from 'lucide-react';
import { searchSaleForReturn, createCreditNoteAction } from '@/app/actions/creditNote';

export default function DevolucionesNuevoClient() {
  const [step, setStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  
  // Loaded sale details
  const [sale, setSale] = useState<any>(null);

  // Form states
  const [noteType, setNoteType] = useState<'03' | '01'>('03'); // '03' = Devolución, '01' = Descuento
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [taxRate, setTaxRate] = useState<number>(0.16); // default 16% IVA
  const [returnQuantities, setReturnQuantities] = useState<{ [saleItemId: string]: number }>({});
  const [reason, setReason] = useState('');
  const [cfdiUse, setCfdiUse] = useState('G02');

  // Submit states
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveResult, setSaveResult] = useState<any>(null);

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
        // Calculate max allowed return (quantity sold minus what's already returned)
        const alreadyReturned = (res.sale.returns || []).reduce((sum: number, ret: any) => {
          const retItem = ret.items.find((i: any) => i.saleItemId === item.id);
          return sum + (retItem ? retItem.quantity : 0);
        }, 0);
        
        item.maxReturn = Math.max(0, item.quantity - alreadyReturned);
        initialQty[item.id] = 0;
      });

      setReturnQuantities(initialQty);
      setStep(2);
    } else {
      setSearchError(res.error || 'No se encontró la venta.');
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
      const subtotal = total / (1 + 0.16); // Assuming standard 16% IVA on items
      const iva = total - subtotal;
      return { 
        subtotal: Number(subtotal.toFixed(2)), 
        iva: Number(iva.toFixed(2)), 
        total: Number(total.toFixed(2)) 
      };
    } else {
      // Option B: Descuento Comercial
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
      cfdiUse
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
      setSaveError(res.error || 'Ocurrió un error al procesar la Nota de Crédito.');
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', fontFamily: 'var(--font-geist-sans)', paddingBottom: '4rem' }}>
      
      {/* Step Progress Indicator */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', backgroundColor: '#f8fafc', padding: '1rem 2rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        {[
          { num: 1, label: 'Buscar Origen' },
          { num: 2, label: 'Definir Ajustes' },
          { num: 3, label: 'Vista Previa' },
          { num: 4, label: 'Completado' }
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
            <Link href="/ventas/devoluciones" style={{ textDecoration: 'none', color: '#f43f5e', fontSize: '1rem', fontWeight: '500' }}>
              ← Volver al Panel
            </Link>
          </div>

          <form onSubmit={handleSearch} className="card" style={{ padding: '3.5rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }}>
            <div style={{ textAlign: 'center', maxWidth: '500px' }}>
              <div style={{ width: '80px', height: '80px', backgroundColor: '#ffe4e6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: '#f43f5e' }}>
                <Search size={40} />
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#0f172a' }}>Buscar Factura / Venta Origen</h2>
              <p style={{ color: '#64748b', fontSize: '0.95rem', marginBottom: '2rem' }}>
                Ingresa el ID (UUID) o Folio del comprobante original para vincular y aplicar la Nota de Crédito.
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
                placeholder="Folio ej. V-1001 o ID..." 
                style={{ width: '100%', padding: '0.85rem', borderRadius: '8px', border: '2px solid #cbd5e1', fontSize: '1.1rem', textAlign: 'center', marginBottom: '1.5rem', outline: 'none', transition: 'border-color 0.2s' }}
                onFocus={(e) => e.target.style.borderColor = '#f43f5e'}
                onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
              />

              <button 
                type="submit" 
                className="btn-primary" 
                disabled={isSearching}
                style={{ width: '100%', padding: '0.85rem', fontSize: '1.1rem', backgroundColor: '#f43f5e', borderColor: '#f43f5e', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
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
              Factura/Folio: <strong>{sale.folio || sale.id.substring(0,8).toUpperCase()}</strong> | Cliente: <strong>{sale.customer?.name || 'Público General'}</strong>
            </span>
          </div>

          {/* Alert if not invoiced in SAT */}
          {!sale.invoiceId && (
            <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fef3c7', color: '#b45309', padding: '1rem', borderRadius: '8px', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: '0.15rem' }} />
              <div>
                <strong style={{ display: 'block', marginBottom: '0.15rem' }}>Aviso de Registro Local Únicamente</strong>
                Esta venta no está timbrada en el SAT (no tiene factura vinculada). Se registrará la devolución localmente (reintegro de stock y saldo a favor en Caanma), pero **no se emitirá ningún CFDI fiscal de egreso**.
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
                    <div style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>Opción A: Devolución</div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: '#64748b' }}>
                      Reintegra mercancía física al almacén e incrementa el inventario.
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
                    <div style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>Opción B: Descuento</div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: '#64748b' }}>
                      Ajuste comercial directo en dinero. No afecta el inventario físico.
                    </span>
                  </button>
                </div>

                {/* Option A View: List Items */}
                {noteType === '03' ? (
                  <div>
                    <h4 style={{ fontWeight: 'bold', marginBottom: '0.75rem', fontSize: '0.95rem', color: '#475569' }}>Selecciona artículos a devolver:</h4>
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
                        Monto del Descuento / Ajuste (Total con IVA):
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
                        El descuento máximo permitido es el total de la venta original: <strong>${sale.total.toFixed(2)}</strong>.
                      </span>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#475569' }}>
                        Tasa de IVA aplicada al descuento:
                      </label>
                      <select 
                        value={taxRate}
                        onChange={e => setTaxRate(parseFloat(e.target.value))}
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.95rem', outline: 'none' }}
                      >
                        <option value="0.16">16% IVA (Estándar)</option>
                        <option value="0.08">8% IVA (Frontera)</option>
                        <option value="0">0% IVA</option>
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
                  Resumen de Reembolso
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
                    <span>Total a Acreditar:</span>
                    <span>${refundTotal.toFixed(2)}</span>
                  </div>
                </div>

                <div style={{ marginTop: '1.5rem', fontSize: '0.85rem', color: '#64748b', backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '6px' }}>
                  {sale.customer ? (
                    <div>
                      {sale.paymentMethod === 'CREDIT' ? (
                        <span>
                          La venta fue a crédito. La Nota de Crédito se aplicará como **Abono** para liquidar o disminuir la deuda de <strong>${sale.balanceDue.toFixed(2)}</strong> del cliente.
                        </span>
                      ) : (
                        <span>
                          La venta fue de contado. El total se abonará como **Saldo a Favor** (Crédito de Tienda) del cliente.
                        </span>
                      )}
                    </div>
                  ) : (
                    <span>Se registrará la salida del reembolso local.</span>
                  )}
                </div>

                <button 
                  onClick={() => setStep(3)}
                  disabled={refundTotal <= 0}
                  className="btn-primary"
                  style={{ width: '100%', padding: '0.75rem', fontSize: '1.05rem', backgroundColor: '#f43f5e', borderColor: '#f43f5e', borderRadius: '6px', marginTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
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
              ← Modificar Reembolso
            </button>
          </div>

          {saveError && (
            <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c', padding: '1rem', borderRadius: '8px', fontSize: '0.95rem' }}>
              {saveError}
            </div>
          )}

          <div className="card" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 'bold', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
              Información Fiscal y Motivo
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {sale.invoiceId && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#475569' }}>
                    Clave de Uso del CFDI (SAT):
                  </label>
                  <select 
                    value={cfdiUse}
                    onChange={e => setCfdiUse(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.95rem', outline: 'none' }}
                  >
                    <option value="G02">G02 - Devoluciones, descuentos o bonificaciones</option>
                    <option value="S01">S01 - Sin efectos fiscales</option>
                  </select>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#475569' }}>
                  Motivo de la Nota de Crédito:
                </label>
                <textarea 
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="Ej. Devolución de producto por defecto, descuento por error de precio, etc..."
                  rows={4}
                  required
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.95rem', outline: 'none', resize: 'vertical' }}
                />
              </div>

              <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ fontWeight: 'bold', marginBottom: '0.75rem', fontSize: '1rem' }}>Resumen de Aplicación Final</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem', color: '#475569' }}>
                  <div>• Comprobante Origen: <strong>{sale.folio || sale.id}</strong></div>
                  <div>• Cliente: <strong>{sale.customer?.name || 'Público en General'}</strong></div>
                  <div>• Tipo de Operación: <strong>{noteType === '03' ? 'Devolución Física (Opción A)' : 'Descuento Comercial (Opción B)'}</strong></div>
                  <div>• Tasa de IVA: <strong>{taxRate * 100}%</strong></div>
                  <div style={{ fontSize: '1.1rem', color: '#f43f5e', fontWeight: 'bold', marginTop: '0.5rem' }}>
                    • Total Neto a Acreditar: ${refundTotal.toFixed(2)}
                  </div>
                </div>
              </div>

              <button 
                onClick={handleSaveNCR}
                disabled={isSaving}
                className="btn-primary"
                style={{ width: '100%', padding: '1rem', fontSize: '1.15rem', backgroundColor: '#f43f5e', borderColor: '#f43f5e', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                {isSaving ? <Loader2 className="animate-spin" size={22} /> : null}
                {isSaving ? 'Procesando y Timbrando...' : 'Confirmar y Autorizar Nota de Crédito'}
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
              ¡Nota de Crédito Procesada!
            </h2>

            <p style={{ color: '#64748b', fontSize: '1rem', maxWidth: '500px', margin: '0 auto 1.5rem' }}>
              El movimiento se ha registrado correctamente en el sistema local y se han actualizado los saldos del cliente.
            </p>

            {saveResult.uuid ? (
              <div style={{ width: '100%', backgroundColor: '#f8fafc', padding: '1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'left', marginBottom: '1.5rem' }}>
                <h4 style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#475569', marginBottom: '0.5rem' }}>Detalles de Certificación Fiscal SAT:</h4>
                <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div>• UUID de Nota de Crédito: <strong style={{ color: '#0f172a' }}>{saveResult.uuid}</strong></div>
                  <div>• Estado SAT: <strong style={{ color: '#16a34a' }}>Certificado (Egreso)</strong></div>
                </div>
              </div>
            ) : (
              <div style={{ width: '100%', backgroundColor: '#fef3c7', padding: '1rem', borderRadius: '8px', border: '1px solid #fde68a', color: '#b45309', textAlign: 'left', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                Nota: Este movimiento se guardó como un ajuste interno local de inventario y saldos puesto que el comprobante original no tenía factura del SAT.
              </div>
            )}

            {/* Download PDF/XML files buttons */}
            {saveResult.pdfUrl && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', width: '100%', marginBottom: '1.5rem' }}>
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

            <Link href="/ventas/devoluciones" className="btn-primary" style={{ width: '100%', padding: '0.85rem', textDecoration: 'none', backgroundColor: '#f43f5e', borderColor: '#f43f5e', borderRadius: '6px' }}>
              Finalizar y Volver al Panel
            </Link>
          </div>
        </div>
      )}

    </div>
  );
}
