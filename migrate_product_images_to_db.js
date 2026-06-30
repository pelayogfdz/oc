const { getClientForTenant, masterClient } = require('./lib/prisma');
const fs = require('fs');
const path = require('path');

// Mapped databases from lib/prisma.ts
const tenantDbNames = {
  '8b52cbcd-c956-4717-a1bd-02e57386aaa2': 'neondb_officecity',
  'db5d3949-f8dd-41f6-9627-90374d55d044': 'neondb_petqro',
  'cd1e1142-ae76-46aa-b2d2-e5de02904788': 'neondb_seit',
  '0d246cea-0220-4328-92b0-8a1387ce6a6d': 'neondb_pizca'
};

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getMatchScore(name, filename) {
  const normName = slugify(name).replace(/-/g, '');
  const normFile = slugify(filename).replace(/-/g, '');
  
  if (normName === normFile) return 100;
  if (normName.includes(normFile) || normFile.includes(normName)) return 90;
  
  const wordsName = slugify(name).split('-').filter(w => w.length > 2 && w !== 'con' && w !== 'para' && w !== 'del' && w !== 'una' && w !== 'pieza');
  const wordsFile = slugify(filename).split('-').filter(w => w.length > 2 && w !== 'con' && w !== 'para' && w !== 'del' && w !== 'una' && w !== 'pieza');
  
  if (wordsName.length === 0) return 0;
  
  let overlap = 0;
  for (const w of wordsName) {
    const matched = wordsFile.some(fw => fw === w || fw === 'c' + w || w === 'c' + fw);
    if (matched) overlap++;
  }
  
  return (overlap / wordsName.length) * 100;
}

const specialMatches = {
  'waggys-aceite-perros-cbdoliva-30ml-705mg-de-cbd': '7503045915009', // Waggy's Aceite Perros CBD+Oliva 30ml 750mg
};

const mimeTypes = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp'
};

async function main() {
  console.log("Migration of product images is disabled by administration directive.");
  return;
}

async function disabled_main() {
  const downloadsDir = 'C:\\Users\\barca2\\Downloads\\imagenes_productos';

  const getFiles = (dir) => {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir).filter(f => {
      const ext = path.extname(f).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);
    }).map(filename => ({
      filename,
      filePath: path.join(dir, filename),
      baseName: path.basename(filename, path.extname(filename))
    }));
  };

  const allFiles = [...getFiles(publicDir), ...getFiles(downloadsDir)];
  console.log(`Loaded ${allFiles.length} unique local image files.`);

  // Load and cache all base64 data URLs
  const fileDataCache = new Map();
  for (const file of allFiles) {
    try {
      const ext = path.extname(file.filePath).toLowerCase();
      const mime = mimeTypes[ext] || 'image/jpeg';
      const buffer = fs.readFileSync(file.filePath);
      const base64 = buffer.toString('base64');
      const dataUrl = `data:${mime};base64,${base64}`;
      fileDataCache.set(file.filename, dataUrl);
    } catch (e) {
      console.error(`Error reading file ${file.filename}:`, e.message);
    }
  }

  for (const [tenantId, dbName] of Object.entries(tenantDbNames)) {
    console.log(`\n========================================`);
    console.log(`Processing Tenant: ${tenantId} (${dbName})`);
    
    try {
      const client = getClientForTenant(tenantId);
      
      console.log("Fetching products from database...");
      const products = await client.product.findMany({
        select: { id: true, sku: true, name: true, imageUrl: true, barcode: true }
      });
      console.log(`Loaded ${products.length} products.`);

      // Build Inverted Index for fast lookups
      console.log("Building search index...");
      const productsBySku = new Map();
      const productsByBarcode = new Map();
      const productsByWord = new Map(); // word -> Set of products

      for (const p of products) {
        if (p.sku) productsBySku.set(p.sku.toLowerCase(), p);
        if (p.barcode) productsByBarcode.set(p.barcode.toLowerCase(), p);
        
        // Index by name words
        const words = slugify(p.name).split('-').filter(w => w.length > 2);
        for (const w of words) {
          if (!productsByWord.has(w)) {
            productsByWord.set(w, new Set());
          }
          productsByWord.get(w).add(p);
        }
      }

      const updates = [];
      const matchedProductIds = new Set();

      console.log("Matching images to products...");
      for (const file of allFiles) {
        const fileLower = file.filename.toLowerCase();
        let matchedProduct = null;

        // 1. Special manual overrides
        if (specialMatches[file.baseName]) {
          const targetSku = specialMatches[file.baseName];
          const found = productsBySku.get(targetSku.toLowerCase());
          if (found) matchedProduct = found;
        }

        // 2. Direct SKU match
        if (!matchedProduct) {
          matchedProduct = productsBySku.get(file.baseName.toLowerCase());
        }

        // 3. Direct Barcode match
        if (!matchedProduct) {
          matchedProduct = productsByBarcode.get(file.baseName.toLowerCase());
        }

        // 4. Exact DB imageUrl filename match
        if (!matchedProduct) {
          matchedProduct = products.find(p => p.imageUrl && path.basename(p.imageUrl).toLowerCase() === fileLower);
        }

        // 5. Loose slugified name matching using inverted word index
        if (!matchedProduct) {
          const fileWords = slugify(file.baseName).split('-').filter(w => w.length > 2);
          if (fileWords.length > 0) {
            // Find products that share at least one keyword
            const candidateProducts = new Set();
            for (const w of fileWords) {
              const matches = productsByWord.get(w);
              if (matches) {
                matches.forEach(p => candidateProducts.add(p));
              }
            }

            // Rank candidates
            let bestScore = 0;
            let bestCandidate = null;

            for (const p of candidateProducts) {
              const score = getMatchScore(p.name, file.baseName);
              if (score > bestScore) {
                bestScore = score;
                bestCandidate = p;
              }
            }

            if (bestCandidate && bestScore >= 75) {
              matchedProduct = bestCandidate;
            }
          }
        }

        if (matchedProduct && !matchedProductIds.has(matchedProduct.id)) {
          matchedProductIds.add(matchedProduct.id);
          const dataUrl = fileDataCache.get(file.filename);
          if (dataUrl) {
            updates.push({
              product: matchedProduct,
              dataUrl,
              fileName: file.filename
            });
          }
        }
      }

      console.log(`Matched ${updates.length} products. Proceeding to update database...`);
      
      // Perform database updates in batches of 20
      const BATCH_SIZE = 20;
      let count = 0;
      for (let i = 0; i < updates.length; i += BATCH_SIZE) {
        const batch = updates.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(async (u) => {
          try {
            await client.product.update({
              where: { id: u.product.id },
              data: { imageUrl: u.dataUrl }
            });
            count++;
          } catch (err) {
            console.error(`  - Failed to update [SKU: ${u.product.sku}]:`, err.message);
          }
        }));
        console.log(`  - Updated ${count}/${updates.length} products...`);
      }

      console.log(`Completed Tenant ${tenantId}. Total updated: ${count}`);

    } catch (e) {
      console.error(`Error processing tenant ${tenantId}:`, e.message);
    }
  }

  console.log("\nAll tenants processed successfully!");
}

main().catch(console.error).finally(() => masterClient.$disconnect());
