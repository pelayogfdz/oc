'use server';

import { prisma } from '@/lib/prisma';
import { getActiveBranch } from './auth';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface SuggestionOption {
  product: {
    id: string;
    sku: string;
    barcode: string | null;
    name: string;
    stock: number;
    price: number;
    wholesalePrice: number | null;
    specialPrice: number | null;
    unit?: string | null;
    imageUrl?: string | null;
  };
  source: 'DIRECT' | 'HISTORY' | 'TOP_SELLER' | 'HIGH_STOCK';
  badge: string;
  assignedPrice: number;
  lastSoldPrice?: number | null;
  purchaseCount?: number;
  totalSalesQty?: number;
}

export interface AssistantItemResult {
  id: string;
  lineIndex: number;
  rawQuery: string;
  quantity: number;
  selectedProduct: SuggestionOption['product'] | null;
  selectedSource: 'DIRECT' | 'HISTORY' | 'TOP_SELLER' | 'HIGH_STOCK' | 'UNRESOLVED';
  selectedBadge: string;
  assignedPrice: number;
  suggestions: SuggestionOption[];
}

export interface AssistantParseResult {
  success: boolean;
  error?: string;
  detectedCustomer: {
    id: string;
    name: string;
    legalName?: string | null;
    taxId?: string | null;
    priceList: string;
  } | null;
  candidateCustomers: Array<{
    id: string;
    name: string;
    legalName?: string | null;
    taxId?: string | null;
    priceList: string;
  }>;
  items: AssistantItemResult[];
}

function calculateProductPriceForCustomer(
  product: { price: number; wholesalePrice?: number | null; specialPrice?: number | null; prices?: any[] },
  priceList: string
): number {
  if (priceList === 'specialPrice' && typeof product.specialPrice === 'number' && product.specialPrice > 0) {
    return product.specialPrice;
  }
  if (priceList === 'wholesalePrice' && typeof product.wholesalePrice === 'number' && product.wholesalePrice > 0) {
    return product.wholesalePrice;
  }
  if (product.prices && Array.isArray(product.prices) && priceList) {
    const custom = product.prices.find((p: any) => p.priceListId === priceList || p.priceList?.name === priceList);
    if (custom && typeof custom.price === 'number' && custom.price > 0) {
      return custom.price;
    }
  }
  return product.price || 0;
}

const STOPWORDS = new Set([
  'de', 'la', 'el', 'los', 'las', 'un', 'una', 'uno', 'unos', 'unas', 'y', 'o', 'u', 'e',
  'para', 'con', 'por', 'en', 'a', 'al', 'del', 'que', 'no', 'si', 'se', 'su', 'sus',
  'paquete', 'paquetes', 'pqt', 'pqte', 'caja', 'cajas', 'cja', 'pieza', 'piezas', 'pza', 'pzas',
  'metro', 'metros', 'mts', 'bote', 'botes', 'rollo', 'rollos', 'bolsa', 'bolsas', 'docena', 'docenas',
  'millar', 'millares', 'juego', 'juegos', 'set', 'kit',
  'producto', 'productos', 'articulo', 'articulos', 'artículo', 'artículos', 'marca', 'tipo', 'modelo',
  'cotizame', 'cotizar', 'cotiza', 'quiero', 'necesito', 'favor', 'porfa', 'hola', 'saludos', 'buenos', 'dias', 'tardes',
  'tamaño', 'tamano', 'medida', 'color', 'colores', 'tinta'
]);

