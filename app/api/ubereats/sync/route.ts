import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActiveBranch, getActiveUser } from '@/app/actions/auth';
import {
  getUberEatsAccessToken,
  getUberStoreMenu,
  updateUberItemSuspension,
  processUberEatsOrder
} from '@/lib/uberEatsService';

/**
 * GET: Test connection and fetch live store status / menu stats
 */
export async function GET(req: Request) {
  try {
    const branch = await getActiveBranch();
    const user = await getActiveUser();
    if (!branch) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const isGlobal = !branch || branch.id === 'GLOBAL';
    let targetBranchId = branch.id;

    if (isGlobal) {
      const firstInt = await prisma.storeIntegration.findFirst({
        where: {
          platform: 'UBER_EATS',
          ...(user?.tenantId ? { branch: { tenantId: user.tenantId } } : {})
        }
      });
      if (firstInt) {
        targetBranchId = firstInt.branchId;
      }
    }

    const integration = await prisma.storeIntegration.findUnique({
      where: { branchId_platform: { branchId: targetBranchId, platform: 'UBER_EATS' } }
    });

    if (!integration || !integration.appId || !integration.clientSecret) {
      return NextResponse.json({
        connected: false,
        message: 'No hay credenciales de Uber Eats configuradas para esta sucursal.'
      });
    }

    const meta = integration.metadata ? JSON.parse(integration.metadata) : {};
    const isSandbox = Boolean(meta.isSandbox);
    const storeId = meta.storeId || integration.accessToken;

    try {
      const token = await getUberEatsAccessToken(integration.appId, integration.clientSecret, isSandbox);
      let storeMenuStats = null;

      if (storeId) {
        try {
          const menu = await getUberStoreMenu(storeId, token, isSandbox);
          storeMenuStats = {
            categoriesCount: menu.categories?.length || 0,
            itemsCount: menu.items?.length || 0
          };
        } catch (mErr: any) {
          storeMenuStats = { error: mErr.message };
        }
      }

      return NextResponse.json({
        connected: true,
        isSandbox,
        storeId: storeId || 'No asignado',
        tokenValid: true,
        menuStats: storeMenuStats
      });

    } catch (authErr: any) {
      return NextResponse.json({
        connected: false,
        error: authErr.message
      }, { status: 400 });
    }

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST: Force manual synchronization (Sync stock and process recent/simulated orders)
 */
export async function POST(req: Request) {
  try {
    const branch = await getActiveBranch();
    if (!branch) {
      return NextResponse.json({ error: 'No autorizado. Sucursal no activa.' }, { status: 401 });
    }

    let user;
    try {
      user = await getActiveUser();
    } catch (e) {
      user = await prisma.user.findFirst({
        where: {
          OR: [{ branchId: branch.id }, { tenantId: branch.tenantId }]
        }
      });
    }

    if (!user) {
      return NextResponse.json({ error: 'No se encontró ningún usuario configurado.' }, { status: 400 });
    }

    let body = {};
    try {
      body = await req.json();
    } catch (e) {}

    const isGlobal = !branch || branch.id === 'GLOBAL';
    let targetBranchId = (body as any)?.branchId || (branch.id !== 'GLOBAL' ? branch.id : null);

    if (!targetBranchId) {
      const firstInt = await prisma.storeIntegration.findFirst({
        where: {
          platform: 'UBER_EATS',
          ...(user?.tenantId ? { branch: { tenantId: user.tenantId } } : {})
        }
      });
      targetBranchId = firstInt?.branchId || branch.id;
    }

    const integration = await prisma.storeIntegration.findUnique({
      where: { branchId_platform: { branchId: targetBranchId, platform: 'UBER_EATS' } },
      include: { branch: true }
    });

    if (!integration || !integration.appId || !integration.clientSecret) {
      return NextResponse.json({ error: 'Configuración o credenciales de Uber Eats faltantes para la sucursal seleccionada.' }, { status: 400 });
    }

    const meta = integration.metadata ? JSON.parse(integration.metadata) : {};
    const isSandbox = Boolean(meta.isSandbox);
    const storeId = meta.storeId || integration.accessToken;

    let itemsSuspendedCount = 0;
    let itemsActiveCount = 0;
    let token = null;

    // 1. Authenticate with Uber Eats
    try {
      token = await getUberEatsAccessToken(integration.appId, integration.clientSecret, isSandbox);
    } catch (authErr: any) {
      console.warn('[Uber Eats Sync] Error getting token:', authErr.message);
    }

    // 2. Synchronize stock availability to Uber Eats
    if (token && storeId) {
      const mappedProducts = await prisma.externalProductMap.findMany({
        where: { platform: 'UBER_EATS', product: { branchId: targetBranchId } },
        include: { product: true }
      });

      for (const map of mappedProducts) {
        if (!map.product) continue;
        const isOutOfStock = map.product.stock <= 0;
        try {
          await updateUberItemSuspension(storeId, map.externalId, isOutOfStock, token, isSandbox);
          if (isOutOfStock) {
            itemsSuspendedCount++;
          } else {
            itemsActiveCount++;
          }
          await prisma.externalProductMap.update({
            where: { id: map.id },
            data: { lastSync: new Date(), syncStatus: isOutOfStock ? 'SUSPENDED_OUT_OF_STOCK' : 'SYNCED' }
          });
        } catch (syncErr: any) {
          console.warn(`[Uber Eats Sync] Could not update item ${map.externalId}:`, syncErr.message);
        }
      }
    }

    // 3. Optional order simulation test if requested in body
    let simulatedSale = null;
    if ((body as any)?.simulateTestOrder) {
      const branchName = integration.branch?.name || 'Sucursal';
      const simulatedPayload = {
        id: `UB-${Math.floor(Math.random() * 900000) + 100000}`,
        display_id: String(Math.floor(Math.random() * 9000) + 1000),
        store: {
          id: storeId,
          name: `Pizca de Azúcar - ${branchName}`
        },
        eater: {
          first_name: 'Cliente Prueba',
          last_name: 'Uber Eats',
          phone: '4421234567',
          delivery: {
            location: { formatted_address: `Entrega en ${branchName}, Querétaro` }
          }
        },
        cart: {
          items: [
            {
              id: 'ITEM-TEST-1',
              title: `Rebanada de Pastel Especial (${branchName})`,
              quantity: 2,
              price: { unit_price: { amount: 8500 } }
            }
          ]
        },
        payment: {
          charges: { total: { amount: 17000 } }
        }
      };

      simulatedSale = await processUberEatsOrder(simulatedPayload, targetBranchId, user.id);
    }

    return NextResponse.json({
      success: true,
      message: `Sincronización con Uber Eats completada para la sucursal ${integration.branch?.name || targetBranchId}.`,
      branchName: integration.branch?.name,
      stockSummary: {
        suspendedOutOfStock: itemsSuspendedCount,
        activeInStock: itemsActiveCount
      },
      simulatedSale
    });

  } catch (error: any) {
    console.error('[Uber Eats Sync] Error:', error);
    return NextResponse.json({ error: error.message || 'Error en sincronización' }, { status: 500 });
  }
}
