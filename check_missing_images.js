const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');

async function main() {
  const tenantId = 'db5d3949-f8dd-41f6-9627-90374d55d044';
  const products = await prisma.product.findMany({
    where: {
      branch: {
        tenantId: tenantId
      }
    }
  });

  console.log(`Total products for tenant: ${products.length}`);
  
  let missingCount = 0;
  let totalWithImage = 0;

  products.forEach(p => {
    if (p.imageUrl) {
      totalWithImage++;
      const relativePath = p.imageUrl.startsWith('/') ? p.imageUrl.substring(1) : p.imageUrl;
      const fullPath = path.join(__dirname, 'public', relativePath);
      
      if (!fs.existsSync(fullPath)) {
        missingCount++;
        if (missingCount <= 10) {
          console.log(`Missing image for SKU ${p.sku} (${p.name}):`);
          console.log(`  Db path: ${p.imageUrl}`);
          console.log(`  Expected disk path: ${fullPath}`);
        }
      }
    }
  });

  console.log(`Summary:`);
  console.log(`  Products with image path in DB: ${totalWithImage}`);
  console.log(`  Missing image files on disk: ${missingCount}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
