'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getActiveBranch } from './auth';

export async function createPromotion(name: string, type: string, value: number, metadata?: string) {
  const branch = await getActiveBranch();
  
  let parsedMetadata: any = null;
  if (metadata) {
    try {
      parsedMetadata = JSON.parse(metadata);
    } catch (e) {
      console.error("Failed to parse metadata", e);
    }
  }

  // Find all active branches for this tenant to validate targetBranches
  const tenantId = branch.tenantId;
  if (!tenantId) {
    throw new Error("No se pudo obtener el contexto del inquilino (tenantId).");
  }

  const branches = await prisma.branch.findMany({
    where: { tenantId, isActive: true }
  });

  // Determine target branches to create the promotion in
  let targetBranches = [branch];
  if (branch.id === 'GLOBAL') {
    targetBranches = branches;
  }

  if (parsedMetadata && Array.isArray(parsedMetadata.targetBranches) && parsedMetadata.targetBranches.length > 0) {
    targetBranches = branches.filter(b => parsedMetadata.targetBranches.includes(b.id));
  }

  if (targetBranches.length === 0) {
    throw new Error("Debes seleccionar al menos una sucursal activa.");
  }

  // Generate a unique groupId to link these replicated promotions together for editing/deleting
  const groupId = crypto.randomUUID();

  // Find the selected products (if any) to map them across branches
  let selectedProducts: any[] = [];
  let skuList: string[] = [];
  let barcodeList: string[] = [];
  let nameList: string[] = [];

  if (parsedMetadata && parsedMetadata.targetProducts && parsedMetadata.targetProducts.length > 0) {
    selectedProducts = await prisma.product.findMany({
      where: { id: { in: parsedMetadata.targetProducts } },
      select: { sku: true, barcode: true, name: true }
    });

    skuList = selectedProducts.map(p => p.sku).filter(Boolean) as string[];
    barcodeList = selectedProducts.map(p => p.barcode).filter(Boolean) as string[];
    nameList = selectedProducts.map(p => p.name);
  }

  // Get all matching products across all target branches
  const matchedProducts = selectedProducts.length > 0
    ? await prisma.product.findMany({
        where: {
          branchId: { in: targetBranches.map(b => b.id) },
          isActive: true,
          OR: [
            skuList.length > 0 ? { sku: { in: skuList } } : undefined,
            barcodeList.length > 0 ? { barcode: { in: barcodeList } } : undefined,
            { name: { in: nameList } }
          ].filter(Boolean) as any
        },
        select: { id: true, branchId: true, sku: true, barcode: true, name: true }
      })
    : [];

  // Query price lists for target branches to map targetPriceLists
  const targetPriceListsNames = parsedMetadata?.targetPriceLists || ['price'];
  
  const allPriceLists = await prisma.priceList.findMany({
    where: { branchId: { in: targetBranches.map(b => b.id) } },
    select: { id: true, name: true, branchId: true }
  });

  await prisma.$transaction(async (tx) => {
    for (const b of targetBranches) {
      // 1. Map targetProducts for this branch
      const branchProductIds: string[] = [];
      if (selectedProducts.length > 0) {
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
      }

      // 2. Map targetPriceLists for this branch
      const branchPriceLists: string[] = [];
      for (const plVal of targetPriceListsNames) {
        if (['price', 'wholesalePrice', 'specialPrice'].includes(plVal)) {
          branchPriceLists.push(plVal);
        } else if (plVal.startsWith('dynamicName:')) {
          const plName = plVal.replace('dynamicName:', '');
          const foundPl = allPriceLists.find(pl => pl.branchId === b.id && pl.name === plName);
          if (foundPl) {
            branchPriceLists.push(`priceList_${foundPl.id}`);
          }
        }
      }

      const branchMetadata = JSON.stringify({
        ...parsedMetadata,
        groupId,
        targetBranches: targetBranches.map(tb => tb.id),
        targetProducts: branchProductIds,
        targetPriceLists: branchPriceLists
      });

      await tx.promotion.create({
        data: {
          name,
          type,
          value,
          active: true,
          branchId: b.id,
          metadata: branchMetadata
        }
      });
    }
  });

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
  const currentPromo = await prisma.promotion.findUnique({
    where: { id }
  });

  if (currentPromo) {
    let groupId = null;
    try {
      if (currentPromo.metadata) {
        const meta = JSON.parse(currentPromo.metadata);
        groupId = meta.groupId;
      }
    } catch (e) {}

    if (groupId) {
      // Find all promotions in this tenant
      const branch = await getActiveBranch();
      const branches = await prisma.branch.findMany({
        where: { tenantId: branch.tenantId, isActive: true },
        select: { id: true }
      });
      
      const allPromotions = await prisma.promotion.findMany({
        where: { branchId: { in: branches.map(b => b.id) } }
      });

      const promosToDelete = allPromotions.filter(p => {
        try {
          if (!p.metadata) return false;
          const meta = JSON.parse(p.metadata);
          return meta.groupId === groupId;
        } catch (e) {
          return false;
        }
      });

      if (promosToDelete.length > 0) {
        await prisma.promotion.deleteMany({
          where: { id: { in: promosToDelete.map(p => p.id) } }
        });
      } else {
        await prisma.promotion.delete({ where: { id } });
      }
    } else {
      await prisma.promotion.delete({ where: { id } });
    }
  }

  revalidatePath('/ventas/promociones');
  revalidatePath('/ventas/nueva');
}

