import { getActiveBranch } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import ProductListClient from './ProductListClient';
import { enrichProductsWithTenantExternalMaps } from "@/app/actions/product";

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

  // Fetch a subset of products for displaying (paginated/limited)
  const displayedProductsRaw = await prisma.product.findMany({
    where: { branchId: branchCondition, isActive: true },
    include: { variants: true, prices: true, branch: { select: { id: true, name: true } }, externalMaps: true },
    orderBy: { name: 'asc' },
    take: 100
  });

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
    select: { id: true, sku: true, barcode: true, name: true, stock: true, branchId: true, branch: { select: { name: true } } }
  });

  // Build lookup maps of sku, barcode, and name to list of branch stock objects
  const otherBranchSkuMap = new Map<string, any[]>();
  const otherBranchBarcodeMap = new Map<string, any[]>();
  const otherBranchNameMap = new Map<string, any[]>();

  otherBranchStocks.forEach(prod => {
    if (prod.stock <= 0) return;

    const bsItem = {
      productId: prod.id,
      branchId: prod.branchId,
      branchName: prod.branch?.name || 'Desconocida',
      stock: prod.stock
    };

    if (prod.sku && prod.sku.trim() !== '') {
      const skuKey = prod.sku.trim().toUpperCase();
      if (!otherBranchSkuMap.has(skuKey)) otherBranchSkuMap.set(skuKey, []);
      otherBranchSkuMap.get(skuKey)!.push(bsItem);
    }
    if (prod.barcode && prod.barcode.trim() !== '') {
      const barcodeKey = prod.barcode.trim().toUpperCase();
      if (!otherBranchBarcodeMap.has(barcodeKey)) otherBranchBarcodeMap.set(barcodeKey, []);
      otherBranchBarcodeMap.get(barcodeKey)!.push(bsItem);
    }
    if (prod.name && prod.name.trim() !== '') {
      const nameKey = prod.name.trim().toUpperCase();
      if (!otherBranchNameMap.has(nameKey)) otherBranchNameMap.set(nameKey, []);
      otherBranchNameMap.get(nameKey)!.push(bsItem);
    }
  });

  // Helper function to resolve branch stocks for a given product
  const getBranchStocksForProduct = (prod: any) => {
    const matchedProductsMap = new Map<string, any>(); // Map productId -> bsItem to avoid counting the same product record twice

    if (prod.sku && prod.sku.trim() !== '') {
      const skuKey = prod.sku.trim().toUpperCase();
      const skuMatches = otherBranchSkuMap.get(skuKey);
      if (skuMatches) {
        skuMatches.forEach(m => matchedProductsMap.set(m.productId, m));
      }
    }
    if (prod.barcode && prod.barcode.trim() !== '') {
      const barcodeKey = prod.barcode.trim().toUpperCase();
      const barcodeMatches = otherBranchBarcodeMap.get(barcodeKey);
      if (barcodeMatches) {
        barcodeMatches.forEach(m => matchedProductsMap.set(m.productId, m));
      }
    }
    // Only fall back to name match if we have no SKU and no barcode
    const hasSkuOrBarcode = (prod.sku && prod.sku.trim() !== '') || (prod.barcode && prod.barcode.trim() !== '');
    if (!hasSkuOrBarcode && prod.name && prod.name.trim() !== '') {
      const nameKey = prod.name.trim().toUpperCase();
      const nameMatches = otherBranchNameMap.get(nameKey);
      if (nameMatches) {
        nameMatches.forEach(m => matchedProductsMap.set(m.productId, m));
      }
    }

    // Now group the unique matched products by branchId to sum up stock
    const branchMerged = new Map<string, { branchId: string; branchName: string; stock: number }>();
    matchedProductsMap.forEach(item => {
      // Exclude current branch if not GLOBAL
      if (branchId !== 'GLOBAL' && item.branchId === branchId) return;

      const existing = branchMerged.get(item.branchId);
      if (existing) {
        existing.stock += item.stock;
      } else {
        branchMerged.set(item.branchId, {
          branchId: item.branchId,
          branchName: item.branchName,
          stock: item.stock
        });
      }
    });

    return Array.from(branchMerged.values());
  };

  let displayedProducts = [];
  if (isGlobal) {
    const mergedMap = new Map<string, any>();
    displayedProductsRaw.forEach(prod => {
      const codeKey = ((prod.sku && prod.sku.trim() !== "")
        ? prod.sku.trim()
        : (prod.barcode && prod.barcode.trim() !== "")
          ? prod.barcode.trim()
          : prod.id).toUpperCase();
      const key = `${prod.name.trim().toUpperCase()}_${codeKey}`;

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

        if (prod.externalMaps && prod.externalMaps.length > 0) {
          if (!existing.externalMaps) existing.externalMaps = [];
          prod.externalMaps.forEach((em: any) => {
            if (!existing.externalMaps.some((x: any) => x.id === em.id)) {
              existing.externalMaps.push({ ...em });
            }
          });
        }
      } else {
        mergedMap.set(key, {
          ...prod,
          variants: prod.variants ? prod.variants.map((v: any) => ({ ...v })) : [],
          externalMaps: prod.externalMaps ? prod.externalMaps.map((em: any) => ({ ...em })) : []
        });
      }
    });

    displayedProducts = Array.from(mergedMap.values()).map(prod => {
      return {
        ...prod,
        branchStocks: getBranchStocksForProduct(prod)
      };
    });
  } else {
    displayedProducts = displayedProductsRaw.map(prod => {
      return {
        ...prod,
        branchStocks: getBranchStocksForProduct(prod)
      };
    });
  }

  await enrichProductsWithTenantExternalMaps(displayedProducts, tenantBranchIds);

  const safeProducts = JSON.parse(JSON.stringify(displayedProducts));
  return (
    <div>
      <ProductListClient 
        initialProducts={safeProducts} 
        branchId={branchId} 
        categories={[]} 
        brands={[]} 
      />
    </div>
  );
}
