import { NextResponse } from 'next/server';
import { prisma, masterClient, getClientForTenant } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { createSession } from '@/lib/session';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Credenciales incompletas' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    const user = await masterClient.user.findUnique({
      where: { email: cleanEmail },
      include: { tenant: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    let isPasswordValid = false;
    if (user.password === password) {
      isPasswordValid = true;
    } else {
      isPasswordValid = await bcrypt.compare(password, user.password || '');
    }

    // Si no coincide con la maestra, verificar contra la del inquilino (auto-saneamiento)
    if (!isPasswordValid && user.tenantId) {
      try {
        const tenantClient = getClientForTenant(user.tenantId);
        if (tenantClient !== masterClient) {
          const tenantUser = await tenantClient.user.findUnique({
            where: { id: user.id }
          });
          if (tenantUser) {
            let isTenantPasswordValid = false;
            if (tenantUser.password === password) {
              isTenantPasswordValid = true;
            } else {
              isTenantPasswordValid = await bcrypt.compare(password, tenantUser.password || '');
            }

            if (isTenantPasswordValid) {
              isPasswordValid = true;
              console.log(`[Self-Healing API] Sincronizando contraseña del usuario ${cleanEmail} de base inquilino a base maestra.`);
              await masterClient.user.update({
                where: { id: user.id },
                data: { password: tenantUser.password }
              });
              user.password = tenantUser.password;
            }
          }
        }
      } catch (err) {
        console.error("[Self-Healing API] Error verificando contraseña en base inquilino:", err);
      }
    }

    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    if (!user.isSuperAdmin && (!user.tenantId || !user.tenant?.isActive)) {
      return NextResponse.json({ error: 'Tu empresa está inactiva o no configurada.' }, { status: 403 });
    }

    if (user.forcePasswordChange) {
      // Don't create session, inform the frontend to ask for new password
      return NextResponse.json({ 
        success: false, 
        forcePasswordChange: true, 
        email: user.email,
        message: 'Debes cambiar tu contraseña temporal.' 
      }, { status: 200 });
    }

    // Create JSON Web Token
    const sessionToken = await createSession(user.id, user.tenantId, user.role);

    const response = NextResponse.json({ success: true });
    response.cookies.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      sameSite: 'lax',
      path: '/',
    });
    
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
