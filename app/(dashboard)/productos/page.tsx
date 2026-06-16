import { getActiveBranch } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import ProductListClient from './ProductListClient';

export const dynamic = 'force-dynamic';

export default async function ProductosPage() {
  const branch = await getActiveBranch();
  if (!branch) return null;
  const branchId = branch.id;
  const isGlobal = branchId === 'GLOBAL';

  // Always get all active branches of this tenant to query all tenant products
  const tenantBranches = await prisma.branch.findMany({
    where: { tenantId: branch.tenantId, isActive: true },
    select: { id: true, name: true }
  });
  const tenantBranchIds = tenantBranches.map(b => b.id);

  let branchCondition: any = branchId;
  if (isGlobal) {
    branchCondition = { in: tenantBranchIds };
  }

  // Fetch all tenant products to construct cross-branch stocks, 
  // and categories for the selected branch filter
  const [allTenantProducts, categoriesData] = await Promise.all([
    prisma.product.findMany({
      where: { branchId: { in: tenantBranchIds }, isActive: true },
      include: { variants: true, prices: true, branch: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' }
    }),
    prisma.product.findMany({
      where: { branchId: branchCondition, isActive: true },
      select: { category: true },
      distinct: ['category']
    })
  ]);

  // Build a map of key to branch stocks across the entire tenant
  const branchStocksMap = new Map<string, any[]>();
  allTenantProducts.forEach(prod => {
    const key = ((prod.sku && prod.sku.trim() !== "")
      ? prod.sku.trim()
      : (prod.barcode && prod.barcode.trim() !== "")
        ? prod.barcode.trim()
        : prod.name.trim()).toUpperCase();

    if (prod.stock > 0) {
      if (!branchStocksMap.has(key)) {
        branchStocksMap.set(key, []);
      }
      const list = branchStocksMap.get(key)!;
      const existing = list.find(bs => bs.branchId === prod.branchId);
      if (existing) {
        existing.stock += prod.stock;
      } else {
        list.push({
          branchId: prod.branchId,
          branchName: prod.branch?.name || 'Desconocida',
          stock: prod.stock
        });
      }
    }
  });

  let displayedProducts = [];
  if (isGlobal) {
    const mergedMap = new Map<string, any>();
    allTenantProducts.forEach(prod => {
      const key = ((prod.sku && prod.sku.trim() !== "")
        ? prod.sku.trim()
        : (prod.barcode && prod.barcode.trim() !== "")
          ? prod.barcode.trim()
          : prod.name.trim()).toUpperCase();

      if (mergedMap.has(key)) {
        const existing = mergedMap.get(key);
        existing.stock += prod.stock;
        
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
          variants: prod.variants ? prod.variants.map((v: any) => ({ ...v })) : []
        });
      }
    });

    displayedProducts = Array.from(mergedMap.values()).map(prod => {
      const key = ((prod.sku && prod.sku.trim() !== "")
        ? prod.sku.trim()
        : (prod.barcode && prod.barcode.trim() !== "")
          ? prod.barcode.trim()
          : prod.name.trim()).toUpperCase();
      return {
        ...prod,
        branchStocks: branchStocksMap.get(key) || []
      };
    }).slice(0, 100);
  } else {
    // If specific branch selected, filter to keep only products registered in that branch
    const localProducts = allTenantProducts.filter(p => p.branchId === branchId);
    displayedProducts = localProducts.map(prod => {
      const key = ((prod.sku && prod.sku.trim() !== "")
        ? prod.sku.trim()
        : (prod.barcode && prod.barcode.trim() !== "")
          ? prod.barcode.trim()
          : prod.name.trim()).toUpperCase();
      return {
        ...prod,
        branchStocks: branchStocksMap.get(key) || []
      };
    }).slice(0, 100);
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
