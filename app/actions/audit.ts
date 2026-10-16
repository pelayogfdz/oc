'use server';

import { prisma } from '@/lib/prisma';
import { getActiveBranch, getActiveUser } from './auth';
import { revalidatePath } from 'next/cache';

export async function createAudit(name: string, targetBranchId?: string) {
  const branch = await getActiveBranch();
  if (!branch) throw new Error("Branch not found");
  
  let branchId = targetBranchId || branch.id;
  if (branchId === 'GLOBAL' || !branchId) {
    throw new Error("Debes seleccionar una sucursal específica para realizar la auditoría.");
  }

  // Verify branch exists and is valid
  const targetBranch = await prisma.branch.findUnique({
    where: { id: branchId }
  });
  if (!targetBranch) {
    throw new Error("Sucursal no encontrada");
  }

  const audit = await prisma.inventoryAudit.create({
    data: {
      name,
      branchId,
      status: "COUNT_1",
    }
  });

  revalidatePath('/productos/auditorias');
  return audit;
}

export async function getAudits() {
  const branch = await getActiveBranch();
  if (!branch) return [];

  return await prisma.inventoryAudit.findMany({
    where: branch.id === 'GLOBAL' ? {} : { branchId: branch.id },
    orderBy: { createdAt: 'desc' },
    include: {
      branch: { select: { id: true, name: true } },
      _count: { select: { items: true } }
    }
  });
}

export async function updateAuditStatus(auditId: string, status: string) {
  await prisma.inventoryAudit.update({
    where: { id: auditId },
    data: { status }
  });
  revalidatePath(`/productos/auditorias/${auditId}`);
  revalidatePath('/productos/auditorias');
}

export async function submitAuditCount(auditId: string, countPhase: 1 | 2 | 3, items: { productId: string, count: number | null }[]) {
  const audit = await prisma.inventoryAudit.findUnique({
    where: { id: auditId }
  });
  if (!audit) throw new Error("Auditoría no encontrada");

  // 1. Get all targeted products to fetch their current system stock for the audit's branch
  const productIds = items.map(i => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, branchId: audit.branchId }
  });
  
  const productStocks = new Map(products.map(p => [p.id, p.stock]));

  // 2. Insert, update, or clear AuditItems
  for (const item of items) {
    const systemStock = productStocks.get(item.productId) || 0;
    const countField = countPhase === 1 ? 'count1' : countPhase === 2 ? 'count2' : 'count3';
    
    const auditItem = await prisma.inventoryAuditItem.findFirst({
      where: { auditId, productId: item.productId }
    });

    if (item.count === null) {
      if (auditItem) {
        if (countPhase === 1) {
          await prisma.inventoryAuditItem.delete({
            where: { id: auditItem.id }
          });
        } else if (countPhase === 2) {
          await prisma.inventoryAuditItem.update({
            where: { id: auditItem.id },
            data: { count2: null, count3: null }
          });
        } else {
          await prisma.inventoryAuditItem.update({
            where: { id: auditItem.id },
            data: { count3: null }
          });
        }
      }
      continue;
    }

    if (auditItem) {
      const updateData: Record<string, number | null> = { [countField]: item.count };
      if (countPhase === 1 && auditItem.count1 !== item.count) {
        updateData.count2 = null;
        updateData.count3 = null;
      } else if (countPhase === 2 && auditItem.count2 !== item.count) {
        updateData.count3 = null;
      }
      await prisma.inventoryAuditItem.update({
        where: { id: auditItem.id },
        data: updateData
      });
    } else {
      await prisma.inventoryAuditItem.create({
        data: {
          auditId,
          productId: item.productId,
          systemStock,
          [countField]: item.count
        }
      });
    }
  }

  revalidatePath(`/productos/auditorias/${auditId}`);
  revalidatePath('/productos/auditorias');
}

