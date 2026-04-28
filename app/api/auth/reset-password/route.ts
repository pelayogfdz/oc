import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { sendTemporaryPasswordEmail } from '@/lib/mailer';

function generateRandomPassword(length = 8) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = 'CAANMA-';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: 'El correo electrónico es obligatorio.' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Return 200 even if user not found for security reasons (don't leak emails)
      return NextResponse.json(
        { message: 'Si el correo existe, se enviarán las instrucciones.' },
        { status: 200 }
      );
    }

    // Generate temporary password
    const tempPassword = generateRandomPassword(8);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Save temporary password and force change on next login
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        forcePasswordChange: true,
      },
    });

    // Send email
    const emailResult = await sendTemporaryPasswordEmail(user.email, tempPassword);

    if (!emailResult.success) {
      console.error("Failed to send password reset email:", emailResult.error);
      return NextResponse.json(
        { error: 'Hubo un error al intentar enviar el correo. Por favor, contacte a soporte.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Si el correo existe, se enviarán las instrucciones.' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json(
      { error: 'Ha ocurrido un error interno.' },
      { status: 500 }
    );
  }
}
