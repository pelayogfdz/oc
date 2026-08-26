const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    where: {
      OR: [
        { sku: { contains: '+' } },
        { sku: { contains: '#' } },
        { sku: { contains: '%' } }
      ]
    },
    select: { id: true, sku: true, name: true, branchId: true }
  });
  
  console.log(`Found ${products.length} products with special characters in SKU:`);
  for (const p of products) {
    console.log(`- ID: ${p.id}, SKU: ${p.sku}, Name: ${p.name}, Branch: ${p.branchId}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
