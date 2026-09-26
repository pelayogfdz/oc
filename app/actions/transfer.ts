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
  try {
    const branchActive = await getActiveBranch(); // This is the DESTINATION (toBranchId)
    
    if (!branchActive?.id) throw new Error("No hay sucursal activa");
    if (branchActive.id === 'GLOBAL') throw new Error("Debes seleccionar una sucursal específica para realizar esta acción.");
    if (!payload.fromBranchId) throw new Error("Sucursal origen requerida");
    if (payload.items.length === 0) throw new Error("No hay artículos en la solicitud");

    const authUser = await getActiveUser();

    const { getNextFolio } = await import('./folios');
    const folio = await getNextFolio(branchActive.id, 'transfer');

    const productIds = payload.items.map(i => i.productId);
    const dbProducts = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, sku: true, barcode: true, cost: true, averageCost: true }
    });
    const productMap = new Map(dbProducts.map(p => [p.id, p]));

    // Here, we just CREATE the request. We do NOT deduct stock yet.
    // The items here are mapped to the DESTINATION's catalog so they know what they asked for.
    const newTransfer = await prisma.transfer.create({
      data: {
        folio,
        branchId: payload.fromBranchId, // Quien surte
        toBranchId: branchActive.id,    // Quien pide
        status: "REQUESTED",
        requestedById: authUser.id,
        items: {
          create: payload.items.map(i => {
            const prod = productMap.get(i.productId);
            return {
              productId: i.productId,
              variantId: i.variantId || null,
              quantity: i.quantity,
              cost: prod?.cost || 0,
              averageCost: prod?.averageCost || prod?.cost || 0,
              productName: prod?.name || 'Producto',
              productSku: prod?.sku || null,
              productBarcode: prod?.barcode || null
            };
          })
        }
      }
    });

    revalidatePath('/productos');
    revalidatePath('/productos/traspasos');
    return { success: true, transferId: newTransfer.id };
  } catch (error: any) {
    console.error("Error al solicitar traspaso:", error);
    return { success: false, error: error.message || "Error desconocido al solicitar el traspaso." };
  }
}

export async function approveTransfer(transferId: string) {
  try {
    const branchActive = await getActiveBranch();
    if (!branchActive) throw new Error("No hay sucursal activa");
    if (branchActive.id === 'GLOBAL') throw new Error("Acción no permitida en vista global");

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
    return { success: true };
  } catch (error: any) {
    console.error("Error al aprobar traspaso:", error);
    return { success: false, error: error.message || "Error desconocido al aprobar el traspaso." };
  }
}

// Helper: Resolve or auto-create product in destination branch
async function findOrCreateDestinationProduct(
  tx: any,
  originProduct: any,
  toBranchId: string,
  originVariantId?: string | null
) {
  if (originProduct.branchId === toBranchId) {
    return { destProduct: originProduct, destVariantId: originVariantId || null };
  }

  // 1. Search in destination branch by SKU or Barcode or exact Name
  let destProduct = await tx.product.findFirst({
    where: {
      branchId: toBranchId,
      OR: [
        ...(originProduct.sku ? [{ sku: originProduct.sku.trim() }] : []),
        ...(originProduct.barcode ? [{ barcode: originProduct.barcode.trim() }] : []),
        { name: originProduct.name }
      ]
    }
  });

  // 2. If not found in destination branch, auto-create it seamlessly
  if (!destProduct) {
    destProduct = await tx.product.create({
      data: {
        branchId: toBranchId,
        name: originProduct.name,
        description: originProduct.description || '',
        sku: originProduct.sku || null,
        barcode: originProduct.barcode || null,
        price: originProduct.price || 0,
        cost: originProduct.cost || 0,
        averageCost: originProduct.averageCost || originProduct.cost || 0,
        stock: 0,
        categoryId: originProduct.categoryId || null,
        brandId: originProduct.brandId || null,
        satKey: originProduct.satKey || null,
        satUnit: originProduct.satUnit || null,
        image: originProduct.image || null,
        isActive: true
      }
    });
  }

  // 3. If there is a variant, find or auto-create variant in destination
  let destVariantId = null;
  if (originVariantId) {
    const originVariant = await tx.productVariant.findUnique({ where: { id: originVariantId } });
    if (originVariant) {
      let destVariant = await tx.productVariant.findFirst({
        where: {
          productId: destProduct.id,
          OR: [
            ...(originVariant.sku ? [{ sku: originVariant.sku }] : []),
            ...(originVariant.barcode ? [{ barcode: originVariant.barcode }] : []),
            { attribute: originVariant.attribute }
          ]
        }
      });
      if (!destVariant) {
        destVariant = await tx.productVariant.create({
          data: {
            productId: destProduct.id,
            attribute: originVariant.attribute,
            sku: originVariant.sku || null,
            barcode: originVariant.barcode || null,
            price: originVariant.price,
            cost: originVariant.cost,
            stock: 0
          }
        });
      }
      destVariantId = destVariant.id;
    }
  }

  return { destProduct, destVariantId };
}

