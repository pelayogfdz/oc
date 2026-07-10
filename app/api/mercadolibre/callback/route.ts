import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
    const redirectUri = `${url.origin}/api/mercadolibre/callback`;

    const response = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: integration.appId,
        client_secret: integration.clientSecret,
        code,
        redirect_uri: redirectUri
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
    const redirectUrl = new URL('/integraciones/mercadolibre', url.origin);
    redirectUrl.searchParams.set('success', 'connected');
    return NextResponse.redirect(redirectUrl);

  } catch (error: any) {
    console.error('Error en callback de Mercado Libre:', error);
    return new NextResponse(`Error interno del servidor: ${error.message || String(error)}`, { status: 500 });
  }
}
