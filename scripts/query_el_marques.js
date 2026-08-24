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
      const branch = await prisma.branch.findFirst({ where: { name: { contains: 'Marques', mode: 'insensitive' } } });
      console.log('Branch:', branch?.id, branch?.name);

      const start = new Date('2026-08-06T00:00:00.000Z');
      const end = new Date('2026-08-07T06:00:00.000Z');

      const sales = await prisma.sale.findMany({
        where: {
          branchId: branch?.id,
          createdAt: { gte: start, lte: end }
        },
        orderBy: { createdAt: 'desc' }
      });
      console.log('Sales in El Marques on 2026-08-06 count: ' + sales.length);
      for (const s of sales) {
        console.log('- ID: ' + s.id + ' | Folio: [' + s.folio + '] | Date: ' + s.createdAt + ' | Total: ' + s.total);
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
