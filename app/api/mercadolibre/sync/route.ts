import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActiveBranch } from '@/app/actions/auth';
import { getOrRefreshMeliToken } from '@/app/utils/meliToken';

export async function POST(req: Request) {
  try {
    const branch = await getActiveBranch();
    
    const integration = await prisma.storeIntegration.findFirst({
      where: {
        platform: 'MERCADO_LIBRE',
        branchId: branch.id // o cualquier sucursal vinculada
      }
    });

    if (!integration) {
      return NextResponse.json({ error: 'Configuración de Mercado Libre no encontrada.' }, { status: 400 });
    }
    
    // Obtener token real auto-refrescado
    const token = await getOrRefreshMeliToken(integration.branchId);

    if (!token) {
      return NextResponse.json({ error: 'Token de Mercado Libre faltante o no conectado.' }, { status: 400 });
    }

    console.log(`[MELI SYNC] Iniciando sincronización de catálogo para sucursal ${branch.name}...`);

    // 1. Obtener ID de usuario de Mercado Libre
    const meResponse = await fetch('https://api.mercadolibre.com/users/me', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!meResponse.ok) {
      const errData = await meResponse.json();
      console.error('[MELI SYNC] Error al obtener usuario de ML:', errData);
      return NextResponse.json({ error: 'Error al conectar con la cuenta de Mercado Libre. Verifica tu autorización.' }, { status: 400 });
    }

    const meData = await meResponse.json();
    const userId = meData.id;
    console.log(`[MELI SYNC] Conectado exitosamente con usuario de ML: ${meData.nickname} (${userId})`);

    // 2. Buscar publicaciones del vendedor (límite inicial de 50 items para evitar timeouts)
    const searchResponse = await fetch(`https://api.mercadolibre.com/users/${userId}/items/search?limit=50`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!searchResponse.ok) {
      const errData = await searchResponse.json();
      console.error('[MELI SYNC] Error al buscar publicaciones:', errData);
      return NextResponse.json({ error: 'Error al consultar catálogo de Mercado Libre.' }, { status: 400 });
    }

    const searchData = await searchResponse.json();
    const itemIds: string[] = searchData.results || [];
    console.log(`[MELI SYNC] Se encontraron ${itemIds.length} publicaciones activas.`);

    if (itemIds.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'Sincronización completa. No se encontraron publicaciones activas en Mercado Libre para mapear.' 
      });
    }

    // 3. Obtener el detalle de las publicaciones en lotes de hasta 20
    const meliItems: any[] = [];
    const batchSize = 20;
    
    for (let i = 0; i < itemIds.length; i += batchSize) {
      const batchIds = itemIds.slice(i, i + batchSize);
      console.log(`[MELI SYNC] Obteniendo detalles de lote: ${batchIds.join(',')}`);
      
      const itemsDetailResponse = await fetch(`https://api.mercadolibre.com/items?ids=${batchIds.join(',')}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (itemsDetailResponse.ok) {
        const details = await itemsDetailResponse.json();
        // Mercado Libre devuelve un array de objetos con { code: 200, body: {...} }
        if (Array.isArray(details)) {
          details.forEach((d: any) => {
            if (d.code === 200 && d.body) {
              const body = d.body;
              meliItems.push({
                id: body.id,
                title: body.title,
                price: body.price,
                status: body.status, // active, paused, closed, etc.
                available_quantity: body.available_quantity,
                seller_custom_field: body.seller_custom_field || null // SKU ingresado por el vendedor
              });
            }
          });
        }
      } else {
        console.error(`[MELI SYNC] Error al obtener detalles de lote ${i}`);
      }
    }

    console.log(`[MELI SYNC] Procesando ${meliItems.length} publicaciones detalladas para mapeo de catálogo...`);

    let syncedCount = 0;
    const unlinkedMeliItems: any[] = [];

    for (const item of meliItems) {
      // Validar si la publicación ya tiene un mapa registrado
      const existingMap = await prisma.externalProductMap.findUnique({
        where: { platform_externalId: { platform: 'MERCADO_LIBRE', externalId: item.id } },
        include: { product: true }
      });

      if (existingMap) {
        // El mapa ya existe, actualizamos la fecha de sincronización y el precio (si no está fijo)
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
        // Intentar empatar por SKU (seller_custom_field)
        const cleanSku = item.seller_custom_field ? String(item.seller_custom_field).trim() : null;
        
        const localProduct = cleanSku ? await prisma.product.findUnique({
          where: { sku_branchId: { sku: cleanSku, branchId: branch.id } }
        }) : null;

        if (localProduct) {
          // Coincidencia de SKU encontrada! Crear mapeo
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
          console.log(`[MELI SYNC] Empatado producto local '${localProduct.name}' con publicación ${item.id} por SKU: ${cleanSku}`);
        } else {
          // No hay producto local con ese SKU. Guardamos como publicación de ML sin vincular en los metadatos
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

    // Guardar las publicaciones no vinculadas de ML en los metadatos de la integración
    const currentMeta = integration.metadata ? JSON.parse(integration.metadata) : {};
    currentMeta.unlinkedMeliItems = unlinkedMeliItems;

    await prisma.storeIntegration.update({
      where: { id: integration.id },
      data: { metadata: JSON.stringify(currentMeta) }
    });

    const redirectUrl = new URL('/integraciones/mercadolibre', req.url);
    redirectUrl.searchParams.set('tab', 'catalogo');
    redirectUrl.searchParams.set('success', 'synced');
    redirectUrl.searchParams.set('syncedCount', String(syncedCount));
    redirectUrl.searchParams.set('unlinkedCount', String(unlinkedMeliItems.length));
    return NextResponse.redirect(redirectUrl);
    
  } catch (error: any) {
    console.error('Meli Sync Error:', error);
    const redirectUrl = new URL('/integraciones/mercadolibre', req.url);
    redirectUrl.searchParams.set('tab', 'catalogo');
    redirectUrl.searchParams.set('error', 'sync_failed');
    redirectUrl.searchParams.set('message', error.message || String(error));
    return NextResponse.redirect(redirectUrl);
  }
}
