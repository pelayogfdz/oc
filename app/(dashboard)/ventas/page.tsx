export const dynamic = 'force-dynamic';

import { prisma } from "@/lib/prisma";
import { getActiveBranch, getSession } from "@/app/actions/auth";
import { getBranchFilter } from "@/lib/utils";
import VentasHistoryClient from "./VentasHistoryClient";

export default async function VentasPage() {
  const branch = await getActiveBranch();
  const session = await getSession();

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

  const baseWhere = branch.id === 'GLOBAL'
    ? { branch: { tenantId: session?.tenantId || undefined } }
    : { branchId: branch.id };

  // Obtener las últimas 450 ventas activas (no canceladas)
  const activeSales = await prisma.sale.findMany({
    where: {
      ...baseWhere,
      status: { not: 'CANCELLED' }
    },
    include: commonInclude,
    orderBy: { createdAt: 'desc' },
    take: 450
  });

  // Obtener las últimas 100 ventas canceladas para garantizar su visibilidad en el cliente
  const cancelledSales = await prisma.sale.findMany({
    where: {
      ...baseWhere,
      status: 'CANCELLED'
    },
    include: commonInclude,
    orderBy: { createdAt: 'desc' },
    take: 100
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

  const tenant = await prisma.tenant.findUnique({
    where: { id: branch.tenantId || undefined },
    select: { timezone: true }
  });
  const timezone = tenant?.timezone || 'America/Mexico_City';

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

