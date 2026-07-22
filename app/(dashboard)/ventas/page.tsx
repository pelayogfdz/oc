export const dynamic = 'force-dynamic';

import { prisma } from "@/lib/prisma";
import { getActiveBranch, getSession } from "@/app/actions/auth";
import { getBranchFilter } from "@/lib/utils";
import VentasHistoryClient from "./VentasHistoryClient";
import { getUtcDateFromLocal } from "@/app/lib/timezone";

export default async function VentasPage(props: { searchParams: Promise<any> }) {
  const branch = await getActiveBranch();
  const session = await getSession();
  const params = await props.searchParams;

  // Fetch only branches of this tenant to populate branch selector
  const branches = await prisma.branch.findMany({
    where: { tenantId: session?.tenantId, isActive: true },
    orderBy: { name: 'asc' }
  });

  // Fetch only users/sellers of this tenant to populate seller selector
  const users = await prisma.user.findMany({
    where: { tenantId: session?.tenantId },
    orderBy: { name: 'asc' }
  });
  
  const commonInclude = {
    user: true,
    branch: true,
    customer: true,
    deliveryOrder: true,
    items: {
      include: {
        product: true
      }
    }
  };

  const tenant = await prisma.tenant.findUnique({
    where: { id: branch.tenantId || undefined },
    select: { timezone: true }
  });
  const timezone = tenant?.timezone || 'America/Mexico_City';

  // Get current date components in tenant timezone
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const parts = formatter.formatToParts(now);
  const currentYear = parseInt(parts.find(p => p.type === 'year')!.value, 10);
  const currentMonth = parseInt(parts.find(p => p.type === 'month')!.value, 10);
  const currentDay = parseInt(parts.find(p => p.type === 'day')!.value, 10);

  let startUtc = getUtcDateFromLocal(currentYear, currentMonth, 1, 0, 0, 0, 0, timezone);
  let endUtc = getUtcDateFromLocal(currentYear, currentMonth, currentDay, 23, 59, 59, 999, timezone);

  if (params?.startDate) {
    const [sy, sm, sd] = params.startDate.split('-').map(Number);
    startUtc = getUtcDateFromLocal(sy, sm, sd, 0, 0, 0, 0, timezone);
    
    if (params.endDate) {
      const [ey, em, ed] = params.endDate.split('-').map(Number);
      endUtc = getUtcDateFromLocal(ey, em, ed, 23, 59, 59, 999, timezone);
    } else {
      endUtc = getUtcDateFromLocal(sy, sm, sd, 23, 59, 59, 999, timezone);
    }
  }

  const baseWhere = {
    ...(branch.id === 'GLOBAL'
      ? { branch: { tenantId: session?.tenantId || undefined } }
      : { branchId: branch.id }),
    createdAt: {
      gte: startUtc,
      lte: endUtc
    }
  };

  // Obtener las ventas activas (no canceladas) en el rango de fechas
  const activeSales = await prisma.sale.findMany({
    where: {
      ...baseWhere,
      status: { not: 'CANCELLED' }
    },
    include: commonInclude,
    orderBy: { createdAt: 'desc' }
  });

  // Obtener las ventas canceladas en el rango de fechas
  const cancelledSales = await prisma.sale.findMany({
    where: {
      ...baseWhere,
      status: 'CANCELLED'
    },
    include: commonInclude,
    orderBy: { createdAt: 'desc' }
  });

  // Unir ambas listas y ordenar por fecha de forma descendente
  const sales = [...activeSales, ...cancelledSales].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );

  // Safe mapping to serialize data and avoid RSC warnings
  const serializedSales = sales.map(s => ({
    id: s.id,
    folio: s.folio,
    createdAt: s.createdAt.toISOString(),
    userId: s.userId,
    branchId: s.branchId,
    total: s.total,
    status: s.status,
    paymentMethod: s.paymentMethod,
    invoiceId: s.invoiceId,
    invoiceFolio: s.invoiceFolio,
    deliveryOrder: s.deliveryOrder ? {
      id: s.deliveryOrder.id,
      status: s.deliveryOrder.status
    } : null,
    customer: s.customer ? {
      id: s.customer.id,
      name: s.customer.name,
      phone: s.customer.phone,
      email: s.customer.email,
      street: s.customer.street,
      exteriorNumber: s.customer.exteriorNumber,
      interiorNumber: s.customer.interiorNumber,
      neighborhood: s.customer.neighborhood,
      city: s.customer.city,
      state: s.customer.state,
      zipCode: s.customer.zipCode
    } : null,
    user: {
      id: s.user.id,
      name: s.user.name
    },
    branch: s.branch ? {
      id: s.branch.id,
      name: s.branch.name
    } : null,
    items: s.items.map(item => ({
      id: item.id,
      quantity: item.quantity
    }))
  }));

  const serializedBranches = branches.map(b => ({
    id: b.id,
    name: b.name
  }));

  const serializedUsers = users.map(u => ({
    id: u.id,
    name: u.name
  }));

  const serializedBranch = {
    id: branch.id,
    name: branch.name
  };

  return (
    <VentasHistoryClient 
      initialSales={serializedSales} 
      branches={serializedBranches} 
      users={serializedUsers} 
      currentBranch={serializedBranch} 
      timezone={timezone}
    />
  );
}

