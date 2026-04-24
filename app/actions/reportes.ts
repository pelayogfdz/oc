'use server';

import { prisma } from '@/lib/prisma';
import { getActiveBranch } from './auth';

export async function getGeneralAnalyticsData(startDate: Date, endDate: Date, branchIdFilter?: string, userIdFilter?: string) {
  const branch = await getActiveBranch();
  
  let branchCondition: any = branch.id === 'GLOBAL' ? {} : { branchId: branch.id };
  if (branchIdFilter && branchIdFilter !== 'ALL') {
    branchCondition = { branchId: branchIdFilter };
  }
  
  const userCondition = (userIdFilter && userIdFilter !== 'ALL') ? { userId: userIdFilter } : {};

  const sales = await prisma.sale.findMany({
    where: {
      ...branchCondition,
      ...userCondition,
      createdAt: { gte: startDate, lte: endDate }
    },
    include: {
      items: {
        include: {
          product: true
        }
      }
    },
    orderBy: { createdAt: 'asc' }
  });

  // Aggregate by day
  const dailyData: Record<string, { date: string, Ventas: number, Ganancia: number, Tickets: number }> = {};
  
  // Fill all dates in range
  let currentDate = new Date(startDate);
  currentDate.setHours(0,0,0,0);
  const end = new Date(endDate);
  end.setHours(23,59,59,999);
  
  while (currentDate <= end) {
    const dStr = currentDate.toISOString().split('T')[0];
    dailyData[dStr] = { date: dStr, Ventas: 0, Ganancia: 0, Tickets: 0 };
    currentDate.setDate(currentDate.getDate() + 1);
  }

  let totalRevenue = 0;
  let totalCost = 0;

  sales.forEach(sale => {
    const dStr = sale.createdAt.toISOString().split('T')[0];
    if (!dailyData[dStr]) dailyData[dStr] = { date: dStr, Ventas: 0, Ganancia: 0, Tickets: 0 };
    
    let saleCost = 0;
    sale.items.forEach(item => {
      saleCost += (item.product.cost * item.quantity);
    });

    const profit = Math.max(0, sale.total - saleCost);

    dailyData[dStr].Ventas += sale.total;
    dailyData[dStr].Ganancia += profit;
    dailyData[dStr].Tickets += 1;

    totalRevenue += sale.total;
    totalCost += saleCost;
  });

  const chartData = Object.values(dailyData);
  const totalProfit = totalRevenue - totalCost;
  const margin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
  const avgTicket = sales.length > 0 ? totalRevenue / sales.length : 0;

  return {
    chartData,
    totalRevenue,
    totalProfit,
    margin,
    avgTicket,
    totalTickets: sales.length
  };
}

export async function getSalesDetailData(startDate: Date, endDate: Date, branchIdFilter?: string, userIdFilter?: string) {
  const branch = await getActiveBranch();
  
  let branchCondition: any = branch.id === 'GLOBAL' ? {} : { branchId: branch.id };
  if (branchIdFilter && branchIdFilter !== 'ALL') {
    branchCondition = { branchId: branchIdFilter };
  }
  
  const userCondition = (userIdFilter && userIdFilter !== 'ALL') ? { userId: userIdFilter } : {};

  const sales = await prisma.sale.findMany({
    where: {
      ...branchCondition,
      ...userCondition,
      createdAt: { gte: startDate, lte: endDate }
    },
    include: {
      user: true,
      customer: true,
      items: {
        include: {
          product: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Calculate gross profits per sale and aggregate by User
  const salesByUser: Record<string, number> = {};
  
  const mappedSales = sales.map(sale => {
    let cost = 0;
    sale.items.forEach(item => cost += (item.product.cost * item.quantity));
    
    const profit = Math.max(0, sale.total - cost);
    const userName = sale.user?.name || 'Vendedor Desconocido';
    
    if (!salesByUser[userName]) salesByUser[userName] = 0;
    salesByUser[userName] += sale.total;

    return {
      id: sale.id,
      date: sale.createdAt.toISOString(),
      user: userName,
      customer: sale.customer?.name || 'Mostrador',
      method: sale.paymentMethod,
      total: sale.total,
      profit: profit,
      itemsCount: sale.items.reduce((acc, item) => acc + item.quantity, 0)
    };
  });

  const pieData = Object.keys(salesByUser).map(name => ({
    name,
    value: salesByUser[name]
  })).sort((a,b) => b.value - a.value);

  // Aggregate for chart data
  const dailyData: Record<string, { date: string, Ventas: number }> = {};
  let currentDate = new Date(startDate);
  currentDate.setHours(0,0,0,0);
  const end = new Date(endDate);
  end.setHours(23,59,59,999);
  
  while (currentDate <= end) {
    const dStr = currentDate.toISOString().split('T')[0];
    dailyData[dStr] = { date: dStr, Ventas: 0 };
    currentDate.setDate(currentDate.getDate() + 1);
  }

  sales.forEach(sale => {
    const dStr = sale.createdAt.toISOString().split('T')[0];
    if (dailyData[dStr]) {
      dailyData[dStr].Ventas += sale.total;
    }
  });

  const chartData = Object.values(dailyData);

  return { sales: mappedSales, pieData, chartData };
}

export async function getInventoryValuationData(branchIdFilter?: string) {
  const branch = await getActiveBranch();
  
  let branchCondition: any = branch.id === 'GLOBAL' ? {} : { branchId: branch.id };
  if (branchIdFilter && branchIdFilter !== 'ALL') {
    branchCondition = { branchId: branchIdFilter };
  }

  const products = await prisma.product.findMany({
    where: {
      ...branchCondition,
      stock: { gt: 0 }
    },
    orderBy: { stock: 'desc' }
  });

  let totalValue = 0;
  let totalSellValue = 0;

  const mappedProducts = products.map(p => {
    const costValue = p.cost * p.stock;
    const sellValue = p.price * p.stock;
    
    totalValue += costValue;
    totalSellValue += sellValue;

    return {
      id: p.id,
      name: p.name,
      sku: p.sku || 'N/A',
      stock: p.stock,
      cost: p.cost,
      price: p.price,
      costValue,
      sellValue,
      margin: p.cost > 0 ? ((p.price - p.cost) / p.price) * 100 : 100
    };
  });

  // Sort by highest locked capital
  const capitalLocked = [...mappedProducts].sort((a,b) => b.costValue - a.costValue).slice(0, 10);

  // Top products by stock volume
  const topStockVolume = [...mappedProducts].slice(0, 10);

  return {
    inventory: mappedProducts,
    totalValue,
    totalSellValue,
    potentialProfit: totalSellValue - totalValue,
    capitalLocked,
    topStockVolume
  };
}

export async function getAvailableFilters() {
  const branch = await getActiveBranch();
  
  let branches = [];
  if (branch.id === 'GLOBAL') {
    branches = await prisma.branch.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' }
    });
  } else {
    branches = [{ id: branch.id, name: branch.name }];
  }

  const users = await prisma.user.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' }
  });

  return { branches, users };
}
