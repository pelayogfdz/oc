const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');

async function main() {
  const hash = bcrypt.hashSync('officecity123', 10);
  const result = await prisma.user.updateMany({
    data: { password: hash }
  });
  console.log(`Updated ${result.count} users to use password 'officecity123'`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
