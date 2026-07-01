'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getActiveBranch, getActiveUser } from './auth';

export async function createPurchase(
  items: { 
    productId: string; 
    quantity: number; 
    cost: number; 
    batchNumber?: string; 
    expirationDate?: string;
    pedimento?: string;
    pedimentoDate?: string;
    crePermitSupplier?: string;
    crePermitCarrier?: string;
    density?: number;
    temperature?: number;
    octane?: number;
    volume20c?: number;
    certNumber?: string;
  }[], 
  total: number,
  paymentMethod: string = 'CASH',
  supplierId: string | null = null,
  freightCost: number = 0,
  purchaseId?: string,
  supplierFolio?: string | null,
  purchaseOrderId?: string,
  creditDays?: number
) {
  try {
    const branch = await getActiveBranch();
    if (!branch || branch.id === 'GLOBAL') throw new Error('Debes seleccionar una sucursal específica para realizar esta acción.');
    const user = await getActiveUser();
    
    if (items.length === 0) throw new Error("La lista de artículos está vacía.");

    await prisma.$transaction(async (tx) => {
      let dueDate = null;
      let balanceDue = 0;

      // CxP (Cuentas por Pagar) Validation
      if (paymentMethod === 'CREDIT') {
        if (!supplierId) throw new Error("Se requiere un proveedor para compras a crédito.");
        
        const supplier = await tx.supplier.findUnique({ where: { id: supplierId } });
        if (!supplier) throw new Error("Proveedor no encontrado.");
        if (supplier.creditLimit <= 0) throw new Error("El proveedor no te ha otorgado límite de crédito en el sistema.");
        
        if ((supplier.creditBalance + total) > supplier.creditLimit) {
          throw new Error(`Excedes el límite de crédito con este proveedor. Límite disponible: $${(supplier.creditLimit - supplier.creditBalance).toFixed(2)}`);
        }

        const days = creditDays !== undefined && creditDays !== null ? creditDays : supplier.creditDays;
        dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + days);
        balanceDue = total;

        // Incrementar la deuda con el proveedor
        await tx.supplier.update({
          where: { id: supplierId },
          data: { creditBalance: { increment: total } }
        });
      }

      const { getNextFolio } = await import('./folios');
      const folio = await getNextFolio(branch.id, 'purchase', tx);

      const purchase = await tx.purchase.create({
        data: {
          id: purchaseId,
          folio,
          supplierFolio,
          total,
          paymentMethod,
          supplierId,
          freightCost,
          branchId: branch.id,
          userId: user.id,
          dueDate,
          balanceDue
        }
      });

      if (purchaseOrderId) {
        await tx.purchaseOrder.update({
          where: { id: purchaseOrderId },
          data: { status: 'RECEIVED' }
        });
      }

      // Calculate sum of total costs to prorate freight based on value
      const baseItemsValue = items.reduce((acc, item) => acc + (item.cost * item.quantity), 0);

      // Increment stock, Recalculate Average Cost & Register Kardex Movement
      for (const item of items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) continue;

        const itemTotalValue = item.cost * item.quantity;
        // Pro-rata freight by line total value compared to overall invoice items value
        const freightProRata = baseItemsValue > 0 ? (itemTotalValue / baseItemsValue) * freightCost : 0;
        // Effective Unit Cost is the original cost + the share of the freight per piece
        const effectiveUnitCost = item.quantity > 0 ? item.cost + (freightProRata / item.quantity) : item.cost;

        // Create Batch if applicable
        let batchId = null;
        if (item.batchNumber || item.expirationDate) {
          let expDate: Date | null = null;
          if (item.expirationDate) {
            const cleanDate = item.expirationDate.trim();
            if (cleanDate.includes('-')) {
              expDate = new Date(`${cleanDate}T12:00:00Z`);
            } else if (cleanDate.includes('/')) {
              const parts = cleanDate.split('/');
              if (parts.length === 3) {
                const [p1, p2, p3] = parts;
                if (p1.length === 4) {
                  // YYYY/MM/DD
                  expDate = new Date(`${p1}-${p2.padStart(2, '0')}-${p3.padStart(2, '0')}T12:00:00Z`);
                } else {
                  // DD/MM/YYYY
                  expDate = new Date(`${p3}-${p2.padStart(2, '0')}-${p1.padStart(2, '0')}T12:00:00Z`);
                }
              }
            } else {
              expDate = new Date(cleanDate);
            }
            if (expDate && isNaN(expDate.getTime())) {
              expDate = null;
            }
          }

          const batch = await tx.productBatch.create({
            data: {
              productId: item.productId,
              batchNumber: item.batchNumber || null,
              expirationDate: expDate,
              stock: item.quantity,
              cost: effectiveUnitCost
            }
          });
          batchId = batch.id;
        }

        // Create PurchaseItem
        const purchaseItem = await tx.purchaseItem.create({
          data: {
            purchaseId: purchase.id,
            productId: item.productId,
            quantity: item.quantity,
            cost: item.cost,
            batchId: batchId
          }
        });

        // Register FuelTraceability if fields are provided
        if (item.pedimento || item.density !== undefined || item.crePermitSupplier || item.certNumber) {
          let pedDate = null;
          if (item.pedimentoDate) {
            pedDate = new Date(item.pedimentoDate);
            if (isNaN(pedDate.getTime())) {
              pedDate = null;
            }
          }
          await tx.fuelTraceability.create({
            data: {
              productId: item.productId,
              purchaseItemId: purchaseItem.id,
              pedimento: item.pedimento || null,
              pedimentoDate: pedDate,
              crePermitSupplier: item.crePermitSupplier || null,
              crePermitCarrier: item.crePermitCarrier || null,
              density: item.density ? Number(item.density) : null,
              temperature: item.temperature ? Number(item.temperature) : null,
              octane: item.octane ? Number(item.octane) : null,
              volume20c: item.volume20c ? Number(item.volume20c) : null,
              certNumber: item.certNumber || null
            }
          });
        }

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
            cost: effectiveUnitCost // Update replacement cost (cost) incorporating freight
          }
        });
        
        await tx.inventoryMovement.create({
          data: {
            productId: item.productId,
            type: 'IN',
            quantity: item.quantity,
            reason: `Compra #${purchase.id.slice(0, 8)}${freightProRata > 0 ? ' (+Flete P.)' : ''}`,
            batchId: batchId,
            userId: user.id
          }
        });
      }
    });

    revalidatePath('/productos/compras');
    revalidatePath('/productos');
    return { success: true };
  } catch (error: any) {
    console.error("Error al crear compra:", error);
    return { success: false, error: error.message || "Error desconocido al registrar la compra." };
  }
}

