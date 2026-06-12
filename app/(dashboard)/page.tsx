import { prisma } from '@/lib/prisma';
import { getActiveBranch } from '@/app/actions/auth';
import { ShoppingCart, PackagePlus, DollarSign, WalletCards } from 'lucide-react';
import Link from 'next/link';
import DashboardCharts from './DashboardCharts';
import { getLocalTodayRange, getUtcDateFromLocal } from '@/app/lib/timezone';

interface Props {
  searchParams: Promise<{
    startDate?: string;
    endDate?: string;
  }>;
}

export default async function DashboardPage(props: Props) {
  const branch = await getActiveBranch();
  if (!branch) return <div>Cargando...</div>;

  const resolvedParams = await props.searchParams;
  const { startDate: paramStart, endDate: paramEnd } = resolvedParams;

  // Find tenant timezone
  const tenant = await prisma.tenant.findUnique({
    where: { id: branch.tenantId },
    select: { timezone: true }
  });
  const timezone = tenant?.timezone || 'America/Mexico_City';

  // Get start and end of today (aligned with tenant's configured timezone)
  const { startUtc: startOfDay, endUtc: endOfDay } = getLocalTodayRange(timezone);

  // Default dates for the charts (Tenant local YYYY-MM-DD)
  const formatDateString = (d: Date) => {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const parts = formatter.formatToParts(d);
    const year = parts.find(p => p.type === 'year')!.value;
    const month = parts.find(p => p.type === 'month')!.value;
    const day = parts.find(p => p.type === 'day')!.value;
    return `${year}-${month}-${day}`;
  };

  const defaultEndStr = formatDateString(new Date());
  const defaultStartStr = formatDateString(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));

  const initialStartDate = paramStart || defaultStartStr;
  const initialEndDate = paramEnd || defaultEndStr;

  // Helper to parse local date string YYYY-MM-DD to timezone day range in UTC
  const getStartAndEndOfDayUtc = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const startUtc = getUtcDateFromLocal(y, m, d, 0, 0, 0, 0, timezone);
    const endUtc = getUtcDateFromLocal(y, m, d, 23, 59, 59, 999, timezone);
    return { startUtc, endUtc };
  };

  const { startUtc: filterStartUtc } = getStartAndEndOfDayUtc(initialStartDate);
  const { endUtc: filterEndDayEndUtc } = getStartAndEndOfDayUtc(initialEndDate);

  const branchFilter = branch.id === 'GLOBAL'
    ? { branch: { tenantId: branch.tenantId } }
    : { branchId: branch.id };

  // Phase 1: Parallel DB Aggregations, Counts, and Chart Sales
  const [
    todayAggregate,
    recentSales,
    topCustomersGroup,
    topProductsGroup,
    lowStockProducts,
    chartSales
  ] = await Promise.all([
    prisma.sale.aggregate({
      _sum: { total: true },
      _count: { id: true },
      where: {
        ...branchFilter,
        createdAt: { gte: startOfDay, lte: endOfDay }
      }
    }),
    prisma.sale.findMany({
      where: {
        ...branchFilter,
        createdAt: { gte: startOfDay, lte: endOfDay }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    }),
    prisma.sale.groupBy({
      by: ['customerId'],
      where: {
        ...branchFilter,
        createdAt: { gte: startOfDay, lte: endOfDay },
        status: { not: 'CANCELLED' },
        customerId: { not: null }
      },
      _sum: { total: true },
      _count: { id: true },
      orderBy: {
        _sum: { total: 'desc' }
      },
      take: 10
    }),
    prisma.saleItem.groupBy({
      by: ['productId'],
      where: {
        sale: {
          ...branchFilter,
          createdAt: { gte: startOfDay, lte: endOfDay },
          status: { not: 'CANCELLED' }
        }
      },
      _sum: { quantity: true },
      orderBy: {
        _sum: { quantity: 'desc' }
      },
      take: 10
    }),
    prisma.product.count({
      where: {
        ...branchFilter,
        isService: false,
        stock: { lte: 5 }
      }
    }),
    prisma.sale.findMany({
      where: {
        ...branchFilter,
        createdAt: { gte: filterStartUtc, lte: filterEndDayEndUtc },
        status: { not: 'CANCELLED' }
      },
      select: {
        total: true,
        createdAt: true
      }
    })
  ]);

  const totalSalesValue = todayAggregate._sum.total || 0;
  const totalOrders = todayAggregate._count.id || 0;
  const avgTicket = totalOrders > 0 ? totalSalesValue / totalOrders : 0;

  // Process and group chartSales by day in Mexico local time
  const chartData: { date: string; dateStr: string; count: number; amount: number }[] = [];
  const [sy, sm, sd] = initialStartDate.split('-').map(Number);
  const [ey, em, ed] = initialEndDate.split('-').map(Number);
  const sDateObj = new Date(sy, sm - 1, sd);
  const eDateObj = new Date(ey, em - 1, ed);

  const tempDate = new Date(sDateObj);
  while (tempDate <= eDateObj) {
    const yStr = tempDate.getFullYear();
    const mStr = String(tempDate.getMonth() + 1).padStart(2, '0');
    const dStr = String(tempDate.getDate()).padStart(2, '0');
    const dateStr = `${yStr}-${mStr}-${dStr}`;
    const label = tempDate.toLocaleDateString('es-MX', { timeZone: timezone, day: '2-digit', month: 'short' });
    
    chartData.push({
      date: label,
      dateStr,
      count: 0,
      amount: 0
    });
    
    tempDate.setDate(tempDate.getDate() + 1);
  }

  chartSales.forEach(sale => {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const parts = formatter.formatToParts(sale.createdAt);
    const yStr = parts.find(p => p.type === 'year')!.value;
    const mStr = parts.find(p => p.type === 'month')!.value;
    const dStr = parts.find(p => p.type === 'day')!.value;
    const dateStr = `${yStr}-${mStr}-${dStr}`;
    
    const dp = chartData.find(d => d.dateStr === dateStr);
    if (dp) {
      dp.count += 1;
      dp.amount += sale.total;
    }
  });

  // Phase 2: Parallel Fetching of metadata for Top 10 Clientes and Top 10 Productos
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
          createdAt: { gte: startOfDay, lte: endOfDay },
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
      <div className="page-header-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 className="page-header-title" style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>Panel de Control ({branch.name})</h1>
        
        <div className="page-header-actions" style={{ display: 'flex', gap: '1rem' }}>
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

      <div className="dashboard-stats-grid" style={{ marginBottom: '2rem' }}>
        {[
          { title: 'Ingresos de Hoy', value: formatter.format(totalSalesValue), icon: <DollarSign size={24} color="#10b981" /> },
          { title: 'Ventas de Hoy', value: totalOrders.toLocaleString('es-MX'), icon: <ShoppingCart size={24} color="#3b82f6" /> },
          { title: 'Ticket Promedio', value: formatter.format(avgTicket), icon: <DollarSign size={24} color="#f59e0b" /> },
          { title: 'Alertas de Restock', value: lowStockProducts.toLocaleString('es-MX') + ' SKUs críticos', icon: <PackagePlus size={24} color="#ef4444" /> },
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

      {/* Gráficas interactivas con filtros de fecha */}
      <DashboardCharts 
        chartData={chartData} 
        initialStartDate={initialStartDate} 
        initialEndDate={initialEndDate} 
      />

      <div className="dashboard-main-grid" style={{ marginBottom: '2rem' }}>
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
                       {sale.createdAt.toLocaleTimeString('es-MX', { timeZone: timezone, hour: '2-digit', minute: '2-digit' })}
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
          </div>
        </div>
      </div>

      {/* Sección Premium: Reportes del Día (Top 10) */}
      <div className="dashboard-reports-grid">
        
        {/* Card 1: 🏆 Mejores Clientes (Hoy) */}
        <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                🏆 Mejores Clientes <span style={{ fontSize: '0.8rem', backgroundColor: '#e0f2fe', color: '#0369a1', padding: '0.2rem 0.6rem', borderRadius: '1rem', fontWeight: 'bold' }}>Hoy</span>
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '0.25rem', marginBottom: 0 }}>Basado en compras de hoy y volumen facturado</p>
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
                        <span style={{ flexShrink: 0 }}>🛒 {cust.orderCount.toLocaleString('es-MX')} compras</span>
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
                No hay compras registradas el día de hoy.
              </div>
            )}
          </div>
        </div>

        {/* Card 2: 📦 Productos Más Vendidos (Hoy) */}
        <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                📦 Productos Más Vendidos <span style={{ fontSize: '0.8rem', backgroundColor: '#fdf2f8', color: '#be185d', padding: '0.2rem 0.6rem', borderRadius: '1rem', fontWeight: 'bold' }}>Hoy</span>
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
                            {prod.quantitySold.toLocaleString('es-MX')} uds
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
                No hay ventas registradas el día de hoy.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
