import { getActiveBranch } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import PreciosMasivosClient from "./PreciosMasivosClient";

export const dynamic = 'force-dynamic';

export default async function PreciosMasivosPage() {
  const branch = await getActiveBranch();
  if (!branch) return null;

  const allPriceLists = await prisma.priceList.findMany({
    orderBy: { name: 'asc' }
  });

  const priceListsMap = new Map();
  const targetBranchId = branch.id;
  if (targetBranchId && targetBranchId !== 'GLOBAL') {
    for (const pl of allPriceLists) {
      if (pl.branchId === targetBranchId) {
        priceListsMap.set(pl.name, pl);
      }
    }
  }
  for (const pl of allPriceLists) {
    if (!priceListsMap.has(pl.name)) {
      priceListsMap.set(pl.name, pl);
    }
  }
  const dynamicPriceLists = Array.from(priceListsMap.values()).sort((a: any, b: any) => a.name.localeCompare(b.name));

  const initialProducts = await prisma.product.findMany({
    where: { branchId: branch.id, isActive: true },
    select: { 
      id: true, sku: true, barcode: true, name: true, brand: true, category: true, cost: true, 
      price: true, wholesalePrice: true, specialPrice: true,
      prices: {
        select: { priceListId: true, price: true }
      }
    }
  });

  return <PreciosMasivosClient initProducts={initialProducts} brands={[]} categories={[]} branchId={branch.id} dynamicPriceLists={dynamicPriceLists} />;
}
