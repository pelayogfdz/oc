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
  console.log("=== Checking price lists for El Marques ===");
  const count = await prisma.productPrice.count({
    where: {
      product: {
        branch: {
          name: { contains: "Marques", mode: "insensitive" }
        }
      }
    }
  });
  console.log(`ProductPrice records for El Marques branch: ${count}`);

  // Let's print out all branches in the database to see their names and IDs
  const branches = await prisma.branch.findMany();
  console.log("\n=== Branches in neondb_officecity ===");
  for (const b of branches) {
    console.log(`- ${b.name} (${b.id})`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
