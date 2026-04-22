'use server';

import { prisma } from '@/lib/prisma';
import { getActiveBranch, getActiveUser } from './auth';
import { revalidatePath } from 'next/cache';

export async function addCustomerPaymentBatch(
  customerId: string, 
  totalAmount: number, 
  paymentMethod: string,
  salePayments: { id: string, amount: number }[] = [],
  requestCfdi: boolean = false,
  paymentDate?: string
) {
  try {
  const branch = await getActiveBranch();
  const user = await getActiveUser();
  
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) throw new Error("Customer not found.");
  
  if (totalAmount <= 0) throw new Error("Amount must be greater than zero.");
  
  let currentSession = null;
  if (paymentMethod === 'CASH') {
    currentSession = await prisma.cashSession.findFirst({
      where: { userId: user.id, branchId: branch.id, status: 'OPEN' }
    });
    if (!currentSession) throw new Error("Debes abrir una caja para recibir abonos en efectivo.");
  }

  if (paymentMethod === 'CASH' && currentSession) {
     await prisma.cashMovement.create({
        data: {
           sessionId: currentSession.id,
           type: 'IN',
           amount: totalAmount,
           reason: salePayments.length > 0 
              ? `Pago a Facturas Múltiples: ${customer.name}` 
              : `Depósito Saldo a Favor: ${customer.name}`
        }
     });
  }

  let remainingAmount = totalAmount;
  let totalEffectiveToDebt = 0;

  if (salePayments.length > 0) {
    const saleIds = salePayments.map(sp => sp.id);
    const sales = await prisma.sale.findMany({
       where: { id: { in: saleIds }, balanceDue: { gt: 0 } }
    });

    for (const paymentReq of salePayments) {
       const sale = sales.find(s => s.id === paymentReq.id);
       if (!sale || remainingAmount <= 0) continue;

       const deduct = Math.min(remainingAmount, paymentReq.amount, sale.balanceDue);
       if (deduct <= 0) continue;

       remainingAmount -= deduct;
       totalEffectiveToDebt += deduct;

       await prisma.sale.update({
          where: { id: sale.id },
          data: { balanceDue: sale.balanceDue - deduct }
       });

       await prisma.customerPayment.create({
          data: {
             customerId,
             amount: deduct,
             reason: `Abono a Ticket #${sale.id.slice(0,8)} (${paymentMethod})`,
             userId: user.id,
             branchId: branch.id,
             saleId: sale.id,
             paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
             cfdiStatus: requestCfdi ? "REQUESTED" : "NONE"
          }
       });
    }
  }

  if (remainingAmount > 0) {
      await prisma.customerPayment.create({
          data: {
             customerId,
             amount: remainingAmount,
             reason: `Depósito a Saldo a Favor (${paymentMethod})`,
             userId: user.id,
             branchId: branch.id,
             saleId: null,
             cfdiStatus: "NONE"
          }
       });
  }
  
  await prisma.customer.update({
     where: { id: customerId },
     data: { 
        creditBalance: { decrement: totalEffectiveToDebt },
        storeCredit: { increment: remainingAmount }
     }
  });

  revalidatePath('/clientes/cobranza');
  revalidatePath('/caja/actual');
  return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || String(err) };
  }
}

export async function deleteCustomerPayment(paymentId: string) {
  try {
  const branch = await getActiveBranch();
  const user = await getActiveUser();
  
  const payment = await prisma.customerPayment.findUnique({ where: { id: paymentId } });
  if (!payment) throw new Error("Payment not found");
  
  if (payment.cfdiStatus === 'INVOICED') {
      throw new Error("No se puede eliminar un abono que ya fue facturado (REP Timbrado). Cancela la factura primero.");
  }
  
  if (payment.saleId) {
      await prisma.sale.update({
          where: { id: payment.saleId },
          data: { balanceDue: { increment: payment.amount } }
      });
      
      await prisma.customer.update({
          where: { id: payment.customerId },
          data: { creditBalance: { increment: payment.amount } }
      });
  } else {
      await prisma.customer.update({
          where: { id: payment.customerId },
          data: { storeCredit: { decrement: payment.amount } }
      });
  }
  
  if (payment.reason.includes('CASH') || payment.reason.includes('Efectivo')) {
     const currentSession = await prisma.cashSession.findFirst({
        where: { userId: user.id, branchId: branch.id, status: 'OPEN' }
     });
     
     if (currentSession) {
         await prisma.cashMovement.create({
            data: {
               sessionId: currentSession.id,
               type: 'OUT',
               amount: payment.amount,
               reason: `Reversión de Abono: ${paymentId.slice(0,8)}`
            }
         });
     }
  }

  await prisma.customerPayment.delete({ where: { id: paymentId } });
  
  revalidatePath(`/clientes/${payment.customerId}`);
  return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || String(err) };
  }
}
