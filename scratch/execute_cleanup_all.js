const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const orphanedBranchIds = [
  '428a0c19-31c8-49f9-8391-8d7d1800c006',
  'a5475e62-2e1f-4b2d-82c6-4f00b8ee844d',
  '36142abe-25c3-4697-9997-86fd475ef0d7',
  'be26644c-fad8-4c2a-80d4-f400e2bf439b'
];

const OFFICE_CITY_MAIN_BRANCH = '97fbcaee-b61c-4bdc-bb5f-ebacf98222bf';
const OFFICE_CITY_TENANT = '8b52cbcd-c956-4717-a1bd-02e57386aaa2';

const SEIT_MAIN_BRANCH = 'df4febf5-b5e0-4eb5-a39f-22fb23bbe121';
const SEIT_TENANT = 'cd1e1142-ae76-46aa-b2d2-e5de02904788';

async function main() {
  console.log('=== STARTING COMPREHENSIVE DATABASE CLEANUP ===');

  // 1. Process prospects of branch '428a0c19-31c8-49f9-8391-8d7d1800c006' carefully
  console.log('Migrating prospects from orphaned branch...');
  const prospects = await prisma.prospect.findMany({
    where: { branchId: '428a0c19-31c8-49f9-8391-8d7d1800c006' }
  });

  console.log(`Found ${prospects.length} prospects to check.`);
  for (const pr of prospects) {
    if (pr.phone) {
      // Find duplicate on OFFICE CITY main
      const existing = await prisma.prospect.findFirst({
        where: {
          phone: pr.phone,
          branchId: OFFICE_CITY_MAIN_BRANCH
        }
      });

      if (existing) {
        console.log(`Prospect duplicate found for phone: ${pr.phone}. Merging...`);
        // Move messages to the existing one
        await prisma.whatsAppMessage.updateMany({
          where: { prospectId: pr.id },
          data: { prospectId: existing.id }
        });
        // Delete orphaned prospect
        await prisma.prospect.delete({
          where: { id: pr.id }
        });
      } else {
        console.log(`No duplicate for phone: ${pr.phone}. Reassigning branch...`);
        await prisma.prospect.update({
          where: { id: pr.id },
          data: { branchId: OFFICE_CITY_MAIN_BRANCH }
        });
      }
    } else {
      console.log(`Prospect ${pr.id} has no phone. Reassigning branch...`);
      await prisma.prospect.update({
        where: { id: pr.id },
        data: { branchId: OFFICE_CITY_MAIN_BRANCH }
      });
    }
  }

  // 2. Delete PriceList records for all orphaned branches
  console.log('Deleting PriceLists for orphaned branches...');
  const deletedPriceLists = await prisma.priceList.deleteMany({
    where: { branchId: { in: orphanedBranchIds } }
  });
  console.log(`Deleted ${deletedPriceLists.count} PriceLists.`);

  // 3. Delete HrLocation records for orphaned branch
  console.log('Deleting HrLocation records for orphaned branches...');
  const deletedHrLocations = await prisma.hrLocation.deleteMany({
    where: { branchId: 'a5475e62-2e1f-4b2d-82c6-4f00b8ee844d' }
  });
  console.log(`Deleted ${deletedHrLocations.count} HrLocations.`);

  // 4. Update users to belong to correct tenants and branches
  console.log('Updating user tenant/branch mappings...');
  
  await prisma.user.update({
    where: { email: 'slara@seit.com.mx' },
    data: { tenantId: SEIT_TENANT, branchId: SEIT_MAIN_BRANCH }
  });
  console.log('Updated slara@seit.com.mx');

  await prisma.user.update({
    where: { email: 'neworg@test.com' },
    data: { tenantId: OFFICE_CITY_TENANT, branchId: OFFICE_CITY_MAIN_BRANCH }
  });
  console.log('Updated neworg@test.com');

  await prisma.user.update({
    where: { email: 'testuser@example.com' },
    data: { tenantId: OFFICE_CITY_TENANT, branchId: OFFICE_CITY_MAIN_BRANCH }
  });
  console.log('Updated testuser@example.com');

  await prisma.user.update({
    where: { email: 'pelayogfdz@gmail.com' },
    data: { tenantId: OFFICE_CITY_TENANT, branchId: OFFICE_CITY_MAIN_BRANCH }
  });
  console.log('Updated pelayogfdz@gmail.com');

  await prisma.user.update({
    where: { email: 'testagent123@example.com' },
    data: { tenantId: OFFICE_CITY_TENANT, branchId: OFFICE_CITY_MAIN_BRANCH }
  });
  console.log('Updated testagent123@example.com');

  // 5. Delete WhatsApp sessions for orphaned branches
  console.log('Deleting WhatsApp sessions for orphaned branches...');
  const deletedSessions = await prisma.whatsAppSession.deleteMany({
    where: { branchId: { in: orphanedBranchIds } }
  });
  console.log(`Deleted ${deletedSessions.count} WhatsApp sessions.`);

  // 6. Delete the orphaned branches themselves
  console.log('Deleting orphaned branches...');
  const deletedBranches = await prisma.branch.deleteMany({
    where: { id: { in: orphanedBranchIds } }
  });
  console.log(`Deleted ${deletedBranches.count} orphaned branches.`);

  console.log('=== COMPREHENSIVE DATABASE CLEANUP COMPLETED ===');
}

main().catch(console.error).finally(() => prisma.$disconnect());
