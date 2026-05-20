const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('\n=== ALL BRANCHES ===');
  const branches = await prisma.branch.findMany({
    include: { tenant: true }
  });
  console.log(JSON.stringify(branches.map(b => ({
    id: b.id,
    name: b.name,
    isActive: b.isActive,
    tenantId: b.tenantId,
    tenantName: b.tenant ? b.tenant.name : 'ORPHAN (null)'
  })), null, 2));

  console.log('\n=== ALL WHATSAPP SESSIONS ===');
  const sessions = await prisma.whatsAppSession.findMany({
    include: { branch: { include: { tenant: true } } }
  });
  console.log(JSON.stringify(sessions.map(s => ({
    id: s.id,
    branchId: s.branchId,
    branchName: s.branch ? s.branch.name : 'null',
    tenantName: s.branch && s.branch.tenant ? s.branch.tenant.name : 'ORPHAN (null)',
    status: s.status,
    sessionDataLength: s.sessionData ? s.sessionData.length : 0
  })), null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
