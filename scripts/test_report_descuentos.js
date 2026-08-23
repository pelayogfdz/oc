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
      console.log('Testing discount query...');
      const now = new Date();
      const start = new Date();
      start.setDate(now.getDate() - 30);
      
      const sales = await prisma.sale.findMany({
        where: {
          createdAt: { gte: start, lte: now },
          status: { notIn: ['CANCELLED', 'REFUNDED'] }
        },
        include: {
          branch: { select: { name: true } },
          customer: { select: { name: true } },
          items: {
            include: {
              product: true,
              variant: true
            }
          }
        },
        take: 20
      });
      console.log('Found ' + sales.length + ' sample sales in period.');
      let discountCount = 0;
      for (const s of sales) {
        for (const item of s.items) {
          const regPrice = item.variant?.price ?? item.product.price;
          if (regPrice > item.price + 0.01) {
            discountCount++;
            console.log('- Sale #' + (s.folio || s.id.slice(0, 8)) + ' | Product: ' + item.product.name + ' | Reg: $' + regPrice + ' | Charged: $' + item.price + ' | Saved: $' + (regPrice - item.price).toFixed(2));
          }
        }
      }
      console.log('Sample discounted items found: ' + discountCount);
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
