const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { email: true, name: true, tenantId: true }
  });
  console.log("All users:");
  console.log(users);
}

main().catch(console.error).finally(() => prisma.$disconnect());
