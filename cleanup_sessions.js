const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();

async function main() {
  console.log("Starting full multitenant WhatsApp sessions database and directory cleanup...");

  // 1. Fetch all tenants and their branches
  const tenants = await prisma.tenant.findMany({
    include: {
      branches: {
        where: { isActive: true },
        orderBy: { createdAt: 'asc' }
      }
    }
  });

  const primaryBranchIds = new Set();
  const primaryBranchMap = new Map(); // tenantId -> primaryBranchId

  for (const tenant of tenants) {
    if (tenant.branches.length > 0) {
      const primaryBranch = tenant.branches[0];
      primaryBranchIds.add(primaryBranch.id);
      primaryBranchMap.set(tenant.id, primaryBranch.id);
      console.log(`Tenant ${tenant.name} (${tenant.id}): Primary branch is ${primaryBranch.name} (${primaryBranch.id})`);
    }
  }

  // 2. Fetch all WhatsApp sessions
  const sessions = await prisma.whatsAppSession.findMany();
  console.log(`Found ${sessions.length} total WhatsApp session rows in DB.`);

  let deletedCount = 0;
  let resetCount = 0;

  for (const session of sessions) {
    // Check if this branch is a primary branch of any tenant
    if (primaryBranchIds.has(session.branchId)) {
      // Primary branch: reset status to DISCONNECTED
      await prisma.whatsAppSession.update({
        where: { id: session.id },
        data: {
          status: 'DISCONNECTED',
          sessionData: null
        }
      });
      resetCount++;
      console.log(`Reset primary branch session to DISCONNECTED: ${session.branchId}`);
    } else {
      // Sibling/redundant branch: delete session row completely
      await prisma.whatsAppSession.delete({
        where: { id: session.id }
      });
      deletedCount++;
      console.log(`Deleted redundant sibling branch session row: ${session.branchId}`);
    }
  }

  console.log(`DB cleanup complete: Deleted ${deletedCount} redundant sessions, Reset ${resetCount} primary sessions.`);

  // 3. Make sure every tenant's primary branch has a DISCONNECTED whatsAppSession row
  let createdCount = 0;
  for (const [tenantId, primaryBranchId] of primaryBranchMap.entries()) {
    const existing = await prisma.whatsAppSession.findUnique({
      where: { branchId: primaryBranchId }
    });
    if (!existing) {
      await prisma.whatsAppSession.create({
        data: {
          branchId: primaryBranchId,
          status: 'DISCONNECTED'
        }
      });
      createdCount++;
      console.log(`Created missing primary branch session row for branch: ${primaryBranchId}`);
    }
  }
  console.log(`Created ${createdCount} missing primary sessions.`);

  // 4. Safely delete all session directories in .wwebjs_auth to clear lock files and cache
  const authDir = path.resolve(process.cwd(), './.wwebjs_auth');
  if (fs.existsSync(authDir)) {
    const files = fs.readdirSync(authDir);
    for (const file of files) {
      if (file.startsWith('session-branch-') || file.startsWith('session-br-') || file === 'session') {
        const fullPath = path.join(authDir, file);
        try {
          fs.rmSync(fullPath, { recursive: true, force: true });
          console.log(`Successfully deleted session folder: ${file}`);
        } catch (err) {
          console.error(`Failed to delete session folder ${file}:`, err.message);
        }
      }
    }
  }

  console.log("Full session cleanup complete!");
}

main()
  .catch(err => console.error("Error during cleanup:", err))
  .finally(() => prisma.$disconnect());
