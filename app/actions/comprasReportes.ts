'use server';

import { prisma } from '@/lib/prisma';
import { getActiveBranch, getSession } from './auth';
import { getUtcDateFromLocal } from '@/app/lib/timezone';

export interface PurchaseRemainingItem {
  purchaseId: string;
  purchaseFolio: string;
  supplierFolio: string | null;
  purchaseDate: string; // ISO string
  daysAgo: number;
  branchId: string;
  branchName: string;
  supplierId: string | null;
  supplierName: string;
  productId: string;
  productName: string;
  productSku: string;
  productBarcode: string | null;
  brand: string;
  category: string;
  unit: string;
  unitCost: number;
  purchasedQty: number;
  totalPurchaseCost: number;
  currentStock: number;
  remainingQty: number;
  remainingValue: number;
  displacedQty: number;
  displacedValue: number;
  displacementPercent: number;
  status: 'UNSOLD' | 'PARTIAL' | 'EXHAUSTED';
  batchNumber?: string | null;
  expirationDate?: string | null;
}

export interface PurchaseGroupedOrder {
  purchaseId: string;
  purchaseFolio: string;
  supplierFolio: string | null;
  purchaseDate: string;
  daysAgo: number;
  branchName: string;
  supplierName: string;
  totalPurchaseAmount: number;
  totalPurchasedQty: number;
  totalRemainingQty: number;
  totalRemainingValue: number;
  itemsCount: number;
  items: PurchaseRemainingItem[];
}

export interface PurchasesRemainingStockResponse {
  items: PurchaseRemainingItem[];
  groupedOrders: PurchaseGroupedOrder[];
  metrics: {
    totalPurchasesCount: number;
    totalUnitsPurchased: number;
    totalAmountInvested: number;
    totalRemainingUnits: number;
    totalRemainingCapital: number;
    totalDisplacedCapital: number;
    overallDisplacementRate: number;
    unsoldItemsCount: number;
    partialItemsCount: number;
    exhaustedItemsCount: number;
  };
  filterOptions: {
    brands: string[];
    categories: string[];
    suppliers: { id: string; name: string }[];
    branches: { id: string; name: string }[];
  };
}

