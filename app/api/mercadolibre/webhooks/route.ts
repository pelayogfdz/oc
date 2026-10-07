import { NextResponse } from 'next/server';
import { prisma, masterClient, getClientForTenant } from '@/lib/prisma';
import { getOrRefreshMeliToken } from '@/app/utils/meliToken';
import { sendMeliPostSaleMessage } from '@/app/utils/meliMessages';

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    
    // Un webhook de Mercado Libre contiene:
    // { "resource": "/orders/12345678", "user_id": 123456789, "topic": "orders", "application_id": 11111 }
    
    if (payload.topic === 'orders' || payload.topic === 'created_orders') {
      console.log(`[MELI WEBHOOK] Evento de orden recibido. Recurso: ${payload.resource}, UserID vendedor: ${payload.user_id}`);

      // 1. Identificar la sucursal de Caanma dueña de esta integración buscando por el userId de ML en metadata
      const integrations = await prisma.storeIntegration.findMany({
        where: { platform: 'MERCADO_LIBRE', isActive: true }
      });

      const integration = integrations.find(i => {
        if (!i.metadata) return false;
        try {
          const meta = JSON.parse(i.metadata);
          return String(meta.userId) === String(payload.user_id);
        } catch {
          return false;
        }
      });

      if (!integration) {
        console.warn(`[MELI WEBHOOK] No se encontró ninguna sucursal con integración activa para el usuario de ML: ${payload.user_id}`);
        // Responder 200 para indicarle a ML que recibimos el mensaje pero no nos corresponde procesarlo
        return new NextResponse('OK', { status: 200 });
      }

      // Obtener el tenantId de la sucursal correspondiente
      const branchRecord = await masterClient.branch.findUnique({
        where: { id: integration.branchId }
      });
      const tenantId = branchRecord?.tenantId || null;
      const tenantClient = tenantId ? getClientForTenant(tenantId) : prisma;

      // 2. Obtener token real auto-refrescado
      const token = await getOrRefreshMeliToken(integration.branchId);
      if (!token) {
        console.error(`[MELI WEBHOOK] Token no disponible para la sucursal ${integration.branchId}. Reintentando después...`);
        return new NextResponse('Token error', { status: 500 });
      }

      // 3. Consultar los detalles de la orden en la API oficial de Mercado Libre
      const orderResponse = await fetch(`https://api.mercadolibre.com${payload.resource}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!orderResponse.ok) {
        console.error(`[MELI WEBHOOK] Error al obtener detalles de la orden de Mercado Libre (${orderResponse.status})`);
        return new NextResponse('Error de comunicación con ML API', { status: 500 });
      }

      const orderData = await orderResponse.json();
      console.log(`[MELI WEBHOOK] Detalles de la orden recuperados. Orden ID: ${orderData.id}, Estado: ${orderData.status}, Comprador: ${orderData.buyer?.nickname}`);

      const orderIdStr = String(orderData.id);
      const checkFolio = `ML-${orderIdStr}`;
      const checkNote = `Mercado Libre Orden ${orderIdStr}`;
      const CUTOFF_DATE = new Date('2026-09-29T00:00:00.000Z');

      // GESTIÓN DE CANCELACIONES DE MERCADO LIBRE (A partir del 29 de Septiembre de 2026 en adelante)
      if (orderData.status === 'cancelled') {
        const existingSale = await tenantClient.sale.findFirst({
          where: {
            OR: [
              { folio: checkFolio },
              { notes: { contains: checkNote } },
              { notes: { contains: `[Mercado Libre Orden: ${orderIdStr}]` } }
            ]
          },
          include: { items: true }
        });

        if (existingSale) {
          if (existingSale.status === 'CANCELLED') {
            console.log(`[MELI WEBHOOK] La venta ${existingSale.folio || existingSale.id} ya está en estado CANCELLED. No se requiere acción.`);
            return new NextResponse('OK', { status: 200 });
          }

          const orderDate = orderData.date_closed || orderData.date_last_updated || orderData.date_created;
          const isEligibleDate = existingSale.createdAt >= CUTOFF_DATE || (orderDate && new Date(orderDate) >= CUTOFF_DATE);

          if (!isEligibleDate) {
            console.log(`[MELI WEBHOOK] La orden cancelada ML-${orderIdStr} es anterior al 29 Sep 2026. No se altera el histórico.`);
            return new NextResponse('OK', { status: 200 });
          }

          if (existingSale.status === 'COMPLETED') {
            console.log(`[MELI WEBHOOK] Procesando cancelación automática para la venta ${existingSale.folio || existingSale.id}...`);

            // 1. Revertir inventario en Kardex
            for (const item of existingSale.items) {
              const product = await tenantClient.product.findUnique({ where: { id: item.productId } });
              if (product && !product.isService) {
                await tenantClient.product.update({
                  where: { id: item.productId },
                  data: { stock: { increment: item.quantity } }
                });

                await tenantClient.inventoryMovement.create({
                  data: {
                    productId: item.productId,
                    type: 'IN',
                    quantity: item.quantity,
                    reason: `Cancelación Venta Mercado Libre (Pedido #${orderData.id})`,
                    userId: existingSale.userId
                  }
                });
                console.log(`[MELI WEBHOOK] Reincorporadas +${item.quantity} unidades del producto ${product.name} (ID: ${product.id})`);
              }
            }

            // 2. Marcar venta como CANCELLED
            const cancelReason = orderData.cancel_detail?.description || orderData.cancel_detail?.code || 'Cancelación notificada por Mercado Libre';
            await tenantClient.sale.update({
              where: { id: existingSale.id },
              data: {
                status: 'CANCELLED',
                notes: `${existingSale.notes || ''}\n[CANCELACIÓN AUTOMÁTICA MERCADO LIBRE: ${cancelReason} - ${new Date().toLocaleString('es-MX')}]`
              }
            });

            console.log(`[MELI WEBHOOK] Venta ${existingSale.folio || existingSale.id} cancelada y stock restaurado exitosamente.`);
          }
        } else {
          console.log(`[MELI WEBHOOK] La orden cancelada ML-${orderIdStr} no existía en Caanma. No se generó venta ni descuento de stock.`);
        }

        return new NextResponse('OK', { status: 200 });
      }

      // Si la orden no está pagada ni cancelada (ej. pendiente de pago), no registrar venta todavía
      if (orderData.status !== 'paid') {
        console.log(`[MELI WEBHOOK] La orden ${orderData.id} tiene estado '${orderData.status}' (no pagada). No se genera venta.`);
        return new NextResponse('OK', { status: 200 });
      }

      const orderItems = orderData.order_items || [];
      const itemsToSale: any[] = [];
      let totalSaleAmount = 0;

      // Obtener todas las sucursales del tenant para enrutamiento de stock
      const tenantBranchesList = await tenantClient.branch.findMany({
        where: { tenantId, isActive: true },
        select: { id: true }
      });
      const tenantBranchIds = tenantBranchesList.map(b => b.id);

      // 4. Procesar cada publicación de la orden
      for (const item of orderItems) {
        const externalId = item.item.id; // MLMxxxxxx
        const quantity = Number(item.quantity);
        const price = Number(item.unit_price);
        const sellerSku = item.item.seller_sku ? String(item.item.seller_sku).trim() : null;

        let targetProduct = null;
        let resolvedSku = sellerSku;

        // Buscar si la publicación está mapeada en nuestro catálogo
        const mappedItem = await tenantClient.externalProductMap.findFirst({
          where: { externalId, platform: 'MERCADO_LIBRE' },
          include: { product: true }
        });

        if (mappedItem) {
          targetProduct = mappedItem.product;
          resolvedSku = mappedItem.product.sku;
        }

        // Buscar el producto en la sucursal que tiene stock
        if (resolvedSku) {
          const branchProducts = await tenantClient.product.findMany({
            where: {
              OR: [
                { sku: { equals: resolvedSku.trim(), mode: 'insensitive' } },
                { barcode: { equals: resolvedSku.trim(), mode: 'insensitive' } }
              ],
              branchId: { in: tenantBranchIds },
              isActive: true
            }
          });

          if (branchProducts.length > 0) {
            // Priorizamos la sucursal preferida (integration.branchId) si tiene stock
            const preferredProduct = branchProducts.find(p => p.branchId === integration.branchId && p.stock >= quantity);
            if (preferredProduct) {
              targetProduct = preferredProduct;
            } else {
              // Si no, buscamos la sucursal que tenga el stock más alto
              branchProducts.sort((a, b) => b.stock - a.stock);
              if (branchProducts[0].stock > 0) {
                targetProduct = branchProducts[0];
              } else if (!targetProduct) {
                // Si ninguna tiene stock, priorizamos el registro en la sucursal origen de la integración (integration.branchId)
                const defaultProd = branchProducts.find(p => p.branchId === integration.branchId);
                targetProduct = defaultProd || branchProducts[0];
              }
            }
          }
        }

        if (targetProduct) {
          console.log(`[MELI WEBHOOK] Producto asignado para la venta: ${targetProduct.name} en sucursal ${targetProduct.branchId}. Cantidad: ${quantity}`);
          
          // Descontar inventario local en la sucursal elegida
          await tenantClient.product.update({
            where: { id: targetProduct.id },
            data: { stock: { decrement: quantity } }
          });

          // Registrar en Kardex
          await tenantClient.inventoryMovement.create({
            data: {
              productId: targetProduct.id,
              type: 'OUT',
              quantity: -quantity,
              reason: `Venta Externa Mercado Libre (Pedido #${orderData.id})`
            }
          });

          // Si no estaba mapeado, crearlo automáticamente para el futuro en la sucursal que tenía stock
          if (!mappedItem) {
            try {
              await tenantClient.externalProductMap.create({
                data: {
                  productId: targetProduct.id,
                  platform: 'MERCADO_LIBRE',
                  externalId: externalId,
                  syncStatus: 'active',
                  precioMeli: price,
                  comisionMeli: price * 0.1,
                  envioMeli: 0,
                  retencionMeli: 0,
                  margenDinero: price - targetProduct.cost,
                  margenPorcentaje: price > 0 ? ((price - targetProduct.cost) / price) * 100 : 0,
                  isFixedPrice: false
                }
              });
              console.log(`[MELI WEBHOOK] Vinculación creada automáticamente por SKU para item ${externalId} a producto ${targetProduct.name} en sucursal ${targetProduct.branchId}`);
            } catch (mapErr) {
              console.error('Error creating auto-mapping:', mapErr);
            }
          }

          itemsToSale.push({
            productId: targetProduct.id,
            branchId: targetProduct.branchId,
            quantity,
            price
          });

          totalSaleAmount += (price * quantity);
        } else {
          console.warn(`[MELI WEBHOOK] Publicación vendida ${externalId} (SKU: ${sellerSku}) no se pudo mapear a ningún producto local. Se omitirá el descuento de stock.`);
        }
      }

      // 5. Si logramos mapear al menos un producto, registrar la venta a nivel contable en la sucursal que aportó la existencia
      if (itemsToSale.length > 0) {
        const orderIdStr = String(orderData.id);
        const checkFolio = `ML-${orderIdStr}`;
        const checkNote = `Mercado Libre Orden ${orderIdStr}`;

        const existingSale = await tenantClient.sale.findFirst({
          where: {
            OR: [
              { folio: checkFolio },
              { notes: { contains: checkNote } },
              { notes: { contains: `[Mercado Libre Orden: ${orderIdStr}]` } }
            ]
          }
        });

        if (existingSale) {
          console.log(`[MELI WEBHOOK] La orden ${orderData.id} ya está registrada en el historial. Saltando.`);
          return new NextResponse('OK', { status: 200 });
        }

        const saleBranchId = itemsToSale[0].branchId || integration.branchId;
        console.log(`[MELI WEBHOOK] Registrando venta contable en Caanma (sucursal: ${saleBranchId}) por un total de $${totalSaleAmount}...`);
        
        // Obtener el primer usuario de la base de datos para registrar la venta
        const defaultUser = await tenantClient.user.findFirst();
        if (!defaultUser) {
          console.error('[MELI WEBHOOK] No se encontró ningún usuario para asociar al registro de la venta.');
          return new NextResponse('Internal User Config Error', { status: 500 });
        }

        // Guía/etiqueta de envío link
        const shipmentId = orderData.shipping?.id || '';
        const shippingLabelUrl = shipmentId 
          ? `https://api.mercadolibre.com/shipments/${shipmentId}/labels?response_type=pdf&access_token=${token}`
          : '';

        // Crear la venta
        const createdSale = await tenantClient.sale.create({
          data: {
            folio: checkFolio,
            total: totalSaleAmount,
            status: 'COMPLETED',
            paymentMethod: 'MERCADO_PAGO',
            branchId: saleBranchId,
            userId: defaultUser.id,
            notes: `Venta automática registrada desde Mercado Libre [Mercado Libre Orden: ${orderIdStr}]. Guía de Envío: ${shippingLabelUrl || 'No disponible'}. Comprador: ${orderData.buyer?.nickname || 'Desconocido'}.`,
            createdAt: orderData.date_created ? new Date(orderData.date_created) : new Date(),
            updatedAt: orderData.date_created ? new Date(orderData.date_created) : new Date(),
            items: {
              create: itemsToSale.map(item => ({
                productId: item.productId,
                quantity: item.quantity,
                price: item.price
              }))
            }
          }
        });

        console.log(`[MELI WEBHOOK] Venta registrada exitosamente con Folio: ML-${orderData.id} en sucursal: ${saleBranchId}`);

        // Enviar mensaje post-venta automático al comprador con folio y enlace de autofacturación
        try {
          const hostHeader = req.headers.get('host');
          await sendMeliPostSaleMessage({
            branchId: integration.branchId,
            orderId: orderData.id,
            packId: orderData.pack_id,
            sellerId: payload.user_id,
            buyerId: orderData.buyer?.id,
            buyerNickname: orderData.buyer?.nickname,
            folio: checkFolio,
            saleId: createdSale.id,
            host: hostHeader
          });
        } catch (msgErr) {
          console.error('[MELI WEBHOOK] Error enviando mensaje post-venta al comprador:', msgErr);
        }
      }
    } else if (payload.topic === 'questions') {
      console.log(`[MELI WEBHOOK] Evento de pregunta recibido en Mercado Libre. Recurso: ${payload.resource}, UserID: ${payload.user_id}`);
      // Se acusa recibo a Mercado Libre; el popup del frontend sondea periódicamente y muestra la notificación interactiva
      return new NextResponse('OK', { status: 200 });
    }

    // Retornar 200 de inmediato a Mercado Libre para acusar de recibida la notificación
    return new NextResponse('OK', { status: 200 });

  } catch (err) {
    console.error('[MELI WEBHOOK] Error general procesando notificación:', err);
    // Retornamos 500 para indicarle a ML que reintente en unos minutos
    return new NextResponse('Error de procesamiento interno', { status: 500 });
  }
}
