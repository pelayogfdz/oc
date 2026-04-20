'use server';
import { prisma } from "@/lib/prisma";

export async function getDashboardMetrics(branchId?: string) {
  try {
    const today = new Date();
    today.setHours(0,0,0,0);

    const branchFilter = branchId ? { branchId } : {};

    // Ventas de hoy
    const todaySales = await prisma.sale.findMany({
      where: {
        createdAt: { gte: today },
        status: { not: "CANCELLED" },
        ...branchFilter
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
        ...branchFilter
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
