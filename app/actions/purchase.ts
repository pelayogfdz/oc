'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getActiveBranch, getActiveUser } from './auth';

export async function createPurchase(
  items: { productId: string; quantity: number; cost: number }[], 
  total: number,
  paymentMethod: string = 'CASH',
  supplierId: string | null = null
) {
  const branch = await getActiveBranch();
  const user = await getActiveUser(branch.id);
  
  if (items.length === 0) throw new Error("List is empty");

  await prisma.$transaction(async (tx) => {
    const purchase = await tx.purchase.create({
      data: {
        total,
        paymentMethod,
        supplierId,
        branchId: branch.id,
        userId: user.id,
        items: {
          create: items.map(item => ({
            quantity: item.quantity,
            cost: item.cost,
            productId: item.productId
          }))
        }
      }
    });

    // Increment stock, Recalculate Average Cost & Register Kardex Movement
    for (const item of items) {
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product) continue;

      const currentStock = product.stock > 0 ? product.stock : 0;
      const currentAverage = product.averageCost || 0;
      
      const totalValue = (currentStock * currentAverage) + (item.quantity * item.cost);
      const newStock = currentStock + item.quantity;
      const newAverageCost = newStock > 0 ? totalValue / newStock : 0;

      await tx.product.update({
        where: { id: item.productId },
        data: { 
          stock: { increment: item.quantity },
          averageCost: newAverageCost,
          cost: item.cost // Update replacement cost (cost) with the latest purchase cost
        }
      });
      
      await tx.inventoryMovement.create({
        data: {
          productId: item.productId,
          type: 'IN',
          quantity: item.quantity,
          reason: `Compra #${purchase.id.slice(0, 8)}`
        }
      });
    }
  });

  revalidatePath('/productos/compras');
  revalidatePath('/productos');
}
