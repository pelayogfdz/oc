const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const branch = await prisma.branch.findFirst({where: {name: 'Zona Industrial PIQ'}});
  const hpProducts = await prisma.product.count({
    where: { branchId: branch.id, name: { contains: 'hp', mode: 'insensitive' } }
  });
  console.log('Total HP in PIQ:', hpProducts);
}

main().catch(console.error).finally(() => prisma.$disconnect());
