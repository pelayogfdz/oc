import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActiveBranch } from '@/app/actions/auth';

// This would typically be called via UI button "Sincronizar Manualmente"
export async function POST(req: Request) {
  try {
    const branch = await getActiveBranch();
    
    const integration = await prisma.storeIntegration.findUnique({
      where: { branchId_platform: { branchId: branch.id, platform: 'MERCADO_LIBRE' } }
    });

    if (!integration || !integration.accessToken) {
      return NextResponse.json({ error: 'Configuración o token de Mercado Libre faltante.' }, { status: 400 });
    }

    // --- MERCADO LIBRE API SIMULATION ---
    // In a real application we would:
    // 1. Fetch user id: GET https://api.mercadolibre.com/users/me (using token)
    // 2. Fetch items: GET https://api.mercadolibre.com/users/{userId}/items/search
    // 3. For each item, GET https://api.mercadolibre.com/items/{itemId}
    
    // Simulating a response payload from MELI
    const meliItems = [
      { id: 'MLM12345678', title: 'Producto Sincronizado de Ejemplo', price: 999.00, available_quantity: 10, seller_custom_field: 'SKU-001' },
      { id: 'MLM87654321', title: 'Otro Producto Externo', price: 499.00, available_quantity: 5, seller_custom_field: 'SKU-EXT-002' }
    ];

    let syncedCount = 0;
    let newCreatedCount = 0;

    for (const item of meliItems) {
      // Check if mapped
      const existingMap = await prisma.externalProductMap.findUnique({
        where: { platform_externalId: { platform: 'MERCADO_LIBRE', externalId: item.id } },
        include: { product: true }
      });

      if (existingMap) {
        // Update local price or stock based on preference? Usually it's local -> external.
        // We'll just touch the lastSync
        await prisma.externalProductMap.update({
          where: { id: existingMap.id },
          data: { lastSync: new Date() }
        });
        syncedCount++;
      } else {
        // Try to match by SKU
        const localProduct = item.seller_custom_field ? await prisma.product.findUnique({
          where: { sku_branchId: { sku: String(item.seller_custom_field), branchId: branch.id } }
        }) : null;

        if (localProduct) {
          // Found local matching SKU, map it
          await prisma.externalProductMap.create({
            data: { productId: localProduct.id, platform: 'MERCADO_LIBRE', externalId: item.id }
          });
          syncedCount++;
        } else {
          // Not found local, CREATE standard product based on MELI 
          // (per user auto-creation strategy)
          const newLocal = await prisma.product.create({
            data: {
              name: item.title,
              sku: item.seller_custom_field || `MELI-${item.id}`,
              price: item.price,
              cost: item.price * 0.5, // placeholder
              stock: item.available_quantity,
              branchId: branch.id
            }
          });
          
          await prisma.externalProductMap.create({
            data: { productId: newLocal.id, platform: 'MERCADO_LIBRE', externalId: item.id }
          });
          newCreatedCount++;
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Sincronización completa. Mapeos actualizados: ${syncedCount}, Nuevos creados: ${newCreatedCount}` 
    });
    
  } catch (error) {
    console.error('Meli Sync Error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
