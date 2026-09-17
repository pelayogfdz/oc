import { describe, it, expect } from 'vitest';
import { computeStockAdjustment } from '@/lib/financialCalculations';

describe('computeStockAdjustment (Kardex y Movimientos de Inventario)', () => {
  it('debe incrementar el inventario ante una entrada (IN)', () => {
    const result = computeStockAdjustment({
      currentStock: 15,
      quantity: 10,
      type: 'IN'
    });

    expect(result.success).toBe(true);
    expect(result.stockModifier).toBe(10);
    expect(result.newStock).toBe(25);
  });

  it('debe decrementar el inventario ante una salida (OUT)', () => {
    const result = computeStockAdjustment({
      currentStock: 20,
      quantity: 5,
      type: 'OUT'
    });

    expect(result.success).toBe(true);
    expect(result.stockModifier).toBe(-5);
    expect(result.newStock).toBe(15);
  });

  it('debe decrementar el inventario ante un ajuste por merma/pérdida (ADJUSTMENT)', () => {
    const result = computeStockAdjustment({
      currentStock: 8,
      quantity: 3,
      type: 'ADJUSTMENT'
    });

    expect(result.success).toBe(true);
    expect(result.stockModifier).toBe(-3);
    expect(result.newStock).toBe(5);
  });

  it('debe rechazar una salida o ajuste si causa stock negativo', () => {
    const result = computeStockAdjustment({
      currentStock: 4,
      quantity: 5,
      type: 'OUT'
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('El stock no puede ser negativo.');
    expect(result.newStock).toBe(4); // Se mantiene intacto
  });

  it('debe permitir agotar el stock exactamente a 0', () => {
    const result = computeStockAdjustment({
      currentStock: 10,
      quantity: 10,
      type: 'OUT'
    });

    expect(result.success).toBe(true);
    expect(result.newStock).toBe(0);
  });

  it('debe rechazar cantidades menores o iguales a cero', () => {
    const resultZero = computeStockAdjustment({
      currentStock: 10,
      quantity: 0,
      type: 'IN'
    });
    expect(resultZero.success).toBe(false);
    expect(resultZero.error).toBe('La cantidad debe ser un número mayor a 0.');

    const resultNegative = computeStockAdjustment({
      currentStock: 10,
      quantity: -5,
      type: 'IN'
    });
    expect(resultNegative.success).toBe(false);
  });
});
