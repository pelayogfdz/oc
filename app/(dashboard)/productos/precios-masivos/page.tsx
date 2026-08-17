import { getActiveBranch } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import PreciosMasivosClient from "./PreciosMasivosClient";

export const dynamic = 'force-dynamic';

export default async function PreciosMasivosPage() {
  const branch = await getActiveBranch();
  if (!branch) return null;

  const dynamicPriceLists = await prisma.priceList.findMany({
    where: branch.id !== 'GLOBAL' ? { branchId: branch.id } : undefined
  });

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
