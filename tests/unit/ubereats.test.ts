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
});
