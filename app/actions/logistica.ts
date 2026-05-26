'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getActiveUser } from "./auth";

export async function updateDeliveryOrder(
  id: string, 
  data: { 
    status?: string; 
    driverId?: string; 
    lat?: number; 
    lng?: number; 
    routeOrder?: number;
  }
) {
  try {
    const user = await getActiveUser();
    if (!user) throw new Error("No autenticado");

    const updateData: any = {};
    if (data.status) updateData.status = data.status;
    if (data.lat !== undefined) updateData.lat = data.lat;
    if (data.lng !== undefined) updateData.lng = data.lng;
    if (data.routeOrder !== undefined) updateData.routeOrder = data.routeOrder;
    
    // Allow unassigning driver if driverId is empty string, else connect
    if (data.driverId !== undefined) {
      if (data.driverId === '') {
        updateData.driver = { disconnect: true };
      } else {
        updateData.driverId = data.driverId;
      }
    }

    const order = await prisma.deliveryOrder.update({
      where: { id },
      data: updateData
    });

    revalidatePath('/logistica');
    revalidatePath('/logistica/chofer');
    return { success: true, order };
  } catch (error: any) {
    console.error("Error updating delivery order:", error);
    return { success: false, error: error.message || "Error al actualizar pedido" };
  }
}

export async function updateRouteSequence(orders: { id: string; routeOrder: number }[]) {
  try {
    const user = await getActiveUser();
    if (!user) throw new Error("No autenticado");

    await prisma.$transaction(
      orders.map(o => prisma.deliveryOrder.update({
        where: { id: o.id },
        data: { routeOrder: o.routeOrder }
      }))
    );

    revalidatePath('/logistica');
    revalidatePath('/logistica/chofer');
    return { success: true };
  } catch (error: any) {
    console.error("Error updating route sequence:", error);
    return { success: false, error: error.message || "Error al actualizar la secuencia de la ruta" };
  }
}

