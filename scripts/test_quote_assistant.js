const { parseAndMatchQuoteAssistantAction } = require('../app/actions/quoteAssistant');
const { PrismaClient } = require('@prisma/client');
const { URL } = require('url');

async function testAssistant() {
  const masterUrl = process.env.DATABASE_URL;
  const u = new URL(masterUrl);
  u.pathname = '/neondb_officecity';
  const prisma = new PrismaClient({ datasources: { db: { url: u.toString() } } });

  try {
    const branch = await prisma.branch.findFirst({
      where: { name: { contains: 'QUERETARO', mode: 'insensitive' } }
    }) || await prisma.branch.findFirst();

    console.log('Testing with Branch:', branch?.name, branch?.id);

    // Test Case 1: Customer name + exact/fuzzy products
    const sampleText1 = `Hola buenas tardes, para Industrias Montacargas por favor cotízame:
- 10 cajas de papel bond carta
- 50 plumas bic negra
- 5 calculadoras 8 digitos
- 2 cintas canela
- 1 producto inventado que no existe 999xyz`;

    console.log('\n--- TEST CASE 1: Full quote text with customer and products ---');
    const res1 = await parseAndMatchQuoteAssistantAction({
      text: sampleText1,
      branchId: branch.id
    });

    console.log('Success:', res1.success);
    console.log('Detected Customer:', res1.detectedCustomer);
    console.log(`Total Items Detected: ${res1.items.length}`);
    for (const it of res1.items) {
      console.log(`\nItem: "${it.rawQuery}" | Cantidad: ${it.quantity}`);
      console.log(`  Selected Product: ${it.selectedProduct?.name || 'NINGUNO (LIBRE)'} | SKU: ${it.selectedProduct?.sku || 'N/A'}`);
      console.log(`  Source / Badge: ${it.selectedBadge} (${it.selectedSource})`);
      console.log(`  Assigned Price: $${it.assignedPrice} | Total: $${it.quantity * it.assignedPrice}`);
      console.log(`  Total Suggestions Available: ${it.suggestions.length}`);
      for (const s of it.suggestions) {
        console.log(`    -> [${s.badge}] ${s.product.name} (Stock: ${s.product.stock}, Price: $${s.assignedPrice})`);
      }
    }

  } catch (err) {
    console.error('Test Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

testAssistant();
