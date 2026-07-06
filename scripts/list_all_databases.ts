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

// Connect to default neondb first
const prisma = new PrismaClient({ datasources: { db: { url: masterUrl } } });

async function main() {
  console.log("=== Listing all databases on the Neon server ===");
  const dbs = await prisma.$queryRawUnsafe<any[]>(`
    SELECT datname FROM pg_database WHERE datistemplate = false;
  `);
  console.log("Databases:");
  for (const db of dbs) {
    console.log(`- ${db.datname}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
