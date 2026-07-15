'use server';

import { prisma } from '@/lib/prisma';
import { getActiveBranch } from './auth';
import { revalidatePath } from 'next/cache';

export async function saveIntegrationTokens(formData: FormData) {
  const branch = await getActiveBranch();
  const platform = formData.get('platform') as string;
  const appId = formData.get('appId') as string;
  const clientSecret = formData.get('clientSecret') as string;
  const accessToken = formData.get('accessToken') as string;
  
  if (!platform || (!appId && !accessToken)) throw new Error("Faltan datos obligatorios");

  const existing = await prisma.storeIntegration.findUnique({
    where: { branchId_platform: { branchId: branch.id, platform } }
  });

  if (existing) {
    await prisma.storeIntegration.update({
      where: { id: existing.id },
      data: { appId, clientSecret, accessToken }
    });
  } else {
    await prisma.storeIntegration.create({
      data: { branchId: branch.id, platform, appId, clientSecret, accessToken }
    });
  }

  revalidatePath('/integraciones');
  revalidatePath(`/integraciones/${platform.toLowerCase()}`);
}

export async function deleteIntegration(formData: FormData) {
  const branch = await getActiveBranch();
  const platform = formData.get('platform') as string;
  
  const existing = await prisma.storeIntegration.findUnique({
    where: { branchId_platform: { branchId: branch.id, platform } }
  });

  if (existing) {
    await prisma.storeIntegration.delete({
      where: { id: existing.id }
    });
  }

  revalidatePath('/integraciones');
  revalidatePath(`/integraciones/${platform.toLowerCase()}`);
}

