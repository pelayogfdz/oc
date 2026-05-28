/**
 * scratch_generate_office_city_descriptions.js
 * AI Description Generator for OFFICE CITY Catalogue using Google Gemini API
 * 
 * Usage:
 *   node scratch_generate_office_city_descriptions.js --limit <batch_size>
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

// Manually parse .env to avoid external 'dotenv' dependency
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
      if (key && val) {
        process.env[key] = val;
      }
    }
  });
}


// Global event handlers to prevent crashes
process.on('unhandledRejection', (reason, promise) => {
  console.error(' [CRITICAL] Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err, origin) => {
  console.error(` [CRITICAL] Caught exception: ${err}\nException origin: ${origin}`);
});

const REFERENCE_BRANCH_ID = "QUERTAROCE_ID";
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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function generateDescription(product, model) {
  try {
    const prompt = `Genera una descripción comercial, profesional y concisa en español para un artículo de papelería/oficina con los siguientes datos:
Nombre: "${product.name}"
Marca: "${product.brand || 'No especificada'}"
Categoría: "${product.category || 'Papelería e insumos'}"

Instrucciones:
1. Debe ser informativa, atractiva y resumir su utilidad clave en la oficina o escuela.
2. Debe tener exactamente 1 o 2 oraciones cortas (máximo 160 caracteres).
3. Responde únicamente con el texto de la descripción generada. No incluyas introducciones como "Aquí tienes...", ni comillas, ni explicaciones adicionales.`;

    const result = await model.generateContent(prompt);
    let descText = result.response.text().trim();
    
    // Clean any leading/trailing quotes or markdown
    descText = descText.replace(/^["'«]+|["'»]+$/g, '').trim();
    return descText;
  } catch (err) {
    console.error(`  [WARN] Failed to generate AI description for SKU ${product.sku}:`, err.message);
    return null;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const limitIndex = args.indexOf('--limit');
  const limit = limitIndex !== -1 ? parseInt(args[limitIndex + 1], 10) : 50;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error(" [CRITICAL] GEMINI_API_KEY is not defined in your environment or .env file.");
    process.exit(1);
  }

  console.log("\n=== STARTING OFFICE CITY AI DESCRIPTIONS GENERATOR ===");
  console.log(`Configured batch limit: ${limit} products per run.`);

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Fast and cost-efficient

    // Find products in base branch without description
    const products = await prisma.product.findMany({
      where: {
        branchId: REFERENCE_BRANCH_ID,
        OR: [
          { description: null },
          { description: "" },
          { description: "Sin descripción" }
        ]
      },
      select: {
        id: true,
        sku: true,
        name: true,
        brand: true,
        category: true
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`Found ${products.length} products without descriptions in base branch.`);

    if (products.length === 0) {
      console.log("All products already have descriptions! Exiting.");
      return;
    }

    const toProcess = products.slice(0, limit);
    console.log(`Generating descriptions for next batch of ${toProcess.length} products...`);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < toProcess.length; i++) {
      const p = toProcess[i];
      console.log(`\n[Batch ${i + 1}/${toProcess.length}] Processing "${p.name}" (SKU: ${p.sku})`);

      const desc = await generateDescription(p, model);
      
      if (desc && desc.length > 5) {
        try {
          // Update database across ALL 10 branches of Office City simultaneously
          const updateRes = await prisma.product.updateMany({
            where: {
              sku: p.sku,
              branchId: { in: OFFICE_CITY_BRANCH_IDS }
            },
            data: { description: desc }
          });

          console.log(`  [SUCCESS] SKU: ${p.sku} -> Generated: "${desc}"`);
          console.log(`  [UPDATED] Impacted ${updateRes.count} branches in Neon DB.`);
          successCount++;
        } catch (dbErr) {
          console.error(`  [ERROR] Database update failed for SKU ${p.sku}:`, dbErr.message);
          failCount++;
        }
      } else {
        failCount++;
      }

      // Respect API rate limits (Gemini free tier has 15 RPM, so 4-5s sleep between iterations is very safe)
      if (i < toProcess.length - 1) {
        console.log("Waiting 4.2s to respect API rate limits...");
        await sleep(4200);
      }
    }

    console.log(`\n=== BATCH RUN COMPLETED ===`);
    console.log(`Successfully generated and updated: ${successCount} products (across 10 branches)`);
    console.log(`Failed to process: ${failCount} products`);

  } catch (err) {
    console.error("Main execution failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
