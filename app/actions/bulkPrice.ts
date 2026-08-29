'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getActiveBranch, getActiveUser } from './auth';

export async function bulkUpdatePrices(
  updates: { id: string; price: number; wholesalePrice?: number | null; specialPrice?: number | null }[],
  dynamicUpdates?: { productId: string; priceListId: string; price: number | null }[]
) {
  let activeUser = null;
  let validUserId: string | null = null;
  try {
    activeUser = await getActiveUser();
    if (activeUser?.id) {
      const userInDb = await prisma.user.findUnique({
        where: { id: activeUser.id },
        select: { id: true }
      });
      if (userInDb) validUserId = userInDb.id;
    }
  } catch (e) {}

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

  const safeLogPriceChange = async (data: {
    productId: string;
    priceListId?: string | null;
    priceListName?: string | null;
    oldPrice: number;
    newPrice: number;
    branchId: string;
  }) => {
    try {
      await prisma.priceChangeLog.create({
        data: {
          productId: data.productId,
          priceListId: data.priceListId || null,
          priceListName: data.priceListName || null,
          oldPrice: data.oldPrice,
          newPrice: data.newPrice,
          branchId: data.branchId,
          userId: validUserId
        }
      });
    } catch (logErr) {
      console.warn('[BULK PRICE LOG WARNING] Could not record PriceChangeLog:', logErr);
    }
  };

  if (updates.length > 0) {
    const productIds = updates.map(u => u.id);
    const currentProducts = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, price: true, branchId: true, sku: true }
    });
    const currentPriceMap = new Map(currentProducts.map(p => [p.id, p]));

    for (const update of updates) {
      const current = currentPriceMap.get(update.id);
      if (!current) continue;

      // Log and update the main product
      if (current.price !== update.price) {
        await safeLogPriceChange({
          productId: update.id,
          oldPrice: current.price,
          newPrice: update.price,
          branchId: current.branchId,
          priceListName: 'Precio Público'
        });
      }

      await prisma.product.update({
        where: { id: update.id },
        data: {
          price: update.price,
          wholesalePrice: update.wholesalePrice,
          specialPrice: update.specialPrice,
        }
      });

      // Propagate to siblings in other branches of the same tenant
      if (current.sku && siblingBranchIds.length > 0) {
        const siblings = await prisma.product.findMany({
          where: {
            sku: current.sku,
            branchId: { in: siblingBranchIds },
            id: { not: update.id }
          },
          select: { id: true, branchId: true, price: true }
        });

        for (const p of siblings) {
          if (p.price !== update.price) {
            await safeLogPriceChange({
              productId: p.id,
              oldPrice: p.price,
              newPrice: update.price,
              branchId: p.branchId,
              priceListName: 'Precio Público'
            });
          }
        }

        await prisma.product.updateMany({
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
  }

  if (dynamicUpdates && dynamicUpdates.length > 0) {
    for (const update of dynamicUpdates) {
      // Find product and price list info
      const product = await prisma.product.findUnique({
        where: { id: update.productId },
        select: { id: true, sku: true, branchId: true }
      });

      if (!product) continue;

      const sourcePriceList = await prisma.priceList.findUnique({
        where: { id: update.priceListId },
        select: { id: true, name: true, branchId: true }
      });

      if (!sourcePriceList) continue;

      // Find or create matching price list for the product's branch
      let productPl = sourcePriceList;
      if (sourcePriceList.branchId !== product.branchId) {
        let matchingPl = await prisma.priceList.findFirst({
          where: {
            branchId: product.branchId,
            name: { equals: sourcePriceList.name, mode: 'insensitive' }
          }
        });
        if (!matchingPl) {
          matchingPl = await prisma.priceList.create({
            data: {
              branchId: product.branchId,
              name: sourcePriceList.name
            }
          });
        }
        productPl = matchingPl;
      }

      // Update main product price
      const oldPriceRecord = await prisma.productPrice.findUnique({
        where: { productId_priceListId: { productId: product.id, priceListId: productPl.id } }
      });

      if (update.price === null || isNaN(update.price) || update.price <= 0) {
        if (oldPriceRecord) {
          await prisma.productPrice.deleteMany({
            where: { productId: product.id, priceListId: productPl.id }
          });
          await safeLogPriceChange({
            productId: product.id,
            priceListId: productPl.id,
            priceListName: productPl.name,
            oldPrice: oldPriceRecord.price,
            newPrice: 0,
            branchId: product.branchId
          });
        }
      } else {
        await prisma.productPrice.upsert({
          where: {
            productId_priceListId: { productId: product.id, priceListId: productPl.id }
          },
          update: { price: update.price },
          create: { productId: product.id, priceListId: productPl.id, price: update.price }
        });

        if (!oldPriceRecord || oldPriceRecord.price !== update.price) {
          await safeLogPriceChange({
            productId: product.id,
            priceListId: productPl.id,
            priceListName: productPl.name,
            oldPrice: oldPriceRecord ? oldPriceRecord.price : 0,
            newPrice: update.price,
            branchId: product.branchId
          });
        }
      }

      // Propagate to siblings in other branches
      if (product.sku && siblingBranchIds.length > 0) {
        const siblings = await prisma.product.findMany({
          where: {
            sku: product.sku,
            branchId: { in: siblingBranchIds },
            id: { not: product.id }
          },
          select: { id: true, branchId: true }
        });

        for (const sibling of siblings) {
          let siblingPl = await prisma.priceList.findFirst({
            where: {
              branchId: sibling.branchId,
              name: { equals: productPl.name, mode: 'insensitive' }
            }
          });

          if (!siblingPl) {
            siblingPl = await prisma.priceList.create({
              data: {
                branchId: sibling.branchId,
                name: productPl.name
              }
            });
          }

          const sibOldPriceRecord = await prisma.productPrice.findUnique({
            where: { productId_priceListId: { productId: sibling.id, priceListId: siblingPl.id } }
          });

          if (update.price === null || isNaN(update.price) || update.price <= 0) {
            if (sibOldPriceRecord) {
              await prisma.productPrice.deleteMany({
                where: { productId: sibling.id, priceListId: siblingPl.id }
              });
              await safeLogPriceChange({
                productId: sibling.id,
                priceListId: siblingPl.id,
                priceListName: siblingPl.name,
                oldPrice: sibOldPriceRecord.price,
                newPrice: 0,
                branchId: sibling.branchId
              });
            }
          } else {
            await prisma.productPrice.upsert({
              where: {
                productId_priceListId: { productId: sibling.id, priceListId: siblingPl.id }
              },
              update: { price: update.price },
              create: { productId: sibling.id, priceListId: siblingPl.id, price: update.price }
            });

            if (!sibOldPriceRecord || sibOldPriceRecord.price !== update.price) {
              await safeLogPriceChange({
                productId: sibling.id,
                priceListId: siblingPl.id,
                priceListName: siblingPl.name,
                oldPrice: sibOldPriceRecord ? sibOldPriceRecord.price : 0,
                newPrice: update.price,
                branchId: sibling.branchId
              });
            }
          }
        }
      }
    }
  }

  revalidatePath('/productos');
  revalidatePath('/productos/precios-masivos');
  return { success: true };
}
