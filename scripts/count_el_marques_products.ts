import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';

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
  const totalProducts = await prisma.product.count({ where: { branchId } });
  console.log(`Total products in El Marques branch: ${totalProducts}`);

  // Let's load the excel file SKUs
  const excelPath = "C:\\Users\\barca2\\Downloads\\Productos-2026-06-30-18-40.xlsx";
  const workbook = XLSX.readFile(excelPath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const range = XLSX.utils.decode_range(worksheet['!ref'] || '');

  const excelSkus = new Set<string>();
  for (let r = 3; r <= range.e.r; r++) {
    const cell = worksheet[XLSX.utils.encode_cell({ r, c: 9 })];
    if (cell && cell.v) {
      excelSkus.add(String(cell.v).trim());
    }
  }
  console.log(`Unique SKUs in Excel file: ${excelSkus.size}`);

  // Let's count how many products in El Marques have SKU in Excel
  const allElMarquesProducts = await prisma.product.findMany({
    where: { branchId },
    select: { sku: true }
  });

  let matchedCount = 0;
  for (const p of allElMarquesProducts) {
    if (excelSkus.has(p.sku)) {
      matchedCount++;
    }
  }

  console.log(`Products in El Marques branch matching Excel SKUs: ${matchedCount}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
