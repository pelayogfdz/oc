import { NextResponse } from 'next/server';
import { prisma, getClientForTenant, masterClient } from '@/lib/prisma';
import { getOrRefreshMeliToken } from '@/app/utils/meliToken';
import { calculateMeliStatus, extractMeliStatus, getMeliStatusBadgeConfig } from '@/app/utils/meliStatus';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { sales, branchId } = body;

    if (!Array.isArray(sales) || sales.length === 0) {
      return NextResponse.json({ statuses: {} });
    }

    // Find integration for token
    let targetBranchId = branchId;
    if (!targetBranchId && sales[0]?.branchId) {
      targetBranchId = sales[0].branchId;
    }

    let integration = null;
    if (targetBranchId) {
      integration = await prisma.storeIntegration.findFirst({
        where: { branchId: targetBranchId, platform: 'MERCADO_LIBRE', isActive: true }
      });
    }

    if (!integration) {
      integration = await prisma.storeIntegration.findFirst({
        where: { platform: 'MERCADO_LIBRE', isActive: true }
      });
    }

    const token = integration ? await getOrRefreshMeliToken(integration.branchId) : null;

    // Cache of branch -> tenantClient
    const tenantClients: Record<string, any> = {};
    async function getTenantDb(bId: string) {
      if (tenantClients[bId]) return tenantClients[bId];
      const branchRecord = await masterClient.branch.findUnique({ where: { id: bId } });
      const tId = branchRecord?.tenantId;
      const client = tId ? getClientForTenant(tId) : prisma;
      tenantClients[bId] = client;
      return client;
    }

    const results: Record<string, any> = {};

    // Process sales in parallel
    await Promise.all(
      sales.map(async (saleItem: any) => {
        const saleId = saleItem.id;
        const notes = saleItem.notes || '';
        const saleStatus = saleItem.status;

        // If notes already has a final status, return it immediately
        const cached = extractMeliStatus(notes);
        if (cached && (cached === 'Entregada' || cached.includes('Cancelada') || cached === 'No entregada' || cached === 'Devuelta')) {
          results[saleId] = {
            meliStatus: cached,
            badge: getMeliStatusBadgeConfig(cached)
          };
          return;
        }

        const matchShip = notes.match(/shipments\/(\d+)/) || notes.match(/shipmentId[=:](\d+)/);
        const matchOrder = notes.match(/Mercado Libre Orden\s+(\d+)/) || notes.match(/\[Mercado Libre Orden:\s*(\d+)\]/);
        const shipmentId = matchShip ? matchShip[1] : null;
        const orderId = matchOrder ? matchOrder[1] : null;

        if (!shipmentId && !orderId) {
          if (cached) {
            results[saleId] = {
              meliStatus: cached,
              badge: getMeliStatusBadgeConfig(cached)
            };
          }
          return;
        }

        if (!token) {
          const fallback = cached || 'Mercado Libre';
          results[saleId] = {
            meliStatus: fallback,
            badge: getMeliStatusBadgeConfig(fallback)
          };
          return;
        }

        try {
          let shipData: any = null;
          let slaData: any = null;
          let orderData: any = null;

          const promises: Promise<any>[] = [];

          if (shipmentId) {
            promises.push(
              fetch(`https://api.mercadolibre.com/shipments/${shipmentId}`, {
                headers: { Authorization: `Bearer ${token}` }
              }).then(r => r.ok ? r.json() : null).catch(() => null)
            );
            promises.push(
              fetch(`https://api.mercadolibre.com/shipments/${shipmentId}/sla`, {
                headers: { Authorization: `Bearer ${token}` }
              }).then(r => r.ok ? r.json() : null).catch(() => null)
            );
          } else {
            promises.push(Promise.resolve(null));
            promises.push(Promise.resolve(null));
          }

          const [sData, slData] = await Promise.all(promises);
          shipData = sData;
          slaData = slData;

          // If cancelled, check order cancel_detail
          if (shipData?.status === 'cancelled' || saleStatus === 'CANCELLED' || notes.includes('CANCELACIÓN AUTOMÁTICA')) {
            if (orderId) {
              const ordRes = await fetch(`https://api.mercadolibre.com/orders/${orderId}`, {
                headers: { Authorization: `Bearer ${token}` }
              }).catch(() => null);
              if (ordRes && ordRes.ok) {
                orderData = await ordRes.json().catch(() => null);
              }
            }
          }

          const statusComputed = calculateMeliStatus({
            shipData,
            orderData,
            slaData,
            notes,
            saleStatus
          });

          results[saleId] = {
            meliStatus: statusComputed,
            badge: getMeliStatusBadgeConfig(statusComputed),
            shipmentId,
            orderId
          };

          // If the computed status changed or is final, update the sale notes in database
          if (statusComputed && statusComputed !== cached && saleItem.branchId) {
            try {
              const dbClient = await getTenantDb(saleItem.branchId);
              let newNotes = notes;
              if (newNotes.includes('[MELI_STATUS:')) {
                newNotes = newNotes.replace(/\[MELI_STATUS:[^\]]+\]/, `[MELI_STATUS: ${statusComputed}]`);
              } else {
                newNotes = `${newNotes.trim()} [MELI_STATUS: ${statusComputed}]`;
              }
              await dbClient.sale.update({
                where: { id: saleId },
                data: { notes: newNotes }
              }).catch(() => null);
            } catch (updErr) {
              // Non-blocking
            }
          }

        } catch (fetchErr) {
          const fallback = cached || 'Mercado Libre';
          results[saleId] = {
            meliStatus: fallback,
            badge: getMeliStatusBadgeConfig(fallback)
          };
        }
      })
    );

    return NextResponse.json({ statuses: results });

  } catch (error: any) {
    console.error('[MELI SHIPMENT STATUS API] Error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const saleId = searchParams.get('saleId');
    const shipmentId = searchParams.get('shipmentId');
    const orderId = searchParams.get('orderId');
    const branchId = searchParams.get('branchId');

    let integration = null;
    if (branchId) {
      integration = await prisma.storeIntegration.findFirst({
        where: { branchId, platform: 'MERCADO_LIBRE', isActive: true }
      });
    }
    if (!integration) {
      integration = await prisma.storeIntegration.findFirst({
        where: { platform: 'MERCADO_LIBRE', isActive: true }
      });
    }

    const token = integration ? await getOrRefreshMeliToken(integration.branchId) : null;
    if (!token) {
      return NextResponse.json({ meliStatus: 'Mercado Libre', badge: getMeliStatusBadgeConfig('Mercado Libre') });
    }

    let shipData: any = null;
    let slaData: any = null;
    let orderData: any = null;

    if (shipmentId) {
      const [sRes, slaRes] = await Promise.all([
        fetch(`https://api.mercadolibre.com/shipments/${shipmentId}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`https://api.mercadolibre.com/shipments/${shipmentId}/sla`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => null)
      ]);

      if (sRes.ok) shipData = await sRes.json();
      if (slaRes && slaRes.ok) slaData = await slaRes.json();
    }

    if (orderId && (shipData?.status === 'cancelled' || !shipmentId)) {
      const ordRes = await fetch(`https://api.mercadolibre.com/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => null);
      if (ordRes && ordRes.ok) orderData = await ordRes.json();
    }

    const statusComputed = calculateMeliStatus({
      shipData,
      orderData,
      slaData
    });

    return NextResponse.json({
      meliStatus: statusComputed,
      badge: getMeliStatusBadgeConfig(statusComputed),
      shipmentId,
      orderId
    });

  } catch (error: any) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
