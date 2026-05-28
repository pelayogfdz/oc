const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- WhatsApp Session Status in DB ---');
  const sessions = await prisma.whatsAppSession.findMany();
  console.log(sessions);

  console.log('\n--- WhatsApp Sync Requests ---');
  const syncs = await prisma.whatsAppSyncRequest.findMany();
  console.log(syncs);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
