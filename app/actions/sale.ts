'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getActiveBranch, getActiveUser } from './auth';

export async function createSale(
  items: { productId: string; variantId?: string | null; quantity: number; price: number }[], 
  total: number,
  paymentMethod: string = 'CASH',
  customerId: string | null = null,
  cashSessionId?: string,
  notes?: string,
  cashAmount?: number,
  cardAmount?: number
) {
  const branch = await getActiveBranch();
  const user = await getActiveUser(branch.id);
  
  if (items.length === 0) throw new Error("Ticket is empty");

  const sale = await prisma.sale.create({
    data: {
      total,
      paymentMethod,
      customerId,
      cashSessionId,
      notes,
      cashAmount,
      cardAmount,
      branchId: branch.id,
      userId: user.id,
      items: {
        create: items.map(item => ({
          quantity: item.quantity,
          price: item.price,
          productId: item.productId,
          variantId: item.variantId || null
        }))
      }
    }
  });

  // Deduct stock & Register Kardex Movement
  for (const item of items) {
    await prisma.product.update({
      where: { id: item.productId },
      data: { stock: { decrement: item.quantity } }
    });
    
    if (item.variantId) {
      await prisma.productVariant.update({
        where: { id: item.variantId },
        data: { stock: { decrement: item.quantity } }
      });
    }
    
    await prisma.inventoryMovement.create({
      data: {
        productId: item.productId,
        variantId: item.variantId || null,
        type: 'OUT',
        quantity: -item.quantity,
        reason: `Venta #${sale.id.slice(0, 8)}`
      }
    });
  }

  revalidatePath('/ventas');
  revalidatePath('/productos');
  return sale;
}

export async function refundSale(formData: FormData) {
  const saleId = formData.get('saleId') as string;
  
  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: { items: true, cashSession: true }
  });

  if (!sale || sale.status === 'REFUNDED') throw new Error("Venta no encontrada o ya devuelta");

  // Re-stock items
  for (const item of sale.items) {
    await prisma.product.update({
      where: { id: item.productId },
      data: { stock: { increment: item.quantity } }
    });
    
    await prisma.inventoryMovement.create({
      data: {
        productId: item.productId,
        type: 'IN',
        quantity: item.quantity,
        reason: `Devolución de Venta #${sale.id.slice(0, 8)}`
      }
    });
  }

  // Handle cash logic if paid in cash
  if (sale.paymentMethod === 'CASH' && sale.cashSessionId) {
    // Check if session is still open
    const targetSession = await prisma.cashSession.findUnique({ where: { id: sale.cashSessionId } });
    if (targetSession && targetSession.status === 'OPEN') {
      await prisma.cashMovement.create({
         data: {
           sessionId: targetSession.id,
           type: 'OUT',
           amount: sale.total,
           reason: `Reembolso Físico Venta #${sale.id.slice(0, 8)}`
         }
      });
    }
  } else if (sale.paymentMethod === 'MIXTO' && sale.cashSessionId && sale.cashAmount) {
     const targetSession = await prisma.cashSession.findUnique({ where: { id: sale.cashSessionId } });
     if (targetSession && targetSession.status === 'OPEN') {
        await prisma.cashMovement.create({
           data: {
             sessionId: targetSession.id,
             type: 'OUT',
             amount: sale.cashAmount,
             reason: `Reembolso Físico Parcial de Venta Mixta #${sale.id.slice(0, 8)}`
           }
        });
     }
  }

  await prisma.sale.update({
    where: { id: sale.id },
    data: { status: 'REFUNDED' }
  });

  revalidatePath('/ventas/devoluciones');
  revalidatePath('/ventas');
  revalidatePath('/productos');
}
