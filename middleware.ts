import { NextRequest, NextResponse } from 'next/server';
import { decrypt } from '@/lib/session-crypto';

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const cleanPath = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;

  // Si estamos en /login, permitimos el acceso libremente
  if (cleanPath === '/login') {
    const errorParam = req.nextUrl.searchParams.get('error');
    const openParam = req.nextUrl.searchParams.get('open');
    
    if (errorParam || openParam) {
      const response = NextResponse.next();
      response.cookies.delete('session');
      return response;
    }
    return NextResponse.next();
  }

  const publicRoutes = ['/api/auth', '/api/cron', '/api/mercadolibre/webhooks', '/api/ping', '/_next', '/clientes/portal', '/sw.js', '/api/facturacion/download', '/limpiar-cache'];
  const isPublicRoute = publicRoutes.some(route => cleanPath === route || cleanPath.startsWith(`${route}/`))
    || (cleanPath.startsWith('/ventas/detalle/') && (
        cleanPath.endsWith('/imprimir') || 
        cleanPath.endsWith('/imprimir-cotizacion') || 
        cleanPath.endsWith('/imprimir-ticket')
    ));
  
  if (isPublicRoute) {
    return NextResponse.next();
  }

  const sessionCookie = req.cookies.get('session')?.value;
  const session = await decrypt(sessionCookie);

  if (!session || !session.userId) {
    return NextResponse.redirect(new URL('/login', req.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|manifest.json|sw.js|.*\\..*).*)'],
};
