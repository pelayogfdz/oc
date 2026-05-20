const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const branches = await prisma.branch.findMany({
    include: {
      tenant: true
    }
  });
  console.log(`Total branches in DB: ${branches.length}`);
  for (const b of branches) {
    console.log(`Branch Name: ${b.name}`);
    console.log(`  ID: ${b.id}`);
    console.log(`  Tenant: ${b.tenant.name} (ID: ${b.tenant.id})`);
    console.log('---');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
