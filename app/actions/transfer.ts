'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getActiveBranch } from './auth';

export async function createTransfer(
  payload: {
    toBranchId: string;
    reason: string;
    items: { productId: string; variantId?: string | null; quantity: number }[];
  }
) {
  const branchFrom = await getActiveBranch();
  
  if (!branchFrom?.id) throw new Error("No hay sucursal origen activa");
  if (!payload.toBranchId) throw new Error("Sucursal destino requerida");
  if (payload.items.length === 0) throw new Error("No hay artículos en el traspaso");

  // Retrieve rules
  const branchSettings = await prisma.branchSettings.findUnique({ where: { branchId: branchFrom.id } });
  const config = branchSettings?.configJson ? JSON.parse(branchSettings.configJson)['ventas'] || {} : {};
  const permitirVenderSinStock = config.venderSinStock === true;

  // 1. Deduct stock at origin and set transfer IN_TRANSIT
  await prisma.$transaction(async (tx) => {
    for (const item of payload.items) {
      const productFrom = await tx.product.findUnique({ where: { id: item.productId } });
      if (!productFrom) throw new Error(`Producto no encontrado`);

      let currentStock = productFrom.stock;
      if (item.variantId) {
         const variant = await tx.productVariant.findUnique({ where: { id: item.variantId } });
         if (variant) currentStock = variant.stock;
      }

      if (!permitirVenderSinStock && currentStock < item.quantity) {
        throw new Error(`Stock insuficiente para el producto ${productFrom.sku}`);
      }

      await tx.product.update({
        where: { id: productFrom.id },
        data: { stock: { decrement: item.quantity } }
      });
      
      if (item.variantId) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { decrement: item.quantity } }
        });
      }

      await tx.inventoryMovement.create({
        data: {
          productId: productFrom.id,
          variantId: item.variantId || null,
          type: 'OUT',
          quantity: -item.quantity,
          reason: `Traspaso salida hacia sucursal (ID: ${payload.toBranchId}). Motivo: ${payload.reason}`
        }
      });
    }

    await tx.transfer.create({
      data: {
        branchId: branchFrom.id,
        toBranchId: payload.toBranchId,
        status: "IN_TRANSIT",
        items: {
          create: payload.items.map(i => ({
            productId: i.productId,
            variantId: i.variantId || null,
            quantity: i.quantity
          }))
        }
      }
    });
  });

  revalidatePath('/productos');
  revalidatePath('/productos/traspasos');
}

export async function receiveTransfer(transferId: string) {
  const branchActive = await getActiveBranch();
  
  const transfer = await prisma.transfer.findUnique({
    where: { id: transferId },
    include: { items: { include: { product: true, variant: true } } }
  });

  if (!transfer) throw new Error("Traspaso no encontrado");
  if (transfer.status !== "IN_TRANSIT") throw new Error("El traspaso no está en tránsito");
  if (transfer.toBranchId !== branchActive?.id) throw new Error("No tienes permiso para recibir en esta sucursal");

  await prisma.$transaction(async (tx) => {
    for (const item of transfer.items) {
      const productFrom = item.product;
      const variantFrom = item.variant;
      
      // Find identical SKU in destination branch
      let productTo = await tx.product.findFirst({
        where: { sku: productFrom.sku, branchId: transfer.toBranchId! }
      });

      if (!productTo) {
        // Auto-create product at destination
        productTo = await tx.product.create({
          data: {
            sku: productFrom.sku,
            barcode: productFrom.barcode,
            name: productFrom.name,
            description: productFrom.description,
            price: productFrom.price,
            cost: productFrom.cost,
            category: productFrom.category,
            brand: productFrom.brand,
            imageUrl: productFrom.imageUrl,
            isActive: true,
            unit: productFrom.unit,
            stock: 0,
            minStock: productFrom.minStock,
            branchId: transfer.toBranchId!
          }
        });
      }

      await tx.product.update({
        where: { id: productTo.id },
        data: { stock: { increment: item.quantity } }
      });
      
      let finalVariantId = null;
      if (variantFrom) {
         let variantTo = await tx.productVariant.findFirst({
           where: { productId: productTo.id, sku: variantFrom.sku, attribute: variantFrom.attribute }
         });
         
         if (!variantTo) {
            variantTo = await tx.productVariant.create({
               data: {
                 productId: productTo.id,
                 attribute: variantFrom.attribute,
                 sku: variantFrom.sku,
                 stock: 0
               }
            });
         }
         
         await tx.productVariant.update({
           where: { id: variantTo.id },
           data: { stock: { increment: item.quantity } }
         });
         finalVariantId = variantTo.id;
      }

      await tx.inventoryMovement.create({
        data: {
          productId: productTo.id,
          variantId: finalVariantId,
          type: 'IN',
          quantity: item.quantity,
          reason: `Recepción de traspaso ID: ${transfer.id}`
        }
      });
    }

    await tx.transfer.update({
      where: { id: transfer.id },
      data: { status: "COMPLETED" }
    });
  });

  revalidatePath('/productos');
  revalidatePath('/productos/traspasos');
}
