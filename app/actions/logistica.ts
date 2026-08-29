'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getActiveUser } from "./auth";

export async function updateDeliveryOrder(
  id: string, 
  data: { 
    status?: string; 
    driverId?: string | null; 
    lat?: number; 
    lng?: number; 
    routeOrder?: number;
    maxDeliveryTime?: string | null;
    deliveryDate?: string | Date | null;
    street?: string | null;
    exteriorNumber?: string | null;
    interiorNumber?: string | null;
    neighborhood?: string | null;
    city?: string | null;
    state?: string | null;
    zipCode?: string | null;
    notes?: string | null;
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
    if (data.exteriorNumber !== undefined) updateData.exteriorNumber = data.exteriorNumber;
    if (data.interiorNumber !== undefined) updateData.interiorNumber = data.interiorNumber;
    if (data.neighborhood !== undefined) updateData.neighborhood = data.neighborhood;
    if (data.city !== undefined) updateData.city = data.city;
    if (data.state !== undefined) updateData.state = data.state;
    if (data.zipCode !== undefined) updateData.zipCode = data.zipCode;
    if (data.notes !== undefined) updateData.notes = data.notes;
    
    if (data.deliveryDate !== undefined) {
      if (data.deliveryDate) {
        updateData.deliveryDate = typeof data.deliveryDate === 'string' 
          ? new Date(data.deliveryDate.includes('T') ? data.deliveryDate : `${data.deliveryDate}T12:00:00`)
          : data.deliveryDate;
      } else {
        updateData.deliveryDate = null;
      }
    }
    
    // Allow unassigning driver if driverId is empty or null, else connect
    if (data.driverId !== undefined) {
      if (!data.driverId || data.driverId === '') {
        updateData.driver = { disconnect: true };
        if (!data.status) {
          updateData.status = 'PENDING';
        }
      } else {
        updateData.driverId = data.driverId;
        if (!data.status || data.status === 'PENDING') {
          updateData.status = 'IN_PROGRESS';
        }
      }
    }

    const order = await prisma.deliveryOrder.update({
      where: { id },
      data: updateData
    });

    revalidatePath('/ventas');
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
  deliveryDate?: string | Date;
  driverId?: string | null;
  notes?: string;
  status?: string;
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

    let finalDeliveryDate: Date | null = null;
    if (data.deliveryDate) {
      finalDeliveryDate = typeof data.deliveryDate === 'string'
        ? new Date(data.deliveryDate.includes('T') ? data.deliveryDate : `${data.deliveryDate}T12:00:00`)
        : data.deliveryDate;
    }

    const initialStatus = data.status || (data.driverId ? "IN_PROGRESS" : "PENDING");

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
        deliveryDate: finalDeliveryDate,
        driverId: data.driverId || null,
        notes: data.notes || null,
        branchId: branchId,
        status: initialStatus
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

export async function upsertDeliveryOrderForSale(
  saleId: string,
  data: {
    street?: string;
    exteriorNumber?: string;
    interiorNumber?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    notes?: string;
    deliveryDate?: string | null;
    maxDeliveryTime?: string | null;
    driverId?: string | null;
    status?: string;
  }
) {
  try {
    const user = await getActiveUser();
    if (!user) throw new Error("No autenticado");

    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: { deliveryOrder: true }
    });

    if (!sale) throw new Error("Venta no encontrada");
    if (!sale.branchId) throw new Error("La sucursal de la venta no es válida");

    let finalDeliveryDate: Date | null = null;
    if (data.deliveryDate) {
      finalDeliveryDate = new Date(data.deliveryDate.includes('T') ? data.deliveryDate : `${data.deliveryDate}T12:00:00`);
    }

    if (sale.deliveryOrder) {
      // Update existing
      const updateData: any = {
        street: data.street || null,
        exteriorNumber: data.exteriorNumber || null,
        interiorNumber: data.interiorNumber || null,
        neighborhood: data.neighborhood || null,
        city: data.city || null,
        state: data.state || null,
        zipCode: data.zipCode || null,
        notes: data.notes || null,
        deliveryDate: finalDeliveryDate,
        maxDeliveryTime: data.maxDeliveryTime || null
      };

      if (data.status) {
        updateData.status = data.status;
      } else if (data.driverId && sale.deliveryOrder.status === 'PENDING') {
        updateData.status = 'IN_PROGRESS';
      }

      if (data.driverId !== undefined) {
        if (!data.driverId || data.driverId === '') {
          updateData.driver = { disconnect: true };
        } else {
          updateData.driverId = data.driverId;
        }
      }

      const updated = await prisma.deliveryOrder.update({
        where: { id: sale.deliveryOrder.id },
        data: updateData
      });

      revalidatePath('/ventas');
      revalidatePath(`/ventas/detalle/${saleId}`);
      revalidatePath('/logistica');
      return { success: true, order: updated };
    } else {
      // Create new
      const initialStatus = data.status || (data.driverId ? "IN_PROGRESS" : "PENDING");
      const created = await prisma.deliveryOrder.create({
        data: {
          saleId: sale.id,
          branchId: sale.branchId,
          street: data.street || null,
          exteriorNumber: data.exteriorNumber || null,
          interiorNumber: data.interiorNumber || null,
          neighborhood: data.neighborhood || null,
          city: data.city || null,
          state: data.state || null,
          zipCode: data.zipCode || null,
          notes: data.notes || null,
          deliveryDate: finalDeliveryDate,
          maxDeliveryTime: data.maxDeliveryTime || null,
          driverId: data.driverId || null,
          status: initialStatus
        }
      });

      revalidatePath('/ventas');
      revalidatePath(`/ventas/detalle/${saleId}`);
      revalidatePath('/logistica');
      return { success: true, order: created };
    }
  } catch (error: any) {
    console.error("Error in upsertDeliveryOrderForSale:", error);
    return { success: false, error: error.message || "Error al guardar el envío a domicilio" };
  }
}

export async function deleteDeliveryOrder(id: string) {
  try {
    const user = await getActiveUser();
    if (!user) throw new Error("No autenticado");

    await prisma.deliveryOrder.delete({
      where: { id }
    });

    revalidatePath('/ventas');
    revalidatePath('/logistica');
    revalidatePath('/logistica/chofer');
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting delivery order:", error);
    return { success: false, error: error.message || "Error al eliminar orden de entrega" };
  }
}
