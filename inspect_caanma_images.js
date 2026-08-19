const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    where: {
      NOT: { imageUrl: null }
    },
    take: 15,
    select: {
      sku: true,
      name: true,
      imageUrl: true
    }
  });
  console.log('Result:', JSON.stringify(products, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
