import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MeliSyncQueueManager } from '@/lib/meliSyncQueue';

describe('MeliSyncQueueManager (Cola Inteligente de Sincronización Mercado Libre)', () => {
  let queue: MeliSyncQueueManager;

  beforeEach(() => {
    queue = new MeliSyncQueueManager();
  });

  it('debe deduplicar múltiples solicitudes de sincronización para el mismo producto en el mismo tenant', () => {
    // Simular que el producto se actualizó 5 veces seguidas en menos de 1 segundo
    queue.enqueue('prod-100', 'tenant-officecity');
    queue.enqueue('prod-100', 'tenant-officecity');
    queue.enqueue('prod-100', 'tenant-officecity');
    queue.enqueue('prod-100', 'tenant-officecity');
    queue.enqueue('prod-100', 'tenant-officecity');

    const stats = queue.getStats();
    expect(stats.pendingCount).toBe(1);
  });

  it('debe aislar por inquilino productos que compartan el mismo ID', () => {
    queue.enqueue('prod-shared-id', 'tenant-1');
    queue.enqueue('prod-shared-id', 'tenant-2');

    const stats = queue.getStats();
    expect(stats.pendingCount).toBe(2);
  });

  it('debe encolar correctamente múltiples productos distintos', () => {
    queue.enqueue('prod-1', 'tenant-a');
    queue.enqueue('prod-2', 'tenant-a');
    queue.enqueue('prod-3', 'tenant-a');

    const stats = queue.getStats();
    expect(stats.pendingCount).toBe(3);
  });

  it('debe rechazar IDs de producto vacíos o inválidos', () => {
    expect(queue.enqueue('', 'tenant-a')).toBe(false);
    expect(queue.enqueue(null as any, 'tenant-a')).toBe(false);
    expect(queue.enqueue(undefined as any, 'tenant-a')).toBe(false);

    const stats = queue.getStats();
    expect(stats.pendingCount).toBe(0);
  });

  it('debe procesar el lote completo respetando la función ejecutora sin fallar', async () => {
    const executed: string[] = [];
    const mockSyncExecutor = vi.fn().mockImplementation(async (productId: string, tenantId: string | null) => {
      executed.push(`${tenantId}:${productId}`);
    });

    queue.enqueue('prod-A', 'tenant-1');
    queue.enqueue('prod-B', 'tenant-1');
    queue.enqueue('prod-C', 'tenant-1');

    await queue.processQueue(mockSyncExecutor);

    expect(mockSyncExecutor).toHaveBeenCalledTimes(3);
    expect(executed).toContain('tenant-1:prod-A');
    expect(executed).toContain('tenant-1:prod-B');
    expect(executed).toContain('tenant-1:prod-C');

    const stats = queue.getStats();
    expect(stats.pendingCount).toBe(0);
    expect(stats.processedCount).toBe(3);
  });

  it('debe limpiar adecuadamente la cola al llamar a clear()', () => {
    queue.enqueue('prod-1', 'tenant-a');
    queue.enqueue('prod-2', 'tenant-a');
    expect(queue.getStats().pendingCount).toBe(2);

    queue.clear();
    expect(queue.getStats().pendingCount).toBe(0);
    expect(queue.getStats().processedCount).toBe(0);
  });
});
