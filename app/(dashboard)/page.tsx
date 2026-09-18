import { prisma } from '@/lib/prisma';
import { getActiveBranch } from '@/app/actions/auth';
import { ShoppingCart, PackagePlus, DollarSign, WalletCards } from 'lucide-react';
import Link from 'next/link';
import DashboardCharts from './DashboardCharts';
import { getLocalTodayRange, getUtcDateFromLocal } from '@/app/lib/timezone';
import { StatCard, Card, Badge } from '@/app/components/ui';

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
    where: { id: branch.tenantId || undefined },
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

  const todayStr = formatDateString(new Date());

  const isFiltered = Boolean(paramStart || paramEnd);
  const initialStartDate = paramStart || todayStr;
  const initialEndDate = paramEnd || todayStr;

  // Helper to parse local date string YYYY-MM-DD to timezone day range in UTC
  const getStartAndEndOfDayUtc = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const startUtc = getUtcDateFromLocal(y, m, d, 0, 0, 0, 0, timezone);
    const endUtc = getUtcDateFromLocal(y, m, d, 23, 59, 59, 999, timezone);
    return { startUtc, endUtc };
  };

  const queryStartUtc = isFiltered ? getStartAndEndOfDayUtc(initialStartDate).startUtc : startOfDay;
  const queryEndUtc = isFiltered ? getStartAndEndOfDayUtc(initialEndDate).endUtc : endOfDay;

  const branchFilter = branch.id === 'GLOBAL'
    ? { branch: { tenantId: branch.tenantId } }
    : { branchId: branch.id };

  // Phase 1: Parallel DB Aggregations, Counts, and Chart Sales
  const [
    periodAggregate,
    recentSales,
    topCustomersGroup,
    periodSaleItems,
    lowStockProducts,
    chartSales,
    periodReturnsAggregate
  ] = await Promise.all([
    prisma.sale.aggregate({
      _sum: { total: true },
      _count: { id: true },
      where: {
        ...branchFilter,
        createdAt: { gte: queryStartUtc, lte: queryEndUtc },
        status: 'COMPLETED'
      }
    }),
    prisma.sale.findMany({
      where: {
        ...branchFilter,
        createdAt: { gte: queryStartUtc, lte: queryEndUtc },
        status: 'COMPLETED'
      },
      include: {
        customer: {
          select: {
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    }),
    prisma.sale.groupBy({
      by: ['customerId'],
      where: {
        ...branchFilter,
        createdAt: { gte: queryStartUtc, lte: queryEndUtc },
        status: 'COMPLETED',
        customerId: { not: null }
      },
      _sum: { total: true },
      _count: { id: true },
      orderBy: {
        _sum: { total: 'desc' }
      },
      take: 10
    }),
    prisma.saleItem.findMany({
      where: {
        sale: {
          ...branchFilter,
          createdAt: { gte: queryStartUtc, lte: queryEndUtc },
          status: 'COMPLETED'
        }
      },
      include: {
        product: true
      }
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
        createdAt: { gte: queryStartUtc, lte: queryEndUtc },
        status: 'COMPLETED'
      },
      select: {
        total: true,
        createdAt: true
      }
    }),
    prisma.saleReturn.aggregate({
      _sum: { totalRefund: true },
      where: {
        ...branchFilter,
        createdAt: { gte: queryStartUtc, lte: queryEndUtc }
      }
    })
  ]);

  const totalRefundsValue = periodReturnsAggregate._sum.totalRefund || 0;
  const totalSalesValue = Math.max(0, (periodAggregate._sum.total || 0) - totalRefundsValue);
  const totalOrders = periodAggregate._count.id || 0;
  const avgTicket = totalOrders > 0 ? totalSalesValue / totalOrders : 0;

  // Process and group chartSales by day in Mexico local time
  const chartData: { date: string; dateStr: string; count: number; amount: number }[] = [];
  const [sy, sm, sd] = initialStartDate.split('-').map(Number);
  const [ey, em, ed] = initialEndDate.split('-').map(Number);
  
  const current = new Date(Date.UTC(sy, sm - 1, sd, 12, 0, 0));
  const end = new Date(Date.UTC(ey, em - 1, ed, 12, 0, 0));

  while (current <= end) {
    const yStr = current.getUTCFullYear();
    const mStr = String(current.getUTCMonth() + 1).padStart(2, '0');
    const dStr = String(current.getUTCDate()).padStart(2, '0');
    const dateStr = `${yStr}-${mStr}-${dStr}`;
    const label = current.toLocaleDateString('es-MX', { timeZone: 'UTC', day: '2-digit', month: 'short' });
    
    chartData.push({
      date: label,
      dateStr,
      count: 0,
      amount: 0
    });
    
    current.setUTCDate(current.getUTCDate() + 1);
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

  // Phase 2: Fetching of metadata for Top 10 Clientes
  const customerIds = topCustomersGroup.map(g => g.customerId).filter(Boolean) as string[];

  const [customers] = await Promise.all([
    prisma.customer.findMany({
      where: { id: { in: customerIds } },
      select: { id: true, name: true, phone: true }
    })
  ]);

  const customerLookup = new Map(customers.map(c => [c.id, c]));

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

  // Format topProducts in-memory to group by SKU/barcode/name across branches
  const productMap = new Map<string, any>();
  periodSaleItems.forEach(item => {
    const prod = item.product;
    if (!prod) return;

    const isGlobal = branch.id === 'GLOBAL';
    const groupKey = isGlobal
      ? ((prod.sku && prod.sku !== 'S/K')
         ? `SKU_${prod.sku.trim().toUpperCase()}`
         : ((prod.barcode)
            ? `BC_${prod.barcode.trim().toUpperCase()}`
            : `NAME_${prod.name.trim().toUpperCase()}_${prod.id}`))
      : prod.id;

    const existing = productMap.get(groupKey) || {
      id: prod.id,
      name: prod.name,
      sku: prod.sku || 'S/K',
      quantitySold: 0,
      totalRevenue: 0
    };

    existing.quantitySold += item.quantity;
    existing.totalRevenue += item.quantity * item.price;
    productMap.set(groupKey, existing);
  });

  const topProducts = Array.from(productMap.values())
    .sort((a, b) => b.quantitySold - a.quantitySold)
    .slice(0, 10);

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
      <div className="page-header-container flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <h1 className="page-header-title text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
          Panel de Control <span className="text-purple-600 font-semibold text-lg md:text-xl">({branch.name})</span>
        </h1>
        
        <div className="page-header-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
          <Link 
            href="/ventas/nueva" 
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: '#db2777',
              color: '#ffffff',
              padding: '0.65rem 1.25rem',
              borderRadius: '10px',
              fontWeight: '700',
              fontSize: '0.9rem',
              textDecoration: 'none',
              boxShadow: '0 2px 6px rgba(219, 39, 119, 0.35)',
              transition: 'all 0.2s ease'
            }}
          >
            <ShoppingCart size={18} color="#ffffff" /> <span style={{ color: '#ffffff' }}>Nueva Venta</span>
          </Link>
          <Link 
            href="/productos/nuevo" 
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              padding: '0.65rem 1.25rem',
              borderRadius: '10px',
              fontWeight: '700',
              fontSize: '0.9rem',
              textDecoration: 'none',
              boxShadow: '0 2px 6px rgba(37, 99, 235, 0.35)',
              transition: 'all 0.2s ease'
            }}
          >
            <PackagePlus size={18} color="#ffffff" /> <span style={{ color: '#ffffff' }}>Crear Producto</span>
          </Link>
          <Link 
            href="/caja/actual" 
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: '#059669',
              color: '#ffffff',
              padding: '0.65rem 1.25rem',
              borderRadius: '10px',
              fontWeight: '700',
              fontSize: '0.9rem',
              textDecoration: 'none',
              boxShadow: '0 2px 6px rgba(5, 150, 105, 0.35)',
              transition: 'all 0.2s ease'
            }}
          >
            <WalletCards size={18} color="#ffffff" /> <span style={{ color: '#ffffff' }}>Arqueo de Caja</span>
          </Link>
        </div>
      </div>

      <div className="dashboard-stats-grid mb-8">
        {[
          { 
            title: isFiltered ? 'Ingresos del Período' : 'Ingresos de Hoy', 
            value: formatter.format(totalSalesValue), 
            icon: <DollarSign size={22} className="text-emerald-600" />,
            badgeText: isFiltered ? 'Período' : 'Hoy',
            badgeVariant: 'success' as const
          },
          { 
            title: isFiltered ? 'Ventas del Período' : 'Ventas de Hoy', 
            value: totalOrders.toLocaleString('es-MX'), 
            icon: <ShoppingCart size={22} className="text-blue-600" />,
            badgeText: isFiltered ? 'Período' : 'Hoy',
            badgeVariant: 'info' as const
          },
          { 
            title: isFiltered ? 'Ticket Promedio (Período)' : 'Ticket Promedio (Hoy)', 
            value: formatter.format(avgTicket), 
            icon: <DollarSign size={22} className="text-amber-500" />,
            badgeText: isFiltered ? 'Período' : 'Hoy',
            badgeVariant: 'warning' as const
          },
        ].map(stat => (
          <StatCard
            key={stat.title}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
            badgeText={stat.badgeText}
            badgeVariant={stat.badgeVariant}
          />
        ))}
      </div>

      {/* Gráficas interactivas con filtros de fecha */}
      <DashboardCharts 
        chartData={chartData} 
        initialStartDate={initialStartDate} 
        initialEndDate={initialEndDate} 
      />

      <div className="dashboard-main-grid mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2.5 text-slate-900">
              <span>{isFiltered ? 'Ventas del Período' : 'Actividad Reciente'}</span>
              <Badge variant={isFiltered ? 'purple' : 'info'}>
                {isFiltered ? 'Período' : 'Hoy'}
              </Badge>
            </h2>
          </div>
          {recentSales.length > 0 ? (
             <table className="responsive-table w-full border-collapse">
               <thead>
                 <tr className="border-b-2 border-slate-100 text-left">
                   <th className="py-3 text-slate-500 text-xs font-bold uppercase tracking-wider">Ticket / Cliente</th>
                   <th className="py-3 text-slate-500 text-xs font-bold uppercase tracking-wider">{isFiltered ? 'Fecha y Hora' : 'Hora'}</th>
                   <th className="py-3 text-slate-500 text-xs font-bold uppercase tracking-wider">Total</th>
                 </tr>
               </thead>
               <tbody>
                 {recentSales.map(sale => (
                   <tr key={sale.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                     <td data-label="Ticket / Cliente" className="py-3.5 text-sm font-medium">
                       <Link 
                         href={`/ventas/detalle/${sale.id}`} 
                         className="text-purple-600 font-bold hover:underline"
                       >
                         {sale.folio ? `Folio ${sale.folio}` : `#${sale.id.slice(-6).toUpperCase()}`}
                       </Link>
                       {sale.customer && (
                         <div className="text-xs text-slate-500 mt-0.5 font-normal">
                           {sale.customer.name}
                         </div>
                       )}
                     </td>
                     <td data-label={isFiltered ? 'Fecha y Hora' : 'Hora'} className="py-3.5 text-sm text-slate-500">
                       <Link 
                         href={`/ventas/detalle/${sale.id}`} 
                         className="text-inherit no-underline block"
                       >
                         {isFiltered
                           ? `${sale.createdAt.toLocaleDateString('es-MX', { timeZone: timezone, day: '2-digit', month: 'short' })} ${sale.createdAt.toLocaleTimeString('es-MX', { timeZone: timezone, hour: '2-digit', minute: '2-digit' })}`
                           : sale.createdAt.toLocaleTimeString('es-MX', { timeZone: timezone, hour: '2-digit', minute: '2-digit' })
                         }
                       </Link>
                     </td>
                     <td data-label="Total" className="py-3.5 text-sm font-black text-emerald-600">
                       <Link 
                         href={`/ventas/detalle/${sale.id}`} 
                         className="text-inherit no-underline block"
                       >
                         {formatter.format(sale.total)}
                       </Link>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
          ) : (
            <div className="py-10 text-center text-slate-400 text-sm">
               {isFiltered ? 'No hay ventas registradas en el período seleccionado.' : 'No hay ventas registradas el día de hoy.'}
            </div>
          )}
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-rose-600">Advertencias</h2>
            <Badge variant="danger">Riesgo</Badge>
          </div>
          
          <div className="flex flex-col gap-3">
             <div className="p-4 bg-rose-50 border border-rose-200/70 rounded-xl">
               <h4 className="text-rose-900 font-bold text-sm mb-1">Cartera Vencida</h4>
               <p className="text-rose-800 text-xs leading-relaxed">Detectamos {activeDebts} cliente(s) con deudas activas o vencidas.</p>
               <Link href="/clientes" className="inline-block mt-2.5 text-xs text-rose-700 font-bold hover:underline">Revisar cartera &rarr;</Link>
             </div>
          </div>
        </Card>
      </div>

      {/* Sección Premium: Reportes del Período / Día (Top 10) */}
      <div className="dashboard-reports-grid">
        
        {/* Card 1: 🏆 Mejores Clientes */}
        <Card className="p-6 md:p-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 m-0 flex items-center gap-2">
                🏆 Mejores Clientes <Badge variant={isFiltered ? 'purple' : 'info'}>{isFiltered ? 'Período' : 'Hoy'}</Badge>
              </h2>
              <p className="text-slate-500 text-xs mt-1 mb-0">
                {isFiltered ? 'Basado en compras del período y volumen facturado' : 'Basado en compras de hoy y volumen facturado'}
              </p>
            </div>
            <Link href="/reportes/top-clientes" className="text-xs font-bold text-blue-600 hover:underline">Ver detalle</Link>
          </div>

          <div className="flex flex-col gap-5">
            {topCustomers.length > 0 ? (
              topCustomers.map((cust: any, idx: number) => {
                const percentage = Math.min(100, Math.round((cust.totalPurchased / maxCustomerPurchased) * 100));
                const avatarColor = getHslColor(cust.name);
                return (
                  <div key={cust.id} className="flex items-center gap-4">
                    <div 
                      className="w-10 h-10 rounded-full text-white flex items-center justify-center font-bold text-sm shadow-sm flex-shrink-0"
                      style={{ backgroundColor: avatarColor }}
                    >
                      {getInitials(cust.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-bold text-slate-800 truncate">
                          {idx + 1}. {cust.name}
                        </span>
                        <span className="text-sm font-black text-emerald-600">
                          {formatter.format(cust.totalPurchased)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="flex-shrink-0">🛒 {cust.orderCount.toLocaleString('es-MX')} compras</span>
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                            style={{ width: `${percentage}%` }} 
                          />
                        </div>
                        <span className="flex-shrink-0 font-bold text-slate-700">{percentage}%</span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-slate-400 text-sm">
                {isFiltered ? 'No hay compras registradas en el período seleccionado.' : 'No hay compras registradas el día de hoy.'}
              </div>
            )}
          </div>
        </Card>

        {/* Card 2: 📦 Productos Más Vendidos */}
        <Card className="p-6 md:p-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 m-0 flex items-center gap-2">
                📦 Productos Más Vendidos <Badge variant={isFiltered ? 'purple' : 'danger'}>{isFiltered ? 'Período' : 'Hoy'}</Badge>
              </h2>
              <p className="text-slate-500 text-xs mt-1 mb-0">
                {isFiltered ? 'Artículos líderes por unidades desplazadas en el período' : 'Artículos líderes por unidades desplazadas'}
              </p>
            </div>
            <Link href="/reportes/top-productos" className="text-xs font-bold text-blue-600 hover:underline">Ver detalle</Link>
          </div>

          <div className="flex flex-col gap-5">
            {topProducts.length > 0 ? (
              topProducts.map((prod: any, idx: number) => {
                return (
                  <div key={prod.id} className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-500 flex-shrink-0">
                      #{idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0">
                          <span className="text-sm font-bold text-slate-800 block truncate">
                            {prod.name}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono font-semibold">
                            SKU: {prod.sku}
                          </span>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="text-sm font-black text-slate-900 block">
                            {prod.quantitySold.toLocaleString('es-MX')} uds
                          </span>
                          <span className="text-xs text-slate-500">
                            {formatter.format(prod.totalRevenue)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-slate-400 text-sm">
                {isFiltered ? 'No hay ventas registradas en el período seleccionado.' : 'No hay ventas registradas el día de hoy.'}
              </div>
            )}
          </div>
        </Card>

      </div>
    </div>
  );
}

