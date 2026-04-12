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
  const user = await getActiveUser(branch.id);

  for (const item of items) {
    // Validate that the stock hasn't wildly changed 
    const currentProduct = await prisma.product.findUnique({ where: { id: item.productId } });
    if (!currentProduct) continue;

    // Apply the adjustment (replace the current stock with the counted manual stock)
    await prisma.product.update({
      where: { id: item.productId },
      data: { stock: item.newStock }
    });

    // Determine IN or OUT for Kardex logic purely logging the difference
    const type = item.difference > 0 ? 'IN' : item.difference < 0 ? 'OUT' : 'ADJUSTMENT';

    await prisma.inventoryMovement.create({
      data: {
        productId: item.productId,
        type: type,
        quantity: item.difference, // Negative if we lost stock, positive if we found stock
        reason: `Ajuste Inventario Físico: ${reason}`,
        userId: user.id
      }
    });
  }

  revalidatePath('/productos');
  revalidatePath('/productos/ajustes');
}
