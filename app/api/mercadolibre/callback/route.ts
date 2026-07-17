import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const branchId = searchParams.get('state');

    if (!code || !branchId) {
      return new NextResponse('Código de autorización o sucursal (state) faltantes en la petición.', { status: 400 });
    }

    // Buscar la configuración de la integración para esta sucursal
    const integration = await prisma.storeIntegration.findUnique({
      where: { branchId_platform: { branchId, platform: 'MERCADO_LIBRE' } }
    });

    if (!integration || !integration.appId || !integration.clientSecret) {
      return new NextResponse('Configuración previa de App ID y Client Secret no encontrada para esta sucursal.', { status: 400 });
    }

    // Intercambiar código por token
    const url = new URL(req.url);
    
    let customRedirectUri = '';
    if (integration.metadata) {
      try {
        const meta = JSON.parse(integration.metadata);
        if (meta.customRedirectUri) customRedirectUri = meta.customRedirectUri;
      } catch {}
    }

    let redirectUri = customRedirectUri;
    if (!redirectUri) {
      const host = req.headers.get('host') || url.host;
      const protocol = host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https';
      const baseHost = host.startsWith('localhost') || host.startsWith('127.0.0.1') ? host : 'caanma.com';
      redirectUri = `${protocol}://${baseHost}/api/mercadolibre/callback`;
    }

    const verifier = crypto.createHash('sha256').update((integration.clientSecret || '') + branchId).digest('hex');

    const response = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: integration.appId || '',
        client_secret: integration.clientSecret || '',
        code,
        redirect_uri: redirectUri,
        code_verifier: verifier
      })
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      console.error('Error al intercambiar token con Mercado Libre:', data);
      return new NextResponse(`Error de Mercado Libre: ${data.message || data.error}`, { status: 400 });
    }

    // Guardar tokens y tiempo de expiración
    const expiresAt = new Date(Date.now() + (data.expires_in * 1000));
    const metadata = JSON.stringify({
      userId: data.user_id,
      expiresAt: expiresAt.toISOString(),
      scope: data.scope
    });

    await prisma.storeIntegration.update({
      where: { id: integration.id },
      data: {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        isActive: true,
        metadata
      }
    });

    // Redirigir de vuelta a la página de configuración con indicador de éxito
    let baseHost = 'caanma.com';
    let protocol = 'https';
    
    const hostHeader = req.headers.get('host') || '';
    const forwardedHost = req.headers.get('x-forwarded-host') || '';
    
    if (hostHeader.includes('localhost') || hostHeader.includes('127.0.0.1') || forwardedHost.includes('localhost') || forwardedHost.includes('127.0.0.1')) {
      baseHost = hostHeader || forwardedHost || 'localhost:3000';
      protocol = 'http';
    }
    
    const redirectUrl = new URL('/integraciones/mercadolibre', `${protocol}://${baseHost}`);
    redirectUrl.searchParams.set('success', 'connected');
    return NextResponse.redirect(redirectUrl);

  } catch (error: any) {
    console.error('Error en callback de Mercado Libre:', error);
    return new NextResponse(`Error interno del servidor: ${error.message || String(error)}`, { status: 500 });
  }
}
