const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    include: {
      branch: true,
      tenant: true
    }
  });

  console.log('Users in DB:');
  for (const user of users) {
    console.log(`User Name: ${user.name}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Tenant: ${user.tenant?.name} (ID: ${user.tenantId})`);
    console.log(`  Branch: ${user.branch?.name} (ID: ${user.branchId})`);
    console.log(`  Role: ${user.role}`);
    console.log('---');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
