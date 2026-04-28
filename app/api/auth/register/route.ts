import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { createSession } from '@/lib/session';

export async function POST(req: Request) {
  try {
    const { companyName, fullName, email, password } = await req.json();

    if (!companyName || !fullName || !email || !password) {
      return NextResponse.json(
        { error: 'Todos los campos son obligatorios.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres.' },
        { status: 400 }
      );
    }

    // Verify email is not already registered
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'El correo electrónico ya está registrado.' },
        { status: 409 }
      );
    }

    // Create 5 days trial expiration
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 5);

    const hashedPassword = await bcrypt.hash(password, 10);

    // Use Prisma transaction to create Tenant, Branch, and User
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Tenant
      const tenant = await tx.tenant.create({
        data: {
          name: companyName,
          slug: companyName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          trialEndsAt: trialEndsAt,
          isActive: true,
        },
      });

      // 2. Create Default Branch (MATRIZ)
      const branch = await tx.branch.create({
        data: {
          name: 'Matriz',
          tenantId: tenant.id,
          isActive: true,
        },
      });

      // 3. Create Branch Settings
      await tx.branchSettings.create({
        data: {
          branchId: branch.id,
          ticketHeader: `*** ${companyName} ***\n¡Gracias por su compra!`,
        },
      });

      // 4. Create Default PriceList
      const priceList = await tx.priceList.create({
        data: {
          name: 'Público',
          branchId: branch.id,
        },
      });

      // 5. Create Admin User
      const user = await tx.user.create({
        data: {
          name: fullName,
          email,
          password: hashedPassword,
          role: 'ADMIN',
          tenantId: tenant.id,
          branchId: branch.id,
        },
      });

      return { user, tenant, branch };
    });

    // Automatically create session
    await createSession(result.user.id, result.user.tenantId || '', result.user.role);

    return NextResponse.json({
      success: true,
      message: 'Cuenta creada exitosamente.',
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
      },
    }, { status: 201 });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Ha ocurrido un error al crear la cuenta. Intente nuevamente.' },
      { status: 500 }
    );
  }
}
