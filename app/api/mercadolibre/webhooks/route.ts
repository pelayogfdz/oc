import { NextResponse } from 'next/server';
import { prisma, masterClient, getClientForTenant } from '@/lib/prisma';
import { getOrRefreshMeliToken } from '@/app/utils/meliToken';

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
      console.log(`[MELI WEBHOOK] Detalles de la orden recuperados. Orden ID: ${orderData.id}, Comprador: ${orderData.buyer?.nickname}`);

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
                // Si ninguna tiene stock, usamos el primero que encontremos
                targetProduct = branchProducts[0];
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
        await tenantClient.sale.create({
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
      }
    }

    // Retornar 200 de inmediato a Mercado Libre para acusar de recibida la notificación
    return new NextResponse('OK', { status: 200 });

  } catch (err) {
    console.error('[MELI WEBHOOK] Error general procesando notificación:', err);
    // Retornamos 500 para indicarle a ML que reintente en unos minutos
    return new NextResponse('Error de procesamiento interno', { status: 500 });
  }
}
