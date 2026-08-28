const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const scriptStr = `
const { PrismaClient } = require('/app/node_modules/@prisma/client');

const dbs = [
  'neondb_officecity',
  'neondb_petqro',
  'neondb_seit',
  'neondb_pizca'
];

async function checkDb(dbName) {
  const prisma = new PrismaClient({ datasources: { db: { url: \`postgresql://postgres:caanma_postgres_secure_2026@db:5432/\${dbName}?sslmode=disable\` } } });
  try {
    const sales = await prisma.sale.findMany({
      where: {
        paymentMethod: 'CREDIT',
        status: { not: 'CANCELLED' }
      },
      include: {
        payments: true
      }
    });
    
    const discrepancies = [];
    for (const s of sales) {
      const totalPaid = (s.payments || []).reduce((sum, p) => sum + p.amount, 0);
      const expectedBalance = Math.max(0, s.total - totalPaid);
      const diff = Math.abs(s.balanceDue - expectedBalance);
      if (diff > 0.05) {
        discrepancies.push({
          folio: s.folio,
          id: s.id,
          total: s.total,
          paid: totalPaid,
          balanceDue: s.balanceDue,
          expectedBalance: expectedBalance,
          diff: s.balanceDue - expectedBalance
        });
      }
    }
    console.log(\`=== \${dbName}: Found \${discrepancies.length} discrepancies out of \${sales.length} credit sales ===\`);
    if (discrepancies.length > 0) {
      console.log(JSON.stringify(discrepancies.slice(0, 10), null, 2));
    }
  } catch (e) {
    console.error(\`Error on \${dbName}:\`, e.message);
  } finally {
    await prisma.$disconnect();
  }
}

async function run() {
  for (const db of dbs) {
    await checkDb(db);
  }
}

run();
`;

const conn = new Client();
conn.on('ready', () => {
  const scriptB64 = Buffer.from(scriptStr).toString('base64');
  conn.exec(`docker exec -i caanma-app sh -c "echo '${scriptB64}' | base64 -d > /tmp/audit_all_dbs.js && node /tmp/audit_all_dbs.js"`, (err, stream) => {
    if (err) throw err;
    stream.on('data', d => process.stdout.write(d));
    stream.stderr.on('data', d => process.stderr.write(d));
    stream.on('close', () => conn.end());
  });
}).connect({ host: '5.78.138.167', port: 22, username: 'root', privateKey: fs.readFileSync(path.join(__dirname, 'HetznerKey.pem')) });
