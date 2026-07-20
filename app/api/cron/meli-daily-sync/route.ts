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

        console.log(`[MELI DAILY CRON] Sincronizando precios y stocks sumados para ${mappings.length} vinculaciones...`);

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

            // Actualizar stock en Mercado Libre y reactivar si es mayor a 0
            const stockPayload = {
              available_quantity: totalStock,
              ...(totalStock > 0 ? { status: 'active' } : {})
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
