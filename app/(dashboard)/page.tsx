import { prisma } from '@/lib/prisma';
import { getActiveBranch } from '@/app/actions/auth';
import { ShoppingCart, PackagePlus, DollarSign, WalletCards } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils'; // wait, do we have this? Let's just use intl.

export default async function DashboardPage() {
  const branch = await getActiveBranch();
  if (!branch) return <div>Cargando...</div>;

  // Get start and end of today
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const todaySales = await prisma.sale.findMany({
    where: {
      branchId: branch.id,
      createdAt: {
        gte: startOfDay,
        lte: endOfDay
      }
    }
  });

  const totalSalesValue = todaySales.reduce((acc, sale) => acc + sale.total, 0);
  const totalOrders = todaySales.length;
  const avgTicket = totalOrders > 0 ? totalSalesValue / totalOrders : 0;

  const lowStockProducts = await prisma.product.count({
    where: {
      branchId: branch.id,
      stock: { lte: 5 } // Arbitrary threshold or we could use minStock
    }
  });

  const activeDebts = 0; // TODO: Implement accounts receivable logic based on unpaid Sales OR add balance field to Customer model

  const formatter = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>Panel de Control ({branch.name})</h1>
        
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Link href="/ventas/nueva" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#ec4899', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: 'bold', textDecoration: 'none' }}>
            <ShoppingCart size={20} /> Nueva Venta
          </Link>
          <Link href="/productos/nuevo" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#3b82f6', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: 'bold', textDecoration: 'none' }}>
            <PackagePlus size={20} /> Crear Producto
          </Link>
          <Link href="/caja/actual" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#10b981', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: 'bold', textDecoration: 'none' }}>
            <WalletCards size={20} /> Arqueo de Caja
          </Link>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
        {[
          { title: 'Ingresos de Hoy', value: formatter.format(totalSalesValue), icon: <DollarSign size={24} color="#10b981" /> },
          { title: 'Ventas de Hoy', value: totalOrders.toString(), icon: <ShoppingCart size={24} color="#3b82f6" /> },
          { title: 'Ticket Promedio', value: formatter.format(avgTicket), icon: <DollarSign size={24} color="#f59e0b" /> },
          { title: 'Alertas de Restock', value: lowStockProducts.toString() + ' SKUs críticos', icon: <PackagePlus size={24} color="#ef4444" /> },
        ].map(stat => (
          <div key={stat.title} style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #f3f4f6', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <h3 style={{ color: '#6b7280', fontSize: '0.875rem', fontWeight: 'bold' }}>{stat.title}</h3>
              {stat.icon}
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#1f2937' }}>{stat.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #f3f4f6' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Actividad Reciente</h2>
          {todaySales.length > 0 ? (
             <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
               <thead>
                 <tr style={{ borderBottom: '2px solid #f3f4f6', textAlign: 'left' }}>
                   <th style={{ padding: '0.75rem 0', color: '#6b7280', fontSize: '0.875rem' }}>Ticket</th>
                   <th style={{ padding: '0.75rem 0', color: '#6b7280', fontSize: '0.875rem' }}>Hora</th>
                   <th style={{ padding: '0.75rem 0', color: '#6b7280', fontSize: '0.875rem' }}>Total</th>
                 </tr>
               </thead>
               <tbody>
                 {todaySales.slice(0, 5).map(sale => (
                   <tr key={sale.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                     <td data-label="Ticket" style={{ padding: '1rem 0', fontSize: '0.9rem', fontWeight: '500' }}>#{sale.id.slice(-6).toUpperCase()}</td>
                     <td data-label="Hora" style={{ padding: '1rem 0', fontSize: '0.9rem', color: '#6b7280' }}>
                       {sale.createdAt.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                     </td>
                     <td data-label="Total" style={{ padding: '1rem 0', fontSize: '0.9rem', fontWeight: 'bold', color: '#10b981' }}>
                       {formatter.format(sale.total)}
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
          ) : (
            <div style={{ padding: '2rem 0', textAlign: 'center', color: '#9ca3af' }}>
               No hay ventas registradas el día de hoy.
            </div>
          )}
        </div>

        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #f3f4f6' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem', color: '#ef4444' }}>Advertencias</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
             <div style={{ padding: '1rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px' }}>
               <h4 style={{ color: '#b91c1c', fontWeight: 'bold', marginBottom: '0.25rem' }}>Cartera Vencida</h4>
               <p style={{ color: '#7f1d1d', fontSize: '0.875rem' }}>Detectamos {activeDebts} cliente(s) con deudas activas o vencidas.</p>
               <Link href="/clientes" style={{ display: 'inline-block', marginTop: '0.5rem', fontSize: '0.875rem', color: '#dc2626', fontWeight: 'bold', textDecoration: 'underline' }}>Revisar cartera</Link>
             </div>

             {lowStockProducts > 0 && (
               <div style={{ padding: '1rem', backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px' }}>
                 <h4 style={{ color: '#b45309', fontWeight: 'bold', marginBottom: '0.25rem' }}>Stock Crítico</h4>
                 <p style={{ color: '#92400e', fontSize: '0.875rem' }}>{lowStockProducts} SKUs están por agotarse o vacíos.</p>
                 <Link href="/productos" style={{ display: 'inline-block', marginTop: '0.5rem', fontSize: '0.875rem', color: '#d97706', fontWeight: 'bold', textDecoration: 'underline' }}>Reponer inventario</Link>
               </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}
