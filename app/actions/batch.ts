'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function createBatch(formData: FormData) {
  const productId = formData.get('productId') as string;
  const batchNumber = formData.get('batchNumber') as string;
  const expirationDateStr = formData.get('expirationDate') as string;
  const stock = parseInt(formData.get('stock') as string, 10) || 0;
  
  if (!productId || !batchNumber || !expirationDateStr) return;

  const product = await prisma.product.findUnique({
    where: { id: productId }
  });

  const batch = await prisma.productBatch.create({
    data: {
      productId,
      batchNumber,
      expirationDate: new Date(expirationDateStr),
      stock,
      cost: product?.cost || 0
    }
  });

  if (stock > 0) {
    await prisma.inventoryMovement.create({
      data: {
        productId,
        batchId: batch.id,
        type: 'IN',
        quantity: stock,
        reason: 'Stock Inicial (Lote)',
      }
    });
  }

  revalidatePath(`/productos/${productId}`);
}

export async function deleteBatch(formData: FormData) {
  const batchId = formData.get('batchId') as string;
  const productId = formData.get('productId') as string;

  if (!batchId) return;

  await prisma.productBatch.delete({
    where: { id: batchId }
  });

  if (productId) {
    revalidatePath(`/productos/${productId}`);
  }
}
