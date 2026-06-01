import { getActiveBranch } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus } from "lucide-react";
import QuoteActions from "./QuoteActions";

export default async function CotizacionesPage() {
  const branch = await getActiveBranch();
  const quotes = await prisma.quote.findMany({
    where: { branchId: branch.id },
    orderBy: { createdAt: 'desc' },
    include: {
      user: true,
      customer: true,
      items: { include: { product: true } }
    }
  });

  return (
    <div>
      {/* Premium Tooltip CSS */}
      <style dangerouslySetInnerHTML={{ __html: `
        .quote-id-wrapper {
          position: relative;
          display: inline-block;
        }
        .quote-id-text {
          color: var(--pulpos-primary, #6366f1);
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
          color: var(--pulpos-primary, #6366f1);
          font-size: 1.05rem;
        }
      ` }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Cotizaciones a Clientes</h1>
        <Link href="/ventas/cotizaciones/nueva" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', padding: '0.5rem 1.5rem' }}>
          <Plus size={18} /> Nueva Cotización
        </Link>
      </div>

      <div className="card" style={{ padding: '0' }}>
        <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--pulpos-border)', backgroundColor: '#f9fafb' }}>
              <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--pulpos-text-muted)' }}>ID Cotización</th>
              <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--pulpos-text-muted)' }}>Fecha</th>
              <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--pulpos-text-muted)' }}>Cliente</th>
              <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--pulpos-text-muted)' }}>Creado por</th>
              <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--pulpos-text-muted)' }}>Total</th>
              <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--pulpos-text-muted)' }}>Estado</th>
              <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--pulpos-text-muted)', textAlign: 'right' }}>Acción</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map(quote => (
              <tr key={quote.id} style={{ borderBottom: '1px solid var(--pulpos-border)' }}>
                <td data-label="ID Cotización" style={{ padding: '1rem' }}>
                  <div className="quote-id-wrapper">
                    <span className="quote-id-text">#{quote.folio || quote.id.slice(0, 8).toUpperCase()}</span>
                    <div className="quote-preview-tooltip">
                      <div className="quote-tooltip-header">
                        <div className="quote-tooltip-title">Resumen de Cotización</div>
                        <div className="quote-tooltip-folio">Folio: #{quote.folio || quote.id.slice(0, 8).toUpperCase()}</div>
                      </div>
                      <div className="quote-tooltip-body">
                        <div className="quote-tooltip-meta">
                          <div><strong>Cliente:</strong> {quote.customer?.name || 'Público en General'}</div>
                          <div><strong>Fecha:</strong> {new Date(quote.createdAt).toLocaleString('es-MX')}</div>
                          <div><strong>Creado por:</strong> {quote.user.name}</div>
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
                              {quote.items.map(item => (
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
                        <div className="quote-tooltip-footer">
                          <span className="quote-tooltip-total-label">TOTAL</span>
                          <span className="quote-tooltip-total-val">${quote.total.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </td>
                <td data-label="Fecha" style={{ padding: '1rem', color: 'var(--pulpos-text-muted)' }}>
                  {new Date(quote.createdAt).toLocaleString('es-MX')}
                </td>
                <td data-label="Cliente" style={{ padding: '1rem' }}>{quote.customer?.name || 'Público en General'}</td>
                <td data-label="Creado por" style={{ padding: '1rem' }}>{quote.user.name}</td>
                <td data-label="Total" style={{ padding: '1rem', fontWeight: 'bold', color: 'var(--pulpos-primary)' }}>
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
                    quoteTotal={quote.total}
                  />
                </td>
              </tr>
            ))}
            {quotes.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: '4rem', textAlign: 'center', color: 'var(--pulpos-text-muted)' }}>
                  No hay cotizaciones registradas. Crea tu primera cotización en la parte superior.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
