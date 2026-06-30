const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const latestSale = await prisma.sale.findFirst({
    orderBy: { createdAt: 'desc' },
    include: { items: true }
  });

  console.log('Latest sale in DB:', JSON.stringify(latestSale, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
