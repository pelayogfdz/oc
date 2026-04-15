'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function bulkUpdateCosts(
  updates: { id: string; cost: number; averageCost?: number }[],
  forceAverageCost: boolean
) {
  if (updates.length === 0) return { success: true };

  await prisma.$transaction(async (tx) => {
    for (const update of updates) {
      const data: any = { cost: update.cost };
      if (forceAverageCost) {
        data.averageCost = update.cost;
      }

      await tx.product.update({
        where: { id: update.id },
        data
      });
    }
  });

  revalidatePath('/productos');
  revalidatePath('/productos/costos-proveedor');
  return { success: true };
}
