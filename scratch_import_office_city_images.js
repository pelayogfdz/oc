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

// Helper to search and download a single product image
async function crawlImageForProduct(product) {
  try {
    ensureDirectoryExistence(PUBLIC_PRODUCT_IMG_DIR);

    // Build the query, clean Office City specific details if needed (e.g. "(LT)", "(L)", or "#0-#9" velas, saturate with "office city" to find products if needed)
    // For Office City (office supplies, art supplies, electronics), adding "papeleria" or "office" can help if search is too generic,
    // but the product names are very specific like "VERBATIM CDR CAMPANA 97488", so searching the name directly is perfect.
    let searchQuery = product.name;
    // Replace hashtag symbols in the query to avoid breaks
    searchQuery = searchQuery.replace(/#/g, ' ');

    const bingUrl = `https://www.bing.com/images/search?q=${encodeURIComponent(searchQuery)}&first=1`;
    console.log(`  Searching: "${searchQuery}"`);

    const response = await fetch(bingUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'es-MX,es;q=0.8,en-US;q=0.5,en;q=0.3'
      },
      timeout: 10000
    });

    if (!response.ok) {
      console.warn(`  [WARN] Bing search returned status: ${response.status}`);
      return false;
    }

    const html = await response.text();
    
    // Find all ".iusc" elements containing metadata in 'm' attribute
    const matches = [];
    const regex = /class="iusc"[^>]*m="([^"]+)"/g;
    let match;
    while ((match = regex.exec(html)) !== null) {
      try {
        const decoded = match[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&');
        const parsed = JSON.parse(decoded);
        if (parsed.murl) {
          matches.push(parsed.murl);
        }
      } catch (e) {
        // Ignored parse error
      }
    }

    console.log(`  Found ${matches.length} candidate URLs`);

    if (matches.length === 0) {
      console.warn(`  [WARN] No candidate images found for search: "${searchQuery}"`);
      return false;
    }

    // Attempt downloading sequentially with fallback retries up to 4 candidates
    let downloadSuccess = false;
    const candidatesToTry = matches.slice(0, 4);

    for (let cIdx = 0; cIdx < candidatesToTry.length; cIdx++) {
      const foundImgUrl = candidatesToTry[cIdx];
      console.log(`  [Try ${cIdx + 1}/${candidatesToTry.length}] Candidate URL: ${foundImgUrl}`);

      // Deduce file extension
      let ext = '.jpg';
      if (foundImgUrl.toLowerCase().includes('.png')) ext = '.png';
      else if (foundImgUrl.toLowerCase().includes('.webp')) ext = '.webp';

      const cleanExtMatch = foundImgUrl.match(/\.(jpg|jpeg|png|webp)/i);
      if (cleanExtMatch) {
        ext = cleanExtMatch[0].toLowerCase();
        if (ext === '.jpeg') ext = '.jpg';
      }

      const cleanSkuForFile = sanitizeSkuForFilename(product.sku);
      const destFileName = `${cleanSkuForFile}${ext}`;
      const destPath = path.join(PUBLIC_PRODUCT_IMG_DIR, destFileName);
      const dbUrl = `/img/products/${destFileName}`;

      try {
        console.log(`    Downloading image to: ${destFileName}...`);
        const imgRes = await fetch(foundImgUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
          },
          timeout: 10000
        });

        if (!imgRes.ok) {
          console.warn(`    [WARN] Download failed with status: ${imgRes.status}`);
          continue;
        }

        const buffer = await imgRes.buffer();
        fs.writeFileSync(destPath, buffer);

        // Update database across ALL 10 branches of Office City simultaneously
        const updateRes = await prisma.product.updateMany({
          where: {
            sku: product.sku,
            branchId: { in: OFFICE_CITY_BRANCH_IDS }
          },
          data: { imageUrl: dbUrl }
        });

        console.log(`    [SUCCESS] SKU: ${product.sku} updated to "${dbUrl}" across ${updateRes.count} branches`);
        downloadSuccess = true;
        break; // Succeeded! Break the retry loop
      } catch (err) {
        console.warn(`    [WARN] Download error: ${err.message}`);
      }
    }

    return downloadSuccess;

  } catch (err) {
    console.error(`  [ERROR] Crawl failed for SKU ${product.sku}:`, err.message);
    return false;
  }
}

// Stage 1: Crawl remaining images
async function crawlMissingImages(limit = 150) {
  console.log("\n=== STARTING STAGE 1: BING IMAGES CRAWLER FOR OFFICE CITY ===");
  ensureDirectoryExistence(PUBLIC_PRODUCT_IMG_DIR);

  // Fetch all products in the reference branch with null or empty imageUrl
  const products = await prisma.product.findMany({
    where: {
      branchId: REFERENCE_BRANCH_ID,
      OR: [
        { imageUrl: null },
        { imageUrl: "" }
      ]
    },
    orderBy: { createdAt: 'desc' }
  });

  console.log(`Found ${products.length} products without images in base branch.`);

  if (products.length === 0) {
    console.log("No missing images to crawl! Exiting.");
    return;
  }

  const toProcess = products.slice(0, limit);
  console.log(`Processing next batch of ${toProcess.length} products...`);

  let successCount = 0;
  let failCount = 0;
  let consecutiveFailures = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const p = toProcess[i];
    console.log(`\n[Lote ${i + 1}/${toProcess.length}] Processing "${p.name}" (SKU: ${p.sku})`);

    const success = await crawlImageForProduct(p);
    if (success) {
      successCount++;
      consecutiveFailures = 0;
    } else {
      failCount++;
      consecutiveFailures++;
      console.warn(`  [INFO] Consecutive failures: ${consecutiveFailures}/10`);
      if (consecutiveFailures >= 10) {
        console.error(`\n [CRITICAL] 10 consecutive failures encountered! Bing search rate limits or network issues detected. Exiting gracefully to prevent spam.`);
        break;
      }
    }

    // Politeness throttle
    if (i < toProcess.length - 1) {
      const delay = 1500 + Math.random() * 500; // 1.5s - 2.0s delay
      console.log(`Waiting ${(delay / 1000).toFixed(2)}s to prevent rate limits...`);
      await sleep(delay);
    }
  }

  console.log(`\n=== STAGE 1 COMPLETED ===`);
  console.log(`Successfully downloaded & saved: ${successCount}`);
  console.log(`Failed to download: ${failCount}`);
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