export async function cancelPurchase(purchaseId: string) {
  const branch = await getActiveBranch();
  if (!branch || branch.id === 'GLOBAL') throw new Error('Debes seleccionar una sucursal específica para realizar esta acción.');
  const user = await getActiveUser();

  const purchase = await prisma.purchase.findUnique({
    where: { id: purchaseId },
    include: { items: true }
  });

  if (!purchase || purchase.status === 'CANCELLED') {
    throw new Error("Compra no encontrada o ya cancelada");
  }

  await prisma.$transaction(async (tx) => {
    // 1. Revert Supplier Credit if CREDIT
    if (purchase.paymentMethod === 'CREDIT' && purchase.supplierId) {
      await tx.supplier.update({
        where: { id: purchase.supplierId },
        data: { creditBalance: { decrement: purchase.total } }
      });
    }

    const baseItemsValue = purchase.items.reduce((acc, item) => acc + (item.cost * item.quantity), 0);

    for (const item of purchase.items) {
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product) continue;

      const itemTotalValue = item.cost * item.quantity;
      const freightProRata = baseItemsValue > 0 ? (itemTotalValue / baseItemsValue) * (purchase.freightCost || 0) : 0;
      const effectiveUnitCost = item.quantity > 0 ? item.cost + (freightProRata / item.quantity) : item.cost;

      // Revert batch stock if batch was created
      if (item.batchId) {
        await tx.productBatch.update({
          where: { id: item.batchId },
          data: { stock: { decrement: item.quantity } }
        });
      }

      // Recalculate Average Cost
      const currentStock = product.stock;
      const currentAverage = product.averageCost || 0;
      const totalValue = (currentStock * currentAverage) - (item.quantity * effectiveUnitCost);
      const newStock = currentStock - item.quantity;
      const newAverageCost = newStock > 0 ? totalValue / newStock : 0;

      await tx.product.update({
        where: { id: item.productId },
        data: {
          stock: { decrement: item.quantity },
          averageCost: newAverageCost
        }
      });

      // Register Kardex movement
      await tx.inventoryMovement.create({
        data: {
          productId: item.productId,
          type: 'OUT',
          quantity: -item.quantity,
          reason: `Cancelación Compra #${purchase.id.slice(0, 8)}`,
          batchId: item.batchId,
          userId: user.id
        }
      });
    }

    // Set status to CANCELLED
    await tx.purchase.update({
      where: { id: purchase.id },
      data: { status: 'CANCELLED' }
    });
  });

  revalidatePath('/productos/compras');
  revalidatePath('/productos');
}

