const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const b = await prisma.branchSettings.findFirst({ where: { branch: { tenantId: '8b52cbcd-c956-4717-a1bd-02e57386aaa2' } } });
  console.log(b.ventasConfig);
}
main().catch(console.error).finally(() => prisma.$disconnect());
