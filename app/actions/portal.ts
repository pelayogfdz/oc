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

export async function generateInvoice(ticketId: string, taxData: any) {
  try {
    // Simulamos la generación y timbrado de un CFDI (Factura electrónica)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Devolvemos exito puro mock, aunque podríamos registrar que el sale ya está facturado si agregáramos
    // el booleano isBilled al modelo Sale en un caso robusto.
    return { success: true };
  } catch (error) {
    return { error: "Error al generar y sellar la factura." };
  }
}
