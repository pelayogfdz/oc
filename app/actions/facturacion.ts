'use server';

import { prisma } from "@/lib/prisma";
import Facturapi from "facturapi";
import { getActiveBranch } from "./auth";
import { revalidatePath } from "next/cache";

function getFacturapiApiKey(config: any): string | null {
  if (!config || !config.facturacion) return null;
  const f = config.facturacion;
  const testKey = f.testKey || f.apiTokenTest;
  const liveKey = f.liveKey || f.apiTokenLive;
  const entorno = f.entornoFacturapi;
  
  if (entorno === 'live') {
    return liveKey || testKey || null;
  } else {
    return testKey || liveKey || null;
  }
}

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

    const apiKey = getFacturapiApiKey(config);

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

    let payment_form = "01"; // Efectivo por default
    let payment_method = "PUE";
    let cfdiUse = "S01";

    if (sale.paymentMethod === 'CREDIT') {
      payment_form = "99"; // Por definir
      payment_method = "PPD"; // Pago en Parcialidades o Diferido
    }

    if (sale.customer && sale.customer.cfdiUse) {
      cfdiUse = sale.customer.cfdiUse;
    } else if (customerData.tax_id !== "XAXX010101000") {
      cfdiUse = "G03"; // Gastos en general como default seguro para RFC conocidos
    }

    // Generate Invoice
    const invoice = await facturapi.invoices.create({
      customer: customerData,
      items: items,
      payment_form: payment_form,
      payment_method: payment_method,
      use: cfdiUse
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

export async function stampGlobalInvoice(startDateStr?: string, endDateStr?: string) {
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

    const apiKey = getFacturapiApiKey(config);

    if (!apiKey) {
      throw new Error("No hay llaves de Facturapi configuradas en las preferencias de esta Sucursal.");
    }

    const facturapi = new Facturapi(apiKey);

    let start = new Date();
    start.setHours(0,0,0,0);
    let end = new Date();
    end.setHours(23,59,59,999);

    if (startDateStr) {
      start = new Date(startDateStr + 'T00:00:00');
    }
    if (endDateStr) {
      end = new Date(endDateStr + 'T23:59:59.999');
    }

    const salesFiltered = await prisma.sale.findMany({ 
      where: { 
        branchId: branch.id, 
        status: "COMPLETED",
        createdAt: { gte: start, lte: end },
        invoiceId: null // Solo no facturadas
      },
      include: {
        items: {
          include: { product: true }
        }
      }
    });

    if (salesFiltered.length === 0) {
      throw new Error("No hay ventas pendientes en el rango de fechas seleccionado para incluir en la factura global.");
    }

    // Comprimir todos los items en la factura global
    const globalItems: any[] = [];
    for (const sale of salesFiltered) {
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
         months: String(new Date().getMonth() + 1).padStart(2, '0'), // Mes actual
         year: new Date().getFullYear()
      }
    } as any);

    // Update sales with invoice Id
    const saleIds = salesFiltered.map(s => s.id);
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


export async function createPaymentReceipt(invoiceId: string, amount: number, paymentForm: string, paymentDate: Date) {
  try {
    const branch = await getActiveBranch();
    
    const branchSettings = await prisma.branchSettings.findUnique({
      where: { branchId: branch.id }
    });

    if (!branchSettings || !branchSettings.configJson) {
      throw new Error("La sucursal no tiene configuraciones establecidas.");
    }

    const config = JSON.parse(branchSettings.configJson);
    const apiKey = getFacturapiApiKey(config);

    if (!apiKey) {
      throw new Error("No hay llaves de Facturapi configuradas en las preferencias.");
    }

    const facturapi = new Facturapi(apiKey);

    const receipt = await facturapi.receipts.create({
      payment_form: paymentForm,
      date: paymentDate,
      invoices: [
        {
          id: invoiceId,
          amount: amount
        }
      ]
    });

    return { success: true, receiptId: receipt.id };
  } catch (error: any) {
    console.error("Facturapi Receipt Error:", error);
    return { success: false, error: error.message || "Error desconocido al emitir el recibo de pago." };
  }
}

export async function cancelInvoice(saleId: string) {
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

    const apiKey = getFacturapiApiKey(config);

    if (!apiKey) {
      throw new Error("No hay llaves de Facturapi configuradas en las preferencias de esta Sucursal.");
    }

    const facturapi = new Facturapi(apiKey);

    const sale = await prisma.sale.findUnique({
      where: { id: saleId }
    });

    if (!sale) {
      throw new Error("La venta especificada no existe.");
    }

    if (!sale.invoiceId) {
      throw new Error("Esta venta no cuenta con una factura timbrada para cancelar.");
    }

    // Cancel invoice in Facturapi with motive "02" (Comprobante emitido con errores sin relación)
    await facturapi.invoices.cancel(sale.invoiceId, { motive: "02" });

    // Clear invoice ID in database to allow re-stamping if needed
    await prisma.sale.update({
      where: { id: saleId },
      data: { invoiceId: null }
    });

    revalidatePath('/facturas/ventas');
    revalidatePath(`/ventas/detalle/${saleId}`);
    return { success: true };
  } catch (error: any) {
    console.error("Facturapi Cancel Error:", error);
    return { success: false, error: error.message || "Error desconocido al cancelar la factura." };
  }
}

