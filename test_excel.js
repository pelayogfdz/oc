const xlsx = require('xlsx');

const filePath = 'C:\\Users\\barca\\Downloads\\PRODUCTOS___ (1).xlsx';
const workbook = xlsx.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];

const data = xlsx.utils.sheet_to_json(sheet);
if (data.length > 0) {
  console.log("Keys:", Object.keys(data[0]));
  console.log("Row 0:", data[0]);
} else {
  console.log("NO DATA");
}
