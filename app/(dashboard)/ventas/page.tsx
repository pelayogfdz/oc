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
  
  const sales = await prisma.sale.findMany({
    where: branch.id === 'GLOBAL'
      ? { branch: { tenantId: session?.tenantId } }
      : { branchId: branch.id },
    include: {
      user: true,
      branch: true,
      customer: true,
      items: {
        include: {
          product: true
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 500
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
    invoiceId: s.invoiceId,
    invoiceFolio: s.invoiceFolio,
    customer: s.customer ? {
      id: s.customer.id,
      name: s.customer.name,
      phone: s.customer.phone,
      email: s.customer.email
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

