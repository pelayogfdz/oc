import { getActiveBranch } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import CostosProveedorClient from "./CostosProveedorClient";

export const dynamic = 'force-dynamic';

export default async function CostosProveedorPage() {
  const branch = await getActiveBranch();
  
  // Extraemos las marcas únicas para el filtro
  const brandList = await prisma.product.findMany({
    where: { branchId: branch.id, brand: { not: null } },
    select: { brand: true },
    distinct: ['brand']
  });
  const brands = brandList.map(b => b.brand).filter(Boolean) as string[];

  const initialProducts = await prisma.product.findMany({
    where: { branchId: branch.id, isActive: true },
    select: { id: true, sku: true, name: true, brand: true, cost: true, averageCost: true }
  });

  return <CostosProveedorClient initProducts={initialProducts} brands={brands} branchId={branch.id} />;
}
