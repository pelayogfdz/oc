'use client';

import { useState, useEffect, useTransition } from 'react';
import { getPendingGlobalSales, stampGlobalInvoice } from '@/app/actions/facturacion';
import { FileText, Calendar, PlusCircle, Loader2, RefreshCw, ShoppingBag } from 'lucide-react';

export default function GlobalesInvoiceClient() {
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10)); // Today
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10)); // Today
  const [pendingSales, setPendingSales] = useState<any[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const loadPendingSales = async () => {
    setLoading(true);
    try {
      const result = await getPendingGlobalSales(startDate, endDate);
      if (result.success && result.sales) {
        setPendingSales(result.sales);
        setTotalAmount(result.total || 0);
      } else {
        alert("Error al cargar ventas: " + result.error);
      }
    } catch (err: any) {
      alert("Excepción al cargar ventas: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPendingSales();
  }, [startDate, endDate]);

  const handleGenerateInvoice = () => {
    if (pendingSales.length === 0) {
      alert("No hay ventas pendientes en este rango para facturar.");
      return;
    }

    if (!confirm(`¿Deseas emitir la factura global para las ${pendingSales.length} ventas del periodo seleccionado? Total: $${totalAmount.toFixed(2)}`)) {
      return;
    }

    startTransition(async () => {
      const res = await stampGlobalInvoice(startDate, endDate);
      if (res.success) {
        alert('Factura global emitida exitosamente. ID: ' + res.invoiceId);
        loadPendingSales(); // reload list
      } else {
        alert('Error al timbrar factura global: ' + res.error);
      }
    });
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#0f172a' }}>
            <FileText size={28} color="var(--pulpos-primary)" />
            Facturación Global
          </h1>
          <p style={{ color: 'var(--pulpos-text-muted)', marginTop: '0.25rem' }}>
            Selecciona el rango de fechas personalizado para agrupar todas las ventas de mostrador sin facturar en un solo CFDI a Público en General.
          </p>
        </div>
      </div>

      {/* Date Selectors & Action Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }} className="card">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#475569', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Calendar size={16} /> Fecha de Inicio
          </label>
          <input 
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            style={{ padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '1rem' }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#475569', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Calendar size={16} /> Fecha de Fin
          </label>
          <input 
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            style={{ padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '1rem' }}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2fr', gap: '2rem' }}>
        
        {/* Total Summary Card */}
        <div className="card" style={{ padding: '2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', border: '1px solid var(--pulpos-border)' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 'bold', color: '#475569', marginBottom: '1.5rem' }}>Monto Acumulado en el Periodo</h2>
          
          {loading ? (
            <div style={{ padding: '2rem 0' }}>
              <Loader2 className="animate-spin" size={48} color="var(--pulpos-primary)" />
            </div>
          ) : (
            <div style={{ fontSize: '3rem', fontWeight: '900', color: 'var(--pulpos-primary)', marginBottom: '1.5rem', letterSpacing: '-1px' }}>
              ${totalAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </div>
          )}

          <div style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '2rem' }}>
            <strong>{pendingSales.length}</strong> ventas al público en general sin facturar en el rango seleccionado.
          </div>

          <button 
            onClick={handleGenerateInvoice}
            disabled={pendingSales.length === 0 || loading || isPending}
            className="btn-primary" 
            style={{ 
              width: '100%', 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center',
              gap: '0.5rem', 
              padding: '1rem', 
              fontSize: '1.1rem',
              backgroundColor: pendingSales.length === 0 ? '#cbd5e1' : 'var(--pulpos-primary)',
              cursor: pendingSales.length === 0 ? 'not-allowed' : 'pointer',
              border: 'none',
              borderRadius: '8px'
            }}
          >
            {isPending ? <Loader2 className="animate-spin" size={20} /> : <PlusCircle size={20} />}
            {isPending ? 'Emitiendo Factura...' : 'Generar Factura Global'}
          </button>
        </div>

        {/* Detailed Sales List in Preview */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--pulpos-border)' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--pulpos-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#0f172a' }}>Ventas del Periodo Incluidas</h2>
            <button 
              onClick={loadPendingSales} 
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', border: 'none', background: 'none', cursor: 'pointer', color: '#2563eb', fontWeight: 'bold', fontSize: '0.85rem' }}
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Actualizar
            </button>
          </div>

          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--pulpos-border)' }}>
                <tr>
                  <th style={{ padding: '1rem', color: '#64748b', fontWeight: '500' }}>Folio / Venta</th>
                  <th style={{ padding: '1rem', color: '#64748b', fontWeight: '500' }}>Fecha</th>
                  <th style={{ padding: '1rem', color: '#64748b', fontWeight: '500', textAlign: 'right' }}>Monto</th>
                </tr>
              </thead>
              <tbody>
                {pendingSales.map((sale) => (
                  <tr key={sale.id} style={{ borderBottom: '1px solid var(--pulpos-border)' }}>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 'bold' }}>
                      #{sale.folio || sale.id.substring(0, 8).toUpperCase()}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', color: '#475569' }}>
                      {new Date(sale.createdAt).toLocaleDateString()} {new Date(sale.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 'bold', color: '#0f172a' }}>
                      ${sale.total.toFixed(2)}
                    </td>
                  </tr>
                ))}
                {pendingSales.length === 0 && (
                  <tr>
                    <td colSpan={3} style={{ padding: '4rem', textAlign: 'center', color: 'var(--pulpos-text-muted)' }}>
                      <ShoppingBag size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
                      No hay ventas pendientes de facturar para el rango seleccionado.
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
