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
  // Primero, reubicamos toda la "data histórica" a "sin sucursal" (branchId = null)
  // Utilizamos raw SQL porque el cliente de prisma local no pudo compilar los tipos nulos (por bloqueo de archivos EPERM).
  // La base de datos SQLite sí aceptó el schema push, por lo que admite NULL.
  await prisma.$executeRaw`UPDATE Sale SET branchId = NULL WHERE branchId = ${id}`;
  await prisma.$executeRaw`UPDATE Quote SET branchId = NULL WHERE branchId = ${id}`;
  await prisma.$executeRaw`UPDATE Customer SET branchId = NULL WHERE branchId = ${id}`;
  await prisma.$executeRaw`UPDATE Purchase SET branchId = NULL WHERE branchId = ${id}`;
  await prisma.$executeRaw`UPDATE Expense SET branchId = NULL WHERE branchId = ${id}`;
  await prisma.$executeRaw`UPDATE CashSession SET branchId = NULL WHERE branchId = ${id}`;
  await prisma.$executeRaw`UPDATE Transfer SET branchId = NULL WHERE branchId = ${id}`;
  await prisma.$executeRaw`UPDATE Transfer SET toBranchId = NULL WHERE toBranchId = ${id}`;
  await prisma.$executeRaw`UPDATE Supplier SET branchId = NULL WHERE branchId = ${id}`;
  await prisma.$executeRaw`UPDATE User SET branchId = NULL WHERE branchId = ${id}`;

  // Obtener los productos que pertenecen a la sucursal para purgarlos exhaustivamente.
  const products = await prisma.product.findMany({ where: { branchId: id }, select: { id: true } });
  const productIds = products.map((p: any) => p.id);

  if (productIds.length > 0) {
    // Borrar todo el historial asociado de cada producto antes de borrarlos, igual que en el Hard Delete
    await prisma.$transaction([
      prisma.inventoryMovement.deleteMany({ where: { productId: { in: productIds } } }),
      prisma.saleItem.deleteMany({ where: { productId: { in: productIds } } }),
      prisma.quoteItem.deleteMany({ where: { productId: { in: productIds } } }),
      prisma.transferItem.deleteMany({ where: { productId: { in: productIds } } }),
      prisma.purchaseItem.deleteMany({ where: { productId: { in: productIds } } }),
      prisma.product.deleteMany({ where: { branchId: id } })
    ]);
  }

  // Ahora limpiamos configuración particular de esta sucursal (Settings, Listas, Promos, Integraciones)
  await prisma.$transaction([
    prisma.branchSettings.deleteMany({ where: { branchId: id } }),
    prisma.storeIntegration.deleteMany({ where: { branchId: id } }),
    prisma.promotion.deleteMany({ where: { branchId: id } }),
    prisma.priceList.deleteMany({ where: { branchId: id } })
  ]);

  // Finalmente, matamos la sucursal
  await prisma.branch.delete({ where: { id } });
  
  revalidatePath('/preferencias/sucursales');
}
