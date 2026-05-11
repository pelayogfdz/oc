const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tenants = await prisma.tenant.findMany();
  console.log('Tenants:', tenants.length);
  const branches = await prisma.branch.findMany();
  console.log('Branches:', branches.length);
  const users = await prisma.user.findMany();
  console.log('Users:', users.map(u => u.email));
}

main().catch(console.error).finally(() => prisma.$disconnect());
