import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { createSession } from '@/lib/session';

export async function POST(req: Request) {
  try {
    const { email, tempPassword, newPassword } = await req.json();

    if (!email || !tempPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos.' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'La nueva contraseña debe tener al menos 6 caracteres.' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado.' },
        { status: 404 }
      );
    }

    // Verify temp password
    const isValid = await bcrypt.compare(tempPassword, user.password);

    if (!isValid) {
      return NextResponse.json(
        { error: 'La contraseña temporal es incorrecta.' },
        { status: 401 }
      );
    }

    // Hash new password and disable forcePasswordChange
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedNewPassword,
        forcePasswordChange: false,
      },
    });

    // Create session for user automatically
    await createSession(updatedUser.id, updatedUser.tenantId || '', updatedUser.role);

    return NextResponse.json({
      success: true,
      message: 'Contraseña actualizada correctamente. Iniciando sesión...',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
      },
    });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { error: 'Error al cambiar la contraseña.' },
      { status: 500 }
    );
  }
}
