'use client';

import { useEffect } from 'react';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Printer, X, Banknote, Calculator } from 'lucide-react';

export default function PrintCorteClient({ session, branchName }: { session: any; branchName: string }) {
  
  // Auto-trigger printing when page is ready
  useEffect(() => {
    const timer = setTimeout(() => {
      window.print();
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  let details = [];
  try {
    if (session.detailsJson) {
      details = typeof session.detailsJson === 'string' ? JSON.parse(session.detailsJson) : session.detailsJson;
    }
  } catch (e) {
    console.error("Failed to parse detailsJson:", e);
  }

  // Calculate totals
  const totalSales = session.sales.reduce((sum: number, s: any) => sum + s.total, 0);
  const totalIn = session.movements.filter((m: any) => m.type === 'IN').reduce((sum: number, m: any) => sum + m.amount, 0);
  const totalOut = session.movements.filter((m: any) => m.type === 'OUT').reduce((sum: number, m: any) => sum + m.amount, 0);

  // Helper to format dates safely
  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    try {
      return format(new Date(dateStr), "dd/MM/yyyy HH:mm 'hrs'", { locale: es });
    } catch (err) {
      return dateStr;
    }
  };

  const getMethodShortName = (id: string) => {
    switch (id) {
      case 'CASH': return 'Efectivo';
      case 'CARD': return 'Tarjeta';
      case 'TRANSFER': return 'Transf.';
      case 'CREDIT': return 'Crédito';
      case 'VALES': return 'Vales';
      default: return id;
    }
  };

  return (
    <div style={{ backgroundColor: '#f1f5f9', minHeight: '100vh', padding: '2rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: 'Courier New, monospace', color: 'black' }}>
      
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body {
            background-color: white !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .ticket-wrapper {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          @page {
            size: auto;
            margin: 0;
          }
        }
      `}} />

      {/* Floating print actions */}
      <div className="no-print" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem' }}>
        <button 
          onClick={() => window.print()}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            backgroundColor: 'var(--pulpos-primary)', 
            color: 'white', 
            border: 'none', 
            padding: '0.6rem 1.25rem', 
            borderRadius: '8px', 
            cursor: 'pointer', 
            fontWeight: 'bold', 
            fontSize: '0.9rem',
            fontFamily: 'sans-serif'
          }}
        >
          <Printer size={18} /> Imprimir Ticket
        </button>
        <button 
          onClick={() => window.close()}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            backgroundColor: 'white', 
            color: '#475569', 
            border: '1px solid #cbd5e1', 
            padding: '0.6rem 1.25rem', 
            borderRadius: '8px', 
            cursor: 'pointer', 
            fontWeight: 'bold', 
            fontSize: '0.9rem',
            fontFamily: 'sans-serif'
          }}
        >
          <X size={18} /> Cerrar Ventana
        </button>
      </div>

      {/* Ticket Layout */}
      <div className="ticket-wrapper" style={{ width: '100%', maxWidth: '380px', backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', borderBottom: '2px dashed black', paddingBottom: '1rem', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: '0 0 0.25rem 0' }}>
            {branchName}
          </h2>
          <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', color: '#64748b' }}>
            {session.branch?.location || ''}
          </p>
          <h1 style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: '0.5rem 0 0.25rem 0', letterSpacing: '1px' }}>
            CORTE DE CAJA (CIERRE)
          </h1>
          <p style={{ margin: '0.25rem 0', fontSize: '0.8rem', color: '#334155' }}>
            ID Turno: #{session.id.slice(0, 8).toUpperCase()}
          </p>
        </div>

        {/* Turn Details */}
        <div style={{ marginBottom: '1rem', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <div><strong>Cajero:</strong> {session.user.name}</div>
          <div><strong>Apertura:</strong> {formatDateTime(session.openedAt)}</div>
          <div><strong>Cierre:</strong> {formatDateTime(session.closedAt)}</div>
        </div>

        {/* Global Summary */}
        <div style={{ marginBottom: '1rem', borderTop: '1px solid black', borderBottom: '1px solid black', padding: '0.5rem 0', fontSize: '0.85rem' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '0.4rem', fontSize: '0.9rem' }}>RESUMEN GLOBAL</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <span>Fondo Inicial:</span>
            <span>{formatCurrency(session.initialAmount)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <span>Ventas del Turno:</span>
            <span>{formatCurrency(totalSales)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <span>Entradas Extra (+):</span>
            <span>{formatCurrency(totalIn)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <span>Retiros Extra (-):</span>
            <span>{formatCurrency(totalOut)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #ccc', paddingTop: '0.25rem', marginTop: '0.25rem', fontWeight: 'bold' }}>
            <span>Esperado en Caja:</span>
            <span>{formatCurrency(session.expectedAmount || 0)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
            <span>Recuento Físico:</span>
            <span>{formatCurrency(session.actualAmount || 0)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: (session.difference || 0) < 0 ? '#ef4444' : (session.difference || 0) > 0 ? '#16a34a' : 'black' }}>
            <span>Diferencia:</span>
            <span>{(session.difference || 0) > 0 ? '+' : ''}{formatCurrency(session.difference || 0)}</span>
          </div>
        </div>

        {/* Method Breakdown */}
        {details.length > 0 && (
          <div style={{ marginBottom: '1rem', fontSize: '0.8rem' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '0.4rem', fontSize: '0.85rem' }}>DESGLOSE MÉTODOS</div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid black' }}>
                  <th style={{ textAlign: 'left', paddingBottom: '0.25rem' }}>Método</th>
                  <th style={{ textAlign: 'right', paddingBottom: '0.25rem' }}>Real</th>
                  <th style={{ textAlign: 'right', paddingBottom: '0.25rem' }}>Esperado</th>
                  <th style={{ textAlign: 'right', paddingBottom: '0.25rem' }}>Diff</th>
                </tr>
              </thead>
              <tbody>
                {details.map((m: any) => (
                  <tr key={m.id} style={{ borderBottom: '1px dashed #eee' }}>
                    <td style={{ padding: '0.25rem 0' }}>{getMethodShortName(m.id)}</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(m.actual)}</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(m.expected)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold', color: m.difference < 0 ? '#ef4444' : m.difference > 0 ? '#16a34a' : 'black' }}>
                      {m.difference > 0 ? '+' : ''}{formatCurrency(m.difference)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Sales List */}
        <div style={{ marginBottom: '1rem', borderTop: '1px solid black', paddingTop: '0.5rem', fontSize: '0.8rem' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '0.4rem', fontSize: '0.85rem' }}>DETALLE DE VENTAS ({session.sales.length})</div>
          {session.sales.length === 0 ? (
            <div style={{ fontStyle: 'italic', color: '#666' }}>No hubo ventas en este turno.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid black' }}>
                  <th style={{ textAlign: 'left', paddingBottom: '0.25rem' }}>Folio</th>
                  <th style={{ textAlign: 'left', paddingBottom: '0.25rem' }}>Método</th>
                  <th style={{ textAlign: 'right', paddingBottom: '0.25rem' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {session.sales.map((sale: any) => (
                  <tr key={sale.id} style={{ borderBottom: '1px dashed #eee' }}>
                    <td style={{ padding: '0.25rem 0' }}>
                      #{sale.folio || sale.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td style={{ padding: '0.25rem 0' }}>
                      {sale.paymentMethod === 'MIXTO' ? `Mixto` : getMethodShortName(sale.paymentMethod)}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                      {formatCurrency(sale.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Movements List */}
        {session.movements.length > 0 && (
          <div style={{ marginBottom: '1rem', borderTop: '1px solid black', paddingTop: '0.5rem', fontSize: '0.8rem' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '0.4rem', fontSize: '0.85rem' }}>MOVIMIENTOS EXTRA</div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid black' }}>
                  <th style={{ textAlign: 'left', paddingBottom: '0.25rem' }}>Tipo</th>
                  <th style={{ textAlign: 'left', paddingBottom: '0.25rem' }}>Concepto</th>
                  <th style={{ textAlign: 'right', paddingBottom: '0.25rem' }}>Monto</th>
                </tr>
              </thead>
              <tbody>
                {session.movements.map((m: any) => (
                  <tr key={m.id} style={{ borderBottom: '1px dashed #eee' }}>
                    <td style={{ padding: '0.25rem 0', fontWeight: 'bold', color: m.type === 'IN' ? '#0ea5e9' : '#ef4444' }}>
                      {m.type === 'IN' ? 'ENTRADA' : 'RETIRO'}
                    </td>
                    <td style={{ padding: '0.25rem 0' }}>
                      {m.reason}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                      {formatCurrency(m.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Comments */}
        {session.notes && (
          <div style={{ marginBottom: '1rem', borderTop: '1px solid black', paddingTop: '0.5rem', fontSize: '0.8rem' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>COMENTARIOS:</div>
            <p style={{ margin: 0, whiteSpace: 'pre-wrap', fontStyle: 'italic' }}>{session.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', borderTop: '2px dashed black', paddingTop: '1rem', marginTop: '1.5rem', fontSize: '0.75rem', color: '#475569' }}>
          <div><strong>CAANMA PRO</strong></div>
          <div style={{ marginTop: '0.25rem' }}>¡Control de Caja Exitoso!</div>
        </div>

      </div>
    </div>
  );
}
