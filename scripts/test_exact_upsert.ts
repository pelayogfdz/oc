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
  const priceListId = "21a09c01-6f89-4b56-abd3-4aeb47727e93"; // Precio 2 (Empresas)
  const priceVal = 304;

  console.log(`=== Testing upsert for SKU "${sku}" ===`);
  const products = await prisma.product.findMany({
    where: { sku }
  });
  console.log(`Found ${products.length} products with SKU "${sku}"`);

  for (const prod of products) {
    console.log(`Upserting for Product ID: ${prod.id}, Branch: ${prod.branchId}`);
    try {
      const res = await prisma.productPrice.upsert({
        where: {
          productId_priceListId: {
            productId: prod.id,
            priceListId
          }
        },
        create: {
          productId: prod.id,
          priceListId,
          price: priceVal
        },
        update: {
          price: priceVal
        }
      });
      console.log(`  Upsert succeeded: ID: ${res.id}`);
    } catch (err: any) {
      console.error(`  Upsert failed:`, err.message || err);
    }
  }

  // Let's query it back
  const count = await prisma.productPrice.count({
    where: {
      productId: "000d5a36-ff73-4b92-854f-3258afe391b6"
    }
  });
  console.log(`\nAfter test upsert: count for El Marques product is: ${count}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
