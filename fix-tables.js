const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Replace <table style={{ width: '100%'... }}
      // We can use a regex to insert className="responsive-table" before style
      const tableRegex = /<table\s+(?:className="[^"]*"\s+)?style={{[^}]*}}/g;
      
      let modified = false;
      content = content.replace(tableRegex, (match) => {
        if (!match.includes('responsive-table')) {
          modified = true;
          // If it has className already
          if (match.includes('className="')) {
             return match.replace('className="', 'className="responsive-table ');
          } else {
             return match.replace('<table', '<table className="responsive-table"');
          }
        }
        return match;
      });

      if (modified) {
         fs.writeFileSync(fullPath, content);
         console.log('Updated table class in', fullPath);
      }
    }
  }
}
processDir('app/(dashboard)');
