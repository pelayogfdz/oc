import { prisma } from '@/lib/prisma';
import { getActiveBranch } from '@/app/actions/auth';
import { ShoppingCart, DollarSign } from 'lucide-react';
import Link from 'next/link';
import DashboardCharts from './DashboardCharts';
import TopProductsWidget from './TopProductsWidget';
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
    topSellersGroup,
    periodSaleItems,
    chartSales,
    periodReturnsAggregate,
    pendingCreditSales
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
    prisma.sale.groupBy({
      by: ['userId'],
      where: {
        ...branchFilter,
        createdAt: { gte: queryStartUtc, lte: queryEndUtc },
        status: 'COMPLETED',
        userId: { not: '' }
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
    }),
    prisma.sale.findMany({
      where: {
        ...branchFilter,
        paymentMethod: 'CREDIT',
        balanceDue: { gt: 0.01 },
        status: { not: 'CANCELLED' }
      },
      select: {
        id: true,
        folio: true,
        customerId: true,
        customer: {
          select: {
            id: true,
            name: true,
            phone: true
          }
        },
        balanceDue: true,
        dueDate: true
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

  // Phase 2: Fetching of metadata for Top 10 Clientes and Top 10 Vendedores
  const customerIds = topCustomersGroup.map(g => g.customerId).filter(Boolean) as string[];
  const sellerIds = topSellersGroup.map(g => g.userId).filter(Boolean) as string[];

  const [customers, sellers] = await Promise.all([
    prisma.customer.findMany({
      where: { id: { in: customerIds } },
      select: { id: true, name: true, phone: true }
    }),
    prisma.user.findMany({
      where: { id: { in: sellerIds } },
      select: { id: true, name: true, email: true }
    })
  ]);

  const customerLookup = new Map(customers.map(c => [c.id, c]));
  const sellerLookup = new Map(sellers.map(s => [s.id, s]));

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

  // Format topSellers
  const topSellers = topSellersGroup.map(g => {
    const seller = sellerLookup.get(g.userId);
    const totalSold = g._sum.total || 0;
    const orderCount = g._count.id || 0;
    return {
      id: g.userId,
      name: seller?.name || seller?.email?.split('@')[0] || "Usuario",
      totalSold,
      orderCount,
      avgTicket: orderCount > 0 ? totalSold / orderCount : 0
    };
  });

  const maxSellerSold = topSellers.length > 0 ? topSellers[0].totalSold : 1;

  // Format topCategories in-memory from periodSaleItems
  const categoryMap = new Map<string, any>();
  periodSaleItems.forEach(item => {
    const catName = item.product?.category?.trim() || 'Sin Categoría';
    const existing = categoryMap.get(catName) || {
      category: catName,
      totalRevenue: 0,
      quantitySold: 0,
      itemCount: 0
    };
    existing.totalRevenue += (item.quantity * item.price);
    existing.quantitySold += item.quantity;
    existing.itemCount += 1;
    categoryMap.set(catName, existing);
  });

  const topCategories = Array.from(categoryMap.values())
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 10);
  const maxCategoryRevenue = topCategories.length > 0 ? topCategories[0].totalRevenue : 1;

  // Format topProducts in-memory to group by SKU/barcode/name across branches with units, revenue and margin
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
      totalRevenue: 0,
      totalCost: 0,
      totalMargin: 0,
      marginPercent: 0
    };

    const costPerUnit = (item.cost && item.cost > 0) ? item.cost : ((prod.cost && prod.cost > 0) ? prod.cost : 0);
    const itemRevenue = item.quantity * item.price;
    const itemCost = item.quantity * costPerUnit;
    const itemMargin = itemRevenue - itemCost;

    existing.quantitySold += item.quantity;
    existing.totalRevenue += itemRevenue;
    existing.totalCost += itemCost;
    existing.totalMargin += itemMargin;
    existing.marginPercent = existing.totalRevenue > 0
      ? Math.round((existing.totalMargin / existing.totalRevenue) * 100)
      : 0;

    productMap.set(groupKey, existing);
  });

  const allProcessedProducts = Array.from(productMap.values());
  const topProductsByUnits = [...allProcessedProducts].sort((a, b) => b.quantitySold - a.quantitySold).slice(0, 10);
  const topProductsByRevenue = [...allProcessedProducts].sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 10);
  const topProductsByMargin = [...allProcessedProducts].sort((a, b) => b.totalMargin - a.totalMargin).slice(0, 10);

  // Portfolio & Accounts Receivable (CxC) calculations
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const debtorMap = new Map<string, {
    id: string;
    name: string;
    phone: string | null;
    totalBalance: number;
    overdueBalance: number;
    overdueCount: number;
    totalSalesCount: number;
    maxDaysOverdue: number;
  }>();

  let totalReceivableBalance = 0;
  let overdueReceivableBalance = 0;

  pendingCreditSales.forEach(sale => {
    const bal = sale.balanceDue || 0;
    if (bal <= 0.01) return;

    totalReceivableBalance += bal;

    const custKey = sale.customerId || 'PUBLIC';
    const existing = debtorMap.get(custKey) || {
      id: sale.customerId || '',
      name: sale.customer?.name || (sale.customerId ? 'Cliente sin nombre' : 'Público en General'),
      phone: sale.customer?.phone || null,
      totalBalance: 0,
      overdueBalance: 0,
      overdueCount: 0,
      totalSalesCount: 0,
      maxDaysOverdue: 0
    };

    existing.totalBalance += bal;
    existing.totalSalesCount += 1;

    if (sale.dueDate) {
      const due = new Date(sale.dueDate);
      due.setHours(0, 0, 0, 0);
      if (now.getTime() > due.getTime()) {
        overdueReceivableBalance += bal;
        existing.overdueBalance += bal;
        existing.overdueCount += 1;
        const days = Math.max(1, Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)));
        if (days > existing.maxDaysOverdue) {
          existing.maxDaysOverdue = days;
        }
      }
    }

    debtorMap.set(custKey, existing);
  });

  const allDebtors = Array.from(debtorMap.values());
  const overdueAccounts = allDebtors
    .filter(d => d.overdueBalance > 0.01)
    .sort((a, b) => b.overdueBalance - a.overdueBalance);

  const totalDebtorClients = allDebtors.length;
  const overdueClientsCount = overdueAccounts.length;
  const topOverdueAccounts = overdueAccounts.slice(0, 10);

  const formatter = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

  return (
    <div className="w-full min-w-0 max-w-full">
      <div className="dashboard-stats-grid mb-6">
        {[
          { 
            title: isFiltered ? 'Ingresos del Período' : 'Ingresos de Hoy', 
            value: formatter.format(totalSalesValue), 
            icon: <DollarSign size={20} className="text-emerald-600" />,
            badgeText: isFiltered ? 'Período' : 'Hoy',
            badgeVariant: 'success' as const
          },
          { 
            title: isFiltered ? 'Ventas del Período' : 'Ventas de Hoy', 
            value: totalOrders.toLocaleString('es-MX'), 
            icon: <ShoppingCart size={20} className="text-blue-600" />,
            badgeText: isFiltered ? 'Período' : 'Hoy',
            badgeVariant: 'info' as const
          },
          { 
            title: isFiltered ? 'Ticket Promedio (Período)' : 'Ticket Promedio (Hoy)', 
            value: formatter.format(avgTicket), 
            icon: <DollarSign size={20} className="text-amber-500" />,
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

      <div className="dashboard-main-grid mb-6">
        <Card className="p-5 md:p-6 min-w-0 border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-slate-900 tracking-tight">
                  {isFiltered ? 'Ventas del Período' : 'Actividad Reciente'}
                </span>
                <Badge variant={isFiltered ? 'purple' : 'info'} size="sm">
                  {isFiltered ? 'Período' : 'Hoy'}
                </Badge>
              </div>
              <Link 
                href="/ventas" 
                className="text-xs font-semibold text-purple-600 hover:text-purple-700 hover:underline"
              >
                Historial &rarr;
              </Link>
            </div>
            {recentSales.length > 0 ? (
               <div className="overflow-x-auto w-full">
                 <table className="responsive-table w-full border-collapse">
                   <thead>
                     <tr className="border-b border-slate-100 text-left">
                       <th className="py-2.5 text-slate-400 text-[11px] font-bold uppercase tracking-wider">Ticket / Cliente</th>
                       <th className="py-2.5 text-slate-400 text-[11px] font-bold uppercase tracking-wider">{isFiltered ? 'Fecha y Hora' : 'Hora'}</th>
                       <th className="py-2.5 text-slate-400 text-[11px] font-bold uppercase tracking-wider text-right">Total</th>
                     </tr>
                   </thead>
                   <tbody>
                     {recentSales.map(sale => (
                       <tr key={sale.id} className="border-b border-slate-50 hover:bg-slate-50/70 transition-colors">
                         <td data-label="Ticket / Cliente" className="py-2.5 text-xs font-medium">
                           <Link 
                             href={`/ventas/detalle/${sale.id}`} 
                             className="text-purple-600 font-bold hover:underline"
                           >
                             {sale.folio ? `Folio ${sale.folio}` : `#${sale.id.slice(-6).toUpperCase()}`}
                           </Link>
                           {sale.customer && (
                             <div className="text-[11px] text-slate-500 mt-0.5 font-normal truncate max-w-[200px]" title={sale.customer.name}>
                               {sale.customer.name}
                             </div>
                           )}
                         </td>
                         <td data-label={isFiltered ? 'Fecha y Hora' : 'Hora'} className="py-2.5 text-xs text-slate-500">
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
                         <td data-label="Total" className="py-2.5 text-xs font-black text-slate-900 text-right">
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
               </div>
            ) : (
              <div className="py-10 text-center text-slate-400 text-xs">
                 {isFiltered ? 'No hay ventas registradas en el período seleccionado.' : 'No hay ventas registradas el día de hoy.'}
              </div>
            )}
          </div>
        </Card>

        <Card className="p-5 md:p-6 min-w-0 border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-slate-900 tracking-tight">Alertas y Cartera</span>
                <Badge variant={overdueReceivableBalance > 0 ? 'danger' : 'info'} size="sm">
                  {overdueReceivableBalance > 0 ? `${overdueClientsCount} vencido(s)` : 'Al Día'}
                </Badge>
              </div>
              <div className="flex items-center gap-3">
                <Link 
                  href="/reportes/cuentas-por-cobrar" 
                  className="text-xs font-semibold text-purple-600 hover:text-purple-700 hover:underline"
                >
                  Reporte CxC &rarr;
                </Link>
                <Link 
                  href="/clientes/cobranza" 
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 hover:underline"
                >
                  Cobranza &rarr;
                </Link>
              </div>
            </div>
            
            {/* Banner de Resumen de Cartera */}
            <div className={`p-3 rounded-xl border mb-3.5 flex items-center justify-between gap-2 ${
              overdueReceivableBalance > 0 
                ? 'bg-rose-50/60 border-rose-200/70' 
                : totalReceivableBalance > 0 
                ? 'bg-amber-50/60 border-amber-200/70' 
                : 'bg-emerald-50/60 border-emerald-200/70'
            }`}>
              <div className="flex items-center gap-4 md:gap-6 flex-wrap">
                <div>
                  <span className="text-[10px] text-slate-500 font-medium block">Saldo por cobrar:</span>
                  <span className="text-xs md:text-sm font-black text-slate-900">{formatter.format(totalReceivableBalance)}</span>
                  <span className="text-[10px] text-slate-400 block">{totalDebtorClients} cliente(s)</span>
                </div>
                {overdueReceivableBalance > 0 && (
                  <div className="border-l border-rose-200 pl-3 md:pl-4">
                    <span className="text-[10px] text-rose-700 font-semibold block">Monto vencido:</span>
                    <span className="text-xs md:text-sm font-black text-rose-700">{formatter.format(overdueReceivableBalance)}</span>
                    <span className="text-[10px] text-rose-600 font-medium block">{overdueClientsCount} con adeudo vencido</span>
                  </div>
                )}
              </div>
            </div>

            {/* Detalle de Cuentas con Mayor Saldo Vencido */}
            {topOverdueAccounts.length > 0 ? (
              <div className="overflow-x-auto w-full">
                <table className="responsive-table w-full border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-left">
                      <th className="py-2.5 text-slate-400 text-[11px] font-bold uppercase tracking-wider">Cliente</th>
                      <th className="py-2.5 text-slate-400 text-[11px] font-bold uppercase tracking-wider">Atraso</th>
                      <th className="py-2.5 text-slate-400 text-[11px] font-bold uppercase tracking-wider text-right">Vencido</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topOverdueAccounts.map(acc => (
                      <tr key={acc.id} className="border-b border-slate-50 hover:bg-slate-50/70 transition-colors">
                        <td data-label="Cliente" className="py-2.5 text-xs font-medium">
                          {acc.id && acc.id !== 'PUBLIC' ? (
                            <Link 
                              href={`/clientes/${acc.id}`} 
                              className="text-purple-600 font-bold hover:underline block truncate max-w-[190px]" 
                              title={acc.name}
                            >
                              {acc.name}
                            </Link>
                          ) : (
                            <span className="text-slate-800 font-bold block truncate max-w-[190px]" title={acc.name}>
                              {acc.name}
                            </span>
                          )}
                          <div className="text-[11px] text-slate-500 mt-0.5 font-normal truncate max-w-[190px]">
                            {acc.phone ? `Tel: ${acc.phone}` : `${acc.totalSalesCount} venta(s) a crédito`}
                          </div>
                        </td>
                        <td data-label="Atraso" className="py-2.5 text-xs">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">
                            {acc.maxDaysOverdue > 0 ? `${acc.maxDaysOverdue}d de atraso` : 'Vencido'}
                          </span>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {acc.overdueCount} nota(s) vencida(s)
                          </div>
                        </td>
                        <td data-label="Vencido" className="py-2.5 text-xs font-black text-right">
                          <span className="text-rose-600 font-black block">
                            {formatter.format(acc.overdueBalance)}
                          </span>
                          <span className="text-[10px] text-slate-400 font-normal block">
                            Total: {formatter.format(acc.totalBalance)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : totalReceivableBalance > 0 ? (
              <div className="py-10 text-center text-slate-500 text-xs">
                <span className="font-semibold text-emerald-600 block mb-1">✓ Todos los créditos están al día</span>
                No hay cuentas con saldo vencido en este momento.
              </div>
            ) : (
              <div className="py-10 text-center text-slate-400 text-xs">
                No hay cuentas por cobrar registradas.
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Sección Premium: Reportes Ejecutivos (Top 10) */}
      <div className="dashboard-reports-grid">
        
        {/* Card 1: 🏆 Mejores Clientes */}
        <Card className="p-5 md:p-6 min-w-0 border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-5 gap-3 border-b border-slate-100 pb-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-base font-bold text-slate-900 tracking-tight">🏆 Mejores Clientes</span>
                  <Badge variant={isFiltered ? 'purple' : 'info'} size="sm">
                    {isFiltered ? 'Período' : 'Hoy'}
                  </Badge>
                </div>
                <p className="text-slate-400 text-xs mt-0.5 mb-0 font-normal">
                  {isFiltered ? 'Top compradores por volumen facturado en el período' : 'Top compradores por volumen facturado hoy'}
                </p>
              </div>
              <Link 
                href="/reportes/top-clientes" 
                className="text-xs font-semibold text-purple-600 hover:text-purple-700 hover:underline flex-shrink-0 pt-0.5"
              >
                Ver detalle &rarr;
              </Link>
            </div>

            <div className="flex flex-col gap-3.5">
              {topCustomers.length > 0 ? (
                topCustomers.map((cust: any, idx: number) => {
                  const percentage = Math.min(100, Math.round((cust.totalPurchased / maxCustomerPurchased) * 100));
                  return (
                    <div key={cust.id} className="flex items-center gap-3 min-w-0 py-1 px-1.5 rounded-lg hover:bg-slate-50/70 transition-colors">
                      <div className={`w-7 h-7 rounded-md flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                        idx === 0 
                          ? 'bg-amber-100 text-amber-800 font-extrabold' 
                          : idx === 1 
                          ? 'bg-slate-200 text-slate-700' 
                          : idx === 2 
                          ? 'bg-orange-100 text-orange-800' 
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        #{idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1 gap-2">
                          <span className="text-xs font-bold text-slate-800 truncate min-w-0 flex-1" title={cust.name}>
                            {cust.name}
                          </span>
                          <span className="text-xs font-black text-slate-900 flex-shrink-0">
                            {formatter.format(cust.totalPurchased)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          <span className="flex-shrink-0 text-slate-400">{cust.orderCount.toLocaleString('es-MX')} compras</span>
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-purple-500/80 rounded-full transition-all duration-500" 
                              style={{ width: `${percentage}%` }} 
                            />
                          </div>
                          <span className="flex-shrink-0 font-medium text-slate-500">{percentage}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs">
                  {isFiltered ? 'No hay compras registradas en el período seleccionado.' : 'No hay compras registradas el día de hoy.'}
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Card 2: 📦 Productos Más Vendidos con 3 Vistas */}
        <TopProductsWidget
          isFiltered={isFiltered}
          topByUnits={topProductsByUnits}
          topByRevenue={topProductsByRevenue}
          topByMargin={topProductsByMargin}
        />

        {/* Card 3: 🏷️ Categorías Más Vendidas */}
        <Card className="p-5 md:p-6 min-w-0 border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-5 gap-3 border-b border-slate-100 pb-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-base font-bold text-slate-900 tracking-tight">🏷️ Categorías Más Vendidas</span>
                  <Badge variant={isFiltered ? 'purple' : 'info'} size="sm">
                    {isFiltered ? 'Período' : 'Hoy'}
                  </Badge>
                </div>
                <p className="text-slate-400 text-xs mt-0.5 mb-0 font-normal">
                  {isFiltered ? 'Categorías líderes en facturación del período' : 'Categorías líderes en facturación de hoy'}
                </p>
              </div>
              <Link 
                href="/reportes/top-categorias" 
                className="text-xs font-semibold text-purple-600 hover:text-purple-700 hover:underline flex-shrink-0 pt-0.5"
              >
                Ver detalle &rarr;
              </Link>
            </div>

            <div className="flex flex-col gap-3.5">
              {topCategories.length > 0 ? (
                topCategories.map((cat: any, idx: number) => {
                  const percentage = Math.min(100, Math.round((cat.totalRevenue / maxCategoryRevenue) * 100));
                  return (
                    <div key={cat.category} className="flex items-center gap-3 min-w-0 py-1 px-1.5 rounded-lg hover:bg-slate-50/70 transition-colors">
                      <div className={`w-7 h-7 rounded-md flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                        idx === 0 
                          ? 'bg-amber-100 text-amber-800 font-extrabold' 
                          : idx === 1 
                          ? 'bg-slate-200 text-slate-700' 
                          : idx === 2 
                          ? 'bg-orange-100 text-orange-800' 
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        #{idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1 gap-2">
                          <span className="text-xs font-bold text-slate-800 truncate min-w-0 flex-1" title={cat.category}>
                            {cat.category}
                          </span>
                          <span className="text-xs font-black text-slate-900 flex-shrink-0">
                            {formatter.format(cat.totalRevenue)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          <span className="flex-shrink-0 text-slate-400">{cat.quantitySold.toLocaleString('es-MX')} uds</span>
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-purple-500/80 rounded-full transition-all duration-500" 
                              style={{ width: `${percentage}%` }} 
                            />
                          </div>
                          <span className="flex-shrink-0 font-medium text-slate-500">{percentage}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs">
                  {isFiltered ? 'No hay categorías vendidas en el período seleccionado.' : 'No hay categorías vendidas el día de hoy.'}
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Card 4: 👔 Ventas por Vendedor */}
        <Card className="p-5 md:p-6 min-w-0 border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-5 gap-3 border-b border-slate-100 pb-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-base font-bold text-slate-900 tracking-tight">👔 Ventas por Vendedor</span>
                  <Badge variant={isFiltered ? 'purple' : 'info'} size="sm">
                    {isFiltered ? 'Período' : 'Hoy'}
                  </Badge>
                </div>
                <p className="text-slate-400 text-xs mt-0.5 mb-0 font-normal">
                  {isFiltered ? 'Rendimiento y volumen colocado en el período' : 'Rendimiento y volumen colocado hoy'}
                </p>
              </div>
              <Link 
                href="/reportes/ventas-por-vendedor" 
                className="text-xs font-semibold text-purple-600 hover:text-purple-700 hover:underline flex-shrink-0 pt-0.5"
              >
                Ver detalle &rarr;
              </Link>
            </div>

            <div className="flex flex-col gap-3.5">
              {topSellers.length > 0 ? (
                topSellers.map((seller: any, idx: number) => {
                  const percentage = Math.min(100, Math.round((seller.totalSold / maxSellerSold) * 100));
                  return (
                    <div key={seller.id} className="flex items-center gap-3 min-w-0 py-1 px-1.5 rounded-lg hover:bg-slate-50/70 transition-colors">
                      <div className={`w-7 h-7 rounded-md flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                        idx === 0 
                          ? 'bg-amber-100 text-amber-800 font-extrabold' 
                          : idx === 1 
                          ? 'bg-slate-200 text-slate-700' 
                          : idx === 2 
                          ? 'bg-orange-100 text-orange-800' 
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        #{idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1 gap-2">
                          <span className="text-xs font-bold text-slate-800 truncate min-w-0 flex-1" title={seller.name}>
                            {seller.name}
                          </span>
                          <span className="text-xs font-black text-slate-900 flex-shrink-0">
                            {formatter.format(seller.totalSold)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          <span className="flex-shrink-0 text-slate-400">{seller.orderCount.toLocaleString('es-MX')} tickets</span>
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-purple-500/80 rounded-full transition-all duration-500" 
                              style={{ width: `${percentage}%` }} 
                            />
                          </div>
                          <span className="flex-shrink-0 font-medium text-slate-500">{percentage}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs">
                  {isFiltered ? 'No hay ventas de vendedores en el período seleccionado.' : 'No hay ventas de vendedores el día de hoy.'}
                </div>
              )}
            </div>
          </div>
        </Card>

      </div>
    </div>
  );
}

