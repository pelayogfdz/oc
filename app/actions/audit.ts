'use server';

import { prisma } from '@/lib/prisma';
import { getActiveBranch } from './auth';
import { revalidatePath } from 'next/cache';

export async function createAudit(name: string) {
  const branch = await getActiveBranch();
  if (!branch) throw new Error("Branch not found");

  const audit = await prisma.inventoryAudit.create({
    data: {
      name,
      branchId: branch.id,
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
    where: { branchId: branch.id },
    orderBy: { createdAt: 'desc' },
    include: {
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

export async function submitAuditCount(auditId: string, countPhase: 1 | 2 | 3, items: { productId: string, count: number }[]) {
  const branch = await getActiveBranch();
  if (!branch) throw new Error("Branch not found");

  // 1. Get all targeted products to fetch their current system stock
  const productIds = items.map(i => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, branchId: branch.id }
  });
  
  const productStocks = new Map(products.map(p => [p.id, p.stock]));

  // 2. Insert or update AuditItems
  for (const item of items) {
    const systemStock = productStocks.get(item.productId) || 0;
    
    const countField = countPhase === 1 ? 'count1' : countPhase === 2 ? 'count2' : 'count3';
    
    const auditItem = await prisma.inventoryAuditItem.findFirst({
        where: { auditId, productId: item.productId }
    });

    if (auditItem) {
        await prisma.inventoryAuditItem.update({
            where: { id: auditItem.id },
            data: { [countField]: item.count }
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
}

export async function finalizeAudit(auditId: string) {
  const branch = await getActiveBranch();
  if (!branch) throw new Error("Branch not found");

  const audit = await prisma.inventoryAudit.findUnique({
    where: { id: auditId },
    include: { items: { include: { product: true } } }
  });

  if (!audit) throw new Error("Audit not found");

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

    // Record Movement
    await prisma.inventoryMovement.create({
      data: {
        productId: item.productId,
        type: "ADJUSTMENT",
        quantity: Math.abs(diff),
        reason: diff > 0 ? `Auditoría (Ajuste Positivo) - ${audit.name}` : `Auditoría (Merma Quirúrgica) - ${audit.name}`
      }
    });
    
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
