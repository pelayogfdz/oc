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

  const purchase = await prisma.purchase.create({
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

  // Increment stock & Register Kardex Movement
  for (const item of items) {
    await prisma.product.update({
      where: { id: item.productId },
      data: { 
        stock: { increment: item.quantity },
        cost: item.cost // Always update standard cost with the latest purchase cost (simplest approach for MVP)
      }
    });
    
    await prisma.inventoryMovement.create({
      data: {
        productId: item.productId,
        type: 'IN',
        quantity: item.quantity,
        reason: `Compra #${purchase.id.slice(0, 8)}`
      }
    });
  }

  revalidatePath('/productos/compras');
  revalidatePath('/productos');
}
