const { PrismaClient } = require('@prisma/client');
const { URL } = require('url');

const masterUrl = process.env.DATABASE_URL;
const urlObj = new URL(masterUrl);
urlObj.pathname = '/neondb_petqro';
const petqroPrisma = new PrismaClient({ datasources: { db: { url: urlObj.toString() } } });

async function main() {
  const saleId = '21b71601-44cc-4aa4-9e15-7cea42f4a756';
  const sale = await petqroPrisma.sale.findUnique({
    where: { id: saleId },
    include: {
      branch: true
    }
  });
  console.log("Branch location for sale:");
  console.log("branch name:", sale.branch?.name);
  console.log("branch location:", sale.branch?.location);
  console.log("branch location type:", typeof sale.branch?.location);
}

main()
  .catch(console.error)
  .finally(() => petqroPrisma.$disconnect());
