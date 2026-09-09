const { PrismaClient } = require('@prisma/client');
const { URL } = require('url');

function cleanQueryTokens(text) {
  const stopwords = new Set([
    'de', 'la', 'el', 'los', 'las', 'un', 'una', 'unos', 'unas', 'y', 'o', 'para', 'con', 'por', 'en', 'a', 'del', 'al', 'que', 'no', 'si',
    'paquete', 'paquetes', 'pqt', 'pqte', 'caja', 'cajas', 'cja', 'pieza', 'piezas', 'pza', 'pzas',
    'metro', 'metros', 'mts', 'bote', 'botes', 'rollo', 'rollos', 'bolsa', 'bolsas', 'docena', 'docenas',
    'producto', 'productos', 'articulo', 'articulos', 'artículo', 'artículos', 'marca', 'tipo', 'modelo',
    'cotizame', 'cotizar', 'cotiza', 'quiero', 'necesito', 'favor', 'porfa', 'hola', 'saludos', 'buenos', 'dias', 'tardes'
  ]);

  return text
    .toLowerCase()
    .replace(/[^a-záéíóúüñ0-9\s]/gi, ' ')
    .split(/\s+/)
    .map(w => w.trim())
    .filter(w => w.length >= 2 && !stopwords.has(w));
}

function calculateProductPriceForCustomer(product, priceList) {
  if (priceList === 'specialPrice' && typeof product.specialPrice === 'number' && product.specialPrice > 0) {
    return product.specialPrice;
  }
  if (priceList === 'wholesalePrice' && typeof product.wholesalePrice === 'number' && product.wholesalePrice > 0) {
    return product.wholesalePrice;
  }
  return product.price || 0;
}

