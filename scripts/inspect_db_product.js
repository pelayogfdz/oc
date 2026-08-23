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
      const target = await prisma.product.findUnique({ where: { id: prodId }, include: { branch: true, prices: { include: { priceList: true } } } });
      console.log('TARGET ID:', target?.id, 'Branch:', target?.branch?.name, 'Name:', target?.name, 'SKU:', target?.sku);
      console.log('TARGET prices:', JSON.stringify(target?.prices, null, 2));

      const allProductPrices = await prisma.productPrice.findMany({
        where: { product: { sku: target?.sku } },
        include: { product: { include: { branch: true } }, priceList: { include: { branch: true } } }
      });
      console.log('ALL ProductPrices for SKU ' + target?.sku + ' across all branches count: ' + allProductPrices.length);
      for (const pp of allProductPrices) {
        console.log('PP -> Product in Branch:', pp.product.branch.name, '| PriceList:', pp.priceList.name, 'in Branch:', pp.priceList.branch.name, '| Price:', pp.price);
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
