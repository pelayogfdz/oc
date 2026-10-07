import { getOrRefreshMeliToken } from './meliToken';

interface SendMeliPostSaleMessageParams {
  branchId: string;
  orderId: string | number;
  packId?: string | number | null;
  sellerId?: string | number | null;
  buyerId?: string | number | null;
  buyerNickname?: string | null;
  folio: string;
  saleId: string;
  host?: string | null;
}

/**
 * Envía un mensaje post-venta automático al comprador en Mercado Libre
 * incluyendo su número de folio de venta y el enlace directo de autofacturación en CAANMA.
 */
export async function sendMeliPostSaleMessage(params: SendMeliPostSaleMessageParams) {
  const { branchId, orderId, packId, sellerId, buyerId, buyerNickname, folio, saleId, host } = params;

  try {
    const token = await getOrRefreshMeliToken(branchId);
    if (!token) {
      console.warn(`[MELI POST-SALE MSG] No se pudo obtener token para la sucursal ${branchId}. No se envió mensaje.`);
      return { success: false, error: 'Token no disponible' };
    }

    // 1. Determinar ID del vendedor (si no fue provisto)
    let resolvedSellerId = sellerId;
    if (!resolvedSellerId) {
      try {
        const meRes = await fetch('https://api.mercadolibre.com/users/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (meRes.ok) {
          const meData = await meRes.json();
          resolvedSellerId = meData.id;
        }
      } catch (err) {
        console.error('[MELI POST-SALE MSG] Error obteniendo /users/me:', err);
      }
    }

    // 2. Construir la URL del portal de autofacturación
    const baseUrl = host
      ? (host.startsWith('http') ? host : `https://${host}`)
      : 'https://caanma.com';
    
    const billingUrl = `${baseUrl}/clientes/portal?ticketId=${saleId}&tab=b2c`;

    // 3. Redactar el mensaje
    const resolvedFolio = folio || (orderId ? `ML-${orderId}` : `VT-${saleId.slice(0, 8).toUpperCase()}`);
    const greeting = buyerNickname ? `¡Hola ${buyerNickname}!` : '¡Hola!';
    const messageText = 
`${greeting} Muchas gracias por tu compra.

Tu número de folio de venta es: ${resolvedFolio}

Si requieres factura fiscal (CFDI), puedes generarla en cualquier momento hasta el último día de este mes ingresando al siguiente enlace:
${billingUrl}

¡Quedamos a tus órdenes y que disfrutes tu producto!`;

    console.log(`[MELI POST-SALE MSG] Intentando enviar mensaje post-venta para orden ${orderId} (Folio: ${folio})...`);

    // 4. Intentar enviar mediante el endpoint oficial de mensajes post-venta de packs/órdenes
    const resolvedPackId = packId || orderId;
    let sentSuccess = false;
    let responseData: any = null;

    if (resolvedSellerId && resolvedPackId) {
      try {
        const packMsgUrl = `https://api.mercadolibre.com/messages/packs/${resolvedPackId}/sellers/${resolvedSellerId}?tag=post_sale`;
        const res = await fetch(packMsgUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            from: { user_id: Number(resolvedSellerId) },
            to: buyerId ? [{ user_id: Number(buyerId) }] : undefined,
            text: messageText
          })
        });

        responseData = await res.json().catch(() => ({}));
        if (res.ok && !responseData.error) {
          sentSuccess = true;
          console.log(`[MELI POST-SALE MSG] Mensaje post-venta enviado con éxito vía packs/${resolvedPackId} para orden ${orderId}.`);
        } else {
          console.warn(`[MELI POST-SALE MSG] Aviso en envío vía pack:`, responseData);
        }
      } catch (errPack) {
        console.warn(`[MELI POST-SALE MSG] Falló endpoint de packs, intentando fallback de órdenes:`, errPack);
      }
    }

    // 5. Fallback por si la orden no usa pack o falló el endpoint de packs
    if (!sentSuccess) {
      try {
        const orderMsgUrl = `https://api.mercadolibre.com/messages/action_guide/orders/${orderId}`;
        const resFallback = await fetch(orderMsgUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            text: messageText
          })
        });

        if (resFallback.ok) {
          sentSuccess = true;
          console.log(`[MELI POST-SALE MSG] Mensaje post-venta enviado con éxito vía fallback para orden ${orderId}.`);
        }
      } catch (errFallback) {
        console.warn(`[MELI POST-SALE MSG] Fallback también reportó error:`, errFallback);
      }
    }

    return {
      success: sentSuccess,
      messageText,
      billingUrl,
      data: responseData
    };

  } catch (error: any) {
    console.error('[MELI POST-SALE MSG] Error general al enviar mensaje post-venta:', error);
    return { success: false, error: error.message || String(error) };
  }
}
