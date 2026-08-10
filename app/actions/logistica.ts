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
    maxDeliveryTime?: string | null;
    street?: string | null;
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
    if (data.maxDeliveryTime !== undefined) updateData.maxDeliveryTime = data.maxDeliveryTime;
    if (data.street !== undefined) updateData.street = data.street;
    
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

    await prisma.$transaction(async (tx) => {
      for (const o of orders) {
        await tx.deliveryOrder.update({
          where: { id: o.id },
          data: { routeOrder: o.routeOrder }
        });
      }
    });

    revalidatePath('/logistica');
    revalidatePath('/logistica/chofer');
    return { success: true };
  } catch (error: any) {
    console.error("Error updating route sequence:", error);
    return { success: false, error: error.message || "Error al actualizar la secuencia de la ruta" };
  }
}

export async function createDeliveryOrder(data: {
  saleId?: string;
  transferId?: string;
  street?: string;
  exteriorNumber?: string;
  interiorNumber?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  lat?: number;
  lng?: number;
  maxDeliveryTime?: string;
}) {
  try {
    const user = await getActiveUser();
    if (!user) throw new Error("No autenticado");

    let branchId = "";
    if (data.saleId) {
      const sale = await prisma.sale.findUnique({
        where: { id: data.saleId }
      });
      if (!sale) throw new Error("Venta no encontrada");
      if (!sale.branchId) throw new Error("La sucursal de la venta no es válida");
      branchId = sale.branchId;
    } else if (data.transferId) {
      const transfer = await prisma.transfer.findUnique({
        where: { id: data.transferId }
      });
      if (!transfer) throw new Error("Traspaso no encontrado");
      if (!transfer.branchId) throw new Error("La sucursal del traspaso no es válida");
      branchId = transfer.branchId;
    } else {
      throw new Error("Debes proporcionar un ID de venta o de traspaso");
    }

    const order = await prisma.deliveryOrder.create({
      data: {
        saleId: data.saleId || null,
        transferId: data.transferId || null,
        street: data.street || null,
        exteriorNumber: data.exteriorNumber || null,
        interiorNumber: data.interiorNumber || null,
        neighborhood: data.neighborhood || null,
        city: data.city || null,
        state: data.state || null,
        zipCode: data.zipCode || null,
        lat: data.lat || null,
        lng: data.lng || null,
        maxDeliveryTime: data.maxDeliveryTime || null,
        branchId: branchId,
        status: "PENDING"
      }
    });

    revalidatePath('/ventas');
    revalidatePath('/productos/traspasos');
    revalidatePath('/logistica');
    return { success: true, order };
  } catch (error: any) {
    console.error("Error creating delivery order:", error);
    return { success: false, error: error.message || "Error al crear la orden de entrega" };
  }
}

