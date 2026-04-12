import { getActiveBranch } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import * as Icons from 'lucide-react';
import { FileText, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { deleteEntity } from '@/app/actions/crud';

export default async function Page() {
  const branch = await getActiveBranch();
  const data = await prisma.cashSession.findMany({ where: { branchId: branch.id, status: "CLOSED" }, include: { user: true }, orderBy: { closedAt: "desc" } });
  const SpecificIcon = (Icons as any)['Briefcase'] || Icons.Box;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <SpecificIcon size={28} color="#64748b" />
            Historial de Cortes de Caja
          </h1>
        </div>
        <Link href="/caja/cortes/nuevo" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#64748b', borderColor: '#64748b', textDecoration: 'none' }}>
          <Plus size={18} /> Forzar Cierre de Caja Actual
        </Link>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: '#f8fafc' }}>
            <tr>
              <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Fecha de Corte</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Usuario</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)', textAlign: 'right' }}>Calculado</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)', textAlign: 'right' }}>Real Depositado</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)', textAlign: 'center' }}>Diferencia</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item: any) => (
              <tr key={item.id} style={{ borderBottom: '1px solid var(--pulpos-border)' }}>
                <td style={{ padding: '1rem' }}>
                  <div style={{ fontWeight: '500' }}>{item.closedAt ? item.closedAt.toLocaleString() : 'En curso'}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--pulpos-text-muted)' }}>Apertura: {item.openedAt.toLocaleString()}</div>
                </td>
                <td style={{ padding: '1rem' }}>
                   {item.user?.name || 'Desconocido'}
                </td>
                <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold' }}>
                   ${item.expectedAmount?.toFixed(2) || '0.00'}
                </td>
                <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold' }}>
                   ${item.actualAmount?.toFixed(2) || '0.00'}
                </td>
                <td style={{ padding: '1rem', textAlign: 'center' }}>
                   <span style={{ 
                     backgroundColor: (item.difference || 0) < 0 ? '#fee2e2' : (item.difference || 0) > 0 ? '#dcfce7' : '#f1f5f9', 
                     color: (item.difference || 0) < 0 ? '#991b1b' : (item.difference || 0) > 0 ? '#166534' : '#475569', 
                     padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 'bold' 
                   }}>
                     {(item.difference || 0) > 0 ? '+' : ''}{(item.difference || 0).toFixed(2)}
                   </span>
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: '4rem', textAlign: 'center', color: 'var(--pulpos-text-muted)' }}>
                  <FileText size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                  La bitácora está vacía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
