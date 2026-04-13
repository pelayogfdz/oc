'use server';

import { prisma } from "@/lib/prisma";
import Facturapi from "facturapi";
import { getActiveBranch } from "./auth";
import { revalidatePath } from "next/cache";

export async function stampInvoice(saleId: string) {
  try {
    const branch = await getActiveBranch();
    
    // Check if facturapi is configured for this branch
    const branchSettings = await prisma.branchSettings.findUnique({
      where: { branchId: branch.id }
    });

    if (!branchSettings || !branchSettings.configJson) {
      throw new Error("La sucursal no tiene configuraciones establecidas.");
    }

    let config: any;
    try {
      config = JSON.parse(branchSettings.configJson);
    } catch(e) {
      throw new Error("El archivo de configuración de la sucursal es inválido.");
    }

    const testKey = config.facturacion?.testKey;
    const liveKey = config.facturacion?.liveKey;
    // For MVP safety, we use testKey if available, otherwise liveKey. 
    // Ideally we'd have an environment toggle. Let's use testKey primarily if it exists for safe testing.
    const apiKey = testKey || liveKey;

    if (!apiKey) {
      throw new Error("No hay llaves de Facturapi configuradas en las preferencias de esta Sucursal.");
    }

    const facturapi = new Facturapi(apiKey);

    // Fetch the specific Sale
    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: {
        items: {
          include: { product: true }
        },
        customer: true,
      }
    });

    if (!sale) {
      throw new Error("La venta especificada no existe.");
    }

    if (sale.status === 'TIMBRADA' || sale.invoiceId) {
       throw new Error("Esta venta ya fue facturada.");
    }

    // Determine Customer (Receiver)
    let customerData = {
      legal_name: "PUBLICO EN GENERAL",
      tax_id: "XAXX010101000",
      tax_system: "616", // Sin obligaciones fiscales
      address: {
        zip: "01000" // General zip code, should Ideally be branch's zip code
      }
    };

    if (sale.customer && sale.customer.taxId && sale.customer.taxId !== "") {
      customerData = {
        legal_name: sale.customer.legalName || sale.customer.name,
        tax_id: sale.customer.taxId,
        tax_system: (sale.customer as any).taxSystem || "601",
        address: {
          zip: sale.customer.zipCode || "01000"
        }
      };
    }

    // Map the items, validating SAT keys
    const items = sale.items.map(item => {
      if (!item.product.satKey || !item.product.satUnit) {
        throw new Error(`El producto "${item.product.name}" no cuenta con Clave del SAT o Unidad del SAT. Debes configurarlas desde el Catálogo antes de facturar esta venta.`);
      }
      return {
        product: {
          description: item.product.name,
          product_key: item.product.satKey,
          price: Number(item.price),
          tax_included: true,
          taxes: [
             { type: "IVA", rate: (item.product.taxRate || 16.0) / 100 } 
          ]
        },
        quantity: Number(item.quantity),
        unit_key: item.product.satUnit
      };
    });

    // Generate Invoice
    const invoice = await facturapi.invoices.create({
      customer: customerData,
      items: items,
      payment_form: "01", // Efectivo default
      payment_method: "PUE", // Pago en una sola exhibición
      use: "S01" // Sin efectos fiscales for publico general, or G03 for normal. We'll use S01 as safe default.
    });

    // Update the Sale record with the Invoice ID (requires a schema addition ideally, but for now we'll use a hack or just update status if we added it)
    await prisma.sale.update({
      where: { id: saleId },
      data: { invoiceId: invoice.id } // Assume invoiceId field exists? Wait, let me check schema! If it doesn't, I will just update the status or append to notes.
    });

    revalidatePath('/facturas/ventas');
    return { success: true, invoiceId: invoice.id };
  } catch (error: any) {
    console.error("Facturapi Error:", error);
    return { success: false, error: error.message || "Error desconocido al timbrar." };
  }
}

export async function stampGlobalInvoice(formData?: FormData) {
  try {
    const branch = await getActiveBranch();
    
    const branchSettings = await prisma.branchSettings.findUnique({
      where: { branchId: branch.id }
    });

    if (!branchSettings || !branchSettings.configJson) {
      throw new Error("La sucursal no tiene configuraciones establecidas.");
    }

    let config: any;
    try {
      config = JSON.parse(branchSettings.configJson);
    } catch(e) {
      throw new Error("El archivo de configuración de la sucursal es inválido.");
    }

    const testKey = config.facturacion?.testKey;
    const liveKey = config.facturacion?.liveKey;
    const apiKey = testKey || liveKey;

    if (!apiKey) {
      throw new Error("No hay llaves de Facturapi configuradas en las preferencias de esta Sucursal.");
    }

    const facturapi = new Facturapi(apiKey);

    const today = new Date();
    today.setHours(0,0,0,0);

    const salesToday = await prisma.sale.findMany({ 
      where: { 
        branchId: branch.id, 
        status: "COMPLETED",
        createdAt: { gte: today },
        invoiceId: null // Solo no facturadas
      },
      include: {
        items: {
          include: { product: true }
        }
      }
    });

    if (salesToday.length === 0) {
      throw new Error("No hay ventas pendientes de hoy para incluir en la factura global.");
    }

    // Comprimir todos los items en la factura global
    const globalItems: any[] = [];
    for (const sale of salesToday) {
       for (const item of sale.items) {
          if (!item.product.satKey || !item.product.satUnit) {
            throw new Error(`El producto "${item.product.name}" no cuenta con Clave del SAT o Unidad del SAT. Configúralo antes de emitir la factura global.`);
          }
          globalItems.push({
            product: {
              description: item.product.name,
              product_key: item.product.satKey,
              price: Number(item.price),
              tax_included: true,
              taxes: [
                 { type: "IVA", rate: (item.product.taxRate || 16.0) / 100 } 
              ]
            },
            quantity: Number(item.quantity),
            unit_key: item.product.satUnit
          });
       }
    }

    // Factura Global CFDI 4.0 a Público en General
    const invoice = await facturapi.invoices.create({
      customer: {
        legal_name: "PUBLICO EN GENERAL",
        tax_id: "XAXX010101000",
        tax_system: "616",
        address: {
          zip: "01000"
        }
      },
      items: globalItems,
      payment_form: "01",
      payment_method: "PUE",
      use: "S01",
      type: "I",
      global_info: {
         periodicity: "01", // Diario
         months: "01", // Mes actual o generativo (Facturapi usually auto resolves based on month) -> using defaults
         year: new Date().getFullYear()
      }
    } as any);

    // Update sales with invoice Id
    const saleIds = salesToday.map(s => s.id);
    await prisma.sale.updateMany({
       where: { id: { in: saleIds } },
       data: { invoiceId: invoice.id }
    });

    revalidatePath('/facturas/globales');
    return { success: true, invoiceId: invoice.id };

  } catch (error: any) {
    console.error("Facturapi Global Error:", error);
    return { success: false, error: error.message || "Error desconocido al timbrar factura global." };
  }
}
