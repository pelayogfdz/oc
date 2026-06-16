'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getActiveBranch } from "./auth";
import * as jose from "jose";


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
          isActive: true,
          pointsCash: 1.0,
          pointsCard: 1.0,
          pointsTransfer: 1.0,
          pointsCredit: 0.0,
          pointsMixto: 1.0,
          pointValueInPesos: 1.0
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

    const pointsCash = parseFloat(formData.get("pointsCash") as string || "1.0");
    const pointsCard = parseFloat(formData.get("pointsCard") as string || "1.0");
    const pointsTransfer = parseFloat(formData.get("pointsTransfer") as string || "1.0");
    const pointsCredit = parseFloat(formData.get("pointsCredit") as string || "0.0");
    const pointsMixto = parseFloat(formData.get("pointsMixto") as string || "1.0");
    const pointValueInPesos = parseFloat(formData.get("pointValueInPesos") as string || "1.0");

    await prisma.loyaltySettings.upsert({
      where: { branchId },
      update: {
        pointsPerAmount,
        amountStep,
        validityDays,
        isActive,
        paymentMethods,
        pointsCash,
        pointsCard,
        pointsTransfer,
        pointsCredit,
        pointsMixto,
        pointValueInPesos
      },
      create: {
        branchId,
        pointsPerAmount,
        amountStep,
        validityDays,
        isActive,
        paymentMethods,
        pointsCash,
        pointsCard,
        pointsTransfer,
        pointsCredit,
        pointsMixto,
        pointValueInPesos
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

export async function getGoogleWalletSettings(branchId: string) {
  try {
    const settings = await prisma.branchSettings.findUnique({
      where: { branchId }
    });

    if (!settings || !settings.configJson) {
      return {
        success: true,
        settings: {
          enabled: false,
          issuerId: '',
          classId: '',
          clientEmail: '',
          privateKey: ''
        }
      };
    }

    let config: any = {};
    try {
      config = JSON.parse(settings.configJson);
    } catch (e) {
      // Ignorar error de parseo
    }

    const walletSettings = config.googleWallet || {
      enabled: false,
      issuerId: '',
      classId: '',
      clientEmail: '',
      privateKey: ''
    };

    return { success: true, settings: walletSettings };
  } catch (error: any) {
    return { success: false, error: error.message || String(error) };
  }
}

export async function saveGoogleWalletSettings(branchId: string, walletData: any) {
  try {
    const settings = await prisma.branchSettings.findUnique({
      where: { branchId }
    });

    let currentJson: any = {};
    if (settings && settings.configJson) {
      try {
        currentJson = JSON.parse(settings.configJson);
      } catch (e) {
        // Ignorar
      }
    }

    currentJson.googleWallet = {
      enabled: walletData.enabled === true || walletData.enabled === 'true' || walletData.enabled === 'on',
      issuerId: (walletData.issuerId || '').trim(),
      classId: (walletData.classId || '').trim(),
      clientEmail: (walletData.clientEmail || '').trim(),
      privateKey: (walletData.privateKey || '').trim()
    };

    await prisma.branchSettings.upsert({
      where: { branchId },
      update: {
        configJson: JSON.stringify(currentJson)
      },
      create: {
        branchId,
        configJson: JSON.stringify(currentJson)
      }
    });

    revalidatePath("/preferencias/puntos");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || String(error) };
  }
}

export async function generateGoogleWalletPassUrl(customerId: string) {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId }
    });

    if (!customer) {
      return { success: false, error: "Cliente no encontrado" };
    }

    // Determinar la sucursal de la que se obtienen los datos
    const branchId = customer.branchId;
    if (!branchId) {
      return { success: false, error: "El cliente no está asociado a ninguna sucursal" };
    }

    const settings = await prisma.branchSettings.findUnique({
      where: { branchId }
    });

    if (!settings || !settings.configJson) {
      return { success: false, error: "No se encontró configuración para esta sucursal" };
    }

    let config: any = {};
    try {
      config = JSON.parse(settings.configJson);
    } catch (e) {
      return { success: false, error: "Error al leer la configuración de la sucursal" };
    }

    const walletConfig = config.googleWallet;
    if (!walletConfig || !walletConfig.enabled) {
      return { success: false, error: "Google Wallet no está activo para esta sucursal" };
    }

    const { issuerId, classId, clientEmail, privateKey } = walletConfig;
    if (!issuerId || !classId || !clientEmail || !privateKey) {
      return { success: false, error: "Configuración de Google Wallet incompleta" };
    }

    // Sanitizar llave privada
    const formattedPrivateKey = privateKey.replace(/\\n/g, '\n').replace(/\r/g, '').trim();

    // Importar la llave privada PKCS8 usando jose
    const pkey = await jose.importPKCS8(formattedPrivateKey, 'RS256');

    // Configurar identificadores
    const fullClassId = classId.includes('.') ? classId : `${issuerId}.${classId}`;
    const sanitizedCustomerId = customerId.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
    const fullObjectId = `${issuerId}.${sanitizedCustomerId}`;

    // Crear el payload del JWT de acuerdo con las especificaciones de Google Wallet
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: clientEmail,
      aud: 'google',
      typ: 'savetowallet',
      iat: now,
      payload: {
        loyaltyObjects: [
          {
            id: fullObjectId,
            classId: fullClassId,
            state: 'ACTIVE',
            barcode: {
              type: 'QR_CODE',
              value: customer.id
            },
            accountId: customer.id,
            accountName: customer.name,
            loyaltyPoints: {
              balance: {
                double: customer.pointsBalance
              },
              label: 'Puntos'
            },
            textModulesData: [
              {
                header: 'Monedero / Crédito',
                body: `$${customer.storeCredit.toFixed(2)}`,
                id: 'store_credit'
              }
            ]
          }
        ]
      }
    };

    const jwt = await new jose.SignJWT(payload)
      .setProtectedHeader({ alg: 'RS256' })
      .sign(pkey);

    const url = `https://pay.google.com/gp/v/save/${jwt}`;
    return { success: true, url };
  } catch (error: any) {
    console.error("Error generating Google Wallet URL:", error);
    return { success: false, error: error.message || String(error) };
  }
}

