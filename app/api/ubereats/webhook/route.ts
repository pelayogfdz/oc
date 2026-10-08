import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  verifyUberSignature,
  getUberEatsAccessToken,
  getUberOrderDetails,
  acceptUberPosOrder,
  processUberEatsOrder
} from '@/lib/uberEatsService';

/**
 * Health check endpoint for Uber Eats Webhook verification
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'CAANMA Uber Eats Webhook Receiver',
    timestamp: new Date().toISOString()
  });
}

/**
 * Webhook receiver for real-time Uber Eats events (e.g. orders.notification)
 */
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-uber-signature');

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch (parseErr) {
      console.warn('[Uber Eats Webhook] Invalid JSON payload received');
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const eventType = payload.event_type;
    console.log(`[Uber Eats Webhook] Received event: ${eventType}`, JSON.stringify(payload));

    // Handle orders.notification event
    if (eventType === 'orders.notification') {
      const orderId = payload.meta?.resource_id;
      const incomingStoreId = payload.meta?.user_id;

      if (!orderId) {
        console.warn('[Uber Eats Webhook] orders.notification missing resource_id (orderId)');
        return NextResponse.json({ status: 'ignored_no_order_id' }, { status: 200 });
      }

      // Lookup matching StoreIntegration exclusively in Pizca de Azúcar database
      let integration: any = null;
      let targetTenantId: string = '0d246cea-0220-4328-92b0-8a1387ce6a6d';
      const { getClientForTenant } = await import('@/lib/prisma');

      const tenantIdsToSearch = [
        '0d246cea-0220-4328-92b0-8a1387ce6a6d' // Pizca de Azúcar (Exclusivo)
      ];

      for (const tid of tenantIdsToSearch) {
        try {
          const tClient = getClientForTenant(tid);
          const candidateIntegrations = await tClient.storeIntegration.findMany({
            where: { platform: 'UBER_EATS', isActive: true },
            include: { branch: true }
          });

          if (incomingStoreId) {
            const match = candidateIntegrations.find(it => {
              if (!it.metadata) return false;
              try {
                const meta = JSON.parse(it.metadata);
                return meta.storeId === incomingStoreId || it.accessToken === incomingStoreId;
              } catch (e) {
                return false;
              }
            });
            if (match) {
              integration = match;
              targetTenantId = tid;
              break;
            }
          } else if (candidateIntegrations.length > 0 && !integration) {
            integration = candidateIntegrations[0];
            targetTenantId = tid;
            break;
          }
        } catch (dbErr) {
          console.warn(`[Uber Eats Webhook] Error checking tenant ${tid}:`, dbErr);
        }
      }

      if (!integration || !integration.appId || !integration.clientSecret) {
        console.warn('[Uber Eats Webhook] No active Uber Eats integration with credentials found in database.');
        // Return 200 so Uber doesn't mark the webhook as failed
        return NextResponse.json({ status: 'unconfigured_integration' }, { status: 200 });
      }

      // Verify HMAC-SHA256 signature if clientSecret is available
      if (signature && integration.clientSecret) {
        const isValid = verifyUberSignature(rawBody, signature, integration.clientSecret);
        if (!isValid) {
          console.warn('[Uber Eats Webhook] Invalid signature verification. Rejecting request.');
          return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
        }
      }

      const meta = integration.metadata ? JSON.parse(integration.metadata) : {};
      const isSandbox = Boolean(meta.isSandbox);

      // Execute order retrieval and acceptance in background
      (async () => {
        try {
          console.log(`[Uber Eats Webhook] Processing order ${orderId} for branch ${integration.branchId} (Tenant: ${targetTenantId})...`);
          const token = await getUberEatsAccessToken(integration.appId!, integration.clientSecret!, isSandbox);

          // 1. Fetch detailed order contents
          const orderDetails = await getUberOrderDetails(orderId, token, isSandbox);

          // 2. Automatically accept order in Uber Eats to stop the 11.5 minute cancellation countdown
          await acceptUberPosOrder(orderId, token, {
            reason: 'Pedido recibido y aceptado automáticamente por Caanma POS',
            externalReferenceId: orderId
          }, isSandbox);

          // 3. Process the order: decrement stock, record inventory movement, create Sale in tenant database
          await processUberEatsOrder(orderDetails, integration.branchId, undefined, targetTenantId);

        } catch (err: any) {
          console.error(`[Uber Eats Webhook] Error asynchronously processing order ${orderId}:`, err.message || err);
        }
      })();
    }

    // Always immediately respond with HTTP 200 to satisfy Uber SLA
    return NextResponse.json({ status: 'acknowledged' }, { status: 200 });

  } catch (error: any) {
    console.error('[Uber Eats Webhook] Handler error:', error);
    return NextResponse.json({ error: 'Webhook processing error' }, { status: 500 });
  }
}
