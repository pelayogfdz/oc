const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting migration to extract base64 images to files...');
  
  const products = await prisma.product.findMany({
    where: {
      imageUrl: {
        startsWith: 'data:image/'
      }
    },
    select: {
      id: true,
      sku: true,
      barcode: true,
      imageUrl: true
    }
  });

  console.log(`Found ${products.length} products with base64 images to process.`);

  const publicDir = path.join(process.cwd(), 'public', 'img', 'products');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  let successCount = 0;
  let failCount = 0;

  for (const product of products) {
    try {
      const match = product.imageUrl.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
      if (match) {
        const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
        const base64Data = match[2];
        const buffer = Buffer.from(base64Data, 'base64');

        // Clean barcode/sku for filename
        const filenameBase = ((product.barcode || '').trim() || (product.sku || '').trim() || product.id).replace(/[^a-zA-Z0-9-_]/g, '');
        const filename = `${filenameBase}.${ext}`;
        const filePath = path.join(publicDir, filename);

        fs.writeFileSync(filePath, buffer);
        const relativeUrl = `/img/products/${filename}`;

        await prisma.product.update({
          where: { id: product.id },
          data: { imageUrl: relativeUrl }
        });

        console.log(`Product ${product.id} (SKU: ${product.sku}): image extracted to ${relativeUrl}`);
        successCount++;
      } else {
        console.warn(`Product ${product.id} image did not match base64 regex pattern.`);
        failCount++;
      }
    } catch (err) {
      console.error(`Error processing product ${product.id}:`, err);
      failCount++;
    }
  }

  console.log(`Migration finished. Success: ${successCount}, Failed/Skipped: ${failCount}`);
}

main()
  .catch(e => {
    console.error('Fatal error during migration:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