// Helper: Resolve or auto-create product in origin branch
async function findOrCreateOriginProduct(
  tx: any,
  productToSearch: any,
  originBranchId: string,
  variantToSearch?: any
) {
  if (productToSearch.branchId === originBranchId) {
    return { originProduct: productToSearch, originVariantId: variantToSearch?.id || null };
  }

  let originProduct = await tx.product.findFirst({
    where: {
      branchId: originBranchId,
      OR: [
        ...(productToSearch.sku ? [{ sku: productToSearch.sku.trim() }] : []),
        ...(productToSearch.barcode ? [{ barcode: productToSearch.barcode.trim() }] : []),
        { name: productToSearch.name }
      ]
    }
  });

  if (!originProduct) {
    originProduct = await tx.product.create({
      data: {
        branchId: originBranchId,
        name: productToSearch.name,
        description: productToSearch.description || '',
        sku: productToSearch.sku || null,
        barcode: productToSearch.barcode || null,
        price: productToSearch.price || 0,
        cost: productToSearch.cost || 0,
        averageCost: productToSearch.averageCost || productToSearch.cost || 0,
        stock: 0,
        categoryId: productToSearch.categoryId || null,
        brandId: productToSearch.brandId || null,
        satKey: productToSearch.satKey || null,
        satUnit: productToSearch.satUnit || null,
        image: productToSearch.image || null,
        isActive: true
      }
    });
  }

  let originVariantId = null;
  if (variantToSearch) {
    let originVariant = await tx.productVariant.findFirst({
      where: {
        productId: originProduct.id,
        OR: [
          ...(variantToSearch.sku ? [{ sku: variantToSearch.sku }] : []),
          ...(variantToSearch.barcode ? [{ barcode: variantToSearch.barcode }] : []),
          { attribute: variantToSearch.attribute }
        ]
      }
    });
    if (!originVariant) {
      originVariant = await tx.productVariant.create({
        data: {
          productId: originProduct.id,
          attribute: variantToSearch.attribute,
          sku: variantToSearch.sku || null,
          barcode: variantToSearch.barcode || null,
          price: variantToSearch.price,
          cost: variantToSearch.cost,
          stock: 0
        }
      });
    }
    originVariantId = originVariant.id;
  }

  return { originProduct, originVariantId };
}

