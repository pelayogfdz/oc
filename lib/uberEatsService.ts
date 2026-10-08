import crypto from 'crypto';
import { prisma, masterClient, getClientForTenant } from '@/lib/prisma';

export interface UberEatsConfig {
  appId: string;
  clientSecret: string;
  storeId?: string;
  isSandbox?: boolean;
}

export interface UberEatsTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

// In-memory token cache to avoid requesting a token on every call (tokens last up to 30 days)
const tokenCache = new Map<string, { token: string; expiresAt: number }>();

/**
 * Get base URL for Uber API requests depending on sandbox or production
 */
export function getUberApiBaseUrl(isSandbox = false): string {
  return isSandbox ? 'https://test-api.uber.com' : 'https://api.uber.com';
}

/**
 * Get base URL for Uber OAuth requests
 */
export function getUberAuthBaseUrl(isSandbox = false): string {
  return isSandbox ? 'https://sandbox-auth.uber.com' : 'https://auth.uber.com';
}

/**
 * Obtain an OAuth 2.0 access token via client_credentials
 */
export async function getUberEatsAccessToken(
  appId: string,
  clientSecret: string,
  isSandbox = false
): Promise<string> {
  const cacheKey = `${appId}:${isSandbox ? 'sandbox' : 'prod'}`;
  const cached = tokenCache.get(cacheKey);

  // Return cached token if valid with at least 5 minutes margin
  if (cached && cached.expiresAt > Date.now() + 5 * 60 * 1000) {
    return cached.token;
  }

  const authUrl = `${getUberAuthBaseUrl(isSandbox)}/oauth/v2/token`;
  const params = new URLSearchParams();
  params.append('client_id', appId.trim());
  params.append('client_secret', clientSecret.trim());
  params.append('grant_type', 'client_credentials');
  params.append('scope', 'eats.store eats.order');

  const res = await fetch(authUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Error al autenticar con Uber Eats (${res.status}): ${errorText}`);
  }

  const data: UberEatsTokenResponse = await res.json();
  const token = data.access_token;
  const expiresAt = Date.now() + (data.expires_in || 2592000) * 1000;

  tokenCache.set(cacheKey, { token, expiresAt });
  return token;
}

/**
 * Verify HMAC-SHA256 signature from X-Uber-Signature header
 */
export function verifyUberSignature(
  rawBody: string,
  signatureHeader: string | null,
  clientSecret: string
): boolean {
  if (!signatureHeader || !clientSecret) return false;

  try {
    const hmac = crypto.createHmac('sha256', clientSecret.trim());
    hmac.update(rawBody);
    const expectedSignature = hmac.digest('hex');

    // Remove any prefixes like 'sha256=' if present
    const cleanedSignature = signatureHeader.replace(/^sha256=/i, '').trim();

    if (expectedSignature.length !== cleanedSignature.length) {
      return false;
    }

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'utf8'),
      Buffer.from(cleanedSignature, 'utf8')
    );
  } catch (err) {
    console.error('[Uber Eats] Error validating signature:', err);
    return false;
  }
}

/**
 * Fetch detailed store information
 */
export async function getUberStoreDetails(
  storeId: string,
  accessToken: string,
  isSandbox = false
) {
  const url = `${getUberApiBaseUrl(isSandbox)}/v1/eats/stores/${storeId}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Error obteniendo tienda Uber Eats (${res.status}): ${errText}`);
  }

  return await res.json();
}

/**
 * Fetch the complete store menu
 */
export async function getUberStoreMenu(
  storeId: string,
  accessToken: string,
  isSandbox = false
) {
  const url = `${getUberApiBaseUrl(isSandbox)}/v2/eats/stores/${storeId}/menus`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Error obteniendo menú Uber Eats (${res.status}): ${errText}`);
  }

  return await res.json();
}

/**
 * Update availability of a specific item on Uber Eats (suspend when out of stock)
 */
