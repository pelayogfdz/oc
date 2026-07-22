import { getActiveBranch, getSession } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import VentasInvoiceClient from "./VentasInvoiceClient";
import { getUtcDateFromLocal } from "@/app/lib/timezone";

export default async function FacturasVentasPage(props: { searchParams: Promise<any> }) {
  const branch = await getActiveBranch();
  const session = await getSession();
  const params = await props.searchParams;

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

  // Completed sales
  const sales = await prisma.sale.findMany({ 
    where: { 
      ...baseWhere,
      status: "COMPLETED" 
    },
    include: { customer: true, user: true, branch: true },
    orderBy: { createdAt: 'desc' }
  });

  // Customers of this tenant
  const customers = await prisma.customer.findMany({
    where: {
      branch: {
        tenantId: session?.tenantId || branch.tenantId
      }
    },
    orderBy: { name: 'asc' }
  });

  return (
    <VentasInvoiceClient 
      initialSales={JSON.parse(JSON.stringify(sales))} 
      initialCustomers={JSON.parse(JSON.stringify(customers))} 
    />
  );
}
