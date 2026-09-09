'use client';

import { useState, useEffect, useTransition, useMemo } from 'react';
import { getPendingGlobalSales, stampGlobalInvoice } from '@/app/actions/facturacion';
import { 
  FileText, 
  Calendar, 
  PlusCircle, 
  Loader2, 
  RefreshCw, 
  ShoppingBag, 
  CreditCard, 
  Banknote, 
  ArrowLeftRight, 
  CheckSquare, 
  Square, 
  Sparkles, 
  Filter,
  Layers,
  Settings2,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

type PendingSale = {
  id: string;
  folio: string | null;
  total: number;
  paymentMethod: string;
  cashAmount?: number | null;
  cardAmount?: number | null;
  transferAmount?: number | null;
  createdAt: string | Date;
  customer?: {
    id: string;
    name: string;
    legalName: string | null;
    taxId: string | null;
  } | null;
};

type PaymentFilter = 'ALL' | 'CASH' | 'CARD_DEBIT' | 'CARD_CREDIT' | 'TRANSFER' | 'OTHER';

export default function GlobalesInvoiceClient() {
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10)); // Today
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10)); // Today
  const [pendingSales, setPendingSales] = useState<PendingSale[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activePaymentFilter, setActivePaymentFilter] = useState<PaymentFilter>('ALL');
  const [targetAmountInput, setTargetAmountInput] = useState<string>('');
  
  // SAT Invoicing Config
  const [satPaymentForm, setSatPaymentForm] = useState<string>('01');
  const [satPeriodicity, setSatPeriodicity] = useState<string>('day');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadPendingSales = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const result = await getPendingGlobalSales(startDate, endDate);
      if (result.success && result.sales) {
        setPendingSales(result.sales as PendingSale[]);
        setTotalAmount(result.total || 0);
        // By default select all sales
        const allIds = new Set((result.sales as PendingSale[]).map(s => s.id));
        setSelectedIds(allIds);
      } else {
        setErrorMessage(result.error || "Error al cargar ventas pendientes.");
      }
    } catch (err: any) {
      setErrorMessage("Excepción al cargar ventas: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPendingSales();
  }, [startDate, endDate]);

  // Adjust SAT Payment Form automatically when payment filter changes
  useEffect(() => {
    if (activePaymentFilter === 'CASH') setSatPaymentForm('01');
    else if (activePaymentFilter === 'CARD_DEBIT') setSatPaymentForm('28');
    else if (activePaymentFilter === 'CARD_CREDIT') setSatPaymentForm('04');
    else if (activePaymentFilter === 'TRANSFER') setSatPaymentForm('03');
  }, [activePaymentFilter]);

  // Quick date presets
  const handleSetDatePreset = (preset: 'today' | 'week' | 'month' | 'prevMonth') => {
    const today = new Date();
    if (preset === 'today') {
      const d = today.toISOString().slice(0, 10);
      setStartDate(d);
      setEndDate(d);
    } else if (preset === 'week') {
      const firstDay = new Date(today);
      firstDay.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1)); // Monday
      setStartDate(firstDay.toISOString().slice(0, 10));
      setEndDate(today.toISOString().slice(0, 10));
    } else if (preset === 'month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(firstDay.toISOString().slice(0, 10));
      setEndDate(today.toISOString().slice(0, 10));
    } else if (preset === 'prevMonth') {
      const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
      setStartDate(firstDay.toISOString().slice(0, 10));
      setEndDate(lastDay.toISOString().slice(0, 10));
    }
  };

  // Filtered sales based on active tab
  const filteredSales = useMemo(() => {
    if (activePaymentFilter === 'ALL') return pendingSales;
    if (activePaymentFilter === 'CASH') return pendingSales.filter(s => s.paymentMethod === 'CASH');
    if (activePaymentFilter === 'CARD_DEBIT') return pendingSales.filter(s => s.paymentMethod === 'CARD_DEBIT');
    if (activePaymentFilter === 'CARD_CREDIT') return pendingSales.filter(s => s.paymentMethod === 'CARD_CREDIT' || s.paymentMethod === 'CARD');
    if (activePaymentFilter === 'TRANSFER') return pendingSales.filter(s => s.paymentMethod === 'TRANSFER');
    return pendingSales.filter(s => !['CASH', 'CARD_DEBIT', 'CARD_CREDIT', 'CARD', 'TRANSFER'].includes(s.paymentMethod));
  }, [pendingSales, activePaymentFilter]);

  // Counts & Totals by Payment Method
  const paymentStats = useMemo(() => {
    const stats = {
      ALL: { count: pendingSales.length, total: pendingSales.reduce((acc, s) => acc + s.total, 0) },
      CASH: { count: 0, total: 0 },
      CARD_DEBIT: { count: 0, total: 0 },
      CARD_CREDIT: { count: 0, total: 0 },
      TRANSFER: { count: 0, total: 0 },
      OTHER: { count: 0, total: 0 }
    };

    pendingSales.forEach(s => {
      if (s.paymentMethod === 'CASH') {
        stats.CASH.count++;
        stats.CASH.total += s.total;
      } else if (s.paymentMethod === 'CARD_DEBIT') {
        stats.CARD_DEBIT.count++;
        stats.CARD_DEBIT.total += s.total;
      } else if (s.paymentMethod === 'CARD_CREDIT' || s.paymentMethod === 'CARD') {
        stats.CARD_CREDIT.count++;
        stats.CARD_CREDIT.total += s.total;
      } else if (s.paymentMethod === 'TRANSFER') {
        stats.TRANSFER.count++;
        stats.TRANSFER.total += s.total;
      } else {
        stats.OTHER.count++;
        stats.OTHER.total += s.total;
      }
    });

    return stats;
  }, [pendingSales]);

  // Selected Sales calculations
  const selectedSales = useMemo(() => {
    return pendingSales.filter(s => selectedIds.has(s.id));
  }, [pendingSales, selectedIds]);

  const selectedTotalAmount = useMemo(() => {
    return selectedSales.reduce((acc, s) => acc + s.total, 0);
  }, [selectedSales]);

  // Checkbox handlers
  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleSelectAllVisible = () => {
    const next = new Set(selectedIds);
    filteredSales.forEach(s => next.add(s.id));
    setSelectedIds(next);
  };

  const handleDeselectAllVisible = () => {
    const next = new Set(selectedIds);
    filteredSales.forEach(s => next.delete(s.id));
    setSelectedIds(next);
  };

  const handleSelectOnlyVisible = () => {
    const next = new Set<string>();
    filteredSales.forEach(s => next.add(s.id));
    setSelectedIds(next);
  };

  // Auto-select up to target amount
  const handleAutoSelectByAmount = () => {
    const target = parseFloat(targetAmountInput);
    if (isNaN(target) || target <= 0) {
      alert("Por favor ingresa un monto objetivo válido mayor a 0.");
      return;
    }

    const next = new Set<string>();
    let currentSum = 0;

    // Use current filtered sales
    for (const sale of filteredSales) {
      if (currentSum + sale.total <= target || next.size === 0) {
        next.add(sale.id);
        currentSum += sale.total;
      }
      if (currentSum >= target) break;
    }

    setSelectedIds(next);
  };

  const handleGenerateInvoice = () => {
    if (selectedSales.length === 0) {
      alert("Debes seleccionar al menos una venta para emitir la factura global.");
      return;
    }

    const msg = `¿Deseas emitir la factura global para las ${selectedSales.length} ventas seleccionadas?\n\n` +
      `• Monto Total a Facturar: ${formatCurrency(selectedTotalAmount)}\n` +
      `• Forma de Pago SAT: ${satPaymentForm}\n` +
      `• Periodicidad: ${satPeriodicity}\n\n` +
      `Esta acción timbrará el CFDI 4.0 ante el SAT y marcará los tickets como facturados.`;

    if (!confirm(msg)) {
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const selectedSaleIds = Array.from(selectedIds);
      const res = await stampGlobalInvoice(
        startDate, 
        endDate, 
        selectedSaleIds, 
        satPaymentForm, 
        satPeriodicity
      );

      if (res.success) {
        setSuccessMessage(`Factura global emitida exitosamente con ID Facturapi: ${res.invoiceId}`);
        loadPendingSales(); // reload list
      } else {
        setErrorMessage(res.error || 'Error al timbrar factura global.');
      }
    });
  };

  const getMethodBadge = (method: string) => {
    switch (method) {
      case 'CASH':
        return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600', backgroundColor: '#dcfce7', color: '#15803d' }}><Banknote size={12} /> Efectivo</span>;
      case 'CARD_DEBIT':
        return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600', backgroundColor: '#e0e7ff', color: '#4338ca' }}><CreditCard size={12} /> Débito</span>;
      case 'CARD_CREDIT':
      case 'CARD':
        return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600', backgroundColor: '#fef3c7', color: '#b45309' }}><CreditCard size={12} /> Crédito</span>;
      case 'TRANSFER':
        return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600', backgroundColor: '#f3e8ff', color: '#7e22ce' }}><ArrowLeftRight size={12} /> Transf.</span>;
      default:
        return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600', backgroundColor: '#f1f5f9', color: '#475569' }}>{method || 'Otro'}</span>;
    }
  };

  const isAllVisibleSelected = filteredSales.length > 0 && filteredSales.every(s => selectedIds.has(s.id));

  return (
    <div style={{ maxWidth: '1300px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#0f172a' }}>
            <FileText size={28} color="var(--caanma-primary)" />
            Facturación Global (CFDI 4.0)
          </h1>
          <p style={{ color: 'var(--caanma-text-muted)', marginTop: '0.25rem', fontSize: '0.95rem' }}>
            Agrupa, filtra por forma de pago y selecciona exactamente los tickets de venta a facturar a Público en General.
          </p>
        </div>
        <button 
          onClick={loadPendingSales} 
          disabled={loading}
          className="btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1rem', borderRadius: '8px', cursor: 'pointer', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', fontWeight: '600', fontSize: '0.9rem' }}
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Actualizar Ventas
        </button>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div style={{ backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <CheckCircle2 size={20} color="#059669" />
          <div style={{ fontWeight: '500' }}>{successMessage}</div>
        </div>
      )}

      {errorMessage && (
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <AlertCircle size={20} color="#dc2626" />
          <div style={{ fontWeight: '500' }}>{errorMessage}</div>
        </div>
      )}

      {/* Date Selectors & Presets */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem', border: '1px solid var(--caanma-border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#334155', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Calendar size={18} color="var(--caanma-primary)" /> Rango de Ventas a Consultar
          </span>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button type="button" onClick={() => handleSetDatePreset('today')} style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer' }}>Hoy</button>
            <button type="button" onClick={() => handleSetDatePreset('week')} style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer' }}>Esta Semana</button>
            <button type="button" onClick={() => handleSetDatePreset('month')} style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer' }}>Este Mes</button>
            <button type="button" onClick={() => handleSetDatePreset('prevMonth')} style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer' }}>Mes Anterior</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>Desde:</label>
            <input 
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              style={{ padding: '0.65rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.95rem', width: '100%' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>Hasta:</label>
            <input 
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              style={{ padding: '0.65rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.95rem', width: '100%' }}
            />
          </div>
        </div>
      </div>

      {/* Main Grid: Left Controls & Summary + Right Ticket Table */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) 2fr', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* Left Column: Summary, Invoicing Settings & Smart Selectors */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Selected Summary Card */}
          <div className="card" style={{ padding: '1.5rem', border: '2px solid var(--caanma-primary)', borderRadius: '12px', background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b', marginBottom: '0.5rem' }}>
              Monto Seleccionado a Facturar
            </div>
            
            {loading ? (
              <div style={{ padding: '1.5rem 0', textAlign: 'center' }}>
                <Loader2 className="animate-spin" size={36} color="var(--caanma-primary)" style={{ margin: '0 auto' }} />
              </div>
            ) : (
              <>
                <div style={{ fontSize: '2.5rem', fontWeight: '900', color: 'var(--caanma-primary)', letterSpacing: '-1px', lineHeight: 1.1 }}>
                  {formatCurrency(selectedTotalAmount)}
                </div>
                <div style={{ fontSize: '0.9rem', color: '#475569', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckSquare size={16} color="var(--caanma-primary)" />
                  <span><strong>{selectedSales.length}</strong> de <strong>{pendingSales.length}</strong> tickets seleccionados</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                  Total del periodo completo: {formatCurrency(totalAmount)}
                </div>
              </>
            )}

            <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '1.25rem 0' }} />

            {/* SAT Configuration Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#334155', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.35rem' }}>
                  <Settings2 size={15} /> Forma de Pago SAT (CFDI)
                </label>
                <select 
                  value={satPaymentForm}
                  onChange={e => setSatPaymentForm(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', backgroundColor: '#fff' }}
                >
                  <option value="01">01 - Efectivo</option>
                  <option value="04">04 - Tarjeta de crédito</option>
                  <option value="28">28 - Tarjeta de débito</option>
                  <option value="03">03 - Transferencia electrónica</option>
                  <option value="02">02 - Cheque nominativo</option>
                  <option value="99">99 - Por definir</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#334155', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.35rem' }}>
                  <Layers size={15} /> Periodicidad SAT
                </label>
                <select 
                  value={satPeriodicity}
                  onChange={e => setSatPeriodicity(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', backgroundColor: '#fff' }}
                >
                  <option value="day">01 - Diario (day)</option>
                  <option value="week">02 - Semanal (week)</option>
                  <option value="two_weeks">03 - Quincenal (two_weeks)</option>
                  <option value="month">04 - Mensual (month)</option>
                  <option value="two_months">05 - Bimestral (two_months)</option>
                </select>
              </div>
            </div>

            <button 
              onClick={handleGenerateInvoice}
              disabled={selectedSales.length === 0 || loading || isPending}
              className="btn-primary" 
              style={{ 
                width: '100%', 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                gap: '0.5rem', 
                padding: '0.9rem 1.25rem', 
                fontSize: '1rem',
                fontWeight: 'bold',
                marginTop: '1.5rem',
                backgroundColor: selectedSales.length === 0 ? '#cbd5e1' : 'var(--caanma-primary)',
                cursor: selectedSales.length === 0 ? 'not-allowed' : 'pointer',
                border: 'none',
                borderRadius: '8px',
                boxShadow: selectedSales.length > 0 ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : 'none'
              }}
            >
              {isPending ? <Loader2 className="animate-spin" size={20} /> : <PlusCircle size={20} />}
              {isPending ? 'Emitiendo Factura Global...' : `Timbrar Factura (${selectedSales.length} tickets)`}
            </button>
          </div>

          {/* Quick Amount Auto-Selector Card */}
          <div className="card" style={{ padding: '1.25rem', border: '1px solid var(--caanma-border)' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
              <Sparkles size={16} color="#eab308" /> Selección por Monto Objetivo
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.75rem' }}>
              Ingresa la cantidad exacta o tope que deseas facturar y el sistema seleccionará los tickets automáticamente:
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontWeight: 'bold' }}>$</span>
                <input 
                  type="number"
                  placeholder="Ej. 5000"
                  value={targetAmountInput}
                  onChange={e => setTargetAmountInput(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem 0.75rem 0.6rem 1.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem' }}
                />
              </div>
              <button 
                type="button"
                onClick={handleAutoSelectByAmount}
                disabled={!targetAmountInput || loading}
                style={{ 
                  padding: '0.6rem 0.9rem', 
                  backgroundColor: '#0284c7', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '6px', 
                  fontWeight: '600', 
                  fontSize: '0.85rem',
                  cursor: targetAmountInput ? 'pointer' : 'not-allowed',
                  opacity: targetAmountInput ? 1 : 0.6
                }}
              >
                Auto-Seleccionar
              </button>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {[1000, 3000, 5000, 10000, 20000].map(amt => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => {
                    setTargetAmountInput(amt.toString());
                  }}
                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', borderRadius: '4px', border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', color: '#475569' }}
                >
                  ${amt.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: Payment Tabs & Tickets Table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--caanma-border)' }}>
          
          {/* Payment Method Filter Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--caanma-border)', backgroundColor: '#f8fafc', overflowX: 'auto', padding: '0.5rem 0.5rem 0' }}>
            
            <button
              type="button"
              onClick={() => setActivePaymentFilter('ALL')}
              style={{
                padding: '0.6rem 0.9rem',
                border: 'none',
                borderBottom: activePaymentFilter === 'ALL' ? '2px solid var(--caanma-primary)' : '2px solid transparent',
                backgroundColor: activePaymentFilter === 'ALL' ? '#ffffff' : 'transparent',
                fontWeight: activePaymentFilter === 'ALL' ? 'bold' : '500',
                color: activePaymentFilter === 'ALL' ? 'var(--caanma-primary)' : '#64748b',
                cursor: 'pointer',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                borderRadius: '6px 6px 0 0'
              }}
            >
              <Filter size={14} /> Todos ({paymentStats.ALL.count})
              <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>{formatCurrency(paymentStats.ALL.total)}</span>
            </button>

            <button
              type="button"
              onClick={() => setActivePaymentFilter('CASH')}
              style={{
                padding: '0.6rem 0.9rem',
                border: 'none',
                borderBottom: activePaymentFilter === 'CASH' ? '2px solid #16a34a' : '2px solid transparent',
                backgroundColor: activePaymentFilter === 'CASH' ? '#ffffff' : 'transparent',
                fontWeight: activePaymentFilter === 'CASH' ? 'bold' : '500',
                color: activePaymentFilter === 'CASH' ? '#16a34a' : '#64748b',
                cursor: 'pointer',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                borderRadius: '6px 6px 0 0'
              }}
            >
              <Banknote size={14} /> Efectivo ({paymentStats.CASH.count})
              <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>{formatCurrency(paymentStats.CASH.total)}</span>
            </button>

            <button
              type="button"
              onClick={() => setActivePaymentFilter('CARD_DEBIT')}
              style={{
                padding: '0.6rem 0.9rem',
                border: 'none',
                borderBottom: activePaymentFilter === 'CARD_DEBIT' ? '2px solid #4f46e5' : '2px solid transparent',
                backgroundColor: activePaymentFilter === 'CARD_DEBIT' ? '#ffffff' : 'transparent',
                fontWeight: activePaymentFilter === 'CARD_DEBIT' ? 'bold' : '500',
                color: activePaymentFilter === 'CARD_DEBIT' ? '#4f46e5' : '#64748b',
                cursor: 'pointer',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                borderRadius: '6px 6px 0 0'
              }}
            >
              <CreditCard size={14} /> Débito ({paymentStats.CARD_DEBIT.count})
              <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>{formatCurrency(paymentStats.CARD_DEBIT.total)}</span>
            </button>

            <button
              type="button"
              onClick={() => setActivePaymentFilter('CARD_CREDIT')}
              style={{
                padding: '0.6rem 0.9rem',
                border: 'none',
                borderBottom: activePaymentFilter === 'CARD_CREDIT' ? '2px solid #d97706' : '2px solid transparent',
                backgroundColor: activePaymentFilter === 'CARD_CREDIT' ? '#ffffff' : 'transparent',
                fontWeight: activePaymentFilter === 'CARD_CREDIT' ? 'bold' : '500',
                color: activePaymentFilter === 'CARD_CREDIT' ? '#d97706' : '#64748b',
                cursor: 'pointer',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                borderRadius: '6px 6px 0 0'
              }}
            >
              <CreditCard size={14} /> Crédito ({paymentStats.CARD_CREDIT.count})
              <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>{formatCurrency(paymentStats.CARD_CREDIT.total)}</span>
            </button>

            <button
              type="button"
              onClick={() => setActivePaymentFilter('TRANSFER')}
              style={{
                padding: '0.6rem 0.9rem',
                border: 'none',
                borderBottom: activePaymentFilter === 'TRANSFER' ? '2px solid #9333ea' : '2px solid transparent',
                backgroundColor: activePaymentFilter === 'TRANSFER' ? '#ffffff' : 'transparent',
                fontWeight: activePaymentFilter === 'TRANSFER' ? 'bold' : '500',
                color: activePaymentFilter === 'TRANSFER' ? '#9333ea' : '#64748b',
                cursor: 'pointer',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                borderRadius: '6px 6px 0 0'
              }}
            >
              <ArrowLeftRight size={14} /> Transferencia ({paymentStats.TRANSFER.count})
              <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>{formatCurrency(paymentStats.TRANSFER.total)}</span>
            </button>

            {paymentStats.OTHER.count > 0 && (
              <button
                type="button"
                onClick={() => setActivePaymentFilter('OTHER')}
                style={{
                  padding: '0.6rem 0.9rem',
                  border: 'none',
                  borderBottom: activePaymentFilter === 'OTHER' ? '2px solid #475569' : '2px solid transparent',
                  backgroundColor: activePaymentFilter === 'OTHER' ? '#ffffff' : 'transparent',
                  fontWeight: activePaymentFilter === 'OTHER' ? 'bold' : '500',
                  color: activePaymentFilter === 'OTHER' ? '#475569' : '#64748b',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  borderRadius: '6px 6px 0 0'
                }}
              >
                Otros ({paymentStats.OTHER.count})
              </button>
            )}

          </div>

          {/* Table Actions Sub-header */}
          <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--caanma-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', backgroundColor: '#ffffff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={isAllVisibleSelected ? handleDeselectAllVisible : handleSelectAllVisible}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#f8fafc', padding: '0.35rem 0.65rem', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer', color: '#334155' }}
              >
                {isAllVisibleSelected ? <CheckSquare size={15} color="var(--caanma-primary)" /> : <Square size={15} />}
                {isAllVisibleSelected ? 'Deseleccionar Visibles' : 'Seleccionar Visibles'}
              </button>
              
              {activePaymentFilter !== 'ALL' && (
                <button
                  type="button"
                  onClick={handleSelectOnlyVisible}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#f8fafc', padding: '0.35rem 0.65rem', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer', color: '#0284c7' }}
                >
                  Seleccionar SOLO esta forma de pago
                </button>
              )}
            </div>

            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
              Mostrando <strong>{filteredSales.length}</strong> tickets
            </span>
          </div>

          {/* Tickets Table */}
          <div style={{ maxHeight: '550px', overflowY: 'auto' }}>
            <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--caanma-border)', position: 'sticky', top: 0, zIndex: 1 }}>
                <tr>
                  <th style={{ padding: '0.75rem 1rem', width: '40px', textAlign: 'center' }}>
                    <input 
                      type="checkbox"
                      checked={isAllVisibleSelected}
                      onChange={isAllVisibleSelected ? handleDeselectAllVisible : handleSelectAllVisible}
                      style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                    />
                  </th>
                  <th style={{ padding: '0.75rem 1rem', color: '#64748b', fontWeight: '600', fontSize: '0.85rem' }}>Folio / Venta</th>
                  <th style={{ padding: '0.75rem 1rem', color: '#64748b', fontWeight: '600', fontSize: '0.85rem' }}>Fecha</th>
                  <th style={{ padding: '0.75rem 1rem', color: '#64748b', fontWeight: '600', fontSize: '0.85rem' }}>Cliente</th>
                  <th style={{ padding: '0.75rem 1rem', color: '#64748b', fontWeight: '600', fontSize: '0.85rem' }}>Forma de Pago</th>
                  <th style={{ padding: '0.75rem 1rem', color: '#64748b', fontWeight: '600', fontSize: '0.85rem', textAlign: 'right' }}>Monto</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map((sale) => {
                  const isSelected = selectedIds.has(sale.id);
                  return (
                    <tr 
                      key={sale.id} 
                      onClick={() => handleToggleSelect(sale.id)}
                      style={{ 
                        borderBottom: '1px solid var(--caanma-border)', 
                        backgroundColor: isSelected ? 'rgba(37, 99, 235, 0.04)' : 'transparent',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s ease'
                      }}
                    >
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                        <input 
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(sale.id)}
                          style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                        />
                      </td>
                      <td data-label="Folio / Venta" style={{ padding: '0.75rem 1rem', fontWeight: 'bold', color: '#0f172a' }}>
                        #{sale.folio || sale.id.substring(0, 8).toUpperCase()}
                      </td>
                      <td data-label="Fecha" style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', color: '#475569' }}>
                        {new Date(sale.createdAt).toLocaleDateString()} {new Date(sale.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </td>
                      <td data-label="Cliente" style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', color: '#334155' }}>
                        {sale.customer ? (sale.customer.legalName || sale.customer.name) : <span style={{ color: '#94a3b8' }}>Público en General</span>}
                      </td>
                      <td data-label="Forma de Pago" style={{ padding: '0.75rem 1rem' }}>
                        {getMethodBadge(sale.paymentMethod)}
                      </td>
                      <td data-label="Monto" style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 'bold', color: '#0f172a' }}>
                        {formatCurrency(sale.total)}
                      </td>
                    </tr>
                  );
                })}

                {filteredSales.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: '4rem 1rem', textAlign: 'center', color: 'var(--caanma-text-muted)' }}>
                      <ShoppingBag size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
                      No hay ventas pendientes con este filtro para el rango seleccionado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