export async function dispatchDirectTransfer(
  payload: {
    toBranchId: string; // The destination branch
    reason: string;
    items: { productId: string; variantId?: string | null; quantity: number }[]; // Products from the ORIGIN branch
    evidencePhoto?: string;
  }
) {
  try {
    const branchActive = await getActiveBranch(); // This is the ORIGIN
    if (!branchActive) throw new Error("No hay sucursal activa");
    if (branchActive.id === 'GLOBAL') throw new Error("Debes seleccionar una sucursal específica para realizar esta acción.");
    if (!payload.toBranchId) throw new Error("Sucursal destino requerida");
    if (payload.items.length === 0) throw new Error("No hay artículos para enviar");

    const authUser = await getActiveUser();

    // Consultar configuración de la sucursal de origen
    const settings = await prisma.branchSettings.findUnique({
      where: { branchId: branchActive.id }
    });
    const config = settings?.configJson ? JSON.parse(settings.configJson) : {};
    const traspasarSinStock = config.ventas?.traspasarSinStock !== undefined 
      ? config.ventas?.traspasarSinStock === true 
      : config.ventas?.venderSinStock === true;

    let transferId = '';
    await prisma.$transaction(async (tx) => {
      const { getNextFolio } = await import('./folios');
      const folio = await getNextFolio(branchActive.id, 'transfer', tx);

      // We create the Transfer and Items immediately as DISPATCHED
      const transfer = await tx.transfer.create({
        data: {
          folio,
          branchId: branchActive.id, // Origen
          toBranchId: payload.toBranchId, // Destino
          status: "DISPATCHED",
          createdById: authUser.id,
          dispatchedById: authUser.id,
          dispatchedAt: new Date(),
          dispatchEvidence: payload.evidencePhoto || null
        }
      });
      transferId = transfer.id;

      for (const item of payload.items) {
        const dispatchedQty = item.quantity;
        if (dispatchedQty <= 0) continue;

        const originProduct = await tx.product.findUnique({ where: { id: item.productId } });
        if (!originProduct) throw new Error(`Producto no encontrado en origen.`);

        let originVariantId = item.variantId || null;

        // Check stock availability if traspasarSinStock is disabled
        if (!traspasarSinStock) {
          if (originProduct.stock < dispatchedQty) {
            throw new Error(`El producto "${originProduct.name}" no tiene suficiente existencia en origen (disponible: ${originProduct.stock}, solicitado: ${dispatchedQty}).`);
          }
          if (originVariantId) {
            const variant = await tx.productVariant.findUnique({ where: { id: originVariantId } });
            if (variant && variant.stock < dispatchedQty) {
              throw new Error(`La variante "${variant.attribute}" de "${originProduct.name}" no tiene suficiente existencia en origen (disponible: ${variant.stock}, solicitado: ${dispatchedQty}).`);
            }
          }
        }

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
            cost: originProduct.cost,
            reason: payload.reason || `Traspaso enviado directo a sucursal ID: ${payload.toBranchId}`,
            userId: authUser.id
          }
        });
          
        // 2. Resolve or auto-create Destination product
        const { destProduct, destVariantId } = await findOrCreateDestinationProduct(
          tx,
          originProduct,
          payload.toBranchId,
          originVariantId
        );

        await tx.transferItem.create({
          data: {
            transferId: transfer.id,
            productId: destProduct.id,
            variantId: destVariantId,
            quantity: dispatchedQty,
            cost: originProduct.cost,
            averageCost: originProduct.averageCost,
            productName: originProduct.name,
            productSku: originProduct.sku,
            productBarcode: originProduct.barcode
          }
        });
      }
    });

    revalidatePath('/productos');
    revalidatePath('/productos/traspasos');
    return { success: true, transferId };
  } catch (error: any) {
    console.error("Error al enviar traspaso directo:", error);
    return { success: false, error: error.message || "Error desconocido al realizar el traspaso directo." };
  }
}

