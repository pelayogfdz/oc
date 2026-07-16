const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      managerId: true,
      tenantId: true,
      branchId: true,
      isSuperAdmin: true,
      createdAt: true
    },
    orderBy: { createdAt: 'desc' },
    take: 20
  });
  console.log("Recent 20 users:");
  console.log(JSON.stringify(users, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
