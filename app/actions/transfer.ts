'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getActiveBranch, getActiveUser } from './auth';

export async function requestTransfer(
  payload: {
    fromBranchId: string; // The branch that will supply the goods
    reason: string;
    items: { productId: string; variantId?: string | null; quantity: number }[]; // Products from the DESTINATION (requesting) branch
  }
) {
  const branchActive = await getActiveBranch(); // This is the DESTINATION (toBranchId)
  
  if (!branchActive?.id) throw new Error("No hay sucursal activa");
  if (branchActive.id === 'GLOBAL') throw new Error("Debes seleccionar una sucursal específica para realizar esta acción.");
  if (!payload.fromBranchId) throw new Error("Sucursal origen requerida");
  if (payload.items.length === 0) throw new Error("No hay artículos en la solicitud");

  const authUser = await getActiveUser();

  // Here, we just CREATE the request. We do NOT deduct stock yet.
  // The items here are mapped to the DESTINATION's catalog so they know what they asked for.
  await prisma.transfer.create({
    data: {
      branchId: payload.fromBranchId, // Quien surte
      toBranchId: branchActive.id,    // Quien pide
      status: "REQUESTED",
      requestedById: authUser.id,
      items: {
        create: payload.items.map(i => ({
          productId: i.productId,
          variantId: i.variantId || null,
          quantity: i.quantity,
          cost: 0, // Costs aren't known until the origin fulfills it
          averageCost: 0
        }))
      }
    }
  });

  revalidatePath('/productos');
  revalidatePath('/productos/traspasos');
}

export async function approveTransfer(transferId: string) {
  const branchActive = await getActiveBranch();
  if (branchActive?.id === 'GLOBAL') throw new Error("Acción no permitida en vista global");

  const transfer = await prisma.transfer.findUnique({ where: { id: transferId } });
  if (!transfer) throw new Error("Traspaso no encontrado");
  if (transfer.status !== 'REQUESTED') throw new Error("El traspaso no está en estado de solicitud");
  if (transfer.branchId !== branchActive.id) throw new Error("No eres la sucursal origen para aprobar esto");

  const authUser = await getActiveUser();

  await prisma.transfer.update({
    where: { id: transferId },
    data: {
      status: 'CREATED',
      createdById: authUser.id
    }
  });

  revalidatePath('/productos/traspasos');
}

