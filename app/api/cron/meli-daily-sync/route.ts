import { NextResponse } from 'next/server';
import { prisma, getClientForTenant } from '@/lib/prisma';
import { getOrRefreshMeliToken } from '@/app/utils/meliToken';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const onlyStock = url.searchParams.get('onlyStock') === 'true';
  return handleSync(onlyStock);
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  const onlyStock = url.searchParams.get('onlyStock') === 'true';
  return handleSync(onlyStock);
}

async function handleSync(onlyStock = false) {
  console.log("[MELI DAILY CRON] Iniciando proceso de sincronización diaria...");
  
  try {
    // 1. Obtener todas las integraciones activas de Mercado Libre de cada tenant
    const tenantDbNames: Record<string, string> = {
      '8b52cbcd-c956-4717-a1bd-02e57386aaa2': 'neondb_officecity',
      'db5d3949-f8dd-41f6-9627-90374d55d044': 'neondb_petqro',
      'cd1e1142-ae76-46aa-b2d2-e5de02904788': 'neondb_seit',
      '0d246cea-0220-4328-92b0-8a1387ce6a6d': 'neondb_pizca'
    };

    const integrations = [];

    for (const [tenantId, dbName] of Object.entries(tenantDbNames)) {
      try {
        const tenantClient = getClientForTenant(tenantId);
        const tenantIntegrations = await tenantClient.storeIntegration.findMany({
          where: {
            platform: 'MERCADO_LIBRE',
            isActive: true
          },
          include: {
            branch: true
          }
        });

        // Asegurar que branch tenga el tenantId correspondiente
        tenantIntegrations.forEach(i => {
          if (i.branch) {
            (i.branch as any).tenantId = tenantId;
          }
        });

        integrations.push(...tenantIntegrations);
      } catch (err) {
        console.error(`[MELI DAILY CRON] Error al buscar integraciones en tenant ${tenantId}:`, err);
      }
    }

    console.log(`[MELI DAILY CRON] Se encontraron ${integrations.length} integraciones activas de Mercado Libre across all tenants.`);

    let processedTenantsCount = 0;
    let totalSalesSynced = 0;
    let totalPricesSynced = 0;
    let totalStocksSynced = 0;

    for (const integration of integrations) {
      const branchId = integration.branchId;
      const tenantId = integration.branch.tenantId;

      if (!tenantId) {
        console.warn(`[MELI DAILY CRON] Saltando sucursal ${branchId} porque no tiene tenantId asociado.`);
        continue;
      }

      const tenantClient = getClientForTenant(tenantId);

      // Obtener token real auto-refrescado
      const token = await getOrRefreshMeliToken(branchId);
      if (!token) {
        console.warn(`[MELI DAILY CRON] No se pudo obtener token de Mercado Libre para sucursal ${integration.branch.name}. Saltando.`);
        continue;
      }

      // Extraer metadatos
      let targetMargin = 20;
      let shippingCost = 115;
      let listingType = 0.15;
      let hasTaxRetention = true;
      let satRetentionPct = 10.5;
      let stockBranchIds: string[] = [];
      let mainSaleBranchId = branchId;

      if (integration.metadata) {
        try {
          const meta = JSON.parse(integration.metadata);
          if (meta.targetMargin !== undefined) targetMargin = Number(meta.targetMargin);
          if (meta.shippingCost !== undefined) shippingCost = Number(meta.shippingCost);
          if (meta.listingType !== undefined) listingType = Number(meta.listingType);
          if (meta.hasTaxRetention !== undefined) hasTaxRetention = Boolean(meta.hasTaxRetention);
          if (meta.satRetentionPct !== undefined) satRetentionPct = Number(meta.satRetentionPct);
          if (meta.stockBranchIds !== undefined && Array.isArray(meta.stockBranchIds) && meta.stockBranchIds.length > 0) {
            stockBranchIds = meta.stockBranchIds;
          }
          if (meta.mainSaleBranchId !== undefined) mainSaleBranchId = String(meta.mainSaleBranchId);
        } catch (e) {
          console.error(`[MELI DAILY CRON] Error parseando metadatos para sucursal ${integration.branch.name}:`, e);
        }
      }

      if (stockBranchIds.length === 0) {
        const branchesList = await tenantClient.branch.findMany({
          where: { tenantId: tenantId, isActive: true },
          select: { id: true }
        });
        stockBranchIds = branchesList.map(b => b.id);
      }

      console.log(`[MELI DAILY CRON] Procesando sucursal: ${integration.branch.name} (Tenant: ${tenantId})`);

      // ----------------------------------------------------
      // PASO A: DESCARGAR Y SINCRONIZAR VENTAS RECIENTES
      // ----------------------------------------------------
      if (!onlyStock) {
        // ----------------------------------------------------
        // PASO A: DESCARGAR Y SINCRONIZAR VENTAS RECIENTES
        // ----------------------------------------------------
        try {
          // Obtener ID del usuario Meli
          const meResponse = await fetch('https://api.mercadolibre.com/users/me', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (meResponse.ok) {
            const meData = await meResponse.json();
            const meliUserId = meData.id;

            // Buscar órdenes de las últimas 24-48 horas
            const ordersResponse = await fetch(`https://api.mercadolibre.com/orders/search?seller=${meliUserId}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });

            if (ordersResponse.ok) {
              const ordersData = await ordersResponse.json();
              const ordersList = ordersData.results || [];
              
              console.log(`[MELI DAILY CRON] Se obtuvieron ${ordersList.length} órdenes totales recientes.`);

              // Buscar o crear usuario VENTAS ONLINE en el tenant
              let onlineUser = await tenantClient.user.findFirst({
                where: { tenantId, name: 'VENTAS ONLINE' }
              });

              if (!onlineUser) {
                const safeSlug = integration.branch.name.replace(/\s+/g, '').toLowerCase().substring(0, 8);
                onlineUser = await tenantClient.user.create({
                  data: {
                    name: 'VENTAS ONLINE',
                    email: `ventasonline_${safeSlug}_${Date.now().toString().substring(8)}@caanma.com`,
                    password: 'VENTASONLINE_SECURE_PASSWORD_123',
                    role: 'USER',
                    tenantId,
                    branchId: mainSaleBranchId
                  }
                });
                console.log(`[MELI DAILY CRON] Creado nuevo usuario 'VENTAS ONLINE' para el tenant.`);
              }

              for (const order of ordersList) {
                // Filtrar solo órdenes pagadas
                if (order.status !== 'paid') continue;

                const orderId = String(order.id);
                const checkNote = `Mercado Libre Orden ${orderId}`;
                
                // Verificar si ya está registrada la venta
                const existingSale = await tenantClient.sale.findFirst({
                  where: {
                    branchId: mainSaleBranchId,
                    notes: { contains: checkNote }
                  }
                });

                if (existingSale) {
                  console.log(`[MELI DAILY CRON] La orden ${orderId} ya está registrada en el historial. Saltando.`);
                  continue;
                }

                console.log(`[MELI DAILY CRON] Registrando nueva venta de Mercado Libre para la orden ${orderId}...`);

                // Guía/etiqueta de envío link
                const shipmentId = order.shipping?.id || '';
                const shippingLabelUrl = shipmentId 
                  ? `https://api.mercadolibre.com/shipments/${shipmentId}/labels?access_token=${token}`
                  : '';

                // Crear venta en base de datos
                const newSale = await tenantClient.sale.create({
                  data: {
                    total: order.total_amount || 0,
                    status: 'COMPLETED',
                    paymentMethod: 'CARD',
                    branchId: mainSaleBranchId,
                    userId: onlineUser.id,
                    notes: `${checkNote}. Guía de Envío: ${shippingLabelUrl || 'No disponible'}. Comprador: ${order.buyer?.nickname || 'Mercado Libre Client'}`
                  }
                });

                // Agregar items de la venta
                const orderItems = order.order_items || [];
                for (const item of orderItems) {
                  const externalId = item.item?.id || '';
                  
                  // Mapear a producto local
                  const map = await tenantClient.externalProductMap.findUnique({
                    where: { platform_externalId: { platform: 'MERCADO_LIBRE', externalId } }
                  });

                  if (map) {
                    const quantity = item.quantity || 1;
                    const itemPrice = item.unit_price || 0;

                    await tenantClient.saleItem.create({
                      data: {
                        saleId: newSale.id,
                        productId: map.productId,
                        quantity,
                        price: itemPrice
                      }
                    });

                    // Descontar inventario en la sucursal destino de ventas
                    await tenantClient.product.update({
                      where: { id: map.productId },
                      data: { stock: { decrement: quantity } }
                    });

                    console.log(`[MELI DAILY CRON] Descontado stock local (${quantity}) para producto vinculado ${map.productId}`);
                  }
                }
                
                totalSalesSynced++;
              }
            }
          }
        } catch (salesErr) {
          console.error(`[MELI DAILY CRON] Error procesando ventas para sucursal ${integration.branch.name}:`, salesErr);
        }
      }

      // ----------------------------------------------------
      // PASO B Y C: SINCRONIZAR PRECIOS E INVENTARIOS SUMADOS
      // ----------------------------------------------------
      try {
        // Obtener todos los mapeos de esta sucursal
        const mappings = await tenantClient.externalProductMap.findMany({
          where: {
            platform: 'MERCADO_LIBRE',
            product: { branchId: branchId }
          },
          include: {
            product: true
          }
        });

        // RECALCULAR COSTOS DE MERCADO LIBRE PARA TODOS LOS ARTÍCULOS VINCULADOS
        if (mappings.length > 0) {
          try {
            console.log(`[MELI DAILY CRON] Recalculando costos para ${mappings.length} artículos vinculados...`);
            const itemIds = mappings.map(m => m.externalId);
            const meliItemsDetails: Record<string, any> = {};
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
                      meliItemsDetails[d.body.id] = d.body;
                    }
                  });
                }
              }
            }

            for (const map of mappings) {
              const itemData = meliItemsDetails[map.externalId];
              if (itemData) {
                const { calculateMeliItemCosts } = await import('@/app/actions/integration');
                const costs = await calculateMeliItemCosts(
                  branchId,
                  map.externalId,
                  itemData.price,
                  itemData.category_id,
                  itemData.listing_type_id,
                  itemData.shipping ? itemData.shipping.free_shipping : false
                );

                const actualPrecio = map.isFixedPrice ? (map.precioMeli || itemData.price) : itemData.price;
                const cost = map.product.cost || 0;
                const margenDinero = actualPrecio - cost - costs.comisionMeli - costs.envioMeli - costs.retencionMeli;
                const margenPorcentaje = actualPrecio > 0 ? (margenDinero / actualPrecio) * 100 : 0;

                await tenantClient.externalProductMap.update({
                  where: { id: map.id },
                  data: {
                    precioMeli: map.isFixedPrice ? map.precioMeli : itemData.price,
                    comisionMeli: costs.comisionMeli,
                    envioMeli: costs.envioMeli,
                    retencionMeli: costs.retencionMeli,
                    margenDinero,
                    margenPorcentaje,
                    lastSync: new Date(),
                    syncStatus: itemData.status || 'active'
                  }
                });

                // Actualizar los valores en memoria para que la lógica subsiguiente los use
                map.precioMeli = map.isFixedPrice ? map.precioMeli : itemData.price;
                map.comisionMeli = costs.comisionMeli;
                map.envioMeli = costs.envioMeli;
                map.retencionMeli = costs.retencionMeli;
                map.margenDinero = margenDinero;
                map.margenPorcentaje = margenPorcentaje;
                map.syncStatus = itemData.status || 'active';
              }
            }
            console.log(`[MELI DAILY CRON] Costos recalculados y guardados exitosamente.`);
          } catch (costErr) {
            console.error(`[MELI DAILY CRON] Error al recalcular costos de artículos vinculados:`, costErr);
          }
        }

        for (const map of mappings) {
          const product = map.product;

          if (!onlyStock) {
            // Buscar lista de precios "Mercado Libre"
            let priceList = await tenantClient.priceList.findFirst({
              where: {
                branchId: branchId,
                name: { mode: 'insensitive', equals: 'mercado libre' }
              }
            });

            if (!priceList) {
              priceList = await tenantClient.priceList.create({
                data: {
                  branchId: branchId,
                  name: 'Mercado Libre'
                }
              });
            }

            const retentionRate = hasTaxRetention ? (satRetentionPct / 100) : 0;
            const denominator = 1 - listingType - retentionRate - (targetMargin / 100);

            // 1. Recalcular precio meta
            let suggestedPrice = 0;
            if (denominator > 0 && !map.isFixedPrice) {
              suggestedPrice = (shippingCost + product.cost) / denominator;
              suggestedPrice = Math.round(suggestedPrice * 100) / 100;
            }

            if (suggestedPrice > 0 && !map.isFixedPrice) {
              // Guardar localmente
              await tenantClient.productPrice.upsert({
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

              // Actualizar en Mercado Libre
              const priceResponse = await fetch(`https://api.mercadolibre.com/items/${map.externalId}`, {
                method: 'PUT',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ price: suggestedPrice })
              });

              if (priceResponse.ok) {
                totalPricesSynced++;
              } else {
                const errBody = await priceResponse.json().catch(() => ({}));
                console.error(`[MELI DAILY CRON] Error al actualizar precio en ML para ${map.externalId}:`, errBody);
              }
            }
          }

          // 2. Sumar stock global
          try {
            const productInBranches = await tenantClient.product.findMany({
              where: {
                sku: product.sku,
                branchId: { in: stockBranchIds }
              }
            });

            const totalStock = productInBranches.reduce((sum, p) => sum + p.stock, 0);
            const clampedStock = Math.max(0, totalStock);

            // Actualizar stock en Mercado Libre y reactivar si es mayor a 0
            const stockPayload = {
              available_quantity: clampedStock,
              ...(clampedStock > 0 ? { status: 'active' } : {})
            };

            const stockResponse = await fetch(`https://api.mercadolibre.com/items/${map.externalId}`, {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(stockPayload)
            });

            if (stockResponse.ok) {
              totalStocksSynced++;
            } else {
              const errBody = await stockResponse.json().catch(() => ({}));
              console.error(`[MELI DAILY CRON] Error al actualizar stock en ML para ${map.externalId}:`, errBody);
            }
          } catch (stockErr) {
            console.error(`[MELI DAILY CRON] Error sincronizando stock para ${map.externalId}:`, stockErr);
          }
        }
      } catch (syncErr) {
        console.error(`[MELI DAILY CRON] Error en sincronización de precios/inventarios para sucursal ${integration.branch.name}:`, syncErr);
      }

      // ----------------------------------------------------
      // PASO C: BARRIDO Y DESCARGA AUTOMÁTICA DE NUEVAS PUBLICACIONES (CADA 5 MINUTOS)
      // ----------------------------------------------------
      try {
        console.log(`[MELI DAILY CRON] Iniciando barrido de catálogo para sucursal: ${integration.branch.name}`);
        
        // A. Obtener ID de usuario Meli
        const meResponse = await fetch('https://api.mercadolibre.com/users/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (meResponse.ok) {
          const meData = await meResponse.json();
          const userId = meData.id;

          // B. Buscar todas las publicaciones con paginación
          const itemIds: string[] = [];
          let offset = 0;
          const searchLimit = 50;
          let hasMore = true;

          while (hasMore) {
            const searchResponse = await fetch(`https://api.mercadolibre.com/users/${userId}/items/search?limit=${searchLimit}&offset=${offset}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!searchResponse.ok) break;

            const searchData = await searchResponse.json();
            const results: string[] = searchData.results || [];
            itemIds.push(...results);

            if (results.length < searchLimit || itemIds.length >= 5000) {
              hasMore = false;
            } else {
              offset += searchLimit;
            }
          }

          console.log(`[MELI DAILY CRON] Barrido: Se encontraron ${itemIds.length} publicaciones totales en ML.`);

          // C. Obtener detalles en lotes de 20
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

          // D. Comparar y vincular o agregar a unlinked
          const unlinkedMeliItems: any[] = [];

          for (const item of meliItems) {
            const existingMap = await tenantClient.externalProductMap.findUnique({
              where: { platform_externalId: { platform: 'MERCADO_LIBRE', externalId: item.id } },
              include: { product: true }
            });

            if (existingMap) {
              // Ya existe. Si no está sintonizado el estatus, lo actualizamos
              if (existingMap.syncStatus !== item.status) {
                await tenantClient.externalProductMap.update({
                  where: { id: existingMap.id },
                  data: { syncStatus: item.status || 'active' }
                });
              }
            } else {
              const cleanSku = item.seller_custom_field ? String(item.seller_custom_field).trim() : null;
              
              let localProduct = cleanSku ? await tenantClient.product.findUnique({
                where: { sku_branchId: { sku: cleanSku, branchId: branchId } }
              }) : null;

              if (!localProduct) {
                const { getBarcodesFromMeliItem } = await import('@/app/actions/integration');
                const barcodes = await getBarcodesFromMeliItem(item);
                if (barcodes.length > 0) {
                  localProduct = await tenantClient.product.findFirst({
                    where: {
                      barcode: { in: barcodes },
                      branchId: branchId,
                      isActive: true
                    }
                  });
                  if (localProduct) {
                    console.log(`[MELI DAILY CRON] Auto-vinculando producto local '${localProduct.name}' con publicación ${item.id} por CÓDIGO DE BARRAS: ${barcodes}`);
                  }
                }
              }

              if (localProduct) {
                // Auto-vinculación automática por SKU!
                console.log(`[MELI DAILY CRON] Auto-vinculando producto local '${localProduct.name}' con publicación ${item.id} por SKU: ${cleanSku}`);
                
                // Calcular costos reales
                const { calculateMeliItemCosts } = await import('@/app/actions/integration');
                const costs = await calculateMeliItemCosts(
                  branchId,
                  item.id,
                  item.price,
                  item.category_id,
                  item.listing_type_id,
                  item.shipping ? item.shipping.free_shipping : false
                );

                const cost = localProduct.cost;
                const margenDinero = item.price - cost - costs.comisionMeli - costs.envioMeli - costs.retencionMeli;
                const margenPorcentaje = item.price > 0 ? (margenDinero / item.price) * 100 : 0;

                await tenantClient.externalProductMap.create({
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

                // Sincronizar stock inmediatamente para el nuevo mapeo
                try {
                  const { syncMeliStockAction } = await import('@/app/actions/integration');
                  await syncMeliStockAction(localProduct.id, tenantId);
                } catch (stockErr) {
                  console.error(`[MELI DAILY CRON] Error al sincronizar stock inmediato tras auto-vincular:`, stockErr);
                }
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

          // Guardar lista en metadatos
          const currentMeta = integration.metadata ? JSON.parse(integration.metadata) : {};
          currentMeta.unlinkedMeliItems = unlinkedMeliItems;

          await tenantClient.storeIntegration.update({
            where: { id: integration.id },
            data: { metadata: JSON.stringify(currentMeta) }
          });

          console.log(`[MELI DAILY CRON] Barrido de catálogo finalizado con éxito. ${unlinkedMeliItems.length} publicaciones sin vincular guardadas.`);
        }
      } catch (sweepErr) {
        console.error(`[MELI DAILY CRON] Error en el barrido de catálogo:`, sweepErr);
      }

      processedTenantsCount++;
    }

    return NextResponse.json({
      success: true,
      message: 'Sincronización diaria finalizada con éxito.',
      summary: {
        integrationsProcessed: processedTenantsCount,
        salesSynced: totalSalesSynced,
        pricesSynced: totalPricesSynced,
        stocksSynced: totalStocksSynced
      }
    });

  } catch (error) {
    console.error('[MELI DAILY CRON] Error fatal durante el cron:', error);
    return NextResponse.json({ error: 'Error durante la sincronización: ' + String(error) }, { status: 500 });
  }
}
