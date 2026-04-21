const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory() && !file.includes('node_modules') && !file.includes('.next') && !file.includes('.git')) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('app');
const regex = /href=['"]([^'"]+)['"]/g;
const missing = new Set();

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  let match;
  while ((match = regex.exec(content)) !== null) {
    let p = match[1];
    
    // ignore query params and hashes for path checking
    p = p.split('?')[0].split('#')[0];

    if (p.startsWith('/') && !p.includes('[')) {
      const fp1 = path.join('app', p, 'page.tsx');
      const fp2 = path.join('app', '(dashboard)', p, 'page.tsx');
      const fp3 = path.join('app', '(auth)', p, 'page.tsx');
      
      if (!fs.existsSync(fp1) && !fs.existsSync(fp2) && !fs.existsSync(fp3)) {
        missing.add(p);
      }
    }
  }
});

console.log('Missing hrefs:', Array.from(missing));
