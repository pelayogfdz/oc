const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { email: { contains: 'petqro' } },
        { email: { contains: 'pet' } },
        { tenantId: 'db5d3949-f8dd-41f6-9627-90374d55d044' }
      ]
    },
    include: { tenant: true, branch: true }
  });

  console.log('=== PETQRO USERS ===');
  console.log(JSON.stringify(users.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    tenantId: u.tenantId,
    tenantName: u.tenant ? u.tenant.name : 'null',
    branchId: u.branchId,
    branchName: u.branch ? u.branch.name : 'null'
  })), null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