export async function dispatchDirectTransfer(
  payload: {
    toBranchId: string; // The destination branch
    reason: string;
    items: { productId: string; variantId?: string | null; quantity: number }[]; // Products from the ORIGIN branch
  }
) {
  const branchActive = await getActiveBranch(); // This is the ORIGIN
  if (branchActive?.id === 'GLOBAL') throw new Error("Debes seleccionar una sucursal específica para realizar esta acción.");
  if (!payload.toBranchId) throw new Error("Sucursal destino requerida");
  if (payload.items.length === 0) throw new Error("No hay artículos para enviar");

  const authUser = await getActiveUser();

  await prisma.$transaction(async (tx) => {
    // We create the Transfer and Items immediately as DISPATCHED
    const transfer = await tx.transfer.create({
      data: {
        branchId: branchActive.id, // Origen
        toBranchId: payload.toBranchId, // Destino
        status: "DISPATCHED",
        createdById: authUser.id,
        dispatchedById: authUser.id,
        dispatchedAt: new Date()
      }
    });

    for (const item of payload.items) {
      const dispatchedQty = item.quantity;
      if (dispatchedQty <= 0) continue;

      const originProduct = await tx.product.findUnique({ where: { id: item.productId } });
      if (!originProduct) throw new Error(`Producto no encontrado en origen.`);

      let originVariantId = item.variantId || null;

      // 1. Deduct stock at Origin
      await tx.product.update({
        where: { id: originProduct.id },
        data: { stock: { decrement: dispatchedQty } }
      });

      if (originVariantId) {
        await tx.productVariant.update({
          where: { id: originVariantId },
          data: { stock: { decrement: dispatchedQty } }
        });
      }

      await tx.inventoryMovement.create({
        data: {
          productId: originProduct.id,
          variantId: originVariantId,
          type: 'OUT',
          quantity: -dispatchedQty,
          reason: payload.reason || `Traspaso enviado directo a sucursal ID: ${payload.toBranchId}`
        }
      });
        
      // 2. Create the TransferItem mapped to Destination product 
      // (Actually, to make it receive smoothly, we map it to Origin product IDs now, 
      // but receiveTransfer assumes the item.product refers to DESTINATION catalog.
      // Wait: the database uses global catalog? No, each branch has its own Product.
      // Let's find the matching SKU in DESTINATION.)
      const destProduct = await tx.product.findFirst({
         where: { sku: originProduct.sku, branchId: payload.toBranchId }
      });
      if (!destProduct) throw new Error(`El producto SKU: ${originProduct.sku} no existe todavía en la sucursal destino. Deberás crearlo allá primero o usar el actualizador masivo.`);
      
      let destVariantId = null;
      if (originVariantId) {
         const originVariant = await tx.productVariant.findUnique({ where: { id: originVariantId } });
         const destVariant = await tx.productVariant.findFirst({
            where: { productId: destProduct.id, sku: originVariant?.sku, attribute: originVariant?.attribute }
         });
         // If destination doesn't have the variant, we gracefully just pass null or throw?
         // Let's enforce existence:
         if (!destVariant) throw new Error(`La variante SKU: ${originVariant?.sku} no existe en destino.`);
         destVariantId = destVariant.id;
      }

      await tx.transferItem.create({
        data: {
          transferId: transfer.id,
          productId: destProduct.id,
          variantId: destVariantId,
          quantity: dispatchedQty,
          cost: originProduct.cost,
          averageCost: originProduct.averageCost
        }
      });
    }
  });

  revalidatePath('/productos');
  revalidatePath('/productos/traspasos');
}

export async function dispatchTransfer(transferId: string, itemQuantities: Record<string, number>) {
  const branchActive = await getActiveBranch(); // Origins
  if (branchActive?.id === 'GLOBAL') throw new Error("Vista global no permitida.");

  const transfer = await prisma.transfer.findUnique({
    where: { id: transferId },
    include: { items: { include: { product: true, variant: true } } }
  });

  if (!transfer) throw new Error("Traspaso no encontrado");
  if (transfer.status !== 'CREATED' && transfer.status !== 'REQUESTED') throw new Error("Estatus inválido para surtir");
  if (transfer.branchId !== branchActive.id) throw new Error("Sólo la sucursal de origen puede surtir el traspaso");

  const authUser = await getActiveUser();

  await prisma.$transaction(async (tx) => {
    for (const item of transfer.items) {
      const requestedQty = item.quantity;
      const dispatchedQty = itemQuantities[item.id] ?? requestedQty; // The user can adjust this down
      const missingQty = requestedQty - dispatchedQty;

      // 1. Find product in ORIGIN branch by matching SKU
      const productToSearch = item.product;
      const variantToSearch = item.variant;

      const originProduct = await tx.product.findFirst({
        where: { sku: productToSearch.sku, branchId: transfer.branchId! }
      });

      if (!originProduct) {
        throw new Error(`Producto SKU: ${productToSearch.sku} no existe en origen.`);
      }

      let originVariantId = null;
      if (variantToSearch) {
        const originVariant = await tx.productVariant.findFirst({
          where: { productId: originProduct.id, sku: variantToSearch.sku, attribute: variantToSearch.attribute }
        });
        if (!originVariant) throw new Error(`Variante ${variantToSearch.attribute} no encontrada en origen.`);
        originVariantId = originVariant.id;

        if (originVariant.stock < dispatchedQty) {
           throw new Error(`Stock insuficiente para variante ${variantToSearch.attribute} (Disp: ${originVariant.stock})`);
        }
      } else {
        if (originProduct.stock < dispatchedQty) {
           throw new Error(`Stock insuficiente para producto SKU: ${productToSearch.sku} (Disp: ${originProduct.stock})`);
        }
      }

      // 2. Deduct stock at Origin
      if (dispatchedQty > 0) {
        await tx.product.update({
          where: { id: originProduct.id },
          data: { stock: { decrement: dispatchedQty } }
        });

        if (originVariantId) {
          await tx.productVariant.update({
            where: { id: originVariantId },
            data: { stock: { decrement: dispatchedQty } }
          });
        }

        await tx.inventoryMovement.create({
          data: {
            productId: originProduct.id,
            variantId: originVariantId,
            type: 'OUT',
            quantity: -dispatchedQty,
            reason: `Traspaso surtido hacia sucursal ID: ${transfer.toBranchId}`
          }
        });
          
        // Update TransferItem with dispatched qty & known cost from origin
        await tx.transferItem.update({
           where: { id: item.id },
           data: { 
             quantity: dispatchedQty,
             cost: originProduct.cost,
             averageCost: originProduct.averageCost
           }
        });
      }

      // 3. Create Purchase Request for missing
      if (missingQty > 0) {
        await tx.purchaseRequest.create({
          data: {
            branchId: transfer.branchId!, // La orden de compra la hará la sucursal origen
            productId: originProduct.id,
            quantity: missingQty,
            status: "PENDING",
            transferId: transfer.id,
            requestedById: authUser.id
          }
        });
        
        // If dispatched 0, the transfer item should just be deleted or updated to 0. We updated it above if > 0.
        if (dispatchedQty === 0) {
          await tx.transferItem.update({
             where: { id: item.id },
             data: { quantity: 0, cost: 0, averageCost: 0 }
          });
        }
      }
    }

    // 4. Update transfer status
    await tx.transfer.update({
      where: { id: transfer.id },
      data: {
        status: 'DISPATCHED',
        dispatchedById: authUser.id,
        dispatchedAt: new Date()
      }
    });
  });

  revalidatePath('/productos/traspasos');
}