export async function saveMeliPricingConfig(formData: FormData) {
  const branch = await getActiveBranch();
  const platform = 'MERCADO_LIBRE';
  
  const targetMargin = parseFloat(formData.get('targetMargin') as string) || 0;
  const shippingCost = parseFloat(formData.get('shippingCost') as string) || 0;
  const listingType = parseFloat(formData.get('listingType') as string) || 0;
  const hasTaxRetention = formData.get('hasTaxRetention') === 'true';
  const satRetentionPct = parseFloat(formData.get('satRetentionPct') as string) || 10.5;
  
  let stockBranchIds: string[] = [];
  try {
    const rawStockBranches = formData.get('stockBranchIds') as string;
    if (rawStockBranches) {
      stockBranchIds = JSON.parse(rawStockBranches);
    }
  } catch (e) {
    console.error('[saveMeliPricingConfig] Error parsing stockBranchIds:', e);
  }
  
  const mainSaleBranchId = (formData.get('mainSaleBranchId') as string) || branch.id;

  let existing = await prisma.storeIntegration.findUnique({
    where: { branchId_platform: { branchId: branch.id, platform } }
  });

  if (!existing) {
    // Buscar si otra sucursal del mismo tenant tiene credenciales guardadas
    const tenantIntegration = await prisma.storeIntegration.findFirst({
      where: {
        platform,
        branch: { tenantId: branch.tenantId || '' },
        accessToken: { not: null }
      }
    });

    if (tenantIntegration) {
      existing = await prisma.storeIntegration.create({
        data: {
          branchId: branch.id,
          platform,
          appId: tenantIntegration.appId,
          clientSecret: tenantIntegration.clientSecret,
          accessToken: tenantIntegration.accessToken,
          refreshToken: tenantIntegration.refreshToken,
          isActive: true
        }
      });
      console.log(`[saveMeliPricingConfig] Clonadas credenciales de ML desde sucursal ${tenantIntegration.branchId} a sucursal ${branch.id}`);
    } else {
      throw new Error("Primero debes conectar y guardar las credenciales de la API de Mercado Libre.");
    }
  }

  let metadataObj: Record<string, any> = {};
  if (existing.metadata) {
    try {
      metadataObj = JSON.parse(existing.metadata);
    } catch {}
  }

  metadataObj.targetMargin = targetMargin;
  metadataObj.shippingCost = shippingCost;
  metadataObj.listingType = listingType;
  metadataObj.hasTaxRetention = hasTaxRetention;
  metadataObj.satRetentionPct = satRetentionPct;
  metadataObj.stockBranchIds = stockBranchIds;
  metadataObj.mainSaleBranchId = mainSaleBranchId;

  // 1. Guardar metadatos en StoreIntegration
  await prisma.storeIntegration.update({
    where: { id: existing.id },
    data: {
      metadata: JSON.stringify(metadataObj)
    }
  });

  // 2. Buscar o crear la lista de precios "Mercado Libre" en esta sucursal
  let priceList = await prisma.priceList.findFirst({
    where: {
      branchId: branch.id,
      name: { mode: 'insensitive', equals: 'mercado libre' }
    }
  });

  if (!priceList) {
    priceList = await prisma.priceList.create({
      data: {
        branchId: branch.id,
        name: 'Mercado Libre'
      }
    });
    console.log(`[saveMeliPricingConfig] Creada nueva lista de precios 'Mercado Libre' en sucursal ${branch.id}`);
  }

  // 3. Recalcular y guardar el precio en la lista para TODOS los productos activos
  const activeProducts = await prisma.product.findMany({
    where: { branchId: branch.id, isActive: true }
  });

  console.log(`[saveMeliPricingConfig] Recalculando precios para ${activeProducts.length} productos locales...`);
  
  const retentionRate = hasTaxRetention ? (satRetentionPct / 100) : 0;
  const denominator = 1 - listingType - retentionRate - (targetMargin / 100);

  for (const product of activeProducts) {
    let suggestedPrice = 0;
    if (denominator > 0) {
      suggestedPrice = (shippingCost + product.cost) / denominator;
      // Redondear a 2 decimales
      suggestedPrice = Math.round(suggestedPrice * 100) / 100;
    }

    if (suggestedPrice > 0) {
      // Upsert en ProductPrice
      await prisma.productPrice.upsert({
        where: {
          productId_priceListId: {
            productId: product.id,
            priceListId: priceList.id
          }
        },
        create: {
          productId: product.id,
          priceListId: priceList.id,
          price: suggestedPrice
        },
        update: {
          price: suggestedPrice
        }
      });
    }
  }

  // 4. Intentar empujar precios actualizados a las publicaciones vinculadas de Mercado Libre
  try {
    const { getOrRefreshMeliToken } = await import('@/app/utils/meliToken');
    const token = await getOrRefreshMeliToken(branch.id);
    
    if (token) {
      const mappings = await prisma.externalProductMap.findMany({
        where: {
          platform: 'MERCADO_LIBRE',
          product: { branchId: branch.id }
        },
        include: { product: true }
      });

      console.log(`[saveMeliPricingConfig] Actualizando precios en caliente para ${mappings.length} publicaciones vinculadas...`);

      for (const map of mappings) {
        const prodCost = map.product.cost;
        let suggestedPrice = 0;
        if (denominator > 0) {
          suggestedPrice = (shippingCost + prodCost) / denominator;
          suggestedPrice = Math.round(suggestedPrice * 100) / 100;
        }

        if (suggestedPrice > 0) {
          // Llamada PUT a Mercado Libre
          const response = await fetch(`https://api.mercadolibre.com/items/${map.externalId}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ price: suggestedPrice })
          });

          if (response.ok) {
            console.log(`[saveMeliPricingConfig] Precio actualizado en Mercado Libre para ${map.externalId}: $${suggestedPrice}`);
          } else {
            const errBody = await response.json().catch(() => ({}));
            console.error(`[saveMeliPricingConfig] Error al actualizar precio en ML para ${map.externalId}:`, errBody);
          }
        }
      }
    }
  } catch (syncErr) {
    console.error('[saveMeliPricingConfig] Error en sincronización de precios con ML:', syncErr);
  }

  revalidatePath(`/integraciones/${platform.toLowerCase()}`);
}

