const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const scriptStr = `
const { PrismaClient } = require('/app/node_modules/@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: 'postgresql://postgres:caanma_postgres_secure_2026@db:5432/neondb_officecity?sslmode=disable' } } });

async function run() {
  const date = new Date('2026-07-01T00:00:00.000Z');
  
  const recentProducts = await prisma.product.findMany({
    where: { 
      createdAt: { gte: date },
      NOT: { sku: { startsWith: 'TEMP-' } }
    },
    select: {
      sku: true,
      name: true,
      branchId: true
    }
  });
  
  const skuCounts = {};
  recentProducts.forEach(p => {
    if (!skuCounts[p.sku]) skuCounts[p.sku] = { name: p.name, branches: new Set() };
    skuCounts[p.sku].branches.add(p.branchId);
  });
  
  let totalSkus = 0;
  let missingBranches = 0;
  
  for (const [sku, data] of Object.entries(skuCounts)) {
    totalSkus++;
    if (data.branches.size < 13) {
      missingBranches++;
      if (missingBranches <= 5) {
        console.log(\`SKU \${sku} (\${data.name}) is only in \${data.branches.size} branches\`);
      }
    }
  }
  
  console.log(\`Total unique SKUs created since July 1st: \${totalSkus}\`);
  console.log(\`SKUs that are NOT in all branches: \${missingBranches}\`);
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
