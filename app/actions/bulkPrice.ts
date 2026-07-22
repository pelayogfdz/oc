'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getActiveBranch } from './auth';

export async function bulkUpdatePrices(
  updates: { id: string; price: number; wholesalePrice?: number | null; specialPrice?: number | null }[],
  dynamicUpdates?: { productId: string; priceListId: string; price: number | null }[]
) {
  const activeBranch = await getActiveBranch();
  const tenantId = activeBranch?.tenantId;

  let siblingBranchIds: string[] = [];
  if (tenantId) {
    const tenantBranches = await prisma.branch.findMany({
      where: { tenantId, isActive: true },
      select: { id: true }
    });
    siblingBranchIds = tenantBranches.map(b => b.id);
  }

  if (updates.length > 0) {
    await prisma.$transaction(async (tx) => {
      const productIds = updates.map(u => u.id);
      const currentProducts = await tx.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, price: true, branchId: true, sku: true }
      });
      const currentPriceMap = new Map(currentProducts.map(p => [p.id, p]));

      for (const update of updates) {
        const current = currentPriceMap.get(update.id);
        if (!current) continue;

        // Log and update the main product
        if (current.price !== update.price) {
          await tx.priceChangeLog.create({
            data: {
              productId: update.id,
              oldPrice: current.price,
              newPrice: update.price,
              branchId: current.branchId
            }
          });
        }

        await tx.product.update({
          where: { id: update.id },
          data: {
            price: update.price,
            wholesalePrice: update.wholesalePrice,
            specialPrice: update.specialPrice,
          }
        });

        // Propagate to siblings in other branches of the same tenant
        if (current.sku && siblingBranchIds.length > 0) {
          const siblings = await tx.product.findMany({
            where: {
              sku: current.sku,
              branchId: { in: siblingBranchIds },
              id: { not: update.id }
            },
            select: { id: true, branchId: true, price: true }
          });

          for (const p of siblings) {
            if (p.price !== update.price) {
              await tx.priceChangeLog.create({
                data: {
                  productId: p.id,
                  oldPrice: p.price,
                  newPrice: update.price,
                  branchId: p.branchId
                }
              });
            }
          }

          await tx.product.updateMany({
            where: {
              sku: current.sku,
              branchId: { in: siblingBranchIds },
              id: { not: update.id }
            },
            data: {
              price: update.price,
              wholesalePrice: update.wholesalePrice,
              specialPrice: update.specialPrice
            }
          });
        }
      }
    });
  }

  if (dynamicUpdates && dynamicUpdates.length > 0) {
    await prisma.$transaction(async (tx) => {
      for (const update of dynamicUpdates) {
        // Find SKU of updated product
        const product = await tx.product.findUnique({
          where: { id: update.productId },
          select: { sku: true }
        });

        if (!product) continue;

        // Find all sibling products in other branches of the same tenant
        let targetProductIds = [update.productId];
        if (product.sku && siblingBranchIds.length > 0) {
          const siblings = await tx.product.findMany({
            where: {
              sku: product.sku,
              branchId: { in: siblingBranchIds }
            },
            select: { id: true }
          });
          targetProductIds = siblings.map(s => s.id);
        }

        // Apply price updates to all target products (main + siblings)
        for (const pId of targetProductIds) {
          if (update.price === null) {
            await tx.productPrice.deleteMany({
              where: { productId: pId, priceListId: update.priceListId }
            });
          } else {
            await tx.productPrice.upsert({
              where: {
                productId_priceListId: { productId: pId, priceListId: update.priceListId }
              },
              update: { price: update.price },
              create: { productId: pId, priceListId: update.priceListId, price: update.price }
            });
          }
        }
      }
    });
  }

  revalidatePath('/productos');
  revalidatePath('/productos/precios-masivos');
  return { success: true };
}
