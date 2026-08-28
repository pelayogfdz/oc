const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const scriptStr = `
const { PrismaClient } = require('/app/node_modules/@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: 'postgresql://postgres:caanma_postgres_secure_2026@db:5432/neondb_officecity?sslmode=disable' } } });

async function run() {
  const badSales = await prisma.sale.findMany({
    where: { paymentMethod: 'CREDIT', balanceDue: { gt: 0 } }
  });
  
  let fixedSales = 0;
  const customersToUpdate = new Set();
  
  for (const sale of badSales) {
    if (sale.balanceDue > sale.total) {
      console.log(\`Fixing sale \${sale.folio} (Total: \${sale.total}, Deuda actual: \${sale.balanceDue})\`);
      
      const payments = await prisma.customerPayment.findMany({ where: { saleId: sale.id } });
      const paid = payments.reduce((sum, p) => sum + p.amount, 0);
      
      const correctBalanceDue = Math.max(0, sale.total - paid);
      
      await prisma.sale.update({
        where: { id: sale.id },
        data: { balanceDue: correctBalanceDue }
      });
      fixedSales++;
      
      if (sale.customerId) {
        customersToUpdate.add(sale.customerId);
      }
    }
  }
  
  console.log(\`Fixed \${fixedSales} sales. Recalculating credit balances for \${customersToUpdate.size} customers...\`);
  
  for (const custId of customersToUpdate) {
    const creditSales = await prisma.sale.findMany({
      where: { customerId: custId, paymentMethod: 'CREDIT', status: { not: 'CANCELLED' } },
      select: { balanceDue: true }
    });
    const customerPayments = await prisma.customerPayment.findMany({
      where: { customerId: custId },
      select: { amount: true }
    });
    
    const actualDebt = Math.max(0, creditSales.reduce((sum, s) => sum + s.balanceDue, 0) - customerPayments.reduce((sum, p) => sum + p.amount, 0));
    
    await prisma.customer.update({
      where: { id: custId },
      data: { creditBalance: actualDebt }
    });
    console.log(\`Fixed customer \${custId} debt to \${actualDebt}\`);
  }
  
  console.log('Done!');
}

run().catch(console.error).finally(() => prisma.$disconnect());
`;

const conn = new Client();
conn.on('ready', () => {
  const scriptB64 = Buffer.from(scriptStr).toString('base64');
  conn.exec(`docker exec -i caanma-app sh -c "echo '${scriptB64}' | base64 -d > /tmp/heal_sales.js && node /tmp/heal_sales.js"`, (err, stream) => {
    if (err) throw err;
    stream.on('data', d => process.stdout.write(d));
    stream.stderr.on('data', d => process.stderr.write(d));
    stream.on('close', () => conn.end());
  });
}).connect({ host: '5.78.138.167', port: 22, username: 'root', privateKey: fs.readFileSync(path.join(__dirname, 'HetznerKey.pem')) });
