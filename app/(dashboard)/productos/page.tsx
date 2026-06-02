import { getActiveBranch } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import ProductListClient from './ProductListClient';

export const dynamic = 'force-dynamic';

export default async function ProductosPage() {
  const branch = await getActiveBranch();
  const branchId = branch?.id || '';

  const [products, categoriesData] = await Promise.all([
    prisma.product.findMany({
      where: { branchId },
      orderBy: { createdAt: 'desc' },
      take: 100
    }),
    prisma.product.findMany({
      where: { branchId },
      select: { category: true },
      distinct: ['category']
    })
  ]);

  const safeProducts = JSON.parse(JSON.stringify(products));
  const categories = categoriesData.map(c => c.category).filter(Boolean) as string[];

  return (
    <div>
      <ProductListClient 
        initialProducts={safeProducts} 
        branchId={branchId} 
        categories={categories} 
      />
    </div>
  );
}
