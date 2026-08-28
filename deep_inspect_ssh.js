const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const scriptStr = `
const { PrismaClient } = require('/app/node_modules/@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: 'postgresql://postgres:caanma_postgres_secure_2026@db:5432/neondb_officecity?sslmode=disable' } } });

async function run() {
  const sale = await prisma.sale.findFirst({
    where: { folio: '1QUE-1228' },
    include: {
      customer: true,
      items: {
        include: {
          product: true
        }
      },
      payments: true,
      branch: true
    }
  });
  
  console.log('=== SALE DETAILS ===');
  console.log(JSON.stringify(sale, null, 2));

  if (sale && sale.customerId) {
    const cust = await prisma.customer.findUnique({
      where: { id: sale.customerId },
      include: {
        sales: {
          where: { paymentMethod: 'CREDIT' },
          select: { id: true, folio: true, total: true, balanceDue: true, status: true, invoiceFolio: true }
        },
        payments: true
      }
    });
    console.log('=== CUSTOMER DETAILS ===');
    console.log(JSON.stringify(cust, null, 2));
  }
}

run().catch(console.error).finally(() => prisma.$disconnect());
`;

const conn = new Client();
conn.on('ready', () => {
  const scriptB64 = Buffer.from(scriptStr).toString('base64');
  conn.exec(`docker exec -i caanma-app sh -c "echo '${scriptB64}' | base64 -d > /tmp/deep_inspect.js && node /tmp/deep_inspect.js"`, (err, stream) => {
    if (err) throw err;
    stream.on('data', d => process.stdout.write(d));
    stream.stderr.on('data', d => process.stderr.write(d));
    stream.on('close', () => conn.end());
  });
}).connect({ host: '5.78.138.167', port: 22, username: 'root', privateKey: fs.readFileSync(path.join(__dirname, 'HetznerKey.pem')) });
