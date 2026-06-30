const { PrismaClient } = require('@prisma/client');
const { URL } = require('url');

const masterUrl = process.env.DATABASE_URL;
const urlObj = new URL(masterUrl);
urlObj.pathname = '/neondb_petqro';
const petqroPrisma = new PrismaClient({ datasources: { db: { url: urlObj.toString() } } });

async function main() {
  const users = await petqroPrisma.user.findMany({
    include: { tenant: true }
  });
  console.log("Users in PETQRO DB:");
  users.forEach(u => {
    console.log(`- ID: ${u.id}`);
    console.log(`  Name: ${u.name}`);
    console.log(`  Email: ${u.email}`);
    console.log(`  Role: ${u.role}`);
    console.log(`  BranchId: ${u.branchId}`);
  });
}

main()
  .catch(console.error)
  .finally(() => petqroPrisma.$disconnect());
