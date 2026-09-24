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

  // Resolve targetBranchId if active branch is GLOBAL to prevent foreign key constraint violation
  let targetBranchId: string | null = branch.id;
  if (targetBranchId === 'GLOBAL') {
    if (purchaseIds.length > 0) {
      const firstPurchase = await prisma.purchase.findFirst({
        where: { id: { in: purchaseIds } },
        select: { branchId: true }
      });
      if (firstPurchase) {
        targetBranchId = firstPurchase.branchId;
      }
    }

    if (targetBranchId === 'GLOBAL') {
      const realBranch = await prisma.branch.findFirst({
        where: { tenantId: branch.tenantId, isActive: true },
        select: { id: true }
      });
      if (realBranch) {
        targetBranchId = realBranch.id;
      } else {
        throw new Error("No se encontró una sucursal activa para registrar el pago.");
      }
    }
  }
  
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
       where: { 
         id: { in: purchaseIds }, 
         balanceDue: { gt: 0 },
         status: { not: 'CANCELLED' }
       },
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
             branchId: targetBranchId,
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
             branchId: targetBranchId,
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

  revalidatePath('/reportes/cuentas-por-pagar');
  revalidatePath('/proveedores/cuentas');
  revalidatePath('/caja/actual');
  return { success: true };
}

export async function deleteSupplierPayment(paymentId: string) {
  try {
    const branch = await getActiveBranch();
    const user = await getActiveUser();

    const payment = await prisma.supplierPayment.findUnique({
      where: { id: paymentId },
      include: { purchase: true, supplier: true }
    });

    if (!payment) throw new Error("Abono no encontrado.");

    if (payment.cfdiStatus === 'INVOICED') {
      throw new Error("No se puede eliminar un abono que ya tiene CFDI timbrado.");
    }

    // 1. Revert Purchase balanceDue if associated with a purchase
    if (payment.purchaseId && payment.purchase) {
      const newBalanceDue = Math.min(payment.purchase.total, payment.purchase.balanceDue + payment.amount);
      await prisma.purchase.update({
        where: { id: payment.purchaseId },
        data: { balanceDue: newBalanceDue }
      });

      await prisma.supplier.update({
        where: { id: payment.supplierId },
        data: { creditBalance: { increment: payment.amount } }
      });
    } else {
      // It was excess / storeCredit
      await prisma.supplier.update({
        where: { id: payment.supplierId },
        data: { storeCredit: { decrement: payment.amount } }
      });
    }

    // 2. Revert cash movement if it was CASH
    if (payment.reason?.includes('CASH') || payment.reason?.includes('Efectivo')) {
      const targetBranchId = (payment.branchId && payment.branchId !== 'GLOBAL') ? payment.branchId : branch.id;
      const sessionQuery: any = { userId: user.id, status: 'OPEN' };
      if (targetBranchId !== 'GLOBAL') {
        sessionQuery.branchId = targetBranchId;
      }
      const currentSession = await prisma.cashSession.findFirst({
        where: sessionQuery
      });

      if (currentSession) {
        await prisma.cashMovement.create({
          data: {
            sessionId: currentSession.id,
            type: 'IN',
            amount: payment.amount,
            reason: `Reversión de Abono a Proveedor: #${paymentId.slice(0, 8)}`
          }
        });
      }
    }

    // 3. Delete the supplier payment record
    await prisma.supplierPayment.delete({
      where: { id: paymentId }
    });

    revalidatePath('/reportes/cuentas-por-pagar');
    revalidatePath('/proveedores/cuentas');
    return { success: true };
  } catch (err: any) {
    console.error("Error al eliminar abono a proveedor:", err);
    return { success: false, error: err.message || String(err) };
  }
}
