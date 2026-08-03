const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:caanma_postgres_secure_2026@db:5432/neondb_pizca?sslmode=disable"
    }
  }
});

async function main() {
  // Count total products
  const total = await prisma.product.count();
  console.log("Total de productos en neondb_pizca:", total);

  // Group by taxType and taxRate
  const taxGroups = await prisma.product.groupBy({
    by: ['taxType', 'taxRate'],
    _count: {
      id: true
    }
  });
  console.log("\nDistribución actual de impuestos:");
  taxGroups.forEach(g => {
    console.log(`- Tipo: ${g.taxType || 'N/A'}, Tasa: ${g.taxRate}%, Cantidad: ${g._count.id}`);
  });

  // Query products containing vela, caja, domo, bolsa, etc.
  const keywords = ['vela', 'caja', 'domo', 'bolsa', 'globo', 'base', 'tarjeta', 'capacillo', 'liston', 'empaque'];
  console.log("\nBúsqueda de palabras clave para tasa 16%:");
  for (const kw of keywords) {
    const products = await prisma.product.findMany({
      where: {
        name: { contains: kw, mode: 'insensitive' }
      },
      select: {
        id: true,
        name: true,
        taxType: true,
        taxRate: true
      },
      take: 10
    });
    console.log(`- Palabra "${kw}": ${products.length} productos encontrados.`);
    products.forEach(p => {
      console.log(`  * ${p.name} [ID: ${p.id}, Impuesto: ${p.taxType} / ${p.taxRate}%]`);
    });
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
