'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getActiveBranch, getActiveUser } from './auth';

// Helper para resolver la sucursal activa
async function resolveBranch(branchIdParam?: string) {
  if (branchIdParam && branchIdParam !== 'GLOBAL') return branchIdParam;
  const activeBranch = await getActiveBranch();
  if (activeBranch && activeBranch.id !== 'GLOBAL') return activeBranch.id;
  const user = await getActiveUser();
  if (user?.branchId) return user.branchId;
  // Fallback: primera sucursal
  const firstBranch = await prisma.branch.findFirst({ where: { isActive: true } });
  return firstBranch?.id || '';
}

// ----------------------------------------------------
// 1. ÁREAS Y SALÓN
// ----------------------------------------------------

export async function getRestaurantAreas(branchIdParam?: string) {
  try {
    const branchId = await resolveBranch(branchIdParam);
    if (!branchId) return { success: false, error: 'No se encontró una sucursal activa', areas: [] };

    // Si no existen áreas, crear un área por defecto "Salón Principal" con algunas mesas
    const count = await prisma.restaurantArea.count({ where: { branchId, isActive: true } });
    if (count === 0) {
      await prisma.restaurantArea.create({
        data: {
          name: 'Salón Principal',
          branchId,
          sortOrder: 1,
          tables: {
            create: [
              { number: 1, name: 'Mesa 1', capacity: 4, posX: 50, posY: 50, shape: 'SQUARE', branchId },
              { number: 2, name: 'Mesa 2', capacity: 4, posX: 200, posY: 50, shape: 'SQUARE', branchId },
              { number: 3, name: 'Mesa 3', capacity: 6, posX: 350, posY: 50, shape: 'RECTANGLE', branchId },
              { number: 4, name: 'Mesa 4', capacity: 2, posX: 50, posY: 200, shape: 'ROUND', branchId },
              { number: 5, name: 'Barra 1', capacity: 1, posX: 200, posY: 200, shape: 'ROUND', branchId },
              { number: 6, name: 'Barra 2', capacity: 1, posX: 350, posY: 200, shape: 'ROUND', branchId },
            ]
          }
        }
      });
    }

    const areas = await prisma.restaurantArea.findMany({
      where: { branchId, isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        tables: {
          where: { isActive: true },
          orderBy: { number: 'asc' },
          include: {
            activeWaiter: {
              select: { id: true, name: true, email: true }
            },
            orders: {
              where: { status: { in: ['OPEN', 'IN_PREP', 'READY', 'BILLED'] } },
              orderBy: { openedAt: 'desc' },
              take: 1,
              include: {
                waiter: { select: { id: true, name: true } },
                items: {
                  where: { status: { not: 'CANCELLED' } },
                  include: {
                    product: { select: { id: true, name: true, price: true } },
                    modifiers: true
                  }
                }
              }
            }
          }
        }
      }
    });

    return { success: true, areas };
  } catch (err: any) {
    console.error('Error fetching restaurant areas:', err);
    return { success: false, error: err.message, areas: [] };
  }
}

