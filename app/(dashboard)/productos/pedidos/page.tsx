import { getActiveBranch } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import { ShoppingCart, Plus, CheckCircle, Clock, Search, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function PurchaseOrdersPage() {
  const branch = await getActiveBranch();
  
  // Find orders for active branch
  const orders = await prisma.purchaseOrder.findMany({
    where: branch.id === 'GLOBAL' ? {} : { branchId: branch.id },
    include: {
      supplier: true,
      user: true,
      branch: true,
      items: {
        include: { product: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ShoppingCart size={28} color="var(--pulpos-primary)" />
            Pedidos a Proveedores
          </h1>
          <p style={{ color: 'var(--pulpos-text-muted)', marginTop: '0.25rem' }}>
            Gestiona compras proyectadas, sugeridos de abastecimiento y recepciones de mercancía.
          </p>
        </div>
        <Link href="/productos/pedidos/nuevo" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--pulpos-primary)', borderColor: 'var(--pulpos-primary)', color: 'white', textDecoration: 'none' }}>
          <Plus size={18} /> Crear / Sugerido
        </Link>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-responsive">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
            <thead style={{ backgroundColor: 'var(--pulpos-bg)' }}>
              <tr>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Folio / Fecha</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Proveedor</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Sucursal Solicitante</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Artículos</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)', textAlign: 'right' }}>Total Estimado</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)', textAlign: 'center' }}>Estado</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)', textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order: any) => (
                <tr key={order.id} style={{ borderBottom: '1px solid var(--pulpos-border)' }}>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: '500' }}>#{order.id.substring(0,8).toUpperCase()}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--pulpos-text-muted)' }}>{new Date(order.createdAt).toLocaleDateString()}</div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: 'bold' }}>{order.supplier?.name || 'Por Definir'}</div>
                  </td>
                  <td style={{ padding: '1rem', color: 'var(--pulpos-text-muted)', fontSize: '0.9rem' }}>
                    {order.branch?.name || 'Central'}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    {order.items.length} líneas
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold' }}>
                    ${order.total.toFixed(2)}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <span style={{ 
                      backgroundColor: order.status === 'RECEIVED' ? '#dcfce7' : '#fef9c3', 
                      color: order.status === 'RECEIVED' ? '#166534' : '#854d0e', 
                      padding: '0.2rem 0.5rem', 
                      borderRadius: '4px', 
                      fontSize: '0.75rem', 
                      fontWeight: 'bold',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      {order.status === 'RECEIVED' ? <><CheckCircle size={12}/> RECIBIDO</> : <><Clock size={12}/> PENDIENTE</>}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'flex-end' }}>
                     {order.status === 'PENDING' && (
                        <form action={async () => { 'use server'; const t = await import('@/app/actions/pedidos'); await t.receivePurchaseOrder(order.id); }}>
                          <button type="submit" style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '0.4rem 0.75rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <ArrowRight size={14} /> Jalar a Compras
                          </button>
                        </form>
                     )}
                     {order.status === 'RECEIVED' && (
                       <span style={{ fontSize: '0.8rem', color: 'var(--pulpos-text-muted)' }}>Consolidado</span>
                     )}
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: '4rem', textAlign: 'center', color: 'var(--pulpos-text-muted)' }}>
                    <ShoppingCart size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                    No hay pedidos registrados en esta sucursal.
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
