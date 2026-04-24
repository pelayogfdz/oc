const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  await prisma.user.deleteMany({
    where: { email: 'testagent123@example.com' }
  });
  console.log("Deleted test user");
}
run();
