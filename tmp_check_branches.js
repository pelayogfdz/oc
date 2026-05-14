const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const branches = await prisma.branch.findMany({
    select: { name: true, isActive: true }
  });
  console.log(branches);
}

main().finally(() => prisma.$disconnect());