const SYNONYMS_MAP: Record<string, string[]> = {
  'libreta': ['libreta', 'cuaderno', 'block'],
  'cuaderno': ['cuaderno', 'libreta', 'block'],
  'block': ['block', 'libreta', 'cuaderno'],
  'hoja': ['papel bond', 'bond', 'hoja bond', 'resma'],
  'papel': ['papel bond', 'bond', 'hoja bond', 'resma'],
  'bond': ['papel bond', 'bond', 'facia bond'],
  'pluma': ['boligrafo', 'bolígrafo', 'pluma', 'roller'],
  'boligrafo': ['boligrafo', 'bolígrafo', 'pluma', 'roller'],
  'lapiz': ['lapiz', 'lápiz', 'grafito', 'mirado', 'dixon'],
  'lapicero': ['lapicero', 'portaminas', 'boligrafo', 'pluma'],
  'portaminas': ['portaminas', 'lapicero'],
  'engrapadora': ['engrapadora', 'engrapador'],
  'grapas': ['grapas', 'grapa', 'engrapadora'],
  'sacapuntas': ['sacapuntas', 'tajalapiz', 'afilalapiz'],
  'carpeta': ['carpeta', 'lefort', 'registrador', 'folder'],
  'folder': ['folder', 'carpeta'],
  'goma': ['goma', 'borrador'],
  'borrador': ['borrador', 'goma'],
  'tijera': ['tijera', 'tijeras', 'cúter', 'cutter'],
  'marcador': ['marcador', 'plumon', 'plumón', 'resaltador', 'marcatextos'],
  'plumon': ['plumon', 'plumón', 'marcador', 'resaltador'],
  'cinta': ['cinta canela', 'cinta masking', 'cinta adhesiva', 'cinta de empaque', 'diurex', 'cinta'],
  'calculadora': ['calculadora']
};

const ALL_COLORS = ['blanco', 'blanca', 'negro', 'negra', 'azul', 'rojo', 'roja', 'verde', 'amarillo', 'amarilla', 'rosa', 'morado', 'morada', 'turquesa', 'naranja', 'cafe', 'marron', 'lila', 'fucsia', 'pastel', 'neon', 'vainilla', 'canario'];

const MODIFIER_WORDS = new Set([
  'bolsillo', 'chico', 'chica', 'mediano', 'mediana', 'grande', 'extra', 'jumbo',
  ...ALL_COLORS,
  'carta', 'oficio', 'doble', 'tabloide', 'a4',
  'cuadro', 'raya', 'doble raya', 'cuadro chico', 'cuadro grande',
  'fino', 'mediano', 'grueso', 'ultra fino', 'gel', 'punto',
  'escolar', 'oficina', 'industrial', 'universal', 'rudo'
]);

function stemSpanishWord(word: string): string {
  let w = word.toLowerCase().trim();
  w = w.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  if (w.endsWith('ces') && w.length > 4) {
    return w.slice(0, -3) + 'z';
  }
  if (w.endsWith('es') && w.length > 4 && !w.endsWith('tes') && !w.endsWith('nes')) {
    return w.slice(0, -2);
  }
  if (w.endsWith('as') && w.length > 4) {
    return w.slice(0, -1);
  }
  if (w.endsWith('os') && w.length > 4) {
    return w.slice(0, -1);
  }
  if (w.endsWith('s') && !w.endsWith('is') && !w.endsWith('us') && w.length > 3) {
    return w.slice(0, -1);
  }
  return w;
}

function parseQueryTokens(query: string) {
  const rawWords = query
    .toLowerCase()
    .replace(/[^a-záéíóúüñ0-9\s]/gi, ' ')
    .split(/\s+/)
    .map(w => w.trim())
    .filter(w => w.length >= 2 && !STOPWORDS.has(w) && !/^\d+$/.test(w));

  const primaryNouns = new Set<string>();
  const modifiers = new Set<string>();
  const synonyms = new Set<string>();
  const requestedColors = new Set<string>();

  for (const w of rawWords) {
    const rawClean = w.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const stem = stemSpanishWord(w);

    if (ALL_COLORS.includes(w) || ALL_COLORS.includes(rawClean)) {
      requestedColors.add(w);
      requestedColors.add(rawClean);
    }

    if (MODIFIER_WORDS.has(w) || MODIFIER_WORDS.has(rawClean) || MODIFIER_WORDS.has(stem)) {
      modifiers.add(w);
      modifiers.add(rawClean);
    } else {
      primaryNouns.add(w);
      primaryNouns.add(rawClean);
      primaryNouns.add(stem);

      if (SYNONYMS_MAP[w]) SYNONYMS_MAP[w].forEach(s => synonyms.add(s));
      if (SYNONYMS_MAP[stem]) SYNONYMS_MAP[stem].forEach(s => synonyms.add(s));
      if (SYNONYMS_MAP[rawClean]) SYNONYMS_MAP[rawClean].forEach(s => synonyms.add(s));
    }
  }

  if (primaryNouns.size === 0) {
    rawWords.forEach(w => primaryNouns.add(w));
  }

  return {
    rawWords,
    primaryNouns: Array.from(primaryNouns),
    modifiers: Array.from(modifiers),
    synonyms: Array.from(synonyms).filter(s => !primaryNouns.has(s)),
    requestedColors: Array.from(requestedColors)
  };
}

