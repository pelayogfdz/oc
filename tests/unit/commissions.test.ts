import { describe, it, expect } from 'vitest';
import { computeCommissionHierarchy, CommissionUserInput } from '@/lib/financialCalculations';

describe('computeCommissionHierarchy (Jerarquía Multinivel de Comisiones)', () => {
  it('debe calcular la comisión de un vendedor individual sin meta alcanzada', () => {
    const users: CommissionUserInput[] = [
      {
        id: 'u1',
        name: 'Carlos Vendedor',
        role: 'VENDEDOR',
        monthlyGoal: 50000,
        commissionPct: 3, // 3%
        bonusAmount: 2000,
        teamBonusAmount: 0,
        managerId: null,
        personalSales: 30000
      }
    ];

    const [u1] = computeCommissionHierarchy(users);

    expect(u1.commissionsEarned).toBe(900); // 30000 * 0.03
    expect(u1.bonusEarned).toBe(0);
    expect(u1.unlockedBonus).toBe(false);
    expect(u1.totalEarned).toBe(900);
  });

  it('debe otorgar el bono individual al vendedor cuando alcanza o supera la cuota', () => {
    const users: CommissionUserInput[] = [
      {
        id: 'u1',
        name: 'Laura Vendedora',
        role: 'VENDEDOR',
        monthlyGoal: 40000,
        commissionPct: 4, // 4%
        bonusAmount: 3000,
        teamBonusAmount: 0,
        managerId: null,
        personalSales: 45000
      }
    ];

    const [u1] = computeCommissionHierarchy(users);

    expect(u1.commissionsEarned).toBe(1800); // 45000 * 0.04
    expect(u1.bonusEarned).toBe(3000);
    expect(u1.unlockedBonus).toBe(true);
    expect(u1.totalEarned).toBe(4800); // 1800 + 3000
  });

  it('debe acumular las ventas de vendedores subordinados hacia su Líder y repartir bono de equipo', () => {
    const users: CommissionUserInput[] = [
      {
        id: 'leader-1',
        name: 'Roberto Líder',
        role: 'LIDER',
        monthlyGoal: 100000, // Meta de equipo
        commissionPct: 2,    // 2% sobre total
        bonusAmount: 5000,
        teamBonusAmount: 0,
        managerId: null,
        personalSales: 40000
      },
      {
        id: 'seller-1',
        name: 'Ana Vendedora',
        role: 'VENDEDOR',
        monthlyGoal: 50000,
        commissionPct: 3,
        bonusAmount: 2000,
        teamBonusAmount: 1000, // Recibe 1000 si el líder cumple cuota
        managerId: 'leader-1',
        personalSales: 35000
      },
      {
        id: 'seller-2',
        name: 'Pedro Vendedor',
        role: 'VENDEDOR',
        monthlyGoal: 50000,
        commissionPct: 3,
        bonusAmount: 2000,
        teamBonusAmount: 1000,
        managerId: 'leader-1',
        personalSales: 30000
      }
    ];

    const results = computeCommissionHierarchy(users);
    const leader = results.find(r => r.id === 'leader-1')!;
    const seller1 = results.find(r => r.id === 'seller-1')!;
    const seller2 = results.find(r => r.id === 'seller-2')!;

    // Venta de equipo: 35000 + 30000 = 65000. Base total: 40000 (personal) + 65000 = 105000
    expect(leader.teamSales).toBe(65000);
    expect(leader.totalSalesBase).toBe(105000);

    // Meta cumplida para el líder (105,000 >= 100,000)
    expect(leader.unlockedBonus).toBe(true);
    expect(leader.bonusEarned).toBe(5000);
    expect(leader.commissionsEarned).toBe(2100); // 105000 * 0.02
    expect(leader.totalEarned).toBe(7100);

    // Los vendedores reciben su teamBonusAmount
    expect(seller1.teamBonusEarned).toBe(1000);
    expect(seller2.teamBonusEarned).toBe(1000);
  });

  it('debe sincronizar la base de ventas de un Líder Secundario con su Líder principal', () => {
    const users: CommissionUserInput[] = [
      {
        id: 'leader-main',
        name: 'Líder Titular',
        role: 'LIDER',
        monthlyGoal: 100000,
        commissionPct: 2,
        bonusAmount: 4000,
        teamBonusAmount: 0,
        managerId: null,
        personalSales: 20000
      },
      {
        id: 'seller-sub',
        name: 'Vendedor',
        role: 'VENDEDOR',
        monthlyGoal: 30000,
        commissionPct: 3,
        bonusAmount: 1000,
        teamBonusAmount: 500,
        managerId: 'leader-main',
        personalSales: 50000
      },
      {
        id: 'co-leader',
        name: 'Líder Secundario',
        role: 'LIDER_SECUNDARIO',
        monthlyGoal: 60000,
        commissionPct: 1, // 1%
        bonusAmount: 2000,
        teamBonusAmount: 0,
        managerId: 'leader-main',
        personalSales: 10000
      }
    ];

    const results = computeCommissionHierarchy(users);
    const coLeader = results.find(r => r.id === 'co-leader')!;
    const leaderMain = results.find(r => r.id === 'leader-main')!;

    // Total sucursal = 20000 + 50000 + 10000 = 80000
    expect(leaderMain.totalSalesBase).toBe(80000);
    expect(coLeader.totalSalesBase).toBe(80000);
    expect(coLeader.commissionsEarned).toBe(800); // 80000 * 0.01
  });
});
