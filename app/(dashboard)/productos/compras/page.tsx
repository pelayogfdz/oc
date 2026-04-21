import { getActiveBranch } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import { ShoppingCart, Plus, Calendar, Store, CreditCard } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function ComprasPage() {
  const branch = await getActiveBranch();
  
  const purchases = await prisma.purchase.findMany({
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
            Órdenes de Compra
          </h1>
          <p style={{ color: 'var(--pulpos-text-muted)', marginTop: '0.25rem' }}>
            Historial de compras directas ingresadas al inventario.
          </p>
        </div>
        <Link href="/productos/compras/nuevo" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--pulpos-primary)', borderColor: 'var(--pulpos-primary)', color: 'white', textDecoration: 'none' }}>
          <Plus size={18} /> Nueva Compra Directa
        </Link>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-responsive">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px' }}>
            <thead style={{ backgroundColor: 'var(--pulpos-bg)' }}>
              <tr>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Folio / Fecha</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Proveedor</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Sucursal</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Forma de Pago</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Artículos</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)', textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((purchase: any) => (
                <tr key={purchase.id} style={{ borderBottom: '1px solid var(--pulpos-border)' }}>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: '500' }}>#{purchase.id.substring(0,8).toUpperCase()}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--pulpos-text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={12} /> {new Date(purchase.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: 'bold' }}>{purchase.supplier?.name || 'Varios / Sin Especificar'}</div>
                  </td>
                  <td style={{ padding: '1rem', color: 'var(--pulpos-text-muted)', fontSize: '0.9rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                       <Store size={14} /> {purchase.branch?.name || 'Central'}
                    </div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ 
                      backgroundColor: 'var(--pulpos-bg)', 
                      padding: '0.2rem 0.5rem', 
                      borderRadius: '4px', 
                      fontSize: '0.75rem', 
                      fontWeight: 'bold',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <CreditCard size={12}/> {
                        purchase.paymentMethod === 'CASH' ? 'Efectivo' :
                        purchase.paymentMethod === 'CARD' ? 'Tarjeta' :
                        purchase.paymentMethod === 'TRANSFER' ? 'Transferencia' :
                        purchase.paymentMethod === 'CREDIT' ? 'Crédito' :
                        purchase.paymentMethod
                      }
                    </span>
                    {purchase.paymentMethod === 'CREDIT' && (
                        <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '4px' }}>
                           Deuda: ${purchase.balanceDue.toFixed(2)}
                        </div>
                    )}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    {purchase.items.length} líneas
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold', color: 'var(--pulpos-primary)' }}>
                    ${purchase.total.toFixed(2)}
                  </td>
                </tr>
              ))}
              {purchases.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: '4rem', textAlign: 'center', color: 'var(--pulpos-text-muted)' }}>
                    <ShoppingCart size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                    No hay compras registradas.
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
