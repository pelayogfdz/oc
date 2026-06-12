'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getActiveBranch } from "./auth";
import { updateAdvancedJSONConfig } from "./settings";

export type FuelLogisticsConfig = {
  defaultFuelPricePerLiter: number;
  defaultWearCostPerKm: number;
  defaultDriverCostPerKm: number;
  defaultVehicleKmPerLiter: number;
};

export async function getFuelLogisticsConfig(): Promise<FuelLogisticsConfig> {
  try {
    const branch = await getActiveBranch();
    if (!branch) {
      return {
        defaultFuelPricePerLiter: 0,
        defaultWearCostPerKm: 0,
        defaultDriverCostPerKm: 0,
        defaultVehicleKmPerLiter: 1.0,
      };
    }

    const settings = await prisma.branchSettings.findUnique({
      where: { branchId: branch.id }
    });

    if (settings?.configJson) {
      const parsed = JSON.parse(settings.configJson);
      if (parsed.logistica_combustible) {
        return {
          defaultFuelPricePerLiter: Number(parsed.logistica_combustible.defaultFuelPricePerLiter) || 0,
          defaultWearCostPerKm: Number(parsed.logistica_combustible.defaultWearCostPerKm) || 0,
          defaultDriverCostPerKm: Number(parsed.logistica_combustible.defaultDriverCostPerKm) || 0,
          defaultVehicleKmPerLiter: Number(parsed.logistica_combustible.defaultVehicleKmPerLiter) || 1.0,
        };
      }
    }
  } catch (error) {
    console.error("Error fetching fuel logistics config:", error);
  }

  return {
    defaultFuelPricePerLiter: 0,
    defaultWearCostPerKm: 0,
    defaultDriverCostPerKm: 0,
    defaultVehicleKmPerLiter: 1.0,
  };
}

export async function saveFuelLogisticsConfig(config: FuelLogisticsConfig) {
  try {
    await updateAdvancedJSONConfig("logistica_combustible", config);
    revalidatePath("/logistica/combustibles");
    return { success: true };
  } catch (error: any) {
    console.error("Error saving fuel logistics config:", error);
    return { success: false, error: error.message || "Error al guardar la configuración" };
  }
}

