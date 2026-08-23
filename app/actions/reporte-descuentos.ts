'use server';

import { prisma } from '@/lib/prisma';
import { getActiveBranch, getSession } from './auth';

export interface DiscountItemRow {
  id: string;
  saleId: string;
  saleFolio: string;
  saleDate: string;
  branchId: string;
  branchName: string;
  userId: string;
  userName: string;
  customerId: string | null;
  customerName: string;
  productId: string;
  productName: string;
  productSku: string;
  productBarcode: string;
  productCategory: string;
  productBrand: string;
  variantId: string | null;
  variantAttribute: string | null;
  quantity: number;
  regularPrice: number;
  chargedPrice: number;
  unitDiscount: number;
  totalDiscount: number;
  discountPct: number;
  totalCharged: number;
  totalRegular: number;
  discountType: 'PROMOTION' | 'PRICE_LIST' | 'MANUAL_DISCOUNT' | 'LOYALTY_POINTS' | 'OTHER';
  discountReason: string;
}

export interface DiscountReportSummary {
  kpis: {
    totalDiscountAmount: number;
    totalDiscountedUnits: number;
    totalDiscountedSalesCount: number;
    totalChargedAmount: number;
    totalRegularAmount: number;
    averageDiscountPct: number;
  };
  rows: DiscountItemRow[];
  byProduct: {
    productId: string;
    productName: string;
    productSku: string;
    productCategory: string;
    unitsSoldWithDiscount: number;
    totalDiscountAmount: number;
    totalChargedAmount: number;
  }[];
  byType: {
    type: string;
    label: string;
    units: number;
    totalDiscountAmount: number;
    totalChargedAmount: number;
  }[];
  availableBranches: { id: string; name: string }[];
  availableUsers: { id: string; name: string }[];
}

