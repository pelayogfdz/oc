import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  // 1. Verify Authorization
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Fetch System Settings
  const settings = await prisma.systemSettings.findFirst();
  if (!settings || !settings.mpAccessToken) {
    return NextResponse.json({ error: 'System MP credentials not configured' }, { status: 500 });
  }

  // 3. Fetch all active tenants
  const tenants = await prisma.tenant.findMany({
    where: { isActive: true },
    include: {
      _count: {
        select: { users: true }
      }
    }
  });

  const results = [];

  for (const tenant of tenants) {
    try {
      const basePrice = tenant.customBasePrice !== null ? tenant.customBasePrice : settings.basePrice;
      const userPrice = tenant.customUserPrice !== null ? tenant.customUserPrice : settings.userPrice;
      
      const totalAmount = basePrice + (tenant._count.users * userPrice);

      if (totalAmount <= 0) {
        results.push({ tenant: tenant.name, status: 'SKIPPED_ZERO_AMOUNT' });
        continue;
      }

      // Check gift credits
      let chargeAmount = totalAmount;
      let newGiftCredits = tenant.giftCredits;

      if (tenant.giftCredits > 0) {
        if (tenant.giftCredits >= totalAmount) {
          // Fully covered by credits
          newGiftCredits -= totalAmount;
          chargeAmount = 0;
        } else {
          // Partially covered
          chargeAmount -= tenant.giftCredits;
          newGiftCredits = 0;
        }
      }

      // If fully covered by credits, no need to hit MP API
      if (chargeAmount === 0) {
        await prisma.tenant.update({
          where: { id: tenant.id },
          data: {
            giftCredits: newGiftCredits,
            subscriptionStatus: 'ACTIVE'
          }
        });
        results.push({ tenant: tenant.name, status: 'PAID_WITH_CREDITS' });
        continue;
      }

      // Need to charge card
      if (!tenant.mpCustomerId || !tenant.mpCardId) {
        // No card on file
        await prisma.tenant.update({
          where: { id: tenant.id },
          data: { subscriptionStatus: 'PAST_DUE' }
        });
        results.push({ tenant: tenant.name, status: 'FAILED_NO_CARD' });
        continue;
      }

      // Mercado Pago API Call
      // Note: This is a standard structure for charging a vaulted customer card in MP
      // Depending on the account's recurrent billing setup, CVV might not be required.
      const paymentResponse = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${settings.mpAccessToken}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': `${tenant.id}-${new Date().toISOString().substring(0, 7)}` // unique per month
        },
        body: JSON.stringify({
          transaction_amount: Number(chargeAmount.toFixed(2)),
          description: `Suscripción Mensual CAANMA PRO - ${tenant._count.users} Usuarios`,
          payment_method_id: 'master', // Or dynamically fetched
          payer: {
            type: 'customer',
            id: tenant.mpCustomerId
          },
          // Important: to charge a card without CVV, you usually pass the token or just payer info if account is allowed.
          // Since we don't have CVV here, this simulates the charge assuming recurrent permissions.
        })
      });

      const paymentData = await paymentResponse.json();

      if (paymentResponse.ok && (paymentData.status === 'approved' || paymentData.status === 'authorized')) {
        // Payment successful
        await prisma.tenant.update({
          where: { id: tenant.id },
          data: {
            giftCredits: newGiftCredits, // Deduct used credits
            subscriptionStatus: 'ACTIVE'
          }
        });
        results.push({ tenant: tenant.name, status: 'PAID_CC', mpPaymentId: paymentData.id });
      } else {
        // Payment failed
        console.error(`MP Error for ${tenant.name}:`, paymentData);
        await prisma.tenant.update({
          where: { id: tenant.id },
          data: { subscriptionStatus: 'PAST_DUE' }
        });
        results.push({ tenant: tenant.name, status: 'FAILED_MP_DECLINED', reason: paymentData.message || paymentData.status });
      }

    } catch (e: any) {
      console.error(`Error processing tenant ${tenant.name}:`, e);
      results.push({ tenant: tenant.name, status: 'ERROR', error: e.message });
    }
  }

  return NextResponse.json({ success: true, processed: results.length, results });
}
