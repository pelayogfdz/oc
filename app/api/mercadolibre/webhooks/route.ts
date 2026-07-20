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

      // 4. Procesar cada publicación de la orden
      for (const item of orderItems) {
        const externalId = item.item.id; // MLMxxxxxx
        const quantity = Number(item.quantity);
        const price = Number(item.unit_price);

        // Buscar si la publicación está mapeada en nuestro catálogo
        const mappedItem = await tenantClient.externalProductMap.findFirst({
          where: { externalId, platform: 'MERCADO_LIBRE' },
          include: { product: { include: { variants: true } } }
        });

        if (mappedItem) {
          const product = mappedItem.product;
          console.log(`[MELI WEBHOOK] Publicación mapeada encontrada: ${product.name} (ID: ${product.id}). Cantidad: ${quantity}`);
          
          // Descontar inventario local en la base de datos
          await tenantClient.product.update({
            where: { id: product.id },
            data: { stock: { decrement: quantity } }
          });

          // Registrar en Kardex
          await tenantClient.inventoryMovement.create({
            data: {
              productId: product.id,
              type: 'OUT',
              quantity: -quantity,
              reason: `Venta Externa Mercado Libre (Pedido #${orderData.id})`
            }
          });

          itemsToSale.push({
            productId: product.id,
            quantity,
            price
          });

          totalSaleAmount += (price * quantity);
        } else {
          console.warn(`[MELI WEBHOOK] Publicación vendida ${externalId} no está mapeada en el inventario local de Caanma. Se omitirá el descuento de stock.`);
        }
      }

      // 5. Si logramos mapear al menos un producto, registrar la venta a nivel contable
      if (itemsToSale.length > 0) {
        console.log(`[MELI WEBHOOK] Registrando venta contable en Caanma por un total de $${totalSaleAmount}...`);
        
        // Obtener el primer usuario de la base de datos para registrar la venta
        const defaultUser = await tenantClient.user.findFirst();
        if (!defaultUser) {
          console.error('[MELI WEBHOOK] No se encontró ningún usuario para asociar al registro de la venta.');
          return new NextResponse('Internal User Config Error', { status: 500 });
        }

        // Crear la venta
        await tenantClient.sale.create({
          data: {
            folio: `ML-${orderData.id}`,
            total: totalSaleAmount,
            status: 'COMPLETED',
            paymentMethod: 'MERCADO_PAGO',
            branchId: integration.branchId,
            userId: defaultUser.id,
            notes: `Venta automática registrada desde Mercado Libre. Comprador: ${orderData.buyer?.nickname || 'Desconocido'}.`,
            items: {
              create: itemsToSale.map(item => ({
                productId: item.productId,
                quantity: item.quantity,
                price: item.price
              }))
            }
          }
        });

        console.log(`[MELI WEBHOOK] Venta registrada exitosamente con Folio: ML-${orderData.id}`);
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
