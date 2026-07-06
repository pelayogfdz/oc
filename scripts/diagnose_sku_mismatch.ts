import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

// Read .env file manually
const envPath = path.join(process.cwd(), '.env');
let masterUrl = '';
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const dbUrlLine = envContent.split('\n').find(line => line.trim().startsWith('DATABASE_URL='));
  if (dbUrlLine) {
    masterUrl = dbUrlLine.substring(dbUrlLine.indexOf('=') + 1).replace(/"/g, '').trim();
  }
}

const urlObj = new URL(masterUrl);
urlObj.pathname = "/neondb_officecity";
const tenantUrl = urlObj.toString();

const prisma = new PrismaClient({ datasources: { db: { url: tenantUrl } } });

async function main() {
  const branchId = "fa1257d6-09f7-409e-9899-2e1454372f96"; // El Marques
  console.log("=== Diagnosing SKU Mismatches for El Marques ===");

  // Find products in El Marques that have 0 prices
  const unmatched = await prisma.product.findMany({
    where: {
      branchId,
      prices: { none: {} }
    },
    take: 10
  });

  console.log(`Unmatched products in El Marques: ${unmatched.length} (sample shown below)`);
  for (const p of unmatched) {
    console.log(`- Product ID: ${p.id}`);
    console.log(`  Name: "${p.name}"`);
    console.log(`  Database SKU: "[${p.sku}]" (Length: ${p.sku.length})`);
    
    // Find products in other branches (e.g., El Mirador) with the same SKU
    const otherProducts = await prisma.product.findMany({
      where: {
        sku: p.sku,
        branchId: { not: branchId }
      },
      include: {
        branch: true,
        prices: true
      }
    });
    console.log(`  Found in other branches: ${otherProducts.length}`);
    for (const op of otherProducts) {
      console.log(`    * Branch: ${op.branch.name} (${op.branchId}), SKU: "[${op.sku}]", Prices count: ${op.prices.length}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
