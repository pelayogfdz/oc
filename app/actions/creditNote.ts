'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getActiveBranch, getActiveUser } from './auth';
import Facturapi from 'facturapi';
import { sendCreditNoteNotificationEmail } from '@/lib/mailer';

// Helper to convert Facturapi stream/blob to buffer
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

// Helper to resolve Facturapi API Key and settings for a branch
async function getFacturapiConfigForBranch(branchId: string): Promise<{ apiKey: string | null; series: string; defaultPaymentForm: string }> {
  const settings = await prisma.branchSettings.findUnique({
    where: { branchId }
  });
  let apiKey: string | null = null;
  let series = 'NCR';
  let defaultPaymentForm = '01';

  if (settings && settings.configJson) {
    try {
      const config = JSON.parse(settings.configJson);
      const f = config.facturacion || {};
      const entorno = f.entornoFacturapi || 'test';
      apiKey = entorno === 'live' ? f.apiTokenLive || f.liveKey : f.apiTokenTest || f.testKey;
      if (f.serieNotaCredito && f.serieNotaCredito.trim()) {
        series = f.serieNotaCredito.trim().toUpperCase();
      }
      if (f.formaPagoDefaultNCR) {
        defaultPaymentForm = f.formaPagoDefaultNCR;
      }
    } catch {
      // ignore JSON parse error
    }
  }
  return { apiKey, series, defaultPaymentForm };
}

export async function searchSaleForReturn(query: string) {
  try {
    const branch = await getActiveBranch();
    if (!branch || branch.id === 'GLOBAL') {
      return { success: false, error: 'Debes seleccionar una sucursal específica.' };
    }

    // Search by UUID, Folio or Customer (case-insensitive)
    const sale = await prisma.sale.findFirst({
      where: {
        branchId: branch.id,
        OR: [
          { id: query },
          { folio: { equals: query, mode: 'insensitive' } },
          { invoiceId: { equals: query, mode: 'insensitive' } },
          { invoiceFolio: { equals: query, mode: 'insensitive' } }
        ]
      },
      include: {
        customer: true,
        items: {
          include: {
            product: true
          }
        },
        returns: {
          include: {
            items: true
          }
        }
      }
    });

    if (!sale) {
      return { success: false, error: 'Comprobante original no encontrado en esta sucursal.' };
    }

    return { success: true, sale };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error al buscar comprobante.' };
  }
}

