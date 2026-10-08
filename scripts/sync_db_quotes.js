const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');

async function syncTenantQuotes(databaseUrl, dbName) {
  console.log(`\n=== Procesando cotizaciones para tenant: ${dbName} ===`);
  const prisma = new PrismaClient({
    datasources: { db: { url: databaseUrl } }
  });

  try {
    const quotes = await prisma.quote.findMany({
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    });

    console.log(`Total cotizaciones encontradas: ${quotes.length}`);

    let updatedCount = 0;
    for (const quote of quotes) {
      if (!quote.items || quote.items.length === 0) continue;

      let subtotalSinIva = 0;
      quote.items.forEach(it => {
        const rate = (it.product?.taxType === 'IVA' || it.product?.taxType === 'IVA_IEPS') ? (it.product?.taxRate ?? 16.0) : 16.0;
        const unitSinIva = Math.round((it.price / (1 + rate / 100)) * 100) / 100;
        const rowSubtotal = Math.round((unitSinIva * it.quantity) * 100) / 100;
        subtotalSinIva += rowSubtotal;
      });

      subtotalSinIva = Math.round(subtotalSinIva * 100) / 100;
      const computedIva = Math.round((subtotalSinIva * 0.16) * 100) / 100;
      const computedTotal = Math.round((subtotalSinIva + computedIva) * 100) / 100;

      const diff = Math.abs(quote.total - computedTotal);
      if (diff > 0.009 && diff < 10) {
        console.log(`Cotización Folio: ${quote.folio || quote.id} | Anterior Total: ${quote.total} => Nuevo Total Alineado: ${computedTotal}`);
        await prisma.quote.update({
          where: { id: quote.id },
          data: { total: computedTotal }
        });
        updatedCount++;
      } else if (quote.folio && quote.folio.includes('3050')) {
        console.log(`Forzando sincronización para Folio 3050: ${quote.total} => ${computedTotal}`);
        await prisma.quote.update({
          where: { id: quote.id },
          data: { total: computedTotal }
        });
        updatedCount++;
      }
    }

    console.log(`Tenant ${dbName} finalizado. Cotizaciones actualizadas: ${updatedCount}`);
  } catch (err) {
    console.error(`Error en tenant ${dbName}:`, err.message);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const host = process.env.DB_HOST || (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('@db:') ? 'db' : (process.env.DOCKER_CONTAINER ? 'db' : '127.0.0.1'));
  const tenants = ['neondb', 'neondb_officecity', 'neondb_petqro', 'neondb_seit', 'neondb_pizca'];
  for (const db of tenants) {
    const dbUrl = `postgresql://postgres:caanma_postgres_secure_2026@${host}:5432/${db}?sslmode=disable`;
    await syncTenantQuotes(dbUrl, db);
  }
}

main().catch(console.error);
