import * as XLSX from 'xlsx';

async function main() {
  const excelPath = "C:\\Users\\barca2\\Downloads\\Productos-2026-06-30-18-40.xlsx";
  const workbook = XLSX.readFile(excelPath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const range = XLSX.utils.decode_range(worksheet['!ref'] || '');

  const searchSku = "ubws13399";
  let foundRow = -1;
  for (let r = 3; r <= range.e.r; r++) {
    const cell = worksheet[XLSX.utils.encode_cell({ r, c: 9 })];
    if (cell && String(cell.v).trim().toLowerCase() === searchSku) {
      foundRow = r;
      break;
    }
  }

  if (foundRow !== -1) {
    console.log(`Found SKU "${searchSku}" at row ${foundRow + 1}`);
  } else {
    console.log(`SKU "${searchSku}" NOT found in Excel file!`);
  }
}

main().catch(console.error);
