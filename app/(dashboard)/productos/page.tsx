import { getActiveBranch } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import ProductListClient from './ProductListClient';

export const dynamic = 'force-dynamic';

export default async function ProductosPage() {
  const branch = await getActiveBranch();
  if (!branch) return null;
  const branchId = branch.id;
  const isGlobal = branchId === 'GLOBAL';

  let branchCondition: any = branchId;
  if (isGlobal) {
    const tenantBranches = await prisma.branch.findMany({
      where: { tenantId: branch.tenantId, isActive: true },
      select: { id: true }
    });
    const tenantBranchIds = tenantBranches.map(b => b.id);
    branchCondition = { in: tenantBranchIds };
  }

  const [products, categoriesData] = await Promise.all([
    prisma.product.findMany({
      where: { branchId: branchCondition, isActive: true },
      include: { variants: true, prices: true, branch: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' }
    }),
    prisma.product.findMany({
      where: { branchId: branchCondition, isActive: true },
      select: { category: true },
      distinct: ['category']
    })
  ]);

  let displayedProducts = products;
  if (isGlobal) {
    const mergedMap = new Map<string, any>();
    products.forEach(prod => {
      const key = ((prod.sku && prod.sku.trim() !== "")
        ? prod.sku.trim()
        : (prod.barcode && prod.barcode.trim() !== "")
          ? prod.barcode.trim()
          : prod.name.trim()).toUpperCase();

      if (mergedMap.has(key)) {
        const existing = mergedMap.get(key);
        existing.stock += prod.stock;
        
        if (prod.stock > 0) {
          if (!existing.branchStocks) existing.branchStocks = [];
          const existingBranchStock = existing.branchStocks.find((bs: any) => bs.branchId === prod.branchId);
          if (existingBranchStock) {
            existingBranchStock.stock += prod.stock;
          } else {
            existing.branchStocks.push({
              branchId: prod.branchId,
              branchName: prod.branch?.name || 'Desconocida',
              stock: prod.stock
            });
          }
        }
        
        if (prod.variants && prod.variants.length > 0) {
          if (!existing.variants) existing.variants = [];
          prod.variants.forEach((v: any) => {
            const extVar = existing.variants.find((ev: any) => ev.attribute === v.attribute);
            if (extVar) {
              extVar.stock += v.stock;
            } else {
              existing.variants.push({ ...v });
            }
          });
        }
      } else {
        mergedMap.set(key, {
          ...prod,
          variants: prod.variants ? prod.variants.map((v: any) => ({ ...v })) : [],
          branchStocks: prod.stock > 0 ? [{
            branchId: prod.branchId,
            branchName: prod.branch?.name || 'Desconocida',
            stock: prod.stock
          }] : []
        });
      }
    });

    displayedProducts = Array.from(mergedMap.values()).slice(0, 100);
  } else {
    displayedProducts = products.map(prod => ({
      ...prod,
      branchStocks: prod.stock > 0 ? [{
        branchId: prod.branchId,
        branchName: prod.branch?.name || 'Desconocida',
        stock: prod.stock
      }] : []
    })).slice(0, 100);
  }

  const safeProducts = JSON.parse(JSON.stringify(displayedProducts));
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
