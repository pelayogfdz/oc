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

  // 3. Recalcular y guardar el precio en la lista para TODOS los productos activos que no tengan precio fijo en ML
  const activeProducts = await prisma.product.findMany({
    where: { branchId: branch.id, isActive: true },
    include: {
      externalMaps: {
        where: { platform: 'MERCADO_LIBRE' }
      }
    }
  });

  console.log(`[saveMeliPricingConfig] Recalculando precios para ${activeProducts.length} productos locales...`);
  
  const retentionRate = hasTaxRetention ? (satRetentionPct / 100) : 0;
  const denominator = 1 - listingType - retentionRate - (targetMargin / 100);

  for (const product of activeProducts) {
    const map = product.externalMaps?.[0];
    if (map?.isFixedPrice) {
      continue;
    }

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
        if (map.isFixedPrice) {
          continue;
        }

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

export async function saveMeliProductPricing(
  mapId: string, 
  data: {
    precioMeli: number;
    comisionMeli: number;
    envioMeli: number;
    retencionMeli: number;
    margenDinero: number;
    margenPorcentaje: number;
    isFixedPrice: boolean;
  }
) {
  try {
    const branch = await getActiveBranch();
    
    // Buscar el mapa
    const map = await prisma.externalProductMap.findUnique({
      where: { id: mapId },
      include: { product: true }
    });

    if (!map) {
      return { success: false, error: 'Vinculación no encontrada.' };
    }

    // Actualizar base de datos local
    const updatedMap = await prisma.externalProductMap.update({
      where: { id: mapId },
      data: {
        precioMeli: data.precioMeli,
        comisionMeli: data.comisionMeli,
        envioMeli: data.envioMeli,
        retencionMeli: data.retencionMeli,
        margenDinero: data.margenDinero,
        margenPorcentaje: data.margenPorcentaje,
        isFixedPrice: data.isFixedPrice,
        lastSync: new Date()
      }
    });

    // Guardar el precio en la lista de precios "Mercado Libre" del producto
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
    }

    await prisma.productPrice.upsert({
      where: {
        productId_priceListId: {
          productId: map.productId,
          priceListId: priceList.id
        }
      },
      create: {
        productId: map.productId,
        priceListId: priceList.id,
        price: data.precioMeli
      },
      update: {
        price: data.precioMeli
      }
    });

    // Intentar empujar el precio a Mercado Libre en tiempo real
    const { getOrRefreshMeliToken } = await import('@/app/utils/meliToken');
    const token = await getOrRefreshMeliToken(branch.id);
    if (token) {
      const response = await fetch(`https://api.mercadolibre.com/items/${map.externalId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ price: data.precioMeli })
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        console.error(`[saveMeliProductPricing] Error al empujar precio a ML para ${map.externalId}:`, errBody);
        return { 
          success: true, 
          warning: 'Guardado localmente, pero no se pudo actualizar en Mercado Libre. Detalle: ' + (errBody.message || 'Error de API')
        };
      }
    }

    revalidatePath(`/integraciones/mercadolibre`);
    return { success: true };
  } catch (error: any) {
    console.error('Error in saveMeliProductPricing:', error);
    return { success: false, error: error.message || 'Error inesperado al guardar precios.' };
  }
}

export async function publishProductToMeli(productId: string) {
  try {
    const branch = await getActiveBranch();
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        externalMaps: {
          where: { platform: 'MERCADO_LIBRE' }
        }
      }
    });

    if (!product) {
      return { success: false, error: 'Producto no encontrado.' };
    }

    if (product.externalMaps.length > 0) {
      return { success: false, error: 'El producto ya está vinculado a Mercado Libre.' };
    }

    if (!product.sku) {
      return { success: false, error: 'El producto debe tener un SKU configurado antes de publicarse.' };
    }

    // Obtener la integración
    const integration = await prisma.storeIntegration.findUnique({
      where: { branchId_platform: { branchId: branch.id, platform: 'MERCADO_LIBRE' } }
    });

    if (!integration || !integration.accessToken) {
      return { success: false, error: 'Integración con Mercado Libre no configurada o desconectada.' };
    }

    // Determinar listing_type_id basado en la configuración del margen/metadata
    let listingTypeId = 'gold_special'; // Clásica
    if (integration.metadata) {
      try {
        const meta = JSON.parse(integration.metadata);
        if (meta.listingType && Number(meta.listingType) >= 0.18) {
          listingTypeId = 'gold_pro'; // Premium
        }
      } catch {}
    }

    // 1. Llamar al Category Predictor de Mercado Libre
    let categoryId = 'MLM3530'; // Categoría genérica (Otros Productos en México)
    try {
      const predRes = await fetch(`https://api.mercadolibre.com/sites/MLM/category_predictor/predict?title=${encodeURIComponent(product.name)}`);
      if (predRes.ok) {
        const predData = await predRes.json();
        if (predData && predData.id) {
          categoryId = predData.id;
        }
      }
    } catch (e) {
      console.error('[publishProductToMeli] Error prediciendo categoría:', e);
    }

    // 2. Renovar/obtener token real
    const { getOrRefreshMeliToken } = await import('@/app/utils/meliToken');
    const token = await getOrRefreshMeliToken(branch.id);
    if (!token) {
      return { success: false, error: 'No se pudo obtener un token válido de Mercado Libre.' };
    }

    // 3. Construir el payload de publicación
    const price = product.price > 0 ? product.price : 100; // Evitar precio de 0
    const payload = {
      title: product.name.substring(0, 60), // Límite de título en ML es 60 caracteres
      category_id: categoryId,
      price: price,
      currency_id: 'MXN',
      available_quantity: product.stock > 0 ? product.stock : 1, // Mínimo 1 para publicar activo
      buying_mode: 'buy_it_now',
      listing_type_id: listingTypeId,
      condition: 'new',
      seller_custom_field: product.sku,
      pictures: product.imageUrl ? [{ source: product.imageUrl }] : []
    };

    console.log('[publishProductToMeli] Publicando producto:', product.name, 'con payload:', payload);

    // 4. Llamar a la API de publicación de Mercado Libre
    const response = await fetch('https://api.mercadolibre.com/items', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      console.error('[publishProductToMeli] Error al publicar en ML:', errBody);
      return { 
        success: false, 
        error: `Error de Mercado Libre: ${errBody.message || 'No se pudo publicar. Revisa título o precio.'}` 
      };
    }

    const newItem = await response.json();
    const externalId = newItem.id;

    // 5. Crear el registro de mapeo en nuestra base de datos
    await prisma.externalProductMap.create({
      data: {
        productId: product.id,
        platform: 'MERCADO_LIBRE',
        externalId: externalId,
        syncStatus: 'active',
        precioMeli: price,
        comisionMeli: 0,
        envioMeli: 0,
        retencionMeli: 0,
        margenDinero: price - product.cost,
        margenPorcentaje: price > 0 ? ((price - product.cost) / price) * 100 : 0,
        isFixedPrice: false
      }
    });

    revalidatePath('/integraciones/mercadolibre');
    return { success: true, externalId };
  } catch (error: any) {
    console.error('Error in publishProductToMeli:', error);
    return { success: false, error: error.message || 'Error inesperado al publicar.' };
  }
}

