'use server';

import { prisma, resolveClientForSale } from "@/lib/prisma";
import Facturapi from "facturapi";
import { getActiveBranch, getActiveUser } from "./auth";
import { revalidatePath } from "next/cache";
import { cancelSaleInternal } from "./sale";

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

function parseSaleFolio(saleFolio: string | null | undefined): { series?: string; folio?: number } {
  if (!saleFolio) return {};
  
  if (saleFolio.includes('-')) {
    const parts = saleFolio.split('-');
    const series = parts[0]?.trim();
    const folioStr = parts[1]?.trim();
    const folio = parseInt(folioStr || '', 10);
    if (!isNaN(folio)) {
      return { series, folio };
    }
  }
  
  const match = saleFolio.match(/^([A-Za-z]+)?\s*#?\s*(\d+)$/);
  if (match) {
    const series = match[1]?.trim() || undefined;
    const folio = parseInt(match[2], 10);
    return { series, folio };
  }
  
  return {};
}

function cleanConditions(str: string | null | undefined): string | undefined {
  if (!str) return undefined;
  // Replace pipes with a hyphen/dash (pipes are strictly forbidden in CFDI attributes)
  let cleaned = str.replace(/\|/g, '-');
  // Replace consecutive spaces with a single space
  cleaned = cleaned.replace(/\s+/g, ' ');
  // Trim leading and trailing spaces (XML schema pattern excludes start/end spaces)
  cleaned = cleaned.trim();
  // Limit to 1000 characters
  cleaned = cleaned.slice(0, 1000);
  
  return cleaned !== "" ? cleaned : undefined;
}

export async function stampInvoice(saleId: string, customerId?: string | null, customCfdiUse?: string | null) {
  try {
    const resolved = await resolveClientForSale(saleId);
    if (!resolved) {
      throw new Error("La venta especificada no existe.");
    }
    const { client: db, sale } = resolved;

    if (sale.status === 'TIMBRADA' || sale.invoiceId) {
       throw new Error("Esta venta ya fue facturada.");
    }

    const branchId = sale.branchId;
    if (!branchId) {
      throw new Error("La venta no está asociada a ninguna sucursal.");
    }
    
    // Check if facturapi is configured for this branch
    const branchSettings = await db.branchSettings.findUnique({
      where: { branchId }
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

    // Determine Customer (Receiver)
    let finalCustomer = sale.customer;
    if (customerId !== undefined) {
      if (customerId && customerId !== "") {
        finalCustomer = await db.customer.findUnique({
          where: { id: customerId }
        });
      } else {
        finalCustomer = null;
      }
    }

    if (finalCustomer) {
      if (!finalCustomer.taxId || finalCustomer.taxId.trim() === "") {
        throw new Error(`El cliente "${finalCustomer.name}" no tiene un RFC (taxId) configurado. Agrégalo desde la sección de clientes antes de facturar.`);
      }
      if (!finalCustomer.zipCode || finalCustomer.zipCode.trim() === "") {
        throw new Error(`El cliente "${finalCustomer.name}" no tiene un Código Postal (zipCode) configurado. Agrégalo desde la sección de clientes antes de facturar.`);
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
        tax_system: (() => {
          const rfc = finalCustomer.taxId;
          const regime = finalCustomer.taxRegime;
          if (rfc.length === 12) {
            if (!regime || ["605", "606", "612", "621"].includes(regime)) {
              return "601";
            }
            return regime;
          } else {
            if (!regime || ["601", "603"].includes(regime)) {
              return "605";
            }
            return regime;
          }
        })(),
        address: {
          zip: finalCustomer.zipCode || "01000"
        }
      };
    }

    // Map the items, validating SAT keys and calculating proportional discounts
    const itemsTotal = (sale.items as any[]).reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);
    const saleDiscount = Math.max(0, itemsTotal - sale.total);
    let discountSum = 0;

    const items = (sale.items as any[]).map((item: any, idx: number) => {
      if (!item.product.satKey || !item.product.satUnit) {
        throw new Error(`El producto "${item.product.name}" no cuenta con Clave del SAT o Unidad del SAT. Debes configurarlas desde el Catálogo antes de facturar esta venta.`);
      }

      const itemSubtotal = Number(item.price) * Number(item.quantity);
      const proportion = itemsTotal > 0 ? (itemSubtotal / itemsTotal) : 0;
      let itemDiscount = 0;

      if (saleDiscount > 0.01) {
        if (idx === sale.items.length - 1) {
          // Adjust last item to match total discount exactly
          itemDiscount = Number((saleDiscount - discountSum).toFixed(2));
        } else {
          itemDiscount = Number((saleDiscount * proportion).toFixed(2));
          discountSum += itemDiscount;
        }
      }

      let description = item.product.name;
      const sku = item.product.sku;
      const barcode = item.product.barcode;
      const parts: string[] = [];
      if (sku) parts.push(`SKU: ${sku}`);
      if (barcode) parts.push(`Cod: ${barcode}`);
      if (parts.length > 0) {
        description += ` (${parts.join(" - ")})`;
      }

      return {
        product: {
          description: description,
          product_key: item.product.satKey,
          price: Number(item.price),
          tax_included: true,
          taxes: (() => {
            const taxType = item.product.taxType || 'IVA';
            const taxesList: any[] = [];
            if (taxType === 'IVA' || taxType === 'IVA_IEPS') {
              const rate = (item.product.taxRate ?? 16.0) / 100;
              if (rate > 0) taxesList.push({ type: "IVA", rate });
            }
            if (taxType === 'IEPS' || taxType === 'IVA_IEPS') {
              const rate = (item.product.iepsRate ?? 0) / 100;
              if (rate > 0) taxesList.push({ type: "IEPS", rate });
            }
            return taxesList;
          })(),
          unit_key: item.product.satUnit
        },
        quantity: Number(item.quantity),
        ...(itemDiscount > 0 ? { discount: itemDiscount } : {})
      };
    });

    let payment_form = "01"; // Efectivo por default
    let payment_method = "PUE";
    let cfdiUse = "S01";

    const methodUpper = String(sale.paymentMethod || '').toUpperCase();
    if (methodUpper === 'CREDIT') {
      payment_form = "99"; // Por definir
      payment_method = "PPD"; // Pago en Parcialidades o Diferido
    } else if (methodUpper === 'CARD_DEBIT' || methodUpper.includes('DEBITO') || methodUpper.includes('DEBIT')) {
      payment_form = "28"; // Tarjeta de débito
    } else if (methodUpper === 'CARD_CREDIT' || methodUpper === 'CARD' || methodUpper.includes('TARJETA') || methodUpper.includes('CARD')) {
      payment_form = "04"; // Tarjeta de crédito
    } else if (methodUpper === 'TRANSFER' || methodUpper.includes('TRANSFERENCIA') || methodUpper.includes('SPEI')) {
      payment_form = "03"; // Transferencia electrónica
    }

    if (customerData.tax_id === "XAXX010101000") {
      customerData.legal_name = "PUBLICO EN GENERAL";
      customerData.tax_system = "616";
      cfdiUse = "S01";
    } else if (customCfdiUse) {
      cfdiUse = customCfdiUse;
    } else if (finalCustomer && finalCustomer.cfdiUse) {
      cfdiUse = finalCustomer.cfdiUse;
    } else {
      cfdiUse = "G03"; // Gastos en general como default seguro para RFC conocidos
    }

    // Generate Invoice
    const invoicePayload: any = {
      customer: customerData,
      items: items,
      payment_form: payment_form,
      payment_method: payment_method,
      use: cfdiUse
    };

    if (methodUpper === 'CREDIT') {
      invoicePayload.conditions = "Crédito";
    } else {
      invoicePayload.conditions = "Contado";
    }

    if (sale.notes) {
      const cleanedConditions = cleanConditions(sale.notes);
      if (cleanedConditions) {
        invoicePayload.pdf_custom_section = `<div><strong>Comentarios / Notas de entrega:</strong><br/><span>${cleanedConditions.replace(/\n/g, '<br/>')}</span></div>`;
      }
    }

    // Marry the invoice series and folio with the sale folio prefix and number
    if (sale.folio) {
      const parsed = parseSaleFolio(sale.folio);
      if (parsed.series) invoicePayload.series = parsed.series;
      if (parsed.folio !== undefined) invoicePayload.folio_number = parsed.folio;
    }

    if (customerData.tax_id === "XAXX010101000") {
      invoicePayload.global = {
        periodicity: "day",
        months: String(new Date().getMonth() + 1).padStart(2, '0'),
        year: new Date().getFullYear()
      };
    }

    const invoice = await facturapi.invoices.create(invoicePayload);
    const invoiceFolio = [(invoice as any).series, (invoice as any).folio_number || (invoice as any).folio].filter(Boolean).join('');

    // Update the Sale record with the Invoice ID, Invoice Folio and link customer if provided
    await db.sale.update({
      where: { id: saleId },
      data: { 
        invoiceId: invoice.id,
        invoiceFolio: invoiceFolio || null,
        ...(customerId ? { customerId } : {})
      }
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

    // Comprimir todos los items en la factura global con proporcional de descuentos por venta
    const globalItems: any[] = [];
    for (const sale of salesFiltered) {
       const saleItemsTotal = (sale.items as any[]).reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);
       const saleDiscount = Math.max(0, saleItemsTotal - sale.total);
       let discountSum = 0;

       (sale.items as any[]).forEach((item: any, idx: number) => {
          if (!item.product.satKey || !item.product.satUnit) {
            throw new Error(`El producto "${item.product.name}" no cuenta con Clave del SAT o Unidad del SAT. Configúralo antes de emitir la factura global.`);
          }

          const itemSubtotal = Number(item.price) * Number(item.quantity);
          const proportion = saleItemsTotal > 0 ? (itemSubtotal / saleItemsTotal) : 0;
          let itemDiscount = 0;

          if (saleDiscount > 0.01) {
            if (idx === sale.items.length - 1) {
              itemDiscount = Number((saleDiscount - discountSum).toFixed(2));
            } else {
              itemDiscount = Number((saleDiscount * proportion).toFixed(2));
              discountSum += itemDiscount;
            }
          }

          let description = item.product.name;
          const sku = item.product.sku;
          const barcode = item.product.barcode;
          const parts: string[] = [];
          if (sku) parts.push(`SKU: ${sku}`);
          if (barcode) parts.push(`Cod: ${barcode}`);
          if (parts.length > 0) {
            description += ` (${parts.join(" - ")})`;
          }

          globalItems.push({
            product: {
              description: description,
              product_key: item.product.satKey,
              price: Number(item.price),
              tax_included: true,
              taxes: (() => {
               const taxType = item.product.taxType || 'IVA';
               const taxesList: any[] = [];
               if (taxType === 'IVA' || taxType === 'IVA_IEPS') {
                 const rate = (item.product.taxRate ?? 16.0) / 100;
                 if (rate > 0) taxesList.push({ type: "IVA", rate });
               }
               if (taxType === 'IEPS' || taxType === 'IVA_IEPS') {
                 const rate = (item.product.iepsRate ?? 0) / 100;
                 if (rate > 0) taxesList.push({ type: "IEPS", rate });
               }
               return taxesList;
             })(),
              unit_key: item.product.satUnit
            },
            quantity: Number(item.quantity),
            ...(itemDiscount > 0 ? { discount: itemDiscount } : {})
          });
       });
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
      global: {
         periodicity: "day",
         months: String(new Date().getMonth() + 1).padStart(2, '0'), // Mes actual
         year: new Date().getFullYear()
      }
    } as any);

    const invoiceFolio = [(invoice as any).series, (invoice as any).folio_number || (invoice as any).folio].filter(Boolean).join('');
    // Update sales with invoice Id and invoice Folio
    const saleIds = salesFiltered.map(s => s.id);
    await prisma.sale.updateMany({
       where: { id: { in: saleIds } },
       data: { 
         invoiceId: invoice.id,
         invoiceFolio: invoiceFolio || null
       }
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
    await facturapi.invoices.cancel(sale.invoiceId, { motive: "02" as any });

    // Buscar todas las ventas asociadas a este invoiceId
    const associatedSales = await prisma.sale.findMany({
      where: { invoiceId: sale.invoiceId }
    });

    const user = await getActiveUser();

    // Cancelar internamente cada una de las ventas (esto retorna stock y maneja caja/crédito)
    for (const assocSale of associatedSales) {
      if (assocSale.status !== 'CANCELLED') {
        await cancelSaleInternal(assocSale.id, user.id);
      }
    }

    // Limpiar el ID y folio de factura en todas las ventas asociadas
    await prisma.sale.updateMany({
      where: { invoiceId: sale.invoiceId },
      data: { 
        invoiceId: null,
        invoiceFolio: null
      }
    });

    revalidatePath('/facturas/ventas');
    revalidatePath(`/ventas/detalle/${saleId}`);
    return { success: true };
  } catch (error: any) {
    console.error("Facturapi Cancel Error:", error);
    return { success: false, error: error.message || "Error desconocido al cancelar la factura." };
  }
}

export async function stampMultipleSalesInvoice(saleIds: string[], customerId?: string | null, customCfdiUse?: string | null) {
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
    if (customerId !== undefined) {
      if (customerId && customerId !== "") {
        finalCustomer = await prisma.customer.findUnique({
          where: { id: customerId }
        });
      }
    } else {
      // Try to use customer from first sale if not provided
      const firstCustomerSale = sales.find(s => s.customer?.taxId);
      if (firstCustomerSale) {
        finalCustomer = firstCustomerSale.customer;
      }
    }

    if (finalCustomer) {
      if (!finalCustomer.taxId || finalCustomer.taxId.trim() === "") {
        throw new Error(`El cliente "${finalCustomer.name}" no tiene un RFC (taxId) configurado. Agrégalo desde la sección de clientes antes de facturar.`);
      }
      if (!finalCustomer.zipCode || finalCustomer.zipCode.trim() === "") {
        throw new Error(`El cliente "${finalCustomer.name}" no tiene un Código Postal (zipCode) configurado. Agrégalo desde la sección de clientes antes de facturar.`);
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
        tax_system: (() => {
          const rfc = finalCustomer.taxId;
          const regime = finalCustomer.taxRegime;
          if (rfc.length === 12) {
            if (!regime || ["605", "606", "612", "621"].includes(regime)) {
              return "601";
            }
            return regime;
          } else {
            if (!regime || ["601", "603"].includes(regime)) {
              return "605";
            }
            return regime;
          }
        })(),
        address: {
          zip: finalCustomer.zipCode || "01000"
        }
      };
    }

    // Map items from all sales applying proportional discounts per sale
    const items: any[] = [];
    for (const sale of sales) {
      const saleItemsTotal = (sale.items as any[]).reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);
      const saleDiscount = Math.max(0, saleItemsTotal - sale.total);
      let discountSum = 0;

      (sale.items as any[]).forEach((item: any, idx: number) => {
        if (!item.product.satKey || !item.product.satUnit) {
          throw new Error(`El producto "${item.product.name}" de la venta #${sale.folio || sale.id.substring(0, 8).toUpperCase()} no cuenta con Clave del SAT o Unidad del SAT. Debes configurarlas desde el Catálogo.`);
        }

        const itemSubtotal = Number(item.price) * Number(item.quantity);
        const proportion = saleItemsTotal > 0 ? (itemSubtotal / saleItemsTotal) : 0;
        let itemDiscount = 0;

        if (saleDiscount > 0.01) {
          if (idx === sale.items.length - 1) {
            itemDiscount = Number((saleDiscount - discountSum).toFixed(2));
          } else {
            itemDiscount = Number((saleDiscount * proportion).toFixed(2));
            discountSum += itemDiscount;
          }
        }

        let description = item.product.name;
        const sku = item.product.sku;
        const barcode = item.product.barcode;
        const parts: string[] = [];
        if (sku) parts.push(`SKU: ${sku}`);
        if (barcode) parts.push(`Cod: ${barcode}`);
        if (parts.length > 0) {
          description += ` (${parts.join(" - ")})`;
        }

        items.push({
          product: {
            description: description,
            product_key: item.product.satKey,
            price: Number(item.price),
            tax_included: true,
            taxes: (() => {
             const taxType = item.product.taxType || 'IVA';
             const taxesList: any[] = [];
             if (taxType === 'IVA' || taxType === 'IVA_IEPS') {
               const rate = (item.product.taxRate ?? 16.0) / 100;
               if (rate > 0) taxesList.push({ type: "IVA", rate });
             }
             if (taxType === 'IEPS' || taxType === 'IVA_IEPS') {
               const rate = (item.product.iepsRate ?? 0) / 100;
               if (rate > 0) taxesList.push({ type: "IEPS", rate });
             }
             return taxesList;
           })(),
            unit_key: item.product.satUnit
          },
          quantity: Number(item.quantity),
          ...(itemDiscount > 0 ? { discount: itemDiscount } : {})
        });
      });
    }

    // Determine payment form and method
    let payment_form = "01";
    let payment_method = "PUE";
    let cfdiUse = "S01";

    const hasCredit = sales.some(s => String(s.paymentMethod || '').toUpperCase() === 'CREDIT');
    if (hasCredit) {
      payment_form = "99";
      payment_method = "PPD";
    } else {
      // Find first sale with non-cash payment method to get a representative payment form
      const nonCashSale = sales.find(s => String(s.paymentMethod || '').toUpperCase() !== 'CASH');
      const pm = String(nonCashSale ? nonCashSale.paymentMethod : sales[0].paymentMethod || '').toUpperCase();
      if (pm === 'CARD_DEBIT' || pm.includes('DEBITO') || pm.includes('DEBIT')) payment_form = "28";
      else if (pm === 'CARD_CREDIT' || pm === 'CARD' || pm.includes('TARJETA') || pm.includes('CARD')) payment_form = "04";
      else if (pm === 'TRANSFER' || pm.includes('TRANSFERENCIA') || pm.includes('SPEI')) payment_form = "03";
      else payment_form = "01";
    }

    if (customerData.tax_id === "XAXX010101000") {
      customerData.legal_name = "PUBLICO EN GENERAL";
      customerData.tax_system = "616";
      cfdiUse = "S01";
    } else if (customCfdiUse) {
      cfdiUse = customCfdiUse;
    } else if (finalCustomer && finalCustomer.cfdiUse) {
      cfdiUse = finalCustomer.cfdiUse;
    } else {
      cfdiUse = "G03";
    }

    // Generate Invoice
    const invoicePayload: any = {
      customer: customerData,
      items: items,
      payment_form: payment_form,
      payment_method: payment_method,
      use: cfdiUse
    };

    invoicePayload.conditions = "Contado";

    const allNotes = sales.map(s => s.notes).filter(Boolean).map(n => cleanConditions(n)).filter(Boolean);
    if (allNotes.length > 0) {
      invoicePayload.pdf_custom_section = `<div><strong>Comentarios / Notas de entrega:</strong><br/><span>${allNotes.join(" - ").slice(0, 1000).replace(/\n/g, '<br/>')}</span></div>`;
    }

    // Sort sales by folio or ID to keep consistent first-and-rest ordering
    const sortedSales = [...sales].sort((a, b) => {
      if (a.folio && b.folio) {
        return a.folio.localeCompare(b.folio, undefined, { numeric: true });
      }
      return a.id.localeCompare(b.id);
    });

    // Marry the invoice series and folio with the first sale's folio prefix and number
    const firstSale = sortedSales[0];
    if (firstSale && firstSale.folio) {
      const parsed = parseSaleFolio(firstSale.folio);
      if (parsed.series) invoicePayload.series = parsed.series;
      if (parsed.folio !== undefined) invoicePayload.folio_number = parsed.folio;
    }

    if (customerData.tax_id === "XAXX010101000") {
      invoicePayload.global = {
        periodicity: "day",
        months: String(new Date().getMonth() + 1).padStart(2, '0'),
        year: new Date().getFullYear()
      };
    }

    const invoice = await facturapi.invoices.create(invoicePayload);
    
    // Construct DB invoiceFolio: first one and the rest in parentheses
    let dbInvoiceFolio = [(invoice as any).series, (invoice as any).folio_number || (invoice as any).folio].filter(Boolean).join('');
    if (sortedSales.length > 1) {
      const restFolios = sortedSales.slice(1).map(s => {
        if (!s.folio) return '';
        const parsed = parseSaleFolio(s.folio);
        const parsedFirst = parseSaleFolio(firstSale.folio);
        if (parsed.series === parsedFirst.series) {
          return parsed.folio !== undefined ? String(parsed.folio) : s.folio;
        }
        return [parsed.series, parsed.folio].filter(Boolean).join('') || s.folio;
      }).filter(Boolean);
      
      if (restFolios.length > 0) {
        dbInvoiceFolio += ` (${restFolios.join(', ')})`;
      }
    }

    // Update all sales with the invoice ID and invoice Folio
    await prisma.sale.updateMany({
      where: {
        id: { in: saleIds }
      },
      data: {
        invoiceId: invoice.id,
        invoiceFolio: dbInvoiceFolio || null
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

    let dateStr = "";
    if (typeof paymentDate === 'string') {
      dateStr = (paymentDate as string).includes('T') ? paymentDate : `${paymentDate}T12:00:00`;
    } else if (paymentDate instanceof Date) {
      const year = paymentDate.getUTCFullYear();
      const month = String(paymentDate.getUTCMonth() + 1).padStart(2, '0');
      const day = String(paymentDate.getUTCDate()).padStart(2, '0');
      dateStr = `${year}-${month}-${day}T12:00:00`;
    } else {
      const today = new Date();
      dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}T12:00:00`;
    }

    const receipt = await facturapi.receipts.create({
      payment_form: paymentForm,
      date: dateStr as any,
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

async function binaryDownloadToBuffer(download: any): Promise<Buffer> {
  if (!download) {
    throw new Error('El archivo descargado está vacío');
  }
  if (Buffer.isBuffer(download)) {
    return download;
  }
  if (typeof download.arrayBuffer === 'function') {
    const arrayBuf = await download.arrayBuffer();
    return Buffer.from(arrayBuf);
  }
  if (typeof download.on === 'function') {
    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      download.on('data', (chunk: any) => chunks.push(Buffer.from(chunk)));
      download.on('end', () => resolve(Buffer.concat(chunks)));
      download.on('error', (err: any) => reject(err));
    });
  }
  if (typeof download.getReader === 'function') {
    const reader = download.getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return Buffer.from(result);
  }
  return Buffer.from(download);
}

export async function sendInvoiceByEmail(saleId: string, email: string) {
  try {
    const resolved = await resolveClientForSale(saleId);
    if (!resolved) throw new Error("Venta no encontrada.");
    const { client, sale } = resolved;

    if (!sale.invoiceId) {
      throw new Error("Esta venta no cuenta con una factura timbrada para enviar.");
    }

    // Resolve branch settings and API Key
    let apiKey: string | null = null;
    if (sale.branchId) {
      const settings = await client.branchSettings.findUnique({
        where: { branchId: sale.branchId }
      });
      if (settings && settings.configJson) {
        apiKey = getFacturapiApiKey(JSON.parse(settings.configJson));
      }
    }

    if (!apiKey) {
      const allSettings = await client.branchSettings.findMany();
      for (const settings of allSettings) {
        if (settings.configJson) {
          apiKey = getFacturapiApiKey(JSON.parse(settings.configJson));
          if (apiKey) break;
        }
      }
    }

    if (!apiKey) {
      throw new Error("No se encontró configuración de Facturapi activa.");
    }

    const facturapi = new Facturapi(apiKey);

    // Fetch PDF and XML binary buffers from Facturapi
    const pdfBlob = await facturapi.invoices.downloadPdf(sale.invoiceId);
    let xmlBlob: any = null;
    try {
      xmlBlob = await facturapi.invoices.downloadXml(sale.invoiceId);
    } catch (e) {
      // Ignore if XML download fails
    }

    const pdfBuffer = await binaryDownloadToBuffer(pdfBlob);
    const xmlBuffer = xmlBlob ? await binaryDownloadToBuffer(xmlBlob) : undefined;

    const { sendInvoiceNotificationEmail } = await import('@/lib/mailer');
    const result = await sendInvoiceNotificationEmail(email, sale, pdfBuffer, xmlBuffer);
    return result;
  } catch (error: any) {
    console.error("Error al enviar factura por correo:", error);
    return { success: false, error: error.message || "Error al procesar el envío de factura." };
  }
}

export async function stampCustomerPayment(paymentId: string, paymentDateStr?: string) {
  try {
    const payment = await prisma.customerPayment.findUnique({
      where: { id: paymentId },
      include: {
        sale: true,
        customer: true
      }
    });

    if (!payment) {
      throw new Error("El abono especificado no existe.");
    }

    if (payment.cfdiStatus === 'INVOICED') {
      throw new Error("Este abono ya fue timbrado.");
    }

    if (!payment.saleId || !payment.sale) {
      throw new Error("Este abono no está asociado a ninguna venta/ticket.");
    }

    if (!payment.sale.invoiceId) {
      throw new Error("La venta asociada a este pago aún no ha sido facturada (debe ser timbrada como PPD primero).");
    }

    const branchId = payment.branchId || payment.sale.branchId;
    if (!branchId) {
      throw new Error("El abono no está asociado a ninguna sucursal.");
    }

    const branchSettings = await prisma.branchSettings.findUnique({
      where: { branchId }
    });

    if (!branchSettings || !branchSettings.configJson) {
      throw new Error("La sucursal no tiene configuraciones establecidas.");
    }

    const config = JSON.parse(branchSettings.configJson);
    const apiKey = getFacturapiApiKey(config);

    if (!apiKey) {
      throw new Error("No hay llaves de Facturapi configuradas en las preferencias de esta Sucursal.");
    }

    const facturapi = new Facturapi(apiKey);

    // Retrieve original invoice to get its SAT UUID and taxes
    const originalInvoice = await facturapi.invoices.retrieve(payment.sale.invoiceId);
    const originalUuid = originalInvoice.uuid;

    if (!originalUuid) {
      throw new Error("La factura original aún no tiene un folio fiscal (UUID) asignado en Facturapi.");
    }

    // Extract taxes from original invoice items (checking both item.taxes and item.product.taxes)
    const taxRatesMap = new Map<string, { type: string; rate: number }>();
    if (originalInvoice.items && Array.isArray(originalInvoice.items)) {
      for (const item of originalInvoice.items as any[]) {
        const taxesList = item.taxes || item.product?.taxes;
        if (taxesList && Array.isArray(taxesList)) {
          for (const tax of taxesList) {
            const type = tax.type || "IVA";
            const rate = typeof tax.rate === 'number' ? tax.rate : 0.16;
            const key = `${type}-${rate}`;
            taxRatesMap.set(key, { type, rate });
          }
        }
      }
    }

    // Fallback: If no tax entries were found, default to standard IVA 16%
    if (taxRatesMap.size === 0) {
      taxRatesMap.set("IVA-0.16", { type: "IVA", rate: 0.16 });
    }

    const relatedTaxes: any[] = [];
    for (const [_, taxInfo] of taxRatesMap.entries()) {
      let base: number;
      if (taxInfo.rate > 0) {
        base = Number((payment.amount / (1 + taxInfo.rate)).toFixed(2));
      } else {
        base = Number(payment.amount.toFixed(2));
      }
      relatedTaxes.push({
        type: taxInfo.type,
        rate: taxInfo.rate,
        base: base
      });
    }

    // Count previous invoiced payments to calculate installment number
    const previousPaymentsCount = await prisma.customerPayment.count({
      where: {
        saleId: payment.saleId,
        cfdiStatus: 'INVOICED',
        createdAt: {
          lt: payment.createdAt
        }
      }
    });
    const installment = previousPaymentsCount + 1;

    // Calculate last balance before this payment
    const previousPayments = await prisma.customerPayment.findMany({
      where: {
        saleId: payment.saleId,
        cfdiStatus: 'INVOICED',
        createdAt: {
          lt: payment.createdAt
        }
      },
      select: { amount: true }
    });
    const totalPaidBefore = previousPayments.reduce((acc, p) => acc + p.amount, 0);
    const lastBalance = payment.sale.total - totalPaidBefore;

    // Map paymentMethod to SAT Payment Form
    let paymentForm = "03"; // Default Transferencia (03)
    const reasonUpper = (payment.reason || "").toUpperCase();
    if (reasonUpper.includes("CASH") || reasonUpper.includes("EFECTIVO")) {
      paymentForm = "01";
    } else if (reasonUpper.includes("TRANSFER") || reasonUpper.includes("TRANSFERENCIA")) {
      paymentForm = "03";
    } else if (reasonUpper.includes("CARD") || reasonUpper.includes("TARJETA")) {
      paymentForm = "28";
    } else if (reasonUpper.includes("CHECK") || reasonUpper.includes("CHEQUE")) {
      paymentForm = "02";
    }

    // Format payment date to exactly 12:00 hrs local time for SAT
    const defaultDateObj = payment.paymentDate || payment.createdAt;
    const year = defaultDateObj.getFullYear();
    const month = String(defaultDateObj.getMonth() + 1).padStart(2, '0');
    const day = String(defaultDateObj.getDate()).padStart(2, '0');
    const defaultDateStr = `${year}-${month}-${day}`;
    
    const finalDate = `${paymentDateStr || defaultDateStr}T12:00:00`;

    // Create Payment Complement (REP) as an invoice of type 'P'
    const receipt = await facturapi.invoices.create({
      type: "P",
      customer: {
        legal_name: payment.customer.legalName || payment.customer.name,
        tax_id: payment.customer.taxId || "XAXX010101000",
        tax_system: payment.customer.taxRegime || "616",
        address: {
          zip: payment.customer.zipCode || "76000"
        }
      },
      complements: [
        {
          type: "pago",
          data: [
            {
              payment_form: paymentForm,
              date: finalDate,
              related_documents: [
                {
                  uuid: originalUuid,
                  amount: Number(payment.amount.toFixed(2)),
                  installment: installment,
                  last_balance: Number(lastBalance.toFixed(2)),
                  currency: "MXN",
                  taxes: relatedTaxes
                }
              ]
            }
          ]
        }
      ]
    });

    const receiptPdf = `/api/facturacion/download?invoiceId=${receipt.id}&format=pdf`;
    const receiptXml = `/api/facturacion/download?invoiceId=${receipt.id}&format=xml`;

    // Update payment record in database
    await prisma.customerPayment.update({
      where: { id: paymentId },
      data: {
        cfdiStatus: "INVOICED",
        cfdiUrlPdf: receiptPdf,
        cfdiUrlXml: receiptXml
      }
    });

    revalidatePath(`/clientes/${payment.customerId}`);
    return { success: true, receiptId: receipt.id };
  } catch (error: any) {
    console.error("Error al timbrar abono:", error);
    return { success: false, error: error.message || "Error desconocido al timbrar abono." };
  }
}


