const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const existingUser = await prisma.user.findUnique({
    where: { email: 'testagent@caanma.com' }
  });
  
  if (existingUser) {
    await prisma.user.delete({
      where: { email: 'testagent@caanma.com' }
    });
    console.log("SUCCESS: Deleted test user.");
  } else {
    console.log("No test user found to delete.");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