export async function updateUberItemSuspension(
  storeId: string,
  itemId: string,
  suspended: boolean,
  accessToken: string,
  isSandbox = false
) {
  const url = `${getUberApiBaseUrl(isSandbox)}/v1/eats/stores/${storeId}/menus/items/${itemId}`;
  
  const payload = {
    suspension_info: suspended ? { suspension: { suspend_until: 0 } } : { suspension: null }
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Error actualizando disponibilidad en Uber Eats (${res.status}): ${errText}`);
  }

  return await res.json().catch(() => ({ success: true }));
}

/**
 * Fetch active order details by order_id
 */
export async function getUberOrderDetails(
  orderId: string,
  accessToken: string,
  isSandbox = false
) {
  const url = `${getUberApiBaseUrl(isSandbox)}/v1/eats/orders/${orderId}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Error consultando pedido Uber Eats ${orderId} (${res.status}): ${errText}`);
  }

  return await res.json();
}

/**
 * Formally accept a POS order in Uber Eats (must be called within 11.5 minutes)
 */
export async function acceptUberPosOrder(
  orderId: string,
  accessToken: string,
  options: { reason?: string; externalReferenceId?: string } = {},
  isSandbox = false
) {
  const url = `${getUberApiBaseUrl(isSandbox)}/v1/eats/orders/${orderId}/accept_pos_order`;
  const payload = {
    reason: options.reason || 'Pedido aceptado automáticamente por Caanma POS',
    external_reference_id: options.externalReferenceId || ''
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errText = await res.text();
    console.warn(`[Uber Eats] Warning accepting order ${orderId} (${res.status}): ${errText}`);
    return { success: false, error: errText };
  }

  return { success: true };
}

/**
 * Deny a POS order in Uber Eats if items are completely unavailable
 */
export async function denyUberPosOrder(
  orderId: string,
  accessToken: string,
  options: { reason?: string; explanation?: string; outOfStockItemIds?: string[] } = {},
  isSandbox = false
) {
  const url = `${getUberApiBaseUrl(isSandbox)}/v1/eats/orders/${orderId}/deny_pos_order`;
  const payload = {
    reason: {
      explanation: options.explanation || 'Artículos agotados o fuera de servicio',
      code: 'ITEM_AVAILABILITY',
      out_of_stock_items: options.outOfStockItemIds || []
    }
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errText = await res.text();
    console.warn(`[Uber Eats] Warning denying order ${orderId} (${res.status}): ${errText}`);
    return { success: false, error: errText };
  }

  return { success: true };
}

/**
 * Process and record an inbound Uber Eats order in the CAANMA database
 */
export async function processUberEatsOrder(
  order: any,
  branchId: string,
  userId?: string,
  targetTenantId?: string
) {
  const orderId = order.id || order.order_id || String(order.display_id || Date.now());

  // Uber Eats orders are strictly and exclusively processed for Pizca de Azúcar
  const tenantId = '0d246cea-0220-4328-92b0-8a1387ce6a6d';
  const db: any = getClientForTenant(tenantId);

  // 1. Deduplication check: verify if order was already recorded
  const existingSale = await db.sale.findFirst({
    where: {
      branchId,
      notes: { contains: orderId }
    }
  });

  if (existingSale) {
    console.log(`[Uber Eats] Pedido ${orderId} ya había sido procesado previamente (Venta ID: ${existingSale.id}).`);
    return existingSale;
  }

  // 2. Resolve or create seller user "UBER EATS" for this sale
  let uberUser = await db.user.findFirst({
    where: {
      name: 'UBER EATS'
    }
  });

  if (!uberUser) {
    const emailCandidate = `ubereats_${tenantId ? tenantId.substring(0, 8) : 'pos'}@caanma.com`;
    const existingByEmail = await db.user.findUnique({ where: { email: emailCandidate } }).catch(() => null);
    if (existingByEmail) {
      uberUser = existingByEmail;
      if (uberUser.name !== 'UBER EATS') {
        uberUser = await db.user.update({
          where: { id: uberUser.id },
          data: { name: 'UBER EATS' }
        }).catch(() => existingByEmail);
      }
    } else {
      try {
        uberUser = await db.user.create({
          data: {
            name: 'UBER EATS',
            email: emailCandidate,
            password: '$2b$10$dummyhashplaceholderforubereatswhichcannotlogin12345',
            role: 'USER',
            branchId,
            ...(tenantId ? { tenantId } : {})
          }
        });
      } catch (e) {
        console.warn('[Uber Eats] Could not create UBER EATS user:', e);
        uberUser = await db.user.findFirst({ where: { name: 'UBER EATS' } }).catch(() => null);
      }
    }
  }

  let responsibleUserId = uberUser?.id;

  if (!responsibleUserId && userId) {
    const userExists = await db.user.findUnique({ where: { id: userId } }).catch(() => null);
    if (userExists) responsibleUserId = userExists.id;
  }

  if (!responsibleUserId) {
    const branchUser = await db.user.findFirst({
      where: { branchId }
    });
    responsibleUserId = branchUser?.id;
  }

  if (!responsibleUserId) {
    const anyUser = await db.user.findFirst();
    responsibleUserId = anyUser?.id;
  }

  if (!responsibleUserId) {
    throw new Error(`No se encontró un usuario válido en la base de datos para la sucursal ${branchId}`);
  }

  // 3. Resolve or create customer for Uber Eats
  const clientName = order.eater?.first_name 
    ? `${order.eater.first_name} ${order.eater.last_name || ''}`.trim()
    : 'Cliente Uber Eats';
  const clientPhone = order.eater?.phone || '0000000000';

  let customer = await db.customer.findFirst({
    where: {
      branchId,
      name: clientName
    }
  });

  if (!customer) {
    customer = await db.customer.create({
      data: {
        name: clientName,
        phone: clientPhone,
        email: 'ubereats@caanma.com',
        branchId
      }
    });
  }

  // 4. Map items to local products
  const cartItems = order.cart?.items || order.items || [];
  const saleItemsToCreate = [];
  let totalOrderAmount = 0;

  for (const item of cartItems) {
    const externalId = item.id || item.external_data || item.title;
    const itemQuantity = Number(item.quantity) || 1;
    const itemPrice = (Number(item.price?.unit_price?.amount) ? Number(item.price.unit_price.amount) / 100 : Number(item.price) || 0);

    // Look for product map by externalId first
    let localProduct = null;
    const map = await db.externalProductMap.findFirst({
      where: {
        platform: 'UBER_EATS',
        externalId: String(externalId),
        product: { branchId }
      },
      include: { product: true }
    });

    if (map && map.product) {
      localProduct = map.product;
    }

    // Fallback: match by local SKU
    if (!localProduct && item.external_data) {
      localProduct = await db.product.findFirst({
        where: { sku: item.external_data, branchId }
      });
    }

    // Fallback: match by product title / name
    if (!localProduct && item.title) {
      localProduct = await db.product.findFirst({
        where: { name: { equals: item.title, mode: 'insensitive' }, branchId }
      });
    }

    // Fallback: if not found, use first product
    if (!localProduct) {
      localProduct = await db.product.findFirst({
        where: { branchId }
      });
    }

    if (localProduct) {
      const priceToUse = itemPrice > 0 ? itemPrice : localProduct.price;
      saleItemsToCreate.push({
        productId: localProduct.id,
        quantity: itemQuantity,
        price: priceToUse
      });

      totalOrderAmount += priceToUse * itemQuantity;

      // Decrement stock
      await db.product.update({
        where: { id: localProduct.id },
        data: { stock: { decrement: itemQuantity } }
      });

      // Create inventory movement
      await db.inventoryMovement.create({
        data: {
          productId: localProduct.id,
          type: 'OUT',
          quantity: -itemQuantity,
          reason: `Venta Uber Eats - Pedido #${orderId}`,
          userId: responsibleUserId
        }
      });
    }
  }

  // 5. Total calculation fallback
  const calculatedTotal = order.payment?.charges?.total?.amount 
    ? Number(order.payment.charges.total.amount) / 100 
    : (totalOrderAmount || Number(order.total) || 0);

  const cleanFolio = `UB-${order.display_id || String(orderId).substring(0, 8).toUpperCase()}`;

  // 6. Create the Sale in CAANMA
  const newSale = await db.sale.create({
    data: {
      folio: cleanFolio,
      total: calculatedTotal,
      status: 'COMPLETED',
      paymentMethod: 'UBER_EATS',
      customerId: customer.id,
      branchId,
      userId: responsibleUserId,
      notes: `Pedido Uber Eats importado en tiempo real. ID: ${orderId}. Entrega: ${order.eater?.delivery?.location?.formatted_address || 'A domicilio'}`,
      items: {
        create: saleItemsToCreate
      }
    }
  });

  console.log(`[Uber Eats] Venta registrada con éxito: Folio ${cleanFolio}, Total $${calculatedTotal} (Venta ID: ${newSale.id})`);
  return newSale;
}
