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

export async function getCustomerCrmDetails(customerId: string) {
  if (!customerId) return null;
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        quotes: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            folio: true,
            total: true,
            status: true,
            createdAt: true,
          }
        },
        sales: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            folio: true,
            total: true,
            status: true,
            paymentMethod: true,
            createdAt: true,
          }
        }
      }
    });
    return customer;
  } catch (error) {
    console.error("Error in getCustomerCrmDetails:", error);
    return null;
  }
}

export async function createCustomerFromProspect(
  prospectId: string, 
  customData?: { name?: string; phone?: string; email?: string; taxId?: string; legalName?: string }
) {
  try {
    const prospect = await prisma.prospect.findUnique({ where: { id: prospectId } });
    if (!prospect) {
      return { success: false, error: "Prospecto no encontrado" };
    }

    const customerName = customData?.name?.trim() || prospect.name;
    const customerPhone = customData?.phone?.trim() || prospect.phone || "";
    const customerEmail = customData?.email?.trim() || prospect.email || `prospect_${prospect.id.substring(0, 8)}@temp.com`;
    const customerTaxId = customData?.taxId?.trim() || "XAXX010101000";
    const customerLegalName = customData?.legalName?.trim() || customerName;

    const newCustomer = await prisma.customer.create({
      data: {
        name: customerName,
        legalName: customerLegalName,
        phone: customerPhone,
        email: customerEmail,
        taxId: customerTaxId,
        branchId: prospect.branchId,
        creditLimit: 0,
        creditDays: 0,
        creditBalance: 0,
        storeCredit: 0
      }
    });

    const updatedProspect = await prisma.prospect.update({
      where: { id: prospectId },
      data: { customerId: newCustomer.id },
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

    return { success: true, customer: newCustomer, prospect: updatedProspect };
  } catch (error: any) {
    console.error("Error creating customer from prospect:", error);
    return { success: false, error: error?.message || "Error al crear cliente" };
  }
}