export async function getDiscountPromotionsReport(
  startDateStr: string,
  endDateStr: string,
  branchIdFilter: string = 'ALL',
  userIdFilter: string = 'ALL',
  discountTypeFilter: string = 'ALL'
): Promise<DiscountReportSummary> {
  const session = await getSession();
  const branch = await getActiveBranch();
  if (!branch) throw new Error('No autorizado');

  const tenantId = session?.tenantId || branch.tenantId;
  if (!tenantId) throw new Error('No autorizado: Contexto de tenant no encontrado');

  const start = new Date(startDateStr);
  start.setHours(0, 0, 0, 0);

  const end = new Date(endDateStr);
  end.setHours(23, 59, 59, 999);

  // Fetch branches for tenant
  const tenantBranches = await prisma.branch.findMany({
    where: { tenantId, isActive: true },
    select: { id: true, name: true },
    orderBy: { name: 'asc' }
  });
  const tenantBranchIds = tenantBranches.map(b => b.id);

  // Branch filter condition
  let branchCondition: any = branch.id === 'GLOBAL'
    ? { branchId: { in: tenantBranchIds } }
    : { branchId: branch.id };

  if (branchIdFilter && branchIdFilter !== 'ALL') {
    if (tenantBranchIds.includes(branchIdFilter)) {
      branchCondition = { branchId: branchIdFilter };
    }
  }

  // User filter condition
  const tenantUsers = await prisma.user.findMany({
    where: { tenantId },
    select: { id: true, name: true },
    orderBy: { name: 'asc' }
  });
  const tenantUserIds = tenantUsers.map(u => u.id);

  let userCondition: any = {};
  if (userIdFilter && userIdFilter !== 'ALL' && tenantUserIds.includes(userIdFilter)) {
    userCondition = { userId: userIdFilter };
  }

  // Fetch sales in the date range
  const sales = await prisma.sale.findMany({
    where: {
      ...branchCondition,
      ...userCondition,
      createdAt: {
        gte: start,
        lte: end
      },
      status: { notIn: ['CANCELLED', 'REFUNDED'] }
    },
    include: {
      branch: { select: { id: true, name: true } },
      user: { select: { id: true, name: true } },
      customer: { select: { id: true, name: true } },
      items: {
        include: {
          product: {
            include: {
              prices: {
                include: { priceList: true }
              }
            }
          },
          variant: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  const rows: DiscountItemRow[] = [];
  const discountedSaleIds = new Set<string>();

  for (const sale of sales) {
    const saleDateStr = sale.createdAt.toISOString();
    const saleNotes = (sale.notes || '').toLowerCase();
    const isPointsRedemption = saleNotes.includes('[monedero electrónico]') || saleNotes.includes('puntos');
    const isPromoNote = saleNotes.includes('promoción') || saleNotes.includes('promo') || saleNotes.includes('descuento');

    // Calculate sum of charged item totals
    const sumChargedItems = sale.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const hasGlobalSaleDiscount = sale.total < sumChargedItems - 0.05;
    const globalDiscountRatio = (sumChargedItems > 0 && hasGlobalSaleDiscount)
      ? (sumChargedItems - sale.total) / sumChargedItems
      : 0;

    for (const item of sale.items) {
      const regularBasePrice = item.variant?.price ?? item.product.price;
      const chargedUnitPrice = item.price;
      
      // Calculate effective unit price considering ticket-level global discount if present
      const effectiveUnitPrice = globalDiscountRatio > 0
        ? chargedUnitPrice * (1 - globalDiscountRatio)
        : chargedUnitPrice;

      const unitDiscountDiff = Math.max(0, regularBasePrice - effectiveUnitPrice);
      const hasItemDiscount = unitDiscountDiff > 0.01;

      if (!hasItemDiscount && !isPointsRedemption) {
        continue; // No discount on this line
      }

      // Determine discount type and reason
      let discountType: DiscountItemRow['discountType'] = 'MANUAL_DISCOUNT';
      let discountReason = 'Descuento aplicado en Punto de Venta';

      if (isPointsRedemption) {
        discountType = 'LOYALTY_POINTS';
        discountReason = 'Monedero Electrónico (Puntos)';
      } else if (isPromoNote || sale.breakdownDiscounts) {
        discountType = 'PROMOTION';
        discountReason = 'Promoción / Oferta de Campaña';
      } else {
        // Check if price matches a dynamic price list (Mayoreo, Especial, etc.)
        const matchingPriceList = item.product.prices?.find(p => Math.abs(p.price - chargedUnitPrice) < 0.05);
        if (matchingPriceList?.priceList?.name) {
          discountType = 'PRICE_LIST';
          discountReason = `Lista de Precios: ${matchingPriceList.priceList.name}`;
        } else if (item.product.wholesalePrice && Math.abs(item.product.wholesalePrice - chargedUnitPrice) < 0.05) {
          discountType = 'PRICE_LIST';
          discountReason = 'Precio de Mayoreo Asignado';
        } else if (item.product.specialPrice && Math.abs(item.product.specialPrice - chargedUnitPrice) < 0.05) {
          discountType = 'PRICE_LIST';
          discountReason = 'Precio Especial Asignado';
        } else if (hasGlobalSaleDiscount) {
          discountType = 'MANUAL_DISCOUNT';
          discountReason = 'Descuento Global en Venta (%)';
        } else {
          discountType = 'MANUAL_DISCOUNT';
          discountReason = 'Precio Especial / Descuento Directo';
        }
      }

      // Filter by discountType if requested
      if (discountTypeFilter && discountTypeFilter !== 'ALL' && discountType !== discountTypeFilter) {
        continue;
      }

      const totalLineDiscount = unitDiscountDiff * item.quantity;
      const totalLineCharged = effectiveUnitPrice * item.quantity;
      const totalLineRegular = regularBasePrice * item.quantity;
      const discountPct = totalLineRegular > 0 ? (totalLineDiscount / totalLineRegular) * 100 : 0;

      discountedSaleIds.add(sale.id);

      rows.push({
        id: item.id,
        saleId: sale.id,
        saleFolio: sale.folio || sale.id.slice(0, 8).toUpperCase(),
        saleDate: saleDateStr,
        branchId: sale.branchId || '',
        branchName: sale.branch?.name || 'Sucursal Desconocida',
        userId: sale.userId,
        userName: sale.user?.name || 'Vendedor',
        customerId: sale.customerId,
        customerName: sale.customer?.name || 'Público General',
        productId: item.productId,
        productName: item.product.name,
        productSku: item.product.sku || '-',
        productBarcode: item.product.barcode || '-',
        productCategory: item.product.category || 'Sin Categoría',
        productBrand: (item.product as any).brand || 'Genérico',
        variantId: item.variantId,
        variantAttribute: item.variant?.attribute || null,
        quantity: item.quantity,
        regularPrice: Math.round(regularBasePrice * 100) / 100,
        chargedPrice: Math.round(effectiveUnitPrice * 100) / 100,
        unitDiscount: Math.round(unitDiscountDiff * 100) / 100,
        totalDiscount: Math.round(totalLineDiscount * 100) / 100,
        discountPct: Math.round(discountPct * 10) / 10,
        totalCharged: Math.round(totalLineCharged * 100) / 100,
        totalRegular: Math.round(totalLineRegular * 100) / 100,
        discountType,
        discountReason
      });
    }
  }

  // Calculate Aggregations
  let totalDiscountAmount = 0;
  let totalDiscountedUnits = 0;
  let totalChargedAmount = 0;
  let totalRegularAmount = 0;

  const productAggMap = new Map<string, {
    productId: string;
    productName: string;
    productSku: string;
    productCategory: string;
    unitsSoldWithDiscount: number;
    totalDiscountAmount: number;
    totalChargedAmount: number;
  }>();

  const typeAggMap = new Map<string, {
    type: string;
    label: string;
    units: number;
    totalDiscountAmount: number;
    totalChargedAmount: number;
  }>();

  const typeLabels: Record<string, string> = {
    PROMOTION: 'Promociones de Campaña',
    PRICE_LIST: 'Listas de Precios (Mayoreo/Especial)',
    MANUAL_DISCOUNT: 'Descuentos Manuales en POS',
    LOYALTY_POINTS: 'Puntos de Monedero',
    OTHER: 'Otros Descuentos'
  };

  for (const row of rows) {
    totalDiscountAmount += row.totalDiscount;
    totalDiscountedUnits += row.quantity;
    totalChargedAmount += row.totalCharged;
    totalRegularAmount += row.totalRegular;

    // Group by product
    const existingProd = productAggMap.get(row.productId);
    if (existingProd) {
      existingProd.unitsSoldWithDiscount += row.quantity;
      existingProd.totalDiscountAmount += row.totalDiscount;
      existingProd.totalChargedAmount += row.totalCharged;
    } else {
      productAggMap.set(row.productId, {
        productId: row.productId,
        productName: row.productName,
        productSku: row.productSku,
        productCategory: row.productCategory,
        unitsSoldWithDiscount: row.quantity,
        totalDiscountAmount: row.totalDiscount,
        totalChargedAmount: row.totalCharged
      });
    }

    // Group by discount type
    const existingType = typeAggMap.get(row.discountType);
    if (existingType) {
      existingType.units += row.quantity;
      existingType.totalDiscountAmount += row.totalDiscount;
      existingType.totalChargedAmount += row.totalCharged;
    } else {
      typeAggMap.set(row.discountType, {
        type: row.discountType,
        label: typeLabels[row.discountType] || 'Otros',
        units: row.quantity,
        totalDiscountAmount: row.totalDiscount,
        totalChargedAmount: row.totalCharged
      });
    }
  }

  const averageDiscountPct = totalRegularAmount > 0
    ? Math.round(((totalDiscountAmount / totalRegularAmount) * 100) * 10) / 10
    : 0;

  const byProduct = Array.from(productAggMap.values())
    .sort((a, b) => b.totalDiscountAmount - a.totalDiscountAmount);

  const byType = Array.from(typeAggMap.values())
    .sort((a, b) => b.totalDiscountAmount - a.totalDiscountAmount);

  return {
    kpis: {
      totalDiscountAmount: Math.round(totalDiscountAmount * 100) / 100,
      totalDiscountedUnits,
      totalDiscountedSalesCount: discountedSaleIds.size,
      totalChargedAmount: Math.round(totalChargedAmount * 100) / 100,
      totalRegularAmount: Math.round(totalRegularAmount * 100) / 100,
      averageDiscountPct
    },
    rows,
    byProduct,
    byType,
    availableBranches: tenantBranches,
    availableUsers: tenantUsers
  };
}
