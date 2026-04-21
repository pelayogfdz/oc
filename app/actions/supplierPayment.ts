'use server';

import { prisma } from '@/lib/prisma';
import { getActiveBranch, getActiveUser } from './auth';
import { revalidatePath } from 'next/cache';

export async function addSupplierPaymentBatch(
  supplierId: string, 
  totalAmount: number, 
  paymentMethod: string,
  purchaseIds: string[] = [],
  requestCfdi: boolean = false
) {
  const branch = await getActiveBranch();
  const user = await getActiveUser();
  
  const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
  if (!supplier) throw new Error("Supplier not found.");
  
  if (totalAmount <= 0) throw new Error("Amount must be greater than zero.");
  
  // Make sure we have an open session before we can take cash
  let currentSession = null;
  if (paymentMethod === 'CASH') {
    currentSession = await prisma.cashSession.findFirst({
      where: { userId: user.id, branchId: branch.id, status: 'OPEN' }
    });
    if (!currentSession) throw new Error("Debes abrir una caja para hacer retiros de pago en efectivo.");
  }

  // Create cash movement if CASH (Single movement for the entire transaction)
  if (paymentMethod === 'CASH' && currentSession) {
     await prisma.cashMovement.create({
        data: {
           sessionId: currentSession.id,
           type: 'OUT',
           amount: totalAmount,
           reason: purchaseIds.length > 0 
              ? `Pago a Proveedor MúltIPLE: ${supplier.name}` 
              : `Abono/Anticipo Proveedor: ${supplier.name}`
        }
     });
  }

  let remainingAmount = totalAmount;
  let totalEffectiveToDebt = 0;

  if (purchaseIds.length > 0) {
    const purchases = await prisma.purchase.findMany({
       where: { id: { in: purchaseIds }, balanceDue: { gt: 0 } },
       orderBy: { createdAt: 'asc' } // Oldest first
    });

    for (const purchase of purchases) {
       if (remainingAmount <= 0) break;

       const deduct = Math.min(remainingAmount, purchase.balanceDue);
       remainingAmount -= deduct;
       totalEffectiveToDebt += deduct;

       // Update Individual Purchase
       await prisma.purchase.update({
          where: { id: purchase.id },
          data: { balanceDue: purchase.balanceDue - deduct }
       });

       // Create Specific Payment Record
       await prisma.supplierPayment.create({
          data: {
             supplierId,
             amount: deduct,
             reason: `Abono a Factura de Compra #${purchase.id.slice(0,8)} (${paymentMethod})`,
             userId: user.id,
             branchId: branch.id,
             purchaseId: purchase.id,
             cfdiStatus: requestCfdi ? "REQUESTED" : "NONE"
          }
       });
    }
  }

  // If there's excess (or if purchaseIds was empty, meaning 100% storeCredit)
  if (remainingAmount > 0) {
      await prisma.supplierPayment.create({
          data: {
             supplierId,
             amount: remainingAmount,
             reason: `Anticipo/Saldo a Favor con Proveedor (${paymentMethod})`,
             userId: user.id,
             branchId: branch.id,
             purchaseId: null,
             cfdiStatus: "NONE"
          }
       });
  }
  
  // Decrease credit balance structurally
  await prisma.supplier.update({
     where: { id: supplierId },
     data: { 
        creditBalance: { decrement: totalEffectiveToDebt },
        storeCredit: { increment: remainingAmount }
     }
  });

  revalidatePath('/proveedores/cuentas');
  revalidatePath('/caja/actual');
}
