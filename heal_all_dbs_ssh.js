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

async function healDb(dbName) {
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
    
    let fixedSalesCount = 0;
    const affectedCustomerIds = new Set();
    
    for (const s of sales) {
      const totalPaid = (s.payments || []).reduce((sum, p) => sum + p.amount, 0);
      const expectedBalance = Math.max(0, s.total - totalPaid);
      const diff = Math.abs(s.balanceDue - expectedBalance);
      
      if (diff > 0.01) {
        await prisma.sale.update({
          where: { id: s.id },
          data: { balanceDue: expectedBalance }
        });
        fixedSalesCount++;
        if (s.customerId) affectedCustomerIds.add(s.customerId);
      }
    }
    
    // Also include all customers with credit sales
    const allCreditCustomers = await prisma.customer.findMany({
      where: { sales: { some: { paymentMethod: 'CREDIT' } } },
      select: { id: true, name: true, creditBalance: true }
    });
    
    let fixedCustomersCount = 0;
    for (const cust of allCreditCustomers) {
      const creditSales = await prisma.sale.findMany({
        where: { customerId: cust.id, paymentMethod: 'CREDIT', status: { not: 'CANCELLED' } },
        select: { balanceDue: true }
      });
      const unallocatedPayments = await prisma.customerPayment.findMany({
        where: { customerId: cust.id, saleId: null },
        select: { amount: true }
      });
      
      const actualDebt = Math.max(0, creditSales.reduce((sum, s) => sum + s.balanceDue, 0) - unallocatedPayments.reduce((sum, p) => sum + p.amount, 0));
      
      if (Math.abs(cust.creditBalance - actualDebt) > 0.01) {
        await prisma.customer.update({
          where: { id: cust.id },
          data: { creditBalance: actualDebt }
        });
        fixedCustomersCount++;
      }
    }
    
    console.log(\`\${dbName}: Repaired \${fixedSalesCount} sales and \${fixedCustomersCount} customer credit balances.\`);
  } catch (e) {
    console.error(\`Error on \${dbName}:\`, e.message);
  } finally {
    await prisma.$disconnect();
  }
}

async function run() {
  for (const db of dbs) {
    await healDb(db);
  }
  console.log('All databases healed successfully.');
}

run();
`;

const conn = new Client();
conn.on('ready', () => {
  const scriptB64 = Buffer.from(scriptStr).toString('base64');
  conn.exec(`docker exec -i caanma-app sh -c "echo '${scriptB64}' | base64 -d > /tmp/heal_all_dbs.js && node /tmp/heal_all_dbs.js"`, (err, stream) => {
    if (err) throw err;
    stream.on('data', d => process.stdout.write(d));
    stream.stderr.on('data', d => process.stderr.write(d));
    stream.on('close', () => conn.end());
  });
}).connect({ host: '5.78.138.167', port: 22, username: 'root', privateKey: fs.readFileSync(path.join(__dirname, 'HetznerKey.pem')) });
