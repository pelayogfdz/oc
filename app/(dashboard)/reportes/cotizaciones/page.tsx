import { getActiveBranch } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency, getBranchFilter } from "@/lib/utils";
import Link from 'next/link';
import { ArrowLeft, FileText, CheckCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ReportesCotizacionesPage() {
  const branch = await getActiveBranch();
  
  const quotes = await prisma.quote.findMany({
    where: { 
      ...getBranchFilter(branch),
      status: 'CONVERTED'
    },
    include: {
      user: true,
      customer: true
    },
    orderBy: { createdAt: 'desc' }
  });

  const totalAmount = quotes.reduce((acc, q) => acc + q.total, 0);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/reportes" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--pulpos-text-muted)' }}>
          <ArrowLeft size={16} /> Volver a Reportes
        </Link>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem', gap: '0.75rem' }}>
        <div style={{ backgroundColor: '#f0fdf4', padding: '0.75rem', borderRadius: '50%' }}>
          <CheckCircle size={32} color="#16a34a" />
        </div>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>Cotizaciones Convertidas</h1>
          <p style={{ color: 'var(--pulpos-text-muted)' }}>Métricas de éxito de conversiones B2B/B2C</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
        <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #16a34a' }}>
          <div style={{ color: 'var(--pulpos-text-muted)', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>TOTAL CONVERTIDO</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#16a34a' }}>{quotes.length}</div>
          <div style={{ color: 'var(--pulpos-text-muted)', fontSize: '0.875rem', marginTop: '0.5rem' }}>cotizaciones cerradas exitosamente</div>
        </div>
        
        <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--pulpos-primary)' }}>
          <div style={{ color: 'var(--pulpos-text-muted)', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>MONTO FACTURADO (por conversión)</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--pulpos-primary)' }}>{formatCurrency(totalAmount)}</div>
          <div style={{ color: 'var(--pulpos-text-muted)', fontSize: '0.875rem', marginTop: '0.5rem' }}>ingresos recuperados de cotizaciones</div>
        </div>
      </div>

      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--pulpos-border)', backgroundColor: '#f8fafc' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Detalle de Cotizaciones Convertidas</h2>
        </div>
        <div className="table-responsive">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--pulpos-border)' }}>
                <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--pulpos-text-muted)' }}>ID</th>
                <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--pulpos-text-muted)' }}>Fecha Original</th>
                <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--pulpos-text-muted)' }}>Cliente</th>
                <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--pulpos-text-muted)' }}>Asesor</th>
                <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--pulpos-text-muted)', textAlign: 'right' }}>Monto</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map(quote => (
                <tr key={quote.id} style={{ borderBottom: '1px solid var(--pulpos-border)' }}>
                  <td style={{ padding: '1rem', fontWeight: 'bold' }}>#{quote.id.slice(0, 8)}</td>
                  <td style={{ padding: '1rem', color: 'var(--pulpos-text-muted)' }}>{new Date(quote.createdAt).toLocaleString('es-MX')}</td>
                  <td style={{ padding: '1rem' }}>{quote.customer?.name || 'Venta de Mostrador'}</td>
                  <td style={{ padding: '1rem' }}>{quote.user.name}</td>
                  <td style={{ padding: '1rem', fontWeight: 'bold', color: '#16a34a', textAlign: 'right' }}>
                    {formatCurrency(quote.total)}
                  </td>
                </tr>
              ))}
              {quotes.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: '4rem', textAlign: 'center', color: 'var(--pulpos-text-muted)' }}>
                    No hay cotizaciones convertidas aún.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
