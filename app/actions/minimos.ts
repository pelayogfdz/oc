'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getSession } from './auth';

export async function updateProductMinStocks(
  updates: { productId: string; minStock: number }[]
) {
  const session = await getSession();
  const tenantId = session?.tenantId;

  if (!tenantId) {
    return { success: false, error: 'No autorizado' };
  }

  try {
    if (updates.length > 0) {
      await prisma.$transaction(
        updates.map((u) =>
          prisma.product.update({
            where: { id: u.productId },
            data: { minStock: u.minStock }
          })
        )
      );
    }
    revalidatePath('/productos/minimos');
    revalidatePath('/reportes/reposicion-minimos');
    return { success: true };
  } catch (error: any) {
    console.error('Error updating minStocks:', error);
    return { success: false, error: error.message || 'Error al guardar los mínimos' };
  }
}
