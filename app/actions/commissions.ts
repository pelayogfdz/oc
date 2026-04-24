'use server';

import { prisma } from '@/lib/prisma';
import { getActiveBranch, getActiveUser } from './auth';

export async function getUsersHierarchy() {
  const branch = await getActiveBranch();
  
  const whereClause = branch.id === 'GLOBAL' ? {} : { branchId: branch.id };

  const users = await prisma.user.findMany({
    where: whereClause,
    include: {
      manager: true,
      subordinates: true
    }
  });

  return users;
}

export async function updateCommissionProfile(userId: string, data: any) {
  const branch = await getActiveBranch();
  
  // Basic validation that user exists and belongs to branch (unless global)
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error('User not found.');
  }
  
  if (branch.id !== 'GLOBAL' && user.branchId !== branch.id) {
    throw new Error('User does not belong to this branch.');
  }

  // Prevent cyclical references later? For now just assign.
  if (data.managerId === userId) {
    throw new Error('A user cannot be their own manager.');
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      managerId: data.managerId || null,
      commissionRole: data.commissionRole || null,
      commissionPct: parseFloat(data.commissionPct) || 0,
      monthlyGoal: parseFloat(data.monthlyGoal) || 0,
      bonusAmount: parseFloat(data.bonusAmount) || 0,
      teamBonusAmount: parseFloat(data.teamBonusAmount) || 0,
    }
  });

  return { success: true };
}

