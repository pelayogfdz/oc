import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { getActiveBranch } from "@/app/actions/auth";
import { getBranchFilter } from "@/lib/utils";

export default async function VentasPage() {
  const branch = await getActiveBranch();
  
  const sales = await prisma.sale.findMany({
    where: getBranchFilter(branch),
    include: {
      user: true,
      branch: true,
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
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>Historial de Ventas</h1>
          <p style={{ color: 'var(--pulpos-text-muted)' }}>Módulo de ventas y cortes de caja</p>
        </div>
        <Link href="/ventas/nueva" className="btn-primary" style={{ padding: '0.75rem 1.5rem', textDecoration: 'none' }}>
          + Nueva Venta / TPV
        </Link>
      </div>

      <div className="card">
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--pulpos-border)', backgroundColor: '#f9fafb' }}>
              <th style={{ padding: '1rem', color: 'var(--pulpos-text-muted)', fontWeight: '500' }}>ID Venta</th>
              <th style={{ padding: '1rem', color: 'var(--pulpos-text-muted)', fontWeight: '500' }}>Fecha / Hora</th>
              <th style={{ padding: '1rem', color: 'var(--pulpos-text-muted)', fontWeight: '500' }}>Sucursal / Vendedor</th>
              <th style={{ padding: '1rem', color: 'var(--pulpos-text-muted)', fontWeight: '500', textAlign: 'right' }}>Artículos</th>
              <th style={{ padding: '1rem', color: 'var(--pulpos-text-muted)', fontWeight: '500', textAlign: 'right' }}>Total</th>
              <th style={{ padding: '1rem', color: 'var(--pulpos-text-muted)', fontWeight: '500', textAlign: 'center' }}>Estado</th>
              <th style={{ padding: '1rem', color: 'var(--pulpos-text-muted)', fontWeight: '500', textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sales.map(sale => (
              <tr key={sale.id} style={{ borderBottom: '1px solid var(--pulpos-border)' }}>
                <td style={{ padding: '1rem', fontFamily: 'monospace' }}>
                  {sale.id.slice(0, 8)}
                </td>
                <td style={{ padding: '1rem' }}>
                  {new Date(sale.createdAt).toLocaleString()}
                </td>
                <td style={{ padding: '1rem' }}>
                  <div style={{ fontWeight: '500' }}>{sale.branch?.name || branch.name}</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--pulpos-text-muted)' }}>Vendió: {sale.user.name}</div>
                </td>
                <td style={{ padding: '1rem', textAlign: 'right', color: 'var(--pulpos-text-muted)' }}>
                  {sale.items.reduce((sum, item) => sum + item.quantity, 0)} Pzas
                </td>
                <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold' }}>
                  ${sale.total.toFixed(2)}
                </td>
                <td style={{ padding: '1rem', textAlign: 'center' }}>
                  <span style={{ 
                    padding: '0.25rem 0.5rem', 
                    borderRadius: '12px', 
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    backgroundColor: sale.status === 'COMPLETED' ? '#dcfce7' : '#f1f5f9',
                    color: sale.status === 'COMPLETED' ? '#166534' : '#334155'
                  }}>
                    {sale.status === 'COMPLETED' ? 'Completado' : sale.status}
                  </span>
                </td>
                <td style={{ padding: '1rem', textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                    <Link href={`/ventas/${sale.id}`} style={{ padding: '0.25rem', color: '#64748b', display: 'flex', alignItems: 'center' }} title="Ver Detalle">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                    </Link>
                    <Link target="_blank" href={`/ventas/${sale.id}/imprimir`} style={{ padding: '0.25rem', color: '#64748b', display: 'flex', alignItems: 'center' }} title="Imprimir">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
            {sales.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--pulpos-text-muted)' }}>
                  Aún no se han registrado ventas en esta sucursal.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
