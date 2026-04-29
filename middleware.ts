import { NextRequest, NextResponse } from 'next/server';
import { decrypt } from '@/lib/session';

export async function middleware(req: NextRequest) {
  const publicRoutes = ['/login', '/api/auth', '/api/cron', '/api/mercadolibre/webhooks', '/api/ping', '/_next'];
  const isPublicRoute = publicRoutes.some(route => req.nextUrl.pathname === route || req.nextUrl.pathname.startsWith(`${route}/`));
  
  if (!isPublicRoute) {
    const sessionCookie = req.cookies.get('session')?.value;
    const session = await decrypt(sessionCookie);

    if (!session || !session.userId) {
      return NextResponse.redirect(new URL('/login', req.nextUrl));
    }
  }

  // Si estamos en /login redirigimos al app si ya hay sesión
  if (req.nextUrl.pathname === '/login') {
    const sessionCookie = req.cookies.get('session')?.value;
    const session = await decrypt(sessionCookie);
    if (session?.userId) {
       return NextResponse.redirect(new URL('/', req.nextUrl));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
