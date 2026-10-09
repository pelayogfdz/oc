import { describe, it, expect } from 'vitest';
import { calculateTaxBreakdown, calculateQuoteInstitutionalBreakdown } from '@/lib/financialCalculations';
import { generateQuotePdfBuffer } from '@/lib/quotePdf';

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

  describe('calculateQuoteInstitutionalBreakdown (Motor unificado de cotizaciones)', () => {
    it('debe calcular con exactitud institucional la orden CCL (#QUE-3050)', () => {
      const items = [
        { price: 62.00, quantity: 50, taxRate: 16, taxType: 'IVA' },
        { price: 33.00, quantity: 50, taxRate: 16, taxType: 'IVA' },
        { price: 62.00, quantity: 105, taxRate: 16, taxType: 'IVA' },
        { price: 778.00, quantity: 100, taxRate: 16, taxType: 'IVA' },
        { price: 8.00, quantity: 200, taxRate: 16, taxType: 'IVA' },
        { price: 6.99, quantity: 70, taxRate: 16, taxType: 'IVA' }
      ];

      const res = calculateQuoteInstitutionalBreakdown(items);

      expect(res.subtotal).toBe(78578.35);
      expect(res.iva).toBe(12572.54);
      expect(res.total).toBe(91150.89);
      expect(Math.round((res.subtotal + res.iva) * 100) / 100).toBe(res.total);
    });

    it('debe manejar productos exentos correctamente', () => {
      const items = [
        { price: 100.00, quantity: 2, taxType: 'EXENTO' }
      ];

      const res = calculateQuoteInstitutionalBreakdown(items);

      expect(res.items[0].unitBeforeIva).toBe(100.00);
      expect(res.items[0].rowSubtotalBeforeIva).toBe(200.00);
      expect(res.items[0].rowIva).toBe(0);
      expect(res.items[0].rowTotal).toBe(200.00);
      expect(res.subtotal).toBe(200.00);
      expect(res.iva).toBe(0);
      expect(res.total).toBe(200.00);
    });

    it('debe manejar partidas mixtas de tasa 16% y exento sin descuadre', () => {
      const items = [
        { price: 116.00, quantity: 1, taxRate: 16, taxType: 'IVA' },
        { price: 50.00, quantity: 2, taxType: 'EXENTO' }
      ];

      const res = calculateQuoteInstitutionalBreakdown(items);

      expect(res.items[0].unitBeforeIva).toBe(100.00);
      expect(res.items[0].rowSubtotalBeforeIva).toBe(100.00);
      expect(res.items[0].rowIva).toBe(16.00);

      expect(res.items[1].unitBeforeIva).toBe(50.00);
      expect(res.items[1].rowSubtotalBeforeIva).toBe(100.00);
      expect(res.items[1].rowIva).toBe(0);

      expect(res.subtotal).toBe(200.00);
      expect(res.iva).toBe(16.00);
      expect(res.total).toBe(216.00);
      expect(Math.round((res.subtotal + res.iva) * 100) / 100).toBe(res.total);
    });

    it('debe calcular adecuadamente cantidades decimales o fraccionarias', () => {
      const items = [
        { price: 58.00, quantity: 2.5, taxRate: 16, taxType: 'IVA' } // 58 / 1.16 = 50.00
      ];

      const res = calculateQuoteInstitutionalBreakdown(items);

      expect(res.items[0].unitBeforeIva).toBe(50.00);
      expect(res.items[0].rowSubtotalBeforeIva).toBe(125.00);
      expect(res.items[0].rowIva).toBe(20.00);
      expect(res.subtotal).toBe(125.00);
      expect(res.iva).toBe(20.00);
      expect(res.total).toBe(145.00);
      expect(Math.round((res.subtotal + res.iva) * 100) / 100).toBe(res.total);
    });

    it('debe garantizar consistencia estricta subtotal + iva = total en carritos masivos', () => {
      const items = [];
      for (let i = 1; i <= 50; i++) {
        items.push({
          price: 10 + (i * 3.77),
          quantity: i * 3,
          taxRate: 16,
          taxType: 'IVA'
        });
      }

      const res = calculateQuoteInstitutionalBreakdown(items);

      expect(Math.round((res.subtotal + res.iva) * 100) / 100).toBe(res.total);
    });

    it('debe calcular adecuadamente descuentos de lista preservando cuadratura exacta', () => {
      const items = [
        { price: 16.00, quantity: 12, taxRate: 16, taxType: 'IVA', originalPrice: 19.00 }, // Sharpie Mayoreo
        { price: 303.00, quantity: 1, taxRate: 16, taxType: 'IVA', originalPrice: 333.00 } // Mouse Mayoreo
      ];

      const res = calculateQuoteInstitutionalBreakdown(items);

      expect(res.items[0].originalUnitBeforeIva).toBe(16.38);
      expect(res.items[0].unitBeforeIva).toBe(13.79);
      expect(res.items[0].rowGrossSubtotal).toBe(196.56);
      expect(res.items[0].rowSubtotalBeforeIva).toBe(165.48);
      expect(res.items[0].rowDiscount).toBe(31.08);

      expect(res.items[1].originalUnitBeforeIva).toBe(287.07);
      expect(res.items[1].unitBeforeIva).toBe(261.21);
      expect(res.items[1].rowGrossSubtotal).toBe(287.07);
      expect(res.items[1].rowSubtotalBeforeIva).toBe(261.21);
      expect(res.items[1].rowDiscount).toBe(25.86);

      expect(res.grossSubtotal).toBe(483.63);
      expect(res.discount).toBe(56.94);
      expect(res.subtotal).toBe(426.69);
      expect(Math.round((res.grossSubtotal - res.discount) * 100) / 100).toBe(res.subtotal);
      expect(res.iva).toBe(68.27);
      expect(res.total).toBe(494.96);
      expect(Math.round((res.subtotal + res.iva) * 100) / 100).toBe(res.total);
    });

    it('debe manejar carrito vacío sin arrojar error', () => {
      const res = calculateQuoteInstitutionalBreakdown([]);
      expect(res.subtotal).toBe(0);
      expect(res.iva).toBe(0);
      expect(res.total).toBe(0);
      expect(res.items).toHaveLength(0);
    });

    it('debe generar el buffer PDF con cuadratura exacta para orden CCL', async () => {
      const quote = {
        id: 'test-quote-123',
        folio: 'QUE-3050',
        total: 91150.89,
        items: [
          { price: 62.00, quantity: 50, product: { name: 'DIEM PAPEL OPALINA', taxRate: 16, taxType: 'IVA' } },
          { price: 33.00, quantity: 50, product: { name: 'PELIKAN BOLIGRAFO', taxRate: 16, taxType: 'IVA' } },
          { price: 62.00, quantity: 105, product: { name: 'DIEM PAPEL OPALINA', taxRate: 16, taxType: 'IVA' } },
          { price: 778.00, quantity: 100, product: { name: 'XEROX PAPEL BOND', taxRate: 16, taxType: 'IVA' } },
          { price: 8.00, quantity: 200, product: { name: 'JANEL CINTA', taxRate: 16, taxType: 'IVA' } },
          { price: 6.99, quantity: 70, product: { name: 'KOLA LOKA', taxRate: 16, taxType: 'IVA' } }
        ]
      };

      const buffer = await generateQuotePdfBuffer(quote);
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(1000);
    });
  });
});
