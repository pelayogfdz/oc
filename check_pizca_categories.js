const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:caanma_postgres_secure_2026@db:5432/neondb_pizca?sslmode=disable"
    }
  }
});

async function main() {
  const categories = await prisma.product.groupBy({
    by: ['category'],
    _count: {
      id: true
    }
  });

  console.log("Categorías de productos en neondb_pizca:");
  categories.forEach(c => {
    console.log(`- Categoría: "${c.category || 'N/A'}", Productos: ${c._count.id}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
