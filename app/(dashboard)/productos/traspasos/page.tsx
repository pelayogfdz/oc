import { getActiveBranch } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import * as Icons from 'lucide-react';
import { FileText, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { deleteEntity } from '@/app/actions/crud';

export default async function Page() {
  const branch = await getActiveBranch();
  const data = await prisma.transfer.findMany({ 
    where: { 
      OR: [
        { branchId: branch.id },
        { toBranchId: branch.id }
      ]
    },
    include: { toBranch: true, branch: true }
  });
  const SpecificIcon = (Icons as any)['Truck'] || Icons.Box;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <SpecificIcon size={28} color="#8b5cf6" />
            Traspasos de Inventario
          </h1>
        </div>
        <Link href="/productos/traspasos/nuevo" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#8b5cf6', borderColor: '#8b5cf6', textDecoration: 'none' }}>
          <Plus size={18} /> Nuevo Registro
        </Link>
      </div>
      <div className="card" style={{ padding: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: '#f8fafc' }}>
            <tr>
              <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Traspaso ID</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Sucursal Destino</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Fecha</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Estado</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item: any) => {
              const isIncoming = item.toBranchId === branch.id;
              
              return (
              <tr key={item.id} style={{ borderBottom: '1px solid var(--pulpos-border)' }}>
                <td style={{ padding: '1rem', fontWeight: '500' }}>
                  #{item.id.substring(0,8).toUpperCase()}
                  <span style={{ marginLeft: '8px', fontSize: '10px', padding: '2px 4px', borderRadius: '4px', backgroundColor: isIncoming ? '#e0e7ff' : '#f1f5f9', color: isIncoming ? '#4338ca' : '#475569' }}>
                     {isIncoming ? 'ENTRANTE' : 'SALIENTE'}
                  </span>
                </td>
                <td style={{ padding: '1rem' }}>
                  {isIncoming ? (item.branch?.name || 'Central') : (item.toBranch?.name || 'Otra')}
                </td>
                <td style={{ padding: '1rem', color: 'var(--pulpos-text-muted)' }}>{new Date(item.createdAt).toLocaleString()}</td>
                <td style={{ padding: '1rem' }}>
                  <span style={{ 
                    backgroundColor: item.status === 'COMPLETED' ? '#dcfce7' : '#fef9c3', 
                    color: item.status === 'COMPLETED' ? '#166534' : '#854d0e', 
                    padding: '0.2rem 0.5rem', 
                    borderRadius: '4px', 
                    fontSize: '0.75rem', 
                    fontWeight: 'bold' 
                  }}>
                    {item.status === 'COMPLETED' ? 'COMPLETADO' : item.status === 'IN_TRANSIT' ? 'EN TRÁNSITO' : item.status}
                  </span>
                </td>
                <td style={{ padding: '1rem', display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {isIncoming && item.status === 'IN_TRANSIT' && (
                       <form action={async () => { 'use server'; const t = await import('@/app/actions/transfer'); await t.receiveTransfer(item.id); }}>
                          <button style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                            Recibir Stock
                          </button>
                       </form>
                    )}
                    {!isIncoming && (
                      <form action={async () => { 'use server'; await deleteEntity('transfer', item.id); }}>
                         <button style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={16}/></button>
                      </form>
                    )}
                </td>
              </tr>
            )})}
            {data.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: '4rem', textAlign: 'center', color: 'var(--pulpos-text-muted)' }}>
                  <FileText size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                  No hay traspasos registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
