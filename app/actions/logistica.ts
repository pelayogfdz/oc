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
    shippingDate?: string | Date | null;
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

    if (data.shippingDate !== undefined) {
      if (data.shippingDate) {
        updateData.shippingDate = typeof data.shippingDate === 'string' 
          ? new Date(data.shippingDate.includes('T') ? data.shippingDate : `${data.shippingDate}T12:00:00`)
          : data.shippingDate;
      } else {
        updateData.shippingDate = null;
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
  shippingDate?: string | Date;
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

    let finalShippingDate: Date | null = null;
    if (data.shippingDate) {
      finalShippingDate = typeof data.shippingDate === 'string'
        ? new Date(data.shippingDate.includes('T') ? data.shippingDate : `${data.shippingDate}T12:00:00`)
        : data.shippingDate;
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
        shippingDate: finalShippingDate,
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
    shippingDate?: string | null;
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

    let finalShippingDate: Date | null = null;
    if (data.shippingDate) {
      finalShippingDate = new Date(data.shippingDate.includes('T') ? data.shippingDate : `${data.shippingDate}T12:00:00`);
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
        shippingDate: finalShippingDate,
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
          shippingDate: finalShippingDate,
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

export async function addTransferToRouteByQr(params: {
  code: string;
  selectedDestinationBranchId?: string | null;
  driverId?: string | null;
  shippingDate?: string | null;
  deliveryDate?: string | null;
  maxDeliveryTime?: string | null;
  forceMismatch?: boolean;
}) {
  try {
    const user = await getActiveUser();
    if (!user) throw new Error("No autenticado");

    const rawCode = (params.code || "").trim();
    if (!rawCode) {
      return { success: false, error: "El código escaneado está vacío." };
    }

    // 1. Extraer ID del traspaso si viene en formato URL o path relativo
    let searchId = rawCode;
    const urlMatch = rawCode.match(/\/productos\/traspasos\/([a-zA-Z0-9_-]+)/);
    if (urlMatch && urlMatch[1]) {
      searchId = urlMatch[1].trim();
    }

    // Limpiar posibles prefijos como "#" o espacios
    const cleanSearch = searchId.replace(/^#/, "").trim();

    // 2. Buscar el traspaso en la base de datos
    const transfer = await prisma.transfer.findFirst({
      where: {
        OR: [
          { id: cleanSearch },
          { folio: cleanSearch },
          { folio: { equals: cleanSearch, mode: 'insensitive' } },
          { folio: { equals: `TR-${cleanSearch}`, mode: 'insensitive' } },
          { folio: rawCode },
          { id: { startsWith: cleanSearch } }
        ]
      },
      include: {
        branch: {
          include: {
            hrLocation: true
          }
        },
        toBranch: {
          include: {
            hrLocation: true
          }
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true
              }
            },
            variant: true
          }
        },
        deliveryOrder: {
          include: {
            driver: true
          }
        }
      }
    });

    if (!transfer) {
      return {
        success: false,
        error: `No se encontró ningún traspaso con el código o folio: "${rawCode}". Verifica que la etiqueta sea correcta.`
      };
    }

    // 3. Validar tenant (seguridad multi-tenant)
    const userTenantId = user.tenantId;
    const transferTenantId = transfer.branch?.tenantId || transfer.toBranch?.tenantId;
    if (transferTenantId && userTenantId && transferTenantId !== userTenantId) {
      return { success: false, error: "El traspaso no pertenece a tu organización." };
    }

    // 4. Validar sucursal destino seleccionada (prevención de errores de carga)
    if (
      params.selectedDestinationBranchId &&
      params.selectedDestinationBranchId !== 'ALL' &&
      params.selectedDestinationBranchId !== '' &&
      !params.forceMismatch
    ) {
      if (transfer.toBranchId !== params.selectedDestinationBranchId) {
        return {
          success: false,
          mismatch: true,
          error: `⚠️ Este traspaso (Folio #${transfer.folio || transfer.id.slice(0, 8)}) tiene como destino la sucursal "${transfer.toBranch?.name || 'Otra'}", diferente a la sucursal seleccionada.`,
          transfer: {
            id: transfer.id,
            folio: transfer.folio,
            toBranchId: transfer.toBranchId,
            actualDestinationBranchName: transfer.toBranch?.name || 'Desconocida',
            originBranchName: transfer.branch?.name || 'Central',
            totalItems: transfer.items.reduce((acc, curr) => acc + curr.quantity, 0)
          }
        };
      }
    }

    // 5. Preparar fechas
    let finalDeliveryDate: Date | null = null;
    if (params.deliveryDate) {
      finalDeliveryDate = typeof params.deliveryDate === 'string'
        ? new Date(params.deliveryDate.includes('T') ? params.deliveryDate : `${params.deliveryDate}T12:00:00`)
        : params.deliveryDate;
    } else {
      finalDeliveryDate = new Date();
    }

    let finalShippingDate: Date | null = null;
    if (params.shippingDate) {
      finalShippingDate = typeof params.shippingDate === 'string'
        ? new Date(params.shippingDate.includes('T') ? params.shippingDate : `${params.shippingDate}T12:00:00`)
        : params.shippingDate;
    } else {
      finalShippingDate = new Date();
    }

    // 6. Obtener dirección y coordenadas GPS de la sucursal destino
    const destinationAddress = transfer.toBranch?.location || `Sucursal ${transfer.toBranch?.name || 'Destino'}`;
    const destinationNeighborhood = transfer.toBranch?.name || null;
    const lat = transfer.toBranch?.hrLocation?.lat || null;
    const lng = transfer.toBranch?.hrLocation?.lng || null;

    // 7. Si ya tiene DeliveryOrder, sincronizarla
    if (transfer.deliveryOrder) {
      const updateData: any = {};
      if (params.driverId !== undefined) {
        if (!params.driverId || params.driverId === '') {
          updateData.driver = { disconnect: true };
        } else {
          updateData.driverId = params.driverId;
          if (transfer.deliveryOrder.status === 'PENDING') {
            updateData.status = 'IN_PROGRESS';
          }
        }
      }
      if (!transfer.deliveryOrder.lat && lat) updateData.lat = lat;
      if (!transfer.deliveryOrder.lng && lng) updateData.lng = lng;
      if (!transfer.deliveryOrder.street && destinationAddress) updateData.street = destinationAddress;
      if (params.maxDeliveryTime) updateData.maxDeliveryTime = params.maxDeliveryTime;

      const updated = await prisma.deliveryOrder.update({
        where: { id: transfer.deliveryOrder.id },
        data: updateData,
        include: {
          transfer: {
            include: {
              branch: true,
              toBranch: true,
              items: {
                include: {
                  product: true,
                  variant: true
                }
              }
            }
          },
          driver: true
        }
      });

      revalidatePath('/logistica');
      revalidatePath('/logistica/chofer');
      revalidatePath('/productos/traspasos');

      return {
        success: true,
        isExisting: true,
        order: updated,
        transfer: {
          id: transfer.id,
          folio: transfer.folio,
          originBranchName: transfer.branch?.name,
          destinationBranchName: transfer.toBranch?.name,
          totalItems: transfer.items.reduce((acc, curr) => acc + curr.quantity, 0)
        },
        message: `El traspaso #${transfer.folio || transfer.id.slice(0, 8)} ya estaba en la ruta y se ha actualizado.`
      };
    }

    // 8. Crear nueva DeliveryOrder
    const finalBranchId = transfer.branchId || transfer.toBranchId || user.branchId || "GLOBAL";
    const maxOrder = await prisma.deliveryOrder.aggregate({
      where: { branchId: finalBranchId },
      _max: { routeOrder: true }
    });
    const nextRouteOrder = (maxOrder?._max?.routeOrder || 0) + 1;

    const initialStatus = params.driverId ? "IN_PROGRESS" : "PENDING";

    const newOrder = await prisma.deliveryOrder.create({
      data: {
        transferId: transfer.id,
        branchId: finalBranchId, // Sucursal origen que despacha
        driverId: params.driverId || null,
        status: initialStatus,
        street: destinationAddress,
        neighborhood: destinationNeighborhood,
        city: 'Querétaro',
        lat,
        lng,
        deliveryDate: finalDeliveryDate,
        shippingDate: finalShippingDate,
        maxDeliveryTime: params.maxDeliveryTime || null,
        routeOrder: nextRouteOrder
      },
      include: {
        transfer: {
          include: {
            branch: true,
            toBranch: true,
            items: {
              include: {
                product: true,
                variant: true
              }
            }
          }
        },
        driver: true
      }
    });

    revalidatePath('/logistica');
    revalidatePath('/logistica/chofer');
    revalidatePath('/productos/traspasos');

    return {
      success: true,
      isNew: true,
      order: newOrder,
      transfer: {
        id: transfer.id,
        folio: transfer.folio,
        originBranchName: transfer.branch?.name,
        destinationBranchName: transfer.toBranch?.name,
        totalItems: transfer.items.reduce((acc, curr) => acc + curr.quantity, 0)
      },
      message: `¡Traspaso #${transfer.folio || transfer.id.slice(0, 8)} añadido a la ruta exitosamente!`
    };
  } catch (error: any) {
    console.error("Error adding transfer to route by QR:", error);
    return { success: false, error: error.message || "Error al procesar el código de traspaso." };
  }
}
