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
  const branches = await prisma.branch.findMany();
  console.log("=== ProductPrice Count by Branch ===");
  for (const b of branches) {
    const count = await prisma.productPrice.count({
      where: {
        product: {
          branchId: b.id
        }
      }
    });
    console.log(`- Branch: ${b.name} (${b.id}) -> ${count} prices`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