export async function getPurchasesRemainingStockData(params: {
  startDate?: string;
  endDate?: string;
  branchId?: string;
  brand?: string;
  category?: string;
  supplierId?: string;
  statusFilter?: 'ALL' | 'REMAINING_ONLY' | 'UNSOLD_ONLY' | 'EXHAUSTED_ONLY';
}): Promise<PurchasesRemainingStockResponse> {
  const session = await getSession();
  const activeBranch = await getActiveBranch();
  if (!activeBranch) throw new Error('No autorizado');

  const tenantId = session?.tenantId || activeBranch.tenantId;
  if (!tenantId) throw new Error('Contexto de empresa (tenant) no encontrado');

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { timezone: true }
  });
  const timezone = tenant?.timezone || 'America/Mexico_City';

  // Available branches
  const tenantBranches = await prisma.branch.findMany({
    where: { tenantId, isActive: true },
    select: { id: true, name: true },
    orderBy: { name: 'asc' }
  });
  const tenantBranchIds = tenantBranches.map(b => b.id);

  // Branch filter condition
  let branchFilterCondition: any = { branchId: { in: tenantBranchIds } };
  if (params.branchId && params.branchId !== 'ALL') {
    if (tenantBranchIds.includes(params.branchId)) {
      branchFilterCondition = { branchId: params.branchId };
    }
  }

  // Date filters
  let dateCondition: any = {};
  if (params.startDate && params.endDate) {
    const [sy, sm, sd] = params.startDate.split('-').map(Number);
    const [ey, em, ed] = params.endDate.split('-').map(Number);
    const startUtc = getUtcDateFromLocal(sy, sm, sd, 0, 0, 0, 0, timezone);
    const endUtc = getUtcDateFromLocal(ey, em, ed, 23, 59, 59, 999, timezone);
    dateCondition = { createdAt: { gte: startUtc, lte: endUtc } };
  } else if (params.startDate) {
    const [sy, sm, sd] = params.startDate.split('-').map(Number);
    const startUtc = getUtcDateFromLocal(sy, sm, sd, 0, 0, 0, 0, timezone);
    dateCondition = { createdAt: { gte: startUtc } };
  } else if (params.endDate) {
    const [ey, em, ed] = params.endDate.split('-').map(Number);
    const endUtc = getUtcDateFromLocal(ey, em, ed, 23, 59, 59, 999, timezone);
    dateCondition = { createdAt: { lte: endUtc } };
  }

  // Supplier filter
  const supplierCondition = params.supplierId && params.supplierId !== 'ALL'
    ? { supplierId: params.supplierId }
    : {};

  // Fetch purchases
  const purchases = await prisma.purchase.findMany({
    where: {
      ...branchFilterCondition,
      ...dateCondition,
      ...supplierCondition,
      status: { not: 'CANCELLED' }
    },
    include: {
      branch: {
        select: { id: true, name: true }
      },
      supplier: {
        select: { id: true, name: true, taxId: true }
      },
      items: {
        include: {
          product: {
            select: {
              id: true,
              sku: true,
              barcode: true,
              name: true,
              brand: true,
              category: true,
              unit: true,
              stock: true,
              cost: true,
              averageCost: true
            }
          },
          batch: {
            select: {
              batchNumber: true,
              expirationDate: true
            }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Fetch filter options (Brands, Categories, Suppliers)
  const [allProductsForFilters, suppliersList] = await Promise.all([
    prisma.product.findMany({
      where: { branch: { tenantId } },
      select: { brand: true, category: true }
    }),
    prisma.supplier.findMany({
      where: { 
        OR: [
          { branchId: { in: tenantBranchIds } },
          { branchId: null }
        ]
      },
      select: { id: true, name: true },
      orderBy: { name: 'asc' }
    })
  ]);

  const uniqueBrands = Array.from(
    new Set(allProductsForFilters.map(p => p.brand?.trim()).filter(Boolean) as string[])
  ).sort((a, b) => a.localeCompare(b));

  const uniqueCategories = Array.from(
    new Set(allProductsForFilters.map(p => p.category?.trim()).filter(Boolean) as string[])
  ).sort((a, b) => a.localeCompare(b));

  const nowTime = new Date().getTime();
  const allItems: PurchaseRemainingItem[] = [];

  purchases.forEach(purchase => {
    const purchaseDateStr = purchase.createdAt.toISOString();
    const daysAgo = Math.max(0, Math.floor((nowTime - new Date(purchase.createdAt).getTime()) / (1000 * 60 * 60 * 24)));
    const branchName = purchase.branch?.name || 'Sucursal Principal';
    const supplierName = purchase.supplier?.name || 'Proveedor Sin Registro';

    purchase.items.forEach(item => {
      const prod = item.product;
      const brandName = prod?.brand?.trim() || 'Sin Marca';
      const categoryName = prod?.category?.trim() || 'General';

      // Filtering by Brand and Category
      if (params.brand && params.brand !== 'ALL' && brandName !== params.brand) {
        return;
      }
      if (params.category && params.category !== 'ALL' && categoryName !== params.category) {
        return;
      }

      const purchasedQty = item.quantity || 0;
      const unitCost = Number(item.cost) || 0;
      const totalPurchaseCost = purchasedQty * unitCost;

      const currentStock = prod ? (prod.stock ?? 0) : 0;
      const remainingQty = Math.max(0, Math.min(purchasedQty, currentStock));
      const remainingValue = remainingQty * unitCost;
      const displacedQty = Math.max(0, purchasedQty - remainingQty);
      const displacedValue = displacedQty * unitCost;
      const displacementPercent = purchasedQty > 0 ? Math.round((displacedQty / purchasedQty) * 100) : 0;

      let itemStatus: 'UNSOLD' | 'PARTIAL' | 'EXHAUSTED' = 'UNSOLD';
      if (currentStock <= 0 || remainingQty <= 0) {
        itemStatus = 'EXHAUSTED';
      } else if (remainingQty >= purchasedQty) {
        itemStatus = 'UNSOLD';
      } else {
        itemStatus = 'PARTIAL';
      }

      // Filter by remaining status
      if (params.statusFilter === 'REMAINING_ONLY' && (itemStatus === 'EXHAUSTED' || remainingQty <= 0)) {
        return;
      }
      if (params.statusFilter === 'UNSOLD_ONLY' && itemStatus !== 'UNSOLD') {
        return;
      }
      if (params.statusFilter === 'EXHAUSTED_ONLY' && itemStatus !== 'EXHAUSTED') {
        return;
      }

      allItems.push({
        purchaseId: purchase.id,
        purchaseFolio: purchase.folio ? `Folio ${purchase.folio}` : `#${purchase.id.slice(-6).toUpperCase()}`,
        supplierFolio: purchase.supplierFolio,
        purchaseDate: purchaseDateStr,
        daysAgo,
        branchId: purchase.branchId || '',
        branchName,
        supplierId: purchase.supplierId,
        supplierName,
        productId: item.productId,
        productName: item.productName || prod?.name || 'Producto Desconocido',
        productSku: item.productSku || prod?.sku || 'S/K',
        productBarcode: prod?.barcode || null,
        brand: brandName,
        category: categoryName,
        unit: prod?.unit || 'Pza',
        unitCost,
        purchasedQty,
        totalPurchaseCost,
        currentStock,
        remainingQty,
        remainingValue,
        displacedQty,
        displacedValue,
        displacementPercent,
        status: itemStatus,
        batchNumber: item.batch?.batchNumber || null,
        expirationDate: item.batch?.expirationDate ? item.batch.expirationDate.toISOString() : null
      });
    });
  });

  // Group by Purchase Order
  const groupedOrdersMap = new Map<string, PurchaseGroupedOrder>();

  allItems.forEach(item => {
    const existing = groupedOrdersMap.get(item.purchaseId) || {
      purchaseId: item.purchaseId,
      purchaseFolio: item.purchaseFolio,
      supplierFolio: item.supplierFolio,
      purchaseDate: item.purchaseDate,
      daysAgo: item.daysAgo,
      branchName: item.branchName,
      supplierName: item.supplierName,
      totalPurchaseAmount: 0,
      totalPurchasedQty: 0,
      totalRemainingQty: 0,
      totalRemainingValue: 0,
      itemsCount: 0,
      items: []
    };

    existing.totalPurchaseAmount += item.totalPurchaseCost;
    existing.totalPurchasedQty += item.purchasedQty;
    existing.totalRemainingQty += item.remainingQty;
    existing.totalRemainingValue += item.remainingValue;
    existing.itemsCount += 1;
    existing.items.push(item);

    groupedOrdersMap.set(item.purchaseId, existing);
  });

  const groupedOrders = Array.from(groupedOrdersMap.values()).sort(
    (a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime()
  );

  // Calculate high-level summary metrics
  const totalUnitsPurchased = allItems.reduce((acc, i) => acc + i.purchasedQty, 0);
  const totalAmountInvested = allItems.reduce((acc, i) => acc + i.totalPurchaseCost, 0);
  const totalRemainingUnits = allItems.reduce((acc, i) => acc + i.remainingQty, 0);
  const totalRemainingCapital = allItems.reduce((acc, i) => acc + i.remainingValue, 0);
  const totalDisplacedCapital = Math.max(0, totalAmountInvested - totalRemainingCapital);
  const overallDisplacementRate = totalUnitsPurchased > 0 
    ? Math.round(((totalUnitsPurchased - totalRemainingUnits) / totalUnitsPurchased) * 100) 
    : 0;

  const unsoldItemsCount = allItems.filter(i => i.status === 'UNSOLD').length;
  const partialItemsCount = allItems.filter(i => i.status === 'PARTIAL').length;
  const exhaustedItemsCount = allItems.filter(i => i.status === 'EXHAUSTED').length;

  return {
    items: allItems,
    groupedOrders,
    metrics: {
      totalPurchasesCount: groupedOrders.length,
      totalUnitsPurchased,
      totalAmountInvested,
      totalRemainingUnits,
      totalRemainingCapital,
      totalDisplacedCapital,
      overallDisplacementRate,
      unsoldItemsCount,
      partialItemsCount,
      exhaustedItemsCount
    },
    filterOptions: {
      brands: uniqueBrands,
      categories: uniqueCategories,
      suppliers: suppliersList,
      branches: tenantBranches
    }
  };
}
