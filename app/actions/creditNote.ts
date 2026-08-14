'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getActiveBranch, getActiveUser } from './auth';
import Facturapi from 'facturapi';

// Helper to resolve Facturapi API Key for a branch
async function getFacturapiApiKeyForBranch(branchId: string): Promise<string | null> {
  const settings = await prisma.branchSettings.findUnique({
    where: { branchId }
  });
  if (!settings || !settings.configJson) return null;
  try {
    const config = JSON.parse(settings.configJson);
    const f = config.facturacion || {};
    const entorno = f.entornoFacturapi || 'test';
    return entorno === 'live' ? f.apiTokenLive || f.liveKey : f.apiTokenTest || f.testKey;
  } catch {
    return null;
  }
}

export async function searchSaleForReturn(query: string) {
  try {
    const branch = await getActiveBranch();
    if (!branch || branch.id === 'GLOBAL') {
      return { success: false, error: 'Debes seleccionar una sucursal específica.' };
    }

    // Search by UUID or Folio (case-insensitive)
    const sale = await prisma.sale.findFirst({
      where: {
        branchId: branch.id,
        OR: [
          { id: query },
          { folio: { equals: query, mode: 'insensitive' } }
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
  cfdiUse = 'G02'
}: {
  saleId: string;
  type: '01' | '03';
  amount?: number;
  returnedItems?: { saleItemId: string; productId: string; quantity: number; refundPrice: number }[];
  reason: string;
  taxRate?: number;
  cfdiUse?: string;
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
      const apiKey = await getFacturapiApiKeyForBranch(branch.id);
      if (!apiKey) throw new Error("No hay llaves de Facturapi configuradas para esta sucursal.");
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
                  rate: 0.16 // Standard 16% IVA
                }
              ]
            }
          };
        });
      } else {
        // Opción B: Descuento Comercial
        facturapiItems = [
          {
            quantity: 1,
            product: {
              description: `Descuento comercial / Bonificación - Relacionado a Folio: ${sale.folio || sale.id.substring(0, 8)}`,
              product_key: '84111506', // Servicios de facturación (SAT Code for Credit Notes)
              unit_key: 'ACT', // Actividad
              price: Number((totalRefund / (1 + taxRate)).toFixed(2)), // Subtotal before tax
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

      const invoicePayload = {
        customer: customerData,
        items: facturapiItems,
        type: 'E', // EGRESO (Credit Note)
        use: cfdiUse,
        relation: {
          type: type, // "01" (Nota de crédito) o "03" (Devolución)
          invoices: [ sale.invoiceId ]
        }
      };

      console.log("[CREDIT NOTE] Sending payload to Facturapi:", JSON.stringify(invoicePayload, null, 2));
      const invoice = await facturapi.invoices.create(invoicePayload);
      satCreditNoteUuid = invoice.id;
      
      // Facturapi provides downloadable URLs directly
      pdfUrl = `https://api.facturapi.com/v1/invoices/${invoice.id}/pdf`;
      xmlUrl = `https://api.facturapi.com/v1/invoices/${invoice.id}/xml`;
    }

    // 3. Database transaction
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
    revalidatePath('/ventas');
    revalidatePath('/clientes');

    return { 
      success: true, 
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
