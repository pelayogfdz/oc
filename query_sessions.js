const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const sessions = await prisma.whatsAppSession.findMany();
  console.log("ALL SESSIONS:", sessions);
  const branches = await prisma.branch.findMany();
  console.log("ALL BRANCHES:", branches);
}

main().finally(() => prisma.$disconnect());
