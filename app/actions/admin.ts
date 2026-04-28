'use server';

import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { decrypt } from '@/lib/session';

/**
 * Validates if the current session is a Super Admin
 */
async function requireSuperAdmin() {
  const sessionCookie = (await cookies()).get('session')?.value;
  const session = await decrypt(sessionCookie);

  if (!session?.userId) {
    throw new Error('No autorizado');
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId as string },
    select: { email: true, isSuperAdmin: true }
  });

  if (!user || (!user.isSuperAdmin && user.email !== 'pelayogfdz@gmail.com')) {
    throw new Error('No tienes permisos de Super Administrador');
  }

  return user;
}

export async function getAdminDashboardData() {
  await requireSuperAdmin();

  const tenants = await prisma.tenant.findMany({
    include: {
      _count: {
        select: { users: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  let settings = await prisma.systemSettings.findFirst();
  if (!settings) {
    settings = await prisma.systemSettings.create({
      data: {}
    });
  }

  return {
    tenants,
    settings
  };
}

export async function updateSystemMPCredentials(data: {
  mpAccessToken: string;
  mpPublicKey: string;
}) {
  await requireSuperAdmin();

  let settings = await prisma.systemSettings.findFirst();
  if (settings) {
    await prisma.systemSettings.update({
      where: { id: settings.id },
      data: {
        mpAccessToken: data.mpAccessToken,
        mpPublicKey: data.mpPublicKey
      }
    });
  } else {
    await prisma.systemSettings.create({
      data: {
        mpAccessToken: data.mpAccessToken,
        mpPublicKey: data.mpPublicKey
      }
    });
  }

  return { success: true };
}

export async function addTenantGiftCredits(tenantId: string, amount: number) {
  await requireSuperAdmin();

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new Error('Tenant not found');

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      giftCredits: {
        increment: amount
      }
    }
  });

  return { success: true };
}
export async function updateSystemPricing(data: { basePrice: number; userPrice: number; mpAccessToken?: string }) {
  await requireSuperAdmin();

  let settings = await prisma.systemSettings.findFirst();
  if (settings) {
    await prisma.systemSettings.update({
      where: { id: settings.id },
      data: {
        basePrice: data.basePrice,
        userPrice: data.userPrice,
        ...(data.mpAccessToken !== undefined && { mpAccessToken: data.mpAccessToken })
      }
    });
  } else {
    await prisma.systemSettings.create({
      data: {
        basePrice: data.basePrice,
        userPrice: data.userPrice,
        ...(data.mpAccessToken !== undefined && { mpAccessToken: data.mpAccessToken })
      }
    });
  }

  return { success: true };
}

export async function updateTenantCustomPricing(tenantId: string, data: { customBasePrice: number | null; customUserPrice: number | null }) {
  await requireSuperAdmin();

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new Error('Tenant not found');

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      customBasePrice: data.customBasePrice,
      customUserPrice: data.customUserPrice
    }
  });

  return { success: true };
}

export async function toggleTenantStatus(tenantId: string, isActive: boolean) {
  await requireSuperAdmin();

  await prisma.tenant.update({
    where: { id: tenantId },
    data: { isActive }
  });

  return { success: true };
}

export async function editTenant(tenantId: string, name: string) {
  await requireSuperAdmin();

  await prisma.tenant.update({
    where: { id: tenantId },
    data: { name }
  });

  return { success: true };
}
