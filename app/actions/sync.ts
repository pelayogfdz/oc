'use server';

import { prisma } from "@/lib/prisma";
import { getActiveBranch } from "./auth";

export async function syncBasicCatalogs() {
  const branch = await getActiveBranch();
  const branchId = branch?.id || '';
  const tenantId = branch?.tenantId || '';

  const customers = await prisma.customer.findMany({
    where: {
      OR: [
        { branchId: null },
        { branchId: '' },
        { branchId }
      ]
    }
  });
  const suppliers = await prisma.supplier.findMany();
  const branches = await prisma.branch.findMany({ where: { tenantId, isActive: true } });
  const settingsDb = await prisma.branchSettings.findUnique({ where: { branchId } });
  
  const totalProducts = await prisma.product.count({ 
    where: { branchId, isActive: true } 
  });
  
  // Fetch active users in the tenant for offline Kiosk Mode
  const users = await prisma.user.findMany({
    where: { 
      tenantId,
      branchId: { not: null }
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      faceDescriptor: true,
      webauthnCredentialId: true,
      webauthnPublicKey: true,
      branchId: true,
      permissions: true,
      customRole: {
        select: {
          permissions: true
        }
      }
    }
  });

  return { customers, suppliers, branches, settings: settingsDb, totalProducts, users };
}

export async function syncProductsPage(page: number, limit: number) {
  const branch = await getActiveBranch();
  if (!branch) return [];
  const branchId = branch.id;
  
  const skip = (page - 1) * limit;
  const products = await prisma.product.findMany({
    where: { branchId, isActive: true },
    include: { variants: true, prices: true },
    skip,
    take: limit,
  });

  return products.map(product => {
    if (product.imageUrl && product.imageUrl.startsWith('data:')) {
      product.imageUrl = `https://caanma.com/api/catalog/image?id=${product.id}`;
    }
    return product;
  });
}

export async function syncAllCatalogs() {
  const branch = await getActiveBranch();
  const branchId = branch?.id || '';
  const tenantId = branch?.tenantId || '';

  const tenantBranches = await prisma.branch.findMany({
    where: { tenantId, isActive: true },
    select: { id: true }
  });
  const branchIds = tenantBranches.map(b => b.id);

  // 1. Productos
  const products = await prisma.product.findMany({
    where: { branchId: { in: branchIds }, isActive: true },
    include: { variants: true, prices: true },
    take: 1000
  });

  const mappedProducts = products.map(product => {
    if (product.imageUrl && product.imageUrl.startsWith('data:')) {
      product.imageUrl = `https://caanma.com/api/catalog/image?id=${product.id}`;
    }
    return product;
  });

  // 2. Clientes
  const customers = await prisma.customer.findMany();

  // 3. Proveedores
  const suppliers = await prisma.supplier.findMany();

  // 4. Sucursales
  const branches = await prisma.branch.findMany({
    where: { tenantId, isActive: true }
  });

  // 5. Settings (solo de la sucursal activa)
  const settingsDb = await prisma.branchSettings.findUnique({
    where: { branchId }
  });

  return {
    products: mappedProducts,
    customers,
    suppliers,
    branches,
    settings: settingsDb
  };
}