export async function createCreditNoteAction({
  saleId,
  type,
  amount,
  returnedItems,
  reason,
  taxRate = 0.16,
  cfdiUse = 'G02',
  paymentForm
}: {
  saleId: string;
  type: '01' | '03'; // '03' = Devolución Física, '01' = Bonificación / Descuento
  amount?: number;
  returnedItems?: { saleItemId: string; productId: string; quantity: number; refundPrice: number }[];
  reason: string;
  taxRate?: number;
  cfdiUse?: string;
  paymentForm?: string;
}) {
  try {
    const branch = await getActiveBranch();
    if (!branch || branch.id === 'GLOBAL') throw new Error("Sucursal no válida.");
    const user = await getActiveUser();

    // 1. Load original Sale
    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: {
        customer: true,
        items: { include: { product: true } }
      }
    });

    if (!sale) throw new Error("Venta no encontrada.");

    const totalRefund = type === '03'
      ? (returnedItems || []).reduce((sum, item) => sum + (item.quantity * item.refundPrice), 0)
      : (amount || 0);

    if (totalRefund <= 0) throw new Error("El monto total a acreditar debe ser mayor a 0.");

    let satCreditNoteUuid: string | null = null;
    let pdfUrl: string | null = null;
    let xmlUrl: string | null = null;

    // 2. Emit Facturapi Credit Note (Egreso CFDI) if original sale is invoiced
    if (sale.invoiceId) {
      const { apiKey, series, defaultPaymentForm } = await getFacturapiConfigForBranch(branch.id);
      if (!apiKey) throw new Error("No hay llaves de Facturapi configuradas para esta sucursal en Preferencias > Facturación.");
      const facturapi = new Facturapi(apiKey);

      // Customer receiver details
      const customer = sale.customer;
      const customerData = customer && customer.taxId ? {
        legal_name: customer.legalName || customer.name,
        tax_id: customer.taxId,
        tax_system: customer.taxRegime || (customer.taxId.length === 12 ? '601' : '605'),
        address: { zip: customer.zipCode || '01000' }
      } : {
        legal_name: "PUBLICO EN GENERAL",
        tax_id: "XAXX010101000",
        tax_system: "616",
        address: { zip: "01000" }
      };

      let facturapiItems: any[] = [];

      if (type === '03' && returnedItems) {
        // Opción A: Devolución Física
        facturapiItems = returnedItems.map(retItem => {
          const originalItem = sale.items.find(i => i.id === retItem.saleItemId);
          if (!originalItem || !originalItem.product.satKey || !originalItem.product.satUnit) {
            throw new Error(`El producto "${originalItem ? originalItem.product.name : ''}" no cuenta con Claves SAT configuradas.`);
          }
          return {
            quantity: retItem.quantity,
            product: {
              description: `Devolución: ${originalItem.product.name}`,
              product_key: originalItem.product.satKey,
              unit_key: originalItem.product.satUnit,
              price: retItem.refundPrice,
              taxes: [
                {
                  type: 'IVA',
                  rate: 0.16 // Tasa estándar de IVA
                }
              ]
            }
          };
        });
      } else {
        // Opción B: Descuento Comercial / Bonificación
        facturapiItems = [
          {
            quantity: 1,
            product: {
              description: `Descuento comercial / Bonificación - Relacionado a Folio: ${sale.folio || sale.id.substring(0, 8)}`,
              product_key: '84111506', // Clave SAT para Notas de Crédito / Servicios de facturación
              unit_key: 'ACT', // Actividad
              price: Number((totalRefund / (1 + taxRate)).toFixed(2)),
              taxes: taxRate > 0 ? [
                {
                  type: 'IVA',
                  rate: taxRate
                }
              ] : []
            }
          }
        ];
      }

      const chosenPaymentForm = paymentForm || (sale.paymentMethod === 'CREDIT' ? '17' : defaultPaymentForm || '01');

      const invoicePayload: any = {
        customer: customerData,
        items: facturapiItems,
        type: 'E', // EGRESO (Nota de Crédito)
        use: cfdiUse || 'G02',
        payment_form: chosenPaymentForm,
        series: series || 'NCR',
        relation: {
          type: '01', // Clave 01: Nota de crédito de los documentos relacionados
          invoices: [ sale.invoiceId ]
        }
      };

      console.log("[CREDIT NOTE] Sending payload to Facturapi:", JSON.stringify(invoicePayload, null, 2));
      const invoice = await facturapi.invoices.create(invoicePayload);
      satCreditNoteUuid = invoice.id;
      
      pdfUrl = `https://api.facturapi.com/v1/invoices/${invoice.id}/pdf`;
      xmlUrl = `https://api.facturapi.com/v1/invoices/${invoice.id}/xml`;
    }

    // 3. Database transaction
    let createdSaleReturnId = '';
    await prisma.$transaction(async (tx) => {
      // Create local SaleReturn document
      const saleReturn = await tx.saleReturn.create({
        data: {
          saleId,
          userId: user.id,
          branchId: branch.id,
          totalRefund,
          refundMethod: sale.paymentMethod === 'CREDIT' ? 'CASH' : 'STORE_CREDIT',
          reason,
          satCreditNote: satCreditNoteUuid || 'LOCAL',
          items: type === '03' && returnedItems ? {
            create: returnedItems.map(item => ({
              saleItemId: item.saleItemId,
              quantity: item.quantity,
              refundPrice: item.refundPrice
            }))
          } : undefined
        }
      });
      createdSaleReturnId = saleReturn.id;

      // Option A: Adjust warehouse stock and movement
      if (type === '03' && returnedItems) {
        for (const retItem of returnedItems) {
          if (retItem.quantity > 0) {
            await tx.product.update({
              where: { id: retItem.productId },
              data: { stock: { increment: retItem.quantity } }
            });
            await tx.inventoryMovement.create({
              data: {
                productId: retItem.productId,
                type: 'IN',
                quantity: retItem.quantity,
                reason: `Nota de Crédito NCR - Devolución Venta #${sale.folio || sale.id.substring(0,8)}`,
                userId: user.id
              }
            });
          }
        }
      }

      // Adjust customer balances
      if (sale.customerId) {
        if (sale.paymentMethod === 'CREDIT' && sale.balanceDue > 0) {
          // A crédito: Disminuye la deuda activa de la venta y del cliente
          const deductDebt = Math.min(totalRefund, sale.balanceDue);
          
          await tx.sale.update({
            where: { id: sale.id },
            data: { balanceDue: { decrement: deductDebt } }
          });

          await tx.customer.update({
            where: { id: sale.customerId },
            data: { creditBalance: { decrement: deductDebt } }
          });

          // Si el reembolso es mayor que el saldo pendiente, la diferencia se va a storeCredit
          const excess = totalRefund - deductDebt;
          if (excess > 0.01) {
            await tx.customer.update({
              where: { id: sale.customerId },
              data: { storeCredit: { increment: excess } }
            });
          }
        } else {
          // De contado: Todo el reembolso se convierte en saldo a favor (storeCredit)
          await tx.customer.update({
            where: { id: sale.customerId },
            data: { storeCredit: { increment: totalRefund } }
          });
        }
      }
    });

    revalidatePath('/ventas/devoluciones');
    revalidatePath('/facturas/notas-credito');
    revalidatePath('/ventas');
    revalidatePath('/clientes');

    return { 
      success: true, 
      id: createdSaleReturnId,
      uuid: satCreditNoteUuid, 
      pdfUrl, 
      xmlUrl,
      isLocalOnly: !sale.invoiceId 
    };
  } catch (err: any) {
    console.error("Error creating credit note:", err);
    return { success: false, error: err.message || "Error al procesar la Nota de Crédito." };
  }
}