export async function getCommissionReport(month: number, year: number) {
  const branch = await getActiveBranch();

  // Dates for the month
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  // 1. Fetch all users from the branch (or all branches if GLOBAL)
  const whereClause = branch.id === 'GLOBAL' ? {} : { branchId: branch.id };

  const users = await prisma.user.findMany({
    where: whereClause,
    select: {
      id: true,
      name: true,
      commissionRole: true,
      commissionPct: true,
      monthlyGoal: true,
      bonusAmount: true,
      teamBonusAmount: true,
      managerId: true,
      sales: {
        where: {
          createdAt: { gte: startDate, lte: endDate },
          status: 'COMPLETED'
        },
        select: {
          total: true
        }
      }
    }
  });

  // Calculate Base Stats
  const rawStats = users.map(u => {
    const totalSales = u.sales.reduce((acc, sale) => acc + sale.total, 0);
    return {
      id: u.id,
      name: u.name,
      role: u.commissionRole || 'VENDEDOR',
      monthlyGoal: u.monthlyGoal,
      commissionPct: u.commissionPct,
      bonusAmount: u.bonusAmount,
      teamBonusAmount: u.teamBonusAmount,
      managerId: u.managerId,
      personalSales: totalSales,
      teamSales: 0, 
      totalSalesBase: totalSales, // Personal + Subordinates (if applicable)
      
      commissionsEarned: 0,
      bonusEarned: 0,
      teamBonusEarned: 0,
      totalEarned: 0,
      unlockedBonus: false,
    };
  });

  const statsMap = new Map(rawStats.map(s => [s.id, s]));

  // Roll-up logic (Assuming 3-tier: VENDEDOR -> LIDER -> COORDINADOR)
  
  // A) Ventas de Equipo para Líderes
  for (const stat of rawStats) {
    if (stat.managerId && statsMap.has(stat.managerId)) {
      const manager = statsMap.get(stat.managerId)!;
      if (manager.role === 'LIDER' || manager.role === 'COORDINADOR') {
        manager.teamSales += stat.personalSales;
        manager.totalSalesBase += stat.personalSales; // Includes their team
      }
    }
  }

  // B) Ventas de Organización para Coordinadores (Rollup from leaders)
  for (const stat of rawStats) {
    if (stat.role === 'LIDER' && stat.managerId && statsMap.has(stat.managerId)) {
       const director = statsMap.get(stat.managerId)!;
       if (director.role === 'COORDINADOR') {
          // Add the Leader's total team sales to the Coordinator
          director.teamSales += stat.totalSalesBase;
          director.totalSalesBase += stat.totalSalesBase;
       }
    }
  }

  // C) Calcular Comisiones y Bonos
  for (const stat of rawStats) {
    if (stat.role === 'VENDEDOR') {
      // Ganan comisión sobre Venta Personal
      stat.commissionsEarned = stat.personalSales * (stat.commissionPct / 100);
      
      // Bono Individual si llega a cuota
      if (stat.monthlyGoal > 0 && stat.personalSales >= stat.monthlyGoal) {
        stat.bonusEarned = stat.bonusAmount;
        stat.unlockedBonus = true;
      }
      
      // Bonus de equipo (Se inyecta abajo si su líder llega a la meta)
    } 
    else if (stat.role === 'LIDER_SECUNDARIO') {
      // Ganan comisión sobre Venta Personal
      stat.commissionsEarned = stat.personalSales * (stat.commissionPct / 100);
      
      // Bono Individual si llega a cuota
      if (stat.monthlyGoal > 0 && stat.personalSales >= stat.monthlyGoal) {
        stat.bonusEarned = stat.bonusAmount;
        stat.unlockedBonus = true;
      }
    }
    else if (stat.role === 'LIDER') {
      // Ganan comisión sobre Venta Personal (a veces cero si solo ganan por equipo, pero dejamos flexible)
      stat.commissionsEarned = stat.personalSales * (stat.commissionPct / 100);
      
      // Bono si el Equipo llega a cuota
      if (stat.monthlyGoal > 0 && stat.totalSalesBase >= stat.monthlyGoal) {
        stat.bonusEarned = stat.bonusAmount;
        stat.unlockedBonus = true;
        
        // Repartir bono de equipo a subordinados
        for (const sub of rawStats) {
          if (sub.managerId === stat.id && (sub.role === 'VENDEDOR' || sub.role === 'LIDER_SECUNDARIO')) {
            sub.teamBonusEarned += stat.teamBonusAmount;
          }
        }
      }
    }
    else if (stat.role === 'COORDINADOR') {
      // Coordinador gana Override Commission sobre todo el volumen de su organización (leaders and indirect vendors)
      stat.commissionsEarned = stat.totalSalesBase * (stat.commissionPct / 100);
      
      if (stat.monthlyGoal > 0 && stat.totalSalesBase >= stat.monthlyGoal) {
        stat.bonusEarned = stat.bonusAmount;
        stat.unlockedBonus = true;
      }
    }

    stat.totalEarned = stat.commissionsEarned + stat.bonusEarned + stat.teamBonusEarned;
  }

  // D) Split Lider Secundario Commissions (Se lleva la mitad de la comisión del líder)
  const secondaryLeadersByManager = new Map<string, any[]>();
  for (const stat of rawStats) {
    if (stat.role === 'LIDER_SECUNDARIO' && stat.managerId) {
      if (!secondaryLeadersByManager.has(stat.managerId)) {
        secondaryLeadersByManager.set(stat.managerId, []);
      }
      secondaryLeadersByManager.get(stat.managerId)!.push(stat);
    }
  }

  for (const [managerId, secLeaders] of secondaryLeadersByManager.entries()) {
    const leader = statsMap.get(managerId);
    if (leader && (leader.role === 'LIDER' || leader.role === 'COORDINADOR')) {
      const splitAmount = (leader.commissionsEarned / 2) / secLeaders.length;
      leader.commissionsEarned -= (leader.commissionsEarned / 2);
      
      for (const secLeader of secLeaders) {
        secLeader.commissionsEarned += splitAmount;
        secLeader.totalEarned = secLeader.commissionsEarned + secLeader.bonusEarned + secLeader.teamBonusEarned;
      }
      leader.totalEarned = leader.commissionsEarned + leader.bonusEarned + leader.teamBonusEarned;
    }
  }

  return rawStats;
}
