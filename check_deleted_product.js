const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Fetching all active products...');
  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: {
      id: true,
      sku: true,
      name: true,
      price: true,
      wholesalePrice: true,
      specialPrice: true,
      cost: true,
      branchId: true,
      branch: { select: { name: true } }
    }
  });

  console.log(`Total active products: ${products.length}`);

  // Group products by SKU
  const bySku = {};
  for (const p of products) {
    if (!p.sku) continue;
    const key = p.sku.trim();
    if (!bySku[key]) bySku[key] = [];
    bySku[key].push(p);
  }

  console.log(`Unique SKUs: ${Object.keys(bySku).length}`);

  let diffCount = 0;
  for (const [sku, list] of Object.entries(bySku)) {
    if (list.length <= 1) continue;

    // Check if they have different prices or wholesalePrices
    const first = list[0];
    const hasDifference = list.some(p => 
      p.price !== first.price || 
      p.wholesalePrice !== first.wholesalePrice ||
      p.specialPrice !== first.specialPrice
    );

    if (hasDifference) {
      diffCount++;
      if (diffCount <= 10) {
        console.log(`\nSKU Discrepancy #${diffCount}: [${sku}] - ${first.name.slice(0, 50)}`);
        for (const p of list) {
          console.log(`  - Branch: ${p.branch.name} | Price: $${p.price} | Wholesale: $${p.wholesalePrice} | Special: $${p.specialPrice} | Cost: $${p.cost}`);
        }
      }
    }
  }

  console.log(`\nTotal SKUs with price discrepancies: ${diffCount}`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
