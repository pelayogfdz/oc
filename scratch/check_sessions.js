const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: {
      currentSessionId: {
        not: null
      }
    },
    select: {
      id: true,
      name: true,
      email: true,
      currentSessionId: true,
      updatedAt: true
    },
    orderBy: {
      updatedAt: 'desc'
    }
  });
  console.log("=== USERS WITH ACTIVE SESSIONS ===");
  console.log(JSON.stringify(users, null, 2));
}

main().finally(() => prisma.$disconnect());
