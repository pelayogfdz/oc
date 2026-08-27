const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const scriptStr = `
const { PrismaClient } = require('/app/node_modules/@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: 'postgresql://postgres:caanma_postgres_secure_2026@db:5432/neondb_officecity?sslmode=disable' } } });

async function run() {
  const tenantId = '8b52cbcd-c956-4717-a1bd-02e57386aaa2'; // Office City
  
  const branches = await prisma.branch.findMany({
    where: { tenantId, isActive: true },
    select: { id: true }
  });
  const branchIds = branches.map(b => b.id);
  
  // Get all SKUs in the tenant (excluding TEMP- ones)
  const allProducts = await prisma.product.findMany({
    where: {
      branchId: { in: branchIds },
      NOT: { sku: { startsWith: 'TEMP-' } }
    },
    select: {
      sku: true,
      branchId: true,
      barcode: true,
      name: true,
      description: true,
      price: true,
      cost: true,
      taxRate: true,
      taxType: true,
      iepsRate: true,
      brand: true,
      imageUrl: true,
      youtubeUrl: true,
      isActive: true,
      allowProduction: true,
      isProductionInput: true,
      isService: true,
      unit: true,
      supplierId: true,
      satKey: true,
      satUnit: true,
      expirationDate: true,
      location: true,
      hasTraceability: true,
      showInWeb: true,
      createdAt: true,
      averageCost: true
    }
  });

  const skusByBranch = {};
  const masterProductBySku = {};
  
  allProducts.forEach(p => {
    if (!skusByBranch[p.sku]) {
      skusByBranch[p.sku] = new Set();
    }
    skusByBranch[p.sku].add(p.branchId);
    
    if (!masterProductBySku[p.sku] || p.createdAt < masterProductBySku[p.sku].createdAt) {
      masterProductBySku[p.sku] = p;
    }
  });

  let createdCount = 0;

  for (const [sku, currentBranches] of Object.entries(skusByBranch)) {
    const missingBranches = branchIds.filter(bId => !currentBranches.has(bId));
    if (missingBranches.length > 0) {
      const master = masterProductBySku[sku];
      
      const payload = missingBranches.map(bId => ({
        branchId: bId,
        sku: master.sku,
        barcode: master.barcode,
        name: master.name,
        description: master.description,
        price: master.price,
        cost: master.cost,
        averageCost: master.averageCost,
        taxRate: master.taxRate,
        taxType: master.taxType,
        iepsRate: master.iepsRate,
        brand: master.brand,
        imageUrl: master.imageUrl,
        youtubeUrl: master.youtubeUrl,
        isActive: master.isActive,
        allowProduction: master.allowProduction,
        isProductionInput: master.isProductionInput,
        isService: master.isService,
        unit: master.unit,
        stock: 0,
        minStock: 0,
        supplierId: master.supplierId,
        satKey: master.satKey,
        satUnit: master.satUnit,
        expirationDate: master.expirationDate,
        location: master.location,
        hasTraceability: master.hasTraceability,
        showInWeb: master.showInWeb
      }));
      
      // Batch create
      const result = await prisma.product.createMany({
        data: payload,
        skipDuplicates: true
      });
      createdCount += result.count;
    }
  }
  
  console.log(\`Leveling completed. Created \${createdCount} missing products across branches.\`);
}

run().catch(console.error).finally(() => prisma.$disconnect());
`;

const conn = new Client();
conn.on('ready', () => {
  const scriptB64 = Buffer.from(scriptStr).toString('base64');
  conn.exec(`docker exec -i caanma-app sh -c "echo '${scriptB64}' | base64 -d > /tmp/level_oc.js && node /tmp/level_oc.js"`, (err, stream) => {
    if (err) throw err;
    stream.on('data', d => process.stdout.write(d));
    stream.stderr.on('data', d => process.stderr.write(d));
    stream.on('close', () => conn.end());
  });
}).connect({ host: '5.78.138.167', port: 22, username: 'root', privateKey: fs.readFileSync(path.join(__dirname, 'HetznerKey.pem')) });
