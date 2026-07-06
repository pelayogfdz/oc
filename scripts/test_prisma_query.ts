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
  const sku = "ubws13399";
  console.log(`=== Querying SKU "${sku}" ===`);
  const products = await prisma.product.findMany({
    where: { sku }
  });
  console.log(`Found ${products.length} products with SKU "${sku}"`);
  for (const p of products) {
    console.log(`- Product ID: ${p.id}, Branch: ${p.branchId}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
