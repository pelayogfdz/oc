/**
 * Cola de Sincronización de Inventarios en Tiempo Real para Uber Eats.
 * Garantiza que el inventario de Uber Eats sea un espejo fiel de CAANMA.
 *
 * Características de seguridad y rendimiento:
 * 1. Deduplicación inteligente: si un producto se vende 10 veces en 2 segundos, solo se sincroniza una vez.
 * 2. Modo Seguro (Simulación por defecto): No realiza llamadas externas a Uber Eats hasta que el módulo
 *    sea habilitado explícitamente por el usuario ('syncInventoryEnabled: true').
 * 3. Rate-limiting y concurrencia controlada para evitar bloqueos y errores 429 de Uber Eats.
 */

export interface UberSyncJob {
  productId: string;
  tenantId: string | null;
  enqueuedAt: number;
}

export class UberSyncQueueManager {
  private queue: Map<string, UberSyncJob> = new Map();
  private inFlight: Set<string> = new Set();
  private isProcessing = false;
  private processedCount = 0;
  private debounceTimer: NodeJS.Timeout | null = null;

  public readonly CONCURRENCY = 2;
  public readonly DEBOUNCE_MS = 800;
  public readonly RATE_LIMIT_DELAY_MS = 250;

  /**
   * Encola un producto para sincronización de inventario con Uber Eats.
   */
  public enqueue(productId: string, tenantId: string | null): boolean {
    if (!productId || typeof productId !== 'string') return false;

    const key = this.getKey(productId, tenantId);
    this.queue.set(key, {
      productId,
      tenantId,
      enqueuedAt: Date.now()
    });

    this.scheduleProcessing();
    return true;
  }

  public getStats() {
    return {
      pendingCount: this.queue.size,
      inFlightCount: this.inFlight.size,
      isProcessing: this.isProcessing,
      processedCount: this.processedCount
    };
  }

  public clear() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.queue.clear();
    this.inFlight.clear();
    this.isProcessing = false;
    this.processedCount = 0;
  }

  public getKey(productId: string, tenantId: string | null): string {
    return `${tenantId || 'master'}:${productId}`;
  }

  private scheduleProcessing() {
    if (this.isProcessing) return;
    if (this.debounceTimer) return;

    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      this.processQueue();
    }, this.DEBOUNCE_MS);
  }

  public async processQueue(
    syncExecutor?: (productId: string, tenantId: string | null) => Promise<any>
  ): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      while (this.queue.size > 0) {
        const batch: [string, UberSyncJob][] = [];
        for (const [key, job] of this.queue.entries()) {
          if (batch.length >= this.CONCURRENCY) break;
          this.queue.delete(key);
          this.inFlight.add(key);
          batch.push([key, job]);
        }

        if (batch.length === 0) break;

        await Promise.all(
          batch.map(async ([key, job]) => {
            try {
              if (syncExecutor) {
                await syncExecutor(job.productId, job.tenantId);
              } else {
                await this.executeSync(job.productId, job.tenantId);
              }
              this.processedCount++;
            } catch (err) {
              console.error(`[UBER QUEUE] Error procesando producto ${job.productId}:`, err);
            } finally {
              this.inFlight.delete(key);
            }
          })
        );

        if (this.queue.size > 0) {
          await new Promise(resolve => setTimeout(resolve, this.RATE_LIMIT_DELAY_MS));
        }
      }
    } finally {
      this.isProcessing = false;
      if (this.queue.size > 0) {
        this.scheduleProcessing();
      }
    }
  }

  private async executeSync(productId: string, tenantId: string | null): Promise<void> {
    try {
      const integrationModule = await import('@/app/actions/integration') as any;
      if (integrationModule?.syncUberEatsInventoryAction) {
        await integrationModule.syncUberEatsInventoryAction(productId, tenantId);
      }
    } catch (err) {
      console.error(`[UBER QUEUE] Error al invocar syncUberEatsInventoryAction para producto ${productId}:`, err);
    }
  }
}

// Instancia singleton global
declare global {
  var __uberSyncQueueInstance: UberSyncQueueManager | undefined;
}

const queueInstance = globalThis.__uberSyncQueueInstance || new UberSyncQueueManager();
if (process.env.NODE_ENV !== 'production') {
  globalThis.__uberSyncQueueInstance = queueInstance;
}

export const uberSyncQueue = queueInstance;

export function enqueueUberStockSync(productId: string, tenantId: string | null): boolean {
  return queueInstance.enqueue(productId, tenantId);
}

export function getUberQueueStats() {
  return queueInstance.getStats();
}

export function clearUberQueue() {
  queueInstance.clear();
}
