const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== STARTING DATABASE CLEANUP ===');

  // 1. Update Stanley Lara (slara@seit.com.mx) to correct SEIT tenant and branch
  console.log('Updating user slara@seit.com.mx...');
  const updatedSlara = await prisma.user.update({
    where: { email: 'slara@seit.com.mx' },
    data: {
      tenantId: 'cd1e1142-ae76-46aa-b2d2-e5de02904788', // SEIT
      branchId: 'df4febf5-b5e0-4eb5-a39f-22fb23bbe121'  // SEIT Matriz
    }
  });
  console.log('User slara@seit.com.mx updated successfully.');

  // 2. Update Admin Org (neworg@test.com) to correct OFFICE CITY main branch
  console.log('Updating user neworg@test.com...');
  const updatedAdminOrg = await prisma.user.update({
    where: { email: 'neworg@test.com' },
    data: {
      tenantId: '8b52cbcd-c956-4717-a1bd-02e57386aaa2', // OFFICE CITY
      branchId: '97fbcaee-b61c-4bdc-bb5f-ebacf98222bf'  // OFFICE CITY main branch
    }
  });
  console.log('User neworg@test.com updated successfully.');

  // 3. Update Test User (testuser@example.com) to correct OFFICE CITY main branch
  console.log('Updating user testuser@example.com...');
  const updatedTestUser = await prisma.user.update({
    where: { email: 'testuser@example.com' },
    data: {
      tenantId: '8b52cbcd-c956-4717-a1bd-02e57386aaa2', // OFFICE CITY
      branchId: '97fbcaee-b61c-4bdc-bb5f-ebacf98222bf'  // OFFICE CITY main branch
    }
  });
  console.log('User testuser@example.com updated successfully.');

  // 4. Delete WhatsApp sessions for orphaned branches
  console.log('Deleting WhatsApp sessions for orphaned branches...');
  const deletedSessions = await prisma.whatsAppSession.deleteMany({
    where: {
      branchId: {
        in: [
          '428a0c19-31c8-49f9-8391-8d7d1800c006',
          'a5475e62-2e1f-4b2d-82c6-4f00b8ee844d',
          '36142abe-25c3-4697-9997-86fd475ef0d7',
          'be26644c-fad8-4c2a-80d4-f400e2bf439b'
        ]
      }
    }
  });
  console.log(`Deleted ${deletedSessions.count} WhatsApp sessions.`);

  // 5. Clean up those orphaned branches
  console.log('Deleting orphaned branches...');
  const deletedBranches = await prisma.branch.deleteMany({
    where: {
      id: {
        in: [
          '428a0c19-31c8-49f9-8391-8d7d1800c006',
          'a5475e62-2e1f-4b2d-82c6-4f00b8ee844d',
          '36142abe-25c3-4697-9997-86fd475ef0d7',
          'be26644c-fad8-4c2a-80d4-f400e2bf439b'
        ]
      }
    }
  });
  console.log(`Deleted ${deletedBranches.count} orphaned branches.`);

  console.log('=== DATABASE CLEANUP COMPLETED ===');
}

main().catch(console.error).finally(() => prisma.$disconnect());
