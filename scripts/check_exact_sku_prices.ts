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
  const sku = "7501014511023";
  console.log(`=== Checking prices for SKU "${sku}" ===`);
  const products = await prisma.product.findMany({
    where: { sku },
    include: {
      prices: {
        include: {
          priceList: true
        }
      },
      branch: true
    }
  });

  for (const p of products) {
    console.log(`- Product: ${p.name} (${p.id})`);
    console.log(`  Branch: ${p.branch.name} (${p.branchId})`);
    console.log(`  Prices count: ${p.prices.length}`);
    for (const pr of p.prices) {
      console.log(`    * PriceList "${pr.priceList.name}": ${pr.price}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
