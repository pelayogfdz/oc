/**
 * scratch_import_images.js
 * Ingestion and Crawling Script for PETQRO Product Images
 * 
 * Usage:
 *   node scratch_import_images.js --local-only
 *   node scratch_import_images.js --remote-test <limit>
 *   node scratch_import_images.js --remote-all
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

const TARGET_BRANCH_ID = "2e215b8c-b9e3-444f-adc3-c4387a684e05";
const LOCAL_IMAGE_DIR = 'C:\\Users\\barca2\\Downloads\\imagenes_productos';
const PUBLIC_PRODUCT_IMG_DIR = path.join(__dirname, 'public', 'img', 'products');

// Filler words to ignore during strict string matching
const FILLER_WORDS = new Set([
  'para', 'con', 'de', 'del', 'el', 'la', 'los', 'las', 'un', 'una', 
  'alimento', 'mascota', 'perros', 'perro', 'gatos', 'gato', 'y', 'en', 
  'pieza', 'piezas', 'grs', 'gramos', 'kgs', 'kg', 'ml', 'bote', 'bolsa', 
  'linea', 'etapa', 'sabor', 'olor'
]);

// Helper: Sleep for MS
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper: Ensure directories exist
function ensureDirectoryExistence(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Created directory: ${dirPath}`);
  }
}

// Stage 0: Sync Local Cache (restores imageUrl for products whose image is already in public/img/products/)
async function syncLocalCache() {
  console.log("\n=== STARTING STAGE 0: SYNC LOCAL CACHE ===");
  ensureDirectoryExistence(PUBLIC_PRODUCT_IMG_DIR);

  const files = fs.readdirSync(PUBLIC_PRODUCT_IMG_DIR).filter(f => {
    const ext = path.extname(f).toLowerCase();
    return ext === '.jpg' || ext === '.jpeg' || ext === '.png' || ext === '.webp';
  });

  console.log(`Found ${files.length} images already in public/img/products/`);

  if (files.length === 0) return;

  // Build a map of SKU -> filename
  const skuMap = new Map();
  files.forEach(file => {
    const sku = path.basename(file, path.extname(file));
    skuMap.set(sku, file);
  });

  // Fetch all products in target branch with null or empty imageUrl
  const products = await prisma.product.findMany({
    where: {
      branchId: TARGET_BRANCH_ID,
      OR: [
        { imageUrl: null },
        { imageUrl: "" }
      ]
    }
  });

  console.log(`Checking ${products.length} products with empty images against local cache...`);

  let restoredCount = 0;
  for (const p of products) {
    const cleanSku = p.sku.replace(/#/g, '_').replace(/\?/g, '_');
    if (skuMap.has(cleanSku)) {
      const file = skuMap.get(cleanSku);
      const dbUrl = `/img/products/${file}`;
      try {
        await prisma.product.update({
          where: { id: p.id },
          data: { imageUrl: dbUrl }
        });
        restoredCount++;
        console.log(`[RESTORE] SKU: ${p.sku} -> Restored imageUrl to "${dbUrl}" from local cache file`);
      } catch (err) {
        console.error(`Failed to restore product ${p.sku}:`, err.message);
      }
    }
  }

  console.log(`=== STAGE 0 COMPLETED: Restored ${restoredCount} products from cache! ===\n`);
}

// Stage 1: Ingest local matching images
async function ingestLocalImages() {
  console.log("\n=== STARTING STAGE 1: LOCAL IMAGE MATCHING & COPY ===");
  ensureDirectoryExistence(PUBLIC_PRODUCT_IMG_DIR);

  if (!fs.existsSync(LOCAL_IMAGE_DIR)) {
    console.error(`Error: Local image directory does not exist: ${LOCAL_IMAGE_DIR}`);
    return;
  }

  const localFiles = fs.readdirSync(LOCAL_IMAGE_DIR).filter(f => {
    const ext = path.extname(f).toLowerCase();
    return ext === '.jpg' || ext === '.jpeg' || ext === '.png' || ext === '.webp';
  });

  console.log(`Found ${localFiles.length} files in local folder: ${LOCAL_IMAGE_DIR}`);

  // Fetch all products in target branch
  const products = await prisma.product.findMany({
    where: { branchId: TARGET_BRANCH_ID }
  });

  console.log(`Fetched ${products.length} products from branch ${TARGET_BRANCH_ID}`);

  let matchCount = 0;
  for (const p of products) {
    const pNameLower = p.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    let bestMatchFile = null;
    let maxOverlap = 0;

    for (const file of localFiles) {
      const fClean = file.toLowerCase().replace(/\.[a-z0-9]+$/, '').replace(/[^a-z0-9]/g, ' ');
      const fWords = fClean.split(/\s+/).filter(w => w.length > 1 && !FILLER_WORDS.has(w));
      
      if (fWords.length === 0) continue;

      // Check if ALL keywords of the filename are present in the product name
      const allKeywordsMatch = fWords.every(word => pNameLower.includes(word));
      
      if (allKeywordsMatch && fWords.length > maxOverlap) {
        maxOverlap = fWords.length;
        bestMatchFile = file;
      }
    }

    if (bestMatchFile) {
      const ext = path.extname(bestMatchFile).toLowerCase();
      const destFileName = `${p.sku}${ext}`;
      const srcPath = path.join(LOCAL_IMAGE_DIR, bestMatchFile);
      const destPath = path.join(PUBLIC_PRODUCT_IMG_DIR, destFileName);
      const dbUrl = `/img/products/${destFileName}`;

      try {
        fs.copyFileSync(srcPath, destPath);
        await prisma.product.update({
          where: { id: p.id },
          data: { imageUrl: dbUrl }
        });
        matchCount++;
        console.log(`[MATCH] SKU: ${p.sku} | "${p.name}" matched & copied to "${destFileName}"`);
      } catch (err) {
        console.error(`Failed to copy or update product ${p.sku}:`, err.message);
      }
    }
  }

  console.log(`=== STAGE 1 COMPLETED: Matched and imported ${matchCount} products! ===\n`);
}

// Fetch single image from Bing and save
async function crawlImageForProduct(product) {
  const query = product.name.trim();
  const url = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&form=HDRSC2&first=1`;
  
  console.log(`Searching Bing Images for: "${query}" (SKU: ${product.sku})`);

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'es-MX,es;q=0.9,en;q=0.8'
      },
      timeout: 10000
    });

    if (!res.ok) {
      console.warn(`  [WARN] Search request failed with status: ${res.status}`);
      return false;
    }

    const html = await res.text();
    const regex = /class="iusc"[^>]*m="([^"]+)"/g;
    let match;
    const foundImgUrls = [];

    while ((match = regex.exec(html)) !== null && foundImgUrls.length < 5) {
      try {
        const decoded = match[1].replace(/&quot;/g, '"');
        const data = JSON.parse(decoded);
        if (data.murl && data.murl.startsWith('http')) {
          foundImgUrls.push(data.murl);
        }
      } catch (e) {
        // ignore JSON parse errors
      }
    }

    if (foundImgUrls.length === 0) {
      console.warn(`  [WARN] No valid image URL found in search results for: "${query}"`);
      return false;
    }

    let downloadSuccess = false;
    for (let i = 0; i < foundImgUrls.length; i++) {
      const foundImgUrl = foundImgUrls[i];
      console.log(`  Trying remote image URL [${i + 1}/${foundImgUrls.length}]: ${foundImgUrl}`);

      // Determine extension or default to .jpg
      let ext = '.jpg';
      if (foundImgUrl.toLowerCase().includes('.png')) ext = '.png';
      else if (foundImgUrl.toLowerCase().includes('.jpeg')) ext = '.jpg';
      else if (foundImgUrl.toLowerCase().includes('.webp')) ext = '.webp';

      const cleanExtMatch = foundImgUrl.match(/\.(jpg|jpeg|png|webp)/i);
      if (cleanExtMatch) {
        ext = cleanExtMatch[0].toLowerCase();
        if (ext === '.jpeg') ext = '.jpg';
      }

      const cleanSkuForFile = product.sku.replace(/#/g, '_').replace(/\?/g, '_');
      const destFileName = `${cleanSkuForFile}${ext}`;
      const destPath = path.join(PUBLIC_PRODUCT_IMG_DIR, destFileName);
      const dbUrl = `/img/products/${destFileName}`;

      try {
        console.log(`  Downloading image to: ${destFileName}...`);
        const imgRes = await fetch(foundImgUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
          },
          timeout: 10000
        });

        if (!imgRes.ok) {
          console.warn(`  [WARN] Download failed with status: ${imgRes.status} for URL: ${foundImgUrl}`);
          continue;
        }

        const buffer = await imgRes.buffer();
        fs.writeFileSync(destPath, buffer);

        // Save image to DB
        await prisma.product.update({
          where: { id: product.id },
          data: { imageUrl: dbUrl }
        });

        console.log(`  [SUCCESS] SKU: ${product.sku} updated with imageUrl: ${dbUrl}`);
        downloadSuccess = true;
        break; // Succeeded! Break the retry loop
      } catch (err) {
        console.warn(`  [WARN] Download failed with error for URL: ${foundImgUrl}. Error: ${err.message}`);
      }
    }

    return downloadSuccess;

  } catch (err) {
    console.error(`  [ERROR] Crawl failed for SKU ${product.sku}:`, err.message);
    return false;
  }
}

// Stage 2: Crawl remaining images
async function crawlMissingImages(limit = null) {
  console.log("\n=== STARTING STAGE 2: BING IMAGES CRAWLER ===");
  ensureDirectoryExistence(PUBLIC_PRODUCT_IMG_DIR);

  // Fetch all products in target branch with null or empty imageUrl
  const products = await prisma.product.findMany({
    where: {
      branchId: TARGET_BRANCH_ID,
      OR: [
        { imageUrl: null },
        { imageUrl: "" }
      ]
    }
  });

  console.log(`Found ${products.length} products without images.`);

  if (products.length === 0) {
    console.log("No missing images to crawl! Exiting.");
    return;
  }

  const toProcess = limit ? products.slice(0, limit) : products;
  console.log(`Processing ${toProcess.length} products...`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const p = toProcess[i];
    console.log(`\n[${i + 1}/${toProcess.length}] Processing "${p.name}" (SKU: ${p.sku})`);

    const success = await crawlImageForProduct(p);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }

    // Politeness throttle
    if (i < toProcess.length - 1) {
      const delay = 1000 + Math.random() * 500; // 1.0s - 1.5s delay
      console.log(`Waiting ${(delay / 1000).toFixed(2)}s to prevent rate limits...`);
      await sleep(delay);
    }
  }

  console.log(`\n=== STAGE 2 COMPLETED ===`);
  console.log(`Successfully downloaded & saved: ${successCount}`);
  console.log(`Failed to download: ${failCount}`);
}

async function main() {
  const args = process.argv.slice(2);
  const isLocalOnly = args.includes('--local-only');
  const isRemoteTest = args.includes('--remote-test');
  const isRemoteAll = args.includes('--remote-all');

  if (!isLocalOnly && !isRemoteTest && !isRemoteAll) {
    console.log(`
Please specify an option:
  node scratch_import_images.js --local-only
  node scratch_import_images.js --remote-test <limit>
  node scratch_import_images.js --remote-all
    `);
    process.exit(1);
  }

  try {
    // Stage 0: Automatically restore any already downloaded image URLs from local folder cache!
    await syncLocalCache();

    if (isLocalOnly) {
      await ingestLocalImages();
    } else if (isRemoteTest) {
      const limitArg = args[args.indexOf('--remote-test') + 1];
      const limit = limitArg ? parseInt(limitArg, 10) : 10;
      console.log(`Running remote test with limit: ${limit}`);
      
      // We always run local ingestion first so we don't re-crawl matched ones!
      await ingestLocalImages();
      await crawlMissingImages(limit);
    } else if (isRemoteAll) {
      await ingestLocalImages();
      await crawlMissingImages();
    }
  } catch (err) {
    console.error("Main execution failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
