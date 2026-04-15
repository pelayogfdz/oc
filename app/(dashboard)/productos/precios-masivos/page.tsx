import { getActiveBranch } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import PreciosMasivosClient from "./PreciosMasivosClient";

export const dynamic = 'force-dynamic';

export default async function PreciosMasivosPage() {
  const branch = await getActiveBranch();
  
  // Extraemos las marcas únicas y categorías para los filtros
  const brandList = await prisma.product.findMany({
    where: { branchId: branch.id, brand: { not: null } },
    select: { brand: true },
    distinct: ['brand']
  });
  const brands = brandList.map(b => b.brand).filter(Boolean) as string[];

  const categoryList = await prisma.product.findMany({
    where: { branchId: branch.id, category: { not: null } },
    select: { category: true },
    distinct: ['category']
  });
  const categories = categoryList.map(c => c.category).filter(Boolean) as string[];

  const dynamicPriceLists = await prisma.priceList.findMany({
    where: { branchId: branch.id }
  });

  const initialProducts = await prisma.product.findMany({
    where: { branchId: branch.id, isActive: true },
    select: { 
      id: true, sku: true, name: true, brand: true, category: true, cost: true, 
      price: true, wholesalePrice: true, specialPrice: true,
      productPrices: {
        select: { priceListId: true, price: true }
      }
    }
  });

  return <PreciosMasivosClient initProducts={initialProducts} brands={brands} categories={categories} branchId={branch.id} dynamicPriceLists={dynamicPriceLists} />;
}
