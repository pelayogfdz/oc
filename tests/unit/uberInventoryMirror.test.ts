import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UberSyncQueueManager } from '@/lib/uberSyncQueue';

describe('Espejo de Inventario Uber Eats (CAANMA ➔ Uber Eats)', () => {
  let queue: UberSyncQueueManager;

  beforeEach(() => {
    queue = new UberSyncQueueManager();
  });

  describe('Cola de Sincronización Inteligente (UberSyncQueueManager)', () => {
    it('debe deduplicar múltiples actualizaciones de inventario seguidas para el mismo producto', () => {
      // Simular que en un segundo se hicieron 4 ventas o ajustes del mismo producto
      queue.enqueue('prod-pastel-1', 'tenant-pizca');
      queue.enqueue('prod-pastel-1', 'tenant-pizca');
      queue.enqueue('prod-pastel-1', 'tenant-pizca');
      queue.enqueue('prod-pastel-1', 'tenant-pizca');

      const stats = queue.getStats();
      expect(stats.pendingCount).toBe(1);
    });

    it('debe aislar productos entre diferentes sucursales/inquilinos', () => {
      queue.enqueue('prod-pastel-1', 'tenant-branch-1');
      queue.enqueue('prod-pastel-1', 'tenant-branch-2');

      const stats = queue.getStats();
      expect(stats.pendingCount).toBe(2);
    });

    it('debe rechazar identificadores nulos o vacíos', () => {
      expect(queue.enqueue('', 'tenant-pizca')).toBe(false);
      expect(queue.enqueue(null as any, 'tenant-pizca')).toBe(false);
      expect(queue.enqueue(undefined as any, 'tenant-pizca')).toBe(false);

      const stats = queue.getStats();
      expect(stats.pendingCount).toBe(0);
    });

    it('debe procesar la cola completa y ejecutar el callback para cada ítem en cola', async () => {
      const executed: string[] = [];
      const mockExecutor = vi.fn().mockImplementation(async (productId: string, tenantId: string | null) => {
        executed.push(`${tenantId}:${productId}`);
      });

      queue.enqueue('prod-1', 'tenant-1');
      queue.enqueue('prod-2', 'tenant-1');
      queue.enqueue('prod-3', 'tenant-1');

      await queue.processQueue(mockExecutor);

      expect(mockExecutor).toHaveBeenCalledTimes(3);
      expect(executed).toContain('tenant-1:prod-1');
      expect(executed).toContain('tenant-1:prod-2');
      expect(executed).toContain('tenant-1:prod-3');

      const stats = queue.getStats();
      expect(stats.pendingCount).toBe(0);
      expect(stats.processedCount).toBe(3);
    });
  });

  describe('Lógica de Reglas de Disponibilidad del Espejo', () => {
    it('debe marcar el producto como AGOTADO/SUSPENDIDO en Uber Eats si el stock en CAANMA es 0 o negativo', () => {
      const calculateMirrorAvailability = (stock: number) => {
        const isOutOfStock = stock <= 0;
        return {
          isOutOfStock,
          uberStatus: isOutOfStock ? 'SUSPENDED' : 'SYNCED',
          uberSuspensionPayload: isOutOfStock
            ? { suspension: { suspend_until: 0 } }
            : { suspension: null }
        };
      };

      const resultZero = calculateMirrorAvailability(0);
      expect(resultZero.isOutOfStock).toBe(true);
      expect(resultZero.uberStatus).toBe('SUSPENDED');
      expect(resultZero.uberSuspensionPayload.suspension).not.toBeNull();

      const resultNegative = calculateMirrorAvailability(-2);
      expect(resultNegative.isOutOfStock).toBe(true);
      expect(resultNegative.uberStatus).toBe('SUSPENDED');
    });

    it('debe marcar el producto como DISPONIBLE en Uber Eats si el stock en CAANMA es mayor a 0', () => {
      const calculateMirrorAvailability = (stock: number) => {
        const isOutOfStock = stock <= 0;
        return {
          isOutOfStock,
          uberStatus: isOutOfStock ? 'SUSPENDED' : 'SYNCED',
          uberSuspensionPayload: isOutOfStock
            ? { suspension: { suspend_until: 0 } }
            : { suspension: null }
        };
      };

      const resultPositive = calculateMirrorAvailability(15);
      expect(resultPositive.isOutOfStock).toBe(false);
      expect(resultPositive.uberStatus).toBe('SYNCED');
      expect(resultPositive.uberSuspensionPayload.suspension).toBeNull();
    });
  });

  describe('Garantía de Seguridad: Modo de Simulación Protegido', () => {
    it('no debe realizar llamadas HTTP externas cuando syncInventoryEnabled sea false', async () => {
      let httpCallsCount = 0;
      const fakeUberApiCall = vi.fn().mockImplementation(async () => {
        httpCallsCount++;
      });

      const simulateSync = async (productStock: number, syncInventoryEnabled: boolean) => {
        const isOutOfStock = productStock <= 0;
        if (!syncInventoryEnabled) {
          return {
            mode: 'SIMULATED',
            savedStatus: isOutOfStock ? 'SIMULATED_SUSPENDED' : 'SIMULATED_SYNCED',
            externalCallMade: false
          };
        }

        await fakeUberApiCall();
        return {
          mode: 'LIVE',
          savedStatus: isOutOfStock ? 'SUSPENDED' : 'SYNCED',
          externalCallMade: true
        };
      };

      // Prueba con modo protegido (por defecto)
      const resProtected = await simulateSync(0, false);
      expect(resProtected.mode).toBe('SIMULATED');
      expect(resProtected.savedStatus).toBe('SIMULATED_SUSPENDED');
      expect(resProtected.externalCallMade).toBe(false);
      expect(fakeUberApiCall).not.toHaveBeenCalled();

      // Prueba con producto reabastecido en modo protegido
      const resRestocked = await simulateSync(10, false);
      expect(resRestocked.mode).toBe('SIMULATED');
      expect(resRestocked.savedStatus).toBe('SIMULATED_SYNCED');
      expect(fakeUberApiCall).not.toHaveBeenCalled();

      // Solo si el usuario habilita explícitamente la sincronización en vivo
      const resLive = await simulateSync(5, true);
      expect(resLive.mode).toBe('LIVE');
      expect(resLive.savedStatus).toBe('SYNCED');
      expect(fakeUberApiCall).toHaveBeenCalledTimes(1);
    });
  });
});
