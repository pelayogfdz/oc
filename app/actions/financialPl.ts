'use server';

import { prisma } from '@/lib/prisma';
import { getActiveBranch, getSession } from './auth';

export interface ExpenseCategoryBreakdown {
  category: string;
  amount: number;
  percentage: number;
  count: number;
}

export interface BranchFinancialRow {
  branchId: string;
  branchName: string;
  grossSales: number;
  returns: number;
  netSales: number;
  cogs: number;
  grossProfit: number;
  grossMargin: number;
  expenses: number;
  payroll: number;
  commissions: number;
  totalOpex: number;
  ebitda: number;
  ebitdaMargin: number;
  orderCount: number;
}

export interface FinancialPLData {
  period: {
    startDate: string;
    endDate: string;
    daysCount: number;
  };
  filterBranchId: string;
  filterBranchName: string;
  isConsolidated: boolean;
  
  // 1. Ingresos (Revenue)
  revenue: {
    grossSales: number;
    returns: number;
    netSales: number;
    ordersCount: number;
    averageTicket: number;
  };
  
  // 2. Costo de Ventas (COGS)
  cogs: {
    totalCost: number;
    grossProfit: number;
    grossMargin: number;
  };
  
  // 3. Gastos Operativos (OPEX)
  opex: {
    directExpenses: number;
    payrollCost: number;
    commissions: number;
    totalOpex: number;
    opexPercentage: number;
    expensesByCategory: ExpenseCategoryBreakdown[];
    employeeCount: number;
  };
  
  // 4. EBITDA
  ebitda: {
    amount: number;
    margin: number;
  };
  
  // 5. Impuestos y Utilidad Neta
  taxesAndNet: {
    ivaCollected: number; // IVA trasladado en ventas
    ivaPaid: number;      // IVA pagado en gastos
    netIvaPayable: number;
    estimatedIncomeTax: number; // ISR corporativo estimado (30%)
    netIncome: number;
    netMargin: number;
  };
  
  // 6. Balance Sintético & Situación Financiera
  balanceSheet: {
    cashInRegisters: number;
    accountsReceivable: number; // CxC Clientes
    valuedInventoryAtCost: number; // Inventario a costo
    totalCurrentAssets: number;
    
    accountsPayable: number; // CxP Proveedores
    pendingTaxes: number;
    totalCurrentLiabilities: number;
    
    netWorkingCapital: number;
    currentRatio: number; // Activo Circulante / Pasivo Circulante
    acidTestRatio: number; // (Activo Circulante - Inventario) / Pasivo Circulante
  };
  
  // 7. Matriz de Sucursales
  branchBreakdown: BranchFinancialRow[];

  // 8. Evolución Diaria / Mensual para Gráficas
  timeline: {
    date: string;
    dateFormatted: string;
    sales: number;
    cogs: number;
    expenses: number;
    grossProfit: number;
    ebitda: number;
  }[];
}

