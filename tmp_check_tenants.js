const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tenants = await prisma.tenant.findMany({
    include: {
      branches: true,
      users: true
    }
  });

  for (const tenant of tenants) {
    console.log(`Tenant: ${tenant.name} (ID: ${tenant.id})`);
    console.log(`  Branches: ${tenant.branches.map(b => b.name).join(', ')}`);
    console.log(`  Users: ${tenant.users.map(u => u.email + ' (' + u.name + ')').join(', ')}`);
    console.log('---');
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