export async function updatePromotion(id: string, name: string, type: string, value: number, active: boolean, metadata?: string) {
  const currentPromo = await prisma.promotion.findUnique({
    where: { id }
  });

  if (!currentPromo) {
    throw new Error("La promoción no existe.");
  }

  let parsedMetadata: any = null;
  if (metadata) {
    try {
      parsedMetadata = JSON.parse(metadata);
    } catch (e) {
      console.error("Failed to parse metadata", e);
    }
  }

  const groupId = parsedMetadata?.groupId || currentPromo.id; // Fallback to current ID if no groupId exists

  // Get active user/tenant context
  const branch = await getActiveBranch();
  const tenantId = branch.tenantId;
  if (!tenantId) {
    throw new Error("No se pudo obtener el contexto del inquilino (tenantId).");
  }

  const branches = await prisma.branch.findMany({
    where: { tenantId, isActive: true }
  });

  // Target branches for updated promotion
  let targetBranches = [branch];
  if (parsedMetadata && Array.isArray(parsedMetadata.targetBranches) && parsedMetadata.targetBranches.length > 0) {
    targetBranches = branches.filter(b => parsedMetadata.targetBranches.includes(b.id));
  }

  // Find all promotions in this tenant to filter the group
  const groupPromotions = await prisma.promotion.findMany({
    where: {
      branchId: { in: branches.map(b => b.id) }
    }
  });

  // Filter promotions belonging to this group
  const existingGroupPromos = groupPromotions.filter(p => {
    try {
      if (!p.metadata) return false;
      const meta = JSON.parse(p.metadata);
      return meta.groupId === groupId;
    } catch (e) {
      return false;
    }
  });

  // Find selected products (if any) to map them
  let selectedProducts: any[] = [];
  let skuList: string[] = [];
  let barcodeList: string[] = [];
  let nameList: string[] = [];

  if (parsedMetadata && parsedMetadata.targetProducts && parsedMetadata.targetProducts.length > 0) {
    selectedProducts = await prisma.product.findMany({
      where: { id: { in: parsedMetadata.targetProducts } },
      select: { sku: true, barcode: true, name: true }
    });

    skuList = selectedProducts.map(p => p.sku).filter(Boolean) as string[];
    barcodeList = selectedProducts.map(p => p.barcode).filter(Boolean) as string[];
    nameList = selectedProducts.map(p => p.name);
  }

  const matchedProducts = selectedProducts.length > 0
    ? await prisma.product.findMany({
        where: {
          branchId: { in: targetBranches.map(b => b.id) },
          isActive: true,
          OR: [
            skuList.length > 0 ? { sku: { in: skuList } } : undefined,
            barcodeList.length > 0 ? { barcode: { in: barcodeList } } : undefined,
            { name: { in: nameList } }
          ].filter(Boolean) as any
        },
        select: { id: true, branchId: true, sku: true, barcode: true, name: true }
      })
    : [];

  const targetPriceListsNames = parsedMetadata?.targetPriceLists || ['price'];

  const allPriceLists = await prisma.priceList.findMany({
    where: { branchId: { in: targetBranches.map(b => b.id) } },
    select: { id: true, name: true, branchId: true }
  });

  await prisma.$transaction(async (tx) => {
    // 1. Delete promotions for branches that were removed from the target list
    const targetBranchIds = targetBranches.map(b => b.id);
    const promosToDelete = existingGroupPromos.filter(egp => !targetBranchIds.includes(egp.branchId));
    if (promosToDelete.length > 0) {
      await tx.promotion.deleteMany({
        where: { id: { in: promosToDelete.map(p => p.id) } }
      });
    }

    // 2. Create or Update promotions for each target branch
    for (const b of targetBranches) {
      const existingPromo = existingGroupPromos.find(egp => egp.branchId === b.id);

      // Map products
      const branchProductIds: string[] = [];
      if (selectedProducts.length > 0) {
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
      }

      // Map price lists
      const branchPriceLists: string[] = [];
      for (const plVal of targetPriceListsNames) {
        if (['price', 'wholesalePrice', 'specialPrice'].includes(plVal)) {
          branchPriceLists.push(plVal);
        } else if (plVal.startsWith('dynamicName:')) {
          const plName = plVal.replace('dynamicName:', '');
          const foundPl = allPriceLists.find(pl => pl.branchId === b.id && pl.name === plName);
          if (foundPl) {
            branchPriceLists.push(`priceList_${foundPl.id}`);
          }
        } else if (plVal.startsWith('priceList_')) {
          const originalPlId = plVal.replace('priceList_', '');
          const originalPl = allPriceLists.find(pl => pl.id === originalPlId);
          if (originalPl) {
            const foundPl = allPriceLists.find(pl => pl.branchId === b.id && pl.name === originalPl.name);
            if (foundPl) {
              branchPriceLists.push(`priceList_${foundPl.id}`);
            }
          }
        }
      }

      const branchMetadata = JSON.stringify({
        ...parsedMetadata,
        groupId,
        targetBranches: targetBranchIds,
        targetProducts: branchProductIds,
        targetPriceLists: branchPriceLists
      });

      if (existingPromo) {
        // Update
        await tx.promotion.update({
          where: { id: existingPromo.id },
          data: {
            name,
            type,
            value,
            active,
            metadata: branchMetadata
          }
        });
      } else {
        // Create new
        await tx.promotion.create({
          data: {
            name,
            type,
            value,
            active,
            branchId: b.id,
            metadata: branchMetadata
          }
        });
      }
    }
  });

  revalidatePath('/ventas/promociones');
  revalidatePath('/ventas/nueva');
}
