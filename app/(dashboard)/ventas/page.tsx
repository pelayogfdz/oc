import { prisma } from "@/lib/prisma";
import { getActiveBranch } from "@/app/actions/auth";
import { getBranchFilter } from "@/lib/utils";
import VentasHistoryClient from "./VentasHistoryClient";

export default async function VentasPage() {
  const branch = await getActiveBranch();

  // Fetch all branches to populate branch selector
  const branches = await prisma.branch.findMany({
    orderBy: { name: 'asc' }
  });

  // Fetch all users/sellers to populate seller selector
  const users = await prisma.user.findMany({
    orderBy: { name: 'asc' }
  });
  
  const sales = await prisma.sale.findMany({
    where: getBranchFilter(branch),
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
    customer: s.customer ? {
      id: s.customer.id,
      name: s.customer.name
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
    where: { id: branch.tenantId },
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

