'use server';

import { prisma } from '@/lib/prisma';
import { getActiveBranch, getActiveUser } from './auth';
import { revalidatePath } from 'next/cache';

export async function addCustomerPayment(customerId: string, amount: number, paymentMethod: string) {
  const branch = await getActiveBranch();
  const user = await getActiveUser(branch.id);
  
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) throw new Error("Customer not found.");
  
  if (amount <= 0) throw new Error("Amount must be greater than zero.");
  
  // Make sure we have an open session before we can take cash
  let currentSession = null;
  if (paymentMethod === 'CASH') {
    currentSession = await prisma.cashSession.findFirst({
      where: { userId: user.id, branchId: branch.id, status: 'OPEN' }
    });
    if (!currentSession) throw new Error("Debes abrir una caja para recibir abonos en efectivo.");
  }
  
  // Create payment record
  await prisma.customerPayment.create({
     data: {
        customerId,
        amount,
        reason: `Abono (${paymentMethod})`,
        userId: user.id,
        branchId: branch.id
     }
  });
  
  // Decrease credit balance
  await prisma.customer.update({
     where: { id: customerId },
     data: { creditBalance: { decrement: amount } }
  });
  
  // Create cash movement if CASH
  if (paymentMethod === 'CASH' && currentSession) {
     await prisma.cashMovement.create({
        data: {
           sessionId: currentSession.id,
           type: 'IN',
           amount,
           reason: `Abono Crédito: ${customer.name}`
        }
     });
  }

  revalidatePath('/clientes/cobranza');
  revalidatePath('/caja/actual');
}
