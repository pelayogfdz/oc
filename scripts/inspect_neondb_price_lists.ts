import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient(); // uses DATABASE_URL from .env (neondb)

async function main() {
  const priceLists = await prisma.priceList.findMany({
    include: { branch: true }
  });
  console.log("=== Price Lists in neondb ===");
  for (const pl of priceLists) {
    console.log(`- ${pl.name}`);
    console.log(`  ID: ${pl.id}`);
    console.log(`  Branch: ${pl.branch.name} (${pl.branchId})`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
