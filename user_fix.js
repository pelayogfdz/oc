const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const scriptStr = `
const { PrismaClient } = require('/app/node_modules/@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: 'postgresql://postgres:caanma_postgres_secure_2026@db:5432/neondb?sslmode=disable' } } });

async function fixSale(folio, newTotal) {
  const sale = await prisma.sale.findFirst({
    where: { 
      branch: { tenantId: 'db5d3949-f8dd-41f6-9627-90374d55d044' },
      folio: folio
    },
    include: { items: true }
  });

  if (!sale) {
    console.log('Sale not found:', folio);
    return;
  }

  // Update sale total
  await prisma.sale.update({
    where: { id: sale.id },
    data: { total: newTotal, balanceDue: sale.balanceDue > 0 ? newTotal : 0 }
  });

  // Prorate items
  const itemsSum = sale.items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
  const factor = newTotal > 0 ? (newTotal / itemsSum) : 0;
  
  for (const item of sale.items) {
    const newPrice = Number((item.price * factor).toFixed(6));
    await prisma.saleItem.update({
      where: { id: item.id },
      data: { price: newPrice }
    });
  }
  
  console.log(\`Fixed Sale \${folio}. New Total: \${newTotal}. Old ItemsSum: \${itemsSum}\`);
}

async function updateFolioConfig() {
  const branches = await prisma.branch.findMany({
    where: { tenantId: 'db5d3949-f8dd-41f6-9627-90374d55d044' },
    include: { settings: true }
  });

  for (const branch of branches) {
    // Usually 'Matriz' has 'MAT' prefix, but let's just update all or just Matriz.
    // I'll update all branches to 5000 to be safe, or just Matriz. The prompt said "aumenta el folio al 5,000".
    // Let's check branch name
    if (branch.name.toLowerCase().includes('matriz')) {
      let config = {};
      if (branch.settings && branch.settings.configJson) {
        try { config = JSON.parse(branch.settings.configJson); } catch (e) {}
      }
      
      if (!config.folios) config.folios = {};
      if (!config.folios.sale) config.folios.sale = { prefix: 'MAT', nextNumber: 1001 };
      
      config.folios.sale.nextNumber = 5000;
      
      if (branch.settings) {
        await prisma.branchSettings.update({
          where: { branchId: branch.id },
          data: { configJson: JSON.stringify(config) }
        });
      } else {
        await prisma.branchSettings.create({
          data: {
            branchId: branch.id,
            configJson: JSON.stringify(config)
          }
        });
      }
      console.log('Updated folio nextNumber to 5000 for branch:', branch.name);
    }
  }
}

async function run() {
  await fixSale('#1730', 1671.20);
  await fixSale('#1732', 166.60);
  await updateFolioConfig();
}

run().catch(console.error).finally(() => prisma.$disconnect());
`;

const conn = new Client();
conn.on('ready', () => {
  const scriptB64 = Buffer.from(scriptStr).toString('base64');
  conn.exec(`docker exec -i caanma-app sh -c "echo '${scriptB64}' | base64 -d > /tmp/userfix.js && node /tmp/userfix.js"`, (err, stream) => {
    if (err) throw err;
    stream.on('data', d => process.stdout.write(d));
    stream.stderr.on('data', d => process.stderr.write(d));
    stream.on('close', () => conn.end());
  });
}).connect({ host: '5.78.138.167', port: 22, username: 'root', privateKey: fs.readFileSync(path.join(__dirname, 'HetznerKey.pem')) });
