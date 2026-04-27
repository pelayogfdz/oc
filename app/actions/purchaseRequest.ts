'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getActiveBranch, getActiveUser } from './auth';

export async function createPurchaseRequests(items: { productId?: string; preProductName?: string; quantity: number }[]) {
  const branch = await getActiveBranch();
  if (branch.id === 'GLOBAL') throw new Error('Selecciona una sucursal para crear solicitudes.');
  
  const user = await getActiveUser();

  if (!items || items.length === 0) {
    throw new Error('Debes incluir al menos un artículo en la solicitud.');
  }

  await prisma.$transaction(
    items.map(item => 
      prisma.purchaseRequest.create({
        data: {
          branchId: branch.id,
          requestedById: user.id,
          productId: item.productId || null,
          preProductName: item.preProductName || null,
          quantity: item.quantity,
          status: 'PENDING'
        }
      })
    )
  );

  revalidatePath('/productos/solicitudes');
}

export async function markRequestsAsOrdered(requestIds: string[]) {
  await prisma.purchaseRequest.updateMany({
    where: { id: { in: requestIds } },
    data: { status: 'ORDERED' }
  });
  
  revalidatePath('/productos/solicitudes');
  revalidatePath('/productos/pedidos');
}

export async function deletePurchaseRequest(id: string) {
  await prisma.purchaseRequest.delete({
    where: { id }
  });
  revalidatePath('/productos/solicitudes');
}
