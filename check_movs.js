const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const movs = await prisma.inventoryMovement.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: { product: true }
  });
  console.log(JSON.stringify(movs, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
