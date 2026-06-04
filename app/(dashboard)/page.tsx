import { prisma } from '@/lib/prisma';
import { getActiveBranch } from '@/app/actions/auth';
import { ShoppingCart, PackagePlus, DollarSign, WalletCards } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils'; // wait, do we have this? Let's just use intl.

export default async function DashboardPage() {
  const branch = await getActiveBranch();
  if (!branch) return <div>Cargando...</div>;

  // Get start and end of today (aligned with Mexico standard GMT-6 timezone)
  const MEXICO_OFFSET_MS = 6 * 60 * 60 * 1000;
  const now = new Date();
  const utcNow = new Date(now.getTime() + now.getTimezoneOffset() * 60000);
  const mexicoNow = new Date(utcNow.getTime() - MEXICO_OFFSET_MS);

  const startOfMexicoDay = new Date(mexicoNow);
  startOfMexicoDay.setHours(0, 0, 0, 0);
  const endOfMexicoDay = new Date(mexicoNow);
  endOfMexicoDay.setHours(23, 59, 59, 999);

  const startOfDay = new Date(startOfMexicoDay.getTime() + MEXICO_OFFSET_MS);
  const endOfDay = new Date(endOfMexicoDay.getTime() + MEXICO_OFFSET_MS);

  // Start and end of current month in Mexico (GMT-6)
  const startOfMexicoMonth = new Date(mexicoNow);
  startOfMexicoMonth.setDate(1);
  startOfMexicoMonth.setHours(0, 0, 0, 0);

  const endOfMexicoMonth = new Date(mexicoNow);
  endOfMexicoMonth.setMonth(endOfMexicoMonth.getMonth() + 1);
  endOfMexicoMonth.setDate(0);
  endOfMexicoMonth.setHours(23, 59, 59, 999);

  const startOfMonth = new Date(startOfMexicoMonth.getTime() + MEXICO_OFFSET_MS);
  const endOfMonth = new Date(endOfMexicoMonth.getTime() + MEXICO_OFFSET_MS);

  const branchFilter = branch.id === 'GLOBAL'
    ? { branch: { tenantId: branch.tenantId } }
    : { branchId: branch.id };

  // Phase 1: Parallel DB Aggregations and Counts
  const [
    todayAggregate,
    recentSales,
    topCustomersGroup,
    topProductsGroup,
    lowStockProducts
  ] = await Promise.all([
    prisma.sale.aggregate({
      _sum: { total: true },
      _count: { id: true },
      where: {
        branchId: branch.id,
        createdAt: { gte: startOfDay, lte: endOfDay }
      }
    }),
    prisma.sale.findMany({
      where: {
        branchId: branch.id,
        createdAt: { gte: startOfDay, lte: endOfDay }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    }),
    prisma.sale.groupBy({
      by: ['customerId'],
      where: {
        ...branchFilter,
        createdAt: { gte: startOfMonth, lte: endOfMonth },
        status: { not: 'CANCELLED' },
        customerId: { not: null }
      },
      _sum: { total: true },
      _count: { id: true },
      orderBy: {
        _sum: { total: 'desc' }
      },
      take: 5
    }),
    prisma.saleItem.groupBy({
      by: ['productId'],
      where: {
        sale: {
          ...branchFilter,
          createdAt: { gte: startOfMonth, lte: endOfMonth },
          status: { not: 'CANCELLED' }
        }
      },
      _sum: { quantity: true },
      orderBy: {
        _sum: { quantity: 'desc' }
      },
      take: 5
    }),
    prisma.product.count({
      where: {
        branchId: branch.id,
        stock: { lte: 5 } // Arbitrary threshold or we could use minStock
      }
    })
  ]);

  const totalSalesValue = todayAggregate._sum.total || 0;
  const totalOrders = todayAggregate._count.id || 0;
  const avgTicket = totalOrders > 0 ? totalSalesValue / totalOrders : 0;

  // Phase 2: Parallel Fetching of metadata for Top 5 Clientes and Top 5 Productos
  const customerIds = topCustomersGroup.map(g => g.customerId).filter(Boolean) as string[];
  const productIds = topProductsGroup.map(g => g.productId).filter(Boolean) as string[];

  const [customers, products, revenueItems] = await Promise.all([
    prisma.customer.findMany({
      where: { id: { in: customerIds } },
      select: { id: true, name: true, phone: true }
    }),
    prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, sku: true }
    }),
    prisma.saleItem.findMany({
      where: {
        productId: { in: productIds },
        sale: {
          ...branchFilter,
          createdAt: { gte: startOfMonth, lte: endOfMonth },
          status: { not: 'CANCELLED' }
        }
      },
      select: {
        productId: true,
        quantity: true,
        price: true
      }
    })
  ]);

  const customerLookup = new Map(customers.map(c => [c.id, c]));
  const productLookup = new Map(products.map(p => [p.id, p]));

  const productRevenueMap = new Map<string, number>();
  revenueItems.forEach(item => {
    const current = productRevenueMap.get(item.productId) || 0;
    productRevenueMap.set(item.productId, current + (item.quantity * item.price));
  });

  // Format topCustomers
  const topCustomers = topCustomersGroup.map(g => {
    const cust = customerLookup.get(g.customerId!);
    return {
      id: g.customerId,
      name: cust?.name || "Sin Nombre",
      phone: cust?.phone || "Sin Teléfono",
      totalPurchased: g._sum.total || 0,
      orderCount: g._count.id || 0
    };
  });

  const maxCustomerPurchased = topCustomers.length > 0 ? topCustomers[0].totalPurchased : 1;

  // Format topProducts
  const topProducts = topProductsGroup.map((g, idx) => {
    const prod = productLookup.get(g.productId);
    return {
      id: g.productId,
      name: prod?.name || "Producto Desconocido",
      sku: prod?.sku || "S/K",
      quantitySold: g._sum.quantity || 0,
      totalRevenue: productRevenueMap.get(g.productId) || 0
    };
  });

  const getInitials = (name: string) => {
    if (!name) return "C";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const getHslColor = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash % 360);
    return `hsl(${h}, 75%, 40%)`;
  };

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
          {recentSales.length > 0 ? (
             <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
               <thead>
                 <tr style={{ borderBottom: '2px solid #f3f4f6', textAlign: 'left' }}>
                   <th style={{ padding: '0.75rem 0', color: '#6b7280', fontSize: '0.875rem' }}>Ticket</th>
                   <th style={{ padding: '0.75rem 0', color: '#6b7280', fontSize: '0.875rem' }}>Hora</th>
                   <th style={{ padding: '0.75rem 0', color: '#6b7280', fontSize: '0.875rem' }}>Total</th>
                 </tr>
               </thead>
               <tbody>
                 {recentSales.map(sale => (
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

      {/* Sección Premium: Reportes del Mes Actual (MTD) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '1.5rem', marginTop: '2rem' }}>
        
        {/* Card 1: 🏆 Mejores Clientes (Mes Actual) */}
        <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                🏆 Mejores Clientes <span style={{ fontSize: '0.8rem', backgroundColor: '#e0f2fe', color: '#0369a1', padding: '0.2rem 0.6rem', borderRadius: '1rem', fontWeight: 'bold' }}>Mes en Curso</span>
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '0.25rem', marginBottom: 0 }}>Basado en compras acumuladas y volumen facturado</p>
            </div>
            <Link href="/reportes/top-clientes" style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#3b82f6', textDecoration: 'underline' }}>Ver detalle</Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {topCustomers.length > 0 ? (
              topCustomers.map((cust: any, idx: number) => {
                const percentage = Math.min(100, Math.round((cust.totalPurchased / maxCustomerPurchased) * 100));
                const avatarColor = getHslColor(cust.name);
                return (
                  <div key={cust.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: avatarColor, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.9rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                      {getInitials(cust.name)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {idx + 1}. {cust.name}
                        </span>
                        <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#16a34a' }}>
                          {formatter.format(cust.totalPurchased)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#64748b' }}>
                        <span style={{ flexShrink: 0 }}>🛒 {cust.orderCount} compras</span>
                        <div style={{ flex: 1, height: '6px', backgroundColor: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${percentage}%`, height: '100%', backgroundColor: '#22c55e', borderRadius: '3px', transition: 'width 0.5s ease-out' }} />
                        </div>
                        <span style={{ flexShrink: 0, fontWeight: 'bold', color: '#334155' }}>{percentage}%</span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ padding: '2rem 0', textAlign: 'center', color: '#9ca3af', fontSize: '0.9rem' }}>
                No hay compras registradas en este mes.
              </div>
            )}
          </div>
        </div>

        {/* Card 2: 📦 Productos Más Vendidos (Mes Actual) */}
        <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                📦 Productos Más Vendidos <span style={{ fontSize: '0.8rem', backgroundColor: '#fdf2f8', color: '#be185d', padding: '0.2rem 0.6rem', borderRadius: '1rem', fontWeight: 'bold' }}>Mes en Curso</span>
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '0.25rem', marginBottom: 0 }}>Artículos líderes por unidades desplazadas</p>
            </div>
            <Link href="/reportes/top-productos" style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#3b82f6', textDecoration: 'underline' }}>Ver detalle</Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {topProducts.length > 0 ? (
              topProducts.map((prod: any, idx: number) => {
                return (
                  <div key={prod.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem', color: '#64748b' }}>
                      #{idx + 1}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <div style={{ minWidth: 0 }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#1e293b', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {prod.name}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'monospace', fontWeight: '600' }}>
                            SKU: {prod.sku}
                          </span>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#0f172a', display: 'block' }}>
                            {prod.quantitySold} uds
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {formatter.format(prod.totalRevenue)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ padding: '2rem 0', textAlign: 'center', color: '#9ca3af', fontSize: '0.9rem' }}>
                No hay ventas registradas en este mes.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

