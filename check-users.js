const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const users = await prisma.user.findMany();
  console.log(users.map(u => u.email));
}

check().then(() => process.exit(0)).catch(e => console.error(e));
