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
    const customers = await prisma.customer.findMany({
      where: {
        OR: [
          { taxId: 'XAXX010101000' },
          { name: { contains: 'public', mode: 'insensitive' } },
          { name: { contains: 'públic', mode: 'insensitive' } },
          { name: { contains: 'general', mode: 'insensitive' } }
        ]
      },
      include: {
        _count: {
          select: {
            sales: true,
            quotes: true,
            consignments: true,
            payments: true
          }
        }
      }
    });
    
    const nullCustSales = await prisma.sale.count({ where: { customerId: null } });
    console.log(\`=== \${dbName}: Sales with customerId: null = \${nullCustSales} ===\`);
    const allCount = await prisma.customer.count();
    console.log(\`=== \${dbName}: Total customers: \${allCount}, Found \${customers.length} matching generic customers ===\`);
    if (allCount < 10) {
      const allCusts = await prisma.customer.findMany();
      console.log('All customers in ' + dbName + ':', allCusts);
    }
    customers.forEach(c => {
      console.log({
        id: c.id,
        name: c.name,
        taxId: c.taxId,
        branchId: c.branchId,
        createdAt: c.createdAt,
        counts: c._count
      });
    });
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
  conn.exec(`docker exec -i caanma-app sh -c "echo '${scriptB64}' | base64 -d > /tmp/inspect_generic_customers.js && node /tmp/inspect_generic_customers.js"`, (err, stream) => {
    if (err) throw err;
    stream.on('data', d => process.stdout.write(d));
    stream.stderr.on('data', d => process.stderr.write(d));
    stream.on('close', () => conn.end());
  });
}).connect({ host: '5.78.138.167', port: 22, username: 'root', privateKey: fs.readFileSync(path.join(__dirname, '..', 'HetznerKey.pem')) });
