const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('123456', 10);
  await prisma.user.update({
    where: { email: 'ventas4@officecity.com.mx' },
    data: { password: hash }
  });
  console.log('Password updated for ventas4@officecity.com.mx');
}

main().catch(console.error).finally(() => prisma.$disconnect());
