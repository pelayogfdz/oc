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
  const excelPath = "C:\\Users\\barca2\\Downloads\\Productos-2026-06-30-18-40.xlsx";
  const workbook = XLSX.readFile(excelPath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const range = XLSX.utils.decode_range(worksheet['!ref'] || '');

  const searchSku = "7501014511023";
  let foundRow = -1;
  for (let r = 3; r <= range.e.r; r++) {
    const cell = worksheet[XLSX.utils.encode_cell({ r, c: 9 })];
    if (cell && String(cell.v).trim().toLowerCase() === searchSku) {
      foundRow = r;
      break;
    }
  }

  if (foundRow === -1) {
    console.log(`SKU ${searchSku} not found in Excel`);
    return;
  }

  console.log(`SKU ${searchSku} found in Excel at row ${foundRow + 1}`);

  // Let's run the exact same logic as import_excel_price_lists.ts
  const headers: string[] = [];
  for (let c = 0; c <= range.e.c; c++) {
    const cellRef = XLSX.utils.encode_cell({ r: 2, c });
    const cell = worksheet[cellRef];
    headers.push(cell ? String(cell.v).trim() : '');
  }

  const priceLists = await prisma.priceList.findMany();
  const colMappings: { colIdx: number; priceList: any }[] = [];
  headers.forEach((h, idx) => {
    if (!h) return;
    const cleanHeader = h.toLowerCase();
    const match = priceLists.find(pl => {
      const plName = pl.name.toLowerCase();
      return cleanHeader === plName || 
             cleanHeader === `precio ${plName}` ||
             cleanHeader === pl.id.toLowerCase() ||
             cleanHeader.includes(plName) ||
             plName.includes(cleanHeader);
    });
    if (match) {
      colMappings.push({ colIdx: idx, priceList: match });
    }
  });

  const products = await prisma.product.findMany({
    where: { sku: searchSku }
  });
  console.log(`Found ${products.length} products in database for SKU ${searchSku}`);

  for (const mapping of colMappings) {
    const cellRef = XLSX.utils.encode_cell({ r: foundRow, c: mapping.colIdx });
    const cell = worksheet[cellRef];
    console.log(`Checking column "${mapping.priceList.name}": value is "${cell ? cell.v : 'undefined'}"`);
    if (!cell || cell.v === null || cell.v === undefined || cell.v === '') continue;

    const priceVal = parseFloat(cell.v);
    console.log(`Parsed price: ${priceVal}`);

    for (const prod of products) {
      console.log(`  Updating product ${prod.id} in branch ${prod.branchId}`);
      const res = await prisma.productPrice.upsert({
        where: {
          productId_priceListId: {
            productId: prod.id,
            priceListId: mapping.priceList.id
          }
        },
        create: {
          productId: prod.id,
          priceListId: mapping.priceList.id,
          price: priceVal
        },
        update: {
          price: priceVal
        }
      });
      console.log(`    Upsert result ID: ${res.id}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
