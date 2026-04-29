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
    basePrice: settings?.basePrice || 0,
    userPrice: settings?.userPrice || 0,
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
    const paymentMethodIdStr = cardData.payment_method?.id || 'master';

    // 3. Validación de la tarjeta con Pre-autorización de $0.1
    // Se crea un cobro retenido (capture: false) y luego se cancela
    const authBody = {
      transaction_amount: 0.1,
      description: 'Validación de Tarjeta CAANMA PRO',
      capture: false, // Pre-authorization
      payment_method_id: paymentMethodIdStr,
      payer: {
        type: 'customer',
        id: customerId
      }
    };

    const authRes = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(authBody)
    });

    const authData = await authRes.json();
    
    if (!authRes.ok || (authData.status !== 'authorized' && authData.status !== 'in_process' && authData.status !== 'approved')) {
      throw new Error(authData.message || authData.status_detail || 'La tarjeta fue rechazada por el banco emisor al intentar validarla.');
    }

    // Cancelar la pre-autorización para liberar los fondos de inmediato
    if (authData.id) {
      await fetch(`https://api.mercadopago.com/v1/payments/${authData.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'cancelled' })
      }).catch(e => console.error('Error cancelando pre-auth:', e));
    }

    // Update Tenant to active and save the card ID
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        mpCardId: savedCardId,
        // No cambiamos subscriptionStatus a ACTIVE automáticamente aquí, 
        // a menos que queramos que con solo guardar la tarjeta se reactive.
        // Lo dejamos para que el usuario pague manualmente la primera vez si está suspendido.
      }
    });

    return { success: true };
  } catch (error: any) {
    console.error('saveMercadoPagoCard Error:', error);
    throw new Error(error.message || 'Error de conexión con Mercado Pago');
  }
}

export async function processManualPayment(amount: number) {
  const { user, tenant } = await requireTenantAdmin();

  if (!tenant.mpCustomerId || !tenant.mpCardId) {
    throw new Error('No hay una tarjeta guardada para esta organización. Por favor, guarda una tarjeta primero.');
  }

  const settings = await prisma.systemSettings.findFirst();
  if (!settings || !settings.mpAccessToken) {
    throw new Error('Sistema de pagos no configurado.');
  }

  try {
    const paymentBody = {
      transaction_amount: amount,
      description: `Suscripción Mensual CAANMA PRO - ${tenant.name}`,
      payment_method_id: 'master', // MP uses the saved card automatically if we pass payer.id
      payer: {
        type: 'customer',
        id: tenant.mpCustomerId
      }
    };

    const paymentRes = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${settings.mpAccessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(paymentBody)
    });

    const paymentData = await paymentRes.json();
    
    // MP returns 201 for created payments
    if (!paymentRes.ok || (paymentData.status !== 'approved' && paymentData.status !== 'in_process')) {
      throw new Error(paymentData.message || paymentData.status_detail || 'No se pudo procesar el pago con la tarjeta guardada.');
    }

    // Actualizar el tenant a activo
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        subscriptionStatus: 'ACTIVE',
      }
    });

    return { success: true, status: paymentData.status };
  } catch (error: any) {
    console.error('processManualPayment Error:', error);
    throw new Error(error.message || 'Error al procesar el pago.');
  }
}
