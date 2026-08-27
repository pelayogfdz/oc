const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: { url: 'postgresql://postgres:caanma_postgres_secure_2026@127.0.0.1:5433/neondb_petqro?sslmode=disable' }
  }
});

async function main() {
  const sales = await prisma.sale.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { items: true, customer: true }
  });

  console.log("Analyzing last 100 sales for petqro...");
  for (const s of sales) {
    const itemsSum = s.items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    // If breakdownDiscounts is true, itemsSum > s.total is EXPECTED.
    // We only care about anomalies where breakdownDiscounts is FALSE, 
    // OR where itemsSum < s.total (which shouldn't happen unless there's a tip).
    
    // We also want to just list any sale where the customer is NOT public
    if (s.customer) {
       console.log(`Sale ${s.folio}: Total=${s.total}, ItemsSum=${itemsSum.toFixed(2)}, Breakdown=${s.breakdownDiscounts}, Customer=${s.customer.name}`);
    }
  }
}

main().finally(() => prisma.$disconnect());
