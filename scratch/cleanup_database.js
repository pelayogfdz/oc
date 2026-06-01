const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const email = 'juan.perez.local@caanma.com';
  console.log("Cleaning up test user:", email);
  const result = await prisma.user.deleteMany({
    where: { email }
  });
  console.log(`Successfully deleted ${result.count} test user(s).`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
