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
      const sales = await prisma.sale.findMany({
        where: {
          OR: [
            { folio: { contains: '2156', mode: 'insensitive' } },
            { id: { contains: '2156', mode: 'insensitive' } }
          ]
        },
        include: { branch: { select: { name: true } }, customer: { select: { name: true } } }
      });
      console.log('Found ' + sales.length + ' matching sales:');
      for (const s of sales) {
        console.log('- ID:', s.id, '| Folio: [' + s.folio + '] | Branch:', s.branch?.name, '| Date:', s.createdAt, '| Total:', s.total, '| InvoiceFolio:', s.invoiceFolio);
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
