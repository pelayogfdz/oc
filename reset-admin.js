const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function reset() {
  const hash = await bcrypt.hash('Admin123!', 10);
  await prisma.user.update({
    where: { email: 'pelayogfdz@gmail.com' },
    data: { password: hash }
  });
  console.log('Password updated to Admin123!');
}

reset()
  .then(() => process.exit(0))
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
