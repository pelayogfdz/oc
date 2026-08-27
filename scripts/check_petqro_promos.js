const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const host = '5.78.138.167';
const privateKeyPath = path.join(__dirname, '..', 'HetznerKey.pem');

const conn = new Client();
conn.on('ready', () => {
  const nodeScript = `
const { PrismaClient } = require('/app/node_modules/@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: 'postgresql://postgres:caanma_postgres_secure_2026@db:5432/neondb?sslmode=disable' } } });
async function run() {
  const sales = await prisma.sale.findMany({
    where: { branch: { tenantId: 'db5d3949-f8dd-41f6-9627-90374d55d044' } },
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: { items: true, customer: { select: { name: true } } }
  });
  console.log('Analyzing last 200 sales for petqro...');
  for (const s of sales) {
    const itemsSum = s.items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    if (Math.abs(itemsSum - s.total) > 0.05) {
      console.log('- Folio:', s.folio, '| Date:', s.createdAt, '| Total DB:', s.total, '| ItemsSum:', itemsSum.toFixed(2), '| Breakdown:', s.breakdownDiscounts);
    }
  }
}
run().catch(console.error);
`;

  const scriptB64 = Buffer.from(nodeScript).toString('base64');

  conn.exec(`docker exec -i caanma-app sh -c "echo '${scriptB64}' | base64 -d > /tmp/query.js && node /tmp/query.js"`, (err, stream) => {
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
