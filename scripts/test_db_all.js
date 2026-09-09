const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const host = '5.78.138.167';
const privateKeyPath = path.join(__dirname, '..', 'HetznerKey.pem');

const conn = new Client();
conn.on('ready', () => {
  console.log('Testing full database and SSR rendering in container...');

  const testScript = `
const { PrismaClient } = require('@prisma/client');

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

const SYNONYMS_MAP = {
  'libreta': ['libreta', 'cuaderno', 'block'],
  'cuaderno': ['cuaderno', 'libreta', 'block'],
  'block': ['block', 'libreta', 'cuaderno'],
  'hoja': ['papel bond', 'bond', 'hoja bond', 'resma', 'facia bond', 'copamex'],
  'papel': ['papel bond', 'bond', 'hoja bond', 'resma', 'facia bond', 'copamex'],
  'bond': ['papel bond', 'bond', 'facia bond', 'copamex'],
  'pluma': ['boligrafo', 'bolígrafo', 'pluma', 'roller', 'punto'],
  'boligrafo': ['boligrafo', 'bolígrafo', 'pluma', 'roller', 'punto'],
  'lapiz': ['lapiz', 'lápiz', 'grafito', 'mirado', 'dixon', 'portaminas'],
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

function stemSpanishWord(word) {
  let w = word.toLowerCase().trim();
  w = w.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');
  if (w.endsWith('ces') && w.length > 4) return w.slice(0, -3) + 'z';
  if (w.endsWith('es') && w.length > 4 && !w.endsWith('tes') && !w.endsWith('nes')) return w.slice(0, -2);
  if (w.endsWith('as') && w.length > 4) return w.slice(0, -1);
  if (w.endsWith('os') && w.length > 4) return w.slice(0, -1);
  if (w.endsWith('s') && !w.endsWith('is') && !w.endsWith('us') && w.length > 3) return w.slice(0, -1);
  return w;
}

function parseQueryTokens(query) {
  const rawWords = query
    .toLowerCase()
    .replace(/[^a-záéíóúüñ0-9\\s]/gi, ' ')
    .split(/\\s+/)
    .map(w => w.trim())
    .filter(w => w.length >= 2 && !STOPWORDS.has(w) && !/^\\d+$/.test(w));

  const primaryNouns = new Set();
  const modifiers = new Set();
  const synonyms = new Set();
  const requestedColors = new Set();

  for (const w of rawWords) {
    const rawClean = w.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');
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

async function matchItem(prisma, branchId, customerId, itemReq) {
  const rawQuery = itemReq.query.trim();
  const parsed = parseQueryTokens(rawQuery);
  const allKeywords = Array.from(new Set([...parsed.primaryNouns, ...parsed.synonyms]));

  // Query up to 60 candidates
  const candidates = await prisma.product.findMany({
    where: {
      branchId,
      isActive: true,
      OR: [
        { sku: { equals: rawQuery, mode: 'insensitive' } },
        { barcode: { equals: rawQuery, mode: 'insensitive' } },
        ...allKeywords.map(k => ({ name: { contains: k, mode: 'insensitive' } }))
      ]
    },
    take: 60
  });

  const candidateIds = candidates.map(c => c.id);

  let historyMap = new Map();
  if (customerId) {
    const history = await prisma.saleItem.findMany({
      where: {
        sale: { customerId, status: { notIn: ['CANCELLED', 'REFUNDED'] } },
        productId: { in: candidateIds }
      },
      select: { productId: true, price: true }
    });
    history.forEach(h => historyMap.set(h.productId, h.price));
  }

  const isLapisQuery = parsed.primaryNouns.some(n => n.includes('lapiz') || n.includes('lápiz') || n.includes('lapicero'));
  const isPlumaQuery = parsed.primaryNouns.some(n => n.includes('pluma') || n.includes('boligrafo'));
  const isHojaQuery = parsed.primaryNouns.some(n => n.includes('hoja') || n.includes('papel') || n.includes('bond'));
  const isEngrapadoraQuery = parsed.primaryNouns.some(n => n.includes('engrapadora') || n.includes('engrapador'));

  const scored = candidates.map(p => {
    const nameLower = p.name.toLowerCase();
    let score = 0;
    let badge = 'Sugerencia Inteligente';
    let source = 'DIRECT';

    // 1. EXACT SKU / BARCODE MATCH (The ONLY case for "Coincidencia Directa")
    const isExactCode = (p.sku && p.sku.toLowerCase() === rawQuery.toLowerCase()) || (p.barcode && p.barcode === rawQuery);
    if (isExactCode) {
      score += 200;
      badge = 'Coincidencia Directa';
      source = 'DIRECT';
    } else {
      // It is NOT a direct code match -> Everything else is a suggestion!
      const matchesNoun = parsed.primaryNouns.some(n => nameLower.includes(n));
      const matchesMod = parsed.modifiers.some(m => nameLower.includes(m));
      const matchesSyn = parsed.synonyms.some(s => nameLower.includes(s));

      if (matchesNoun && matchesMod) score += 50;
      else if (matchesNoun) score += 35;
      else if (matchesSyn && matchesMod) score += 25;
      else if (matchesSyn) score += 15;

      // Color disambiguation & penalty for conflicting colors
      if (parsed.requestedColors.length > 0) {
        const hasRequestedColor = parsed.requestedColors.some(c => nameLower.includes(c));
        const conflictingColors = ALL_COLORS.filter(c => !parsed.requestedColors.includes(c) && nameLower.includes(c));

        if (hasRequestedColor) {
          score += 40; // Boost matching color
        }
        if (conflictingColors.length > 0 && !hasRequestedColor) {
          score -= 70; // Penalize wrong color (e.g. turquesa/pastel when white requested)
        }
      }

      // Domain Negative Filters:
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
        score -= 20; // Heavily penalize 0 stock for generic suggestions!
      }
    }

    return {
      product: p,
      score,
      badge,
      source
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return { query: rawQuery, top10: scored.slice(0, 10) };
}

async function testAll() {
  const prisma = new PrismaClient({ datasources: { db: { url: 'postgresql://postgres:caanma_postgres_secure_2026@caanma-db:5432/neondb_officecity' } } });
  try {
    const branch = await prisma.branch.findFirst({ where: { isActive: true } });
    console.log('Testing in branch: ' + branch.name + ' (' + branch.id + ')');

    const testQueries = [
      'Una caja de hojas blancas tamaño carta',
      'Caja de 10 plumas (tinta negra y azul)',
      '1 caja de 10 Lápices o lapiceros',
      'Una engrapadora',
      'Sacapuntas',
      '4 libretas de bolsillo'
    ];

    for (const q of testQueries) {
      const res = await matchItem(prisma, branch.id, null, { query: q });
      console.log('\\n===============================================================');
      console.log('QUERY: "' + q + '"');
      console.log('TOP 10 SUGGESTIONS:');
      res.top10.forEach((s, idx) => {
        console.log(\`  \${idx + 1}. [\${s.badge}] \${s.product.name} (SKU: \${s.product.sku}) | Stock: \${s.product.stock} | Price: $\${s.product.price} | Score: \${s.score.toFixed(1)}\`);
      });
    }
  } catch(e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

testAll();
`;

  conn.exec('docker exec -i caanma-app node', (err, stream) => {
    if (err) {
      console.error(err);
      conn.end();
      return;
    }
    stream.on('data', d => process.stdout.write(d));
    stream.stderr.on('data', d => process.stderr.write(d));
    stream.on('close', () => conn.end());
    stream.write(testScript);
    stream.end();
  });
}).connect({
  host,
  port: 22,
  username: 'root',
  privateKey: fs.readFileSync(privateKeyPath)
});
