import { getActiveBranch } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import * as Icons from 'lucide-react';
import { FileText, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { deleteEntity } from '@/app/actions/crud';

export default async function Page() {
  const branch = await getActiveBranch();
  const data = await prisma.sale.findMany({ where: { branchId: branch.id, status: "REFUNDED" } });
  const SpecificIcon = (Icons as any)['ArrowRightLeft'] || Icons.Box;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <SpecificIcon size={28} color="#f43f5e" />
            Panel de Devoluciones
          </h1>
        </div>
        <Link href="/ventas/devoluciones/nuevo" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#f43f5e', borderColor: '#f43f5e', textDecoration: 'none' }}>
          <Plus size={18} /> Nuevo Registro
        </Link>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: '#f8fafc' }}>
            <tr>
              <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Ticket Original</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Método de Pago</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Total Devuelto</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item: any) => (
              <tr key={item.id} style={{ borderBottom: '1px solid var(--pulpos-border)' }}>
                <td data-label="Ticket Original" style={{ padding: '1rem' }}>
                  <div style={{ fontWeight: '500' }}>Venta #{item.id.substring(0,8).toUpperCase()}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--pulpos-text-muted)' }}>{new Date(item.createdAt).toLocaleString()}</div>
                </td>
                <td data-label="Método de Pago" style={{ padding: '1rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: '500', color: '#64748b' }}>{item.paymentMethod === 'MIXTO' ? 'Mixto (Efectivo/Tarjeta)' : item.paymentMethod === 'CASH' ? 'Efectivo' : 'Tarjeta/Otro'}</span>
                </td>
                <td data-label="Total Devuelto" style={{ padding: '1rem', fontWeight: 'bold', color: '#f43f5e' }}>
                   - ${item.total.toFixed(2)}
                </td>
                <td data-label="Estado" style={{ padding: '1rem' }}>
                  <span style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>DEVUELTO</span>
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: '4rem', textAlign: 'center', color: 'var(--pulpos-text-muted)' }}>
                  <FileText size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                  No hay devoluciones registradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
