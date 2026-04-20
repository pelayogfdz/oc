import { getActiveBranch } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import * as Icons from 'lucide-react';
import { FileText, Plus, Trash2, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { deleteEntity } from '@/app/actions/crud';
import DashboardMatrix from './DashboardMatrix';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const branch = await getActiveBranch();
  const whereClause = branch.id === 'GLOBAL' ? {} : { 
    OR: [
      { branchId: branch.id },
      { toBranchId: branch.id }
    ]
  };

  const data = await prisma.transfer.findMany({ 
    where: whereClause,
    include: { toBranch: true, branch: true, createdBy: true, receivedBy: true },
    orderBy: { createdAt: 'desc' }
  });
  const SpecificIcon = (Icons as any)['Truck'] || Icons.Box;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <SpecificIcon size={28} color="var(--pulpos-primary)" />
            Traspasos de Inventario
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Link href="/productos/traspasos/solicitar" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', color: '#334155', padding: '0.5rem 1rem', borderRadius: '4px', textDecoration: 'none', fontWeight: 'bold' }}>
            Solicitar Traspaso
          </Link>
          <Link href="/productos/traspasos/salida" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--pulpos-primary)', borderColor: 'var(--pulpos-primary)', color: 'white', textDecoration: 'none' }}>
            <ArrowRight size={18} /> Enviar Traspaso Directo
          </Link>
        </div>
      </div>

      <DashboardMatrix activeBranch={branch} />

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-responsive">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
            <thead style={{ backgroundColor: '#f8fafc' }}>
              <tr>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Traspaso ID</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Ruta (Origen → Destino)</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Información</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Estado</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)', textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item: any) => {
                const isIncoming = item.toBranchId === branch.id;
                
                return (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--pulpos-border)' }}>
                  <td style={{ padding: '1rem', fontWeight: '500' }}>
                    #{item.id.substring(0,8).toUpperCase()}
                    <span style={{ marginLeft: '8px', fontSize: '10px', padding: '2px 4px', borderRadius: '4px', display: 'inline-block', backgroundColor: isIncoming ? '#e0e7ff' : '#f1f5f9', color: isIncoming ? '#4338ca' : '#475569' }}>
                       {isIncoming ? 'ENTRANTE' : 'SALIENTE'}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: '500', color: '#0f172a' }}>{item.branch?.name || 'Central'}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                      <ArrowRight size={12} /> {item.toBranch?.name || 'N/A'}
                    </div>
                  </td>
                  <td style={{ padding: '1rem', color: 'var(--pulpos-text-muted)', fontSize: '0.9rem' }}>
                    <div style={{ marginBottom: '0.2rem' }}>{new Date(item.createdAt).toLocaleString()}</div>
                    {item.createdBy && <div><span style={{fontWeight: 500}}>Enviado por:</span> {item.createdBy.name}</div>}
                    {item.receivedBy && <div><span style={{fontWeight: 500}}>Recibido por:</span> {item.receivedBy.name}</div>}
                  </td>
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
                    <td style={{ padding: '1rem', display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'flex-end' }}>
                      <Link href={`/productos/traspasos/${item.id}/imprimir`} target="_blank" style={{ backgroundColor: 'white', color: 'var(--pulpos-primary)', border: '1px solid var(--pulpos-primary)', padding: '0.4rem 0.75rem', borderRadius: '4px', cursor: 'pointer', fontWeight: '500', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}>
                         Imprimir
                      </Link>
                      <Link href={`/productos/traspasos/${item.id}`} style={{ backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '0.4rem 0.75rem', borderRadius: '4px', cursor: 'pointer', fontWeight: '500', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}>
                         Ver Detalle
                      </Link>
                      {isIncoming && item.status === 'IN_TRANSIT' && (
                         <form action={async () => { 'use server'; const t = await import('@/app/actions/transfer'); await t.receiveTransfer(item.id); }}>
                            <button style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '0.4rem 0.75rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}>
                              Recibir

                            </button>
                         </form>
                      )}
                      {!isIncoming && (
                        <form action={async () => { 'use server'; await import('@/app/actions/transfer').then(m => m.deleteTransfer(item.id)); }}>
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
    </div>
  );
}
