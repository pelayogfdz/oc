'use server';

import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { decrypt } from '@/lib/session';

/**
 * Validates session and gets tenant
 */
async function requireTenantAdmin() {
  const sessionCookie = (await cookies()).get('session')?.value;
  const session = await decrypt(sessionCookie);

  if (!session?.userId) {
    throw new Error('No autorizado');
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId as string },
    include: { tenant: true }
  });

  if (!user || !user.tenantId) {
    throw new Error('No estás asignado a ninguna organización');
  }

  if (user.role !== 'SYSADMIN' && user.role !== 'ADMIN') {
    throw new Error('No tienes permisos de administrador en esta organización');
  }

  return { user, tenant: user.tenant! };
}

export async function getSubscriptionData() {
  const { tenant } = await requireTenantAdmin();

  const userCount = await prisma.user.count({
    where: { tenantId: tenant.id }
  });

  // Fetch Public Key to render MP Brick safely on client
  const settings = await prisma.systemSettings.findFirst();

  return {
    tenant,
    userCount,
    mpPublicKey: settings?.mpPublicKey || null,
  };
}

export async function saveMercadoPagoCard(cardTokenId: string, paymentMethodId?: string) {
  const { user, tenant } = await requireTenantAdmin();

  const settings = await prisma.systemSettings.findFirst();
  if (!settings || !settings.mpAccessToken) {
    throw new Error('El sistema de pagos no está configurado por el Super Admin');
  }

  const MP_ACCESS_TOKEN = settings.mpAccessToken;

  try {
    let customerId = tenant.mpCustomerId;

    // 1. Create MP Customer if it doesn't exist
    if (!customerId) {
      const customerBody = {
        email: user.email,
        description: `Customer for Tenant: ${tenant.name}`
      };

      const customerRes = await fetch('https://api.mercadopago.com/v1/customers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(customerBody)
      });

      const customerData = await customerRes.json();
      if (!customerRes.ok) {
        throw new Error(customerData.message || 'Error al crear cliente en MP');
      }

      customerId = customerData.id;
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: { mpCustomerId: customerId }
      });
    }

    // 2. Attach Card Token to the Customer
    const cardBody = {
      token: cardTokenId
    };

    const cardRes = await fetch(`https://api.mercadopago.com/v1/customers/${customerId}/cards`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(cardBody)
    });

    const cardData = await cardRes.json();
    if (!cardRes.ok) {
      throw new Error(cardData.message || 'Error al guardar la tarjeta en MP');
    }

    const savedCardId = cardData.id;

    // 3. Update Tenant to active and save the card ID
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        mpCardId: savedCardId,
        subscriptionStatus: 'ACTIVE'
      }
    });

    return { success: true };
  } catch (error: any) {
    console.error('saveMercadoPagoCard Error:', error);
    throw new Error(error.message || 'Error de conexión con Mercado Pago');
  }
}
