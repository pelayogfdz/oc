const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const host = '5.78.138.167';
const privateKeyPath = path.join(__dirname, '..', 'HetznerKey.pem');

const conn = new Client();
conn.on('ready', () => {
  const nodeScript = `
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient({ datasources: { db: { url: 'postgresql://postgres:caanma_postgres_secure_2026@caanma-db:5432/neondb_officecity?sslmode=disable' } } });
    
    async function run() {
      const prodId = 'a2a5055f-6c0a-446b-98cf-4efd30c34f5a';
      const product = await prisma.product.findUnique({
        where: { id: prodId },
        include: { prices: { include: { priceList: true } } }
      });
      const allPriceLists = await prisma.priceList.findMany({ orderBy: { name: 'asc' } });
      const priceListsMap = new Map();
      for (const pl of allPriceLists) {
        if (pl.branchId === product.branchId) priceListsMap.set(pl.name, pl);
      }
      for (const pl of allPriceLists) {
        if (!priceListsMap.has(pl.name)) priceListsMap.set(pl.name, pl);
      }
      const dynamicPriceLists = Array.from(priceListsMap.values()).sort((a, b) => a.name.localeCompare(b.name));

      console.log('=== PRODUCT FINANCE SECTION RESOLUTION SIMULATION ===');
      for (const pl of dynamicPriceLists) {
        const targetPlName = (pl.name || '').toLowerCase().trim();
        const savedPriceObj = product.prices.find((p) => {
          if (p.priceListId === pl.id) return true;
          if (p.priceList?.name && (p.priceList.name || '').toLowerCase().trim() === targetPlName) return true;
          const matchingPl = allPriceLists.find((apl) => apl.id === p.priceListId);
          if (matchingPl && (matchingPl.name || '').toLowerCase().trim() === targetPlName) return true;
          return false;
        });
        const savedPrice = savedPriceObj ? savedPriceObj.price : 0;
        console.log('List:', pl.name, '-> Resolved Price:', '$' + savedPrice);
      }
    }
    run().catch(console.error);
  `;

  conn.exec(`docker exec -i caanma-app node -e "${nodeScript.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`, (err, stream) => {
    if (err) { console.error(err); conn.end(); return; }
    stream.on('data', d => process.stdout.write(d));
    stream.stderr.on('data', d => process.stderr.write(d));
    stream.on('close', () => conn.end());
  });
}).connect({
  host,
  port: 22,
  username: 'root',
  privateKey: fs.readFileSync(privateKeyPath)
});
