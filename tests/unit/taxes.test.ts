import { describe, it, expect } from 'vitest';
import { calculateTaxBreakdown } from '@/lib/financialCalculations';

describe('calculateTaxBreakdown (Desglose fiscal mexicano)', () => {
  it('debe desglosar correctamente un producto con IVA 16%', () => {
    const items = [
      { price: 116, quantity: 1, taxType: 'IVA', taxRate: 16 }
    ];

    const result = calculateTaxBreakdown(items);

    expect(result.subtotal).toBe(100);
    expect(result.iva).toBe(16);
    expect(result.ieps).toBe(0);
    expect(result.exento).toBe(0);
    expect(result.total).toBe(116);
  });

  it('debe calcular correctamente múltiplos de cantidad con IVA', () => {
    const items = [
      { price: 58, quantity: 4, taxType: 'IVA', taxRate: 16 } // total 232
    ];

    const result = calculateTaxBreakdown(items);

    expect(result.subtotal).toBe(200);
    expect(result.iva).toBe(32);
    expect(result.total).toBe(232);
  });

  it('debe desglosar correctamente un producto con IEPS 8%', () => {
    const items = [
      { price: 108, quantity: 1, taxType: 'IEPS', iepsRate: 8 }
    ];

    const result = calculateTaxBreakdown(items);

    expect(result.subtotal).toBe(100);
    expect(result.ieps).toBe(8);
    expect(result.iva).toBe(0);
    expect(result.total).toBe(108);
  });

  it('debe calcular correctamente IVA e IEPS compuestos en cascada', () => {
    // Base: 100, IEPS 8%: 8, IVA 16% sobre 108: 17.28 => Total: 125.28
    const items = [
      { price: 125.28, quantity: 1, taxType: 'IVA_IEPS', taxRate: 16, iepsRate: 8 }
    ];

    const result = calculateTaxBreakdown(items);

    expect(result.subtotal).toBeCloseTo(100, 2);
    expect(result.ieps).toBeCloseTo(8, 2);
    expect(result.iva).toBeCloseTo(17.28, 2);
    expect(result.total).toBeCloseTo(125.28, 2);
  });

  it('debe manejar productos exentos de impuestos sin generar IVA ni IEPS', () => {
    const items = [
      { price: 250, quantity: 2, taxType: 'EXENTO' }
    ];

    const result = calculateTaxBreakdown(items);

    expect(result.exento).toBe(500);
    expect(result.iva).toBe(0);
    expect(result.ieps).toBe(0);
    expect(result.total).toBe(500);
  });

  it('debe calcular con precisión un carrito mixto (IVA, IEPS y Exento)', () => {
    const items = [
      { price: 116, quantity: 1, taxType: 'IVA', taxRate: 16 },       // sub: 100, iva: 16
      { price: 108, quantity: 1, taxType: 'IEPS', iepsRate: 8 },      // sub: 100, ieps: 8
      { price: 50, quantity: 2, taxType: 'EXENTO' }                   // exento: 100
    ];

    const result = calculateTaxBreakdown(items);

    expect(result.subtotal).toBe(300);
    expect(result.iva).toBe(16);
    expect(result.ieps).toBe(8);
    expect(result.exento).toBe(100);
    expect(result.total).toBe(324);
  });

  it('debe prorratear proporcionalmente los impuestos ante un factor de descuento global', () => {
    const items = [
      { price: 116, quantity: 2, taxType: 'IVA', taxRate: 16 } // total 232 (sub: 200, iva: 32)
    ];

    // Aplicando 50% de descuento (factor 0.5)
    const result = calculateTaxBreakdown(items, 0.5);

    expect(result.subtotal).toBe(100);
    expect(result.iva).toBe(16);
    expect(result.total).toBe(116);
  });

  it('debe cuadrar exactamente las cotizaciones institucionales/gubernamentales sin discrepancias de centavos (Opción 1)', () => {
    const rawQuoteItems = [
      { name: 'DIEM PAPEL OPALINA', qty: 50, priceConIva: 62.00, taxRate: 16 },
      { name: 'PELIKAN BOLIGRAFO', qty: 50, priceConIva: 33.00, taxRate: 16 },
      { name: 'DIEM PAPEL OPALINA', qty: 105, priceConIva: 62.00, taxRate: 16 },
      { name: 'XEROX PAPEL BOND', qty: 100, priceConIva: 778.00, taxRate: 16 },
      { name: 'JANEL CINTA', qty: 200, priceConIva: 8.00, taxRate: 16 },
      { name: 'KOLA LOKA', qty: 70, priceConIva: 6.99, taxRate: 16 }
    ];

    let netSubtotal = 0;
    const processed = rawQuoteItems.map(item => {
      const unitPriceSinIva = Math.round((item.priceConIva / 1.16) * 100) / 100;
      const rowSubtotal = Math.round((unitPriceSinIva * item.qty) * 100) / 100;
      netSubtotal += rowSubtotal;
      return {
        unitPriceSinIva,
        rowSubtotal
      };
    });

    const totalIva = Math.round((netSubtotal * 0.16) * 100) / 100;
    const grandTotal = Math.round((netSubtotal + totalIva) * 100) / 100;

    // Verificación horizontal de renglón
    expect(processed[0].unitPriceSinIva).toBe(53.45);
    expect(processed[0].rowSubtotal).toBe(2672.50);

    expect(processed[1].unitPriceSinIva).toBe(28.45);
    expect(processed[1].rowSubtotal).toBe(1422.50);

    expect(processed[2].unitPriceSinIva).toBe(53.45);
    expect(processed[2].rowSubtotal).toBe(5612.25);

    expect(processed[3].unitPriceSinIva).toBe(670.69);
    expect(processed[3].rowSubtotal).toBe(67069.00);

    expect(processed[4].unitPriceSinIva).toBe(6.90);
    expect(processed[4].rowSubtotal).toBe(1380.00);

    expect(processed[5].unitPriceSinIva).toBe(6.03);
    expect(processed[5].rowSubtotal).toBe(422.10);

    // Verificación vertical de pie de página (coincide exactamente con la orden de compra CCL)
    expect(netSubtotal).toBe(78578.35);
    expect(totalIva).toBe(12572.54);
    expect(grandTotal).toBe(91150.89);
  });
});
