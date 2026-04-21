'use server';

import { prisma } from '@/lib/prisma';
import { getActiveBranch, getActiveUser } from './auth';
import { revalidatePath } from 'next/cache';

export async function getCurrentSession() {
  const branch = await getActiveBranch();
  const session = await getActiveUser();
  if (!session) return null;

  return await prisma.cashSession.findFirst({
    where: {
      branchId: branch.id,
      userId: session.id,
      status: 'OPEN'
    },
    include: {
      movements: true,
      sales: true
    }
  });
}

export async function openSession(formData: FormData) {
  const branch = await getActiveBranch();
  if (branch.id === 'GLOBAL') throw new Error("Debes seleccionar una sucursal específica para abrir caja.");
  const session = await getActiveUser();
  if (!session) throw new Error("No autenticado");

  const initialAmount = parseFloat(formData.get('initialAmount') as string) || 0;

  const currentOpen = await prisma.cashSession.findFirst({
    where: { branchId: branch.id, userId: session.id, status: 'OPEN' }
  });

  if (currentOpen) throw new Error("Ya tienes una caja abierta");

  await prisma.cashSession.create({
    data: {
      branchId: branch.id,
      userId: session.id,
      initialAmount,
      status: 'OPEN'
    }
  });

  revalidatePath('/caja/actual');
  revalidatePath('/ventas/nueva');
}

export async function addMovement(formData: FormData) {
  const sessionId = formData.get('sessionId') as string;
  const type = formData.get('type') as string; // IN or OUT
  const amount = parseFloat(formData.get('amount') as string);
  const reason = formData.get('reason') as string;

  if (!sessionId || !amount || !reason || amount <= 0) {
    throw new Error("Datos inválidos para el movimiento");
  }

  await prisma.cashMovement.create({
    data: {
      sessionId,
      type,
      amount,
      reason
    }
  });

  revalidatePath('/caja/actual');
}

export async function closeSession(formData: FormData) {
  const sessionId = formData.get('sessionId') as string;
  const actualAmount = parseFloat(formData.get('actualAmount') as string);

  const sessionRecord = await prisma.cashSession.findUnique({
    where: { id: sessionId },
    include: { sales: true, movements: true }
  });

  if (!sessionRecord || sessionRecord.status === 'CLOSED') {
    throw new Error("La caja no está abierta");
  }

  // Calculate expected amount
  // Expected = Initial + Sum of Cash Sales + Sum of IN movements - Sum of OUT movements
  
  // En Pulpos POS, usualmente solo las ventas en EFECTIVO entran a la caja física
  const cashSales = sessionRecord.sales.filter(s => s.paymentMethod === 'CASH');
  const totalSalesCash = cashSales.reduce((acc, sale) => acc + sale.total, 0);

  const mixtoSales = sessionRecord.sales.filter(s => s.paymentMethod === 'MIXTO');
  const totalSalesMixtoCash = mixtoSales.reduce((acc, sale) => acc + (sale.cashAmount || 0), 0);

  const totalIn = sessionRecord.movements.filter(m => m.type === 'IN').reduce((acc, m) => acc + m.amount, 0);
  const totalOut = sessionRecord.movements.filter(m => m.type === 'OUT').reduce((acc, m) => acc + m.amount, 0);

  const expectedAmount = sessionRecord.initialAmount + totalSalesCash + totalSalesMixtoCash + totalIn - totalOut;
  const difference = actualAmount - expectedAmount;

  await prisma.cashSession.update({
    where: { id: sessionId },
    data: {
      status: 'CLOSED',
      closedAt: new Date(),
      expectedAmount,
      actualAmount,
      difference
    }
  });

  revalidatePath('/caja/actual');
  revalidatePath('/caja/cortes');
}
