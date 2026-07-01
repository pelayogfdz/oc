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

  // Fetch a subset of products for displaying (paginated/limited) and categories
  const [displayedProductsRaw, categoriesData] = await Promise.all([
    prisma.product.findMany({
      where: { branchId: branchCondition, isActive: true },
      include: { variants: true, prices: true, branch: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
      take: 100
    }),
    prisma.product.findMany({
      where: { branchId: branchCondition, isActive: true },
      select: { category: true },
      distinct: ['category']
    })
  ]);

  // Extract unique identifiers to fetch cross-branch stock only for these products
  const productSkus = displayedProductsRaw.map(p => p.sku).filter((sku): sku is string => typeof sku === 'string' && sku.trim() !== '');
  const productBarcodes = displayedProductsRaw.map(p => p.barcode).filter((barcode): barcode is string => typeof barcode === 'string' && barcode.trim() !== '');
  const productNames = displayedProductsRaw.map(p => p.name).filter((name): name is string => typeof name === 'string' && name.trim() !== '');

  const otherBranchStocks = await prisma.product.findMany({
    where: {
      branchId: { in: tenantBranchIds },
      isActive: true,
      OR: [
        { sku: { in: productSkus } },
        { barcode: { in: productBarcodes } },
        { name: { in: productNames } }
      ]
    },
    select: { sku: true, barcode: true, name: true, stock: true, branchId: true, branch: { select: { name: true } } }
  });

  // Build a map of key to branch stocks across the entire tenant
  const branchStocksMap = new Map<string, any[]>();
  otherBranchStocks.forEach(prod => {
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
    displayedProductsRaw.forEach(prod => {
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
    });
  } else {
    displayedProducts = displayedProductsRaw.map(prod => {
      const key = ((prod.sku && prod.sku.trim() !== "")
        ? prod.sku.trim()
        : (prod.barcode && prod.barcode.trim() !== "")
          ? prod.barcode.trim()
          : prod.name.trim()).toUpperCase();
      return {
        ...prod,
        branchStocks: branchStocksMap.get(key) || []
      };
    });
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
