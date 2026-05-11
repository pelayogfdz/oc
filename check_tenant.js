const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({ where: { email: 'ventas4@officecity.com.mx' } });
  console.log('User tenant:', user.tenantId);
  const branches = await prisma.branch.findMany({ where: { tenantId: user.tenantId } });
  console.log('Branches for this tenant:', branches.map(b => b.id + ' active:' + b.isActive));
}

main().catch(console.error).finally(() => prisma.$disconnect());
