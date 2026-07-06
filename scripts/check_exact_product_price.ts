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
  const productId = "000d5a36-ff73-4b92-854f-3258afe391b6"; // El Marques product
  console.log(`=== Checking ProductPrice records for productId "${productId}" ===`);
  const prices = await prisma.productPrice.findMany({
    where: { productId },
    include: { priceList: true }
  });
  console.log(`Found ${prices.length} ProductPrice records:`);
  for (const pr of prices) {
    console.log(`- PriceList: ${pr.priceList.name} (${pr.priceListId}), Price: ${pr.price}`);
  }

  // Let's check El Mirador product with same SKU
  const elMiradorProduct = "646af49f-f79f-42bd-919e-22f92fe14431";
  console.log(`\n=== Checking ProductPrice records for El Mirador productId "${elMiradorProduct}" ===`);
  const pricesMirador = await prisma.productPrice.findMany({
    where: { productId: elMiradorProduct },
    include: { priceList: true }
  });
  console.log(`Found ${pricesMirador.length} ProductPrice records:`);
  for (const pr of pricesMirador) {
    console.log(`- PriceList: ${pr.priceList.name} (${pr.priceListId}), Price: ${pr.price}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