export async function receiveTransfer(transferId: string) {
  const branchActive = await getActiveBranch();
  if (branchActive?.id === 'GLOBAL') throw new Error("Debes seleccionar una sucursal específica para realizar esta acción.");
  
  const transfer = await prisma.transfer.findUnique({
    where: { id: transferId },
    include: { items: { include: { product: true, variant: true } } }
  });

  if (!transfer) throw new Error("Traspaso no encontrado");
  if (transfer.status !== "DISPATCHED") throw new Error("El traspaso no está en tránsito / surtido");
  if (transfer.toBranchId !== branchActive?.id) throw new Error("No tienes permiso para recibir en esta sucursal");

  const authUser = await getActiveUser();

  await prisma.$transaction(async (tx) => {
    for (const item of transfer.items) {
      if (item.quantity <= 0) continue; // Skip items that were entirely unfulfilled

      const productTo = item.product; // Note: these belong to Dest branch originally, so they are already mapped!
      const variantTo = item.variant;

      await tx.product.update({
        where: { id: productTo.id },
        data: { stock: { increment: item.quantity } }
      });
      
      if (variantTo) {
         await tx.productVariant.update({
           where: { id: variantTo.id },
           data: { stock: { increment: item.quantity } }
         });
      }

      await tx.inventoryMovement.create({
        data: {
          productId: productTo.id,
          variantId: variantTo?.id || null,
          type: 'IN',
          quantity: item.quantity,
          reason: `Recepción de traspaso ID: ${transfer.id}`
        }
      });
    }

    await tx.transfer.update({
      where: { id: transfer.id },
      data: { 
         status: "RECEIVED",
         receivedById: authUser.id,
         receivedAt: new Date()
      }
    });
  });

  revalidatePath('/productos');
  revalidatePath('/productos/traspasos');
}

export async function deleteTransfer(id: string) {
  await prisma.transferItem.deleteMany({ where: { transferId: id } });
  await prisma.transfer.delete({ where: { id } });
  revalidatePath('/productos/traspasos');
}
