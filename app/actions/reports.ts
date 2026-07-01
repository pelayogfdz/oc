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

    // Start of today aligned with Mexico standard GMT-6 timezone
    const MEXICO_OFFSET_MS = 6 * 60 * 60 * 1000;
    const now = new Date();
    const utcNow = new Date(now.getTime() + now.getTimezoneOffset() * 60000);
    const mexicoNow = new Date(utcNow.getTime() - MEXICO_OFFSET_MS);

    const startOfMexicoDay = new Date(mexicoNow);
    startOfMexicoDay.setHours(0, 0, 0, 0);
    const today = new Date(startOfMexicoDay.getTime() + MEXICO_OFFSET_MS);

    const endOfMexicoDay = new Date(mexicoNow);
    endOfMexicoDay.setHours(23, 59, 59, 999);
    const endOfToday = new Date(endOfMexicoDay.getTime() + MEXICO_OFFSET_MS);

    // Ventas de hoy
    const todaySales = await prisma.sale.findMany({
      where: {
        createdAt: { gte: today, lte: endOfToday },
        status: { not: "CANCELLED" },
        ...resolvedBranchFilter
      },
      select: { total: true }
    });

    const ventasDelDia = todaySales.reduce((acc, sum) => acc + sum.total, 0);
    const ticketsEmitidos = todaySales.length;

    // Inventario
    let valorInventario = 0;
    if (resolvedBranchFilter.branchId) {
      if (typeof resolvedBranchFilter.branchId === 'string') {
        const result = await prisma.$queryRawUnsafe<any[]>(
          `SELECT COALESCE(SUM(stock * cost), 0) as total_val FROM "Product" WHERE "isActive" = true AND stock > 0 AND "branchId" = $1`,
          resolvedBranchFilter.branchId
        );
        valorInventario = Number(result[0]?.total_val || 0);
      } else if (resolvedBranchFilter.branchId.in && Array.isArray(resolvedBranchFilter.branchId.in)) {
        const branchIds = resolvedBranchFilter.branchId.in;
        if (branchIds.length > 0) {
          const placeholders = branchIds.map((_: any, idx: number) => `$${idx + 1}`).join(', ');
          const result = await prisma.$queryRawUnsafe<any[]>(
            `SELECT COALESCE(SUM(stock * cost), 0) as total_val FROM "Product" WHERE "isActive" = true AND stock > 0 AND "branchId" IN (${placeholders})`,
            ...branchIds
          );
          valorInventario = Number(result[0]?.total_val || 0);
        }
      }
    } else {
      const result = await prisma.$queryRawUnsafe<any[]>(
        `SELECT COALESCE(SUM(stock * cost), 0) as total_val FROM "Product" WHERE "isActive" = true AND stock > 0`
      );
      valorInventario = Number(result[0]?.total_val || 0);
    }

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
