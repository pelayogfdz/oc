import { NextRequest, NextResponse } from 'next/server';
import { decrypt } from '@/lib/session-crypto';

export async function middleware(req: NextRequest) {
  const publicRoutes = ['/login', '/api/auth', '/api/cron', '/api/mercadolibre/webhooks', '/api/ping', '/_next', '/clientes/portal', '/sw.js'];
  const isPublicRoute = publicRoutes.some(route => req.nextUrl.pathname === route || req.nextUrl.pathname.startsWith(`${route}/`));
  
  if (!isPublicRoute) {
    const sessionCookie = req.cookies.get('session')?.value;
    const session = await decrypt(sessionCookie);

    if (!session || !session.userId) {
      return NextResponse.redirect(new URL('/login', req.nextUrl));
    }
  }

  // Si estamos en /login redirigimos al app si ya hay sesión (solo para GET)
  if (req.nextUrl.pathname === '/login') {
    if (req.method !== 'GET') {
      return NextResponse.next();
    }
    
    const errorParam = req.nextUrl.searchParams.get('error');
    const openParam = req.nextUrl.searchParams.get('open');
    
    if (errorParam || openParam) {
      const response = NextResponse.next();
      response.cookies.delete('session');
      return response;
    }

    const sessionCookie = req.cookies.get('session')?.value;
    const session = await decrypt(sessionCookie);
    if (session?.userId) {
       return NextResponse.redirect(new URL('/', req.nextUrl));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|manifest.json|sw.js|.*\\..*).*)'],
};
