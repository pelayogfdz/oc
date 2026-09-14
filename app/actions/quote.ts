'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getActiveBranch, getActiveUser } from './auth';

export async function createQuote(
  items: { productId: string; quantity: number; price: number; variantId?: string | null }[], 
  total: number,
  paymentMethod: string = 'CASH',
  customerId: string | null = null,
  quoteId?: string,
  breakdownDiscounts: boolean = false,
  observations?: string | null,
  observationImageUrl?: string | null
) {
  const branch = await getActiveBranch();
  if (!branch) throw new Error("No hay sucursal activa.");
  if (branch.id === 'GLOBAL') throw new Error("Debes seleccionar una sucursal específica para realizar esta acción.");
  const user = await getActiveUser();
  
  console.log("SERVER ACTION - createQuote called with:", {
    itemsCount: items.length,
    itemsSum: items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    total,
    paymentMethod,
    customerId,
    quoteId,
    breakdownDiscounts
  });
  
  if (items.length === 0) throw new Error("Quote is empty");

  const calculatedTotal = breakdownDiscounts
    ? total
    : items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  let quote: any;

  quote = await prisma.$transaction(async (tx) => {
    // Fetch products to snapshot cost and names
    const productIds = items.map(i => i.productId);
    const dbProducts = await tx.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, sku: true, cost: true }
    });
    const productMap = new Map(dbProducts.map(p => [p.id, p]));

    const buildQuoteItems = () => items.map(item => {
      const prod = productMap.get(item.productId);
      const resolvedCost = (item as any).cost !== undefined && (item as any).cost !== null && (item as any).cost > 0
        ? (item as any).cost
        : (prod?.cost ?? 0);
      return {
        quantity: item.quantity,
        price: item.price,
        cost: resolvedCost,
        productId: item.productId,
        variantId: item.variantId || null,
        productName: (item as any).productName || prod?.name || 'Producto',
        productSku: (item as any).productSku || prod?.sku || null
      };
    });

    if (quoteId) {
      // Delete existing items for this quote
      await tx.quoteItem.deleteMany({
        where: { quoteId }
      });

      // Update the quote
      return await tx.quote.update({
        where: { id: quoteId },
        data: {
          total: calculatedTotal,
          paymentMethod,
          customerId,
          branchId: branch.id,
          userId: user.id,
          breakdownDiscounts,
          observations,
          observationImageUrl,
          items: {
            create: buildQuoteItems()
          }
        }
      });
    } else {
      const { getNextFolio } = await import('./folios');
      const folio = await getNextFolio(branch.id, 'quote', tx);

      return await tx.quote.create({
        data: {
          folio,
          total: calculatedTotal,
          paymentMethod,
          customerId,
          branchId: branch.id,
          userId: user.id,
          breakdownDiscounts,
          observations,
          observationImageUrl,
          items: {
            create: buildQuoteItems()
          }
        }
      });
    }
  }, { timeout: 35000, maxWait: 15000 });

  revalidatePath('/ventas/cotizaciones');

  return quote;
}

export async function getQuoteForPOS(quoteId: string) {
  const cleanTerm = quoteId.replace(/^#/, '').trim();
  let quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: { 
      items: {
        include: { 
          product: {
            include: {
              prices: true
            }
          },
          variant: true
        }
      } 
    }
  });

  if (!quote) {
    quote = await prisma.quote.findFirst({
      where: {
        OR: [
          { folio: cleanTerm },
          { folio: { equals: cleanTerm, mode: 'insensitive' } },
          { id: { startsWith: cleanTerm, mode: 'insensitive' } }
        ]
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                prices: true
              }
            },
            variant: true
          }
        }
      }
    });
  }
  
  if (!quote) throw new Error("Cotización no encontrada.");
  // Allow converting quote to sale multiple times as requested by user
  // if (quote.status === "CONVERTED") throw new Error("Esta cotización ya fue convertida a venta.");
  
  return quote;
}

export async function convertQuoteToSale(quoteId: string) {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: { items: true }
  });

  if (!quote) throw new Error("Cotización no encontrada.");
  // Allow converting quote to sale multiple times as requested by user
  // if (quote.status === "CONVERTED") throw new Error("Ya fue convertida a venta.");

  const { getCurrentSession } = await import('./caja');
  const currentSession = await getCurrentSession();
  const activeBranch = await getActiveBranch();
  const finalBranchId = quote.branchId || activeBranch.id;
  const { getNextFolio } = await import('./folios');
  const folio = await getNextFolio(finalBranchId, 'sale');

  let dueDate = null;
  let balanceDue = 0;

  if (quote.paymentMethod === 'CREDIT' && quote.customerId) {
    const customer = await prisma.customer.findUnique({ where: { id: quote.customerId } });
    if (customer) {
      dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + (customer.creditDays || 0));
      balanceDue = quote.total;
    }
  }

  const sale = await prisma.sale.create({
    data: {
      folio,
      total: quote.total,
      paymentMethod: quote.paymentMethod,
      customerId: quote.customerId,
      branchId: quote.branchId,
      userId: quote.userId,
      notes: quote.observations,
      cashSessionId: currentSession?.id || undefined,
      dueDate,
      balanceDue,
      items: {
        create: quote.items.map(item => ({
          quantity: item.quantity,
          price: item.price,
          productId: item.productId
        }))
      }
    }
  });

  if (quote.paymentMethod === 'CREDIT' && quote.customerId) {
    await prisma.customer.update({
      where: { id: quote.customerId },
      data: { creditBalance: { increment: quote.total } }
    });
  }

  // Deduct stock & Register Kardex Movement
  for (const item of quote.items) {
    const product = await prisma.product.findUnique({ where: { id: item.productId } });
    if (product) {
      const updateData: any = { stock: { decrement: item.quantity } };
      if (!product.isActive && product.sku.startsWith('TEMP-')) {
        updateData.isActive = true;
      }
      await prisma.product.update({
        where: { id: item.productId },
        data: updateData
      });
    }
    
    await prisma.inventoryMovement.create({
      data: {
        productId: item.productId,
        type: 'OUT',
        quantity: -item.quantity,
        reason: `Por Cotización convertida #${quote.id.slice(0, 8)}`
      }
    });
  }

  await prisma.quote.update({
    where: { id: quoteId },
    data: { status: `CONVERTED:${sale.id}` }
  });

  revalidatePath('/ventas');
  revalidatePath('/ventas/cotizaciones');
  revalidatePath('/productos');
  revalidatePath('/clientes/cobranza');
  if (quote.customerId) {
    revalidatePath(`/clientes/${quote.customerId}`);
  }
}

export async function createQuickProductsForQuote(
  items: { tempId: string; name: string; price: number; cost: number; supplierId: string | null }[],
  branchId: string
) {
  const result: Record<string, string> = {};

  for (const item of items) {
    const sku = `TEMP-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const product = await prisma.product.create({
      data: {
        sku,
        name: item.name,
        price: item.price,
        cost: item.cost,
        averageCost: item.cost,
        supplierId: item.supplierId || null,
        isActive: false, // Created as INACTIVE initially
        branchId,
        stock: 0,
      }
    });
    result[item.tempId] = product.id;
  }

  return result;
}

export async function sendQuoteByEmail(quoteId: string, email: string) {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: {
      customer: true,
      branch: {
        include: { settings: true, tenant: true }
      },
      items: {
        include: { product: true }
      }
    }
  });

  if (!quote) throw new Error("Cotización no encontrada.");

  const { sendQuoteNotificationEmail } = await import('@/lib/mailer');
  const result = await sendQuoteNotificationEmail(email, quote);
  return result;
}
