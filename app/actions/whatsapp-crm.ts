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
  return await prisma.customer.findMany({
    where: {
      branch: { tenantId },
      name: {
        contains: query,
        mode: 'insensitive'
      }
    },
    take: 5
  });
}

export async function assignCustomerToProspect(prospectId: string, customerId: string) {
  await prisma.prospect.update({
    where: { id: prospectId },
    data: { customerId }
  });
  revalidatePath('/ventas/whatsapp');
  revalidatePath(`/ventas/prospeccion`);
  return { success: true };
}
