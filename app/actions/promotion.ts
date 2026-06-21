'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getActiveBranch } from './auth';

export async function createPromotion(name: string, type: string, value: number, metadata?: string) {
  const branch = await getActiveBranch();
  
  if (branch.id === 'GLOBAL') {
    const tenantId = branch.tenantId;
    if (!tenantId) {
      throw new Error("No se pudo obtener el contexto del inquilino (tenantId).");
    }

    // Get all active branches for this tenant
    const branches = await prisma.branch.findMany({
      where: { tenantId, isActive: true }
    });

    if (branches.length === 0) {
      throw new Error("No hay sucursales activas en este comercio.");
    }

    let parsedMetadata: any = null;
    if (metadata) {
      try {
        parsedMetadata = JSON.parse(metadata);
      } catch (e) {
        console.error("Failed to parse metadata", e);
      }
    }

    if (parsedMetadata && parsedMetadata.targetProducts && parsedMetadata.targetProducts.length > 0) {
      // Find the details of the selected products
      const selectedProducts = await prisma.product.findMany({
        where: { id: { in: parsedMetadata.targetProducts } },
        select: { sku: true, barcode: true, name: true }
      });

      const skuList = selectedProducts.map(p => p.sku).filter(Boolean) as string[];
      const barcodeList = selectedProducts.map(p => p.barcode).filter(Boolean) as string[];
      const nameList = selectedProducts.map(p => p.name);

      // Get all matching products across all active branches
      const matchedProducts = await prisma.product.findMany({
        where: {
          branchId: { in: branches.map(b => b.id) },
          isActive: true,
          OR: [
            skuList.length > 0 ? { sku: { in: skuList } } : undefined,
            barcodeList.length > 0 ? { barcode: { in: barcodeList } } : undefined,
            { name: { in: nameList } }
          ].filter(Boolean) as any
        },
        select: { id: true, branchId: true, sku: true, barcode: true, name: true }
      });

      const creations = branches.map(b => {
        const branchProductIds: string[] = [];

        for (const selProd of selectedProducts) {
          const matched = matchedProducts.find(mp => 
            mp.branchId === b.id && (
              (selProd.sku && mp.sku === selProd.sku) ||
              (selProd.barcode && mp.barcode === selProd.barcode) ||
              (mp.name === selProd.name)
            )
          );
          if (matched) {
            branchProductIds.push(matched.id);
          }
        }

        const branchMetadata = JSON.stringify({
          ...parsedMetadata,
          targetProducts: branchProductIds
        });

        return prisma.promotion.create({
          data: {
            name,
            type,
            value,
            active: true,
            branchId: b.id,
            metadata: branchMetadata
          }
        });
      });

      await prisma.$transaction(creations);
    } else {
      // No target products, replicate same metadata across all branches
      const creations = branches.map(b => prisma.promotion.create({
        data: {
          name,
          type,
          value,
          active: true,
          branchId: b.id,
          metadata
        }
      }));
      await prisma.$transaction(creations);
    }
  } else {
    await prisma.promotion.create({
      data: {
        name,
        type,
        value,
        active: true,
        branchId: branch.id,
        metadata
      }
    });
  }

  revalidatePath('/ventas/promociones');
  revalidatePath('/ventas/nueva'); // Update POS immediately
}

export async function togglePromotion(id: string, active: boolean) {
  await prisma.promotion.update({
    where: { id },
    data: { active }
  });
  revalidatePath('/ventas/promociones');
  revalidatePath('/ventas/nueva');
}

export async function deletePromotion(id: string) {
  await prisma.promotion.delete({ where: { id } });
  revalidatePath('/ventas/promociones');
  revalidatePath('/ventas/nueva');
}

export async function updatePromotion(id: string, name: string, type: string, value: number, active: boolean, metadata?: string) {
  await prisma.promotion.update({
    where: { id },
    data: {
      name,
      type,
      value,
      active,
      metadata
    }
  });
  revalidatePath('/ventas/promociones');
  revalidatePath('/ventas/nueva');
}
