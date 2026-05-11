import { prisma } from "@/lib/prisma";
import { getActiveBranch } from "@/app/actions/auth";
import LogisticaClient from "./LogisticaClient";
import { getBranchFilter } from "@/lib/utils";

export default async function LogisticaPage() {
  const branch = await getActiveBranch();
  
  // Fetch delivery orders
  const deliveryOrders = await prisma.deliveryOrder.findMany({
    where: getBranchFilter(branch),
    include: {
      sale: {
        include: {
          customer: true
        }
      },
      driver: true,
    },
    orderBy: { createdAt: 'desc' }
  });

  // Fetch drivers (users) for the branch
  const drivers = await prisma.user.findMany({
    where: {
      branchId: branch.id === 'GLOBAL' ? undefined : branch.id
    },
    select: { id: true, name: true, role: true }
  });

  return (
    <LogisticaClient initialOrders={deliveryOrders} branch={branch} drivers={drivers} />
  );
}
