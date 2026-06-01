'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getActiveBranch, getActiveUser } from './auth';

export async function createSale(
  items: { productId: string; variantId?: string | null; quantity: number; price: number }[], 
  total: number,
  paymentMethod: string = 'CASH',
  customerId: string | null = null,
  cashSessionId?: string,
  notes?: string,
  cashAmount?: number,
  cardAmount?: number,
  billingData?: { rfc: string; name: string; zipCode: string; regime: string; use: string },
  quoteIdToConvert?: string,
  consignmentIdToConvert?: string,
  pointsRedeemed: number = 0
) {
  try {
    const branch = await getActiveBranch();
    if (!branch || branch.id === 'GLOBAL') {
      throw new Error('Debes seleccionar una sucursal específica para realizar esta acción.');
    }
    const user = await getActiveUser();
    
    if (items.length === 0) throw new Error("Ticket is empty");

    if (customerId) {
      const customerCheck = await prisma.customer.findUnique({ where: { id: customerId } });
      if (customerCheck?.isBlocked) {
        throw new Error("OPERACIÓN RECHAZADA: Este cliente está bloqueado por administración y no puede realizar compras.");
      }
    }
    // Load preferences
    const branchSettings = await prisma.branchSettings.findUnique({ where: { branchId: branch.id } });
    const config = branchSettings?.configJson ? JSON.parse(branchSettings.configJson)['ventas'] || {} : {};
    const permitirVenderSinStock = config.venderSinStock === true;
    const permitirVenderBajoCosto = config.venderBajoCosto === true;

    // Validate items against preferences
    for (const item of items) {
      let product = await prisma.product.findUnique({ where: { id: item.productId } });
      if (!product) throw new Error("Producto no encontrado");

      // Auto-activate temporary products when sold
      if (!product.isActive && product.sku.startsWith('TEMP-')) {
        product = await prisma.product.update({
          where: { id: item.productId },
          data: { isActive: true }
        });
      }

      let currentStock = product.stock;
      if (item.variantId) {
        const variant = await prisma.productVariant.findUnique({ where: { id: item.variantId } });
        if (variant) currentStock = variant.stock;
      }

      if (!permitirVenderSinStock && currentStock - item.quantity < 0) {
        throw new Error(`Inventario insuficiente para: ${product.name}`);
      }

      if (!permitirVenderBajoCosto && item.price < product.cost) {
        throw new Error(`Precio por debajo del costo para: ${product.name}`);
      }
    }

    let dueDate = null;
    let balanceDue = 0;

    // Points redemption logic
    let pointsDiscount = 0;
    if (pointsRedeemed > 0 && customerId) {
      const loyaltySettings = await prisma.loyaltySettings.findUnique({
        where: { branchId: branch.id }
      });
      const pointValue = loyaltySettings?.pointValueInPesos ?? 1.0;
      pointsDiscount = pointsRedeemed * pointValue;

      const customer = await prisma.customer.findUnique({ where: { id: customerId } });
      if (!customer || customer.pointsBalance < pointsRedeemed) {
        throw new Error("El cliente no tiene suficientes puntos en su monedero electrónico.");
      }

      // Deduct points from customer
      await prisma.customer.update({
        where: { id: customerId },
        data: { pointsBalance: { decrement: pointsRedeemed } }
      });

      const pointsNote = `[Monedero Electrónico] Redimidos ${pointsRedeemed} puntos (equivalente a un descuento de $${pointsDiscount.toFixed(2)} pesos).`;
      notes = notes ? `${notes}\n${pointsNote}` : pointsNote;
    }

    const finalSaleTotal = Math.max(0, total - pointsDiscount);

    // CxC Validation
    if (paymentMethod === 'CREDIT' && customerId) {
      const customer = await prisma.customer.findUnique({ where: { id: customerId } });
      if (!customer) throw new Error("Cliente no encontrado para la venta a crédito.");
      if (customer.creditLimit <= 0) throw new Error("El cliente no tiene línea de crédito autorizada.");
      
      if ((customer.creditBalance + finalSaleTotal) > customer.creditLimit) {
        throw new Error(`El cliente excede su límite de crédito. Disponible: $${(customer.creditLimit - customer.creditBalance).toFixed(2)}`);
      }

      const overdueSales = await prisma.sale.findFirst({
        where: {
           customerId,
           balanceDue: { gt: 0 },
           dueDate: { lt: new Date() }
        }
      });
      if (overdueSales) {
        throw new Error("El cliente tiene facturas vencidas. No se puede otorgar nuevo crédito hasta liquidar.");
      }

      dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + customer.creditDays);
      balanceDue = finalSaleTotal;
    }

    const { getNextFolio } = await import('./folios');
    const folio = await getNextFolio(branch.id, 'sale');

    const sale = await prisma.sale.create({
      data: {
        folio,
        total: finalSaleTotal,
        paymentMethod,
        customerId,
        cashSessionId,
        notes,
        cashAmount,
        cardAmount,
        branchId: branch.id,
        userId: user.id,
        dueDate,
        balanceDue,
        items: {
          create: items.map(item => ({
            quantity: item.quantity,
            price: item.price,
            productId: item.productId,
            variantId: item.variantId || null
          }))
        }
      }
    });

    // Deduct stock & Register Kardex Movement (only if NOT converting from a consignment)
    if (!consignmentIdToConvert) {
      for (const item of items) {
        await prisma.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } }
        });
        
        if (item.variantId) {
          await prisma.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { decrement: item.quantity } }
          });
        }
        
        // FEFO Batch Deduction
        let remainingToDeduct = item.quantity;
        const availableBatches = await prisma.productBatch.findMany({
          where: { productId: item.productId, stock: { gt: 0 } },
          orderBy: { expirationDate: 'asc' } // oldest expires first
        });

        for (const batch of availableBatches) {
          if (remainingToDeduct <= 0) break;
          const deductAmount = Math.min(batch.stock, remainingToDeduct);
          
          await prisma.productBatch.update({
            where: { id: batch.id },
            data: { stock: { decrement: deductAmount } }
          });
          
          await prisma.inventoryMovement.create({
            data: {
              productId: item.productId,
              variantId: item.variantId || null,
              batchId: batch.id,
              type: 'OUT',
              quantity: -deductAmount,
              reason: `Venta #${sale.id.slice(0, 8)} (FEFO Lote)`
            }
          });
          
          remainingToDeduct -= deductAmount;
        }

        // If sold without stock or items not assigned to any batch
        if (remainingToDeduct > 0) {
          await prisma.inventoryMovement.create({
            data: {
              productId: item.productId,
              variantId: item.variantId || null,
              type: 'OUT',
              quantity: -remainingToDeduct,
              reason: `Venta #${sale.id.slice(0, 8)} (Sin Lote)`
            }
          });
        }
      }
    }

    // Si fue a crédito, actualizar la deuda. Adicionalmente, Loyalty Points Engine o Cashback Fallback
    if (customerId) {
      if (paymentMethod === 'CREDIT') {
         await prisma.customer.update({
            where: { id: customerId },
            data: { creditBalance: { increment: finalSaleTotal } }
         });
      }

      // Log point redemption transaction if any
      if (pointsRedeemed > 0) {
        await prisma.loyaltyTransaction.create({
          data: {
            customerId,
            type: 'REDEEMED',
            points: pointsRedeemed,
            reason: `Redención de puntos en Venta #${sale.id.slice(0, 8)}`,
            saleId: sale.id
          }
        });
      }

      try {
        const loyaltySettings = await prisma.loyaltySettings.findUnique({
          where: { branchId: branch.id }
        });

        if (loyaltySettings && loyaltySettings.isActive) {
          const allowedMethods = loyaltySettings.paymentMethods.split(',');
          if (allowedMethods.includes(paymentMethod)) {
            // Check payment-method points multiplier
            let pointsMultiplier = loyaltySettings.pointsPerAmount;
            if (paymentMethod === 'CASH') {
              pointsMultiplier = (loyaltySettings as any).pointsCash ?? loyaltySettings.pointsPerAmount;
            } else if (paymentMethod === 'CARD') {
              pointsMultiplier = (loyaltySettings as any).pointsCard ?? loyaltySettings.pointsPerAmount;
            } else if (paymentMethod === 'TRANSFER') {
              pointsMultiplier = (loyaltySettings as any).pointsTransfer ?? loyaltySettings.pointsPerAmount;
            } else if (paymentMethod === 'CREDIT') {
              pointsMultiplier = (loyaltySettings as any).pointsCredit ?? 0.0;
            } else if (paymentMethod === 'MIXTO') {
              pointsMultiplier = (loyaltySettings as any).pointsMixto ?? loyaltySettings.pointsPerAmount;
            }

            const calculatedPoints = Math.floor(finalSaleTotal / loyaltySettings.amountStep) * pointsMultiplier;
            
            if (calculatedPoints > 0) {
              const expiryDate = new Date();
              expiryDate.setDate(expiryDate.getDate() + loyaltySettings.validityDays);

              await prisma.customer.update({
                where: { id: customerId },
                data: {
                  pointsBalance: { increment: calculatedPoints },
                  pointsExpiryDate: expiryDate
                }
              });

              await prisma.loyaltyTransaction.create({
                data: {
                  customerId,
                  type: 'EARNED',
                  points: calculatedPoints,
                  reason: `Compra Venta #${sale.id.slice(0, 8)}`,
                  saleId: sale.id
                }
              });
              console.log(`[Loyalty Engine] Recompensado ${calculatedPoints} puntos a cliente ${customerId}. Expira: ${expiryDate.toLocaleDateString()}`);
            }
          }
        } else {
          // Fallback al motor anterior de Cashback si no hay fidelización de puntos configurada
          if (paymentMethod !== 'CREDIT') {
              const rewardPoints = parseFloat((finalSaleTotal * 0.03).toFixed(2));
              await prisma.customer.update({
                where: { id: customerId },
                data: { storeCredit: { increment: rewardPoints } }
              });
              console.log(`[Loyalty Fallback] Recompensado $${rewardPoints} a cliente ${customerId}`);
          }
        }
      } catch (err) {
        console.error("[Loyalty Engine Error] Error calculating points: ", err);
      }
    }

    // Si se solicitó factura, actualizar datos fiscales del cliente si existe
    if (billingData && customerId) {
       await prisma.customer.update({
          where: { id: customerId },
          data: {
             taxId: billingData.rfc,
             legalName: billingData.name,
             zipCode: billingData.zipCode,
             taxRegime: billingData.regime,
             cfdiUse: billingData.use
          }
       });
    }

    if (quoteIdToConvert) {
       await prisma.quote.update({
          where: { id: quoteIdToConvert },
          data: { status: 'CONVERTED' }
       });
       revalidatePath('/ventas/cotizaciones');
    }

    if (consignmentIdToConvert) {
       await prisma.consignment.update({
          where: { id: consignmentIdToConvert },
          data: { status: 'CONVERTED' }
       });
       revalidatePath('/ventas/consignaciones');
    }

    revalidatePath('/ventas');
    revalidatePath('/productos');
    if (paymentMethod === 'CREDIT') revalidatePath('/clientes/cobranza');
    
    return { success: true, sale };
  } catch (error: any) {
    return { success: false, error: error.message || String(error) };
  }
}