export async function getFinancialPLReport(
  startDateInput: Date | string,
  endDateInput: Date | string,
  branchIdFilter: string = 'ALL'
): Promise<FinancialPLData> {
  const session = await getSession();
  const activeBranch = await getActiveBranch();
  
  const tenantId = session?.tenantId || activeBranch?.tenantId;
  if (!tenantId) {
    throw new Error('Inquilino no autenticado');
  }

  const startDate = new Date(startDateInput);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(endDateInput);
  endDate.setHours(23, 59, 59, 999);

  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  const daysCount = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  // Fetch all tenant branches
  const tenantBranches = await prisma.branch.findMany({
    where: { tenantId, isActive: true },
    select: { id: true, name: true }
  });
  const tenantBranchIds = tenantBranches.map(b => b.id);
  const branchMap = new Map(tenantBranches.map(b => [b.id, b.name]));

  const isConsolidated = branchIdFilter === 'ALL' || branchIdFilter === 'GLOBAL';
  const filterBranchName = isConsolidated 
    ? 'Todas las Sucursales (Consolidado)' 
    : (branchMap.get(branchIdFilter) || 'Sucursal Seleccionada');

  const targetBranchIds = isConsolidated ? tenantBranchIds : [branchIdFilter];

  // 1. Fetch Sales with SaleItems and Product Costs
  const sales = await prisma.sale.findMany({
    where: {
      branchId: { in: targetBranchIds },
      status: 'COMPLETED',
      createdAt: { gte: startDate, lte: endDate }
    },
    include: {
      items: {
        include: {
          product: {
            select: { cost: true, name: true, sku: true }
          },
          variant: {
            select: { cost: true }
          }
        }
      }
    }
  });

  // 2. Fetch Returns
  const returns = await prisma.saleReturn.findMany({
    where: {
      branchId: { in: targetBranchIds },
      createdAt: { gte: startDate, lte: endDate }
    },
    select: {
      totalRefund: true,
      branchId: true,
      createdAt: true
    }
  });

  // 3. Fetch Expenses
  const expenses = await prisma.expense.findMany({
    where: {
      branchId: isConsolidated ? { in: targetBranchIds } : branchIdFilter,
      createdAt: { gte: startDate, lte: endDate }
    },
    select: {
      category: true,
      amount: true,
      branchId: true,
      createdAt: true
    }
  });

  // 4. Fetch Employees and Payroll Cost
  const employees = await prisma.user.findMany({
    where: {
      tenantId,
      ...(isConsolidated ? {} : { branchId: branchIdFilter })
    },
    select: {
      id: true,
      name: true,
      dailySalary: true,
      imssSalary: true,
      branchId: true
    }
  });

  // 5. Fetch Balance Sheet Snapshot Data
  // 5.1 Open Cash in Sessions
  const openSessions = await prisma.cashSession.findMany({
    where: {
      branchId: { in: targetBranchIds },
      status: 'OPEN'
    },
    select: {
      initialAmount: true,
      id: true
    }
  });
  const totalCashInRegisters = openSessions.reduce((sum, s) => sum + (s.initialAmount || 0), 0);

  // 5.2 Accounts Receivable (Customer Credit Balances)
  const customers = await prisma.customer.findMany({
    where: {
      creditBalance: { gt: 0 }
    },
    select: {
      creditBalance: true
    }
  });
  const totalAccountsReceivable = customers.reduce((sum, c) => sum + (c.creditBalance || 0), 0);

  // 5.3 Valued Inventory at Cost
  const inventoryProducts = await prisma.product.findMany({
    where: {
      branchId: { in: targetBranchIds },
      isActive: true,
      isService: false
    },
    select: {
      stock: true,
      cost: true
    }
  });
  const totalValuedInventoryAtCost = inventoryProducts.reduce((sum, p) => {
    return sum + (Math.max(0, p.stock) * (p.cost || 0));
  }, 0);

  // 5.4 Accounts Payable (Supplier Debts)
  const pendingPurchases = await prisma.purchase.findMany({
    where: {
      branchId: { in: targetBranchIds },
      status: { not: 'CANCELLED' },
      balanceDue: { gt: 0 }
    },
    select: {
      balanceDue: true
    }
  });
  const totalAccountsPayable = pendingPurchases.reduce((sum, p) => sum + (p.balanceDue || 0), 0);

  // ====== METRIC CALCULATIONS ======

  // Revenue
  const grossSales = sales.reduce((sum, s) => sum + (s.total || 0), 0);
  const totalReturns = returns.reduce((sum, r) => sum + (r.totalRefund || 0), 0);
  const netSales = Math.max(0, grossSales - totalReturns);
  const ordersCount = sales.length;
  const averageTicket = ordersCount > 0 ? netSales / ordersCount : 0;

  // Cost of Goods Sold (COGS)
  let totalCogs = 0;
  for (const sale of sales) {
    for (const item of sale.items) {
      const unitCost = item.variant?.cost ?? item.product?.cost ?? 0;
      totalCogs += unitCost * item.quantity;
    }
  }

  // Adjust COGS for returns proportionally
  if (grossSales > 0 && totalReturns > 0) {
    const returnRatio = totalReturns / grossSales;
    totalCogs = Math.max(0, totalCogs * (1 - returnRatio));
  }

  const grossProfit = netSales - totalCogs;
  const grossMargin = netSales > 0 ? (grossProfit / netSales) * 100 : 0;

  // Direct Expenses & Category Breakdown
  const totalDirectExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const categoryMap = new Map<string, { amount: number; count: number }>();

  for (const exp of expenses) {
    const cat = exp.category?.trim() || 'Otros Gastos';
    const curr = categoryMap.get(cat) || { amount: 0, count: 0 };
    curr.amount += exp.amount || 0;
    curr.count += 1;
    categoryMap.set(cat, curr);
  }

  const expensesByCategory: ExpenseCategoryBreakdown[] = Array.from(categoryMap.entries())
    .map(([category, data]) => ({
      category,
      amount: data.amount,
      percentage: totalDirectExpenses > 0 ? (data.amount / totalDirectExpenses) * 100 : 0,
      count: data.count
    }))
    .sort((a, b) => b.amount - a.amount);

  // Payroll Cost Calculation
  let totalPayrollCost = 0;
  for (const emp of employees) {
    const baseDaily = emp.dailySalary || 0;
    const baseImss = emp.imssSalary || 0;
    const salaryCost = baseDaily * daysCount;
    const employerImssCost = (baseImss * 0.20) * daysCount; // Standard estimated employer burden
    totalPayrollCost += (salaryCost + employerImssCost);
  }

  // Seller Commissions
  let totalCommissions = 0;
  for (const sale of sales) {
    if ((sale as any).commissionAmount) {
      totalCommissions += (sale as any).commissionAmount;
    }
  }

  // Total OPEX & EBITDA
  const totalOpex = totalDirectExpenses + totalPayrollCost + totalCommissions;
  const opexPercentage = netSales > 0 ? (totalOpex / netSales) * 100 : 0;

  const ebitdaAmount = grossProfit - totalOpex;
  const ebitdaMargin = netSales > 0 ? (ebitdaAmount / netSales) * 100 : 0;

  // Taxes (16% IVA Standard & Estimated 30% ISR on positive EBITDA)
  const ivaCollected = (netSales / 1.16) * 0.16;
  const ivaPaid = (totalDirectExpenses / 1.16) * 0.16;
  const netIvaPayable = Math.max(0, ivaCollected - ivaPaid);
  const estimatedIncomeTax = ebitdaAmount > 0 ? ebitdaAmount * 0.30 : 0;

  const netIncome = ebitdaAmount - estimatedIncomeTax;
  const netMargin = netSales > 0 ? (netIncome / netSales) * 100 : 0;

  // Balance Sheet Metrics
  const totalCurrentAssets = totalCashInRegisters + totalAccountsReceivable + totalValuedInventoryAtCost;
  const totalCurrentLiabilities = totalAccountsPayable + netIvaPayable;
  const netWorkingCapital = totalCurrentAssets - totalCurrentLiabilities;
  const currentRatio = totalCurrentLiabilities > 0 ? totalCurrentAssets / totalCurrentLiabilities : totalCurrentAssets;
  const acidTestRatio = totalCurrentLiabilities > 0 
    ? (totalCurrentAssets - totalValuedInventoryAtCost) / totalCurrentLiabilities 
    : (totalCurrentAssets - totalValuedInventoryAtCost);

  // Branch Matrix Breakdown
  const branchBreakdown: BranchFinancialRow[] = tenantBranches.map(b => {
    const bSales = sales.filter(s => s.branchId === b.id);
    const bReturns = returns.filter(r => r.branchId === b.id);
    const bExpenses = expenses.filter(e => e.branchId === b.id);
    const bEmployees = employees.filter(e => e.branchId === b.id);

    const bGross = bSales.reduce((sum, s) => sum + (s.total || 0), 0);
    const bRet = bReturns.reduce((sum, r) => sum + (r.totalRefund || 0), 0);
    const bNet = Math.max(0, bGross - bRet);

    let bCogs = 0;
    for (const s of bSales) {
      for (const item of s.items) {
        const uCost = item.variant?.cost ?? item.product?.cost ?? 0;
        bCogs += uCost * item.quantity;
      }
    }
    if (bGross > 0 && bRet > 0) {
      bCogs = Math.max(0, bCogs * (1 - (bRet / bGross)));
    }

    const bGrossProfit = bNet - bCogs;
    const bGrossMargin = bNet > 0 ? (bGrossProfit / bNet) * 100 : 0;

    const bExp = bExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    let bPayroll = 0;
    for (const emp of bEmployees) {
      const sal = (emp.dailySalary || 0) * daysCount;
      const imss = ((emp.imssSalary || 0) * 0.20) * daysCount;
      bPayroll += (sal + imss);
    }
    const bComm = bSales.reduce((sum, s) => sum + ((s as any).commissionAmount || 0), 0);
    const bTotalOpex = bExp + bPayroll + bComm;
    const bEbitda = bGrossProfit - bTotalOpex;
    const bEbitdaMargin = bNet > 0 ? (bEbitda / bNet) * 100 : 0;

    return {
      branchId: b.id,
      branchName: b.name,
      grossSales: bGross,
      returns: bRet,
      netSales: bNet,
      cogs: bCogs,
      grossProfit: bGrossProfit,
      grossMargin: bGrossMargin,
      expenses: bExp,
      payroll: bPayroll,
      commissions: bComm,
      totalOpex: bTotalOpex,
      ebitda: bEbitda,
      ebitdaMargin: bEbitdaMargin,
      orderCount: bSales.length
    };
  }).sort((a, b) => b.netSales - a.netSales);

  // Timeline / Daily evolution for charts
  const timelineMap = new Map<string, { sales: number; cogs: number; expenses: number; grossProfit: number; ebitda: number }>();
  
  // Initialize timeline slots
  const cur = new Date(startDate);
  while (cur <= endDate) {
    const dStr = cur.toISOString().split('T')[0];
    timelineMap.set(dStr, { sales: 0, cogs: 0, expenses: 0, grossProfit: 0, ebitda: 0 });
    cur.setDate(cur.getDate() + 1);
  }

  // Populate sales & cogs
  for (const s of sales) {
    const dStr = new Date(s.createdAt).toISOString().split('T')[0];
    const slot = timelineMap.get(dStr);
    if (slot) {
      slot.sales += s.total;
      let sCost = 0;
      for (const item of s.items) {
        sCost += (item.variant?.cost ?? item.product?.cost ?? 0) * item.quantity;
      }
      slot.cogs += sCost;
      slot.grossProfit += (s.total - sCost);
      slot.ebitda += (s.total - sCost);
    }
  }

  // Populate expenses
  for (const e of expenses) {
    const dStr = new Date(e.createdAt).toISOString().split('T')[0];
    const slot = timelineMap.get(dStr);
    if (slot) {
      slot.expenses += e.amount;
      slot.ebitda -= e.amount;
    }
  }

  // Distribute daily payroll
  const dailyPayroll = totalPayrollCost / daysCount;
  for (const slot of timelineMap.values()) {
    slot.ebitda -= dailyPayroll;
  }

  const timeline = Array.from(timelineMap.entries()).map(([date, data]) => {
    const [y, m, d] = date.split('-');
    return {
      date,
      dateFormatted: `${d}/${m}`,
      sales: Math.round(data.sales),
      cogs: Math.round(data.cogs),
      expenses: Math.round(data.expenses),
      grossProfit: Math.round(data.grossProfit),
      ebitda: Math.round(data.ebitda)
    };
  });

  return {
    period: {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      daysCount
    },
    filterBranchId: branchIdFilter,
    filterBranchName,
    isConsolidated,
    revenue: {
      grossSales,
      returns: totalReturns,
      netSales,
      ordersCount,
      averageTicket
    },
    cogs: {
      totalCost: totalCogs,
      grossProfit,
      grossMargin
    },
    opex: {
      directExpenses: totalDirectExpenses,
      payrollCost: totalPayrollCost,
      commissions: totalCommissions,
      totalOpex,
      opexPercentage,
      expensesByCategory,
      employeeCount: employees.length
    },
    ebitda: {
      amount: ebitdaAmount,
      margin: ebitdaMargin
    },
    taxesAndNet: {
      ivaCollected,
      ivaPaid,
      netIvaPayable,
      estimatedIncomeTax,
      netIncome,
      netMargin
    },
    balanceSheet: {
      cashInRegisters: totalCashInRegisters,
      accountsReceivable: totalAccountsReceivable,
      valuedInventoryAtCost: totalValuedInventoryAtCost,
      totalCurrentAssets,
      accountsPayable: totalAccountsPayable,
      pendingTaxes: netIvaPayable,
      totalCurrentLiabilities,
      netWorkingCapital,
      currentRatio,
      acidTestRatio
    },
    branchBreakdown,
    timeline
  };
}
