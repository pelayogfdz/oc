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
    include: { 
      currentProcess: true, 
      recipe: { 
        include: { 
          ingredients: {
            include: {
              product: true
            }
          } 
        } 
      } 
    }
  });

  if (!order || order.status === 'COMPLETED') return { success: false, error: 'Orden no encontrada o ya completada' };

  const tenantId = order.recipe?.tenantId;
  const allProcesses = await prisma.manufacturingProcess.findMany({
    where: { tenantId: tenantId || undefined },
    orderBy: { order: 'asc' }
  });

  const firstProcess = allProcesses[0];

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Si está en PENDIENTE, estamos iniciando producción: descontar insumos
      if (order.status === 'PENDING') {
        for (const ing of order.recipe.ingredients) {
          const discount = ing.quantity * order.targetQuantity;
          await tx.product.update({
            where: { id: ing.productId },
            data: { stock: { decrement: discount } }
          });

          // Registrar movimiento de inventario OUT
          await tx.inventoryMovement.create({
            data: {
              productId: ing.productId,
              type: 'OUT',
              quantity: -discount,
              reason: `Consumo de insumos para orden de producción ID: ${order.id}`
            }
          });
        }

        if (firstProcess) {
          await tx.productionOrder.update({
            where: { id: orderId },
            data: { 
              status: 'IN_PROGRESS', 
              currentProcessId: firstProcess.id 
            }
          });
        } else {
          // No hay procesos definidos: completar de inmediato
          await tx.product.update({
            where: { id: order.recipe.productId },
            data: { stock: { increment: order.targetQuantity } }
          });

          await tx.inventoryMovement.create({
            data: {
              productId: order.recipe.productId,
              type: 'IN',
              quantity: order.targetQuantity,
              reason: `Producción completada para orden ID: ${order.id}`
            }
          });

          await tx.productionOrder.update({
            where: { id: orderId },
            data: { 
              status: 'COMPLETED', 
              currentProcessId: null 
            }
          });
        }
      } else {
        // 2. Ya está EN PROCESO: avanzar al siguiente proceso o completar
        const currentIndex = allProcesses.findIndex(p => p.id === order.currentProcessId);
        const nextProcess = allProcesses[currentIndex + 1];

        if (!nextProcess) {
          // No hay más procesos: completar e ingresar producto terminado
          await tx.product.update({
            where: { id: order.recipe.productId },
            data: { stock: { increment: order.targetQuantity } }
          });

          await tx.inventoryMovement.create({
            data: {
              productId: order.recipe.productId,
              type: 'IN',
              quantity: order.targetQuantity,
              reason: `Producción completada para orden ID: ${order.id}`
            }
          });

          await tx.productionOrder.update({
            where: { id: orderId },
            data: { 
              status: 'COMPLETED', 
              currentProcessId: null 
            }
          });
        } else {
          // Mover al siguiente proceso
          await tx.productionOrder.update({
            where: { id: orderId },
            data: { 
              status: 'IN_PROGRESS', 
              currentProcessId: nextProcess.id 
            }
          });
        }
      }
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error al avanzar orden de producción:", error);
    return { success: false, error: error.message || "Error al procesar la orden." };
  }
}

export async function createProductionOrdersBulk(items: { recipeId: string; quantity: number }[]) {
  try {
    const sessionCookie = (await cookies()).get('session')?.value;
    const session = await decrypt(sessionCookie);
    if (!session?.userId) throw new Error('Unauthorized');

    const user = await prisma.user.findUnique({ where: { id: session.userId as string } });
    if (!user?.branchId) throw new Error('No branch');

    const firstProcess = await prisma.manufacturingProcess.findFirst({
      where: { tenantId: user.tenantId },
      orderBy: { order: 'asc' }
    });

    const created = [];
    for (const item of items) {
      if (item.quantity <= 0) continue;
      const order = await prisma.productionOrder.create({
        data: {
          recipeId: item.recipeId,
          targetQuantity: item.quantity,
          branchId: user.branchId,
          userId: user.id,
          status: 'PENDING',
          currentProcessId: firstProcess ? firstProcess.id : null
        }
      });
      created.push(order);
    }

    return { success: true, count: created.length };
  } catch (error: any) {
    console.error("Error al crear órdenes de producción en lote:", error);
    return { success: false, error: error.message || "Error al procesar las órdenes." };
  }
}
