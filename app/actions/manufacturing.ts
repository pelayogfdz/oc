'use server';

import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { decrypt } from '@/lib/session';

export async function createProcess(data: { name: string; order: number }) {
  const sessionCookie = (await cookies()).get('session')?.value;
  const session = await decrypt(sessionCookie);
  if (!session?.userId) throw new Error('Unauthorized');

  const user = await prisma.user.findUnique({ where: { id: session.userId as string } });
  if (!user?.tenantId) throw new Error('No tenant');

  return prisma.manufacturingProcess.create({
    data: {
      name: data.name,
      order: data.order,
      tenantId: user.tenantId
    }
  });
}

export async function updateProcess(id: string, data: { name: string }) {
  return prisma.manufacturingProcess.update({
    where: { id },
    data: { name: data.name }
  });
}

export async function deleteProcess(id: string) {
  return prisma.manufacturingProcess.delete({
    where: { id }
  });
}

export async function createRecipe(data: { name: string; productId: string; instructions: string; ingredients: { productId: string; quantity: number }[] }) {
  const sessionCookie = (await cookies()).get('session')?.value;
  const session = await decrypt(sessionCookie);
  if (!session?.userId) throw new Error('Unauthorized');

  const user = await prisma.user.findUnique({ where: { id: session.userId as string } });
  if (!user?.tenantId) throw new Error('No tenant');

  return prisma.recipe.create({
    data: {
      name: data.name,
      productId: data.productId,
      instructions: data.instructions,
      tenantId: user.tenantId,
      ingredients: {
        create: data.ingredients.map(ing => ({
          productId: ing.productId,
          quantity: ing.quantity
        }))
      }
    }
  });
}

export async function deleteRecipe(id: string) {
  return prisma.recipe.delete({
    where: { id }
  });
}
export async function createProductionOrder(recipeId: string, targetQuantity: number) {
  const sessionCookie = (await cookies()).get('session')?.value;
  const session = await decrypt(sessionCookie);
  if (!session?.userId) throw new Error('Unauthorized');

  const user = await prisma.user.findUnique({ where: { id: session.userId as string } });
  if (!user?.branchId) throw new Error('No branch');

  const firstProcess = await prisma.manufacturingProcess.findFirst({
    where: { tenantId: user.tenantId },
    orderBy: { order: 'asc' }
  });

  return prisma.productionOrder.create({
    data: {
      recipeId,
      targetQuantity,
      branchId: user.branchId,
      userId: user.id,
      status: 'PENDING',
      currentProcessId: firstProcess ? firstProcess.id : null
    }
  });
}

export async function advanceProductionOrder(orderId: string) {
  const order = await prisma.productionOrder.findUnique({ 
    where: { id: orderId },
    include: { currentProcess: true, recipe: { include: { ingredients: true } } }
  });

  if (!order || order.status === 'COMPLETED') return;

  const allProcesses = await prisma.manufacturingProcess.findMany({
    where: { tenantId: order.currentProcess?.tenantId || undefined },
    orderBy: { order: 'asc' }
  });

  const currentIndex = allProcesses.findIndex(p => p.id === order.currentProcessId);
  const nextProcess = allProcesses[currentIndex + 1];

  if (!nextProcess) {
    // Es el último paso, marcar como COMPLETADO
    
    // Descontar inventario de insumos
    for (const ing of order.recipe.ingredients) {
      const discount = ing.quantity * order.targetQuantity;
      await prisma.product.update({
        where: { id: ing.productId },
        data: { stock: { decrement: discount } }
      });
    }

    // Aumentar inventario de producto final
    await prisma.product.update({
      where: { id: order.recipe.productId },
      data: { stock: { increment: order.targetQuantity } }
    });

    return prisma.productionOrder.update({
      where: { id: orderId },
      data: { status: 'COMPLETED', currentProcessId: null }
    });
  } else {
    // Avanzar al siguiente paso
    return prisma.productionOrder.update({
      where: { id: orderId },
      data: { status: 'IN_PROGRESS', currentProcessId: nextProcess.id }
    });
  }
}
