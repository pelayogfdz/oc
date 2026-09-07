const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const host = '5.78.138.167';
const privateKeyPath = path.join(__dirname, '..', 'HetznerKey.pem');

const conn = new Client();
conn.on('ready', () => {
  console.log('Testing full database and SSR rendering in container...');

  const testScript = `
const { PrismaClient } = require('@prisma/client');

async function testAll() {
  const tenants = [
    { name: 'master', url: 'postgresql://postgres:caanma_postgres_secure_2026@caanma-db:5432/neondb' },
    { name: 'officecity', url: 'postgresql://postgres:caanma_postgres_secure_2026@caanma-db:5432/neondb_officecity' },
    { name: 'petqro', url: 'postgresql://postgres:caanma_postgres_secure_2026@caanma-db:5432/neondb_petqro' },
    { name: 'pizca', url: 'postgresql://postgres:caanma_postgres_secure_2026@caanma-db:5432/neondb_pizca' },
    { name: 'seit', url: 'postgresql://postgres:caanma_postgres_secure_2026@caanma-db:5432/neondb_seit' }
  ];

  for (const t of tenants) {
    const prisma = new PrismaClient({ datasources: { db: { url: t.url } } });
    try {
      const users = await prisma.user.count();
      const products = await prisma.product.count();
      const sales = await prisma.sale.count();
      const leaves = await prisma.leaveRequest.count();
      console.log(\`[\${t.name}] Connected OK! Users: \${users}, Products: \${products}, Sales: \${sales}, Leaves: \${leaves}\`);
    } catch(e) {
      console.error(\`[\${t.name}] DB ERROR:\`, e.message);
    } finally {
      await prisma.$disconnect();
    }
  }
}

testAll();
`;

  conn.exec('docker exec -i caanma-app node', (err, stream) => {
    if (err) {
      console.error(err);
      conn.end();
      return;
    }
    stream.on('data', d => process.stdout.write(d));
    stream.stderr.on('data', d => process.stderr.write(d));
    stream.on('close', () => conn.end());
    stream.write(testScript);
    stream.end();
  });
}).connect({
  host,
  port: 22,
  username: 'root',
  privateKey: fs.readFileSync(privateKeyPath)
});
