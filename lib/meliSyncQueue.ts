/**
 * Cola de Sincronización Inteligente para Mercado Libre.
 * Resuelve problemas de saturación de conexiones en Postgres, errores 429 (Too Many Requests)
 * y ráfagas concurrentes durante importaciones o traspasos masivos.
 */

export interface MeliSyncJob {
  productId: string;
  tenantId: string | null;
  enqueuedAt: number;
}

export class MeliSyncQueueManager {
  private queue: Map<string, MeliSyncJob> = new Map();
  private inFlight: Set<string> = new Set();
  private isProcessing = false;
  private processedCount = 0;
  private debounceTimer: NodeJS.Timeout | null = null;

  public readonly CONCURRENCY = 2;
  public readonly DEBOUNCE_MS = 1000;
  public readonly RATE_LIMIT_DELAY_MS = 200;

  /**
   * Encola un producto para sincronización de stock con Mercado Libre.
   * Si el producto ya está en cola, se actualiza la fecha sin duplicar la tarea.
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

  public async processQueue(syncExecutor?: (productId: string, tenantId: string | null) => Promise<void>): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      while (this.queue.size > 0) {
        // Tomar hasta CONCURRENCY tareas
        const batch: [string, MeliSyncJob][] = [];
        for (const [key, job] of this.queue.entries()) {
          if (batch.length >= this.CONCURRENCY) break;
          this.queue.delete(key);
          this.inFlight.add(key);
          batch.push([key, job]);
        }

        if (batch.length === 0) break;

        // Ejecutar el lote respetando concurrencia
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
              console.error(`[MELI QUEUE] Error procesando producto ${job.productId}:`, err);
            } finally {
              this.inFlight.delete(key);
            }
          })
        );

        // Pausa de cortesía para evitar ráfagas contra Mercado Libre
        if (this.queue.size > 0) {
          await new Promise(resolve => setTimeout(resolve, this.RATE_LIMIT_DELAY_MS));
        }
      }
    } finally {
      this.isProcessing = false;
      // Si llegaron nuevos elementos mientras procesábamos, reprogramar
      if (this.queue.size > 0) {
        this.scheduleProcessing();
      }
    }
  }

  private async executeSync(productId: string, tenantId: string | null): Promise<void> {
    try {
      const { syncMeliStockAction } = await import('@/app/actions/integration');
      await syncMeliStockAction(productId, tenantId);
    } catch (err) {
      console.error(`[MELI QUEUE] Error al invocar syncMeliStockAction para producto ${productId}:`, err);
    }
  }
}

// Instancia singleton global para sobrevivir a recargas de módulos en Next.js
declare global {
  var __meliSyncQueueInstance: MeliSyncQueueManager | undefined;
}

const queueInstance = globalThis.__meliSyncQueueInstance || new MeliSyncQueueManager();
if (process.env.NODE_ENV !== 'production') {
  globalThis.__meliSyncQueueInstance = queueInstance;
}

export const meliSyncQueue = queueInstance;

export function enqueueMeliStockSync(productId: string, tenantId: string | null): boolean {
  return queueInstance.enqueue(productId, tenantId);
}

export function getMeliQueueStats() {
  return queueInstance.getStats();
}

export function clearMeliQueue() {
  queueInstance.clear();
}
