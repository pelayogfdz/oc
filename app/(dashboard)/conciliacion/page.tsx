import { getActiveBranch } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import { HandCoins, FileText, UploadCloud, CheckCircle } from 'lucide-react';
import { revalidatePath } from "next/cache";

async function reconcileSession(formData: FormData) {
  'use server';
  // Fake action to reconcile
  revalidatePath('/conciliacion');
}

export default async function ConciliacionPage() {
  const branch = await getActiveBranch();
  const sessions = await prisma.cashSession.findMany({ 
    where: { branchId: branch.id, status: "CLOSED" },
    include: { user: true },
    orderBy: { closedAt: 'desc' }
  });

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <HandCoins size={28} color="#059669" />
            Conciliación Bancaria
          </h1>
          <p style={{ color: 'var(--pulpos-text-muted)', marginTop: '0.25rem' }}>
            Asegura que los depósitos de cada corte coincidan exactamente con tu estado de cuenta bancario.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 3fr', gap: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
           <div className="card" style={{ padding: '1.5rem', backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 'bold', color: '#047857', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                 <UploadCloud size={18} /> Cargar Estado Cuenta
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#059669', marginBottom: '1rem' }}>
                Sube tu archivo .CSV o .XLS del banco para auto-conciliar los depósitos de terminal y transferencias.
              </p>
              <button className="btn-primary" style={{ width: '100%', backgroundColor: '#059669', borderColor: '#059669' }}>
                Subir Archivo
              </button>
           </div>
        </div>

        <div className="card" style={{ padding: 0 }}>
          <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: '#f8fafc' }}>
              <tr>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Fecha de Corte</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)', textAlign: 'right' }}>Monto A Depositar</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Estado</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)', textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((item: any) => (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--pulpos-border)' }}>
                  <td data-label="Fecha de Corte" style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: '500' }}>{item.closedAt?.toLocaleString() || 'Desconocido'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--pulpos-text-muted)' }}>Cajero: {item.user?.name}</div>
                  </td>
                  <td data-label="Monto A Depositar" style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold', color: '#0f172a' }}>
                    ${(item.actualAmount || item.expectedAmount || 0).toFixed(2)}
                  </td>
                  <td data-label="Estado" style={{ padding: '1rem' }}>
                     <span style={{ backgroundColor: '#fef3c7', color: '#b45309', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>PENDIENTE BANCARIO</span>
                  </td>
                  <td data-label="Acciones" style={{ padding: '1rem', textAlign: 'center' }}>
                     <form action={reconcileSession}>
                       <input type="hidden" name="id" value={item.id} />
                       <button type="submit" style={{ backgroundColor: '#f1f5f9', color: '#059669', padding: '0.5rem 1rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontWeight: 'bold', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                         <CheckCircle size={16} /> Marcar Conciliado
                       </button>
                     </form>
                  </td>
                </tr>
              ))}
              {sessions.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: '4rem', textAlign: 'center', color: 'var(--pulpos-text-muted)' }}>
                    <FileText size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                    No hay cortes de caja pendientes de conciliar.
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
