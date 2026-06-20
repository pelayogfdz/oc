'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getActiveBranch, getActiveUser } from './auth';

export async function createConsignment(
  items: { productId: string; variantId?: string | null; quantity: number; price: number }[], 
  total: number,
  paymentMethod: string = 'CASH',
  customerId: string | null = null
) {
  const branch = await getActiveBranch();
  if (!branch) throw new Error("No hay sucursal activa.");
  if (branch.id === 'GLOBAL') throw new Error("Debes seleccionar una sucursal específica para realizar esta acción.");
  const user = await getActiveUser();
  
  if (items.length === 0) throw new Error("Consignment is empty");

  if (customerId) {
    const customerCheck = await prisma.customer.findUnique({ where: { id: customerId } });
    if (customerCheck?.isBlocked) {
      throw new Error("OPERACIÓN RECHAZADA: Este cliente está bloqueado por administración y no puede realizar consignaciones.");
    }
  }

  const { getNextFolio } = await import('./folios');
  const folio = await getNextFolio(branch.id, 'consignment');

  // Create Consignment record (Status: ACTIVE as inventory is deducted immediately)
  const consignment = await prisma.consignment.create({
    data: {
      folio,
      total,
      paymentMethod,
      customerId,
      branchId: branch.id,
      userId: user.id,
      status: "ACTIVE",
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

  // Deduct inventory & Register Kardex movements
  for (const item of items) {
    // 1. Deduct Product stock
    await prisma.product.update({
      where: { id: item.productId },
      data: { stock: { decrement: item.quantity } }
    });
    
    // 2. Deduct Variant stock if applicable
    if (item.variantId) {
      await prisma.productVariant.update({
        where: { id: item.variantId },
        data: { stock: { decrement: item.quantity } }
      });
    }
    
    // 3. FEFO Batch Deduction
    let remainingToDeduct = item.quantity;
    const availableBatches = await prisma.productBatch.findMany({
      where: { productId: item.productId, stock: { gt: 0 } },
      orderBy: { expirationDate: 'asc' } // oldest expires first
    });

    for (const batch of availableBatches) {
      if (remainingToDeduct <= 0) break;
      const deductAmount = Math.min(batch.stock, remainingToDeduct);
      
      await prisma.productBatch.update({
        where: { id: batch.id },
        data: { stock: { decrement: deductAmount } }
      });
      
      await prisma.inventoryMovement.create({
        data: {
          productId: item.productId,
          variantId: item.variantId || null,
          batchId: batch.id,
          type: 'OUT',
          quantity: -deductAmount,
          reason: `Consignación #${consignment.id.slice(0, 8)} (FEFO Lote)`,
          userId: user.id
        }
      });
      
      remainingToDeduct -= deductAmount;
    }

    // 4. Register movement if sold without batches or remaining qty
    if (remainingToDeduct > 0) {
      await prisma.inventoryMovement.create({
        data: {
          productId: item.productId,
          variantId: item.variantId || null,
          type: 'OUT',
          quantity: -remainingToDeduct,
          reason: `Consignación #${consignment.id.slice(0, 8)} (Sin Lote)`,
          userId: user.id
        }
      });
    }
  }

  revalidatePath('/ventas/consignaciones');
  revalidatePath('/productos');
  return consignment;
}

export async function getConsignmentForPOS(consignmentId: string) {
  const consignment = await prisma.consignment.findUnique({
    where: { id: consignmentId },
    include: { 
      items: {
        include: { 
          product: true,
          variant: true
        }
      } 
    }
  });
  
  if (!consignment) throw new Error("Consignación no encontrada.");
  if (consignment.status === "CONVERTED") throw new Error("Esta consignación ya fue facturada/convertida a venta.");
  
  return consignment;
}
