import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient(); // uses DATABASE_URL from .env (which is neondb)

async function main() {
  console.log("=== Checking neondb (from .env) ===");
  const branches = await prisma.branch.findMany();
  console.log("Branches in neondb:");
  for (const b of branches) {
    const productsCount = await prisma.product.count({ where: { branchId: b.id } });
    const pricesCount = await prisma.productPrice.count({
      where: {
        product: {
          branchId: b.id
        }
      }
    });
    console.log(`- ${b.name} (${b.id}): ${productsCount} products, ${pricesCount} prices`);
  }

  const totalPrices = await prisma.productPrice.count();
  console.log(`\nTotal ProductPrice records in neondb: ${totalPrices}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