export async function dispatchTransfer(transferId: string, itemQuantities: Record<string, number>, evidencePhoto?: string) {
  try {
    const branchActive = await getActiveBranch(); // Origins
    if (!branchActive) throw new Error("No hay sucursal activa");
    if (branchActive.id === 'GLOBAL') throw new Error("Acción no permitida en vista global");

    const transfer = await prisma.transfer.findUnique({
      where: { id: transferId },
      include: { items: { include: { product: true } } }
    });

    if (!transfer) throw new Error("Traspaso no encontrado");
    if (transfer.status !== 'REQUESTED' && transfer.status !== 'CREATED') {
      throw new Error("El traspaso ya no se puede surtir/despachar");
    }
    if (transfer.branchId !== branchActive.id) {
      throw new Error("Solo la sucursal origen puede surtir este traspaso");
    }

    const authUser = await getActiveUser();

    await prisma.$transaction(async (tx) => {
      for (const item of transfer.items) {
        const dispatchedQty = itemQuantities[item.id] !== undefined ? itemQuantities[item.id] : item.quantity;
        const missingQty = item.quantity - dispatchedQty;

        // Find product at origin branch
        let originProduct = item.product;
        if (originProduct.branchId !== branchActive.id) {
          const correctOriginProd = await tx.product.findFirst({
            where: { branchId: branchActive.id, sku: originProduct.sku, isActive: true }
          });
          if (correctOriginProd) {
            originProduct = correctOriginProd;
          }
        }

        let originVariantId = item.variantId;

        // Check stock availability
        if (dispatchedQty > 0) {
          if (originProduct.stock < dispatchedQty) {
            throw new Error(`Stock insuficiente en origen para ${originProduct.name} (disponible: ${originProduct.stock}, a surtir: ${dispatchedQty})`);
          }
          if (originVariantId) {
            const variant = await tx.productVariant.findUnique({ where: { id: originVariantId } });
            if (variant && variant.stock < dispatchedQty) {
              throw new Error(`Stock insuficiente en origen para variante ${variant.attribute} de ${originProduct.name} (disponible: ${variant.stock}, a surtir: ${dispatchedQty})`);
            }
          }
        }

        // Deduct stock at Origin
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
              cost: originProduct.cost,
              reason: `Traspaso surtido hacia sucursal ID: ${transfer.toBranchId}`,
              userId: authUser.id
            }
          });
            
          await tx.transferItem.update({
             where: { id: item.id },
             data: { 
               quantity: dispatchedQty,
               cost: originProduct.cost,
               averageCost: originProduct.averageCost,
               productName: originProduct.name,
               productSku: originProduct.sku,
               productBarcode: originProduct.barcode
             }
          });
        }

        // Create Purchase Request for missing items if any
        if (missingQty > 0) {
          await tx.purchaseRequest.create({
            data: {
              branchId: transfer.branchId!,
              productId: originProduct.id,
              quantity: missingQty,
              status: "PENDING",
              transferId: transfer.id,
              requestedById: authUser.id
            }
          });
          
          if (dispatchedQty === 0) {
            await tx.transferItem.update({
               where: { id: item.id },
               data: { quantity: 0, cost: 0, averageCost: 0 }
            });
          }
        }
      }

      // Update transfer status
      await tx.transfer.update({
        where: { id: transfer.id },
        data: {
          status: 'DISPATCHED',
          dispatchedById: authUser.id,
          dispatchedAt: new Date(),
          dispatchEvidence: evidencePhoto || null
        }
      });
    });

    revalidatePath('/productos/traspasos');
    return { success: true };
  } catch (error: any) {
    console.error("Error al surtir traspaso:", error);
    return { success: false, error: error.message || "Error desconocido al surtir el traspaso." };
  }
}

