import { prisma } from '@/lib/prisma';
import { getActiveBranch } from '@/app/actions/auth';
import Link from 'next/link';
import { PlusCircle, ShoppingCart } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { getBranchFilter } from '@/lib/utils';

export default async function ComprasPage() {
  const branch = await getActiveBranch();

  const purchases = await prisma.purchase.findMany({
    where: getBranchFilter(branch),
    include: {
      supplier: true,
      user: true,
      _count: {
        select: { items: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>Historial de Compras y Gastos</h1>
          <p style={{ color: 'var(--pulpos-text-muted)' }}>Registro de abastecimiento de inventario</p>
        </div>
        <Link href="/productos/compras/nueva" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
          <PlusCircle size={20} />
          Registrar Compra
        </Link>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--pulpos-border)' }}>
            <tr>
              <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold', color: 'var(--pulpos-text-muted)' }}>ID</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold', color: 'var(--pulpos-text-muted)' }}>Fecha</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold', color: 'var(--pulpos-text-muted)' }}>Proveedor</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold', color: 'var(--pulpos-text-muted)' }}>Artículos</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold', color: 'var(--pulpos-text-muted)' }}>Total</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold', color: 'var(--pulpos-text-muted)' }}>Pago</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold', color: 'var(--pulpos-text-muted)' }}>Usuario</th>
            </tr>
          </thead>
          <tbody>
            {purchases.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--pulpos-text-muted)' }}>
                  <ShoppingCart size={48} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
                  <p>No has registrado ninguna compra a proveedores aún.</p>
                </td>
              </tr>
            ) : (
              purchases.map(purchase => (
                <tr key={purchase.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '1rem', fontFamily: 'monospace' }}>#{purchase.id.slice(0, 8)}</td>
                  <td style={{ padding: '1rem' }}>
                    {format(new Date(purchase.createdAt), "d 'de' MMMM, yyyy", { locale: es })}<br/>
                    <span style={{ fontSize: '0.8rem', color: 'var(--pulpos-text-muted)' }}>
                      {format(new Date(purchase.createdAt), "HH:mm")}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', fontWeight: 'bold' }}>
                    {purchase.supplier?.name || "Sin Proveedor"}
                  </td>
                  <td style={{ padding: '1rem' }}>{purchase._count.items}</td>
                  <td style={{ padding: '1rem', fontWeight: 'bold', color: 'var(--pulpos-primary)' }}>
                    ${purchase.total.toFixed(2)}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ 
                      padding: '0.25rem 0.5rem', 
                      borderRadius: '12px', 
                      fontSize: '0.75rem', 
                      fontWeight: 'bold',
                      backgroundColor: purchase.paymentMethod === 'CREDIT' ? '#fef3c7' : '#e0e7ff',
                      color: purchase.paymentMethod === 'CREDIT' ? '#d97706' : '#4338ca'
                    }}>
                      {purchase.paymentMethod}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.9rem' }}>{purchase.user.name}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
