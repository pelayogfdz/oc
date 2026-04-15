'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function bulkUpdatePrices(
  updates: { id: string; price: number; wholesalePrice?: number | null; specialPrice?: number | null }[],
  dynamicUpdates?: { productId: string; priceListId: string; price: number | null }[]
) {
  if (updates.length > 0) {
    await prisma.$transaction(async (tx) => {
      for (const update of updates) {
        await tx.product.update({
          where: { id: update.id },
          data: {
            price: update.price,
            wholesalePrice: update.wholesalePrice,
            specialPrice: update.specialPrice,
          }
        });
      }
    });
  }

  if (dynamicUpdates && dynamicUpdates.length > 0) {
    await prisma.$transaction(async (tx) => {
      for (const update of dynamicUpdates) {
        if (update.price === null) {
          await tx.productPrice.deleteMany({
            where: { productId: update.productId, priceListId: update.priceListId }
          });
        } else {
          await tx.productPrice.upsert({
            where: {
              productId_priceListId: { productId: update.productId, priceListId: update.priceListId }
            },
            update: { price: update.price },
            create: { productId: update.productId, priceListId: update.priceListId, price: update.price }
          });
        }
      }
    });
  }

  revalidatePath('/productos');
  revalidatePath('/productos/precios-masivos');
  return { success: true };
}
