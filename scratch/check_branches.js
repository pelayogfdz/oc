const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const branches = await prisma.branch.findMany({
    include: {
      tenant: true
    }
  });

  console.log('Branches in DB:');
  for (const branch of branches) {
    console.log(`Branch Name: ${branch.name}`);
    console.log(`  ID: ${branch.id}`);
    console.log(`  Tenant: ${branch.tenant?.name} (ID: ${branch.tenantId})`);
    console.log(`  Active: ${branch.isActive}`);
    console.log('---');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
