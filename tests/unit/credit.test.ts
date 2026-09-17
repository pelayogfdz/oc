import { describe, it, expect } from 'vitest';
import { validateCustomerCredit } from '@/lib/financialCalculations';

describe('validateCustomerCredit (Control de Líneas de Crédito)', () => {
  it('debe autorizar una venta si el saldo actual más el total no excede el límite', () => {
    const customer = {
      creditLimit: 10000,
      creditBalance: 3000
    };

    const result = validateCustomerCredit(customer, 2500);

    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
    expect(result.availableCredit).toBe(4500); // 10000 - 3000 - 2500
  });

  it('debe autorizar una venta que utilice exactamente el 100% del crédito disponible', () => {
    const customer = {
      creditLimit: 5000,
      creditBalance: 2000
    };

    const result = validateCustomerCredit(customer, 3000);

    expect(result.valid).toBe(true);
    expect(result.availableCredit).toBe(0);
  });

  it('debe rechazar la venta si el total excede el límite disponible y reportar el disponible exacto', () => {
    const customer = {
      creditLimit: 5000,
      creditBalance: 4000
    };

    const result = validateCustomerCredit(customer, 1200);

    expect(result.valid).toBe(false);
    expect(result.availableCredit).toBe(1000);
    expect(result.error).toContain('El cliente excede su límite de crédito');
    expect(result.error).toContain('Disponible: 1000.00');
  });

  it('debe rechazar la venta si el cliente tiene límite de crédito en cero o negativo', () => {
    const customerNoCredit = {
      creditLimit: 0,
      creditBalance: 0
    };

    const result = validateCustomerCredit(customerNoCredit, 500);

    expect(result.valid).toBe(false);
    expect(result.error).toBe('El cliente no tiene línea de crédito autorizada.');
    expect(result.availableCredit).toBe(0);
  });

  it('debe bloquear compras si el cliente ya está sobregirado antes de la nueva venta', () => {
    const customerOverdrawn = {
      creditLimit: 2000,
      creditBalance: 2500
    };

    const result = validateCustomerCredit(customerOverdrawn, 100);

    expect(result.valid).toBe(false);
    expect(result.availableCredit).toBe(-500);
  });
});
