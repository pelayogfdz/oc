'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function bulkUpdatePrices(
  updates: { id: string; price: number; wholesalePrice?: number; specialPrice?: number }[]
) {
  if (updates.length === 0) return { success: true };

  await prisma.$transaction(async (tx) => {
    for (const update of updates) {
      await tx.product.update({
        where: { id: update.id },
        data: {
          price: update.price,
          wholesalePrice: update.wholesalePrice !== undefined ? update.wholesalePrice : null,
          specialPrice: update.specialPrice !== undefined ? update.specialPrice : null,
        }
      });
    }
  });

  revalidatePath('/productos');
  revalidatePath('/productos/precios-masivos');
  return { success: true };
}
