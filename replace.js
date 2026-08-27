const fs = require('fs');
const path = require('path');
const p = path.join('app', '(dashboard)', 'ventas', 'nueva', 'POSClient.tsx');
let content = fs.readFileSync(p, 'utf8');
content = content.replace(/breakdownDiscounts\s*\|\|\s*documentType\s*===\s*'FACTURA'/g, 'breakdownDiscounts');
fs.writeFileSync(p, content);
console.log('Replaced successfully');