export async function stampMultipleSalesInvoice(saleIds: string[], customerId?: string | null) {
  try {
    if (!saleIds || saleIds.length === 0) {
      throw new Error("No se seleccionaron ventas para facturar.");
    }

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

    const apiKey = getFacturapiApiKey(config);

    if (!apiKey) {
      throw new Error("No hay llaves de Facturapi configuradas en las preferencias de esta Sucursal.");
    }

    const facturapi = new Facturapi(apiKey);

    // Fetch the sales
    const sales = await prisma.sale.findMany({
      where: {
        id: { in: saleIds },
        branchId: branch.id
      },
      include: {
        items: {
          include: { product: true }
        },
        customer: true
      }
    });

    if (sales.length === 0) {
      throw new Error("Ninguna de las ventas especificadas existe en esta sucursal.");
    }

    // Check if any sale is already invoiced
    const alreadyInvoiced = sales.find(s => s.invoiceId || s.status === 'TIMBRADA');
    if (alreadyInvoiced) {
      throw new Error(`La venta #${alreadyInvoiced.folio || alreadyInvoiced.id.substring(0,8).toUpperCase()} ya fue facturada.`);
    }

    // Determine customer to use
    let finalCustomer: any = null;
    if (customerId) {
      finalCustomer = await prisma.customer.findUnique({
        where: { id: customerId }
      });
    } else {
      // Try to use customer from first sale if not provided
      const firstCustomerSale = sales.find(s => s.customer?.taxId);
      if (firstCustomerSale) {
        finalCustomer = firstCustomerSale.customer;
      }
    }

    let customerData = {
      legal_name: "PUBLICO EN GENERAL",
      tax_id: "XAXX010101000",
      tax_system: "616", // Sin obligaciones fiscales
      address: {
        zip: "01000"
      }
    };

    if (finalCustomer && finalCustomer.taxId && finalCustomer.taxId !== "") {
      customerData = {
        legal_name: finalCustomer.legalName || finalCustomer.name,
        tax_id: finalCustomer.taxId,
        tax_system: (finalCustomer as any).taxSystem || "601",
        address: {
          zip: finalCustomer.zipCode || "01000"
        }
      };
    }

    // Map items from all sales
    const items: any[] = [];
    for (const sale of sales) {
      for (const item of sale.items) {
        if (!item.product.satKey || !item.product.satUnit) {
          throw new Error(`El producto "${item.product.name}" de la venta #${sale.folio || sale.id.substring(0, 8).toUpperCase()} no cuenta con Clave del SAT o Unidad del SAT. Debes configurarlas desde el Catálogo.`);
        }
        items.push({
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

    // Determine payment form and method
    let payment_form = "01";
    let payment_method = "PUE";
    let cfdiUse = "S01";

    const hasCredit = sales.some(s => s.paymentMethod === 'CREDIT');
    if (hasCredit) {
      payment_form = "99";
      payment_method = "PPD";
    } else {
      // Find first sale with non-cash payment method to get a representative payment form
      const nonCashSale = sales.find(s => s.paymentMethod !== 'CASH');
      const pm = nonCashSale ? nonCashSale.paymentMethod : sales[0].paymentMethod;
      if (pm === 'CARD') payment_form = "04";
      else if (pm === 'TRANSFER') payment_form = "03";
      else payment_form = "01";
    }

    if (finalCustomer && finalCustomer.cfdiUse) {
      cfdiUse = finalCustomer.cfdiUse;
    } else if (customerData.tax_id !== "XAXX010101000") {
      cfdiUse = "G03";
    }

    // Generate Invoice
    const invoice = await facturapi.invoices.create({
      customer: customerData,
      items: items,
      payment_form: payment_form,
      payment_method: payment_method,
      use: cfdiUse
    });

    // Update all sales with the invoice ID
    await prisma.sale.updateMany({
      where: {
        id: { in: saleIds }
      },
      data: {
        invoiceId: invoice.id
      }
    });

    revalidatePath('/facturas/ventas');
    return { success: true, invoiceId: invoice.id };
  } catch (error: any) {
    console.error("Facturapi Multiple Sales Invoice Error:", error);
    return { success: false, error: error.message || "Error desconocido al timbrar factura agrupada." };
  }
}

export async function createMultiplePaymentReceipt(
  invoices: { invoiceId: string; amount: number }[],
  paymentForm: string,
  paymentDate: Date
) {
  try {
    const branch = await getActiveBranch();
    
    const branchSettings = await prisma.branchSettings.findUnique({
      where: { branchId: branch.id }
    });

    if (!branchSettings || !branchSettings.configJson) {
      throw new Error("La sucursal no tiene configuraciones establecidas.");
    }

    const config = JSON.parse(branchSettings.configJson);
    const apiKey = getFacturapiApiKey(config);

    if (!apiKey) {
      throw new Error("No hay llaves de Facturapi configuradas en las preferencias.");
    }

    const facturapi = new Facturapi(apiKey);

    const receipt = await facturapi.receipts.create({
      payment_form: paymentForm,
      date: paymentDate,
      invoices: invoices
    });

    return { success: true, receiptId: receipt.id };
  } catch (error: any) {
    console.error("Facturapi Multiple Receipt Error:", error);
    return { success: false, error: error.message || "Error desconocido al emitir el recibo de pago." };
  }
}

export async function getPendingGlobalSales(startDateStr: string, endDateStr: string) {
  try {
    const branch = await getActiveBranch();
    
    let start = new Date(startDateStr + 'T00:00:00');
    let end = new Date(endDateStr + 'T23:59:59.999');

    const sales = await prisma.sale.findMany({ 
      where: { 
        branchId: branch.id, 
        status: "COMPLETED",
        createdAt: { gte: start, lte: end },
        invoiceId: null
      },
      select: {
        id: true,
        folio: true,
        total: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const total = sales.reduce((acc, s) => acc + s.total, 0);

    return { success: true, sales, total };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al cargar ventas pendientes." };
  }
}


