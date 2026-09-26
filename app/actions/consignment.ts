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

  const productIds = items.map(i => i.productId);
  const dbProducts = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, sku: true, cost: true }
  });
  const productMap = new Map(dbProducts.map(p => [p.id, p]));

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
        create: items.map(item => {
          const prod = productMap.get(item.productId);
          const resolvedCost = (item as any).cost !== undefined && (item as any).cost !== null && (item as any).cost > 0
            ? (item as any).cost
            : (prod?.cost ?? 0);
          return {
            quantity: item.quantity,
            price: item.price,
            cost: resolvedCost,
            productId: item.productId,
            variantId: item.variantId || null,
            productName: (item as any).productName || prod?.name || 'Producto',
            productSku: (item as any).productSku || prod?.sku || null
          };
        })
      }
    }
  });

  // Deduct inventory & Register Kardex movements
  for (const item of items) {
    const prod = productMap.get(item.productId);
    const resolvedCost = (item as any).cost !== undefined && (item as any).cost !== null && (item as any).cost > 0
      ? (item as any).cost
      : (prod?.cost ?? 0);

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
      orderBy: { expirationDate: 'asc' }
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
          cost: batch.cost || resolvedCost,
          reason: `Consignación #${consignment.folio || consignment.id.slice(0, 8)} (FEFO Lote)`,
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
          cost: resolvedCost,
          reason: `Consignación #${consignment.folio || consignment.id.slice(0, 8)}`,
          userId: user.id
        }
      });
    }
  }

  const updatedStocks = await prisma.product.findMany({
    where: { id: { in: items.map(i => i.productId) } },
    select: {
      id: true,
      stock: true,
      variants: {
        select: { id: true, stock: true }
      }
    }
  });

  revalidatePath('/ventas/consignaciones');
  revalidatePath('/ventas/nueva');
  revalidatePath('/productos');
  return { ...consignment, updatedStocks };
}


export async function getConsignmentForPOS(consignmentId: string) {
  const consignment = await prisma.consignment.findUnique({
    where: { id: consignmentId },
    include: { 
      items: {
        include: { 
          product: {
            include: {
              prices: true
            }
          },
          variant: true
        }
      } 
    }
  });
  
  if (!consignment) throw new Error("Consignación no encontrada.");
  if (consignment.status === "CONVERTED") throw new Error("Esta consignación ya fue facturada/convertida a venta.");
  
  return consignment;
}