export async function finalizeAudit(auditId: string) {
  const user = await getActiveUser();

  const audit = await prisma.inventoryAudit.findUnique({
    where: { id: auditId },
    include: { items: { include: { product: true } } }
  });

  if (!audit) throw new Error("Auditoría no encontrada");

  // Safely find or fallback to a valid user in tenant database
  let validUserId: string | null = null;
  if (user?.id) {
    const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { id: true } });
    if (dbUser) validUserId = dbUser.id;
  }
  if (!validUserId) {
    const firstUser = await prisma.user.findFirst({ select: { id: true } });
    validUserId = firstUser?.id || null;
  }

  for (const item of audit.items) {
    // Determine the final count to apply
    let finalVal = item.count1;
    if (item.count3 !== null) finalVal = item.count3;
    else if (item.count2 !== null) finalVal = item.count2;

    if (finalVal === null || finalVal === undefined) continue;

    const diff = finalVal - item.systemStock;
    if (diff === 0) continue;

    // Apply to product
    await prisma.product.update({
      where: { id: item.productId },
      data: { stock: finalVal }
    });

    // Record Movement safely
    try {
      await prisma.inventoryMovement.create({
        data: {
          productId: item.productId,
          type: "ADJUSTMENT",
          quantity: Math.abs(diff),
          reason: diff > 0 ? `Auditoría (Ajuste Positivo) - ${audit.name}` : `Auditoría (Merma Quirúrgica) - ${audit.name}`,
          userId: validUserId
        }
      });
    } catch (movErr) {
      console.warn('[AUDIT MOVEMENT LOG WARNING]', movErr);
    }
    
    // Save final state
    await prisma.inventoryAuditItem.update({
      where: { id: item.id },
      data: { finalCount: finalVal }
    });
  }

  await prisma.inventoryAudit.update({
    where: { id: auditId },
    data: { status: "COMPLETED" }
  });

  revalidatePath(`/productos/auditorias/${auditId}`);
  revalidatePath('/productos/auditorias');
}

