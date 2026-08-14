export const dynamic = 'force-dynamic';

import { prisma } from "@/lib/prisma";
import { getActiveBranch, getSession } from "@/app/actions/auth";
import VentasHistoryClient from "./VentasHistoryClient";
import { getUtcDateFromLocal } from "@/app/lib/timezone";

export default async function VentasPage(props: { searchParams: Promise<any> }) {
  const branch = await getActiveBranch();
  const session = await getSession();
  const params = await props.searchParams;

  const page = Math.max(1, parseInt(params?.page || '1', 10));
  const pageSize = 50;

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

  // Build dynamic where clause based on filters and searchParams
  const where: any = {};

  // Branch filter
  if (params?.branchId && params.branchId !== 'ALL' && params.branchId !== '') {
    where.branchId = params.branchId;
  } else if (branch.id === 'GLOBAL') {
    where.branch = { tenantId: session?.tenantId || undefined };
  } else {
    where.branchId = branch.id;
  }

  // User filter
  if (params?.userId && params.userId !== 'ALL' && params.userId !== '') {
    where.userId = params.userId;
  }

  // Status filter
  if (params?.status && params.status !== '') {
    where.status = params.status;
  }

  // Payment method filter
  if (params?.paymentMethod && params.paymentMethod !== '') {
    where.paymentMethod = params.paymentMethod;
  }

  // Client name filter
  if (params?.client && params.client.trim() !== '') {
    where.customer = {
      name: {
        contains: params.client.trim(),
        mode: 'insensitive'
      }
    };
  }

  // CFDI filter
  if (params?.cfdi && params.cfdi.trim() !== '') {
    const cfdiTerm = params.cfdi.trim();
    where.OR = [
      { invoiceId: { contains: cfdiTerm, mode: 'insensitive' } },
      { invoiceFolio: { contains: cfdiTerm, mode: 'insensitive' } }
    ];
  }

  // Date range filter (ONLY applied if startDate or endDate are provided in searchParams)
  if (params?.startDate || params?.endDate) {
    where.createdAt = {};
    if (params.startDate) {
      const [sy, sm, sd] = params.startDate.split('-').map(Number);
      where.createdAt.gte = getUtcDateFromLocal(sy, sm, sd, 0, 0, 0, 0, timezone);
    }
    if (params.endDate) {
      const [ey, em, ed] = params.endDate.split('-').map(Number);
      where.createdAt.lte = getUtcDateFromLocal(ey, em, ed, 23, 59, 59, 999, timezone);
    }
  }

  // Total matching sales count
  const totalCount = await prisma.sale.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(page, totalPages);

  // Paginated query: 50 sales per page, ordered chronologically descending
  const sales = await prisma.sale.findMany({
    where,
    skip: (currentPage - 1) * pageSize,
    take: pageSize,
    include: commonInclude,
    orderBy: { createdAt: 'desc' }
  });

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
    cancellationStatus: s.cancellationStatus,
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
      totalCount={totalCount}
      currentPage={currentPage}
      totalPages={totalPages}
      pageSize={pageSize}
      queryParams={params || {}}
    />
  );
}


