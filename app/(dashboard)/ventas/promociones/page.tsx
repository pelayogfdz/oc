import { getActiveBranch } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import * as Icons from 'lucide-react';
import { FileText, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { deleteEntity } from '@/app/actions/crud';

export default async function Page() {
  const branch = await getActiveBranch();
  const data = await prisma.promotion.findMany({ where: { branchId: branch.id } });
  const SpecificIcon = (Icons as any)['Tag'] || Icons.Box;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <SpecificIcon size={28} color="#ec4899" />
            Promociones y Reglas
          </h1>
        </div>
        <Link href="/ventas/promociones/nuevo" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#ec4899', borderColor: '#ec4899', textDecoration: 'none' }}>
          <Plus size={18} /> Nuevo Registro
        </Link>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: '#f8fafc' }}>
            <tr>
              <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Promoción</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Valor</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Estado</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item: any) => (
              <tr key={item.id} style={{ borderBottom: '1px solid var(--pulpos-border)' }}>
                <td style={{ padding: '1rem' }}>
                  <div style={{ fontWeight: '500' }}>{item.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--pulpos-text-muted)' }}>Tipo: {item.type === 'PERCENTAGE' ? 'Porcentaje' : 'Monto Fijo'}</div>
                </td>
                <td style={{ padding: '1rem', fontWeight: 'bold' }}>
                  {item.type === 'PERCENTAGE' ? `${item.value}%` : `$${item.value.toFixed(2)}`}
                </td>
                <td style={{ padding: '1rem' }}>
                  <span style={{ backgroundColor: item.active ? '#dcfce7' : '#fee2e2', color: item.active ? '#166534' : '#991b1b', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                    {item.active ? 'ACTIVO' : 'INACTIVO'}
                  </span>
                </td>
                <td style={{ padding: '1rem' }}>
                    <form action={async () => { 'use server'; await deleteEntity('promotion', item.id); }}>
                       <button style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={16}/></button>
                    </form>
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: '4rem', textAlign: 'center', color: 'var(--pulpos-text-muted)' }}>
                  <FileText size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                  No hay promociones registradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
