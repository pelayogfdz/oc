'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getActiveBranch, getActiveUser } from './auth';

export async function createPurchase(
  items: { productId: string; quantity: number; cost: number }[], 
  total: number,
  paymentMethod: string = 'CASH',
  supplierId: string | null = null,
  freightCost: number = 0
) {
  const branch = await getActiveBranch();
  if (branch.id === 'GLOBAL') throw new Error('Debes seleccionar una sucursal específica para realizar esta acción.');
  const user = await getActiveUser();
  
  if (items.length === 0) throw new Error("List is empty");

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

      dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + supplier.creditDays);
      balanceDue = total;

      // Incrementar la deuda con el proveedor
      await tx.supplier.update({
        where: { id: supplierId },
        data: { creditBalance: { increment: total } }
      });
    }

    const purchase = await tx.purchase.create({
      data: {
        total,
        paymentMethod,
        supplierId,
        freightCost,
        branchId: branch.id,
        userId: user.id,
        dueDate,
        balanceDue,
        items: {
          create: items.map(item => ({
            quantity: item.quantity,
            cost: item.cost,
            productId: item.productId
          }))
        }
      }
    });

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
          reason: `Compra #${purchase.id.slice(0, 8)}${freightProRata > 0 ? ' (+Flete P.)' : ''}`
        }
      });
    }
  });

  revalidatePath('/productos/compras');
  revalidatePath('/productos');
}
