import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrRefreshMeliToken } from '@/app/utils/meliToken';

export async function GET(req: Request) {
  return handleSync();
}

export async function POST(req: Request) {
  return handleSync();
}

async function handleSync() {
  console.log("[MELI DAILY CRON] Iniciando proceso de sincronización diaria...");
  
  try {
    // 1. Obtener todas las integraciones activas de Mercado Libre
    const integrations = await prisma.storeIntegration.findMany({
      where: {
        platform: 'MERCADO_LIBRE',
        isActive: true
      },
      include: {
        branch: true
      }
    });

    console.log(`[MELI DAILY CRON] Se encontraron ${integrations.length} integraciones activas de Mercado Libre.`);

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
      let stockBranchIds: string[] = [branchId];
      let mainSaleBranchId = branchId;

      if (integration.metadata) {
        try {
          const meta = JSON.parse(integration.metadata);
          if (meta.targetMargin !== undefined) targetMargin = Number(meta.targetMargin);
          if (meta.shippingCost !== undefined) shippingCost = Number(meta.shippingCost);
          if (meta.listingType !== undefined) listingType = Number(meta.listingType);
          if (meta.hasTaxRetention !== undefined) hasTaxRetention = Boolean(meta.hasTaxRetention);
          if (meta.satRetentionPct !== undefined) satRetentionPct = Number(meta.satRetentionPct);
          if (meta.stockBranchIds !== undefined && Array.isArray(meta.stockBranchIds)) stockBranchIds = meta.stockBranchIds;
          if (meta.mainSaleBranchId !== undefined) mainSaleBranchId = String(meta.mainSaleBranchId);
        } catch (e) {
          console.error(`[MELI DAILY CRON] Error parseando metadatos para sucursal ${integration.branch.name}:`, e);
        }
      }

      console.log(`[MELI DAILY CRON] Procesando sucursal: ${integration.branch.name} (Tenant: ${tenantId})`);

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
            let onlineUser = await prisma.user.findFirst({
              where: { tenantId, name: 'VENTAS ONLINE' }
            });

            if (!onlineUser) {
              const safeSlug = integration.branch.name.replace(/\s+/g, '').toLowerCase().substring(0, 8);
              onlineUser = await prisma.user.create({
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
              const existingSale = await prisma.sale.findFirst({
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
              const newSale = await prisma.sale.create({
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
                const map = await prisma.externalProductMap.findUnique({
                  where: { platform_externalId: { platform: 'MERCADO_LIBRE', externalId } }
                });

                if (map) {
                  const quantity = item.quantity || 1;
                  const itemPrice = item.unit_price || 0;

                  await prisma.saleItem.create({
                    data: {
                      saleId: newSale.id,
                      productId: map.productId,
                      quantity,
                      price: itemPrice
                    }
                  });

                  // Descontar inventario en la sucursal destino de ventas
                  await prisma.product.update({
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

      // ----------------------------------------------------
      // PASO B Y C: SINCRONIZAR PRECIOS E INVENTARIOS SUMADOS
      // ----------------------------------------------------
      try {
        // Obtener todos los mapeos de esta sucursal
        const mappings = await prisma.externalProductMap.findMany({
          where: {
            platform: 'MERCADO_LIBRE',
            product: { branchId: branchId }
          },
          include: {
            product: true
          }
        });

        console.log(`[MELI DAILY CRON] Sincronizando precios y stocks sumados para ${mappings.length} vinculaciones...`);

        // Buscar lista de precios "Mercado Libre"
        let priceList = await prisma.priceList.findFirst({
          where: {
            branchId: branchId,
            name: { mode: 'insensitive', equals: 'mercado libre' }
          }
        });

        if (!priceList) {
          priceList = await prisma.priceList.create({
            data: {
              branchId: branchId,
              name: 'Mercado Libre'
            }
          });
        }

        const retentionRate = hasTaxRetention ? (satRetentionPct / 100) : 0;
        const denominator = 1 - listingType - retentionRate - (targetMargin / 100);

        for (const map of mappings) {
          const product = map.product;

          // 1. Recalcular precio meta
          let suggestedPrice = 0;
          if (denominator > 0 && !map.isFixedPrice) {
            suggestedPrice = (shippingCost + product.cost) / denominator;
            suggestedPrice = Math.round(suggestedPrice * 100) / 100;
          }

          if (suggestedPrice > 0 && !map.isFixedPrice) {
            // Guardar localmente
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

          // 2. Sumar stock global
          try {
            const productInBranches = await prisma.product.findMany({
              where: {
                sku: product.sku,
                branchId: { in: stockBranchIds }
              }
            });

            const totalStock = productInBranches.reduce((sum, p) => sum + p.stock, 0);

            // Actualizar stock en Mercado Libre
            const stockResponse = await fetch(`https://api.mercadolibre.com/items/${map.externalId}`, {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ available_quantity: totalStock })
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