export async function receiveTransfer(transferId: string, evidencePhoto?: string) {
  try {
    const branchActive = await getActiveBranch();
    if (!branchActive) throw new Error("No hay sucursal activa");
    if (branchActive.id === 'GLOBAL') throw new Error("Debes seleccionar una sucursal específica para realizar esta acción.");
    
    const transfer = await prisma.transfer.findUnique({
      where: { id: transferId },
      include: { items: { include: { product: true, variant: true } } }
    });

    if (!transfer) throw new Error("Traspaso no encontrado");
    if (transfer.status !== "DISPATCHED") throw new Error("El traspaso no está en tránsito / surtido");
    if (transfer.toBranchId !== branchActive.id) throw new Error("No tienes permiso para recibir en esta sucursal");

    const authUser = await getActiveUser();

    await prisma.$transaction(async (tx) => {
      for (const item of transfer.items) {
        if (item.quantity <= 0) continue; // Skip items that were entirely unfulfilled

        const prodInfo = item.product || await tx.product.findUnique({ where: { id: item.productId } });
        if (!prodInfo) continue;

        // Guarantee we increment in destination branch
        const { destProduct, destVariantId } = await findOrCreateDestinationProduct(
          tx,
          prodInfo,
          transfer.toBranchId!,
          item.variantId
        );

        await tx.product.update({
          where: { id: destProduct.id },
          data: { stock: { increment: item.quantity } }
        });
        
        if (destVariantId) {
          await tx.productVariant.update({
            where: { id: destVariantId },
            data: { stock: { increment: item.quantity } }
          });
        }

        await tx.inventoryMovement.create({
          data: {
            productId: destProduct.id,
            variantId: destVariantId,
            type: 'IN',
            quantity: item.quantity,
            reason: `Recepción de traspaso ID: ${transfer.id}`,
            userId: authUser.id
          }
        });
      }

      await tx.transfer.update({
        where: { id: transfer.id },
        data: { 
          status: "RECEIVED",
          receivedById: authUser.id,
          receivedAt: new Date(),
          receiveEvidence: evidencePhoto || null
        }
      });
    });

    revalidatePath('/productos');
    revalidatePath('/productos/traspasos');
    return { success: true };
  } catch (error: any) {
    console.error("Error al recibir traspaso:", error);
    return { success: false, error: error.message || "Error desconocido al recibir el traspaso." };
  }
}

export async function deleteTransfer(id: string) {
  try {
    await prisma.transferItem.deleteMany({ where: { transferId: id } });
    await prisma.transfer.delete({ where: { id } });
    revalidatePath('/productos/traspasos');
    return { success: true };
  } catch (error: any) {
    console.error("Error al eliminar traspaso:", error);
    return { success: false, error: error.message || "Error desconocido al eliminar el traspaso." };
  }
}

export async function cancelTransfer(transferId: string) {
  try {
    const branchActive = await getActiveBranch();
    if (!branchActive) throw new Error("No hay sucursal activa");
    if (branchActive.id === 'GLOBAL') throw new Error("Vista global no permitida.");
    const authUser = await getActiveUser();

    const transfer = await prisma.transfer.findUnique({
      where: { id: transferId },
      include: { items: { include: { product: true, variant: true } } }
    });

    if (!transfer) throw new Error("Traspaso no encontrado");
    if (transfer.status === 'RECEIVED') throw new Error("No se puede cancelar un traspaso que ya ha sido recibido físicamente en la sucursal de destino.");
    if (transfer.status === 'CANCELLED') throw new Error("Este traspaso ya se encuentra cancelado.");

    await prisma.$transaction(async (tx) => {
      // If it was already dispatched, we return the items back to the origin branch stock
      if (transfer.status === 'DISPATCHED') {
        for (const item of transfer.items) {
          if (item.quantity <= 0) continue;

          const productToSearch = item.product;
          const variantToSearch = item.variant;

          const originProduct = await tx.product.findFirst({
            where: { sku: productToSearch.sku, branchId: transfer.branchId! }
          });

          if (!originProduct) {
            throw new Error(`Producto SKU: ${productToSearch.sku} no existe en la sucursal origen para realizar la devolución.`);
          }

          // Return stock at Origin
          await tx.product.update({
            where: { id: originProduct.id },
            data: { stock: { increment: item.quantity } }
          });

          let originVariantId = null;
          if (variantToSearch) {
            const originVariant = await tx.productVariant.findFirst({
              where: { productId: originProduct.id, sku: variantToSearch.sku, attribute: variantToSearch.attribute }
            });
            if (originVariant) {
              originVariantId = originVariant.id;
              await tx.productVariant.update({
                where: { id: originVariant.id },
                data: { stock: { increment: item.quantity } }
              });
            }
          }

          await tx.inventoryMovement.create({
            data: {
              productId: originProduct.id,
              variantId: originVariantId,
              type: 'IN',
              quantity: item.quantity,
              reason: `Devolución por Cancelación de Traspaso ID: ${transfer.id}`,
              userId: authUser.id
            }
          });
        }
      }

      // Set status to CANCELLED
      await tx.transfer.update({
        where: { id: transfer.id },
        data: { status: 'CANCELLED' }
      });
    });

    revalidatePath('/productos/traspasos');
    revalidatePath('/productos');
    return { success: true };
  } catch (error: any) {
    console.error("Error al cancelar traspaso:", error);
    return { success: false, error: error.message || "Error desconocido al cancelar el traspaso." };
  }
}