export async function updatePurchase(
  purchaseId: string,
  items: { 
    productId: string; 
    quantity: number; 
    cost: number; 
    batchNumber?: string; 
    expirationDate?: string;
    pedimento?: string;
    pedimentoDate?: string;
    crePermitSupplier?: string;
    crePermitCarrier?: string;
    density?: number;
    temperature?: number;
    octane?: number;
    volume20c?: number;
    certNumber?: string;
  }[], 
  total: number,
  paymentMethod: string = 'CASH',
  supplierId: string | null = null,
  freightCost: number = 0,
  supplierFolio?: string | null
) {
  try {
    const branch = await getActiveBranch();
    if (!branch || branch.id === 'GLOBAL') throw new Error('Debes seleccionar una sucursal específica.');
    const user = await getActiveUser();

    const purchase = await prisma.purchase.findUnique({
      where: { id: purchaseId },
      include: { items: true }
    });

    if (!purchase) throw new Error("Compra no encontrada.");
    if (purchase.status === 'CANCELLED') throw new Error("No se puede editar una compra cancelada.");

    await prisma.$transaction(async (tx) => {
      // --- 1. REVERT OLD EFFECTS ---
      
      // Revert old supplier balance
      if (purchase.paymentMethod === 'CREDIT' && purchase.supplierId) {
        await tx.supplier.update({
          where: { id: purchase.supplierId },
          data: { creditBalance: { decrement: purchase.total } }
        });
      }

      const oldBaseItemsValue = purchase.items.reduce((acc, item) => acc + (item.cost * item.quantity), 0);

      for (const oldItem of purchase.items) {
        const product = await tx.product.findUnique({ where: { id: oldItem.productId } });
        if (product) {
          const oldItemTotalValue = oldItem.cost * oldItem.quantity;
          const oldFreightProRata = oldBaseItemsValue > 0 ? (oldItemTotalValue / oldBaseItemsValue) * (purchase.freightCost || 0) : 0;
          const oldEffectiveUnitCost = oldItem.quantity > 0 ? oldItem.cost + (oldFreightProRata / oldItem.quantity) : oldItem.cost;

          if (oldItem.batchId) {
            await tx.productBatch.update({
              where: { id: oldItem.batchId },
              data: { stock: { decrement: oldItem.quantity } }
            });
          }

          // Revert average cost
          const currentStock = product.stock;
          const currentAverage = product.averageCost || 0;
          const revertedValue = (currentStock * currentAverage) - (oldItem.quantity * oldEffectiveUnitCost);
          const revertedStock = currentStock - oldItem.quantity;
          const revertedAverage = revertedStock > 0 ? revertedValue / revertedStock : 0;

          await tx.product.update({
            where: { id: oldItem.productId },
            data: {
              stock: { decrement: oldItem.quantity },
              averageCost: revertedAverage
            }
          });

          // Delete old inventory movements
          await tx.inventoryMovement.deleteMany({
            where: {
              productId: oldItem.productId,
              reason: { startsWith: `Compra #${purchase.id.slice(0, 8)}` }
            }
          });
        }
      }

      // Delete old items and fuel traceabilities
      await tx.purchaseItem.deleteMany({
        where: { purchaseId: purchaseId }
      });

      // --- 2. APPLY NEW EFFECTS ---

      let dueDate = null;
      let balanceDue = 0;

      if (paymentMethod === 'CREDIT') {
        if (!supplierId) throw new Error("Se requiere un proveedor para compras a crédito.");
        const supplier = await tx.supplier.findUnique({ where: { id: supplierId } });
        if (!supplier) throw new Error("Proveedor no encontrado.");

        dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + supplier.creditDays);
        balanceDue = total;

        // Increment new supplier balance
        await tx.supplier.update({
          where: { id: supplierId },
          data: { creditBalance: { increment: total } }
        });
      }

      // Update Purchase record
      await tx.purchase.update({
        where: { id: purchaseId },
        data: {
          total,
          paymentMethod,
          supplierId,
          freightCost,
          dueDate,
          balanceDue,
          supplierFolio
        }
      });

      const newBaseItemsValue = items.reduce((acc, item) => acc + (item.cost * item.quantity), 0);

      for (const item of items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) continue;

        const itemTotalValue = item.cost * item.quantity;
        const freightProRata = newBaseItemsValue > 0 ? (itemTotalValue / newBaseItemsValue) * freightCost : 0;
        const effectiveUnitCost = item.quantity > 0 ? item.cost + (freightProRata / item.quantity) : item.cost;

        let batchId = null;
        if (item.batchNumber || item.expirationDate) {
          let expDate: Date | null = null;
          if (item.expirationDate) {
            const cleanDate = item.expirationDate.trim();
            if (cleanDate.includes('-')) {
              expDate = new Date(`${cleanDate}T12:00:00Z`);
            } else if (cleanDate.includes('/')) {
              const parts = cleanDate.split('/');
              if (parts.length === 3) {
                const [p1, p2, p3] = parts;
                if (p1.length === 4) {
                  expDate = new Date(`${p1}-${p2.padStart(2, '0')}-${p3.padStart(2, '0')}T12:00:00Z`);
                } else {
                  expDate = new Date(`${p3}-${p2.padStart(2, '0')}-${p1.padStart(2, '0')}T12:00:00Z`);
                }
              }
            } else {
              expDate = new Date(cleanDate);
            }
            if (expDate && isNaN(expDate.getTime())) expDate = null;
          }

          const batch = await tx.productBatch.create({
            data: {
              productId: item.productId,
              batchNumber: item.batchNumber || null,
              expirationDate: expDate,
              stock: item.quantity,
              cost: effectiveUnitCost
            }
          });
          batchId = batch.id;
        }

        const purchaseItem = await tx.purchaseItem.create({
          data: {
            purchaseId: purchaseId,
            productId: item.productId,
            quantity: item.quantity,
            cost: item.cost,
            batchId: batchId
          }
        });

        if (item.pedimento || item.density !== undefined || item.crePermitSupplier || item.certNumber) {
          let pedDate = null;
          if (item.pedimentoDate) {
            pedDate = new Date(item.pedimentoDate);
            if (isNaN(pedDate.getTime())) pedDate = null;
          }
          await tx.fuelTraceability.create({
            data: {
              productId: item.productId,
              purchaseItemId: purchaseItem.id,
              pedimento: item.pedimento || null,
              pedimentoDate: pedDate,
              crePermitSupplier: item.crePermitSupplier || null,
              crePermitCarrier: item.crePermitCarrier || null,
              density: item.density ? Number(item.density) : null,
              temperature: item.temperature ? Number(item.temperature) : null,
              octane: item.octane ? Number(item.octane) : null,
              volume20c: item.volume20c ? Number(item.volume20c) : null,
              certNumber: item.certNumber || null
            }
          });
        }

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
            reason: `Compra #${purchase.id.slice(0, 8)} (Editada)${freightProRata > 0 ? ' (+Flete P.)' : ''}`,
            batchId: batchId,
            userId: user.id
          }
        });
      }
    });

    revalidatePath('/productos/compras');
    revalidatePath(`/productos/compras/${purchaseId}`);
    revalidatePath('/productos');
    return { success: true };
  } catch (error: any) {
    console.error("Error al actualizar compra:", error);
    return { success: false, error: error.message || "Error desconocido al actualizar la compra." };
  }
}

