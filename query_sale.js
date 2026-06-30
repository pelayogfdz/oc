const { PrismaClient } = require('@prisma/client');
const { URL } = require('url');

const masterUrl = process.env.DATABASE_URL;
const urlObj = new URL(masterUrl);
urlObj.pathname = '/neondb_petqro';
const petqroPrisma = new PrismaClient({ datasources: { db: { url: urlObj.toString() } } });

async function main() {
  const sales = await petqroPrisma.sale.findMany({
    where: {
      id: { startsWith: '21b71601' }
    }
  });
  console.log("Sales starting with 21b71601 in PETQRO DB:");
  sales.forEach(s => {
    console.log(`- ID: ${s.id}, Folio: ${s.folio}`);
  });
}

main()
  .catch(console.error)
  .finally(() => petqroPrisma.$disconnect());
