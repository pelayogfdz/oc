'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getActiveBranch, getActiveUser } from './auth';

export async function createQuote(
  items: { productId: string; quantity: number; price: number }[], 
  total: number,
  paymentMethod: string = 'CASH',
  customerId: string | null = null
) {
  const branch = await getActiveBranch();
  if (branch.id === 'GLOBAL') throw new Error("Debes seleccionar una sucursal específica para realizar esta acción.");
  const user = await getActiveUser();
  
  if (items.length === 0) throw new Error("Quote is empty");

  const quote = await prisma.quote.create({
    data: {
      total,
      paymentMethod,
      customerId,
      branchId: branch.id,
      userId: user.id,
      items: {
        create: items.map(item => ({
          quantity: item.quantity,
          price: item.price,
          productId: item.productId
        }))
      }
    }
  });

  revalidatePath('/ventas/cotizaciones');
  return quote;
}

export async function getQuoteForPOS(quoteId: string) {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: { 
      items: {
        include: { product: true }
      } 
    }
  });
  
  if (!quote) throw new Error("Cotización no encontrada.");
  if (quote.status === "CONVERTED") throw new Error("Esta cotización ya fue convertida a venta.");
  
  return quote;
}

export async function convertQuoteToSale(quoteId: string) {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: { items: true }
  });

  if (!quote) throw new Error("Cotización no encontrada.");
  if (quote.status === "CONVERTED") throw new Error("Ya fue convertida a venta.");

  const { getCurrentSession } = await import('./caja');
  const currentSession = await getCurrentSession();

  const sale = await prisma.sale.create({
    data: {
      total: quote.total,
      paymentMethod: quote.paymentMethod,
      customerId: quote.customerId,
      branchId: quote.branchId,
      userId: quote.userId,
      cashSessionId: currentSession?.id || undefined,
      items: {
        create: quote.items.map(item => ({
          quantity: item.quantity,
          price: item.price,
          productId: item.productId
        }))
      }
    }
  });

  // Deduct stock & Register Kardex Movement
  for (const item of quote.items) {
    await prisma.product.update({
      where: { id: item.productId },
      data: { stock: { decrement: item.quantity } }
    });
    
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
    data: { status: "CONVERTED" }
  });

  revalidatePath('/ventas');
  revalidatePath('/ventas/cotizaciones');
  revalidatePath('/productos');
}
