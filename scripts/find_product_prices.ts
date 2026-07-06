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
  // Let's find products with cost 3.34 and price 6
  console.log("=== Finding products with cost 3.34 and price 6 ===");
  const products = await prisma.product.findMany({
    where: {
      cost: 3.34,
      price: 6
    },
    include: {
      prices: {
        include: {
          priceList: true
        }
      },
      branch: true
    }
  });

  console.log(`Found ${products.length} products:`);
  for (const p of products) {
    console.log(`- Product: ${p.name} (SKU: ${p.sku})`);
    console.log(`  ID: ${p.id}`);
    console.log(`  Branch: ${p.branch.name} (${p.branchId})`);
    console.log(`  Price: ${p.price}`);
    console.log(`  Cost: ${p.cost}`);
    console.log(`  Prices count: ${p.prices.length}`);
    for (const pr of p.prices) {
      console.log(`    * PriceList "${pr.priceList.name}": ${pr.price}`);
    }
  }

  // Let's also print total number of ProductPrice records in DB
  const totalProductPrices = await prisma.productPrice.count();
  console.log(`\nTotal ProductPrice records in database: ${totalProductPrices}`);

  // Let's check a few random products that DO have product prices
  const samplePrices = await prisma.productPrice.findMany({
    take: 5,
    include: {
      product: {
        include: {
          branch: true
        }
      },
      priceList: true
    }
  });

  console.log("\n=== Sample ProductPrice Records ===");
  for (const sp of samplePrices) {
    console.log(`- Product: ${sp.product.name} (SKU: ${sp.product.sku}) in Branch: ${sp.product.branch.name}`);
    console.log(`  PriceList: ${sp.priceList.name}`);
    console.log(`  Price: ${sp.price}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
