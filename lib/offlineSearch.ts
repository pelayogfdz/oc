import { CAANMAOfflineDB, db, OfflineProduct, OfflineCustomer } from './offlineDB';

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
 * Genera tokens limpios y desglosados para símbolos, guiones y medidas (ej. 'AX-120B', '200g', '1/2', '15kg', '1pza')
 */
function expandSearchWord(word: string): string[] {
  const clean = normalizeText(word);
  if (!clean) return [];
  const set = new Set<string>();
  set.add(clean);

  // Remueve guiones y caracteres especiales
  const noPunct = clean.replace(/[-_./\\#+*]/g, '');
  if (noPunct && noPunct !== clean) {
    set.add(noPunct);
  }

  // Desglosa combinación número + unidad (ej. '9v', '1060toner', '1pza', '600ml')
  const matchNumUnit = clean.match(/^(\d+)([a-z]+)$/);
  if (matchNumUnit) {
    set.add(matchNumUnit[1]);
    set.add(matchNumUnit[2]);
  }

  // Desglosa combinación unidad + número (ej. 'cat6', 'cal22')
  const matchUnitNum = clean.match(/^([a-z]+)(\d+)$/);
  if (matchUnitNum) {
    set.add(matchUnitNum[1]);
    set.add(matchUnitNum[2]);
  }

  // Sub-tokens separados por guión o barra (ej. 'ax-120b' -> 'ax', '120b')
  if (clean.includes('-') || clean.includes('/') || clean.includes('.')) {
    const parts = clean.split(/[-_./\\]+/).filter(p => p.length > 0);
    for (const p of parts) {
      set.add(p);
    }
  }

  return Array.from(set);
}

export interface OfflineSearchOptions {
  category?: string;
  status?: string;
  stock?: string;
  brand?: string;
  type?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
}

export interface IndexedOfflineProduct extends OfflineProduct {
  _normName: string;
  _normSku: string;
  _normBarcode: string;
  _normCategory: string;
  _normBrand: string;
  _searchBlob: string;
  _variantTokens: { id: string; sku: string; barcode: string; attribute: string; price?: number; stock?: number }[];
}

export interface IndexedOfflineCustomer extends OfflineCustomer {
  _normName: string;
  _normEmail: string;
  _normPhone: string;
  _normAddress: string;
  _searchBlob: string;
}

// In-Memory Search Caches
let productMemoryCache: IndexedOfflineProduct[] | null = null;
let exactBarcodeSkuMap = new Map<string, IndexedOfflineProduct>();
let productLoadPromise: Promise<IndexedOfflineProduct[]> | null = null;

let customerMemoryCache: IndexedOfflineCustomer[] | null = null;
let customerLoadPromise: Promise<IndexedOfflineCustomer[]> | null = null;

/**
 * Invalida todos los cachés en memoria para recargar desde Dexie IndexedDB
 */
export function invalidateOfflineSearchCache() {
  productMemoryCache = null;
  exactBarcodeSkuMap.clear();
  productLoadPromise = null;
  customerMemoryCache = null;
  customerLoadPromise = null;
}

/**
 * Pre-carga y construye los índices en memoria en segundo plano
 */
export async function warmOfflineSearchCache(customDb?: CAANMAOfflineDB): Promise<void> {
  const database = customDb || db;
  try {
    await Promise.all([
      getOrLoadMemoryProducts(database),
      getOrLoadMemoryCustomers(database)
    ]);
  } catch (e) {
    console.warn('[OfflineSearch] Warning during cache warm-up:', e);
  }
}

async function getOrLoadMemoryProducts(database: CAANMAOfflineDB): Promise<IndexedOfflineProduct[]> {
  if (productMemoryCache !== null) {
    return productMemoryCache;
  }

  if (productLoadPromise !== null) {
    return productLoadPromise;
  }

  productLoadPromise = (async () => {
    try {
      const rawProducts = await database.products.toArray();
      const indexed: IndexedOfflineProduct[] = [];
      const newExactMap = new Map<string, IndexedOfflineProduct>();

      for (let i = 0; i < rawProducts.length; i++) {
        const p = rawProducts[i];
        const normName = normalizeText(p.name);
        const normSku = normalizeText(p.sku);
        const normBarcode = normalizeText(p.barcode);
        const normCat = normalizeText(p.category);
        const normBrand = normalizeText((p as any).brand);
        const normDesc = normalizeText((p as any).description);

        const variants = Array.isArray(p.variants) ? p.variants : [];
        const variantTokens = variants.map(v => ({
          id: v.id || '',
          sku: normalizeText(v.sku),
          barcode: normalizeText(v.barcode),
          attribute: normalizeText(v.attribute),
          price: v.price,
          stock: v.stock
        }));

        const variantBlob = variantTokens.map(v => `${v.sku} ${v.barcode} ${v.attribute}`).join(' ');
        
        // Bloque de búsqueda con variantes y palabras clave expandidas
        const searchBlob = `${normName} ${normSku} ${normBarcode} ${normCat} ${normBrand} ${normDesc} ${variantBlob}`;

        const item: IndexedOfflineProduct = {
          ...p,
          _normName: normName,
          _normSku: normSku,
          _normBarcode: normBarcode,
          _normCategory: normCat,
          _normBrand: normBrand,
          _searchBlob: searchBlob,
          _variantTokens: variantTokens
        };

        indexed.push(item);

        // Registro en mapa O(1) de escaneo exacto
        if (normBarcode) newExactMap.set(normBarcode, item);
        if (normSku) newExactMap.set(normSku, item);
        for (let vIdx = 0; vIdx < variantTokens.length; vIdx++) {
          const v = variantTokens[vIdx];
          if (v.barcode) newExactMap.set(v.barcode, item);
          if (v.sku) newExactMap.set(v.sku, item);
        }
      }

      productMemoryCache = indexed;
      exactBarcodeSkuMap = newExactMap;
      return indexed;
    } catch (e) {
      console.error('[OfflineSearch] Error building in-memory product index:', e);
      return [];
    } finally {
      productLoadPromise = null;
    }
  })();

  return productLoadPromise;
}

async function getOrLoadMemoryCustomers(database: CAANMAOfflineDB): Promise<IndexedOfflineCustomer[]> {
  if (customerMemoryCache !== null) {
    return customerMemoryCache;
  }

  if (customerLoadPromise !== null) {
    return customerLoadPromise;
  }

  customerLoadPromise = (async () => {
    try {
      const rawCustomers = await database.customers.toArray();
      const indexed: IndexedOfflineCustomer[] = [];

      for (let i = 0; i < rawCustomers.length; i++) {
        const c = rawCustomers[i];
        const normName = normalizeText(c.name);
        const normLegalName = normalizeText(c.legalName || '');
        const normTaxId = normalizeText(c.taxId || '');
        const normEmail = normalizeText(c.email);
        const normPhone = normalizeText(c.phone);
        const normAddress = normalizeText(`${c.street || ''} ${c.exteriorNumber || ''}`);
        const searchBlob = `${normName} ${normLegalName} ${normTaxId} ${normEmail} ${normPhone} ${normAddress}`;

        indexed.push({
          ...c,
          _normName: normName,
          _normEmail: normEmail,
          _normPhone: normPhone,
          _normAddress: normAddress,
          _searchBlob: searchBlob
        });
      }

      customerMemoryCache = indexed;
      return indexed;
    } catch (e) {
      console.error('[OfflineSearch] Error building in-memory customer index:', e);
      return [];
    } finally {
      customerLoadPromise = null;
    }
  })();

  return customerLoadPromise;
}

/**
 * Búsqueda de productos Offline de alto rendimiento sobre IndexedDB (Dexie).
 * Utiliza índice en memoria precargado para respuestas instantáneas (< 2ms).
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
  const limit = options?.limit !== undefined ? options.limit : 2000;

  try {
    const allProducts = await getOrLoadMemoryProducts(database);

    if (allProducts.length === 0) {
      return [];
    }

    // 1. Optimización para Código de Barras / SKU Exacto (Escáner de código de barras) -> O(1) < 0.1ms
    if (searchWords.length === 1 && exactBarcodeSkuMap.has(normalizedQuery)) {
      const exactMatch = exactBarcodeSkuMap.get(normalizedQuery)!;
      let branchOk = true;
      if (branchId && branchId !== 'GLOBAL' && branchId !== 'ALL') {
        if (exactMatch.branchId && exactMatch.branchId !== 'GLOBAL' && exactMatch.branchId !== 'ALL' && exactMatch.branchId !== branchId) {
          branchOk = false;
        }
      }
      if (branchOk) {
        return [exactMatch];
      }
    }

    const results: IndexedOfflineProduct[] = [];

    for (let i = 0; i < allProducts.length; i++) {
      const p = allProducts[i];

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
        if (p._normCategory !== normalizeText(options.category)) continue;
      }

      // 4. Filtro de Existencias / Stock
      if (options?.stock) {
        if (options.stock === 'IN_STOCK' && (p.stock || 0) <= 0) continue;
        if (options.stock === 'OUT_OF_STOCK' && (p.stock || 0) > 0) continue;
        if (options.stock === 'LOW_STOCK' && (p.stock || 0) > 5) continue;
        if (options.stock === 'NEGATIVE_STOCK' && (p.stock || 0) >= 0) continue;
      }

      // 4b. Filtro de Rango de Precio
      if (options?.minPrice !== undefined && options.minPrice !== null && !isNaN(options.minPrice)) {
        if ((p.price || 0) < options.minPrice) continue;
      }
      if (options?.maxPrice !== undefined && options.maxPrice !== null && !isNaN(options.maxPrice)) {
        if ((p.price || 0) > options.maxPrice) continue;
      }

      // 5. Coincidencia de Palabras de Búsqueda (Multi-word search AND estricto)
      if (searchWords.length > 0) {
        let matchesAllWords = true;
        for (let wIdx = 0; wIdx < searchWords.length; wIdx++) {
          const rawWord = searchWords[wIdx];
          const candidates = expandSearchWord(rawWord);
          const wordMatch = candidates.some(word => p._searchBlob.includes(word));
          if (!wordMatch) {
            matchesAllWords = false;
            break;
          }
        }

        if (!matchesAllWords) continue;
      }

      results.push(p);

      // Si no hay búsqueda por texto, limitar rápidamente si se especificó un límite positivo
      if (searchWords.length === 0 && limit > 0 && results.length >= limit) {
        break;
      }
    }

    // 6. Ordenamiento y Ponderación de Relevancia
    if (options?.sortBy) {
      const field = options.sortBy;
      const order = options.sortOrder || 'asc';
      results.sort((a, b) => {
        let valA: any = (a as any)[field];
        let valB: any = (b as any)[field];
        if (field === 'price' || field === 'stock') {
          valA = Number(valA) || 0;
          valB = Number(valB) || 0;
        } else if (field === 'sales') {
          valA = Number(a.salesCount || 0);
          valB = Number(b.salesCount || 0);
        } else if (field === 'createdAt') {
          valA = new Date(valA || 0).getTime() || 0;
          valB = new Date(valB || 0).getTime() || 0;
        } else {
          valA = String(valA || '').toLowerCase();
          valB = String(valB || '').toLowerCase();
        }
        if (valA < valB) return order === 'asc' ? -1 : 1;
        if (valA > valB) return order === 'asc' ? 1 : -1;
        return 0;
      });
    } else if (searchWords.length > 0) {
      const exactTerm = normalizedQuery;
      results.sort((a, b) => {
        // Prioridad 1: Coincidencia Exacta en Código de Barras o SKU
        const aExact = a._normSku === exactTerm || a._normBarcode === exactTerm;
        const bExact = b._normSku === exactTerm || b._normBarcode === exactTerm;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;

        // Prioridad 2: Coincidencia Exacta en Variante SKU o Barcode
        const aVarExact = a._variantTokens.some(v => v.sku === exactTerm || v.barcode === exactTerm);
        const bVarExact = b._variantTokens.some(v => v.sku === exactTerm || v.barcode === exactTerm);
        if (aVarExact && !bVarExact) return -1;
        if (!aVarExact && bVarExact) return 1;

        // Prioridad 3: Empieza con el término de búsqueda
        const aStarts = a._normName.startsWith(exactTerm) || a._normSku.startsWith(exactTerm) || a._normBarcode.startsWith(exactTerm);
        const bStarts = b._normName.startsWith(exactTerm) || b._normSku.startsWith(exactTerm) || b._normBarcode.startsWith(exactTerm);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;

        return (a.name || '').localeCompare(b.name || '');
      });
    }

    return limit > 0 ? results.slice(0, limit) : results;
  } catch (err) {
    console.error('[OfflineSearch] Error searching offline products:', err);
    return [];
  }
}

/**
 * Búsqueda de clientes Offline de alto rendimiento sobre IndexedDB (Dexie).
 * Busca instantáneamente por Nombre, Teléfono, Email o Dirección con soporte Multi-Palabra AND.
 */
export async function searchOfflineCustomers(
  query: string,
  branchId?: string,
  options?: { limit?: number },
  customDb?: CAANMAOfflineDB
): Promise<OfflineCustomer[]> {
  const database = customDb || db;
  const rawQuery = (query || '').trim();
  const normalizedQuery = normalizeText(rawQuery);
  const searchWords = normalizedQuery.split(/\s+/).filter(w => w.length > 0);
  const limit = options?.limit || 50;

  try {
    const allCustomers = await getOrLoadMemoryCustomers(database);
    if (allCustomers.length === 0) return [];

    const results: IndexedOfflineCustomer[] = [];

    for (let i = 0; i < allCustomers.length; i++) {
      const c = allCustomers[i];

      // Filtro de Sucursal (si aplica y no es global)
      if (branchId && branchId !== 'GLOBAL' && branchId !== 'ALL' && c.branchId) {
        if (c.branchId !== 'GLOBAL' && c.branchId !== 'ALL' && c.branchId !== branchId) {
          continue;
        }
      }

      if (searchWords.length > 0) {
        let matchesAllWords = true;
        for (let wIdx = 0; wIdx < searchWords.length; wIdx++) {
          const word = searchWords[wIdx];
          if (!c._searchBlob.includes(word)) {
            matchesAllWords = false;
            break;
          }
        }
        if (!matchesAllWords) continue;
      }

      results.push(c);
      if (searchWords.length === 0 && results.length >= limit) {
        break;
      }
    }

    if (searchWords.length > 0) {
      results.sort((a, b) => {
        // Prioridad 1: Coincidencia que empieza por el término
        const aStarts = a._normName.startsWith(normalizedQuery) || a._normPhone.startsWith(normalizedQuery);
        const bStarts = b._normName.startsWith(normalizedQuery) || b._normPhone.startsWith(normalizedQuery);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;

        return (a.name || '').localeCompare(b.name || '');
      });
    }

    return results.slice(0, limit);
  } catch (err) {
    console.error('[OfflineSearch] Error searching offline customers:', err);
    return [];
  }
}
