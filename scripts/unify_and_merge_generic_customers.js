const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const scriptStr = `
const { PrismaClient } = require('/app/node_modules/@prisma/client');

const dbs = [
  'neondb_officecity',
  'neondb_petqro',
  'neondb_seit',
  'neondb_pizca',
  'neondb'
];

function isGenericCandidate(c) {
  const nameUpper = (c.name || '').toUpperCase().trim();
  
  const genericNames = [
    'PUBLICO GENERAL',
    'PÚBLICO GENERAL',
    'PUBLICO EN GENERAL',
    'PÚBLICO EN GENERAL',
    'VENTAS PUBLICO EN GENERAL',
    'VENTAS AL PUBLICO EN GENERAL',
    'VENTA AL PUBLICO EN GENERAL',
    'CLIENTE MOSTRADOR',
    'MOSTRADOR'
  ];
  
  return genericNames.includes(nameUpper);
}

async function processDb(dbName, isDryRun = true) {
  const prisma = new PrismaClient({ datasources: { db: { url: \`postgresql://postgres:caanma_postgres_secure_2026@db:5432/\${dbName}?sslmode=disable\` } } });
  try {
    const allCustomers = await prisma.customer.findMany({
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
    
    const genericCustomers = allCustomers.filter(isGenericCandidate);
    const nullSalesCount = await prisma.sale.count({ where: { customerId: null } });
    
    console.log(\`\\n=======================================================\`);
    console.log(\`=== DB: \${dbName} (DryRun: \${isDryRun}) ===\`);
    console.log(\`=== Total Customers: \${allCustomers.length}, Generic Candidates: \${genericCustomers.length}, Null Sales: \${nullSalesCount} ===\`);
    
    if (genericCustomers.length === 0 && nullSalesCount === 0 && allCustomers.length > 0) {
      // Check if we need to create one canonical generic customer
      console.log(\`No generic customer found. Will create one canonical customer.\`);
      if (!isDryRun) {
        const created = await prisma.customer.create({
          data: {
            name: 'PUBLICO EN GENERAL',
            legalName: 'PUBLICO EN GENERAL',
            taxId: 'XAXX010101000',
            taxRegime: '616',
            cfdiUse: 'S01',
            zipCode: '76000',
            branchId: null
          }
        });
        console.log(\`Created canonical generic customer: \${created.id}\`);
      }
      return;
    }

    // Sort generic candidates by total sales desc to pick the primary one
    genericCustomers.sort((a, b) => (b._count.sales || 0) - (a._count.sales || 0));
    
    let canonical = genericCustomers[0];
    const duplicates = genericCustomers.slice(1);
    
    if (!canonical) {
      if (!isDryRun) {
        canonical = await prisma.customer.create({
          data: {
            name: 'PUBLICO EN GENERAL',
            legalName: 'PUBLICO EN GENERAL',
            taxId: 'XAXX010101000',
            taxRegime: '616',
            cfdiUse: 'S01',
            zipCode: '76000',
            branchId: null
          }
        });
        console.log(\`Created canonical generic customer: \${canonical.id}\`);
      } else {
        console.log(\`[DryRun] Would create canonical generic customer.\`);
      }
    } else {
      console.log(\`Canonical Customer: id=\${canonical.id}, name="\${canonical.name}", taxId=\${canonical.taxId}, sales=\${canonical._count.sales}\`);
    }

    if (duplicates.length > 0) {
      console.log(\`Duplicates to merge (\${duplicates.length}):\`);
      duplicates.forEach(d => {
        console.log(\`  - id=\${d.id}, name="\${d.name}", taxId=\${d.taxId}, branchId=\${d.branchId}, sales=\${d._count.sales}, quotes=\${d._count.quotes}\`);
      });
    }

    if (!isDryRun && canonical) {
      // 1. Update canonical customer properties
      await prisma.customer.update({
        where: { id: canonical.id },
        data: {
          name: 'PUBLICO EN GENERAL',
          legalName: 'PUBLICO EN GENERAL',
          taxId: 'XAXX010101000',
          taxRegime: '616',
          cfdiUse: 'S01',
          zipCode: canonical.zipCode || '76000',
          branchId: null
        }
      });
      console.log(\`Updated canonical customer \${canonical.id} to standardized SAT RFC & values.\`);

      // 2. Re-link duplicates
      const dupIds = duplicates.map(d => d.id);
      if (dupIds.length > 0) {
        const sUp = await prisma.sale.updateMany({ where: { customerId: { in: dupIds } }, data: { customerId: canonical.id } });
        const qUp = await prisma.quote.updateMany({ where: { customerId: { in: dupIds } }, data: { customerId: canonical.id } });
        const cUp = await prisma.consignment.updateMany({ where: { customerId: { in: dupIds } }, data: { customerId: canonical.id } });
        const pUp = await prisma.customerPayment.updateMany({ where: { customerId: { in: dupIds } }, data: { customerId: canonical.id } });
        const prUp = await prisma.prospect.updateMany({ where: { customerId: { in: dupIds } }, data: { customerId: canonical.id } });
        const ltUp = await prisma.loyaltyTransaction.updateMany({ where: { customerId: { in: dupIds } }, data: { customerId: canonical.id } });
        const apUp = await prisma.appointment.updateMany({ where: { customerId: { in: dupIds } }, data: { customerId: canonical.id } });
        const ftUp = await prisma.fuelTransaction.updateMany({ where: { customerId: { in: dupIds } }, data: { customerId: canonical.id } });

        console.log(\`Re-linked to canonical: sales=\${sUp.count}, quotes=\${qUp.count}, consignments=\${cUp.count}, payments=\${pUp.count}, prospects=\${prUp.count}, loyalty=\${ltUp.count}, appointments=\${apUp.count}, fuel=\${ftUp.count}\`);

        // 3. Delete duplicate customer records
        const delRes = await prisma.customer.deleteMany({ where: { id: { in: dupIds } } });
        console.log(\`Deleted \${delRes.count} duplicate customer records.\`);
      }

      // 4. Assign null sales to canonical generic customer
      if (nullSalesCount > 0) {
        const nullUp = await prisma.sale.updateMany({ where: { customerId: null }, data: { customerId: canonical.id } });
        console.log(\`Assigned \${nullUp.count} sales with customerId: null to canonical generic customer.\`);
      }
    }

  } catch (e) {
    console.error(\`Error on \${dbName}:\`, e);
  } finally {
    await prisma.$disconnect();
  }
}

async function run() {
  const isDryRun = process.argv.includes('--execute') ? false : true;
  console.log(\`Starting Generic Customer Consolidation (isDryRun=\${isDryRun})...\`);
  for (const db of dbs) {
    await processDb(db, isDryRun);
  }
  console.log(\`\\nFinished.\`);
}

run();
`;

const conn = new Client();
conn.on('ready', () => {
  const scriptB64 = Buffer.from(scriptStr).toString('base64');
  const args = process.argv.slice(2).join(' ');
  conn.exec(`docker exec -i caanma-app sh -c "echo '${scriptB64}' | base64 -d > /tmp/unify_generic.js && node /tmp/unify_generic.js ${args}"`, (err, stream) => {
    if (err) throw err;
    stream.on('data', d => process.stdout.write(d));
    stream.stderr.on('data', d => process.stderr.write(d));
    stream.on('close', () => conn.end());
  });
}).connect({ host: '5.78.138.167', port: 22, username: 'root', privateKey: fs.readFileSync(path.join(__dirname, '..', 'HetznerKey.pem')) });