export async function saveRestaurantArea(data: { id?: string; name: string; branchId?: string; sortOrder?: number }) {
  try {
    const branchId = await resolveBranch(data.branchId);
    if (!branchId) throw new Error('Sucursal inválida');

    if (data.id) {
      const updated = await prisma.restaurantArea.update({
        where: { id: data.id },
        data: {
          name: data.name,
          sortOrder: data.sortOrder ?? 0
        }
      });
      revalidatePath('/restaurante');
      return { success: true, area: updated };
    } else {
      const created = await prisma.restaurantArea.create({
        data: {
          name: data.name,
          branchId,
          sortOrder: data.sortOrder ?? 0
        }
      });
      revalidatePath('/restaurante');
      return { success: true, area: created };
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteRestaurantArea(id: string) {
  try {
    await prisma.restaurantArea.update({
      where: { id },
      data: { isActive: false }
    });
    revalidatePath('/restaurante');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ----------------------------------------------------
// 2. MESAS
// ----------------------------------------------------

export async function saveRestaurantTable(data: {
  id?: string;
  areaId: string;
  number: number;
  name: string;
  capacity?: number;
  shape?: string;
  posX?: number;
  posY?: number;
  branchId?: string;
}) {
  try {
    const branchId = await resolveBranch(data.branchId);
    if (!branchId) throw new Error('Sucursal inválida');

    if (data.id) {
      const updated = await prisma.restaurantTable.update({
        where: { id: data.id },
        data: {
          areaId: data.areaId,
          number: data.number,
          name: data.name,
          capacity: data.capacity ?? 4,
          shape: data.shape ?? 'SQUARE',
          posX: data.posX ?? 0,
          posY: data.posY ?? 0,
        }
      });
      revalidatePath('/restaurante');
      return { success: true, table: updated };
    } else {
      const created = await prisma.restaurantTable.create({
        data: {
          areaId: data.areaId,
          branchId,
          number: data.number,
          name: data.name,
          capacity: data.capacity ?? 4,
          shape: data.shape ?? 'SQUARE',
          posX: data.posX ?? 0,
          posY: data.posY ?? 0,
          status: 'FREE'
        }
      });
      revalidatePath('/restaurante');
      return { success: true, table: created };
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteRestaurantTable(id: string) {
  try {
    await prisma.restaurantTable.update({
      where: { id },
      data: { isActive: false }
    });
    revalidatePath('/restaurante');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateTableLayoutPositions(
  positions: Array<{ id: string; posX: number; posY: number; shape?: string; capacity?: number }>
) {
  try {
    if (!positions || positions.length === 0) return { success: true };
    const updates = positions.map(pos =>
      prisma.restaurantTable.update({
        where: { id: pos.id },
        data: {
          posX: pos.posX,
          posY: pos.posY,
          ...(pos.shape ? { shape: pos.shape } : {}),
          ...(pos.capacity !== undefined ? { capacity: pos.capacity } : {})
        }
      })
    );
    await prisma.$transaction(updates);
    revalidatePath('/restaurante/mesas');
    revalidatePath('/restaurante');
    return { success: true };
  } catch (err: any) {
    console.error('Error updating table layout positions:', err);
    return { success: false, error: err.message };
  }
}

export async function getTableDetails(tableId: string) {
  try {
    const table = await prisma.restaurantTable.findUnique({
      where: { id: tableId },
      include: {
        area: true,
        activeWaiter: { select: { id: true, name: true, email: true } },
        orders: {
          where: { status: { in: ['OPEN', 'IN_PREP', 'READY', 'BILLED'] } },
          orderBy: { openedAt: 'desc' },
          take: 1,
          include: {
            waiter: { select: { id: true, name: true } },
            items: {
              orderBy: { createdAt: 'asc' },
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    price: true,
                    category: true,
                    imageUrl: true,
                    kitchenStation: true
                  }
                },
                variant: true,
                kitchenStation: true,
                modifiers: {
                  include: {
                    ingredientProduct: { select: { id: true, name: true } }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!table) return { success: false, error: 'Mesa no encontrada' };

    const activeOrder = table.orders[0] || null;
    return { success: true, table, activeOrder };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function openTableOrder(data: {
  tableId: string;
  dinersCount: number;
  waiterId?: string;
  notes?: string;
}) {
  try {
    const user = await getActiveUser();
    const table = await prisma.restaurantTable.findUnique({
      where: { id: data.tableId },
      include: {
        orders: {
          where: { status: { in: ['OPEN', 'IN_PREP', 'READY', 'BILLED'] } }
        }
      }
    });

    if (!table) throw new Error('Mesa no encontrada');
    if (table.orders.length > 0) {
      return { success: true, orderId: table.orders[0].id, isExisting: true };
    }

    const assignedWaiterId = data.waiterId || user.id;
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const folio = `M${table.number}-${todayStr}-${randomSuffix}`;

    const order = await prisma.restaurantOrder.create({
      data: {
        folio,
        tableId: table.id,
        branchId: table.branchId,
        waiterId: assignedWaiterId,
        dinersCount: Math.max(1, data.dinersCount || 1),
        notes: data.notes || null,
        status: 'OPEN',
        subtotal: 0,
        tax: 0,
        discount: 0,
        tip: 0,
        total: 0
      }
    });

    await prisma.restaurantTable.update({
      where: { id: table.id },
      data: {
        status: 'OCCUPIED',
        currentOrderId: order.id,
        activeWaiterId: assignedWaiterId
      }
    });

    revalidatePath('/restaurante');
    return { success: true, orderId: order.id };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ----------------------------------------------------
// 3. PRODUCTOS Y MENÚ PARA TOMA DE COMANDAS
// ----------------------------------------------------

export async function getMenuProducts(branchIdParam?: string) {
  try {
    const branchId = await resolveBranch(branchIdParam);
    if (!branchId) return { success: false, error: 'Sucursal no encontrada', products: [], categories: [] };

    const products = await prisma.product.findMany({
      where: {
        branchId,
        isActive: true,
        isRestaurantAvailable: true,
        isProductionInput: false
      },
      select: {
        id: true,
        sku: true,
        name: true,
        description: true,
        price: true,
        wholesalePrice: true,
        specialPrice: true,
        category: true,
        imageUrl: true,
        stock: true,
        unit: true,
        kitchenStationId: true,
        kitchenStation: {
          select: { id: true, name: true, color: true }
        },
        variants: {
          select: { id: true, attribute: true, price: true, stock: true }
        },
        Recipe: {
          select: {
            id: true,
            name: true,
            ingredients: {
              select: {
                id: true,
                productId: true,
                quantity: true,
                product: { select: { name: true, stock: true, unit: true } }
              }
            }
          }
        }
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }]
    });

    const categoriesSet = new Set<string>();
    products.forEach(p => {
      if (p.category) categoriesSet.add(p.category);
      else categoriesSet.add('General');
    });

    return {
      success: true,
      products,
      categories: Array.from(categoriesSet)
    };
  } catch (err: any) {
    return { success: false, error: err.message, products: [], categories: [] };
  }
}

// ----------------------------------------------------
// 4. AGREGAR ÍTEMS A LA COMANDA Y ENVIAR A COCINA
// ----------------------------------------------------

export async function addItemsToOrder(data: {
  orderId: string;
  items: Array<{
    productId: string;
    variantId?: string;
    kitchenStationId?: string;
    quantity: number;
    unitPrice: number;
    notes?: string;
    course?: string;
    dinerNumber?: number;
    modifiers?: Array<{
      name: string;
      extraPrice: number;
      ingredientProductId?: string;
      ingredientQty?: number;
    }>;
  }>;
  sendToKitchenImmediately?: boolean;
}) {
  try {
    const order = await prisma.restaurantOrder.findUnique({
      where: { id: data.orderId },
      include: { table: true }
    });

    if (!order) throw new Error('Orden no encontrada');

    for (const item of data.items) {
      let stationId = item.kitchenStationId;
      if (!stationId) {
        const prod = await prisma.product.findUnique({
          where: { id: item.productId },
          select: { kitchenStationId: true }
        });
        stationId = prod?.kitchenStationId || undefined;
      }

      const createdItem = await prisma.restaurantOrderItem.create({
        data: {
          orderId: order.id,
          productId: item.productId,
          variantId: item.variantId || null,
          kitchenStationId: stationId || null,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          notes: item.notes || null,
          course: item.course || 'MAIN',
          dinerNumber: item.dinerNumber || 1,
          status: data.sendToKitchenImmediately ? 'SENT_TO_KITCHEN' : 'PENDING',
          sentAt: data.sendToKitchenImmediately ? new Date() : null,
          modifiers: item.modifiers && item.modifiers.length > 0 ? {
            create: item.modifiers.map(m => ({
              name: m.name,
              extraPrice: m.extraPrice || 0,
              ingredientProductId: m.ingredientProductId || null,
              ingredientQty: m.ingredientQty || null
            }))
          } : undefined
        }
      });

      if (data.sendToKitchenImmediately) {
        await deductRecipeForOrderItem(createdItem.id, order.branchId);
      }
    }

    await recalculateOrderTotals(order.id);

    if (data.sendToKitchenImmediately) {
      await prisma.restaurantTable.update({
        where: { id: order.tableId },
        data: { status: 'ORDER_PLACED' }
      });
      await prisma.restaurantOrder.update({
        where: { id: order.id },
        data: { status: 'IN_PREP' }
      });
    }

    revalidatePath(`/restaurante/comanda/${order.tableId}`);
    revalidatePath('/restaurante/mesas');
    revalidatePath('/restaurante/kds');

    return { success: true };
  } catch (err: any) {
    console.error('Error adding items to order:', err);
    return { success: false, error: err.message };
  }
}

export async function sendPendingItemsToKitchen(orderId: string) {
  try {
    const order = await prisma.restaurantOrder.findUnique({
      where: { id: orderId },
      include: {
        table: true,
        items: {
          where: { status: 'PENDING' }
        }
      }
    });

    if (!order) throw new Error('Orden no encontrada');
    if (order.items.length === 0) {
      return { success: true, message: 'No hay ítems pendientes de enviar' };
    }

    const now = new Date();
    for (const item of order.items) {
      await prisma.restaurantOrderItem.update({
        where: { id: item.id },
        data: {
          status: 'SENT_TO_KITCHEN',
          sentAt: now
        }
      });
      await deductRecipeForOrderItem(item.id, order.branchId);
    }

    await prisma.restaurantOrder.update({
      where: { id: order.id },
      data: { status: 'IN_PREP' }
    });

    await prisma.restaurantTable.update({
      where: { id: order.tableId },
      data: { status: 'ORDER_PLACED' }
    });

    revalidatePath(`/restaurante/comanda/${order.tableId}`);
    revalidatePath('/restaurante/mesas');
    revalidatePath('/restaurante/kds');

    return { success: true, count: order.items.length };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function cancelOrderItem(orderItemId: string, reason?: string) {
  try {
    const item = await prisma.restaurantOrderItem.findUnique({
      where: { id: orderItemId },
      include: { order: true }
    });

    if (!item) throw new Error('Ítem no encontrado');

    if (item.recipeDeducted) {
      await restoreRecipeForOrderItem(item.id, item.order.branchId);
    }

    await prisma.restaurantOrderItem.update({
      where: { id: orderItemId },
      data: {
        status: 'CANCELLED',
        notes: item.notes ? `${item.notes} (CANCELADO: ${reason || 'Sin motivo'})` : `(CANCELADO: ${reason || 'Sin motivo'})`
      }
    });

    await recalculateOrderTotals(item.orderId);
    revalidatePath(`/restaurante/comanda/${item.order.tableId}`);
    revalidatePath('/restaurante/kds');

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ----------------------------------------------------
// 5. COCINA / KDS (KITCHEN DISPLAY SYSTEM)
// ----------------------------------------------------

export async function getKitchenOrders(stationId?: string, branchIdParam?: string) {
  try {
    const branchId = await resolveBranch(branchIdParam);
    if (!branchId) return { success: false, error: 'Sucursal no encontrada', orders: [] };

    const itemWhereClause: any = {
      status: { in: ['SENT_TO_KITCHEN', 'IN_PREP', 'READY'] }
    };

    if (stationId && stationId !== 'ALL') {
      itemWhereClause.kitchenStationId = stationId;
    }

    const orders = await prisma.restaurantOrder.findMany({
      where: {
        branchId,
        status: { in: ['IN_PREP', 'READY', 'OPEN'] },
        items: {
          some: itemWhereClause
        }
      },
      orderBy: { openedAt: 'asc' },
      include: {
        table: { select: { id: true, number: true, name: true } },
        waiter: { select: { id: true, name: true } },
        items: {
          where: itemWhereClause,
          orderBy: { createdAt: 'asc' },
          include: {
            product: { select: { id: true, name: true, unit: true } },
            variant: true,
            kitchenStation: true,
            modifiers: true
          }
        }
      }
    });

    return { success: true, orders };
  } catch (err: any) {
    return { success: false, error: err.message, orders: [] };
  }
}

export async function updateOrderItemStatus(itemId: string, status: 'IN_PREP' | 'READY' | 'SERVED' | 'CANCELLED') {
  try {
    const now = new Date();
    const updateData: any = { status };

    if (status === 'READY') updateData.preparedAt = now;
    if (status === 'SERVED') updateData.servedAt = now;

    const updatedItem = await prisma.restaurantOrderItem.update({
      where: { id: itemId },
      data: updateData,
      include: { order: { include: { table: true, items: true } } }
    });

    const nonCancelledItems = updatedItem.order.items.filter(i => i.status !== 'CANCELLED');
    const allReady = nonCancelledItems.length > 0 && nonCancelledItems.every(i => i.status === 'READY' || i.status === 'SERVED');

    if (allReady) {
      await prisma.restaurantTable.update({
        where: { id: updatedItem.order.tableId },
        data: { status: 'READY' }
      });
      await prisma.restaurantOrder.update({
        where: { id: updatedItem.orderId },
        data: { status: 'READY' }
      });
    }

    revalidatePath('/restaurante/kds');
    revalidatePath('/restaurante/mesas');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ----------------------------------------------------
// 6. CAMBIO DE MESA Y UNIÓN
// ----------------------------------------------------

export async function transferTable(data: {
  fromTableId: string;
  toTableId: string;
  reason?: string;
}) {
  try {
    const user = await getActiveUser();
    const fromTable = await prisma.restaurantTable.findUnique({
      where: { id: data.fromTableId },
      include: {
        orders: {
          where: { status: { in: ['OPEN', 'IN_PREP', 'READY', 'BILLED'] } }
        }
      }
    });

    const toTable = await prisma.restaurantTable.findUnique({
      where: { id: data.toTableId },
      include: {
        orders: {
          where: { status: { in: ['OPEN', 'IN_PREP', 'READY', 'BILLED'] } }
        }
      }
    });

    if (!fromTable || !toTable) throw new Error('Mesas no encontradas');
    if (fromTable.orders.length === 0) throw new Error('La mesa de origen no tiene una orden activa');
    if (toTable.orders.length > 0) throw new Error('La mesa de destino ya está ocupada');

    const activeOrder = fromTable.orders[0];

    await prisma.restaurantOrder.update({
      where: { id: activeOrder.id },
      data: { tableId: toTable.id }
    });

    await prisma.restaurantTable.update({
      where: { id: toTable.id },
      data: {
        status: fromTable.status,
        currentOrderId: activeOrder.id,
        activeWaiterId: fromTable.activeWaiterId
      }
    });

    await prisma.restaurantTable.update({
      where: { id: fromTable.id },
      data: {
        status: 'FREE',
        currentOrderId: null,
        activeWaiterId: null
      }
    });

    await prisma.restaurantTableTransferLog.create({
      data: {
        orderId: activeOrder.id,
        fromTableId: fromTable.id,
        toTableId: toTable.id,
        userId: user.id,
        branchId: fromTable.branchId,
        reason: data.reason || 'Cambio de mesa solicitado por comensal'
      }
    });

    revalidatePath('/restaurante/mesas');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ----------------------------------------------------
// 7. PRE-CUENTA, DIVISIÓN Y COBRO INTEGRADO
// ----------------------------------------------------

export async function requestTableBill(orderId: string) {
  try {
    const order = await prisma.restaurantOrder.findUnique({
      where: { id: orderId },
      include: { table: true }
    });

    if (!order) throw new Error('Orden no encontrada');

    await prisma.restaurantOrder.update({
      where: { id: order.id },
      data: { status: 'BILLED' }
    });

    await prisma.restaurantTable.update({
      where: { id: order.tableId },
      data: { status: 'BILL_REQUESTED' }
    });

    revalidatePath('/restaurante/mesas');
    revalidatePath(`/restaurante/cuenta/${order.id}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getBillSummary(orderId: string) {
  try {
    const order = await prisma.restaurantOrder.findUnique({
      where: { id: orderId },
      include: {
        table: { include: { area: true } },
        waiter: { select: { id: true, name: true } },
        branch: {
          select: {
            id: true,
            name: true,
            location: true,
            settings: true
          }
        },
        items: {
          where: { status: { not: 'CANCELLED' } },
          include: {
            product: { select: { id: true, name: true, sku: true } },
            variant: true,
            modifiers: true
          }
        }
      }
    });

    if (!order) return { success: false, error: 'Orden no encontrada' };

    return { success: true, order };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function closeRestaurantOrderAndPay(data: {
  orderId: string;
  payments: Array<{ method: string; amount: number }>;
  cashReceived?: number;
  tipAmount?: number;
  customerId?: string;
  notes?: string;
}) {
  try {
    const user = await getActiveUser();
    const order = await prisma.restaurantOrder.findUnique({
      where: { id: data.orderId },
      include: {
        table: true,
        items: {
          where: { status: { not: 'CANCELLED' } },
          include: { product: true, variant: true, modifiers: true }
        }
      }
    });

    if (!order) throw new Error('Orden no encontrada');
    if (order.status === 'CLOSED') throw new Error('Esta orden ya fue cobrada y cerrada');

    const activeSession = await prisma.cashSession.findFirst({
      where: {
        branchId: order.branchId,
        status: 'OPEN',
        userId: user.id
      }
    }) || await prisma.cashSession.findFirst({
      where: {
        branchId: order.branchId,
        status: 'OPEN'
      },
      orderBy: { openedAt: 'desc' }
    });

    let cashAmount = 0;
    let cardAmount = 0;
    let transferAmount = 0;
    let primaryMethod = 'CASH';

    data.payments.forEach(p => {
      if (p.method === 'CASH') cashAmount += p.amount;
      else if (p.method === 'CARD') cardAmount += p.amount;
      else if (p.method === 'TRANSFER') transferAmount += p.amount;
    });

    if (data.payments.length === 1) {
      primaryMethod = data.payments[0].method;
    } else if (data.payments.length > 1) {
      primaryMethod = 'MIXTO';
    }

    const tip = data.tipAmount || 0;
    const finalTotal = order.total + tip;

    const countSales = await prisma.sale.count({ where: { branchId: order.branchId } });
    const saleFolio = `V-${String(countSales + 1).padStart(6, '0')}`;

    const sale = await prisma.sale.create({
      data: {
        folio: saleFolio,
        total: finalTotal,
        status: 'COMPLETED',
        paymentMethod: primaryMethod,
        cashAmount: cashAmount > 0 ? cashAmount : null,
        cardAmount: cardAmount > 0 ? cardAmount : null,
        transferAmount: transferAmount > 0 ? transferAmount : null,
        customerId: data.customerId || null,
        branchId: order.branchId,
        userId: user.id,
        cashSessionId: activeSession?.id || null,
        notes: `Comanda Restaurante: Mesa ${order.table.name} (Folio: ${order.folio || 'N/A'})${tip > 0 ? ` [Propina: $${tip.toFixed(2)}]` : ''}${data.notes ? ` - ${data.notes}` : ''}`,
        items: {
          create: order.items.map(item => {
            let itemTotal = item.unitPrice * item.quantity;
            item.modifiers.forEach(m => itemTotal += (m.extraPrice * item.quantity));
            return {
              productId: item.productId,
              variantId: item.variantId || null,
              quantity: Math.max(1, Math.round(item.quantity)),
              price: itemTotal / item.quantity,
              cost: item.product.cost || 0,
              productName: item.product.name,
              productSku: item.product.sku
            };
          })
        }
      }
    });

    await prisma.restaurantOrder.update({
      where: { id: order.id },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
        tip: tip,
        saleId: sale.id
      }
    });

    await prisma.restaurantTable.update({
      where: { id: order.tableId },
      data: {
        status: 'FREE',
        currentOrderId: null,
        activeWaiterId: null
      }
    });

    revalidatePath('/restaurante/mesas');
    revalidatePath('/ventas');
    revalidatePath('/caja/actual');

    return { success: true, saleId: sale.id, folio: saleFolio };
  } catch (err: any) {
    console.error('Error closing restaurant order:', err);
    return { success: false, error: err.message };
  }
}

export async function cancelOrReleaseTable(tableId: string, reason?: string) {
  try {
    const table = await prisma.restaurantTable.findUnique({
      where: { id: tableId },
      include: {
        orders: {
          where: { status: { in: ['OPEN', 'IN_PREP', 'READY', 'BILLED'] } },
          include: { items: true }
        }
      }
    });

    if (!table) throw new Error('Mesa no encontrada');

    if (table.orders.length > 0) {
      for (const ord of table.orders) {
        // Revertir insumos de cualquier ítem enviado
        for (const item of ord.items) {
          if (item.recipeDeducted) {
            await restoreRecipeForOrderItem(item.id, ord.branchId);
          }
        }
        await prisma.restaurantOrder.update({
          where: { id: ord.id },
          data: {
            status: 'CANCELLED',
            closedAt: new Date(),
            notes: ord.notes ? `${ord.notes} (Mesa Cancelada: ${reason || 'Apertura errónea'})` : `(Mesa Cancelada: ${reason || 'Apertura errónea'})`
          }
        });
      }
    }

    await prisma.restaurantTable.update({
      where: { id: table.id },
      data: {
        status: 'FREE',
        currentOrderId: null,
        activeWaiterId: null
      }
    });

    revalidatePath('/restaurante/mesas');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function joinTables(sourceTableId: string, targetTableId: string) {
  try {
    const user = await getActiveUser();
    const sourceTable = await prisma.restaurantTable.findUnique({
      where: { id: sourceTableId },
      include: {
        orders: {
          where: { status: { in: ['OPEN', 'IN_PREP', 'READY', 'BILLED'] } },
          include: { items: true }
        }
      }
    });

    const targetTable = await prisma.restaurantTable.findUnique({
      where: { id: targetTableId },
      include: {
        orders: {
          where: { status: { in: ['OPEN', 'IN_PREP', 'READY', 'BILLED'] } }
        }
      }
    });

    if (!sourceTable || !targetTable) throw new Error('Mesas no encontradas');
    if (sourceTable.orders.length === 0) throw new Error('La mesa de origen no tiene una orden activa');
    if (targetTable.orders.length === 0) throw new Error('La mesa de destino no tiene una orden activa');

    const sourceOrder = sourceTable.orders[0];
    const targetOrder = targetTable.orders[0];

    // Mover todos los ítems de sourceOrder a targetOrder
    await prisma.restaurantOrderItem.updateMany({
      where: { orderId: sourceOrder.id },
      data: { orderId: targetOrder.id }
    });

    // Recalcular comensales y notas
    await prisma.restaurantOrder.update({
      where: { id: targetOrder.id },
      data: {
        dinersCount: targetOrder.dinersCount + sourceOrder.dinersCount,
        notes: [targetOrder.notes, `(Unida con ${sourceTable.name})`, sourceOrder.notes].filter(Boolean).join(' - ')
      }
    });

    // Cerrar/cancelar la orden de origen
    await prisma.restaurantOrder.update({
      where: { id: sourceOrder.id },
      data: {
        status: 'CANCELLED',
        closedAt: new Date(),
        notes: `Unida a ${targetTable.name}`
      }
    });

    // Liberar mesa origen
    await prisma.restaurantTable.update({
      where: { id: sourceTable.id },
      data: {
        status: 'FREE',
        currentOrderId: null,
        activeWaiterId: null
      }
    });

    // Recalcular totales de targetOrder
    await recalculateOrderTotals(targetOrder.id);

    // Auditoría
    await prisma.restaurantTableTransferLog.create({
      data: {
        orderId: targetOrder.id,
        fromTableId: sourceTable.id,
        toTableId: targetTable.id,
        userId: user.id,
        branchId: targetTable.branchId,
        reason: `Unión de mesas (${sourceTable.name} -> ${targetTable.name})`
      }
    });

    revalidatePath('/restaurante/mesas');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function paySplitItemsOrder(data: {
  orderId: string;
  itemIds: string[];
  payments: Array<{ method: string; amount: number }>;
  cashReceived?: number;
  tipAmount?: number;
  customerId?: string;
  notes?: string;
}) {
  try {
    const user = await getActiveUser();
    const order = await prisma.restaurantOrder.findUnique({
      where: { id: data.orderId },
      include: {
        table: true,
        items: {
          where: { id: { in: data.itemIds } },
          include: { product: true, variant: true, modifiers: true }
        }
      }
    });

    if (!order) throw new Error('Orden no encontrada');
    if (order.items.length === 0) throw new Error('No se seleccionaron platillos válidos para cobrar');

    const activeSession = await prisma.cashSession.findFirst({
      where: {
        branchId: order.branchId,
        status: 'OPEN',
        userId: user.id
      }
    }) || await prisma.cashSession.findFirst({
      where: { branchId: order.branchId, status: 'OPEN' },
      orderBy: { openedAt: 'desc' }
    });

    let splitTotal = 0;
    order.items.forEach(item => {
      let itemPrice = item.unitPrice * item.quantity;
      item.modifiers.forEach(m => itemPrice += (m.extraPrice * item.quantity));
      splitTotal += itemPrice;
    });

    const tip = data.tipAmount || 0;
    const finalTotal = splitTotal + tip;

    let cashAmount = 0;
    let cardAmount = 0;
    let transferAmount = 0;
    let primaryMethod = 'CASH';

    data.payments.forEach(p => {
      if (p.method === 'CASH') cashAmount += p.amount;
      else if (p.method === 'CARD') cardAmount += p.amount;
      else if (p.method === 'TRANSFER') transferAmount += p.amount;
    });

    if (data.payments.length === 1) primaryMethod = data.payments[0].method;
    else if (data.payments.length > 1) primaryMethod = 'MIXTO';

    const countSales = await prisma.sale.count({ where: { branchId: order.branchId } });
    const saleFolio = `V-${String(countSales + 1).padStart(6, '0')}`;

    const sale = await prisma.sale.create({
      data: {
        folio: saleFolio,
        total: finalTotal,
        status: 'COMPLETED',
        paymentMethod: primaryMethod,
        cashAmount: cashAmount > 0 ? cashAmount : null,
        cardAmount: cardAmount > 0 ? cardAmount : null,
        transferAmount: transferAmount > 0 ? transferAmount : null,
        customerId: data.customerId || null,
        branchId: order.branchId,
        userId: user.id,
        cashSessionId: activeSession?.id || null,
        notes: `Cuenta Dividida (Parcial): Mesa ${order.table.name}${tip > 0 ? ` [Propina: $${tip.toFixed(2)}]` : ''}${data.notes ? ` - ${data.notes}` : ''}`,
        items: {
          create: order.items.map(item => {
            let itemTotal = item.unitPrice * item.quantity;
            item.modifiers.forEach(m => itemTotal += (m.extraPrice * item.quantity));
            return {
              productId: item.productId,
              variantId: item.variantId || null,
              quantity: Math.max(1, Math.round(item.quantity)),
              price: itemTotal / item.quantity,
              cost: item.product.cost || 0,
              productName: item.product.name,
              productSku: item.product.sku
            };
          })
        }
      }
    });

    // Marcar estos ítems como pagados/servidos y eliminarlos o desvincularlos de la comanda activa
    await prisma.restaurantOrderItem.deleteMany({
      where: { id: { in: data.itemIds } }
    });

    // Verificar si quedan ítems pendientes en la comanda
    const remainingItems = await prisma.restaurantOrderItem.count({
      where: { orderId: order.id, status: { not: 'CANCELLED' } }
    });

    if (remainingItems === 0) {
      // Si ya no quedan ítems, cerrar la orden y liberar la mesa
      await prisma.restaurantOrder.update({
        where: { id: order.id },
        data: {
          status: 'CLOSED',
          closedAt: new Date(),
          tip: tip,
          saleId: sale.id
        }
      });

      await prisma.restaurantTable.update({
        where: { id: order.tableId },
        data: {
          status: 'FREE',
          currentOrderId: null,
          activeWaiterId: null
        }
      });
    } else {
      // Si quedan ítems, recalcular totales de la comanda
      await recalculateOrderTotals(order.id);
    }

    revalidatePath('/restaurante/mesas');
    revalidatePath(`/restaurante/cuenta/${order.id}`);
    revalidatePath('/ventas');

    return { 
      success: true, 
      saleId: sale.id, 
      folio: saleFolio, 
      isFullyClosed: remainingItems === 0 
    };
  } catch (err: any) {
    console.error('Error paying split order items:', err);
    return { success: false, error: err.message };
  }
}


// ----------------------------------------------------
// 8. ESTACIONES DE COCINA CRUD
// ----------------------------------------------------

export async function getKitchenStations(branchIdParam?: string) {
  try {
    const branchId = await resolveBranch(branchIdParam);
    if (!branchId) return { success: false, error: 'Sucursal no encontrada', stations: [] };

    const count = await prisma.kitchenStation.count({ where: { branchId, isActive: true } });
    if (count === 0) {
      await prisma.kitchenStation.createMany({
        data: [
          { name: 'Cocina Caliente', color: '#EF4444', branchId },
          { name: 'Cocina Fría / Ensaladas', color: '#10B981', branchId },
          { name: 'Barra de Bebidas', color: '#3B82F6', branchId },
          { name: 'Postres y Cafetería', color: '#F59E0B', branchId },
        ]
      });
    }

    const stations = await prisma.kitchenStation.findMany({
      where: { branchId, isActive: true },
      orderBy: { name: 'asc' }
    });

    return { success: true, stations };
  } catch (err: any) {
    return { success: false, error: err.message, stations: [] };
  }
}

export async function saveKitchenStation(data: {
  id?: string;
  name: string;
  color?: string;
  printerIp?: string;
  printerType?: string;
  branchId?: string;
}) {
  try {
    const branchId = await resolveBranch(data.branchId);
    if (!branchId) throw new Error('Sucursal inválida');

    if (data.id) {
      const updated = await prisma.kitchenStation.update({
        where: { id: data.id },
        data: {
          name: data.name,
          color: data.color || '#3B82F6',
          printerIp: data.printerIp || null,
          printerType: data.printerType || 'ESC/POS'
        }
      });
      revalidatePath('/restaurante/configuracion');
      return { success: true, station: updated };
    } else {
      const created = await prisma.kitchenStation.create({
        data: {
          name: data.name,
          color: data.color || '#3B82F6',
          printerIp: data.printerIp || null,
          printerType: data.printerType || 'ESC/POS',
          branchId
        }
      });
      revalidatePath('/restaurante/configuracion');
      return { success: true, station: created };
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteKitchenStation(id: string) {
  try {
    await prisma.kitchenStation.update({
      where: { id },
      data: { isActive: false }
    });
    revalidatePath('/restaurante/configuracion');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ----------------------------------------------------
// 9. RECETAS Y ESCANDALLOS (BOM)
// ----------------------------------------------------

export async function getRestaurantRecipes(branchIdParam?: string) {
  try {
    const branchId = await resolveBranch(branchIdParam);
    if (!branchId) return { success: false, error: 'Sucursal no encontrada', recipes: [] };

    const recipes = await prisma.recipe.findMany({
      where: {
        product: { branchId, isActive: true }
      },
      include: {
        product: { select: { id: true, name: true, price: true, cost: true, category: true } },
        ingredients: {
          include: {
            product: { select: { id: true, name: true, cost: true, stock: true, unit: true } }
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    return { success: true, recipes };
  } catch (err: any) {
    return { success: false, error: err.message, recipes: [] };
  }
}

export async function saveRestaurantRecipe(data: {
  id?: string;
  productId: string;
  name: string;
  instructions?: string;
  ingredients: Array<{
    productId: string;
    quantity: number;
  }>;
}) {
  try {
    if (data.id) {
      await prisma.recipeIngredient.deleteMany({
        where: { recipeId: data.id }
      });

      const updated = await prisma.recipe.update({
        where: { id: data.id },
        data: {
          name: data.name,
          productId: data.productId,
          instructions: data.instructions || null,
          ingredients: {
            create: data.ingredients.map(ing => ({
              productId: ing.productId,
              quantity: ing.quantity
            }))
          }
        }
      });

      await updateDishCostFromRecipe(data.productId, data.ingredients);

      revalidatePath('/restaurante/recetas');
      return { success: true, recipe: updated };
    } else {
      const created = await prisma.recipe.create({
        data: {
          name: data.name,
          productId: data.productId,
          instructions: data.instructions || null,
          ingredients: {
            create: data.ingredients.map(ing => ({
              productId: ing.productId,
              quantity: ing.quantity
            }))
          }
        }
      });

      await updateDishCostFromRecipe(data.productId, data.ingredients);

      revalidatePath('/restaurante/recetas');
      return { success: true, recipe: created };
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteRestaurantRecipe(id: string) {
  try {
    await prisma.recipe.delete({
      where: { id }
    });
    revalidatePath('/restaurante/recetas');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ----------------------------------------------------
// HELPERS INTERNOS: DEDUCCIÓN DE INVENTARIO Y TOTALES
// ----------------------------------------------------

async function recalculateOrderTotals(orderId: string) {
  const items = await prisma.restaurantOrderItem.findMany({
    where: { orderId, status: { not: 'CANCELLED' } },
    include: { modifiers: true }
  });

  let subtotal = 0;
  for (const item of items) {
    let itemPrice = item.unitPrice;
    item.modifiers.forEach(m => itemPrice += m.extraPrice);
    subtotal += (itemPrice * item.quantity);
  }

  const tax = subtotal - (subtotal / 1.16);
  const total = subtotal;

  await prisma.restaurantOrder.update({
    where: { id: orderId },
    data: { subtotal, tax, total }
  });
}

async function deductRecipeForOrderItem(orderItemId: string, branchId: string) {
  try {
    const item = await prisma.restaurantOrderItem.findUnique({
      where: { id: orderItemId },
      include: {
        product: {
          include: {
            Recipe: {
              include: { ingredients: true }
            }
          }
        },
        modifiers: true,
        order: { include: { table: true } }
      }
    });

    if (!item || item.recipeDeducted) return;

    if (item.product.Recipe && item.product.Recipe.ingredients.length > 0) {
      for (const ing of item.product.Recipe.ingredients) {
        const qtyToDeduct = Math.round(ing.quantity * item.quantity);
        if (qtyToDeduct > 0) {
          await prisma.product.update({
            where: { id: ing.productId },
            data: { stock: { decrement: qtyToDeduct } }
          });

          await prisma.inventoryMovement.create({
            data: {
              productId: ing.productId,
              type: 'OUT',
              quantity: qtyToDeduct,
              reason: `Consumo comanda restaurante: Mesa ${item.order.table.name} (Platillo: ${item.product.name} x${item.quantity})`
            }
          });
        }
      }
    } else {
      // Si el producto no tiene receta pero tiene control de inventario directo (ej. Refresco, Cerveza)
      if (item.product.stock !== undefined) {
        await prisma.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } }
        });

        await prisma.inventoryMovement.create({
          data: {
            productId: item.productId,
            type: 'OUT',
            quantity: item.quantity,
            reason: `Venta directa comanda restaurante: Mesa ${item.order.table.name}`
          }
        });
      }
    }

    // 2. Deducción de modificadores con insumos extras
    for (const mod of item.modifiers) {
      if (mod.ingredientProductId && mod.ingredientQty) {
        const modQty = Math.round(mod.ingredientQty * item.quantity);
        if (modQty > 0) {
          await prisma.product.update({
            where: { id: mod.ingredientProductId },
            data: { stock: { decrement: modQty } }
          });

          await prisma.inventoryMovement.create({
            data: {
              productId: mod.ingredientProductId,
              type: 'OUT',
              quantity: modQty,
              reason: `Extra comanda: ${mod.name} en Mesa ${item.order.table.name}`
            }
          });
        }
      }
    }

    await prisma.restaurantOrderItem.update({
      where: { id: orderItemId },
      data: { recipeDeducted: true }
    });
  } catch (err) {
    console.error(`Error deducting recipe for item ${orderItemId}:`, err);
  }
}

async function restoreRecipeForOrderItem(orderItemId: string, branchId: string) {
  try {
    const item = await prisma.restaurantOrderItem.findUnique({
      where: { id: orderItemId },
      include: {
        product: {
          include: {
            Recipe: {
              include: { ingredients: true }
            }
          }
        },
        modifiers: true,
        order: { include: { table: true } }
      }
    });

    if (!item || !item.recipeDeducted) return;

    if (item.product.Recipe && item.product.Recipe.ingredients.length > 0) {
      for (const ing of item.product.Recipe.ingredients) {
        const qtyToRestore = Math.round(ing.quantity * item.quantity);
        if (qtyToRestore > 0) {
          await prisma.product.update({
            where: { id: ing.productId },
            data: { stock: { increment: qtyToRestore } }
          });

          await prisma.inventoryMovement.create({
            data: {
              productId: ing.productId,
              type: 'IN',
              quantity: qtyToRestore,
              reason: `Cancelación ítem comanda: Mesa ${item.order.table.name} (Platillo: ${item.product.name} x${item.quantity})`
            }
          });
        }
      }
    } else {
      if (item.product.stock !== undefined) {
        await prisma.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } }
        });
      }
    }

    for (const mod of item.modifiers) {
      if (mod.ingredientProductId && mod.ingredientQty) {
        const modQty = Math.round(mod.ingredientQty * item.quantity);
        if (modQty > 0) {
          await prisma.product.update({
            where: { id: mod.ingredientProductId },
            data: { stock: { increment: modQty } }
          });
        }
      }
    }

    await prisma.restaurantOrderItem.update({
      where: { id: orderItemId },
      data: { recipeDeducted: false }
    });
  } catch (err) {
    console.error(`Error restoring recipe for item ${orderItemId}:`, err);
  }
}

async function updateDishCostFromRecipe(productId: string, ingredients: Array<{ productId: string; quantity: number }>) {
  try {
    let totalCost = 0;
    for (const ing of ingredients) {
      const ingProd = await prisma.product.findUnique({
        where: { id: ing.productId },
        select: { cost: true, averageCost: true }
      });
      const cost = (ingProd?.averageCost && ingProd.averageCost > 0) ? ingProd.averageCost : (ingProd?.cost || 0);
      totalCost += (cost * ing.quantity);
    }

    if (totalCost > 0) {
      await prisma.product.update({
        where: { id: productId },
        data: { cost: totalCost, averageCost: totalCost }
      });
    }
  } catch (err) {
    console.error(`Error updating cost from recipe for product ${productId}:`, err);
  }
}
