const fs = require('fs');
const path = require('path');

const content = fs.readFileSync('app/(dashboard)/preferencias/layout.tsx', 'utf8');
const regex = /path:\s*['"]([^'"]+)['"]/g;
let match;
const missing = [];

while ((match = regex.exec(content)) !== null) {
  const p = match[1];
  const filePath1 = path.join('app', p, 'page.tsx');
  const filePath2 = path.join('app', '(dashboard)', p, 'page.tsx');
  
  if (!fs.existsSync(filePath1) && !fs.existsSync(filePath2) && !p.includes('[')) {
    missing.push(p);
  }
}

console.log('Missing preferencias paths:', missing);
