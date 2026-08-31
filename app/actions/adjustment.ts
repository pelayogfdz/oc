'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getActiveBranch, getActiveUser } from './auth';

export async function createInventoryAdjustment(
  items: { productId: string; newStock: number; difference: number; checkOldStock: number }[],
  reason: string,
  targetBranchId?: string
) {
  const branch = await getActiveBranch();
  if (!branch) throw new Error('Sesión no válida');
  
  let branchId = targetBranchId || branch.id;
  if (branchId === 'GLOBAL') {
    if (items.length > 0) {
      const firstProd = await prisma.product.findUnique({
        where: { id: items[0].productId },
        select: { branchId: true }
      });
      if (firstProd) branchId = firstProd.branchId;
    }
  }

  if (branchId === 'GLOBAL' || !branchId) {
    throw new Error('Debes seleccionar una sucursal específica para realizar esta acción.');
  }

  const user = await getActiveUser();

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

  if (!validUserId) {
    throw new Error('No se encontró un usuario válido para registrar el ajuste.');
  }

  // Create the parent Adjustment Document
  const doc = await prisma.inventoryAdjustmentDoc.create({
    data: {
      branchId: branchId,
      reason: reason,
      userId: validUserId
    }
  });

  // Update product stock and record movements
  for (const item of items) {
    const currentProduct = await prisma.product.findUnique({ where: { id: item.productId } });
    if (!currentProduct) continue;

    await prisma.product.update({
      where: { id: item.productId },
      data: { stock: item.newStock }
    });

    try {
      await prisma.inventoryMovement.create({
        data: {
          productId: item.productId,
          type: 'ADJUSTMENT',
          quantity: item.difference,
          reason: `Ajuste Inventario Físico: ${reason}`,
          userId: validUserId,
          adjustmentDocId: doc.id
        }
      });
    } catch (movErr) {
      console.warn('[INVENTORY ADJUSTMENT MOVEMENT WARNING]', movErr);
    }
  }

  revalidatePath('/productos');
  revalidatePath('/productos/ajustes');
}
