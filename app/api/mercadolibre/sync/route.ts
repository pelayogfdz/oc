import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActiveBranch } from '@/app/actions/auth';
import { getOrRefreshMeliToken } from '@/app/utils/meliToken';

export async function POST(req: Request) {
  try {
    const branch = await getActiveBranch();
    
    // Obtener token real auto-refrescado
    const token = await getOrRefreshMeliToken(branch.id);

    if (!token) {
      return NextResponse.json({ error: 'Configuración o token de Mercado Libre faltante o no conectado.' }, { status: 400 });
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

    // 2. Buscar publicaciones activas del vendedor (límite inicial de 50 items para evitar timeouts)
    const searchResponse = await fetch(`https://api.mercadolibre.com/users/${userId}/items/search?limit=50&status=active`, {
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
    let newCreatedCount = 0;

    for (const item of meliItems) {
      // Validar si la publicación ya tiene un mapa registrado
      const existingMap = await prisma.externalProductMap.findUnique({
        where: { platform_externalId: { platform: 'MERCADO_LIBRE', externalId: item.id } },
        include: { product: true }
      });

      if (existingMap) {
        // El mapa ya existe, actualizamos la fecha de sincronización
        await prisma.externalProductMap.update({
          where: { id: existingMap.id },
          data: { lastSync: new Date() }
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
          await prisma.externalProductMap.create({
            data: { 
              productId: localProduct.id, 
              platform: 'MERCADO_LIBRE', 
              externalId: item.id,
              syncStatus: 'SYNCED',
              lastSync: new Date()
            }
          });
          syncedCount++;
          console.log(`[MELI SYNC] Empatado producto local '${localProduct.name}' con publicación ${item.id} por SKU: ${cleanSku}`);
        } else {
          // No hay producto local con ese SKU. Crear nuevo producto de forma automática
          const newLocal = await prisma.product.create({
            data: {
              name: item.title,
              sku: cleanSku || `MELI-${item.id}`,
              price: item.price,
              cost: item.price * 0.6, // Costo estimado base 60%
              averageCost: item.price * 0.6,
              stock: item.available_quantity,
              branchId: branch.id
            }
          });
          
          await prisma.externalProductMap.create({
            data: { 
              productId: newLocal.id, 
              platform: 'MERCADO_LIBRE', 
              externalId: item.id,
              syncStatus: 'SYNCED',
              lastSync: new Date()
            }
          });
          newCreatedCount++;
          console.log(`[MELI SYNC] Creado nuevo producto local '${item.title}' (${newLocal.sku}) para publicación ${item.id}`);
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Sincronización completa. Mapeos actualizados: ${syncedCount}, Nuevos creados: ${newCreatedCount}` 
    });
    
  } catch (error) {
    console.error('Meli Sync Error:', error);
    return NextResponse.json({ error: 'Error durante la sincronización: ' + String(error) }, { status: 500 });
  }
}
