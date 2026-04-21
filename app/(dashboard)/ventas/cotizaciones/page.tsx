import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { getActiveBranch } from "@/app/actions/auth";
import { getBranchFilter } from "@/lib/utils";
import { FileText, Plus } from "lucide-react";

export default async function CotizacionesPage() {
  const branch = await getActiveBranch();
  
  const quotes = await prisma.quote.findMany({
    where: getBranchFilter(branch),
    include: {
      user: true,
      branch: true,
      customer: true,
      items: {
        include: {
          product: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>Cotizaciones</h1>
          <p style={{ color: 'var(--pulpos-text-muted)' }}>Historial de cotizaciones generadas para clientes</p>
        </div>
        <Link href="/ventas/nueva" className="btn-primary" style={{ padding: '0.75rem 1.5rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={18} /> Nueva Cotización (TPV)
        </Link>
      </div>

      <div className="card">
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--pulpos-border)', backgroundColor: '#f9fafb' }}>
              <th style={{ padding: '1rem', color: 'var(--pulpos-text-muted)', fontWeight: '500' }}>Folio</th>
              <th style={{ padding: '1rem', color: 'var(--pulpos-text-muted)', fontWeight: '500' }}>Fecha / Hora</th>
              <th style={{ padding: '1rem', color: 'var(--pulpos-text-muted)', fontWeight: '500' }}>Cliente</th>
              <th style={{ padding: '1rem', color: 'var(--pulpos-text-muted)', fontWeight: '500' }}>Vendedor</th>
              <th style={{ padding: '1rem', color: 'var(--pulpos-text-muted)', fontWeight: '500', textAlign: 'right' }}>Artículos</th>
              <th style={{ padding: '1rem', color: 'var(--pulpos-text-muted)', fontWeight: '500', textAlign: 'right' }}>Total</th>
              <th style={{ padding: '1rem', color: 'var(--pulpos-text-muted)', fontWeight: '500', textAlign: 'center' }}>Estado</th>
              <th style={{ padding: '1rem', color: 'var(--pulpos-text-muted)', fontWeight: '500', textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map(quote => (
              <tr key={quote.id} style={{ borderBottom: '1px solid var(--pulpos-border)' }}>
                <td style={{ padding: '1rem', fontFamily: 'monospace', fontWeight: 'bold' }}>
                  #{quote.id.slice(0, 8).toUpperCase()}
                </td>
                <td style={{ padding: '1rem' }}>
                  {new Date(quote.createdAt).toLocaleString()}
                </td>
                <td style={{ padding: '1rem' }}>
                  <div style={{ fontWeight: '500' }}>{quote.customer?.name || 'Cliente de Mostrador'}</div>
                </td>
                <td style={{ padding: '1rem' }}>
                  <div style={{ fontSize: '0.875rem', color: '#475569' }}>{quote.user.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--pulpos-text-muted)' }}>{quote.branch?.name || branch.name}</div>
                </td>
                <td style={{ padding: '1rem', textAlign: 'right', color: 'var(--pulpos-text-muted)' }}>
                  {quote.items.reduce((sum, item) => sum + item.quantity, 0)} Pzas
                </td>
                <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold' }}>
                  ${quote.total.toFixed(2)}
                </td>
                <td style={{ padding: '1rem', textAlign: 'center' }}>
                  <span style={{ 
                    padding: '0.25rem 0.5rem', 
                    borderRadius: '12px', 
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    backgroundColor: quote.status === 'CONVERTED' ? '#dcfce7' : quote.status === 'EXPIRED' ? '#fee2e2' : '#fef9c3',
                    color: quote.status === 'CONVERTED' ? '#166534' : quote.status === 'EXPIRED' ? '#991b1b' : '#854d0e'
                  }}>
                    {quote.status === 'CONVERTED' ? 'Convertida' : quote.status === 'EXPIRED' ? 'Expirada' : 'Pendiente'}
                  </span>
                </td>
                <td style={{ padding: '1rem', textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                    <Link target="_blank" href={`/ventas/${quote.id}/imprimir-cotizacion`} style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '0.4rem 0.75rem', color: '#475569', display: 'flex', alignItems: 'center', borderRadius: '4px', textDecoration: 'none', fontSize: '0.875rem' }} title="Imprimir PDF">
                      Ver PDF
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
            {quotes.length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding: '4rem', textAlign: 'center', color: 'var(--pulpos-text-muted)' }}>
                  <FileText size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                  Aún no se han generado cotizaciones en esta sucursal.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
