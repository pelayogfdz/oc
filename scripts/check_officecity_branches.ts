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
  console.log("=== Checking neondb_officecity ===");
  const branches = await prisma.branch.findMany();
  console.log("Branches in neondb_officecity:");
  for (const b of branches) {
    const productsCount = await prisma.product.count({ where: { branchId: b.id } });
    const pricesCount = await prisma.productPrice.count({
      where: {
        product: {
          branchId: b.id
        }
      }
    });
    console.log(`- ${b.name} (${b.id}): ${productsCount} products, ${pricesCount} prices`);
  }

  const totalPrices = await prisma.productPrice.count();
  console.log(`\nTotal ProductPrice records in neondb_officecity: ${totalPrices}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
