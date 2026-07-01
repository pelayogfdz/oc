'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, FileText } from 'lucide-react';
import QuoteActions from './QuoteActions';

interface CotizacionesTableProps {
  initialQuotes: any[];
}

export default function CotizacionesTable({ initialQuotes }: CotizacionesTableProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredQuotes = initialQuotes.filter((quote) => {
    const term = searchTerm.toLowerCase();
    const folioStr = `#${quote.folio || quote.id.slice(0, 8).toUpperCase()}`;
    const customerName = quote.customer?.name || 'Público en General';
    const creatorName = quote.user?.name || '';
    const statusText = quote.status === 'PENDING' ? 'pendiente' : 'convertida a venta';

    return (
      folioStr.toLowerCase().includes(term) ||
      customerName.toLowerCase().includes(term) ||
      creatorName.toLowerCase().includes(term) ||
      statusText.toLowerCase().includes(term)
    );
  });

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Premium Tooltip CSS */}
      <style dangerouslySetInnerHTML={{ __html: `
        .quote-id-wrapper {
          position: relative;
          display: inline-block;
        }
        .quote-id-text {
          color: var(--caanma-primary, #6366f1);
          font-weight: 600;
          text-decoration: underline dotted;
          cursor: help;
          transition: color 0.15s ease;
        }
        .quote-id-text:hover {
          color: #4f46e5;
        }
        .quote-preview-tooltip {
          visibility: hidden;
          opacity: 0;
          position: absolute;
          bottom: 120%;
          left: 0;
          width: 320px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.12), 0 8px 16px -8px rgba(0, 0, 0, 0.08);
          padding: 1rem;
          z-index: 50;
          transition: opacity 0.2s ease, transform 0.2s ease;
          transform: translateY(8px);
          pointer-events: none;
          font-size: 0.8rem;
          color: #334155;
          line-height: 1.4;
        }
        .quote-preview-tooltip::after {
          content: '';
          position: absolute;
          top: 100%;
          left: 20px;
          border-width: 6px;
          border-style: solid;
          border-color: white transparent transparent transparent;
        }
        .quote-preview-tooltip::before {
          content: '';
          position: absolute;
          top: 100%;
          left: 19px;
          border-width: 7px;
          border-style: solid;
          border-color: #e2e8f0 transparent transparent transparent;
          z-index: -1;
        }
        .quote-id-wrapper:hover .quote-preview-tooltip {
          visibility: visible;
          opacity: 1;
          transform: translateY(0);
        }
        .quote-tooltip-header {
          border-bottom: 1px solid #f1f5f9;
          padding-bottom: 0.5rem;
          margin-bottom: 0.6rem;
        }
        .quote-tooltip-title {
          font-size: 0.725rem;
          font-weight: 700;
          color: #854d0e;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .quote-tooltip-folio {
          font-size: 1rem;
          font-weight: 800;
          color: #0f172a;
          margin-top: 0.1rem;
        }
        .quote-tooltip-meta {
          color: #475569;
          margin-bottom: 0.75rem;
          font-size: 0.775rem;
        }
        .quote-tooltip-items {
          max-height: 130px;
          overflow-y: auto;
          margin-bottom: 0.75rem;
          border: 1px solid #f1f5f9;
          border-radius: 8px;
          background-color: #f8fafc;
        }
        .tooltip-items-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.75rem;
        }
        .tooltip-items-table th {
          background: #f1f5f9;
          color: #475569;
          padding: 0.35rem 0.5rem;
          font-weight: 600;
          text-align: left;
          border-bottom: 1px solid #e2e8f0;
        }
        .tooltip-items-table td {
          padding: 0.35rem 0.5rem;
          border-bottom: 1px solid #f1f5f9;
          color: #334155;
        }
        .quote-tooltip-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-top: 1px solid #f1f5f9;
          padding-top: 0.5rem;
          font-weight: bold;
        }
        .quote-tooltip-total-label {
          color: #64748b;
          font-size: 0.75rem;
        }
        .quote-tooltip-total-val {
          color: var(--caanma-primary, #6366f1);
          font-size: 1.05rem;
        }
      ` }} />

      {/* Search Input */}
      <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--caanma-border)', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '500px' }}>
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#64748b',
              pointerEvents: 'none'
            }}
          />
          <input
            type="text"
            placeholder="Buscar por folio, cliente, vendedor o estado..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '0.625rem 1rem 0.625rem 2.25rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.9rem',
              outline: 'none',
              backgroundColor: 'white',
              transition: 'border-color 0.2s',
            }}
          />
        </div>
        {searchTerm && (
          <div style={{ marginLeft: '1rem', fontSize: '0.85rem', color: '#64748b' }}>
            Encontrados: <strong>{filteredQuotes.length}</strong> de {initialQuotes.length}
          </div>
        )}
      </div>

      <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--caanma-border)', backgroundColor: '#f9fafb' }}>
            <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--caanma-text-muted)' }}>ID Cotización</th>
            <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--caanma-text-muted)' }}>Fecha</th>
            <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--caanma-text-muted)' }}>Cliente</th>
            <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--caanma-text-muted)' }}>Creado por</th>
            <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--caanma-text-muted)' }}>Total</th>
            <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--caanma-text-muted)' }}>Estado</th>
            <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--caanma-text-muted)', textAlign: 'right' }}>Acción</th>
          </tr>
        </thead>
        <tbody>
          {filteredQuotes.map((quote) => (
            <tr key={quote.id} style={{ borderBottom: '1px solid var(--caanma-border)' }}>
              <td data-label="ID Cotización" style={{ padding: '1rem' }}>
                <div className="quote-id-wrapper">
                  <span className="quote-id-text">#{quote.folio || quote.id.slice(0, 8).toUpperCase()}</span>
                  <div className="quote-preview-tooltip">
                    <div className="quote-tooltip-header">
                      <div className="quote-tooltip-title">Resumen de Cotización</div>
                      <div className="quote-tooltip-folio">Folio: #{quote.folio || quote.id.slice(0, 8).toUpperCase()}</div>
                    </div>
                    <div className="quote-preview-body">
                      <div className="quote-tooltip-meta">
                        <div><strong>Cliente:</strong> {quote.customer?.name || 'Público en General'}</div>
                        <div><strong>Fecha:</strong> {new Date(quote.createdAt).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}</div>
                        <div><strong>Creado por:</strong> {quote.user?.name || ''}</div>
                      </div>
                      <div className="quote-tooltip-items">
                        <table className="tooltip-items-table">
                          <thead>
                            <tr>
                              <th style={{ width: '40px' }}>Cant</th>
                              <th>Descripción</th>
                              <th style={{ textAlign: 'right', width: '70px' }}>Importe</th>
                            </tr>
                          </thead>
                          <tbody>
                            {quote.items.map((item: any) => (
                              <tr key={item.id}>
                                <td style={{ fontWeight: 'bold' }}>{item.quantity}</td>
                                <td style={{ maxWidth: '130px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {item.product?.name || 'Producto'}
                                </td>
                                <td style={{ textAlign: 'right' }}>${(item.quantity * item.price).toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {(() => {
                        const totalPurchaseCost = quote.items.reduce((sum: number, i: any) => sum + ((i.product?.averageCost || i.product?.cost || 0) * i.quantity), 0);
                        const totalMarginPercent = quote.total > 0 ? ((quote.total - totalPurchaseCost) / quote.total) * 100 : 0;
                        return (
                          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.5rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>Compra total (prom.):</span>
                              <strong style={{ color: '#475569' }}>${totalPurchaseCost.toFixed(2)}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>Margen total:</span>
                              <span style={{ color: totalMarginPercent >= 0 ? '#15803d' : '#b91c1c', fontWeight: 'bold' }}>
                                {totalMarginPercent.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        );
                      })()}
                      <div className="quote-tooltip-footer">
                        <span className="quote-tooltip-total-label">TOTAL</span>
                        <span className="quote-tooltip-total-val">${quote.total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </td>
              <td data-label="Fecha" style={{ padding: '1rem', color: 'var(--caanma-text-muted)' }}>
                {new Date(quote.createdAt).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}
              </td>
              <td data-label="Cliente" style={{ padding: '1rem' }}>{quote.customer?.name || 'Público en General'}</td>
              <td data-label="Creado por" style={{ padding: '1rem' }}>{quote.user?.name || ''}</td>
              <td data-label="Total" style={{ padding: '1rem', fontWeight: 'bold', color: 'var(--caanma-primary)' }}>
                ${quote.total.toFixed(2)}
              </td>
              <td data-label="Estado" style={{ padding: '1rem' }}>
                {quote.status === 'PENDING' ? (
                  <span style={{ fontSize: '0.75rem', fontWeight: 'bold', padding: '0.25rem 0.5rem', backgroundColor: '#fef9c3', color: '#854d0e', borderRadius: '12px' }}>PENDIENTE</span>
                ) : (
                  <span style={{ fontSize: '0.75rem', fontWeight: 'bold', padding: '0.25rem 0.5rem', backgroundColor: '#dcfce7', color: '#166534', borderRadius: '12px' }}>CONVERTIDA A VENTA</span>
                )}
              </td>
              <td data-label="Acción" style={{ padding: '1rem', textAlign: 'right' }}>
                <QuoteActions 
                  quoteId={quote.id} 
                  quoteFolio={quote.folio}
                  status={quote.status}
                  customerPhone={quote.customer?.phone}
                  customerName={quote.customer?.name}
                  customerEmail={quote.customer?.email}
                  quoteTotal={quote.total}
                />
              </td>
            </tr>
          ))}
          {filteredQuotes.length === 0 && (
            <tr>
              <td colSpan={7} style={{ padding: '4rem', textAlign: 'center', color: 'var(--caanma-text-muted)' }}>
                <FileText size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                {initialQuotes.length === 0
                  ? 'No hay cotizaciones registradas. Crea tu primera cotización en la parte superior.'
                  : 'No se encontraron cotizaciones que coincidan con tu búsqueda.'}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
