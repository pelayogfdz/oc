'use server';

import { prisma } from "@/lib/prisma";
import { getActiveBranch } from "./auth";

export async function syncAllCatalogs() {
  const branch = await getActiveBranch();
  const branchId = branch?.id || '';

  // 1. Productos
  const products = await prisma.product.findMany({
    where: { isActive: true }, // We should probably download ALL products across branches for transfers? Yes.
    include: { variants: true, prices: true }
  });

  // 2. Clientes
  const customers = await prisma.customer.findMany({
    where: { branchId } // Clients are usually branch-specific or global. Let's pull all for simplicity.
  });

  // 3. Proveedores
  const suppliers = await prisma.supplier.findMany();

  // 4. Sucursales
  const branches = await prisma.branch.findMany({
    where: { isActive: true }
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
