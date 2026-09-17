/**
 * Motor de cálculos financieros, fiscales y operativos de CAANMA.
 * Funciones puras y aisladas para garantizar cálculos exactos y auditables.
 */

export interface TaxItemInput {
  price: number;
  quantity: number;
  taxType?: 'IVA' | 'IEPS' | 'IVA_IEPS' | 'EXENTO' | string;
  taxRate?: number;
  iepsRate?: number;
}

export interface TaxBreakdownResult {
  subtotal: number;
  iva: number;
  ieps: number;
  exento: number;
  total: number;
}

/**
 * Desglosa impuestos mexicanos (IVA 16%, IEPS, IVA+IEPS compuesto y Exentos)
 * con soporte para factor de descuento proporcional.
 */
export function calculateTaxBreakdown(
  items: TaxItemInput[],
  discountFactor: number = 1
): TaxBreakdownResult {
  let totalIva = 0;
  let totalIeps = 0;
  let totalExento = 0;
  let totalSubtotal = 0;

  for (const item of items) {
    const itemPrice = typeof item.price === 'number' ? item.price : 0;
    const itemQty = typeof item.quantity === 'number' ? item.quantity : 0;
    const itemTotal = itemPrice * itemQty;

    const taxType = item.taxType || 'IVA';
    const taxRate = item.taxRate !== undefined && item.taxRate !== null ? item.taxRate : 16.0;
    const iepsRate = item.iepsRate !== undefined && item.iepsRate !== null ? item.iepsRate : 0.0;

    let basePrice = 0;
    let ivaAmt = 0;
    let iepsAmt = 0;

    if (taxType === 'IVA') {
      basePrice = itemTotal / (1 + taxRate / 100);
      ivaAmt = itemTotal - basePrice;
    } else if (taxType === 'IEPS') {
      basePrice = itemTotal / (1 + iepsRate / 100);
      iepsAmt = itemTotal - basePrice;
    } else if (taxType === 'IVA_IEPS') {
      basePrice = itemTotal / ((1 + iepsRate / 100) * (1 + taxRate / 100));
      iepsAmt = basePrice * (iepsRate / 100);
      ivaAmt = (basePrice + iepsAmt) * (taxRate / 100);
    } else {
      // EXENTO u otros
      basePrice = itemTotal;
      totalExento += itemTotal;
    }

    totalIva += ivaAmt;
    totalIeps += iepsAmt;
    totalSubtotal += basePrice;
  }

  const factor = Math.max(0, discountFactor);

  const subtotal = Math.round((totalSubtotal * factor) * 100) / 100;
  const iva = Math.round((totalIva * factor) * 100) / 100;
  const ieps = Math.round((totalIeps * factor) * 100) / 100;
  const exento = Math.round((totalExento * factor) * 100) / 100;
  const total = Math.round((subtotal + iva + ieps) * 100) / 100;

  return { subtotal, iva, ieps, exento, total };
}

export interface CreditCustomerInput {
  creditLimit: number;
  creditBalance: number;
}

export interface CreditValidationResult {
  valid: boolean;
  error?: string;
  availableCredit: number;
}

/**
 * Valida la autorización de crédito para un cliente y previene sobregiros.
 */
export function validateCustomerCredit(
  customer: CreditCustomerInput,
  saleTotal: number
): CreditValidationResult {
  const limit = typeof customer.creditLimit === 'number' ? customer.creditLimit : 0;
  const balance = typeof customer.creditBalance === 'number' ? customer.creditBalance : 0;

  if (limit <= 0) {
    return {
      valid: false,
      error: 'El cliente no tiene línea de crédito autorizada.',
      availableCredit: 0
    };
  }

  const available = Math.round((limit - balance) * 100) / 100;

  if ((balance + saleTotal) > limit) {
    return {
      valid: false,
      error: `El cliente excede su límite de crédito. Disponible: ${available.toFixed(2)}`,
      availableCredit: available
    };
  }

  return {
    valid: true,
    availableCredit: Math.round((available - saleTotal) * 100) / 100
  };
}

export interface InventoryAdjustmentInput {
  currentStock: number;
  quantity: number;
  type: 'IN' | 'OUT' | 'ADJUSTMENT' | string;
}

export interface InventoryAdjustmentResult {
  success: boolean;
  newStock: number;
  stockModifier: number;
  error?: string;
}

/**
 * Determina el impacto de un movimiento de Kardex asegurando stock no negativo.
 */
export function computeStockAdjustment(
  input: InventoryAdjustmentInput
): InventoryAdjustmentResult {
  const { currentStock, quantity, type } = input;

  if (quantity <= 0 || isNaN(quantity)) {
    return {
      success: false,
      newStock: currentStock,
      stockModifier: 0,
      error: 'La cantidad debe ser un número mayor a 0.'
    };
  }

  let stockModifier = 0;
  if (type === 'IN') {
    stockModifier = quantity;
  } else if (type === 'OUT' || type === 'ADJUSTMENT') {
    stockModifier = -quantity;
  } else {
    return {
      success: false,
      newStock: currentStock,
      stockModifier: 0,
      error: `Tipo de movimiento desconocido: ${type}`
    };
  }

  const newStock = currentStock + stockModifier;

  if (newStock < 0) {
    return {
      success: false,
      newStock: currentStock,
      stockModifier,
      error: 'El stock no puede ser negativo.'
    };
  }

  return {
    success: true,
    newStock,
    stockModifier
  };
}

