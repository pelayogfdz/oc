const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const sessions = await prisma.whatsAppSession.findMany({
    include: {
      branch: {
        include: {
          tenant: true
        }
      }
    }
  });

  console.log(`Found ${sessions.length} sessions in DB:`);
  for (const s of sessions) {
    console.log(`Session: ${s.id}`);
    console.log(`  Status: ${s.status}`);
    console.log(`  Branch: ${s.branch.name} (ID: ${s.branchId})`);
    console.log(`  Tenant: ${s.branch.tenant.name} (ID: ${s.branch.tenant.id})`);
    console.log(`  SessionData (first 50 chars): ${s.sessionData ? s.sessionData.substring(0, 50) : 'null'}`);
    console.log('---');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
