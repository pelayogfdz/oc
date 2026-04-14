const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.product.count();
  console.log('Products:', count);
  const branches = await prisma.branch.findMany({
    include: { _count: { select: { products: true } } }
  });
  console.log(JSON.stringify(branches, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
