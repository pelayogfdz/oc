const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: { url: 'postgresql://postgres:caanma_postgres_secure_2026@127.0.0.1:5433/neondb_petqro?sslmode=disable' }
  }
});

async function main() {
  const sales = await prisma.sale.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      items: { include: { product: true } }
    }
  });

  for (const s of sales) {
    const itemsSum = s.items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    const hasDiscrepancy = Math.abs(itemsSum - s.total) > 0.05;
    
    // Also check if any item has an unusual price (e.g. negative or 0 when it shouldn't be)
    // Or if the total seems completely wrong
    
    console.log(Sale : DB Total: , Items Sum: , Diff: , Discrepancy: );
  }
}
main().catch(e => console.error(e)).finally(() => prisma.());
