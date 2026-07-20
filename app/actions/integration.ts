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
  const user = await getActiveUser();
  const tenantId = user?.tenantId || branch.tenantId;
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

      console.log(`[saveMeliPricingConfig] Actualizando precios y stock en caliente para ${mappings.length} publicaciones vinculadas...`);

      for (const map of mappings) {
        // 1. Sincronizar precio (si no es precio fijo)
        if (!map.isFixedPrice) {
          const prodCost = map.product.cost;
          let suggestedPrice = 0;
          if (denominator > 0) {
            suggestedPrice = (shippingCost + prodCost) / denominator;
            suggestedPrice = Math.round(suggestedPrice * 100) / 100;
          }

          if (suggestedPrice > 0) {
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

        // 2. Sincronizar stock
        try {
          await syncMeliStockAction(map.productId, tenantId);
        } catch (stockErr) {
          console.error(`[saveMeliPricingConfig] Error al actualizar stock en ML para ${map.externalId}:`, stockErr);
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

    // Intentar obtener detalles del item de Mercado Libre para calcular costos reales con el nuevo precio
    let comisionMeli = data.comisionMeli;
    let envioMeli = data.envioMeli;
    let retencionMeli = data.retencionMeli;

    const { getOrRefreshMeliToken } = await import('@/app/utils/meliToken');
    const token = await getOrRefreshMeliToken(branch.id);
    if (token) {
      try {
        const itemRes = await fetch(`https://api.mercadolibre.com/items/${map.externalId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (itemRes.ok) {
          const itemData = await itemRes.json();
          const calculatedCosts = await calculateMeliItemCosts(
            branch.id,
            map.externalId,
            data.precioMeli,
            itemData.category_id,
            itemData.listing_type_id,
            itemData.shipping ? itemData.shipping.free_shipping : false
          );
          comisionMeli = calculatedCosts.comisionMeli;
          envioMeli = calculatedCosts.envioMeli;
          retencionMeli = calculatedCosts.retencionMeli;
        }
      } catch (e) {
        console.error('Error fetching costs in saveMeliProductPricing:', e);
      }
    }

    const cost = map.product.cost;
    const margenDinero = data.precioMeli - cost - comisionMeli - envioMeli - retencionMeli;
    const margenPorcentaje = data.precioMeli > 0 ? (margenDinero / data.precioMeli) * 100 : 0;

    // Actualizar base de datos local
    const updatedMap = await prisma.externalProductMap.update({
      where: { id: mapId },
      data: {
        precioMeli: data.precioMeli,
        comisionMeli,
        envioMeli,
        retencionMeli,
        margenDinero,
        margenPorcentaje,
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

    // 3. Obtener las sucursales para el stock y calcular el stock total sumado
    let stockBranchIds: string[] = [integration.branchId];
    if (integration.metadata) {
      try {
        const meta = JSON.parse(integration.metadata);
        if (meta.stockBranchIds && Array.isArray(meta.stockBranchIds) && meta.stockBranchIds.length > 0) {
          stockBranchIds = meta.stockBranchIds;
        }
      } catch {}
    }
    
    if (stockBranchIds.length === 0) {
      stockBranchIds = tenantBranchIds;
    }

    const productInBranches = await prisma.product.findMany({
      where: {
        sku: product.sku,
        branchId: { in: stockBranchIds },
        isActive: true
      }
    });
    const totalStock = productInBranches.reduce((sum, p) => sum + p.stock, 0);

    const price = product.price > 0 ? product.price : 100; // Evitar precio de 0
    const payload = {
      title: product.name.substring(0, 60), // Límite de título en ML es 60 caracteres
      category_id: categoryId,
      price: price,
      currency_id: 'MXN',
      available_quantity: totalStock > 0 ? totalStock : 1, // Mínimo 1 para publicar activo
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

    // 5. Calcular costos reales de Mercado Libre para la nueva publicación
    let comisionMeli = 0;
    let envioMeli = 0;
    let retencionMeli = 0;
    try {
      const calculatedCosts = await calculateMeliItemCosts(
        integration.branchId,
        externalId,
        price,
        categoryId,
        listingTypeId,
        false
      );
      comisionMeli = calculatedCosts.comisionMeli;
      envioMeli = calculatedCosts.envioMeli;
      retencionMeli = calculatedCosts.retencionMeli;
    } catch (e) {
      console.error('[publishProductToMeli] Error al calcular costos iniciales:', e);
    }

    const margenDinero = price - product.cost - comisionMeli - envioMeli - retencionMeli;
    const margenPorcentaje = price > 0 ? (margenDinero / price) * 100 : 0;

    // 6. Crear el registro de mapeo en nuestra base de datos
    await prisma.externalProductMap.create({
      data: {
        productId: product.id,
        platform: 'MERCADO_LIBRE',
        externalId: externalId,
        syncStatus: 'active',
        precioMeli: price,
        comisionMeli,
        envioMeli,
        retencionMeli,
        margenDinero,
        margenPorcentaje,
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
    
    // Calcular costos reales de Mercado Libre para el item vinculado
    let comisionMeli = 0;
    let envioMeli = 0;
    let retencionMeli = 0;
    let itemPrice = price;

    const { getOrRefreshMeliToken } = await import('@/app/utils/meliToken');
    const token = await getOrRefreshMeliToken(integration.branchId);
    if (token) {
      try {
        const itemRes = await fetch(`https://api.mercadolibre.com/items/${externalId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (itemRes.ok) {
          const itemData = await itemRes.json();
          itemPrice = itemData.price || price;
          const calculatedCosts = await calculateMeliItemCosts(
            integration.branchId,
            externalId,
            itemPrice,
            itemData.category_id,
            itemData.listing_type_id,
            itemData.shipping ? itemData.shipping.free_shipping : false
          );
          comisionMeli = calculatedCosts.comisionMeli;
          envioMeli = calculatedCosts.envioMeli;
          retencionMeli = calculatedCosts.retencionMeli;
        }
      } catch (e) {
        console.error('[linkMeliItemToProduct] Error al obtener detalles/costos de item vinculante:', e);
      }
    }

    const margenDinero = itemPrice - product.cost - comisionMeli - envioMeli - retencionMeli;
    const margenPorcentaje = itemPrice > 0 ? (margenDinero / itemPrice) * 100 : 0;

    // Crear el registro de mapeo
    await prisma.externalProductMap.create({
      data: {
        productId: product.id,
        platform: 'MERCADO_LIBRE',
        externalId: externalId,
        syncStatus: 'active',
        precioMeli: itemPrice,
        comisionMeli,
        envioMeli,
        retencionMeli,
        margenDinero,
        margenPorcentaje,
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

    // Sincronizar stock inmediatamente después de vincular
    try {
      await syncMeliStockAction(product.id, user.tenantId);
    } catch (e) {
      console.error('[linkMeliItemToProduct] Error in post-link stock sync:', e);
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

    // 1. Obtener todos los SKUs ya vinculados para esta plataforma en las sucursales del tenant
    const linkedMaps = await prisma.externalProductMap.findMany({
      where: {
        platform: 'MERCADO_LIBRE',
        product: {
          branchId: { in: tenantBranchIds }
        }
      },
      select: {
        product: {
          select: {
            sku: true
          }
        }
      }
    });

    const linkedSkus = new Set<string>();
    for (const m of linkedMaps) {
      if (m.product?.sku) {
        linkedSkus.add(String(m.product.sku).trim());
      }
    }

    // 2. Buscar productos locales
    const products = await prisma.product.findMany({
      where: {
        branchId: { in: tenantBranchIds },
        isActive: true,
        externalMaps: {
          none: {
            platform: 'MERCADO_LIBRE'
          }
        },
        OR: [
          { name: { contains: cleanQuery, mode: 'insensitive' } },
          { sku: { contains: cleanQuery, mode: 'insensitive' } }
        ]
      },
      select: { id: true, name: true, sku: true, stock: true },
      take: 50,
      orderBy: { name: 'asc' }
    });

    // 3. Agrupar por SKU y omitir los que ya estén vinculados en cualquier sucursal
    const grouped: any[] = [];
    const skuMap: Record<string, boolean> = {};
    for (const p of products) {
      const sku = p.sku ? String(p.sku).trim() : null;
      
      if (sku && linkedSkus.has(sku)) {
        continue;
      }

      const key = sku || `NOSKU-${p.id}`;
      if (!skuMap[key]) {
        skuMap[key] = true;
        grouped.push({
          id: p.id,
          name: p.name,
          sku: p.sku,
          stock: p.stock
        });
      } else {
        const existing = grouped.find(x => (x.sku ? String(x.sku).trim() : '') === (sku || ''));
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

    // 2. Buscar publicaciones activas del vendedor con paginación
    const itemIds: string[] = [];
    let offset = 0;
    const searchLimit = 50;
    let hasMore = true;

    while (hasMore) {
      const searchResponse = await fetch(`https://api.mercadolibre.com/users/${userId}/items/search?limit=${searchLimit}&offset=${offset}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!searchResponse.ok) {
        break;
      }

      const searchData = await searchResponse.json();
      const results: string[] = searchData.results || [];
      itemIds.push(...results);

      if (results.length < searchLimit || itemIds.length >= 5000) {
        hasMore = false;
      } else {
        offset += searchLimit;
      }
    }

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
                seller_custom_field: body.seller_custom_field || null,
                shipping: body.shipping,
                category_id: body.category_id,
                listing_type_id: body.listing_type_id,
                attributes: body.attributes || [],
                variations: body.variations || []
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
        // 1. Obtener costos reales de Mercado Libre (solo si existe el mapeo)
        const costs = await calculateMeliItemCosts(
          integration.branchId,
          item.id,
          item.price,
          item.category_id,
          item.listing_type_id,
          item.shipping ? item.shipping.free_shipping : false
        );

        const updateData: any = { 
          lastSync: new Date(), 
          syncStatus: item.status || 'active',
          comisionMeli: costs.comisionMeli,
          envioMeli: costs.envioMeli,
          retencionMeli: costs.retencionMeli
        };

        const actualPrecio = existingMap.isFixedPrice ? (existingMap.precioMeli || item.price) : item.price;
        if (!existingMap.isFixedPrice) {
          updateData.precioMeli = item.price;
        }
        
        const cost = existingMap.product.cost;
        const margenDinero = actualPrecio - cost - costs.comisionMeli - costs.envioMeli - costs.retencionMeli;
        const margenPorcentaje = actualPrecio > 0 ? (margenDinero / actualPrecio) * 100 : 0;
        
        updateData.margenDinero = margenDinero;
        updateData.margenPorcentaje = margenPorcentaje;
        
        await prisma.externalProductMap.update({
          where: { id: existingMap.id },
          data: updateData
        });
        syncedCount++;
      } else {
        const cleanSku = item.seller_custom_field ? String(item.seller_custom_field).trim() : null;
        
        let localProduct = cleanSku ? await prisma.product.findUnique({
          where: { sku_branchId: { sku: cleanSku, branchId: branch.id } }
        }) : null;

        if (!localProduct) {
          const barcodes = await getBarcodesFromMeliItem(item);
          if (barcodes.length > 0) {
            localProduct = await prisma.product.findFirst({
              where: {
                barcode: { in: barcodes },
                branchId: branch.id,
                isActive: true
              }
            });
          }
        }

        if (localProduct) {
          // 1. Obtener costos reales de Mercado Libre (solo si se va a auto-vincular)
          const costs = await calculateMeliItemCosts(
            integration.branchId,
            item.id,
            item.price,
            item.category_id,
            item.listing_type_id,
            item.shipping ? item.shipping.free_shipping : false
          );

          const cost = localProduct.cost;
          const margenDinero = item.price - cost - costs.comisionMeli - costs.envioMeli - costs.retencionMeli;
          const margenPorcentaje = item.price > 0 ? (margenDinero / item.price) * 100 : 0;

          await prisma.externalProductMap.create({
            data: { 
              productId: localProduct.id, 
              platform: 'MERCADO_LIBRE', 
              externalId: item.id,
              syncStatus: item.status || 'active',
              lastSync: new Date(),
              precioMeli: item.price,
              comisionMeli: costs.comisionMeli,
              envioMeli: costs.envioMeli,
              retencionMeli: costs.retencionMeli,
              margenDinero,
              margenPorcentaje,
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

export async function calculateMeliItemCosts(
  branchId: string,
  itemId: string,
  price: number,
  categoryId: string,
  listingTypeId: string,
  isFreeShipping: boolean
) {
  try {
    const { getOrRefreshMeliToken } = await import('@/app/utils/meliToken');
    const token = await getOrRefreshMeliToken(branchId);
    if (!token) return { comisionMeli: 0, envioMeli: 0, retencionMeli: 0 };

    // Resolve correct tenant client dynamically based on branchId
    const { masterClient, getClientForTenant } = await import('@/lib/prisma');
    let dbClient = prisma;
    try {
      const branchRecord = await masterClient.branch.findUnique({
        where: { id: branchId }
      });
      if (branchRecord?.tenantId) {
        dbClient = getClientForTenant(branchRecord.tenantId);
      }
    } catch (e) {
      console.error('[calculateMeliItemCosts] Error resolving tenant client:', e);
    }

    const integration = await dbClient.storeIntegration.findFirst({
      where: { platform: 'MERCADO_LIBRE', branchId }
    });
    if (!integration) return { comisionMeli: 0, envioMeli: 0, retencionMeli: 0 };

    let userId = null;
    let hasTaxRetention = true;
    let satRetentionPct = 10.5;

    if (integration.metadata) {
      try {
        const meta = JSON.parse(integration.metadata);
        userId = meta.userId;
        if (meta.hasTaxRetention !== undefined) hasTaxRetention = Boolean(meta.hasTaxRetention);
        if (meta.satRetentionPct !== undefined) satRetentionPct = Number(meta.satRetentionPct);
      } catch {}
    }

    // 1. Costo Envío
    let envioMeli = 0;
    if (isFreeShipping && userId) {
      try {
        const shipRes = await fetch(`https://api.mercadolibre.com/users/${userId}/shipping_options/free?item_id=${itemId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (shipRes.ok) {
          const shipData = await shipRes.json();
          envioMeli = shipData.coverage?.all_country?.list_cost || 0;
        }
      } catch (err) {
        console.error(`[calculateMeliItemCosts] Error fetching shipping:`, err);
      }
    }

    // 2. Comisión Real
    let comisionMeli = 0;
    try {
      const feeRes = await fetch(`https://api.mercadolibre.com/sites/MLM/listing_prices?price=${price}&category_id=${categoryId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (feeRes.ok) {
        const feeData = await feeRes.json();
        if (Array.isArray(feeData)) {
          const matchedType = feeData.find((f: any) => f.listing_type_id === listingTypeId);
          if (matchedType) {
            comisionMeli = matchedType.sale_fee_amount || 0;
          }
        }
      }
    } catch (err) {
      console.error(`[calculateMeliItemCosts] Error fetching commission:`, err);
    }

    // 3. Retención de Impuestos
    const retencionMeli = hasTaxRetention ? (price * satRetentionPct / 100) : 0;

    return {
      comisionMeli,
      envioMeli,
      retencionMeli
    };
  } catch (e) {
    console.error('Error in calculateMeliItemCosts:', e);
    return { comisionMeli: 0, envioMeli: 0, retencionMeli: 0 };
  }
}

export async function syncMeliStockAction(productId: string, tenantId: string | null) {
  try {
    const { getClientForTenant, masterClient } = await import('@/lib/prisma');
    const tenantClient = tenantId ? getClientForTenant(tenantId) : masterClient;

    // 1. Get the product SKU and branchId from the tenant DB
    const product = await tenantClient.product.findUnique({
      where: { id: productId }
    });

    if (!product || !product.sku) return;

    // 2. Find all Mercado Libre mappings for this product or SKU
    const maps = await tenantClient.externalProductMap.findMany({
      where: {
        platform: 'MERCADO_LIBRE',
        productId: product.id
      }
    });

    if (maps.length === 0) return;

    console.log(`[MELI STOCK SYNC] [Tenant: ${tenantId}] Sincronizando stock para producto ${product.name} (SKU: ${product.sku})...`);

    // 3. For each mapping, update the stock on Mercado Libre
    for (const map of maps) {
      // Find the active integration for Mercado Libre in this tenant
      const integration = await tenantClient.storeIntegration.findFirst({
        where: { platform: 'MERCADO_LIBRE', accessToken: { not: null } }
      });

      if (!integration || !integration.accessToken) {
        console.warn(`[MELI STOCK SYNC] No active integration found for Mercado Libre`);
        continue;
      }

      let token = integration.accessToken;

      // Check if expired
      let expiresAt: Date | null = null;
      if (integration.metadata) {
        try {
          const meta = JSON.parse(integration.metadata);
          if (meta.expiresAt) expiresAt = new Date(meta.expiresAt);
        } catch {}
      }

      const tenMinutesFromNow = new Date(Date.now() + 10 * 60 * 1000);
      if (!expiresAt || expiresAt <= tenMinutesFromNow) {
        // Try to refresh
        if (integration.refreshToken && integration.appId && integration.clientSecret) {
          console.log(`[MELI STOCK SYNC] Token expirado o por expirar para sucursal ${integration.branchId}, intentando refrescar...`);
          try {
            const response = await fetch('https://api.mercadolibre.com/oauth/token', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
              },
              body: new URLSearchParams({
                grant_type: 'refresh_token',
                client_id: integration.appId,
                client_secret: integration.clientSecret,
                refresh_token: integration.refreshToken
              })
            });

            const data = await response.json();

            if (response.ok && !data.error && data.access_token) {
              token = data.access_token;
              
              // Update integration with new token and expiresAt
              let currentMeta = {};
              if (integration.metadata) {
                try {
                  currentMeta = JSON.parse(integration.metadata);
                } catch {}
              }
              const newMeta = {
                ...currentMeta,
                expiresAt: new Date(Date.now() + (data.expires_in || 21600) * 1000).toISOString()
              };

              await tenantClient.storeIntegration.update({
                where: { id: integration.id },
                data: {
                  accessToken: token,
                  refreshToken: data.refresh_token || integration.refreshToken,
                  metadata: JSON.stringify(newMeta)
                }
              });
              console.log('[MELI STOCK SYNC] Token refrescado exitosamente.');
            }
          } catch (e) {
            console.error('[MELI STOCK SYNC] Error al refrescar token:', e);
          }
        }
      }

      if (!token) continue;

      // Extract settings from metadata (like stockBranchIds)
      let stockBranchIds: string[] = [];
      if (integration.metadata) {
        try {
          const meta = JSON.parse(integration.metadata);
          if (meta.stockBranchIds && Array.isArray(meta.stockBranchIds) && meta.stockBranchIds.length > 0) {
            stockBranchIds = meta.stockBranchIds;
          }
        } catch {}
      }

      if (stockBranchIds.length === 0) {
        const branchesList = await tenantClient.branch.findMany({
          where: { tenantId: tenantId || undefined, isActive: true },
          select: { id: true }
        });
        stockBranchIds = branchesList.map(b => b.id);
      }

      // Sum stock across all selected branches
      const productInBranches = await tenantClient.product.findMany({
        where: {
          sku: product.sku,
          branchId: { in: stockBranchIds },
          isActive: true
        }
      });

      const totalStock = productInBranches.reduce((sum, p) => sum + p.stock, 0);
      const clampedStock = Math.max(0, totalStock);

      console.log(`[MELI STOCK SYNC] Publicación ${map.externalId}: Nuevo stock a enviar = ${totalStock} (clamped to ${clampedStock})`);

      // Push stock to Mercado Libre and reactivate if greater than 0
      const stockPayload = {
        available_quantity: clampedStock,
        ...(clampedStock > 0 ? { status: 'active' } : {})
      };

      const response = await fetch(`https://api.mercadolibre.com/items/${map.externalId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(stockPayload)
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        console.error(`[MELI STOCK SYNC] Error al actualizar stock en ML para ${map.externalId}:`, errBody);
      } else {
        console.log(`[MELI STOCK SYNC] Stock actualizado exitosamente en ML para ${map.externalId}.`);
      }
    }
  } catch (error) {
    console.error('[MELI STOCK SYNC] Error general:', error);
  }
}

export async function getBarcodesFromMeliItem(itemData: any): Promise<string[]> {
  const barcodes: string[] = [];
  
  if (Array.isArray(itemData.attributes)) {
    const barcodeAttrIds = ['GTIN', 'EAN', 'UPC', 'JAN', 'ISBN'];
    const attr = itemData.attributes.find((a: any) => barcodeAttrIds.includes(a.id));
    if (attr && attr.value_name) {
      const clean = String(attr.value_name).trim();
      if (clean && clean !== 'N/A' && clean !== 'n/a') {
        barcodes.push(clean);
      }
    }
  }

  if (Array.isArray(itemData.variations)) {
    itemData.variations.forEach((v: any) => {
      if (Array.isArray(v.attributes)) {
        const barcodeAttrIds = ['GTIN', 'EAN', 'UPC', 'JAN', 'ISBN'];
        const attr = v.attributes.find((a: any) => barcodeAttrIds.includes(a.id));
        if (attr && attr.value_name) {
          const clean = String(attr.value_name).trim();
          if (clean && clean !== 'N/A' && clean !== 'n/a' && !barcodes.includes(clean)) {
            barcodes.push(clean);
          }
        }
      }
    });
  }

  return barcodes;
}