async function runTest() {
  const masterUrl = process.env.DATABASE_URL;
  const u = new URL(masterUrl);
  u.pathname = '/neondb_officecity';
  const prisma = new PrismaClient({ datasources: { db: { url: u.toString() } } });

  try {
    const branches = await prisma.branch.findMany();
    console.log('Available branches:', branches.map(b => ({ id: b.id, name: b.name })));
    const branch = branches[0];
    console.log('Testing branch:', branch.name, branch.id);
    const customer = await prisma.customer.findFirst();
    console.log('Customer detected:', customer ? customer.name : 'None', 'PriceList:', customer ? customer.priceList : 'none');

    const sampleQueries = [
      { qty: 10, query: 'papel bond carta' },
      { qty: 50, query: 'pluma bic negra' },
      { qty: 5, query: 'calculadora 8 digitos' },
      { qty: 2, query: 'cinta canela' },
      { qty: 1, query: 'producto que no existe xyz123' }
    ];

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setDate(sixMonthsAgo.getDate() - 180);

    for (const sq of sampleQueries) {
      console.log(`\n========================================`);
      console.log(`Query: "${sq.query}" | Cantidad: ${sq.qty}`);
      console.log(`========================================`);

      const tokens = cleanQueryTokens(sq.query);
      const suggestionsMap = new Map();

      // 1. Direct match
      const direct = await prisma.product.findMany({
        where: {
          branchId: branch.id,
          isActive: true,
          OR: [
            { sku: { equals: sq.query.trim(), mode: 'insensitive' } },
            { name: { equals: sq.query.trim(), mode: 'insensitive' } },
            { name: { contains: sq.query.trim(), mode: 'insensitive' } },
            ...(tokens.length > 0 ? [{
              AND: tokens.map(t => ({ name: { contains: t, mode: 'insensitive' } }))
            }] : [])
          ]
        },
        take: 5
      });

      for (const p of direct) {
        suggestionsMap.set(p.id, {
          product: p,
          source: 'DIRECT',
          badge: 'Coincidencia Directa',
          price: calculateProductPriceForCustomer(p, customer.priceList)
        });
      }

      // 2. Customer history
      if (customer && tokens.length > 0) {
        const history = await prisma.saleItem.findMany({
          where: {
            sale: {
              customerId: customer.id,
              status: { notIn: ['CANCELLED', 'REFUNDED'] }
            },
            product: {
              branchId: branch.id,
              isActive: true,
              AND: tokens.map(t => ({ name: { contains: t, mode: 'insensitive' } }))
            }
          },
          include: { product: true, sale: true },
          take: 5
        });

        for (const h of history) {
          if (!suggestionsMap.has(h.product.id)) {
            suggestionsMap.set(h.product.id, {
              product: h.product,
              source: 'HISTORY',
              badge: 'Comprado anteriormente por cliente',
              price: calculateProductPriceForCustomer(h.product, customer.priceList),
              lastSoldPrice: h.price
            });
          } else {
            const ex = suggestionsMap.get(h.product.id);
            ex.source = 'HISTORY';
            ex.badge = 'Comprado anteriormente por cliente';
            ex.lastSoldPrice = h.price;
          }
        }
      }

      // 3. Top selling
      if (suggestionsMap.size < 3 && tokens.length > 0) {
        const topSelling = await prisma.saleItem.groupBy({
          by: ['productId'],
          where: {
            sale: {
              branchId: branch.id,
              createdAt: { gte: sixMonthsAgo },
              status: { notIn: ['CANCELLED', 'REFUNDED'] }
            },
            product: {
              branchId: branch.id,
              isActive: true,
              OR: tokens.map(t => ({ name: { contains: t, mode: 'insensitive' } }))
            }
          },
          _sum: { quantity: true },
          orderBy: { _sum: { quantity: 'desc' } },
          take: 3
        });

        for (const ts of topSelling) {
          if (suggestionsMap.has(ts.productId)) continue;
          const p = await prisma.product.findUnique({ where: { id: ts.productId } });
          if (p && p.isActive) {
            suggestionsMap.set(p.id, {
              product: p,
              source: 'TOP_SELLER',
              badge: `Más vendido (${ts._sum.quantity} uds)`,
              price: calculateProductPriceForCustomer(p, customer.priceList)
            });
          }
        }
      }

      // 4. High stock
      if (suggestionsMap.size < 3 && tokens.length > 0) {
        const highStock = await prisma.product.findMany({
          where: {
            branchId: branch.id,
            isActive: true,
            stock: { gt: 0 },
            OR: tokens.map(t => ({ name: { contains: t, mode: 'insensitive' } }))
          },
          orderBy: { stock: 'desc' },
          take: 3
        });

        for (const p of highStock) {
          if (suggestionsMap.has(p.id)) continue;
          suggestionsMap.set(p.id, {
            product: p,
            source: 'HIGH_STOCK',
            badge: `Mayor stock disponible (${p.stock} pzas)`,
            price: calculateProductPriceForCustomer(p, customer.priceList)
          });
        }
      }

      const all = Array.from(suggestionsMap.values());
      console.log(`Found ${all.length} matching suggestions:`);
      if (all.length === 0) {
        console.log(`  -> RESULT: UNRESOLVED (Dejado libre para selección manual del vendedor)`);
      } else {
        const best = all.find(s => s.source === 'HISTORY') || all[0];
        console.log(`  -> TOP SELECTION: [${best.badge}] "${best.product.name}" (SKU: ${best.product.sku})`);
        console.log(`     Precio normal: $${best.product.price} | Precio asignado cliente (${customer.priceList}): $${best.price} | Stock: ${best.product.stock}`);
        if (best.lastSoldPrice) {
          console.log(`     Último precio vendido a este cliente: $${best.lastSoldPrice}`);
        }
        for (let i = 0; i < all.length; i++) {
          console.log(`     Alt #${i+1}: [${all[i].badge}] ${all[i].product.name} - $${all[i].price} (Stock: ${all[i].product.stock})`);
        }
      }
    }

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

runTest();
