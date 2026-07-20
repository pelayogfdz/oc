import { prisma } from "@/lib/prisma";
import { getActiveBranch, getSession } from "@/app/actions/auth";
import LogisticaClient from "./LogisticaClient";
import { getBranchFilter } from "@/lib/utils";

export default async function LogisticaPage() {
  const branch = await getActiveBranch();
  const session = await getSession();
  
  // Fetch delivery orders
  const deliveryOrders = await prisma.deliveryOrder.findMany({
    where: branch.id === 'GLOBAL'
      ? {
          OR: [
            { sale: { branch: { tenantId: session?.tenantId } } },
            { transfer: { branch: { tenantId: session?.tenantId } } }
          ]
        }
      : { branchId: branch.id },
    include: {
      sale: {
        include: {
          customer: true
        }
      },
      transfer: {
        include: {
          branch: true,
          toBranch: true
        }
      },
      driver: true,
    },
    orderBy: { createdAt: 'desc' }
  });

  // Fetch drivers (users) for the branch
  const drivers = await prisma.user.findMany({
    where: {
      tenantId: session?.tenantId,
      branchId: branch.id === 'GLOBAL' ? undefined : branch.id
    },
    select: { id: true, name: true, role: true }
  });

  return (
    <LogisticaClient initialOrders={deliveryOrders} branch={branch} drivers={drivers} />
  );
}

