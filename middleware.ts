import { NextRequest, NextResponse } from 'next/server';
import { decrypt } from '@/lib/session';

export async function middleware(req: NextRequest) {
  const protectedRoutes = ['/', '/caja', '/reportes', '/inventario', '/clientes', '/facturacion', '/usuarios'];
  const isProtectedRoute = protectedRoutes.some(route => req.nextUrl.pathname === route || req.nextUrl.pathname.startsWith(`${route}/`));
  
  if (isProtectedRoute) {
    const sessionCookie = req.cookies.get('session')?.value;
    const session = await decrypt(sessionCookie);

    if (!session || !session.userId || !session.tenantId) {
      return NextResponse.redirect(new URL('/login', req.nextUrl));
    }
  }

  // Si estamos en /login redirigimos al app si ya hay sesión
  if (req.nextUrl.pathname === '/login') {
    const sessionCookie = req.cookies.get('session')?.value;
    const session = await decrypt(sessionCookie);
    if (session?.userId && session?.tenantId) {
       return NextResponse.redirect(new URL('/', req.nextUrl));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
