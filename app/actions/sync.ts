'use server';

import { prisma } from "@/lib/prisma";
import { getActiveBranch } from "./auth";

export async function syncBasicCatalogs() {
  const branch = await getActiveBranch();
  const branchId = branch?.id || '';
  const tenantId = branch?.tenantId || '';

  const customers = await prisma.customer.findMany();
  const suppliers = await prisma.supplier.findMany();
  const branches = await prisma.branch.findMany({ where: { tenantId, isActive: true } });
  const settingsDb = await prisma.branchSettings.findUnique({ where: { branchId } });
  
  const tenantBranches = await prisma.branch.findMany({
    where: { tenantId, isActive: true },
    select: { id: true }
  });
  const branchIds = tenantBranches.map(b => b.id);
  const totalProducts = await prisma.product.count({ 
    where: { branchId: { in: branchIds }, isActive: true } 
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
      branchId: true
    }
  });

  return { customers, suppliers, branches, settings: settingsDb, totalProducts, users };
}

export async function syncProductsPage(page: number, limit: number) {
  const branch = await getActiveBranch();
  if (!branch) return [];
  const tenantId = branch.tenantId || '';
  
  const tenantBranches = await prisma.branch.findMany({
    where: { tenantId, isActive: true },
    select: { id: true }
  });
  const branchIds = tenantBranches.map(b => b.id);

  const skip = (page - 1) * limit;
  const products = await prisma.product.findMany({
    where: { branchId: { in: branchIds }, isActive: true },
    include: { variants: true, prices: true },
    skip,
    take: limit,
  });
  return products;
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
    products,
    customers,
    suppliers,
    branches,
    settings: settingsDb
  };
}