export async function getUnassociatedSales() {
  try {
    const branch = await getActiveBranch();
    if (!branch) return [];

    return await prisma.sale.findMany({
      where: {
        branchId: branch.id === 'GLOBAL' ? undefined : branch.id,
        fuelTransaction: null,
      },
      include: {
        customer: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  } catch (error) {
    console.error("Error fetching unassociated sales:", error);
    return [];
  }
}

export async function getUnassociatedPurchases() {
  try {
    const branch = await getActiveBranch();
    if (!branch) return [];

    return await prisma.purchase.findMany({
      where: {
        branchId: branch.id === 'GLOBAL' ? undefined : branch.id,
        fuelTransaction: null,
      },
      include: {
        supplier: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  } catch (error) {
    console.error("Error fetching unassociated purchases:", error);
    return [];
  }
}

export async function getFuelTransactions() {
  try {
    const branch = await getActiveBranch();
    if (!branch) return [];

    return await prisma.fuelTransaction.findMany({
      where: {
        branchId: branch.id === 'GLOBAL' ? undefined : branch.id,
      },
      include: {
        sale: {
          include: {
            customer: true,
          }
        },
        purchase: {
          include: {
            supplier: true,
          }
        },
        customer: true,
        supplier: true,
      },
      orderBy: { createdAt: 'desc' }
    });
  } catch (error) {
    console.error("Error fetching fuel transactions:", error);
    return [];
  }
}

function calculateCostsAndProfit(params: {
  distanceKm: number;
  fuelPricePerLiter: number;
  vehicleKmPerLiter: number;
  wearCostPerKm: number;
  driverCostPerKm: number;
  extraLogisticsCost: number;
  saleTotal: number;
  purchaseTotal: number;
}) {
  const fuelUsed = params.vehicleKmPerLiter > 0 ? (params.distanceKm / params.vehicleKmPerLiter) : 0;
  const fuelCost = fuelUsed * params.fuelPricePerLiter;
  const wearCost = params.distanceKm * params.wearCostPerKm;
  const driverCost = params.distanceKm * params.driverCostPerKm;
  
  const calculatedLogisticsCost = fuelCost + wearCost + driverCost + params.extraLogisticsCost;
  const calculatedNetProfit = params.saleTotal - params.purchaseTotal - calculatedLogisticsCost;

  return {
    calculatedLogisticsCost,
    calculatedNetProfit
  };
}

export async function createFuelTransaction(data: {
  folio?: string;
  saleId?: string;
  purchaseId?: string;
  distanceKm: number;
  fuelPricePerLiter: number;
  vehicleKmPerLiter: number;
  wearCostPerKm: number;
  driverCostPerKm: number;
  extraLogisticsCost: number;
  deliveryStatus?: string;
  evidenceNotes?: string;
  evidencePhoto?: string;
  purchaseReceipt?: string;
  supplierInvoice?: string;
  shippingDoc?: string;
  customerInvoice?: string;
}) {
  try {
    const branch = await getActiveBranch();
    if (!branch) throw new Error("No branch active");

    let saleTotal = 0;
    let customerId: string | undefined;
    if (data.saleId) {
      const sale = await prisma.sale.findUnique({
        where: { id: data.saleId }
      });
      if (sale) {
        saleTotal = sale.total;
        customerId = sale.customerId || undefined;
      }
    }

    let purchaseTotal = 0;
    let supplierId: string | undefined;
    if (data.purchaseId) {
      const purchase = await prisma.purchase.findUnique({
        where: { id: data.purchaseId }
      });
      if (purchase) {
        purchaseTotal = purchase.total;
        supplierId = purchase.supplierId || undefined;
      }
    }

    const { calculatedLogisticsCost, calculatedNetProfit } = calculateCostsAndProfit({
      distanceKm: data.distanceKm,
      fuelPricePerLiter: data.fuelPricePerLiter,
      vehicleKmPerLiter: data.vehicleKmPerLiter,
      wearCostPerKm: data.wearCostPerKm,
      driverCostPerKm: data.driverCostPerKm,
      extraLogisticsCost: data.extraLogisticsCost,
      saleTotal,
      purchaseTotal
    });

    const transaction = await prisma.fuelTransaction.create({
      data: {
        branchId: branch.id === 'GLOBAL' ? 'GLOBAL' : branch.id, // Fallback if GLOBAL
        folio: data.folio || `EMB-${Date.now().toString().slice(-6)}`,
        saleId: data.saleId || null,
        purchaseId: data.purchaseId || null,
        customerId: customerId || null,
        supplierId: supplierId || null,
        distanceKm: data.distanceKm,
        fuelPricePerLiter: data.fuelPricePerLiter,
        vehicleKmPerLiter: data.vehicleKmPerLiter,
        wearCostPerKm: data.wearCostPerKm,
        driverCostPerKm: data.driverCostPerKm,
        extraLogisticsCost: data.extraLogisticsCost,
        calculatedLogisticsCost,
        calculatedNetProfit,
        deliveryStatus: data.deliveryStatus || "PENDING",
        evidenceNotes: data.evidenceNotes || null,
        evidencePhoto: data.evidencePhoto || null,
        purchaseReceipt: data.purchaseReceipt || null,
        supplierInvoice: data.supplierInvoice || null,
        shippingDoc: data.shippingDoc || null,
        customerInvoice: data.customerInvoice || null
      }
    });

    revalidatePath("/logistica/combustibles");
    return { success: true, transaction };
  } catch (error: any) {
    console.error("Error creating fuel transaction:", error);
    return { success: false, error: error.message || "Error al crear la transacción" };
  }
}

export async function updateFuelTransaction(id: string, data: {
  distanceKm?: number;
  fuelPricePerLiter?: number;
  vehicleKmPerLiter?: number;
  wearCostPerKm?: number;
  driverCostPerKm?: number;
  extraLogisticsCost?: number;
  deliveryStatus?: string;
  evidenceNotes?: string;
  evidencePhoto?: string;
  purchaseReceipt?: string;
  supplierInvoice?: string;
  shippingDoc?: string;
  customerInvoice?: string;
}) {
  try {
    const existing = await prisma.fuelTransaction.findUnique({
      where: { id },
      include: { sale: true, purchase: true }
    });

    if (!existing) throw new Error("Embarque no encontrado");

    // Merge parameters
    const distanceKm = data.distanceKm !== undefined ? data.distanceKm : existing.distanceKm;
    const fuelPricePerLiter = data.fuelPricePerLiter !== undefined ? data.fuelPricePerLiter : existing.fuelPricePerLiter;
    const vehicleKmPerLiter = data.vehicleKmPerLiter !== undefined ? data.vehicleKmPerLiter : existing.vehicleKmPerLiter;
    const wearCostPerKm = data.wearCostPerKm !== undefined ? data.wearCostPerKm : existing.wearCostPerKm;
    const driverCostPerKm = data.driverCostPerKm !== undefined ? data.driverCostPerKm : existing.driverCostPerKm;
    const extraLogisticsCost = data.extraLogisticsCost !== undefined ? data.extraLogisticsCost : existing.extraLogisticsCost;

    const saleTotal = existing.sale?.total || 0;
    const purchaseTotal = existing.purchase?.total || 0;

    const { calculatedLogisticsCost, calculatedNetProfit } = calculateCostsAndProfit({
      distanceKm,
      fuelPricePerLiter,
      vehicleKmPerLiter,
      wearCostPerKm,
      driverCostPerKm,
      extraLogisticsCost,
      saleTotal,
      purchaseTotal
    });

    const updated = await prisma.fuelTransaction.update({
      where: { id },
      data: {
        distanceKm,
        fuelPricePerLiter,
        vehicleKmPerLiter,
        wearCostPerKm,
        driverCostPerKm,
        extraLogisticsCost,
        calculatedLogisticsCost,
        calculatedNetProfit,
        deliveryStatus: data.deliveryStatus !== undefined ? data.deliveryStatus : existing.deliveryStatus,
        evidenceNotes: data.evidenceNotes !== undefined ? data.evidenceNotes : existing.evidenceNotes,
        evidencePhoto: data.evidencePhoto !== undefined ? data.evidencePhoto : existing.evidencePhoto,
        purchaseReceipt: data.purchaseReceipt !== undefined ? data.purchaseReceipt : existing.purchaseReceipt,
        supplierInvoice: data.supplierInvoice !== undefined ? data.supplierInvoice : existing.supplierInvoice,
        shippingDoc: data.shippingDoc !== undefined ? data.shippingDoc : existing.shippingDoc,
        customerInvoice: data.customerInvoice !== undefined ? data.customerInvoice : existing.customerInvoice
      }
    });

    revalidatePath("/logistica/combustibles");
    return { success: true, transaction: updated };
  } catch (error: any) {
    console.error("Error updating fuel transaction:", error);
    return { success: false, error: error.message || "Error al actualizar la transacción" };
  }
}

export async function deleteFuelTransaction(id: string) {
  try {
    await prisma.fuelTransaction.delete({
      where: { id }
    });
    revalidatePath("/logistica/combustibles");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting fuel transaction:", error);
    return { success: false, error: error.message || "Error al eliminar la transacción" };
  }
}
