'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getActiveBranch, getActiveUser } from './auth';

export async function adjustInventory(formData: FormData) {
  const productId = formData.get('productId') as string;
  const quantityStr = formData.get('quantity') as string;
  const type = formData.get('type') as string; // 'IN', 'OUT', 'ADJUSTMENT'
  const reason = formData.get('reason') as string;

  if (!productId || !quantityStr || !type || !reason) {
    throw new Error('Datos incompletos para el ajuste de inventario.');
  }

  const quantity = parseInt(quantityStr, 10);
  if (isNaN(quantity) || quantity <= 0) {
    throw new Error('La cantidad debe ser un número mayor a 0.');
  }

  // Calculate actual DB difference
  let stockModifier = 0;
  if (type === 'IN') {
    stockModifier = quantity;
  } else if (type === 'OUT' || type === 'ADJUSTMENT') {
    // Both output and negative adjustment subtract from total stock usually.
    // Let's explicitly define that users input positive values and the type determines direction.
    stockModifier = -quantity;
  }

  const branch = await getActiveBranch();
  const user = await getActiveUser(branch.id); // Although not directly referenced in movement yet schema-wise

  await prisma.$transaction(async (tx) => {
    // 1. Update product stock
    const updatedProduct = await tx.product.update({
      where: { id: productId },
      data: {
        stock: {
          increment: stockModifier
        }
      }
    });

    if (updatedProduct.stock < 0) {
      throw new Error('El stock no puede ser negativo.');
    }

    // 2. Create Kardex entry
    await tx.inventoryMovement.create({
      data: {
        productId,
        type,
        quantity: stockModifier, // Save as positive/negative correctly based on flow
        reason: `${reason} (por ${user.name})`
      }
    });
  });

  revalidatePath(`/productos/${productId}`);
  revalidatePath('/productos');
}
