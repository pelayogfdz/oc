'use server';
import { prisma } from "@/lib/prisma";
import { getActiveBranch, getSession } from "./auth";

export async function getDashboardMetrics(branchId?: string) {
  try {
    const session = await getSession();
    const branch = await getActiveBranch();
    if (!branch) throw new Error('Unauthorized');

    const tenantId = session?.tenantId || branch.tenantId;
    if (!tenantId) throw new Error('Unauthorized: Tenant context missing');

    const tenantBranches = await prisma.branch.findMany({
      where: { tenantId, isActive: true },
      select: { id: true }
    });
    const tenantBranchIds = tenantBranches.map(b => b.id);

    let resolvedBranchFilter: any = {};
    if (branchId && branchId !== 'ALL') {
      if (tenantBranchIds.includes(branchId)) {
        resolvedBranchFilter = { branchId };
      } else {
        resolvedBranchFilter = { branchId: { in: tenantBranchIds } };
      }
    } else if (branch.id !== 'GLOBAL') {
      resolvedBranchFilter = { branchId: branch.id };
    } else {
      resolvedBranchFilter = { branchId: { in: tenantBranchIds } };
    }

    const today = new Date();
    today.setHours(0,0,0,0);

    // Ventas de hoy
    const todaySales = await prisma.sale.findMany({
      where: {
        createdAt: { gte: today },
        status: { not: "CANCELLED" },
        ...resolvedBranchFilter
      },
      select: { total: true }
    });

    const ventasDelDia = todaySales.reduce((acc, sum) => acc + sum.total, 0);
    const ticketsEmitidos = todaySales.length;

    // Inventario
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        stock: { gt: 0 },
        ...resolvedBranchFilter
      },
      select: { stock: true, cost: true }
    });

    const valorInventario = products.reduce((acc, p) => acc + (p.stock * p.cost), 0);

    return {
      ventasDelDia,
      ticketsEmitidos,
      valorInventario
    };
  } catch (error) {
    console.error("Error fetching metrics", error);
    return {
      ventasDelDia: 0,
      ticketsEmitidos: 0,
      valorInventario: 0
    };
  }
}
