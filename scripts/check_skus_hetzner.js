const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    select: { id: true, sku: true, name: true, branchId: true }
  });
  
  const withPlus = products.filter(p => p.sku && p.sku.includes('+'));
  console.log(`Found ${withPlus.length} products with plus in SKU:`);
  for (const p of withPlus.slice(0, 50)) {
    console.log(`- ID: ${p.id}, SKU: ${p.sku}, Name: ${p.name}, Branch: ${p.branchId}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
