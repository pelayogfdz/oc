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
  const prisma = new PrismaClient({ datasources: { db: { url: 'postgresql://postgres:caanma_postgres_secure_2026@caanma-db:5432/neondb_officecity' } } });
  try {
    const branches = await prisma.branch.findMany({ where: { isActive: true } });
    for (const b of branches) {
      const count = await prisma.product.count({ where: { branchId: b.id, isActive: true } });
      console.log(\`Branch: \${b.name} (\${b.id}) -> Active Products: \${count}\`);
    }
  } catch(e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
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
