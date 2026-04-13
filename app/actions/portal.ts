'use server';
import { prisma } from "@/lib/prisma";

export async function searchTicket(ticketId: string) {
  try {
    const sale = await prisma.sale.findFirst({
      where: {
        OR: [
          { id: ticketId },
          { id: { endsWith: ticketId.toLowerCase() } },
          { id: { endsWith: ticketId } }
        ]
      },
      include: { items: { include: { product: true } } }
    });

    if (!sale) return { error: "Ticket no encontrado. Verifica el folio." };
    if (sale.status !== "COMPLETED") return { error: "El ticket no es válido para facturación fiscal." };

    return { sale };
  } catch (error) {
    return { error: "Error de servidor al buscar el ticket." };
  }
}

import { stampInvoice } from "./facturacion";

export async function generateInvoice(ticketId: string, taxData: any) {
  try {
    const sale = await prisma.sale.findUnique({
      where: { id: ticketId }
    });

    if (!sale) return { error: "Ticket inválido." };
    if (sale.invoiceId) return { error: "El ticket ya fue facturado." };

    // Update or create a basic customer on the fly to hold the tax data
    const customer = await prisma.customer.create({
      data: {
         name: taxData.legalName,
         legalName: taxData.legalName,
         taxId: taxData.rfc,
         email: taxData.email,
         zipCode: taxData.zipCode,
         taxRegime: taxData.taxRegime,
         cfdiUse: taxData.cfdiUse,
         branchId: sale.branchId
      }
    });

    // Link customer to sale
    await prisma.sale.update({
       where: { id: ticketId },
       data: { customerId: customer.id }
    });

    // Let the central CFDI function do the heavy lifting
    const facturapiResult = await stampInvoice(ticketId);

    if (!facturapiResult.success) {
      return { error: facturapiResult.error };
    }

    return { success: true, invoiceId: facturapiResult.invoiceId };
  } catch (error: any) {
    return { error: error.message || "Error al facturar." };
  }
}
