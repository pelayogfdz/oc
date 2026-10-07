"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getRecentQuotes(tenantId: string) {
  if (!tenantId) return [];
  return await prisma.quote.findMany({
    where: { 
      branch: { tenantId } 
    },
    include: {
      customer: true
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 10
  });
}

export async function searchCustomers(query: string, tenantId: string) {
  if (!tenantId) return [];
  const cleanQuery = (query || "").trim();
  if (!cleanQuery) {
    return await prisma.customer.findMany({
      where: { 
        branch: { tenantId } 
      },
      orderBy: { updatedAt: 'desc' },
      take: 15
    });
  }
  return await prisma.customer.findMany({
    where: {
      branch: { tenantId },
      OR: [
        { name: { contains: cleanQuery, mode: 'insensitive' } },
        { legalName: { contains: cleanQuery, mode: 'insensitive' } },
        { taxId: { contains: cleanQuery, mode: 'insensitive' } },
        { phone: { contains: cleanQuery, mode: 'insensitive' } },
        { email: { contains: cleanQuery, mode: 'insensitive' } },
      ]
    },
    orderBy: { updatedAt: 'desc' },
    take: 15
  });
}

export async function assignCustomerToProspect(prospectId: string, customerId: string | null) {
  try {
    const updated = await prisma.prospect.update({
      where: { id: prospectId },
      data: { customerId: customerId || null },
      include: {
        customer: true,
        assignedUser: true
      }
    });
    try {
      revalidatePath('/ventas/whatsapp');
      revalidatePath(`/ventas/prospeccion`);
    } catch (revErr) {
      console.warn("revalidatePath warning:", revErr);
    }
    return { success: true, prospect: updated };
  } catch (error: any) {
    console.error("Error in assignCustomerToProspect:", error);
    return { success: false, error: error?.message || "Error al asignar cliente" };
  }
}
