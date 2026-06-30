const { PrismaClient } = require('@prisma/client');

async function main() {
  const masterClient = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
  const users = await masterClient.user.findMany({
    where: {
      name: { contains: 'Alina' }
    }
  });
  console.log("Users found in Master DB:", JSON.stringify(users, null, 2));
  await masterClient.$disconnect();
}

main().catch(console.error);
