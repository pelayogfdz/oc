'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath, updateTag } from 'next/cache';
import { cookies } from 'next/headers';
import { decrypt } from '@/lib/session';

export async function createBranch(formData: FormData) {
  const name = formData.get('name') as string;
  const location = formData.get('location') as string;
  
  const sessionCookie = (await cookies()).get('session')?.value;
  const session = await decrypt(sessionCookie);
  const tenantId = session?.tenantId || null;

  const newBranch = await prisma.branch.create({
    data: {
      name,
      location,
      tenantId,
      settings: {
        create: {
          taxIVA: 16.0,
          currencySymbol: '$',
          autoCloseCash: false
        }
      }
    }
  });
  
  if (tenantId) {
    updateTag(`tenant-branches-${tenantId}`);
  }
  revalidatePath('/preferencias/sucursales');
  revalidatePath('/preferencias/usuarios');
  return { success: true, branch: newBranch };
}

export async function updateBranch(id: string, name: string, location: string, facturapiLiveKey?: string, facturapiTestKey?: string, lat?: number, lng?: number, radius?: number) {
  const sessionCookie = (await cookies()).get('session')?.value;
  const session = await decrypt(sessionCookie);
  if (!session || !session.tenantId) {
    throw new Error('Unauthorized');
  }

  // Verificar pertenencia al tenant
  const branch = await prisma.branch.findFirst({
    where: { id, tenantId: session.tenantId }
  });
  if (!branch) {
    throw new Error('Sucursal no encontrada');
  }

  await prisma.branch.update({
    where: { id },
    data: { name, location }
  });

  if (lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng)) {
    await prisma.hrLocation.upsert({
      where: { branchId: id },
      create: { branchId: id, name, lat, lng, radius: radius || 50 },
      update: { lat, lng, radius: radius || 50 }
    });
  }

  if (facturapiLiveKey !== undefined || facturapiTestKey !== undefined) {
    let settings = await prisma.branchSettings.findUnique({ where: { branchId: id } });
    if (!settings) {
      settings = await prisma.branchSettings.create({ data: { branchId: id } });
    }
    
    let config: any = {};
    if (settings.configJson) {
      try { config = JSON.parse(settings.configJson); } catch(e) {}
    }
    
    if (!config.facturacion) config.facturacion = {};
    if (facturapiLiveKey !== undefined) {
      config.facturacion.liveKey = facturapiLiveKey;
      config.facturacion.apiTokenLive = facturapiLiveKey;
    }
    if (facturapiTestKey !== undefined) {
      config.facturacion.testKey = facturapiTestKey;
      config.facturacion.apiTokenTest = facturapiTestKey;
    }
    
    await prisma.branchSettings.update({
      where: { branchId: id },
      data: { configJson: JSON.stringify(config) }
    });
  }

  updateTag(`tenant-branches-${session.tenantId}`);
  updateTag(`branch-${id}`);
  revalidatePath('/preferencias/sucursales');
}

export async function deleteBranch(id: string) {
  const sessionCookie = (await cookies()).get('session')?.value;
  const session = await decrypt(sessionCookie);
  if (!session || !session.tenantId) {
    throw new Error('Unauthorized');
  }

  // Verificar pertenencia al tenant
  const branch = await prisma.branch.findFirst({
    where: { id, tenantId: session.tenantId }
  });
  if (!branch) {
    throw new Error('Sucursal no encontrada');
  }

  await prisma.branch.update({
    where: { id },
    data: { isActive: false }
  });
  
  updateTag(`tenant-branches-${session.tenantId}`);
  updateTag(`branch-${id}`);
  revalidatePath('/preferencias/sucursales');
}
