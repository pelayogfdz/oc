'use server';

import { prisma } from '@/lib/prisma';
import { getActiveBranch, getActiveUser } from './auth';
import { revalidatePath } from 'next/cache';

export async function saveIntegrationTokens(formData: FormData) {
  const branch = await getActiveBranch();
  const platform = formData.get('platform') as string;
  const appId = formData.get('appId') as string;
  const clientSecret = formData.get('clientSecret') as string;
  const accessToken = formData.get('accessToken') as string;
  const customRedirectUri = formData.get('customRedirectUri') as string;
  
  if (!platform || (!appId && !accessToken)) throw new Error("Faltan datos obligatorios");

  const existing = await prisma.storeIntegration.findUnique({
    where: { branchId_platform: { branchId: branch.id, platform } }
  });

  const nextMetadata = existing?.metadata ? JSON.parse(existing.metadata) : {};
  nextMetadata.customRedirectUri = customRedirectUri || '';

  if (existing) {
    await prisma.storeIntegration.update({
      where: { id: existing.id },
      data: { 
        appId, 
        clientSecret, 
        accessToken,
        metadata: JSON.stringify(nextMetadata)
      }
    });
  } else {
    await prisma.storeIntegration.create({
      data: { 
        branchId: branch.id, 
        platform, 
        appId, 
        clientSecret, 
        accessToken,
        metadata: JSON.stringify(nextMetadata)
      }
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
    const user = await getActiveUser();
    if (!user || !user.tenantId) {
      return { success: false, error: 'Contexto de usuario no encontrado.' };
    }

    const tenantBranchesList = await prisma.branch.findMany({
      where: { tenantId: user.tenantId, isActive: true },
      select: { id: true }
    });
    const tenantBranchIds = tenantBranchesList.map(b => b.id);

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

    // Obtener la integración en cualquiera de las sucursales del tenant
    const integration = await prisma.storeIntegration.findFirst({
      where: {
        platform: 'MERCADO_LIBRE',
        branchId: { in: tenantBranchIds }
      }
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

    // 2. Renovar/obtener token real de la sucursal de la integración
    const { getOrRefreshMeliToken } = await import('@/app/utils/meliToken');
    const token = await getOrRefreshMeliToken(integration.branchId);
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

export async function linkMeliItemToProduct(externalId: string, productId: string) {
  try {
    const user = await getActiveUser();
    if (!user || !user.tenantId) {
      return { success: false, error: 'Contexto de usuario no encontrado.' };
    }

    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      return { success: false, error: 'Producto Caanma no encontrado.' };
    }

    // Obtener las sucursales del tenant
    const tenantBranchesList = await prisma.branch.findMany({
      where: { tenantId: user.tenantId, isActive: true },
      select: { id: true }
    });
    const tenantBranchIds = tenantBranchesList.map(b => b.id);

    // Obtener la integración
    const integration = await prisma.storeIntegration.findFirst({
      where: {
        platform: 'MERCADO_LIBRE',
        branchId: { in: tenantBranchIds }
      }
    });

    if (!integration) {
      return { success: false, error: 'Integración no configurada.' };
    }

    const price = product.price > 0 ? product.price : 100;
    
    // Crear el registro de mapeo
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

    // Remover de unlinkedMeliItems en los metadatos
    if (integration.metadata) {
      try {
        const meta = JSON.parse(integration.metadata);
        if (meta.unlinkedMeliItems && Array.isArray(meta.unlinkedMeliItems)) {
          meta.unlinkedMeliItems = meta.unlinkedMeliItems.filter((item: any) => item.id !== externalId);
          await prisma.storeIntegration.update({
            where: { id: integration.id },
            data: { metadata: JSON.stringify(meta) }
          });
        }
      } catch (e) {
        console.error('Error actualizando metadatos en linkMeliItemToProduct:', e);
      }
    }

    revalidatePath('/integraciones/mercadolibre');
    return { success: true };
  } catch (error: any) {
    console.error('Error in linkMeliItemToProduct:', error);
    return { success: false, error: error.message || 'Error inesperado al vincular.' };
  }
}

export async function searchCaanmaProducts(query: string) {
  try {
    const user = await getActiveUser();
    if (!user || !user.tenantId) {
      return [];
    }
    
    const tenantBranchesList = await prisma.branch.findMany({
      where: { tenantId: user.tenantId, isActive: true },
      select: { id: true }
    });
    const tenantBranchIds = tenantBranchesList.map(b => b.id);
    
    if (!query || query.trim().length < 2) {
      return [];
    }

    const cleanQuery = query.trim();

    // Buscar productos
    const products = await prisma.product.findMany({
      where: {
        branchId: { in: tenantBranchIds },
        isActive: true,
        OR: [
          { name: { contains: cleanQuery, mode: 'insensitive' } },
          { sku: { contains: cleanQuery, mode: 'insensitive' } }
        ]
      },
      select: { id: true, name: true, sku: true, stock: true },
      take: 30,
      orderBy: { name: 'asc' }
    });

    // Agrupar por SKU
    const grouped: any[] = [];
    const skuMap: Record<string, boolean> = {};
    for (const p of products) {
      const sku = p.sku ? String(p.sku).trim() : `NOSKU-${p.id}`;
      if (!skuMap[sku]) {
        skuMap[sku] = true;
        grouped.push({
          id: p.id,
          name: p.name,
          sku: p.sku,
          stock: p.stock
        });
      } else {
        const existing = grouped.find(x => (x.sku ? String(x.sku).trim() : '') === sku);
        if (existing) {
          existing.stock += p.stock;
        }
      }
    }

    return grouped;
  } catch (e) {
    console.error('Error in searchCaanmaProducts:', e);
    return [];
  }
}

export async function syncMeliCatalogAction() {
  try {
    const branch = await getActiveBranch();
    const platform = 'MERCADO_LIBRE';
    
    const integration = await prisma.storeIntegration.findFirst({
      where: { platform, branchId: branch.id }
    });

    if (!integration) {
      return { success: false, error: 'Configuración de Mercado Libre no encontrada.' };
    }

    const { getOrRefreshMeliToken } = await import('@/app/utils/meliToken');
    const token = await getOrRefreshMeliToken(integration.branchId);

    if (!token) {
      return { success: false, error: 'Token de Mercado Libre faltante o no conectado.' };
    }

    // 1. Obtener ID de usuario de Mercado Libre
    const meResponse = await fetch('https://api.mercadolibre.com/users/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!meResponse.ok) {
      return { success: false, error: 'Error al conectar con la cuenta de Mercado Libre. Verifica tu autorización.' };
    }

    const meData = await meResponse.json();
    const userId = meData.id;

    // 2. Buscar publicaciones activas del vendedor (límite inicial de 50 items)
    const searchResponse = await fetch(`https://api.mercadolibre.com/users/${userId}/items/search?limit=50&status=active`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!searchResponse.ok) {
      return { success: false, error: 'Error al consultar catálogo de Mercado Libre.' };
    }

    const searchData = await searchResponse.json();
    const itemIds: string[] = searchData.results || [];

    if (itemIds.length === 0) {
      revalidatePath('/integraciones/mercadolibre');
      return { success: true, message: 'Sincronización completa. No se encontraron publicaciones activas.' };
    }

    // 3. Obtener el detalle de las publicaciones en lotes de hasta 20
    const meliItems: any[] = [];
    const batchSize = 20;
    
    for (let i = 0; i < itemIds.length; i += batchSize) {
      const batchIds = itemIds.slice(i, i + batchSize);
      const itemsDetailResponse = await fetch(`https://api.mercadolibre.com/items?ids=${batchIds.join(',')}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (itemsDetailResponse.ok) {
        const details = await itemsDetailResponse.json();
        if (Array.isArray(details)) {
          details.forEach((d: any) => {
            if (d.code === 200 && d.body) {
              const body = d.body;
              meliItems.push({
                id: body.id,
                title: body.title,
                price: body.price,
                status: body.status,
                available_quantity: body.available_quantity,
                seller_custom_field: body.seller_custom_field || null
              });
            }
          });
        }
      }
    }

    let syncedCount = 0;
    const unlinkedMeliItems: any[] = [];

    for (const item of meliItems) {
      const existingMap = await prisma.externalProductMap.findUnique({
        where: { platform_externalId: { platform: 'MERCADO_LIBRE', externalId: item.id } },
        include: { product: true }
      });

      if (existingMap) {
        const updateData: any = { lastSync: new Date(), syncStatus: item.status || 'active' };
        if (!existingMap.isFixedPrice) {
          updateData.precioMeli = item.price;
          
          const cost = existingMap.product.cost;
          const comision = existingMap.comisionMeli || 0;
          const envio = existingMap.envioMeli || 0;
          const retencion = existingMap.retencionMeli || 0;
          
          const margenDinero = item.price - cost - comision - envio - retencion;
          const margenPorcentaje = item.price > 0 ? (margenDinero / item.price) * 100 : 0;
          
          updateData.margenDinero = margenDinero;
          updateData.margenPorcentaje = margenPorcentaje;
        }
        
        await prisma.externalProductMap.update({
          where: { id: existingMap.id },
          data: updateData
        });
        syncedCount++;
      } else {
        const cleanSku = item.seller_custom_field ? String(item.seller_custom_field).trim() : null;
        
        const localProduct = cleanSku ? await prisma.product.findUnique({
          where: { sku_branchId: { sku: cleanSku, branchId: branch.id } }
        }) : null;

        if (localProduct) {
          const initialPrecioMeli = item.price;
          const initialMargenDinero = initialPrecioMeli - localProduct.cost;
          const initialMargenPorcentaje = initialPrecioMeli > 0 ? (initialMargenDinero / initialPrecioMeli) * 100 : 0;

          await prisma.externalProductMap.create({
            data: { 
              productId: localProduct.id, 
              platform: 'MERCADO_LIBRE', 
              externalId: item.id,
              syncStatus: item.status || 'active',
              lastSync: new Date(),
              precioMeli: initialPrecioMeli,
              comisionMeli: 0,
              envioMeli: 0,
              retencionMeli: 0,
              margenDinero: initialMargenDinero,
              margenPorcentaje: initialMargenPorcentaje,
              isFixedPrice: false
            }
          });
          syncedCount++;
        } else {
          unlinkedMeliItems.push({
            id: item.id,
            title: item.title,
            sku: cleanSku || '',
            price: item.price,
            status: item.status || 'active',
            stock: item.available_quantity
          });
        }
      }
    }

    const currentMeta = integration.metadata ? JSON.parse(integration.metadata) : {};
    currentMeta.unlinkedMeliItems = unlinkedMeliItems;

    await prisma.storeIntegration.update({
      where: { id: integration.id },
      data: { metadata: JSON.stringify(currentMeta) }
    });

    revalidatePath('/integraciones/mercadolibre');
    return { 
      success: true, 
      message: `Sincronización completa. Vinculaciones: ${syncedCount}. Publicaciones sin SKU: ${unlinkedMeliItems.length}` 
    };

  } catch (error: any) {
    console.error('syncMeliCatalogAction Error:', error);
    return { success: false, error: 'Error durante la sincronización: ' + (error.message || String(error)) };
  }
}


