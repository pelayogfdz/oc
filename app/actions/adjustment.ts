'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getActiveBranch, getActiveUser } from './auth';

export async function createInventoryAdjustment(
  items: { productId: string; newStock: number; difference: number; checkOldStock: number }[],
  reason: string
) {
  const branch = await getActiveBranch();
  if (!branch) return;
  if (branch.id === 'GLOBAL') throw new Error('Debes seleccionar una sucursal específica para realizar esta acción.');
  const user = await getActiveUser(branch.id);

  // Create the parent Adjustment Document
  const doc = await prisma.inventoryAdjustmentDoc.create({
    data: {
      branchId: branch.id,
      reason: reason,
      userId: user.id
    }
  });

  // Since we also update product stock, we'll do an array of promises or a sequential loop
  for (const item of items) {
    const currentProduct = await prisma.product.findUnique({ where: { id: item.productId } });
    if (!currentProduct) continue;

    await prisma.product.update({
      where: { id: item.productId },
      data: { stock: item.newStock }
    });

    await prisma.inventoryMovement.create({
      data: {
        productId: item.productId,
        type: 'ADJUSTMENT',
        quantity: item.difference,
        reason: `Ajuste Inventario Físico: ${reason}`,
        userId: user.id,
        adjustmentDocId: doc.id
      }
    });
  }

  revalidatePath('/productos');
  revalidatePath('/productos/ajustes');
}