export async function getCreditNotesAction({
  search = '',
  page = 1,
  limit = 25
}: {
  search?: string;
  page?: number;
  limit?: number;
} = {}) {
  try {
    const branch = await getActiveBranch();
    if (!branch) return { success: false, error: 'No active branch' };

    const branchFilter = branch.id === 'GLOBAL' 
      ? (branch.tenantId ? { branch: { tenantId: branch.tenantId } } : {}) 
      : { branchId: branch.id };

    const searchFilter: any = search.trim() ? {
      OR: [
        { id: { contains: search.trim(), mode: 'insensitive' } },
        { satCreditNote: { contains: search.trim(), mode: 'insensitive' } },
        { reason: { contains: search.trim(), mode: 'insensitive' } },
        { sale: { folio: { contains: search.trim(), mode: 'insensitive' } } },
        { sale: { customer: { name: { contains: search.trim(), mode: 'insensitive' } } } },
        { sale: { customer: { legalName: { contains: search.trim(), mode: 'insensitive' } } } },
        { sale: { customer: { taxId: { contains: search.trim(), mode: 'insensitive' } } } },
      ]
    } : {};

    const where = {
      ...branchFilter,
      ...searchFilter
    };

    const total = await prisma.saleReturn.count({ where });
    const returns = await prisma.saleReturn.findMany({
      where,
      include: {
        branch: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true } },
        sale: {
          include: {
            customer: true
          }
        },
        items: {
          include: {
            saleItem: {
              include: {
                product: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    });

    return {
      success: true,
      data: returns,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  } catch (error: any) {
    console.error("Error loading credit notes:", error);
    return { success: false, error: error.message || "Error al cargar notas de crédito." };
  }
}

export async function sendCreditNoteEmailAction(saleReturnId: string, email: string) {
  try {
    const saleReturn = await prisma.saleReturn.findUnique({
      where: { id: saleReturnId },
      include: {
        branch: true,
        items: true,
        sale: {
          include: { customer: true }
        }
      }
    });

    if (!saleReturn) throw new Error("Nota de crédito no encontrada.");

    const customer = saleReturn.sale?.customer;
    const saleFolio = saleReturn.sale?.folio || saleReturn.saleId.slice(0, 8).toUpperCase();
    const typeLabel = saleReturn.items && saleReturn.items.length > 0 ? 'Devolución de Mercancía' : 'Bonificación / Descuento';

    let pdfBuffer: Buffer | null = null;
    let xmlBuffer: Buffer | null = null;

    if (saleReturn.satCreditNote && saleReturn.satCreditNote !== 'LOCAL') {
      const { apiKey } = await getFacturapiConfigForBranch(saleReturn.branchId);
      if (apiKey) {
        const facturapi = new Facturapi(apiKey);
        try {
          const pdfBlob = await facturapi.invoices.downloadPdf(saleReturn.satCreditNote);
          pdfBuffer = await binaryDownloadToBuffer(pdfBlob);
        } catch (e) {
          console.error("Error downloading PDF from Facturapi:", e);
        }
        try {
          const xmlBlob = await facturapi.invoices.downloadXml(saleReturn.satCreditNote);
          xmlBuffer = await binaryDownloadToBuffer(xmlBlob);
        } catch (e) {
          console.error("Error downloading XML from Facturapi:", e);
        }
      }
    }

    if (!pdfBuffer) {
      // Generate a basic local PDF buffer or dummy fallback if local
      pdfBuffer = Buffer.from(`Comprobante de Nota de Crédito #${saleReturn.id}\nMonto: $${saleReturn.totalRefund}\nMotivo: ${saleReturn.reason || 'N/A'}`);
    }

    const result = await sendCreditNoteNotificationEmail(
      email,
      customer,
      {
        folio: saleReturn.satCreditNote && saleReturn.satCreditNote !== 'LOCAL' ? saleReturn.satCreditNote.slice(0, 8).toUpperCase() : `NCR-${saleReturn.id.slice(0, 8).toUpperCase()}`,
        uuid: saleReturn.satCreditNote,
        amount: saleReturn.totalRefund,
        reason: saleReturn.reason,
        typeLabel,
        saleFolio
      },
      pdfBuffer,
      xmlBuffer,
      saleReturn.branchId
    );

    return result;
  } catch (error: any) {
    console.error("Error sending credit note email:", error);
    return { success: false, error: error.message || "Error al enviar la nota de crédito por correo." };
  }
}
