'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getActiveBranch, getActiveUser } from './auth';

export async function createPurchaseOrder(
  supplierId: string | null,
  notes: string | null,
  items: { productId: string; quantity: number; cost: number }[],
  total: number
) {
  const branch = await getActiveBranch();
  if (branch.id === 'GLOBAL') throw new Error('Debes seleccionar una sucursal específica para realizar esta acción.');
  const user = await getActiveUser();
  
  if (items.length === 0) throw new Error("List is empty");

  await prisma.purchaseOrder.create({
    data: {
      total,
      supplierId,
      notes,
      branchId: branch.id,
      userId: user.id,
      status: 'PENDING',
      items: {
        create: items.map(item => ({
          quantity: item.quantity,
          cost: item.cost,
          productId: item.productId
        }))
      }
    }
  });

  revalidatePath('/productos/pedidos');
}

export async function receivePurchaseOrder(orderId: string, freightCost: number = 0) {
  const branch = await getActiveBranch();
  
  // Get PO
  const order = await prisma.purchaseOrder.findUnique({
    where: { id: orderId },
    include: { items: true }
  });

  if (!order || order.status !== 'PENDING') {
    throw new Error('Pedido no encontrado o ya procesado');
  }

  // Import existing purchase logic inside transaction ideally, but we'll inline it to safely combine with order update
  await prisma.$transaction(async (tx) => {
    // 1. Mark Order as RECEIVED
    await tx.purchaseOrder.update({
      where: { id: orderId },
      data: { status: 'RECEIVED' }
    });

    // 2. Create the Purchase record
    const purchase = await tx.purchase.create({
      data: {
        total: order.total,
        paymentMethod: 'TRANSFER', // Just logic default
        supplierId: order.supplierId,
        freightCost,
        branchId: order.branchId,
        userId: order.userId,
        items: {
          create: order.items.map(item => ({
            quantity: item.quantity,
            cost: item.cost,
            productId: item.productId
          }))
        }
      }
    });

    const baseItemsValue = order.items.reduce((acc, item) => acc + (item.cost * item.quantity), 0);

    for (const item of order.items) {
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product) continue;

      const itemTotalValue = item.cost * item.quantity;
      const freightProRata = baseItemsValue > 0 ? (itemTotalValue / baseItemsValue) * freightCost : 0;
      const effectiveUnitCost = item.quantity > 0 ? item.cost + (freightProRata / item.quantity) : item.cost;

      const currentStock = product.stock > 0 ? product.stock : 0;
      const currentAverage = product.averageCost || 0;
      
      const totalValue = (currentStock * currentAverage) + (item.quantity * effectiveUnitCost);
      const newStock = currentStock + item.quantity;
      const newAverageCost = newStock > 0 ? totalValue / newStock : 0;

      await tx.product.update({
        where: { id: item.productId },
        data: { 
          stock: { increment: item.quantity },
          averageCost: newAverageCost,
          cost: effectiveUnitCost
        }
      });
      
      await tx.inventoryMovement.create({
        data: {
          productId: item.productId,
          type: 'IN',
          quantity: item.quantity,
          reason: `Ingreso - Pedido #${order.id.slice(0, 8)}${freightProRata > 0 ? ' (+Flete P.)' : ''}`
        }
      });
    }
  });

  revalidatePath('/productos/pedidos');
  revalidatePath('/productos/compras');
  revalidatePath('/productos');
}

export async function deletePurchaseOrder(orderId: string) {
  // Solo borrar si esta pendiente
  await prisma.purchaseOrder.deleteMany({
    where: { id: orderId, status: 'PENDING' }
  });
  revalidatePath('/productos/pedidos');
}
