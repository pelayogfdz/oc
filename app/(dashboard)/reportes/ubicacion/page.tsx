import { getActiveBranch } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import ProductosUbicacionClient from "./ProductosUbicacionClient";

export const dynamic = 'force-dynamic';

export default async function ProductosUbicacionPage() {
  const branch = await getActiveBranch();
  if (!branch) {
    throw new Error('Unauthorized');
  }

  // Fetch products
  const products = await prisma.product.findMany({
    where: branch.id === 'GLOBAL' ? { isActive: true } : { branchId: branch.id, isActive: true },
    orderBy: [
      { location: 'asc' },
      { name: 'asc' }
    ]
  });

  // Extract distinct categories and brands
  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean))) as string[];
  const brands = Array.from(new Set(products.map(p => p.brand).filter(Boolean))) as string[];

  const safeProducts = JSON.parse(JSON.stringify(products));

  return (
    <ProductosUbicacionClient 
      initialProducts={safeProducts} 
      categories={categories.sort()} 
      brands={brands.sort()} 
      branchName={branch.name}
    />
  );
}
