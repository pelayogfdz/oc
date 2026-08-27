const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const scriptStr = `
const { PrismaClient } = require('/app/node_modules/@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: 'postgresql://postgres:caanma_postgres_secure_2026@db:5432/neondb_officecity?sslmode=disable' } } });

async function run() {
  const result = await prisma.$executeRawUnsafe(\`
    INSERT INTO "Product" (
      "id", "sku", "barcode", "name", "description", "location", "price", "wholesalePrice",
      "specialPrice", "cost", "taxRate", "taxType", "iepsRate", "category", "brand",
      "imageUrl", "youtubeUrl", "isActive", "allowProduction", "isProductionInput",
      "isService", "unit", "stock", "minStock", "expirationDate", "branchId",
      "createdAt", "updatedAt", "supplierId", "satKey", "satUnit", "averageCost",
      "showInWeb", "hasTraceability"
    )
    SELECT 
      gen_random_uuid(), "master"."sku", "master"."barcode", "master"."name", "master"."description", "master"."location", "master"."price", "master"."wholesalePrice",
      "master"."specialPrice", "master"."cost", "master"."taxRate", "master"."taxType", "master"."iepsRate", "master"."category", "master"."brand",
      "master"."imageUrl", "master"."youtubeUrl", "master"."isActive", "master"."allowProduction", "master"."isProductionInput",
      "master"."isService", "master"."unit", 0 as "stock", 0 as "minStock", "master"."expirationDate", 
      B."id" as "branchId",
      now(), now(), "master"."supplierId", "master"."satKey", "master"."satUnit", "master"."averageCost",
      "master"."showInWeb", "master"."hasTraceability"
    FROM (
      SELECT DISTINCT ON (br."tenantId", p.sku) p.*, br."tenantId" as "tenantId_master"
      FROM "Product" p
      JOIN "Branch" br ON br.id = p."branchId"
      WHERE p.sku NOT LIKE 'TEMP-%'
      ORDER BY br."tenantId", p.sku, p."createdAt" ASC
    ) as "master"
    JOIN "Branch" B ON B."tenantId" = "master"."tenantId_master"
    WHERE B."isActive" = true
      AND NOT EXISTS (
        SELECT 1 FROM "Product" existing
        WHERE existing."branchId" = B."id"
          AND existing.sku = "master".sku
      );
  \`);
  
  console.log('Inserted missing products for ALL tenants:', result);
}

run().catch(console.error).finally(() => prisma.$disconnect());
`;

const conn = new Client();
conn.on('ready', () => {
  const scriptB64 = Buffer.from(scriptStr).toString('base64');
  conn.exec(`docker exec -i caanma-app sh -c "echo '${scriptB64}' | base64 -d > /tmp/level_all_sql.js && node /tmp/level_all_sql.js"`, (err, stream) => {
    if (err) throw err;
    stream.on('data', d => process.stdout.write(d));
    stream.stderr.on('data', d => process.stderr.write(d));
    stream.on('close', () => conn.end());
  });
}).connect({ host: '5.78.138.167', port: 22, username: 'root', privateKey: fs.readFileSync(path.join(__dirname, 'HetznerKey.pem')) });