export interface CommissionUserInput {
  id: string;
  name: string;
  role: 'VENDEDOR' | 'LIDER' | 'LIDER_SECUNDARIO' | 'COORDINADOR' | string;
  monthlyGoal: number;
  commissionPct: number;
  bonusAmount: number;
  teamBonusAmount: number;
  managerId: string | null;
  personalSales: number;
}

export interface CommissionUserOutput extends CommissionUserInput {
  teamSales: number;
  totalSalesBase: number;
  commissionsEarned: number;
  bonusEarned: number;
  teamBonusEarned: number;
  totalEarned: number;
  unlockedBonus: boolean;
}

/**
 * Calcula comisiones y bonos en jerarquía de 3 niveles:
 * VENDEDOR -> LIDER -> COORDINADOR (con soporte para LIDER_SECUNDARIO)
 */
export function computeCommissionHierarchy(
  users: CommissionUserInput[]
): CommissionUserOutput[] {
  const stats: CommissionUserOutput[] = users.map(u => ({
    ...u,
    teamSales: 0,
    totalSalesBase: u.personalSales,
    commissionsEarned: 0,
    bonusEarned: 0,
    teamBonusEarned: 0,
    totalEarned: 0,
    unlockedBonus: false,
  }));

  const statsMap = new Map(stats.map(s => [s.id, s]));

  // A) Ventas de Equipo para Líderes, Coordinadores y Líderes Secundarios
  for (const stat of stats) {
    if (stat.managerId && statsMap.has(stat.managerId)) {
      const manager = statsMap.get(stat.managerId)!;
      if (manager.role === 'LIDER' || manager.role === 'COORDINADOR' || manager.role === 'LIDER_SECUNDARIO') {
        manager.teamSales += stat.personalSales;
        manager.totalSalesBase += stat.personalSales;
      }
    }
  }

  // B) Ventas de Organización para Coordinadores (Rollup multinivel)
  for (const stat of stats) {
    if ((stat.role === 'LIDER' || stat.role === 'LIDER_SECUNDARIO' || stat.role === 'COORDINADOR') && stat.managerId && statsMap.has(stat.managerId)) {
      const director = statsMap.get(stat.managerId)!;
      if (director.role === 'COORDINADOR') {
        director.teamSales += stat.teamSales;
        director.totalSalesBase += stat.teamSales;
      }
    }
  }

  // C) Sincronizar ventas de equipo para Líderes Secundarios
  for (const stat of stats) {
    if (stat.role === 'LIDER_SECUNDARIO' && stat.managerId && statsMap.has(stat.managerId)) {
      const manager = statsMap.get(stat.managerId)!;
      if (manager.role === 'LIDER') {
        stat.totalSalesBase = manager.totalSalesBase;
        stat.teamSales = manager.totalSalesBase - stat.personalSales;
      }
    }
  }

  // D) Calcular Comisiones y Bonos
  for (const stat of stats) {
    if (stat.role === 'VENDEDOR') {
      stat.commissionsEarned = stat.personalSales * (stat.commissionPct / 100);
      if (stat.monthlyGoal > 0 && stat.personalSales >= stat.monthlyGoal) {
        stat.bonusEarned = stat.bonusAmount;
        stat.unlockedBonus = true;
      }
    } else if (stat.role === 'LIDER_SECUNDARIO') {
      stat.commissionsEarned = stat.totalSalesBase * (stat.commissionPct / 100);
      if (stat.monthlyGoal > 0 && stat.personalSales >= stat.monthlyGoal) {
        stat.bonusEarned = stat.bonusAmount;
        stat.unlockedBonus = true;
      }
    } else if (stat.role === 'LIDER') {
      stat.commissionsEarned = stat.totalSalesBase * (stat.commissionPct / 100);
      if (stat.monthlyGoal > 0 && stat.totalSalesBase >= stat.monthlyGoal) {
        stat.bonusEarned = stat.bonusAmount;
        stat.unlockedBonus = true;

        // Repartir bono de equipo a subordinados
        for (const sub of stats) {
          if (sub.managerId === stat.id && (sub.role === 'VENDEDOR' || sub.role === 'LIDER_SECUNDARIO')) {
            sub.teamBonusEarned += sub.teamBonusAmount;
          }
        }
      }
    } else if (stat.role === 'COORDINADOR') {
      stat.commissionsEarned = stat.totalSalesBase * (stat.commissionPct / 100);
      if (stat.monthlyGoal > 0 && stat.totalSalesBase >= stat.monthlyGoal) {
        stat.bonusEarned = stat.bonusAmount;
        stat.unlockedBonus = true;
      }
    }
  }

  // Totalizar
  for (const stat of stats) {
    stat.totalEarned = stat.commissionsEarned + stat.bonusEarned + stat.teamBonusEarned;
  }

  return stats;
}
