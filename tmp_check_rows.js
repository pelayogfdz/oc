const xlsx = require('xlsx');
const wb = xlsx.readFile('C:\\Users\\barca2\\Downloads\\PRODUCTOS___.xlsx');
const data = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {header: 1});

let emptySku = 0;
let emptyBarcode = 0;
let total = 0;

for(let i=3; i<data.length; i++) {
  if(!data[i] || !data[i][0]) continue;
  total++;
  if(!data[i][9]) emptySku++;
  if(!data[i][8]) emptyBarcode++;
}

console.log(`Total Valid Rows: ${total}, Empty SKU: ${emptySku}, Empty Barcode: ${emptyBarcode}`);
