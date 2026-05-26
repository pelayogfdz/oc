'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getActiveBranch } from "./auth";

export async function getLoyaltySettings(branchId: string) {
  try {
    let settings = await prisma.loyaltySettings.findUnique({
      where: { branchId }
    });

    if (!settings) {
      // Create default settings if none exist
      settings = await prisma.loyaltySettings.create({
        data: {
          branchId,
          pointsPerAmount: 1.0,
          amountStep: 100.0,
          paymentMethods: "CASH,CARD,TRANSFER",
          validityDays: 365,
          isActive: true
        }
      });
    }

    return { success: true, settings };
  } catch (error: any) {
    return { success: false, error: error.message || String(error) };
  }
}

export async function saveLoyaltySettings(branchId: string, formData: FormData) {
  try {
    const pointsPerAmount = parseFloat(formData.get("pointsPerAmount") as string || "0");
    const amountStep = parseFloat(formData.get("amountStep") as string || "0");
    const validityDays = parseInt(formData.get("validityDays") as string || "0");
    const isActive = formData.get("isActive") === "on";

    // Gather selected payment methods
    const methods: string[] = [];
    if (formData.get("method_CASH") === "on") methods.push("CASH");
    if (formData.get("method_CARD") === "on") methods.push("CARD");
    if (formData.get("method_TRANSFER") === "on") methods.push("TRANSFER");
    if (formData.get("method_CREDIT") === "on") methods.push("CREDIT");
    if (formData.get("method_MIXTO") === "on") methods.push("MIXTO");
    const paymentMethods = methods.join(",");

    await prisma.loyaltySettings.upsert({
      where: { branchId },
      update: {
        pointsPerAmount,
        amountStep,
        validityDays,
        isActive,
        paymentMethods
      },
      create: {
        branchId,
        pointsPerAmount,
        amountStep,
        validityDays,
        isActive,
        paymentMethods
      }
    });

    revalidatePath("/preferencias/puntos");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || String(error) };
  }
}

export async function getLoyaltyTransactions(customerId: string) {
  try {
    const transactions = await prisma.loyaltyTransaction.findMany({
      where: { customerId },
      orderBy: { createdAt: "desc" }
    });
    return { success: true, transactions };
  } catch (error: any) {
    return { success: false, error: error.message || String(error) };
  }
}

export async function adjustCustomerPoints(customerId: string, points: number, reason: string) {
  try {
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new Error("Cliente no encontrado");

    const newBalance = Math.max(0, customer.pointsBalance + points);
    
    // Update balance
    await prisma.customer.update({
      where: { id: customerId },
      data: {
        pointsBalance: newBalance,
        // Set expiry to 1 year from now if points increased
        pointsExpiryDate: points > 0 ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) : customer.pointsExpiryDate
      }
    });

    // Create transaction record
    await prisma.loyaltyTransaction.create({
      data: {
        customerId,
        type: points >= 0 ? "EARNED" : "REDEEMED",
        points: Math.abs(points),
        reason: `${reason} (Ajuste administrativo)`
      }
    });

    revalidatePath("/clientes");
    revalidatePath(`/clientes/${customerId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || String(error) };
  }
}
