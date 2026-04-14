const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const branch = await prisma.branch.findFirst({where: {name: 'Zona Industrial PIQ'}});
  const hpProducts = await prisma.product.findMany({
    where: {
      branchId: branch.id,
      name: { contains: 'hp', mode: 'insensitive' }
    }
  });
  console.log(`Found ${hpProducts.length} HP products totally.`);
  if (hpProducts.length > 0) {
     console.log(hpProducts[0]);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
