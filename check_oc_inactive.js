const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const scriptStr = `
const { PrismaClient } = require('/app/node_modules/@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: 'postgresql://postgres:caanma_postgres_secure_2026@db:5432/neondb_officecity?sslmode=disable' } } });

async function run() {
  const date = new Date('2026-07-01T00:00:00.000Z');
  
  const inactiveProducts = await prisma.product.findMany({
    where: { 
      isActive: false,
      updatedAt: { gte: date }
    },
    select: {
      sku: true,
      name: true,
      updatedAt: true,
      stock: true,
      branchId: true
    },
    orderBy: { updatedAt: 'desc' }
  });
  
  console.log('Inactive products since July 1st:', inactiveProducts.length);
  inactiveProducts.slice(0, 20).forEach(p => {
    console.log(\`- \${p.sku} | \${p.name} | \${p.stock} | \${p.updatedAt.toISOString()} | \${p.branchId}\`);
  });
}

run().catch(console.error).finally(() => prisma.$disconnect());
`;

const conn = new Client();
conn.on('ready', () => {
  const scriptB64 = Buffer.from(scriptStr).toString('base64');
  conn.exec(`docker exec -i caanma-app sh -c "echo '${scriptB64}' | base64 -d > /tmp/check_oc.js && node /tmp/check_oc.js"`, (err, stream) => {
    if (err) throw err;
    stream.on('data', d => process.stdout.write(d));
    stream.stderr.on('data', d => process.stderr.write(d));
    stream.on('close', () => conn.end());
  });
}).connect({ host: '5.78.138.167', port: 22, username: 'root', privateKey: fs.readFileSync(path.join(__dirname, 'HetznerKey.pem')) });
