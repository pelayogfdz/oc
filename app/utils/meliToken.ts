import { prisma, masterClient, getClientForTenant } from '@/lib/prisma';

export async function getOrRefreshMeliToken(branchId: string): Promise<string | null> {
  // Resolve correct tenant client dynamically based on branchId
  let dbClient = prisma;
  try {
    const branchRecord = await masterClient.branch.findUnique({
      where: { id: branchId }
    });
    if (branchRecord?.tenantId) {
      dbClient = getClientForTenant(branchRecord.tenantId);
    }
  } catch (e) {
    console.error('[MELI TOKEN HELPER] Error resolving tenant client:', e);
  }

  const integration = await dbClient.storeIntegration.findUnique({
    where: { branchId_platform: { branchId, platform: 'MERCADO_LIBRE' } }
  });

  if (!integration || !integration.accessToken) {
    return null;
  }

  // Parsear expiración desde metadatos
  let expiresAt: Date | null = null;
  if (integration.metadata) {
    try {
      const meta = JSON.parse(integration.metadata);
      if (meta.expiresAt) expiresAt = new Date(meta.expiresAt);
    } catch (e) {
      console.error('[MELI TOKEN HELPER] Error al parsear metadata de integración:', e);
    }
  }

  const tenMinutesFromNow = new Date(Date.now() + 10 * 60 * 1000);

  // Si el token aún es válido, devolverlo de inmediato
  if (expiresAt && expiresAt > tenMinutesFromNow) {
    return integration.accessToken;
  }

  // Si está por expirar o no tiene fecha registrada, intentar refrescar
  if (!integration.refreshToken || !integration.appId || !integration.clientSecret) {
    console.warn('[MELI TOKEN HELPER] Se requiere refresco de token pero faltan credenciales o refresh_token.');
    // Devolvemos el accessToken de todos modos como fallback de último recurso
    return integration.accessToken;
  }

  console.log(`[MELI TOKEN HELPER] Refrescando token expirado para la sucursal ${branchId}...`);
  try {
    const response = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: integration.appId,
        client_secret: integration.clientSecret,
        refresh_token: integration.refreshToken
      })
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      console.error('[MELI TOKEN HELPER] Error en respuesta de refresco de Mercado Libre:', data);
      // Fallback al token actual si la API falla de forma momentánea
      return integration.accessToken;
    }

    // Calcular nueva fecha de expiración
    const newExpiresAt = new Date(Date.now() + (data.expires_in * 1000));
    let parsedMeta: Record<string, any> = {};
    if (integration.metadata) {
      try { parsedMeta = JSON.parse(integration.metadata); } catch {}
    }
    parsedMeta.expiresAt = newExpiresAt.toISOString();
    if (data.user_id) parsedMeta.userId = data.user_id;

    await dbClient.storeIntegration.update({
      where: { id: integration.id },
      data: {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        metadata: JSON.stringify(parsedMeta)
      }
    });

    console.log(`[MELI TOKEN HELPER] Token refrescado exitosamente. Nueva expiración: ${newExpiresAt.toISOString()}`);
    return data.access_token;

  } catch (error) {
    console.error('[MELI TOKEN HELPER] Excepción durante el refresco de token:', error);
    return integration.accessToken;
  }
}
