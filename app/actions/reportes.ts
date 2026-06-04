'use server';

import { prisma } from '@/lib/prisma';
import { getActiveBranch, getSession } from './auth';

export async function getGeneralAnalyticsData(startDate: Date, endDate: Date, branchIdFilter?: string, userIdFilter?: string) {
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
  
  let branchCondition: any = branch.id === 'GLOBAL' 
    ? { branchId: { in: tenantBranchIds } } 
    : { branchId: branch.id };
    
  if (branchIdFilter && branchIdFilter !== 'ALL') {
    if (tenantBranchIds.includes(branchIdFilter)) {
      branchCondition = { branchId: branchIdFilter };
    } else {
      branchCondition = { branchId: { in: tenantBranchIds } };
    }
  }
  
  const tenantUsers = await prisma.user.findMany({
    where: { tenantId },
    select: { id: true }
  });
  const tenantUserIds = tenantUsers.map(u => u.id);
  
  let userCondition: any = {};
  if (userIdFilter && userIdFilter !== 'ALL') {
    if (tenantUserIds.includes(userIdFilter)) {
      userCondition = { userId: userIdFilter };
    } else {
      userCondition = { userId: { in: tenantUserIds } };
    }
  } else {
    userCondition = { userId: { in: tenantUserIds } };
  }

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
  
  let branchCondition: any = branch.id === 'GLOBAL' 
    ? { branchId: { in: tenantBranchIds } } 
    : { branchId: branch.id };
    
  if (branchIdFilter && branchIdFilter !== 'ALL') {
    if (tenantBranchIds.includes(branchIdFilter)) {
      branchCondition = { branchId: branchIdFilter };
    } else {
      branchCondition = { branchId: { in: tenantBranchIds } };
    }
  }
  
  const tenantUsers = await prisma.user.findMany({
    where: { tenantId },
    select: { id: true }
  });
  const tenantUserIds = tenantUsers.map(u => u.id);
  
  let userCondition: any = {};
  if (userIdFilter && userIdFilter !== 'ALL') {
    if (tenantUserIds.includes(userIdFilter)) {
      userCondition = { userId: userIdFilter };
    } else {
      userCondition = { userId: { in: tenantUserIds } };
    }
  } else {
    userCondition = { userId: { in: tenantUserIds } };
  }

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
  
  let branchCondition: any = branch.id === 'GLOBAL' 
    ? { branchId: { in: tenantBranchIds } } 
    : { branchId: branch.id };
    
  if (branchIdFilter && branchIdFilter !== 'ALL') {
    if (tenantBranchIds.includes(branchIdFilter)) {
      branchCondition = { branchId: branchIdFilter };
    } else {
      branchCondition = { branchId: { in: tenantBranchIds } };
    }
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
  const session = await getSession();
  const branch = await getActiveBranch();
  if (!branch) throw new Error('Unauthorized');
  
  const tenantId = session?.tenantId || branch.tenantId;
  if (!tenantId) throw new Error('Unauthorized: Tenant context missing');
  
  let branches = [];
  if (branch.id === 'GLOBAL') {
    branches = await prisma.branch.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' }
    });
  } else {
    branches = [{ id: branch.id, name: branch.name }];
  }

  const users = await prisma.user.findMany({
    where: { tenantId },
    select: { id: true, name: true },
    orderBy: { name: 'asc' }
  });

  // Find all branches of this tenant
  const tenantBranches = await prisma.branch.findMany({
    where: { tenantId, isActive: true },
    select: { id: true }
  });
  const branchIds = tenantBranches.map(b => b.id);

  // Fetch unique categories of products
  const products = await prisma.product.findMany({
    where: {
      branchId: { in: branchIds }
    },
    select: { category: true },
    distinct: ['category']
  });
  const categories = products
    .map(p => p.category)
    .filter((cat): cat is string => !!cat && cat.trim() !== '');

  // Fetch customers
  const customers = await prisma.customer.findMany({
    where: {
      branchId: { in: branchIds }
    },
    select: { id: true, name: true, phone: true, email: true },
    orderBy: { name: 'asc' }
  });

  return { branches, users, categories, customers };
}


