import * as XLSX from 'xlsx';

async function main() {
  const excelPath = "C:\\Users\\barca2\\Downloads\\Productos-2026-06-30-18-40.xlsx";
  const workbook = XLSX.readFile(excelPath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  const r = 5300; // row 5301
  console.log(`=== Inspecting Row 5301 (index ${r}) ===`);
  
  // Print all columns that have values
  for (let c = 0; c <= 74; c++) {
    const val = worksheet[XLSX.utils.encode_cell({ r, c })]?.v;
    if (val !== undefined && val !== null && val !== '') {
      // Let's get header
      const header = worksheet[XLSX.utils.encode_cell({ r: 2, c })]?.v;
      console.log(`  Col ${c} ("${header}"): "${val}"`);
    }
  }
}

main().catch(console.error);
