import { getActiveBranch } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import CostosProveedorClient from "./CostosProveedorClient";

export const dynamic = 'force-dynamic';

export default async function CostosProveedorPage() {
  const branch = await getActiveBranch();
  if (!branch) return null;

  const initialProducts = await prisma.product.findMany({
    where: { branchId: branch.id, isActive: true },
    select: { id: true, sku: true, name: true, brand: true, cost: true, averageCost: true }
  });

  return <CostosProveedorClient initProducts={initialProducts} brands={[]} branchId={branch.id} />;
}
