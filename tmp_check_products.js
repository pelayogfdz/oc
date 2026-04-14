const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const branch = await prisma.branch.findFirst({where: {name: 'Zona Industrial PIQ'}});
  const products = await prisma.product.findMany({ 
    where: { branchId: branch.id }, 
    take: 50 
  });
  console.log(products.map(p => p.name));
}

main().catch(console.error).finally(() => prisma.$disconnect());
