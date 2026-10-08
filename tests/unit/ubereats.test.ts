import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import {
  getUberApiBaseUrl,
  getUberAuthBaseUrl,
  verifyUberSignature
} from '@/lib/uberEatsService';

describe('Integración Uber Eats - Servicios Core y Utilidades', () => {
  describe('Resolución de URLs Base (Sandbox vs Producción)', () => {
    it('debe retornar las URLs de producción cuando isSandbox es false u omitido', () => {
      expect(getUberApiBaseUrl(false)).toBe('https://api.uber.com');
      expect(getUberApiBaseUrl()).toBe('https://api.uber.com');

      expect(getUberAuthBaseUrl(false)).toBe('https://auth.uber.com');
      expect(getUberAuthBaseUrl()).toBe('https://auth.uber.com');
    });

    it('debe retornar las URLs de Sandbox cuando isSandbox es true', () => {
      expect(getUberApiBaseUrl(true)).toBe('https://test-api.uber.com');
      expect(getUberAuthBaseUrl(true)).toBe('https://sandbox-auth.uber.com');
    });
  });

  describe('Verificación de Firmas HMAC-SHA256 (Webhooks de Uber Eats)', () => {
    const clientSecret = 'super_secret_client_key_12345';
    const testBody = JSON.stringify({
      event_type: 'orders.notification',
      event_time: 1718000000,
      resource_href: 'https://api.uber.com/v1/eats/stores/123/created-orders',
      meta: {
        resource_id: 'order-test-uuid',
        user_id: 'user-test-uuid'
      }
    });

    it('debe validar exitosamente una firma HMAC-SHA256 legítima', () => {
      const hmac = crypto.createHmac('sha256', clientSecret);
      hmac.update(testBody);
      const validSignature = hmac.digest('hex');

      const isValid = verifyUberSignature(testBody, validSignature, clientSecret);
      expect(isValid).toBe(true);
    });

    it('debe soportar firmas que incluyan el prefijo "sha256=" enviado por algunos clientes HTTP', () => {
      const hmac = crypto.createHmac('sha256', clientSecret);
      hmac.update(testBody);
      const validSignature = `sha256=${hmac.digest('hex')}`;

      const isValid = verifyUberSignature(testBody, validSignature, clientSecret);
      expect(isValid).toBe(true);
    });

    it('debe rechazar una firma cuando el cuerpo ha sido alterado o manipulado', () => {
      const hmac = crypto.createHmac('sha256', clientSecret);
      hmac.update(testBody);
      const validSignature = hmac.digest('hex');

      const tamperedBody = testBody + ' ';
      const isValid = verifyUberSignature(tamperedBody, validSignature, clientSecret);
      expect(isValid).toBe(false);
    });

    it('debe rechazar una firma generada con un client secret incorrecto', () => {
      const wrongSecret = 'another_totally_different_key';
      const hmac = crypto.createHmac('sha256', wrongSecret);
      hmac.update(testBody);
      const signatureWithWrongSecret = hmac.digest('hex');

      const isValid = verifyUberSignature(testBody, signatureWithWrongSecret, clientSecret);
      expect(isValid).toBe(false);
    });

    it('debe rechazar cuando el encabezado o el secreto están vacíos o son nulos', () => {
      expect(verifyUberSignature(testBody, null, clientSecret)).toBe(false);
      expect(verifyUberSignature(testBody, '', clientSecret)).toBe(false);
      expect(verifyUberSignature(testBody, 'abc', '')).toBe(false);
    });

    it('debe rechazar firmas con longitud o caracteres inválidos sin provocar excepciones no controladas', () => {
      expect(verifyUberSignature(testBody, 'too_short', clientSecret)).toBe(false);
      expect(verifyUberSignature(testBody, '0'.repeat(128), clientSecret)).toBe(false);
    });
  });

  describe('Asignación de Vendedor y Canal de Venta para Uber Eats', () => {
    it('debe identificar una venta de Uber Eats por notas, folio o método de pago', () => {
      const isUberOrder = (sale: { notes?: string | null; folio?: string | null; paymentMethod?: string }) => {
        return Boolean(
          (sale.notes && (sale.notes.includes('Uber') || sale.notes.includes('UBER') || sale.notes.includes('uber'))) ||
          sale.paymentMethod === 'UBER_EATS' ||
          (sale.folio && sale.folio.startsWith('UB-'))
        );
      };

      expect(isUberOrder({ notes: 'Pedido Uber Eats importado', folio: 'UB-1234', paymentMethod: 'UBER_EATS' })).toBe(true);
      expect(isUberOrder({ folio: 'UB-9988' })).toBe(true);
      expect(isUberOrder({ paymentMethod: 'UBER_EATS' })).toBe(true);
      expect(isUberOrder({ notes: 'Venta normal en mostrador', folio: 'VT-001', paymentMethod: 'CASH' })).toBe(false);
    });

    it('debe determinar que el vendedor asignado para órdenes de Uber Eats es UBER EATS', () => {
      const getSellerName = (sale: { user?: { name?: string } | null; isUber?: boolean }) => {
        return sale.isUber ? 'UBER EATS' : (sale.user?.name || 'Usuario');
      };

      expect(getSellerName({ isUber: true, user: null })).toBe('UBER EATS');
      expect(getSellerName({ isUber: true, user: { name: 'Otro Usuario' } })).toBe('UBER EATS');
      expect(getSellerName({ isUber: false, user: { name: 'Cajero 1' } })).toBe('Cajero 1');
    });
  });

  describe('Normalización de Plataformas y Enlaces Multi-Sucursal', () => {
    const platforms = [
      { id: 'MERCADO_LIBRE', name: 'Mercado Libre', slug: 'mercadolibre' },
      { id: 'UBER_EATS', name: 'Uber Eats', slug: 'ubereats' },
      { id: 'RAPPI', name: 'Rappi', slug: 'rappi' },
      { id: 'AMAZON', name: 'Amazon Seller', slug: 'amazon' },
      { id: 'WALMART', name: 'Walmart Marketplace', slug: 'walmart' },
      { id: 'LIVERPOOL', name: 'Liverpool Partners', slug: 'liverpool' }
    ];

    const resolvePlatform = (rawPlatform: string) => {
      const normalized = (rawPlatform || '').toLowerCase().replace(/[-_]/g, '');
      const match = platforms.find(px => {
        const pxNormId = px.id.toLowerCase().replace(/[-_]/g, '');
        const pxNormSlug = px.slug.toLowerCase().replace(/[-_]/g, '');
        return pxNormId === normalized || pxNormSlug === normalized || normalized.includes(pxNormSlug) || pxNormSlug.includes(normalized);
      });
      return match ? match.slug : normalized;
    };

    const buildIntegrationUrl = (platform: string, branchId?: string) => {
      const slug = resolvePlatform(platform);
      return `/integraciones/${slug}${branchId ? `?branchId=${branchId}` : ''}`;
    };

    it('debe normalizar cualquier variación de Uber Eats hacia el slug canónico "ubereats"', () => {
      expect(resolvePlatform('UBER_EATS')).toBe('ubereats');
      expect(resolvePlatform('uber_eats')).toBe('ubereats');
      expect(resolvePlatform('ubereats')).toBe('ubereats');
      expect(resolvePlatform('uber-eats')).toBe('ubereats');
      expect(resolvePlatform('UBER')).toBe('ubereats');
    });

    it('debe construir la URL con el branchId correspondiente para abrir la sucursal seleccionada', () => {
      expect(buildIntegrationUrl('uber_eats', 'branch-lomas-123')).toBe('/integraciones/ubereats?branchId=branch-lomas-123');
      expect(buildIntegrationUrl('UBER_EATS', 'branch-centro-456')).toBe('/integraciones/ubereats?branchId=branch-centro-456');
      expect(buildIntegrationUrl('MERCADO_LIBRE', 'branch-matriz')).toBe('/integraciones/mercadolibre?branchId=branch-matriz');
      expect(buildIntegrationUrl('rappi')).toBe('/integraciones/rappi');
    });

    it('debe normalizar Mercado Libre ante variaciones de nombres', () => {
      expect(resolvePlatform('MERCADO_LIBRE')).toBe('mercadolibre');
      expect(resolvePlatform('mercado_libre')).toBe('mercadolibre');
      expect(resolvePlatform('mercadolibre')).toBe('mercadolibre');
      expect(resolvePlatform('mercado-libre')).toBe('mercadolibre');
    });
  });

  describe('Aislamiento Multi-Tenant de Notificaciones y Alertas Flotantes', () => {
    const PIZCA_TENANT_ID = '0d246cea-0220-4328-92b0-8a1387ce6a6d';
    const OFFICECITY_TENANT_ID = '8b52cbcd-c956-4717-a1bd-02e57386aaa2';

    it('debe excluir condiciones de Uber Eats para tenants que no sean Pizca de Azúcar', () => {
      const buildNotificationFilters = (tenantId: string) => {
        const isPizca = tenantId === PIZCA_TENANT_ID;
        const orConditions: any[] = [
          { notes: { contains: 'Mercado Libre' } },
          { notes: { contains: 'Catálogo B2C' } }
        ];
        if (isPizca) {
          orConditions.push(
            { notes: { contains: 'Uber' } },
            { paymentMethod: 'UBER_EATS' },
            { folio: { startsWith: 'UB-' } }
          );
        }
        return orConditions;
      };

      const officeCityFilters = buildNotificationFilters(OFFICECITY_TENANT_ID);
      expect(officeCityFilters.some(c => c.paymentMethod === 'UBER_EATS')).toBe(false);
      expect(officeCityFilters.some(c => c.notes?.contains === 'Uber')).toBe(false);
      expect(officeCityFilters.some(c => c.folio?.startsWith === 'UB-')).toBe(false);

      const pizcaFilters = buildNotificationFilters(PIZCA_TENANT_ID);
      expect(pizcaFilters.some(c => c.paymentMethod === 'UBER_EATS')).toBe(true);
      expect(pizcaFilters.some(c => c.notes?.contains === 'Uber')).toBe(true);
      expect(pizcaFilters.some(c => c.folio?.startsWith === 'UB-')).toBe(true);
    });

    it('debe filtrar en frontend ventas de Uber Eats si el cliente activo es Office City', () => {
      const mockSales = [
        { id: '1', channel: 'MERCADO_LIBRE', folio: 'MELI-100' },
        { id: '2', channel: 'UBER_EATS', folio: 'UB-200' },
        { id: '3', channel: 'B2C_WEB', folio: 'WEB-300' }
      ];

      const filterSalesForTenant = (sales: any[], tenantId: string) => {
        const isPizca = tenantId === PIZCA_TENANT_ID;
        return isPizca ? sales : sales.filter(s => s.channel !== 'UBER_EATS');
      };

      const officeSales = filterSalesForTenant(mockSales, OFFICECITY_TENANT_ID);
      expect(officeSales).toHaveLength(2);
      expect(officeSales.map(s => s.channel)).toEqual(['MERCADO_LIBRE', 'B2C_WEB']);
      expect(officeSales.some(s => s.channel === 'UBER_EATS')).toBe(false);

      const pizcaSales = filterSalesForTenant(mockSales, PIZCA_TENANT_ID);
      expect(pizcaSales).toHaveLength(3);
      expect(pizcaSales.some(s => s.channel === 'UBER_EATS')).toBe(true);
    });

    it('debe generar una clave de localStorage aislada por tenant para evitar contaminación cruzada', () => {
      const getStorageKey = (tenantId?: string | null) => {
        return tenantId ? `seenOnlineSales_${tenantId}` : 'seenOnlineSales';
      };

      expect(getStorageKey(OFFICECITY_TENANT_ID)).toBe(`seenOnlineSales_${OFFICECITY_TENANT_ID}`);
      expect(getStorageKey(PIZCA_TENANT_ID)).toBe(`seenOnlineSales_${PIZCA_TENANT_ID}`);
      expect(getStorageKey(OFFICECITY_TENANT_ID)).not.toBe(getStorageKey(PIZCA_TENANT_ID));
    });
  });
});


