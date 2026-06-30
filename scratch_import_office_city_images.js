/**
 * scratch_import_office_city_images.js
 * Ingestion and Crawling Script for OFFICE CITY Product Images
 * 
 * Usage:
 *   node scratch_import_office_city_images.js --sync-only
 *   node scratch_import_office_city_images.js --crawl <limit>
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

// Global event handlers to prevent crashes from unhandled network or DB errors
process.on('unhandledRejection', (reason, promise) => {
  console.error(' [CRITICAL] Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err, origin) => {
  console.error(` [CRITICAL] Caught exception: ${err}\nException origin: ${origin}`);
});

const REFERENCE_BRANCH_ID = "QUERTAROCE_ID"; // Querétaro Centro (Ezequiel Montes) as base catalog
const OFFICE_CITY_BRANCH_IDS = [
  'QUERTAROCE_ID',
  'ALMACNBALV_ID',
  'ALMACNEZEQ_ID',
  'SONTERRA_ID',
  'ZAKIA_ID',
  'ELMIRADOR_ID',
  'SANJUANDEL_ID',
  'ZONAINDUST_ID',
  'CERRITOCOL_ID',
  'PRADERA_ID'
];

const PUBLIC_PRODUCT_IMG_DIR = path.join(__dirname, 'public', 'img', 'products');

// Helper: Sleep for MS
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper: Sanitize SKU to be safe as a filename (scrubs slashes, backslashes, etc.)
function sanitizeSkuForFilename(sku) {
  return sku
    .replace(/#/g, '_')
    .replace(/\?/g, '_')
    .replace(/\//g, '_')
    .replace(/\\/g, '_')
    .replace(/:/g, '_')
    .replace(/\*/g, '_')
    .replace(/"/g, '_')
    .replace(/</g, '_')
    .replace(/>/g, '_')
    .replace(/\|/g, '_');
}

// Helper: Ensure directories exist
function ensureDirectoryExistence(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Created directory: ${dirPath}`);
  }
}

// Stage 0: Sync Local Cache (restores imageUrl across all branches for products whose image is already in public/img/products/)
async function syncLocalCache() {
  console.log("\n=== STARTING STAGE 0: SYNC LOCAL CACHE FOR OFFICE CITY ===");
  ensureDirectoryExistence(PUBLIC_PRODUCT_IMG_DIR);

  const files = fs.readdirSync(PUBLIC_PRODUCT_IMG_DIR).filter(f => {
    const ext = path.extname(f).toLowerCase();
    return ext === '.jpg' || ext === '.jpeg' || ext === '.png' || ext === '.webp';
  });

  console.log(`Found ${files.length} total images in public/img/products/`);

  if (files.length === 0) return;

  // Build a map of clean SKU -> filename
  const skuMap = new Map();
  files.forEach(file => {
    const sku = path.basename(file, path.extname(file));
    skuMap.set(sku, file);
  });

  // Fetch all products in the reference branch with null or empty imageUrl
  const products = await prisma.product.findMany({
    where: {
      branchId: REFERENCE_BRANCH_ID,
      OR: [
        { imageUrl: null },
        { imageUrl: "" }
      ]
    },
    select: { sku: true }
  });

  console.log(`Checking ${products.length} products with empty images against local cache...`);

  let restoredCount = 0;
  for (const p of products) {
    const cleanSku = sanitizeSkuForFilename(p.sku);
    if (skuMap.has(cleanSku)) {
      const file = skuMap.get(cleanSku);
      const dbUrl = `/img/products/${file}`;
      try {
        // Update database across ALL 10 branches of Office City simultaneously
        const updateRes = await prisma.product.updateMany({
          where: {
            sku: p.sku,
            branchId: { in: OFFICE_CITY_BRANCH_IDS }
          },
          data: { imageUrl: dbUrl }
        });
        restoredCount++;
        console.log(`[RESTORE] SKU: ${p.sku} -> Restored to "${dbUrl}" in ${updateRes.count} branches`);
      } catch (err) {
        console.error(`Failed to restore product SKU ${p.sku}:`, err.message);
      }
    }
  }

  console.log(`=== STAGE 0 COMPLETED: Restored ${restoredCount} unique SKUs in Office City branches! ===\n`);
}

// Stage 1: Crawl remaining images - PERMANENTLY DISABLED
async function crawlMissingImages(limit = 150) {
  console.log("\n=== CRAWLING IS PERMANENTLY DISABLED BY ADMINISTRATION DIRECTIVE ===");
  return;
}

async function crawlImageForProduct(product) {
  console.log(`  [DISABLED] Crawling request ignored for: "${product.name}"`);
  return false;
}

// Helper: Shuffle array in place (Fisher-Yates algorithm)
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function main() {
  const args = process.argv.slice(2);
  const isSyncOnly = args.includes('--sync-only');
  const isCrawl = args.includes('--crawl');

  if (!isSyncOnly && !isCrawl) {
    console.log(`
Please specify an option:
  node scratch_import_office_city_images.js --sync-only
  node scratch_import_office_city_images.js --crawl <limit>
    `);
    process.exit(1);
  }

  try {
    // Stage 0: Automatically restore any already downloaded image URLs from local folder cache
    await syncLocalCache();

    if (isCrawl) {
      const limitArg = args[args.indexOf('--crawl') + 1];
      const limit = limitArg ? parseInt(limitArg, 10) : 150;
      console.log(`Running crawl with limit: ${limit}`);
      await crawlMissingImages(limit);
    }
  } catch (err) {
    console.error("Main execution failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
