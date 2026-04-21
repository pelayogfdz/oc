'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getActiveBranch, getActiveUser } from './auth';

export async function createSaleReturn(
  saleId: string,
  returnedItems: { saleItemId: string; productId: string; quantity: number; refundPrice: number }[],
  refundMethod: string, // CASH, CARD, STORE_CREDIT
  reason: string,
  satCreditNote?: string
) {
  const branch = await getActiveBranch();
  if (!branch) throw new Error("No branch active");
  if (branch.id === 'GLOBAL') throw new Error("Debes seleccionar una sucursal específica para realizar esta acción.");

  const user = await getActiveUser();

  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: { customer: true }
  });

  if (!sale) throw new Error("Sale not found");

  const totalRefund = returnedItems.reduce((sum, item) => sum + (item.quantity * item.refundPrice), 0);

  // 1. Create SaleReturn Document
  const saleReturn = await prisma.saleReturn.create({
    data: {
      saleId,
      userId: user.id,
      branchId: branch.id,
      totalRefund,
      refundMethod,
      reason,
      satCreditNote: satCreditNote || null,
      items: {
        create: returnedItems.map(item => ({
          saleItemId: item.saleItemId,
          quantity: item.quantity,
          refundPrice: item.refundPrice
        }))
      }
    }
  });

  // 2. Adjust Stock Details and Register Movements
  for (const item of returnedItems) {
    if (item.quantity > 0) {
      // Put stock back
      await prisma.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } }
      });

      // Register Movement
      await prisma.inventoryMovement.create({
        data: {
          productId: item.productId,
          type: 'IN',
          quantity: item.quantity,
          reason: `Devolución de Venta: ${saleId}`,
          userId: user.id
        }
      });
    }
  }

  // 3. Handle Restitution
  if (refundMethod === 'STORE_CREDIT' && sale.customerId) {
    // Add to Store Credit (Saldo a favor)
    await prisma.customer.update({
      where: { id: sale.customerId },
      data: { storeCredit: { increment: totalRefund } }
    });
  } else if (refundMethod === 'CASH') {
    // If we have an active cash register, log it as an out movement
    // Actually, we'd log an expense or deduct from cashSession. 
    // Just leave it as external for now, maybe print it in a ticket.
  }

  revalidatePath('/ventas/devoluciones');
  revalidatePath('/ventas');
  revalidatePath('/clientes');

  return { success: true, saleReturnId: saleReturn.id };
}
