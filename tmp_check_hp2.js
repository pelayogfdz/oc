const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const hpProductsTotal = await prisma.product.count({where: {name: {contains: 'hp', mode: 'insensitive'}}});
  console.log('Total HP across ALL branches:', hpProductsTotal); 
}

main().catch(console.error).finally(() => prisma.$disconnect());
