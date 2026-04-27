import { prisma } from "@/lib/prisma";
import { getActiveBranch } from "@/app/actions/auth";
import { formatCurrency } from "@/lib/utils";
import { Calculator } from "lucide-react";
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default async function CortesCajaPage() {
  const branch = await getActiveBranch();
  
  if (branch.id === 'GLOBAL') {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ef4444' }}>Acceso Denegado</h1>
        <p>Selecciona una sucursal para ver sus cortes de caja.</p>
      </div>
    );
  }

  const sessions = await prisma.cashSession.findMany({
    where: { branchId: branch.id, status: 'CLOSED' },
    include: { user: true },
    orderBy: { closedAt: 'desc' },
    take: 50
  });

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', fontFamily: 'var(--font-geist-sans)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>Historial y Auditoría de Cortes</h1>
          <p style={{ color: 'var(--pulpos-text-muted)' }}>Últimos 50 cierres de turno para {branch.name}.</p>
        </div>
        <Link href="/caja/actual" style={{ backgroundColor: 'var(--pulpos-primary)', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold' }}>
          Ir a Caja Actual
        </Link>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid var(--pulpos-border)' }}>
        <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--pulpos-border)' }}>
            <tr>
              <th style={{ padding: '1rem', fontWeight: 'bold', color: 'var(--pulpos-text-muted)', fontSize: '0.85rem' }}>TURNO</th>
              <th style={{ padding: '1rem', fontWeight: 'bold', color: 'var(--pulpos-text-muted)', fontSize: '0.85rem' }}>CAJERO</th>
              <th style={{ padding: '1rem', fontWeight: 'bold', color: 'var(--pulpos-text-muted)', fontSize: '0.85rem' }}>INICIAL</th>
              <th style={{ padding: '1rem', fontWeight: 'bold', color: 'var(--pulpos-text-muted)', fontSize: '0.85rem' }}>ESPERADO (SISTEMA)</th>
              <th style={{ padding: '1rem', fontWeight: 'bold', color: 'var(--pulpos-text-muted)', fontSize: '0.85rem' }}>FÍSICO (REAL)</th>
              <th style={{ padding: '1rem', fontWeight: 'bold', color: 'var(--pulpos-text-muted)', fontSize: '0.85rem' }}>SOBRANTE/FALTANTE</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session, i) => (
              <tr key={session.id} style={{ borderBottom: i === sessions.length - 1 ? 'none' : '1px solid var(--pulpos-border)' }}>
                <td data-label="Turno" style={{ padding: '1rem' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
                    {format(new Date(session.closedAt!), "dd MMM yyyy", { locale: es })}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--pulpos-text-muted)' }}>
                    {format(new Date(session.closedAt!), "HH:mm a", { locale: es })}
                  </div>
                </td>
                <td data-label="Cajero" style={{ padding: '1rem', fontSize: '0.9rem' }}>{session.user.name}</td>
                <td data-label="Inicial" style={{ padding: '1rem', fontSize: '0.9rem' }}>{formatCurrency(session.initialAmount)}</td>
                <td data-label="Esperado (Sistema)" style={{ padding: '1rem', fontSize: '0.9rem', fontWeight: 'bold' }}>{formatCurrency(session.expectedAmount || 0)}</td>
                <td data-label="Físico (Real)" style={{ padding: '1rem', fontSize: '0.9rem', fontWeight: 'bold', color: '#a21caf' }}>{formatCurrency(session.actualAmount || 0)}</td>
                <td data-label="Sobrante/Faltante" style={{ padding: '1rem', fontSize: '1rem', fontWeight: 'bold', color: (session.difference || 0) < 0 ? '#ef4444' : (session.difference || 0) > 0 ? '#10b981' : '#64748b' }}>
                  {(session.difference || 0) > 0 ? '+' : ''}{formatCurrency(session.difference || 0)}
                </td>
              </tr>
            ))}
            {sessions.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--pulpos-text-muted)' }}>
                  <Calculator size={32} style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
                  No hay cortes de caja registrados en esta sucursal.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
