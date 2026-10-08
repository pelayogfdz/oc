import { describe, it, expect } from 'vitest';

describe('Lógica de Lotes y Control de Caducidades', () => {
  const today = new Date('2026-10-07T12:00:00Z');

  const getStatus = (expDateStr: string, baseDate = today) => {
    const expDate = new Date(expDateStr);
    const diffTime = expDate.getTime() - baseDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { statusType: 'EXPIRED', diffDays, label: `Vencido hace ${Math.abs(diffDays)} días` };
    if (diffDays === 0) return { statusType: 'EXPIRED', diffDays: 0, label: 'Vence Hoy' };
    if (diffDays <= 7) return { statusType: '7_DAYS', diffDays, label: `Vence en ${diffDays} días` };
    if (diffDays <= 15) return { statusType: '15_DAYS', diffDays, label: `Vence en ${diffDays} días` };
    if (diffDays <= 30) return { statusType: '30_DAYS', diffDays, label: `Vence en ${diffDays} días` };
    if (diffDays <= 60) return { statusType: '60_DAYS', diffDays, label: `Vence en ${diffDays} días` };
    if (diffDays <= 90) return { statusType: '90_DAYS', diffDays, label: `Vence en ${diffDays} días` };
    return { statusType: 'HEALTHY', diffDays, label: 'Vigente / Sano' };
  };

  it('debe clasificar correctamente un lote vencido', () => {
    const res = getStatus('2026-10-01T12:00:00Z');
    expect(res.statusType).toBe('EXPIRED');
    expect(res.diffDays).toBeLessThan(0);
  });

  it('debe clasificar como vencimiento hoy', () => {
    const res = getStatus('2026-10-07T12:00:00Z');
    expect(res.statusType).toBe('EXPIRED');
    expect(res.diffDays).toBe(0);
  });

  it('debe clasificar en ventana de alerta crítica (≤ 7 días)', () => {
    const res = getStatus('2026-10-12T12:00:00Z');
    expect(res.statusType).toBe('7_DAYS');
    expect(res.diffDays).toBe(5);
  });

  it('debe clasificar en ventana de alerta amarilla (≤ 30 días)', () => {
    const res = getStatus('2026-10-25T12:00:00Z');
    expect(res.statusType).toBe('30_DAYS');
    expect(res.diffDays).toBe(18);
  });

  it('debe clasificar como vigentes y saludables lotes lejanos (> 90 días)', () => {
    const res = getStatus('2027-05-01T12:00:00Z');
    expect(res.statusType).toBe('HEALTHY');
    expect(res.diffDays).toBeGreaterThan(90);
  });

  it('debe calcular el valor en riesgo total de lotes vencidos', () => {
    const batches = [
      { stock: 10, cost: 50, expDate: '2026-09-01' }, // Vencido: 500
      { stock: 5, cost: 100, expDate: '2026-08-15' },  // Vencido: 500
      { stock: 20, cost: 30, expDate: '2027-01-01' }   // Vigente: 600
    ];

    let expiredRiskValue = 0;
    batches.forEach(b => {
      const s = getStatus(b.expDate);
      if (s.diffDays <= 0) {
        expiredRiskValue += b.stock * b.cost;
      }
    });

    expect(expiredRiskValue).toBe(1000);
  });
});
