import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { createSession } from '@/lib/session';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Credenciales incompletas' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { tenant: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    if (user.password !== password) {
      const isMatch = await bcrypt.compare(password, user.password || '');
      if (!isMatch) {
        return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
      }
    }

    if (!user.tenantId || !user.tenant?.isActive) {
      return NextResponse.json({ error: 'Tu empresa está inactiva o no configurada.' }, { status: 403 });
    }

    // Create JSON Web Token
    await createSession(user.id, user.tenantId, user.role);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
