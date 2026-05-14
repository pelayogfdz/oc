const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const updated = await prisma.branch.updateMany({
    where: { isActive: false },
    data: { isActive: true }
  });
  console.log('Branches activated:', updated.count);
}

main().finally(() => prisma.$disconnect());
