import { CAANMAOfflineDB, db } from './offlineDB';

/**
 * Normaliza cadenas de texto para búsqueda:
 * - Convierte a minúsculas
 * - Remueve acentos y diacríticos (ej. 'Público' -> 'publico', 'Café' -> 'cafe')
 * - Elimina espacios en blanco redundantes
 */
export function normalizeText(str: string | null | undefined): string {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Expande tokens compuestos (ej. '9v', '200g', '15kg', '1pza') para permitir
 * coincidencias tanto del término completo como del número base.
 */
function expandSearchWord(word: string): string[] {
  const match = word.match(/^(\d+)([a-zA-Z]+)$/);
  if (match) {
    return [word, match[1]];
  }
  return [word];
}

export interface OfflineSearchOptions {
  category?: string;
  status?: string;
  stock?: string;
  brand?: string;
  type?: string;
  limit?: number;
}

/**
 * Búsqueda de productos Offline de alto rendimiento sobre IndexedDB (Dexie).
 * Soporta búsqueda multi-palabra (ej. "pila 9", "toner 1060"), coincidencia por SKU, código de barras,
 * variantes y compatibilidad agnóstica de sucursales globales o locales.
 */
export async function searchOfflineProducts(
  query: string,
  branchId?: string,
  options?: OfflineSearchOptions,
  customDb?: CAANMAOfflineDB
): Promise<any[]> {
  const database = customDb || db;
  const rawQuery = (query || '').trim();
  const normalizedQuery = normalizeText(rawQuery);
  const searchWords = normalizedQuery.split(/\s+/).filter(w => w.length > 0);
  const limit = options?.limit || 100;

  try {
    const allProducts = await database.products.toArray();

    if (allProducts.length === 0) {
      return [];
    }

    const results: any[] = [];

    for (const p of allProducts) {
      // 1. Filtro de Sucursal (Permisivo para GLOBAL, ALL y sucursal activa)
      if (branchId && branchId !== 'GLOBAL' && branchId !== 'ALL') {
        if (p.branchId && p.branchId !== 'GLOBAL' && p.branchId !== 'ALL' && p.branchId !== branchId) {
          continue;
        }
      }

      // 2. Filtro de Estado Activo/Inactivo
      if (options?.status) {
        if (options.status === 'ACTIVE' && (p as any).isActive === false) continue;
        if (options.status === 'INACTIVE' && (p as any).isActive !== false) continue;
      }

      // 3. Filtro de Categoría
      if (options?.category && options.category !== 'ALL') {
        if (normalizeText(p.category) !== normalizeText(options.category)) continue;
      }

      // 4. Filtro de Existencias / Stock
      if (options?.stock) {
        if (options.stock === 'IN_STOCK' && (p.stock || 0) <= 0) continue;
        if (options.stock === 'OUT_OF_STOCK' && (p.stock || 0) > 0) continue;
        if (options.stock === 'LOW_STOCK' && (p.stock || 0) > 5) continue;
      }

      // 5. Coincidencia de Palabras de Búsqueda (Multi-word search)
      if (searchWords.length > 0) {
        const normName = normalizeText(p.name);
        const normSku = normalizeText(p.sku);
        const normBarcode = normalizeText(p.barcode);
        const normCat = normalizeText(p.category);

        const variants = Array.isArray(p.variants) ? p.variants : [];
        const variantTexts = variants.map(v => ({
          sku: normalizeText(v.sku),
          barcode: normalizeText(v.barcode),
          attribute: normalizeText(v.attribute)
        }));

        // Cada palabra buscada debe coincidir en al menos uno de los campos del producto o sus variantes
        const matchesAllWords = searchWords.every(rawWord => {
          const candidates = expandSearchWord(rawWord);
          return candidates.some(word => {
            if (normName.includes(word)) return true;
            if (normSku.includes(word)) return true;
            if (normBarcode.includes(word)) return true;
            if (normCat.includes(word)) return true;
            return variantTexts.some(v => 
              v.sku.includes(word) || v.barcode.includes(word) || v.attribute.includes(word)
            );
          });
        });

        if (!matchesAllWords) continue;
      }

      results.push(p);
    }

    // 6. Ordenamiento y Ponderación de Relevancia
    if (searchWords.length > 0) {
      const exactTerm = normalizedQuery;
      results.sort((a, b) => {
        const aSku = normalizeText(a.sku);
        const bSku = normalizeText(b.sku);
        const aBarcode = normalizeText(a.barcode);
        const bBarcode = normalizeText(b.barcode);

        // Prioridad 1: Coincidencia Exacta en Código de Barras o SKU
        const aExact = aSku === exactTerm || aBarcode === exactTerm;
        const bExact = bSku === exactTerm || bBarcode === exactTerm;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;

        // Prioridad 2: Empieza con el término de búsqueda
        const aName = normalizeText(a.name);
        const bName = normalizeText(b.name);
        const aStarts = aName.startsWith(exactTerm) || aSku.startsWith(exactTerm) || aBarcode.startsWith(exactTerm);
        const bStarts = bName.startsWith(exactTerm) || bSku.startsWith(exactTerm) || bBarcode.startsWith(exactTerm);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;

        return (a.name || '').localeCompare(b.name || '');
      });
    } else {
      results.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    return results.slice(0, limit);
  } catch (err) {
    console.error('[OfflineSearch] Error searching offline products:', err);
    return [];
  }
}