export async function getAuditCoverageReport(
  startDateInput: string | Date,
  endDateInput: string | Date,
  branchIdFilter?: string
) {
  const activeBranch = await getActiveBranch();
  if (!activeBranch) throw new Error("No branch active");

  const tenantId = activeBranch.tenantId;
  const tenantBranches = await prisma.branch.findMany({
    where: { tenantId, isActive: true },
    select: { id: true, name: true },
    orderBy: { name: 'asc' }
  });
  const tenantBranchIds = tenantBranches.map(b => b.id);

  let targetBranchIds = tenantBranchIds;
  const effectiveBranchFilter = branchIdFilter || (activeBranch.id === 'GLOBAL' ? 'ALL' : activeBranch.id);
  if (effectiveBranchFilter !== 'ALL' && effectiveBranchFilter !== 'GLOBAL') {
    if (tenantBranchIds.includes(effectiveBranchFilter)) {
      targetBranchIds = [effectiveBranchFilter];
    }
  }

  const startDate = typeof startDateInput === 'string'
    ? new Date(startDateInput.includes('T') ? startDateInput : `${startDateInput}T00:00:00`)
    : new Date(startDateInput);
  const endDate = typeof endDateInput === 'string'
    ? new Date(endDateInput.includes('T') ? endDateInput : `${endDateInput}T23:59:59.999`)
    : new Date(endDateInput);

  // 1. Fetch all active physical products in target branch(es)
  const products = await prisma.product.findMany({
    where: {
      branchId: { in: targetBranchIds },
      isActive: true,
      isService: false
    },
    select: {
      id: true,
      sku: true,
      barcode: true,
      name: true,
      category: true,
      brand: true,
      location: true,
      stock: true,
      minStock: true,
      cost: true,
      price: true,
      unit: true,
      branchId: true,
      branch: { select: { id: true, name: true } }
    },
    orderBy: { name: 'asc' }
  });

  // 2. Fetch all audits in the selected period for target branch(es)
  const auditsInPeriod = await prisma.inventoryAudit.findMany({
    where: {
      branchId: { in: targetBranchIds },
      OR: [
        { createdAt: { gte: startDate, lte: endDate } },
        { updatedAt: { gte: startDate, lte: endDate } }
      ]
    },
    include: {
      branch: { select: { id: true, name: true } },
      items: true
    },
    orderBy: { updatedAt: 'desc' }
  });

  // 3. Also fetch latest historical audit items per product (even before the selected range)
  const allAuditItemsForBranches = await prisma.inventoryAuditItem.findMany({
    where: {
      audit: { branchId: { in: targetBranchIds } }
    },
    include: {
      audit: { select: { id: true, name: true, status: true, createdAt: true, updatedAt: true } }
    },
    orderBy: {
      audit: { updatedAt: 'desc' }
    }
  });

  const lastHistoricalByProduct = new Map<string, {
    auditId: string;
    auditName: string;
    auditDate: Date;
    auditStatus: string;
    countedQty: number;
  }>();

  for (const item of allAuditItemsForBranches) {
    const countedVal = item.finalCount ?? item.count3 ?? item.count2 ?? item.count1;
    if (countedVal === null || countedVal === undefined) continue;
    if (!lastHistoricalByProduct.has(item.productId)) {
      lastHistoricalByProduct.set(item.productId, {
        auditId: item.audit.id,
        auditName: item.audit.name,
        auditDate: item.audit.updatedAt || item.audit.createdAt,
        auditStatus: item.audit.status,
        countedQty: countedVal
      });
    }
  }

  // Map product counts within the selected period (most recent audit in the period wins)
  const periodCountByProduct = new Map<string, {
    auditId: string;
    auditName: string;
    auditDate: Date;
    auditStatus: string;
    systemStockAtAudit: number;
    countedQty: number;
    discrepancy: number;
    timesCountedInPeriod: number;
  }>();

  for (const audit of auditsInPeriod) {
    for (const item of audit.items) {
      const countedVal = item.finalCount ?? item.count3 ?? item.count2 ?? item.count1;
      if (countedVal === null || countedVal === undefined) continue;

      const existing = periodCountByProduct.get(item.productId);
      if (!existing) {
        periodCountByProduct.set(item.productId, {
          auditId: audit.id,
          auditName: audit.name,
          auditDate: audit.updatedAt || audit.createdAt,
          auditStatus: audit.status,
          systemStockAtAudit: item.systemStock,
          countedQty: countedVal,
          discrepancy: countedVal - item.systemStock,
          timesCountedInPeriod: 1
        });
      } else {
        existing.timesCountedInPeriod += 1;
      }
    }
  }

  // Build enriched product list
  const items = products.map(p => {
    const periodInfo = periodCountByProduct.get(p.id);
    const historicalInfo = lastHistoricalByProduct.get(p.id);
    const countedInPeriod = Boolean(periodInfo);
    const hasStock = p.stock > 0;
    const costValue = Math.max(0, p.stock) * (p.cost || 0);
    const priceValue = Math.max(0, p.stock) * (p.price || 0);

    return {
      id: p.id,
      sku: p.sku || '',
      barcode: p.barcode || '',
      name: p.name,
      category: p.category || 'Sin categoría',
      brand: p.brand || 'Sin marca',
      location: p.location || 'Sin ubicación',
      unit: p.unit || 'Pza',
      stock: p.stock,
      minStock: p.minStock,
      cost: p.cost || 0,
      price: p.price || 0,
      costValue,
      priceValue,
      branchId: p.branchId,
      branchName: p.branch?.name || 'Sucursal',
      countedInPeriod,
      hasStock,
      periodAudit: periodInfo || null,
      lastHistoricalAudit: historicalInfo || null
    };
  });

  const productsWithStock = items.filter(i => i.stock > 0);
  const uncountedWithStock = productsWithStock.filter(i => !i.countedInPeriod);
  const countedWithStock = productsWithStock.filter(i => i.countedInPeriod);
  const allCountedInPeriod = items.filter(i => i.countedInPeriod);

  const uncountedUnits = uncountedWithStock.reduce((acc, i) => acc + i.stock, 0);
  const uncountedCostValue = uncountedWithStock.reduce((acc, i) => acc + i.costValue, 0);
  const uncountedPriceValue = uncountedWithStock.reduce((acc, i) => acc + i.priceValue, 0);

  const coveragePercent = productsWithStock.length > 0
    ? Math.round((countedWithStock.length / productsWithStock.length) * 1000) / 10
    : 100;

  // Extract unique categories, brands, and locations for filtering
  const categories = Array.from(new Set(products.map(p => p.category).filter((c): c is string => Boolean(c && c.trim())))).sort();
  const brands = Array.from(new Set(products.map(p => p.brand).filter((b): b is string => Boolean(b && b.trim())))).sort();
  const locations = Array.from(new Set(products.map(p => p.location).filter((l): l is string => Boolean(l && l.trim())))).sort();

  return {
    items,
    auditsInPeriod: auditsInPeriod.map(a => ({
      id: a.id,
      name: a.name,
      status: a.status,
      branchName: a.branch?.name || 'Sucursal',
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
      itemsCount: a.items.filter(it => (it.finalCount ?? it.count3 ?? it.count2 ?? it.count1) !== null).length
    })),
    metrics: {
      totalCatalogProducts: items.length,
      totalWithStock: productsWithStock.length,
      uncountedWithStockCount: uncountedWithStock.length,
      countedWithStockCount: countedWithStock.length,
      allCountedInPeriodCount: allCountedInPeriod.length,
      uncountedUnits,
      uncountedCostValue,
      uncountedPriceValue,
      coveragePercent,
      auditsInPeriodCount: auditsInPeriod.length
    },
    filters: {
      branches: tenantBranches,
      categories,
      brands,
      locations
    },
    effectiveBranchFilter
  };
}

