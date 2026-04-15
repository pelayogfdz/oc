import { getActiveBranch } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import * as Icons from 'lucide-react';
import { FileText, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { deleteEntity } from '@/app/actions/crud';

export default async function Page() {
  const branch = await getActiveBranch();
  const data = await prisma.customer.findMany({ where: { branchId: branch.id } });
  const SpecificIcon = (Icons as any)['Users'] || Icons.Box;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <SpecificIcon size={28} color="#0ea5e9" />
            Directorio de Clientes B2B
          </h1>
        </div>
        <Link href="/clientes/nuevo" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#0ea5e9', borderColor: '#0ea5e9', textDecoration: 'none' }}>
          <Plus size={18} /> Nuevo Registro
        </Link>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: '#f8fafc' }}>
            <tr>
              <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Cliente</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Contacto</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Límite de Crédito</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item: any) => (
              <tr key={item.id} style={{ borderBottom: '1px solid var(--pulpos-border)' }}>
                <td style={{ padding: '1rem' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '1rem', color: '#0f172a' }}>{item.name}</div>
                  {item.taxId && <div style={{ fontSize: '0.75rem', color: 'var(--pulpos-text-muted)', marginTop: '0.25rem' }}>RFC: {item.taxId}</div>}
                </td>
                <td style={{ padding: '1rem', color: '#475569', fontSize: '0.9rem' }}>
                  <div>{item.email || '- Sin Correo -'}</div>
                  <div style={{ marginTop: '0.25rem' }}>{item.phone || '- Sin Teléfono -'}</div>
                </td>
                <td style={{ padding: '1rem', fontWeight: 'bold', color: item.creditLimit > 0 ? '#10b981' : '#64748b' }}>
                  ${item.creditLimit?.toFixed(2) || '0.00'}
                </td>
                <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <Link href={`/clientes/${item.id}/editar`} style={{ color: '#0ea5e9', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Icons.Edit size={16} />
                      </Link>
                      <form action={async () => { 'use server'; await deleteEntity('customer', item.id); }}>
                         <button style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                           <Trash2 size={16}/> 
                         </button>
                      </form>
                    </div>
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: '4rem', textAlign: 'center', color: 'var(--pulpos-text-muted)' }}>
                  <FileText size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                  No tienes clientes registrados aún.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
