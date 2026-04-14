'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function createBranch(formData: FormData) {
  const name = formData.get('name') as string;
  const location = formData.get('location') as string;
  
  await prisma.branch.create({
    data: {
      name,
      location,
      settings: {
        create: {
          taxIVA: 16.0,
          currencySymbol: '$',
          autoCloseCash: false
        }
      }
    }
  });
  
  revalidatePath('/preferencias/sucursales');
}

export async function updateBranch(id: string, name: string, location: string, facturapiLiveKey?: string, facturapiTestKey?: string) {
  await prisma.branch.update({
    where: { id },
    data: { name, location }
  });

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
    if (facturapiLiveKey !== undefined) config.facturacion.liveKey = facturapiLiveKey;
    if (facturapiTestKey !== undefined) config.facturacion.testKey = facturapiTestKey;
    
    await prisma.branchSettings.update({
      where: { branchId: id },
      data: { configJson: JSON.stringify(config) }
    });
  }

  revalidatePath('/preferencias/sucursales');
}

export async function deleteBranch(id: string) {
  // En lugar de borrar la sucursal y huérfanos/perder inventario (Hard Delete),
  // Hacemos un Soft Delete cambiando el estado a inactivo.
  // De este modo el inventario no se pierde y los reportes históricos siguen 
  // relacionando ventas pasadas a la sucursal desactivada.
  
  await prisma.branch.update({
    where: { id },
    data: { isActive: false }
  });
  
  revalidatePath('/preferencias/sucursales');
}