async function matchItemFast(
  branchId: string,
  customerId: string | null,
  priceListToUse: string,
  itemReq: { quantity: number; query: string },
  lineIndex: number
): Promise<AssistantItemResult> {
  const rawQuery = itemReq.query.trim();
  const quantity = itemReq.quantity;
  const parsedTokens = parseQueryTokens(rawQuery);
  const allKeywords = Array.from(new Set([...parsedTokens.primaryNouns, ...parsedTokens.synonyms]));

  if (allKeywords.length === 0) {
    return {
      id: `line_${lineIndex}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      lineIndex,
      rawQuery,
      quantity,
      selectedProduct: null,
      selectedSource: 'UNRESOLVED',
      selectedBadge: 'Sin coincidencia (Seleccionar)',
      assignedPrice: 0,
      suggestions: []
    };
  }

  const isLapisQuery = parsedTokens.primaryNouns.some(n => n.includes('lapiz') || n.includes('lápiz') || n.includes('lapicero'));
  const isPlumaQuery = parsedTokens.primaryNouns.some(n => n.includes('pluma') || n.includes('boligrafo'));
  const isHojaQuery = parsedTokens.primaryNouns.some(n => n.includes('hoja') || n.includes('papel') || n.includes('bond'));
  const isEngrapadoraQuery = parsedTokens.primaryNouns.some(n => n.includes('engrapadora') || n.includes('engrapador'));

  // Query up to 60 candidates in a single fast query
  const candidates = await prisma.product.findMany({
    where: {
      branchId,
      isActive: true,
      OR: [
        { sku: { equals: rawQuery, mode: 'insensitive' as const } },
        { barcode: { equals: rawQuery, mode: 'insensitive' as const } },
        ...allKeywords.map(k => ({ name: { contains: k, mode: 'insensitive' as const } }))
      ]
    },
    include: { prices: true },
    take: 60
  });

  if (candidates.length === 0) {
    return {
      id: `line_${lineIndex}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      lineIndex,
      rawQuery,
      quantity,
      selectedProduct: null,
      selectedSource: 'UNRESOLVED',
      selectedBadge: 'Sin coincidencia (Seleccionar)',
      assignedPrice: 0,
      suggestions: []
    };
  }

  const candidateIds = candidates.map(c => c.id);

  // Check customer history in parallel only for candidate IDs
  let historyMap = new Map<string, number>();
  if (customerId) {
    try {
      const history = await prisma.saleItem.findMany({
        where: {
          sale: { customerId, status: { notIn: ['CANCELLED', 'REFUNDED'] } },
          productId: { in: candidateIds }
        },
        select: { productId: true, price: true },
        take: 20
      });
      history.forEach(h => {
        if (h.productId && !historyMap.has(h.productId)) {
          historyMap.set(h.productId, h.price);
        }
      });
    } catch (e) {
      console.warn('[QuoteAssistant] History fetch error:', e);
    }
  }

  // In-Memory Scoring & Ranking (< 0.1ms)
  const scored = candidates.map(p => {
    const nameLower = p.name.toLowerCase();
    let score = 0;
    let badge = 'Sugerencia de Catálogo';
    let source: SuggestionOption['source'] = 'TOP_SELLER';

    // 1. EXACT SKU / BARCODE MATCH (The ONLY case for "Coincidencia Directa")
    const isExactCode = (p.sku && p.sku.toLowerCase() === rawQuery.toLowerCase()) || (p.barcode && p.barcode === rawQuery);
    if (isExactCode) {
      score += 200;
      badge = 'Coincidencia Directa (Código exacto)';
      source = 'DIRECT';
    } else {
      // It is NOT a direct code match -> Everything else is a suggestion!
      const matchesNoun = parsedTokens.primaryNouns.some(n => nameLower.includes(n));
      const matchesMod = parsedTokens.modifiers.some(m => nameLower.includes(m));
      const matchesSyn = parsedTokens.synonyms.some(s => nameLower.includes(s));

      if (matchesNoun && matchesMod) score += 50;
      else if (matchesNoun) score += 35;
      else if (matchesSyn && matchesMod) score += 25;
      else if (matchesSyn) score += 15;

      // Color disambiguation & penalty for conflicting colors
      if (parsedTokens.requestedColors.length > 0) {
        const hasRequestedColor = parsedTokens.requestedColors.some(c => nameLower.includes(c));
        const conflictingColors = ALL_COLORS.filter(c => !parsedTokens.requestedColors.includes(c) && nameLower.includes(c));

        if (hasRequestedColor) {
          score += 40; // Boost matching color (e.g. blanco)
        }
        if (conflictingColors.length > 0 && !hasRequestedColor) {
          score -= 70; // Penalize wrong color (e.g. turquesa/pastel when white requested)
        }
      }

      // Domain Negative & Positive Filters:
      if (isHojaQuery) {
        // Penalize acrylic holders, protectors, tracing paper, art paper, notebooks, binders
        if (nameLower.includes('porta hoja') || nameLower.includes('acrilico') || nameLower.includes('protector') || nameLower.includes('albanene') || nameLower.includes('barita') || nameLower.includes('mantequilla') || nameLower.includes('cuaderno') || nameLower.includes('libreta') || nameLower.includes('carpeta') || nameLower.includes('repuesto hoja')) {
          score -= 90;
        }

        // Check format match (carta vs oficio vs doble carta)
        const requestedCarta = rawQuery.toLowerCase().includes('carta') && !rawQuery.toLowerCase().includes('doble carta');
        const requestedOficio = rawQuery.toLowerCase().includes('oficio');

        if (requestedCarta) {
          if (nameLower.includes('carta') || nameLower.includes('t/c') || nameLower.includes('t/carta')) score += 30;
          if (nameLower.includes('oficio') && !nameLower.includes('carta')) score -= 30;
          if (nameLower.includes('doble carta')) score -= 25;
        } else if (requestedOficio) {
          if (nameLower.includes('oficio') || nameLower.includes('t/o')) score += 30;
          if (nameLower.includes('carta') && !nameLower.includes('oficio')) score -= 30;
        }

        // Boost true office bond paper
        if (nameLower.includes('papel bond') || nameLower.includes('facia bond') || nameLower.includes('copamex') || nameLower.includes('xerox') || nameLower.includes('report') || nameLower.includes('resma') || nameLower.includes('office') || nameLower.includes('500') || nameLower.includes('chamex') || nameLower.includes('scribe')) {
          score += 40;
        }
      }

      if (isLapisQuery) {
        if (nameLower.includes('adhesiv') || nameLower.includes('pegamento') || nameLower.includes('goma')) score -= 80;
        if (nameLower.includes('grafito') || nameLower.includes('mirado') || nameLower.includes('dixon') || nameLower.includes('madera')) score += 25;
      }

      if (isPlumaQuery) {
        if (nameLower.includes('ave') || nameLower.includes('manualidad')) score -= 80;
        if (nameLower.includes('boligrafo') || nameLower.includes('kilometrico') || nameLower.includes('bic') || nameLower.includes('pin point') || nameLower.includes('roller')) score += 25;
      }

      if (isEngrapadoraQuery) {
        if (nameLower.startsWith('grapas') || nameLower.startsWith('grapa ')) score -= 30;
      }

      // Customer History (Sugerencia #1)
      if (historyMap.has(p.id)) {
        score += 50;
        badge = 'Comprado antes por cliente';
        source = 'HISTORY';
      } else if (p.stock > 10) {
        badge = 'Sugerencia por Existencia';
        source = 'HIGH_STOCK';
      } else {
        badge = 'Sugerencia de Catálogo';
        source = 'TOP_SELLER';
      }

      // Stock Bonus / Out of stock penalty
      if (p.stock > 0) {
        score += Math.min(p.stock, 50) * 0.4;
      } else {
        score -= 20; // Heavily penalize 0 stock for generic suggestions
      }
    }

    const assignedPrice = calculateProductPriceForCustomer(p, priceListToUse);

    return {
      product: {
        id: p.id,
        sku: p.sku,
        barcode: p.barcode,
        name: p.name,
        stock: p.stock,
        price: p.price,
        wholesalePrice: p.wholesalePrice,
        specialPrice: p.specialPrice,
        unit: p.unit,
        imageUrl: p.imageUrl
      },
      source,
      badge,
      assignedPrice,
      lastSoldPrice: historyMap.get(p.id) || null,
      score
    };
  });

  scored.sort((a, b) => b.score - a.score);

  // Return TOP 10 Suggestions
  const topSuggestions: SuggestionOption[] = scored.slice(0, 10).map(s => ({
    product: s.product,
    source: s.source,
    badge: s.badge,
    assignedPrice: s.assignedPrice,
    lastSoldPrice: s.lastSoldPrice
  }));

  let selectedProduct: SuggestionOption['product'] | null = null;
  let selectedSource: AssistantItemResult['selectedSource'] = 'UNRESOLVED';
  let selectedBadge = 'Sin coincidencia (Seleccionar)';
  let assignedPrice = 0;

  if (topSuggestions.length > 0 && scored[0].score > 0) {
    const bestChoice = topSuggestions[0];
    selectedProduct = bestChoice.product;
    selectedSource = bestChoice.source;
    selectedBadge = bestChoice.badge;
    assignedPrice = bestChoice.assignedPrice;
  }

  return {
    id: `line_${lineIndex}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    lineIndex,
    rawQuery,
    quantity,
    selectedProduct,
    selectedSource,
    selectedBadge,
    assignedPrice,
    suggestions: topSuggestions
  };
}

export async function parseAndMatchQuoteAssistantAction(params: {
  text?: string;
  fileBase64?: string;
  fileMimeType?: string;
  fileName?: string;
  branchId?: string;
  customerId?: string | null;
}): Promise<AssistantParseResult> {
  try {
    const branch = await getActiveBranch();
    const finalBranchId = params.branchId || branch.id;
    if (!finalBranchId || finalBranchId === 'GLOBAL') {
      return {
        success: false,
        error: 'Selecciona una sucursal específica para cotizar.',
        detectedCustomer: null,
        candidateCustomers: [],
        items: []
      };
    }

    let rawText = params.text?.trim() || '';
    const cleanBase64 = params.fileBase64 ? params.fileBase64.replace(/^data:.*?;base64,/, '') : '';
    const mime = params.fileMimeType || 'image/jpeg';

    if (mime.startsWith('text/') && cleanBase64) {
      try {
        const decoded = Buffer.from(cleanBase64, 'base64').toString('utf-8');
        rawText = (rawText ? rawText + '\n' : '') + decoded;
      } catch (e) {
        console.error('[QuoteAssistant] Error decoding text file:', e);
      }
    }

    if (!rawText && !cleanBase64) {
      return {
        success: false,
        error: 'Por favor escribe un texto o sube una imagen/archivo para procesar.',
        detectedCustomer: null,
        candidateCustomers: [],
        items: []
      };
    }

    // Step 1: Use Gemini or Fallback Parser to extract customer & item lines
    let extractedCustomerName: string | null = null;
    let extractedItems: Array<{ quantity: number; query: string }> = [];

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== 'tu_clave_aqui') {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
          model: "gemini-2.5-flash",
          generationConfig: {
            maxOutputTokens: 800,
            temperature: 0.1
          }
        });
        const isMultimodal = cleanBase64 && (mime.startsWith('image/') || mime === 'application/pdf');

        const prompt = `Analiza la siguiente solicitud de cotización comercial, lista de compra, mensaje o foto de pedido y extrae en formato JSON estricto:
1. "customerName": Nombre o RFC del cliente mencionado (o null si no se menciona ninguno).
2. "items": Lista de productos solicitados. Para cada uno:
   - "quantity": Número entero o decimal de cantidad solicitada (default 1 si no se especifica).
   - "query": Término de búsqueda descriptivo y limpio con el sustantivo principal y atributos (ejemplos: "papel bond carta", "pluma boligrafo negra", "lapiz grafito", "engrapadora", "sacapuntas", "libreta bolsillo"). Si mencionan varias variantes como tinta negra y azul, puedes separar en 2 partidas o unificar.

Texto del usuario:
"""
${rawText}
"""

Responde ÚNICAMENTE con el objeto JSON válido con la estructura:
{
  "customerName": "string o null",
  "items": [
    { "quantity": 1, "query": "descripción de producto" }
  ]
}`;

        const contentParts: any[] = [];
        if (isMultimodal) {
          contentParts.push({
            inlineData: {
              data: cleanBase64,
              mimeType: mime
            }
          });
        }
        contentParts.push(prompt);

        const res = await model.generateContent(contentParts);
        const textResponse = res.response.text();
        const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.customerName && typeof parsed.customerName === 'string') {
            extractedCustomerName = parsed.customerName.trim();
          }
          if (Array.isArray(parsed.items)) {
            extractedItems = parsed.items.map((it: any) => ({
              quantity: typeof it.quantity === 'number' && it.quantity > 0 ? it.quantity : 1,
              query: String(it.query || '').trim()
            })).filter((it: any) => it.query.length > 0);
          }
        }
      } catch (geminiErr) {
        console.warn('[QuoteAssistant] Gemini API parsing fallback to regex:', geminiErr);
      }
    }

    // Fallback regex / line-by-line parser if Gemini didn't extract items
    if (extractedItems.length === 0 && rawText) {
      const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      for (const line of lines) {
        const custMatch = line.match(/(?:cliente|para|atencion|empresa)\s*[:=]\s*(.+)/i);
        if (custMatch && !extractedCustomerName) {
          extractedCustomerName = custMatch[1].trim();
          continue;
        }

        const qtyMatch = line.match(/^[-*•\d\.\)]*\s*(\d+(?:\.\d+)?)\s*(?:pzas?|piezas?|cajas?|paquetes?|pqts?|botes?|rollos?|docenas?|millares?|kgs?|mts?)?\s*(?:de)?\s*(.+)/i);
        if (qtyMatch) {
          const qty = parseFloat(qtyMatch[1]) || 1;
          const query = qtyMatch[2].trim();
          if (query) {
            extractedItems.push({ quantity: qty, query });
          }
        } else if (line.length > 2 && !line.toLowerCase().startsWith('hola') && !line.toLowerCase().startsWith('saludos')) {
          extractedItems.push({ quantity: 1, query: line.replace(/^[-*•\d\.\)]+\s*/, '').trim() });
        }
      }
    }

    // Step 2: Customer Resolution
    let resolvedCustomer: any = null;
    let candidateCustomers: any[] = [];

    if (params.customerId) {
      resolvedCustomer = await prisma.customer.findUnique({
        where: { id: params.customerId }
      });
      if (resolvedCustomer) {
        candidateCustomers = [resolvedCustomer];
      }
    } else if (extractedCustomerName) {
      const searchTerms = extractedCustomerName.split(/\s+/).filter(w => w.length >= 2);
      candidateCustomers = await prisma.customer.findMany({
        where: {
          OR: [
            { name: { contains: extractedCustomerName, mode: 'insensitive' as const } },
            { legalName: { contains: extractedCustomerName, mode: 'insensitive' as const } },
            { taxId: { contains: extractedCustomerName, mode: 'insensitive' as const } },
            ...searchTerms.map(t => ({ name: { contains: t, mode: 'insensitive' as const } }))
          ]
        },
        take: 5,
        orderBy: { name: 'asc' }
      });

      if (candidateCustomers.length > 0) {
        resolvedCustomer = candidateCustomers[0];
      }
    }

    const priceListToUse = resolvedCustomer?.priceList || 'price';
    const customerIdToUse = resolvedCustomer?.id || params.customerId || null;

    // Step 3: Match all items in parallel using the lightning-fast matching engine
    const itemsResults = await Promise.all(
      extractedItems.map((itemReq, idx) =>
        matchItemFast(finalBranchId, customerIdToUse, priceListToUse, itemReq, idx)
      )
    );

    return {
      success: true,
      detectedCustomer: resolvedCustomer ? {
        id: resolvedCustomer.id,
        name: resolvedCustomer.name,
        legalName: resolvedCustomer.legalName,
        taxId: resolvedCustomer.taxId,
        priceList: resolvedCustomer.priceList || 'price'
      } : null,
      candidateCustomers: candidateCustomers.map(c => ({
        id: c.id,
        name: c.name,
        legalName: c.legalName,
        taxId: c.taxId,
        priceList: c.priceList || 'price'
      })),
      items: itemsResults
    };

  } catch (error: any) {
    console.error('[QuoteAssistant] parseAndMatchQuoteAssistantAction error:', error);
    return {
      success: false,
      error: error.message || 'Error inesperado al procesar la cotización.',
      detectedCustomer: null,
      candidateCustomers: [],
      items: []
    };
  }
}