export async function getConsignmentReportData(
  startDate: Date, 
  endDate: Date, 
  branchIdFilter?: string, 
  userIdFilter?: string,
  customerIdFilter?: string
) {
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
  
  let branchCondition: any = branch.id === 'GLOBAL' 
    ? { branchId: { in: tenantBranchIds } } 
    : { branchId: branch.id };
    
  if (branchIdFilter && branchIdFilter !== 'ALL') {
    if (tenantBranchIds.includes(branchIdFilter)) {
      branchCondition = { branchId: branchIdFilter };
    } else {
      branchCondition = { branchId: { in: tenantBranchIds } };
    }
  }
  
  const tenantUsers = await prisma.user.findMany({
    where: { tenantId },
    select: { id: true }
  });
  const tenantUserIds = tenantUsers.map(u => u.id);
  
  let userCondition: any = {};
  if (userIdFilter && userIdFilter !== 'ALL') {
    if (tenantUserIds.includes(userIdFilter)) {
      userCondition = { userId: userIdFilter };
    } else {
      userCondition = { userId: { in: tenantUserIds } };
    }
  } else {
    userCondition = { userId: { in: tenantUserIds } };
  }
  const customerCondition = (customerIdFilter && customerIdFilter !== 'ALL') ? { customerId: customerIdFilter } : {};

  const consignments = await prisma.consignment.findMany({
    where: {
      ...branchCondition,
      ...userCondition,
      ...customerCondition,
      createdAt: { gte: startDate, lte: endDate }
    },
    include: {
      user: true,
      customer: true,
      items: {
        include: {
          product: true,
          variant: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  let totalConsigned = 0;
  let activeConsigned = 0;
  let convertedConsigned = 0;
  let activeCount = 0;
  let convertedCount = 0;

  // Track product performance
  const productSummary: Record<string, { name: string; sku: string; consignedQty: number; activeQty: number; billedQty: number; totalValue: number }> = {};
  // Track customer performance
  const customerSummary: Record<string, { name: string; consignedAmt: number; activeAmt: number; billedAmt: number; count: number }> = {};

  consignments.forEach(c => {
    const isConverted = c.status === 'CONVERTED';
    totalConsigned += c.total;
    
    if (isConverted) {
      convertedConsigned += c.total;
      convertedCount++;
    } else {
      activeConsigned += c.total;
      activeCount++;
    }

    const cName = c.customer?.name || 'Público en General';
    if (!customerSummary[cName]) {
      customerSummary[cName] = { name: cName, consignedAmt: 0, activeAmt: 0, billedAmt: 0, count: 0 };
    }
    customerSummary[cName].consignedAmt += c.total;
    customerSummary[cName].count += 1;
    if (isConverted) {
      customerSummary[cName].billedAmt += c.total;
    } else {
      customerSummary[cName].activeAmt += c.total;
    }

    c.items.forEach(item => {
      const pName = item.variant ? `${item.product.name} (${item.variant.attribute})` : item.product.name;
      const sku = item.variant?.sku || item.product.sku || 'N/A';
      
      if (!productSummary[pName]) {
        productSummary[pName] = { name: pName, sku, consignedQty: 0, activeQty: 0, billedQty: 0, totalValue: 0 };
      }
      
      productSummary[pName].consignedQty += item.quantity;
      productSummary[pName].totalValue += item.quantity * item.price;
      if (isConverted) {
        productSummary[pName].billedQty += item.quantity;
      } else {
        productSummary[pName].activeQty += item.quantity;
      }
    });
  });

  const topCustomers = Object.values(customerSummary).sort((a, b) => b.consignedAmt - a.consignedAmt).slice(0, 10);
  const topProducts = Object.values(productSummary).sort((a, b) => b.consignedQty - a.consignedQty).slice(0, 10);

  // Daily timeline aggregation
  const dailyData: Record<string, { date: string, Consignado: number, Facturado: number }> = {};
  let currentDate = new Date(startDate);
  currentDate.setHours(0,0,0,0);
  const end = new Date(endDate);
  end.setHours(23,59,59,999);
  
  while (currentDate <= end) {
    const dStr = currentDate.toISOString().split('T')[0];
    dailyData[dStr] = { date: dStr, Consignado: 0, Facturado: 0 };
    currentDate.setDate(currentDate.getDate() + 1);
  }

  consignments.forEach(c => {
    const dStr = c.createdAt.toISOString().split('T')[0];
    if (dailyData[dStr]) {
      dailyData[dStr].Consignado += c.total;
      if (c.status === 'CONVERTED') {
        dailyData[dStr].Facturado += c.total;
      }
    }
  });

  const chartData = Object.values(dailyData);

  return {
    consignments: consignments.map(c => ({
      id: c.id,
      date: c.createdAt.toISOString(),
      user: c.user?.name || 'Vendedor',
      customer: c.customer?.name || 'Público en General',
      total: c.total,
      status: c.status,
      itemsCount: c.items.reduce((acc, item) => acc + item.quantity, 0)
    })),
    metrics: {
      totalConsigned,
      activeConsigned,
      convertedConsigned,
      totalCount: consignments.length,
      activeCount,
      convertedCount,
      conversionRate: consignments.length > 0 ? (convertedCount / consignments.length) * 100 : 0
    },
    topCustomers,
    topProducts,
    chartData
  };
}

export async function getTopCustomersReport(
  startDate: Date,
  endDate: Date,
  branchIdFilter?: string,
  customerIdFilter?: string
) {
  const session = await getSession();
  const branch = await getActiveBranch();
  if (!branch) return [];
  
  const tenantId = session?.tenantId || branch.tenantId;
  if (!tenantId) return [];
  
  const tenantBranches = await prisma.branch.findMany({
    where: { tenantId, isActive: true },
    select: { id: true }
  });
  const tenantBranchIds = tenantBranches.map(b => b.id);
  
  let branchCondition: any = branch.id === 'GLOBAL' ? { branchId: { in: tenantBranchIds } } : { branchId: branch.id };
  if (branchIdFilter && branchIdFilter !== 'ALL') {
    if (tenantBranchIds.includes(branchIdFilter)) {
      branchCondition = { branchId: branchIdFilter };
    }
  }

  const customerCondition = (customerIdFilter && customerIdFilter !== 'ALL') ? { customerId: customerIdFilter } : { customerId: { not: null } };

  const sales = await prisma.sale.findMany({
    where: {
      ...branchCondition,
      ...customerCondition,
      createdAt: { gte: startDate, lte: endDate },
      status: { not: 'CANCELLED' }
    },
    include: {
      customer: true
    }
  });

  const customerMap = new Map();
  sales.forEach(sale => {
    if (!sale.customerId) return;
    const name = sale.customer?.name || "Sin Nombre";
    const phone = sale.customer?.phone || "Sin Teléfono";
    const email = sale.customer?.email || "Sin Correo";
    const id = sale.customerId;
    const existing = customerMap.get(id) || { 
      id, 
      name, 
      phone, 
      email, 
      totalPurchased: 0, 
      orderCount: 0,
      lastPurchaseDate: sale.createdAt
    };
    existing.totalPurchased += sale.total;
    existing.orderCount += 1;
    if (new Date(sale.createdAt) > new Date(existing.lastPurchaseDate)) {
      existing.lastPurchaseDate = sale.createdAt;
    }
    customerMap.set(id, existing);
  });

  const result = Array.from(customerMap.values())
    .sort((a, b) => b.totalPurchased - a.totalPurchased);

  return result;
}

export async function getTopProductsReport(
  startDate: Date,
  endDate: Date,
  branchIdFilter?: string,
  categoryFilter?: string
) {
  const session = await getSession();
  const branch = await getActiveBranch();
  if (!branch) return [];
  
  const tenantId = session?.tenantId || branch.tenantId;
  if (!tenantId) return [];
  
  const tenantBranches = await prisma.branch.findMany({
    where: { tenantId, isActive: true },
    select: { id: true }
  });
  const tenantBranchIds = tenantBranches.map(b => b.id);
  
  let branchCondition: any = branch.id === 'GLOBAL' ? { branchId: { in: tenantBranchIds } } : { branchId: branch.id };
  if (branchIdFilter && branchIdFilter !== 'ALL') {
    if (tenantBranchIds.includes(branchIdFilter)) {
      branchCondition = { branchId: branchIdFilter };
    }
  }

  const categoryCondition = (categoryFilter && categoryFilter !== 'ALL') 
    ? { product: { category: categoryFilter } } 
    : {};

  const saleItems = await prisma.saleItem.findMany({
    where: {
      sale: {
        ...branchCondition,
        createdAt: { gte: startDate, lte: endDate },
        status: { not: 'CANCELLED' }
      },
      ...categoryCondition
    },
    include: {
      product: true
    }
  });

  const productMap = new Map();
  saleItems.forEach(item => {
    const id = item.productId;
    const name = item.product?.name || "Producto Desconocido";
    const sku = item.product?.sku || "S/K";
    const category = item.product?.category || "Sin Categoría";
    const cost = item.product?.cost || 0;
    const price = item.product?.price || 0;
    const existing = productMap.get(id) || {
      id,
      name,
      sku,
      category,
      cost,
      price,
      quantitySold: 0,
      totalRevenue: 0,
      totalCost: 0
    };
    existing.quantitySold += item.quantity;
    existing.totalRevenue += (item.quantity * item.price);
    existing.totalCost += (item.quantity * item.product.cost);
    productMap.set(id, existing);
  });

  const result = Array.from(productMap.values())
    .map(p => {
      const grossProfit = p.totalRevenue - p.totalCost;
      const margin = p.totalRevenue > 0 ? (grossProfit / p.totalRevenue) * 100 : 0;
      return {
        ...p,
        grossProfit,
        margin
      };
    })
    .sort((a, b) => b.quantitySold - a.quantitySold);

  return result;
}

export async function getTopCategoriesReport(
  startDate: Date,
  endDate: Date,
  branchIdFilter?: string
) {
  const session = await getSession();
  const branch = await getActiveBranch();
  if (!branch) return [];
 
  const tenantId = session?.tenantId || branch.tenantId;
  if (!tenantId) return [];
  
  const tenantBranches = await prisma.branch.findMany({
    where: { tenantId, isActive: true },
    select: { id: true }
  });
  const tenantBranchIds = tenantBranches.map(b => b.id);
  
  let branchCondition: any = branch.id === 'GLOBAL' ? { branchId: { in: tenantBranchIds } } : { branchId: branch.id };
  if (branchIdFilter && branchIdFilter !== 'ALL') {
    if (tenantBranchIds.includes(branchIdFilter)) {
      branchCondition = { branchId: branchIdFilter };
    }
  }

  const saleItems = await prisma.saleItem.findMany({
    where: {
      sale: {
        ...branchCondition,
        createdAt: { gte: startDate, lte: endDate },
        status: { not: 'CANCELLED' }
      }
    },
    include: {
      satItem: true, // safe optional
      product: true
    } as any
  });

  const categoryMap = new Map();
  saleItems.forEach(item => {
    const category = (item.product as any)?.category || "Sin Categoría";
    const existing = categoryMap.get(category) || {
      category,
      quantitySold: 0,
      totalRevenue: 0,
      totalCost: 0
    };
    existing.quantitySold += item.quantity;
    existing.totalRevenue += (item.quantity * item.price);
    existing.totalCost += (item.quantity * ((item.product as any)?.cost || 0));
    categoryMap.set(category, existing);
  });

  const result = Array.from(categoryMap.values())
    .map(c => {
      const grossProfit = c.totalRevenue - c.totalCost;
      const margin = c.totalRevenue > 0 ? (grossProfit / c.totalRevenue) * 100 : 0;
      return {
        ...c,
        grossProfit,
        margin
      };
    })
    .sort((a, b) => b.totalRevenue - a.totalRevenue);

  return result;
}

export async function getSalesBySellerReport(
  startDate: Date,
  endDate: Date,
  branchIdFilter?: string
) {
  const session = await getSession();
  const branch = await getActiveBranch();
  if (!branch) return [];
 
  const tenantId = session?.tenantId || branch.tenantId;
  if (!tenantId) return [];
  
  const tenantBranches = await prisma.branch.findMany({
    where: { tenantId, isActive: true },
    select: { id: true }
  });
  const tenantBranchIds = tenantBranches.map(b => b.id);
  
  let branchCondition: any = branch.id === 'GLOBAL' ? { branchId: { in: tenantBranchIds } } : { branchId: branch.id };
  if (branchIdFilter && branchIdFilter !== 'ALL') {
    if (tenantBranchIds.includes(branchIdFilter)) {
      branchCondition = { branchId: branchIdFilter };
    }
  }

  const sales = await prisma.sale.findMany({
    where: {
      ...branchCondition,
      createdAt: { gte: startDate, lte: endDate },
      status: { not: 'CANCELLED' }
    },
    include: {
      user: true
    }
  });

  const sellerMap = new Map();
  sales.forEach(sale => {
    const userId = sale.userId;
    const name = sale.user?.name || sale.user?.email || "Vendedor Desconocido";
    const commissionPct = sale.user?.commissionPct || 0;
    
    const existing = sellerMap.get(userId) || {
      userId,
      name,
      totalSales: 0,
      salesCount: 0,
      commissionPct,
      earnedCommission: 0
    };
    
    existing.totalSales += sale.total;
    existing.salesCount += 1;
    existing.earnedCommission += (sale.total * (commissionPct / 100));
    sellerMap.set(userId, existing);
  });

  const result = Array.from(sellerMap.values())
    .map(s => {
      const avgTicket = s.salesCount > 0 ? (s.totalSales / s.salesCount) : 0;
      return {
        ...s,
        avgTicket
      };
    })
    .sort((a, b) => b.totalSales - a.totalSales);

  return result;
}

export async function getInventoryMovementReport(
  startDate: Date,
  endDate: Date,
  branchIdFilter?: string,
  typeFilter?: string
) {
  const session = await getSession();
  const branch = await getActiveBranch();
  if (!branch) return { movements: [], metrics: { totalCount: 0, itemsAdded: 0, itemsRemoved: 0 } };
  
  const tenantId = session?.tenantId || branch.tenantId;
  if (!tenantId) return { movements: [], metrics: { totalCount: 0, itemsAdded: 0, itemsRemoved: 0 } };
  
  const tenantBranches = await prisma.branch.findMany({
    where: { tenantId, isActive: true },
    select: { id: true }
  });
  const tenantBranchIds = tenantBranches.map(b => b.id);
  
  let branchCondition: any = branch.id === 'GLOBAL' 
    ? { branchId: { in: tenantBranchIds } } 
    : { branchId: branch.id };
    
  if (branchIdFilter && branchIdFilter !== 'ALL') {
    if (tenantBranchIds.includes(branchIdFilter)) {
      branchCondition = { branchId: branchIdFilter };
    } else {
      branchCondition = { branchId: { in: tenantBranchIds } };
    }
  }

  const typeCondition = (typeFilter && typeFilter !== 'ALL') ? { type: typeFilter } : {};

  const movements = await prisma.inventoryMovement.findMany({
    where: {
      product: branchCondition,
      createdAt: { gte: startDate, lte: endDate },
      ...typeCondition
    },
    include: {
      product: true,
      user: true
    },
    orderBy: { createdAt: 'desc' }
  });

  let itemsAdded = 0;
  let itemsRemoved = 0;

  movements.forEach(m => {
    if (m.quantity > 0) {
      itemsAdded += m.quantity;
    } else {
      itemsRemoved += Math.abs(m.quantity);
    }
  });

  return {
    movements,
    metrics: {
      totalCount: movements.length,
      itemsAdded,
      itemsRemoved
    }
  };
}

export async function getRestockReportData(
  startDate: Date,
  endDate: Date,
  branchIdFilter?: string,
  categoryFilter?: string
) {
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
  
  let branchCondition: any = branch.id === 'GLOBAL' 
    ? { branchId: { in: tenantBranchIds } } 
    : { branchId: branch.id };
    
  if (branchIdFilter && branchIdFilter !== 'ALL') {
    if (tenantBranchIds.includes(branchIdFilter)) {
      branchCondition = { branchId: branchIdFilter };
    } else {
      branchCondition = { branchId: { in: tenantBranchIds } };
    }
  }

  const categoryCondition = (categoryFilter && categoryFilter !== 'ALL') 
    ? { category: categoryFilter } 
    : {};

  const products = await prisma.product.findMany({
    where: {
      ...branchCondition,
      ...categoryCondition,
      isActive: true
    },
    orderBy: { name: 'asc' }
  });

  const saleItems = await prisma.saleItem.findMany({
    where: {
      sale: {
        ...branchCondition,
        createdAt: { gte: startDate, lte: endDate },
        status: { not: 'CANCELLED' }
      },
      product: categoryCondition
    },
    select: {
      productId: true,
      quantity: true
    }
  });

  const salesMap = new Map<string, number>();
  saleItems.forEach(item => {
    const current = salesMap.get(item.productId) || 0;
    salesMap.set(item.productId, current + item.quantity);
  });

  const msDiff = endDate.getTime() - startDate.getTime();
  const daysDiff = Math.max(1, Math.ceil(msDiff / (1000 * 60 * 60 * 24)));

  const data = products.map(p => {
    const quantitySold = salesMap.get(p.id) || 0;
    const dailyAvg = quantitySold / daysDiff;
    return {
      id: p.id,
      name: p.name,
      sku: p.sku || 'N/A',
      category: p.category || 'Sin Categoría',
      stock: p.stock || 0,
      cost: p.cost || 0,
      price: p.price || 0,
      quantitySold,
      dailyAvg
    };
  });

  return data;
}



