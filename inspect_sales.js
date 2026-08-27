const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const scriptStr = `
const { PrismaClient } = require('/app/node_modules/@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: 'postgresql://postgres:caanma_postgres_secure_2026@db:5432/neondb?sslmode=disable' } } });

async function run() {
  const folios = ['MAT-1730', 'MAT-1732'];
  const sales = await prisma.sale.findMany({
    where: { 
      branch: { tenantId: 'db5d3949-f8dd-41f6-9627-90374d55d044' },
      OR: [
        { folio: { contains: '1730' } },
        { folio: { contains: '1732' } }
      ]
    },
    include: { items: { include: { product: true } } }
  });

  for (const s of sales) {
    const itemsSum = s.items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    console.log('\\n=== SALE ' + s.folio + ' ===');
    console.log('Date: ' + s.createdAt);
    console.log('DB Total: ' + s.total);
    console.log('ItemsSum: ' + itemsSum);
    console.log('Breakdown: ' + s.breakdownDiscounts);
    console.log('Notes: ' + s.notes);
    console.log('Items:');
    for (const item of s.items) {
      console.log('  - ' + item.quantity + 'x ' + (item.product?.name || 'Unknown') + ' (Price: ' + item.price + ') = ' + (item.quantity * item.price));
    }
  }
}
run().catch(console.error).finally(() => prisma.$disconnect());
`;

const conn = new Client();
conn.on('ready', () => {
  const scriptB64 = Buffer.from(scriptStr).toString('base64');
  conn.exec(`docker exec -i caanma-app sh -c "echo '${scriptB64}' | base64 -d > /tmp/inspect.js && node /tmp/inspect.js"`, (err, stream) => {
    if (err) throw err;
    stream.on('data', d => process.stdout.write(d));
    stream.stderr.on('data', d => process.stderr.write(d));
    stream.on('close', () => conn.end());
  });
}).connect({ host: '5.78.138.167', port: 22, username: 'root', privateKey: fs.readFileSync(path.join(__dirname, 'HetznerKey.pem')) });
