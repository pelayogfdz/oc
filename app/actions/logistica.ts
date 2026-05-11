'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getActiveUser } from "./auth";

export async function updateDeliveryOrder(id: string, data: { status?: string, driverId?: string }) {
  try {
    const user = await getActiveUser();
    if (!user) throw new Error("No autenticado");

    const updateData: any = {};
    if (data.status) updateData.status = data.status;
    
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
    return { success: true, order };
  } catch (error: any) {
    console.error("Error updating delivery order:", error);
    return { success: false, error: error.message || "Error al actualizar pedido" };
  }
}
