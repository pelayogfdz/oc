const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: {
      branchId: {
        in: [
          '428a0c19-31c8-49f9-8391-8d7d1800c006',
          'a5475e62-2e1f-4b2d-82c6-4f00b8ee844d',
          '36142abe-25c3-4697-9997-86fd475ef0d7',
          'be26644c-fad8-4c2a-80d4-f400e2bf439b'
        ]
      }
    },
    include: { branch: true, tenant: true }
  });

  console.log('=== USERS MAPPED TO ORPHANED BRANCHES ===');
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