export async function refundSale(formData: FormData) {
  const saleId = formData.get('saleId') as string;
  
  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: { items: true, cashSession: true }
  });

  if (!sale || sale.status === 'REFUNDED') throw new Error("Venta no encontrada o ya devuelta");

  // Re-stock items
  for (const item of sale.items) {
    await prisma.product.update({
      where: { id: item.productId },
      data: { stock: { increment: item.quantity } }
    });
    
    await prisma.inventoryMovement.create({
      data: {
        productId: item.productId,
        type: 'IN',
        quantity: item.quantity,
        reason: `Devolución de Venta #${sale.id.slice(0, 8)}`
      }
    });
  }

  // Handle cash logic if paid in cash
  if (sale.paymentMethod === 'CASH' && sale.cashSessionId) {
    // Check if session is still open
    const targetSession = await prisma.cashSession.findUnique({ where: { id: sale.cashSessionId } });
    if (targetSession && targetSession.status === 'OPEN') {
      await prisma.cashMovement.create({
         data: {
           sessionId: targetSession.id,
           type: 'OUT',
           amount: sale.total,
           reason: `Reembolso Físico Venta #${sale.id.slice(0, 8)}`
         }
      });
    }
  } else if (sale.paymentMethod === 'MIXTO' && sale.cashSessionId && sale.cashAmount) {
     const targetSession = await prisma.cashSession.findUnique({ where: { id: sale.cashSessionId } });
     if (targetSession && targetSession.status === 'OPEN') {
        await prisma.cashMovement.create({
           data: {
             sessionId: targetSession.id,
             type: 'OUT',
             amount: sale.cashAmount,
             reason: `Reembolso Físico Parcial de Venta Mixta #${sale.id.slice(0, 8)}`
           }
        });
     }
  }

  await prisma.sale.update({
    where: { id: sale.id },
    data: { status: 'REFUNDED' }
  });

  revalidatePath('/ventas/devoluciones');
  revalidatePath('/ventas');
  revalidatePath('/productos');
}