export async function getBranchStocksForTransfer(sourceBranchId: string) {
  try {
    if (!sourceBranchId) {
      return { success: true, productStocks: {}, variantStocks: {} };
    }

    const sourceProducts = await prisma.product.findMany({
      where: { branchId: sourceBranchId },
      select: {
        sku: true,
        stock: true,
        variants: {
          select: {
            attribute: true,
            sku: true,
            stock: true
          }
        }
      }
    });

    const productStocks: Record<string, number> = {};
    const variantStocks: Record<string, number> = {};

    for (const p of sourceProducts) {
      if (p.sku) {
        productStocks[p.sku] = p.stock;
        for (const v of p.variants) {
          if (v.attribute) {
            const key = `${p.sku}_${v.attribute}`;
            variantStocks[key] = v.stock;
          }
        }
      }
    }

    return { success: true, productStocks, variantStocks };
  } catch (error: any) {
    console.error("Error fetching branch stocks:", error);
    return { success: false, error: error.message || "Error al obtener existencias de la sucursal origen." };
  }
}

export async function updateTransfer(
  transferId: string,
  payload: {
    fromBranchId: string;
    items: { productId: string; variantId?: string | null; quantity: number }[];
  }
) {
  try {
    const branchActive = await getActiveBranch();
    if (!branchActive) throw new Error("No hay sucursal activa");

    const transfer = await prisma.transfer.findUnique({
      where: { id: transferId },
      include: { items: { include: { product: true, variant: true } } }
    });

    if (!transfer) throw new Error("Traspaso no encontrado");
    if (transfer.status === 'RECEIVED') throw new Error("No se puede editar un traspaso que ya ha sido recibido.");
    if (transfer.status === 'CANCELLED') throw new Error("No se puede editar un traspaso cancelado.");

    if (transfer.status === 'DISPATCHED' && transfer.branchId !== payload.fromBranchId) {
      throw new Error("No se puede cambiar la sucursal de origen de un traspaso que ya ha sido surtido/enviado. Cancela el traspaso y crea uno nuevo.");
    }

    if (payload.items.length === 0) throw new Error("No hay artículos en la solicitud");

    const authUser = await getActiveUser();

    await prisma.$transaction(async (tx) => {
      // 1. If DISPATCHED, temporarily restore old stock to the origin branch
      if (transfer.status === 'DISPATCHED') {
        for (const item of transfer.items) {
          if (item.quantity <= 0) continue;
          const originProduct = await tx.product.findFirst({
            where: { sku: item.product.sku, branchId: transfer.branchId! }
          });
          if (originProduct) {
            await tx.product.update({
              where: { id: originProduct.id },
              data: { stock: { increment: item.quantity } }
            });
            if (item.variant) {
              const originVariant = await tx.productVariant.findFirst({
                where: { productId: originProduct.id, sku: item.variant.sku, attribute: item.variant.attribute }
              });
              if (originVariant) {
                await tx.productVariant.update({
                  where: { id: originVariant.id },
                  data: { stock: { increment: item.quantity } }
                });
              }
            }
            // Reversion movement
            await tx.inventoryMovement.create({
              data: {
                productId: originProduct.id,
                variantId: item.variant ? (await tx.productVariant.findFirst({
                  where: { productId: originProduct.id, sku: item.variant.sku, attribute: item.variant.attribute }
                }))?.id || null : null,
                type: 'IN',
                quantity: item.quantity,
                reason: `Reversión por edición de traspaso ID: ${transfer.id}`,
                userId: authUser.id
              }
            });
          }
        }
      }

      // 2. Delete old transfer items
      await tx.transferItem.deleteMany({ where: { transferId: transfer.id } });

      // 3. Process new items and deduct stock if DISPATCHED
      for (const item of payload.items) {
        const destProduct = await tx.product.findUnique({
          where: { id: item.productId }
        });
        if (!destProduct) throw new Error("Producto destino no encontrado");

        let destVariant = null;
        if (item.variantId) {
          destVariant = await tx.productVariant.findUnique({
            where: { id: item.variantId }
          });
        }

        let cost = 0;
        let averageCost = 0;

        if (transfer.status === 'DISPATCHED') {
          // Find origin product
          const originProduct = await tx.product.findFirst({
            where: { sku: destProduct.sku, branchId: transfer.branchId! }
          });
          if (!originProduct) throw new Error(`Producto SKU: ${destProduct.sku} no existe en origen.`);

          let originVariantId = null;
          if (destVariant) {
            const originVariant = await tx.productVariant.findFirst({
              where: { productId: originProduct.id, sku: destVariant.sku, attribute: destVariant.attribute }
            });
            if (!originVariant) throw new Error(`Variante ${destVariant.attribute} no encontrada en origen.`);
            originVariantId = originVariant.id;

            if (originVariant.stock < item.quantity) {
              throw new Error(`Stock insuficiente en origen para variante ${destVariant.attribute} (Disp: ${originVariant.stock}, Req: ${item.quantity})`);
            }

            await tx.productVariant.update({
              where: { id: originVariant.id },
              data: { stock: { decrement: item.quantity } }
            });
          } else {
            if (originProduct.stock < item.quantity) {
              throw new Error(`Stock insuficiente en origen para producto SKU: ${destProduct.sku} (Disp: ${originProduct.stock}, Req: ${item.quantity})`);
            }
          }

          // Deduct stock
          await tx.product.update({
            where: { id: originProduct.id },
            data: { stock: { decrement: item.quantity } }
          });

          // Log movement
          await tx.inventoryMovement.create({
            data: {
              productId: originProduct.id,
              variantId: originVariantId,
              type: 'OUT',
              quantity: -item.quantity,
              reason: `Traspaso editado/surtido hacia sucursal ID: ${transfer.toBranchId}`,
              userId: authUser.id
            }
          });

          cost = originProduct.cost;
          averageCost = originProduct.averageCost;
        }

        // Create the new transfer item
        await tx.transferItem.create({
          data: {
            transferId: transfer.id,
            productId: destProduct.id,
            variantId: destVariant ? destVariant.id : null,
            quantity: item.quantity,
            cost,
            averageCost
          }
        });
      }

      // 4. Update the transfer metadata
      await tx.transfer.update({
        where: { id: transfer.id },
        data: {
          branchId: payload.fromBranchId
        }
      });
    });

    revalidatePath('/productos');
    revalidatePath('/productos/traspasos');
    return { success: true };
  } catch (error: any) {
    console.error("Error al actualizar traspaso:", error);
    return { success: false, error: error.message || "Error desconocido al actualizar el traspaso." };
  }
}

