const { PrismaClient } = require('@prisma/client');
const xlsx = require('xlsx');
const crypto = require('crypto');

const prisma = new PrismaClient();

async function main() {
  console.log("Cargando archivo Excel en memoria...");
  const filePath = 'C:\\Users\\barca2\\Downloads\\PRODUCTOS___.xlsx';
  const workbook = xlsx.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(sheet, {header: 1});
  
  const branchMap = [
    { name: 'Zona Industrial El Marqués', stockCol: 19, minCol: 20 },
    { name: 'Zona Industrial PIQ', stockCol: 23, minCol: 24 },
    { name: 'San Juan del Río', stockCol: 27, minCol: 28 },
    { name: 'Querétaro Centro (Ezequiel Montes)', stockCol: 31, minCol: 32 },
    { name: 'El Mirador', stockCol: 35, minCol: 36 },
    { name: 'Zakia', stockCol: 39, minCol: 40 },
    { name: 'Sonterra', stockCol: 43, minCol: 44 },
    { name: 'Pradera', stockCol: 47, minCol: 48 },
    { name: 'Cerrito Colorado', stockCol: 51, minCol: 52 },
    { name: 'Almacén Ezequiel', stockCol: 55, minCol: 56 },
    { name: 'Almacén Balvanera', stockCol: 59, minCol: 60 }
  ];

  console.log("Preparando sucursales y listas de precios...");
  const branchesDb = {};
  for (const b of branchMap) {
    const safeId = b.name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10).toUpperCase() + '_ID';
    const branch = await prisma.branch.upsert({
      where: { id: safeId },
      create: { id: safeId, name: b.name, location: 'QRO' },
      update: { name: b.name }
    });

    const priceListsToCreate = [
      { name: 'Precio Empresas', col: 64 },
      { name: 'Precio Empresas Volumen', col: 65 },
      { name: 'Precio Crown', col: 67 },
      { name: 'Precio T', col: 68 },
      { name: 'Precio Liquidacion o Daño', col: 69 },
      { name: 'Precio Mercado Libre', col: 70 }
    ];

    const listsMap = {};
    for (const pl of priceListsToCreate) {
      let found = await prisma.priceList.findFirst({ where: { branchId: safeId, name: pl.name }});
      if (!found) { found = await prisma.priceList.create({ data: { branchId: safeId, name: pl.name } }); }
      listsMap[pl.name] = { id: found.id, col: pl.col };
    }

    branchesDb[b.name] = { branch, priceLists: listsMap };
  }

  // Fetch exactly what already exists so we don't duplicate (Prisma skipDuplicates checks unique constraints)
  // For Product, unique constraint is @@unique([sku, branchId]).
  
  console.log("Procesando filas de Excel...");
  const newProducts = [];
  const newPrices = [];
  
  for (let i = 3; i < data.length; i++) {
    const row = data[i];
    if (!row || !row[0]) continue;
    
    const name = String(row[0] || '').trim();
    if (name === '' || name === 'Nombre del Producto') continue;

    let sku = String(row[9] || '').trim();
    if (!sku) continue; // skip empty skus

    const description = String(row[4] || '');
    const category = String(row[5] || 'General');
    const brand = String(row[6] || 'Genérica');
    const unit = String(row[7] || 'Pieza');
    const barcode = String(row[8] || '');

    const price = parseFloat(row[63]) || 0;
    const wholesalePrice = parseFloat(row[66]) || 0;
    const cost = parseFloat(row[71]) || 0;

    for (const b of branchMap) {
       const branchObject = branchesDb[b.name].branch;
       const priceListsMap = branchesDb[b.name].priceLists;
       
       const stockVal = parseInt(row[b.stockCol], 10) || 0;
       const minStockVal = parseInt(row[b.minCol], 10) || 0;

       const productId = crypto.randomUUID();

       newProducts.push({
         id: productId,
         sku,
         name,
         description,
         category,
         brand,
         unit,
         barcode: barcode !== '' ? barcode : null,
         price,
         wholesalePrice,
         cost,
         stock: stockVal,
         minStock: minStockVal,
         branchId: branchObject.id
       });

       for (const plName of Object.keys(priceListsMap)) {
           const listMetadata = priceListsMap[plName];
           const listVal = parseFloat(row[listMetadata.col]) || 0;
           if (listVal > 0) {
               newPrices.push({
                   productId: productId,
                   priceListId: listMetadata.id,
                   price: listVal
               });
           }
       }
    }
  }

  console.log(`Listo para insertar ${newProducts.length} productos y ${newPrices.length} precios...`);

  // Insert in chunks of 5000
  async function insertChunks(items, modelName) {
      const chunkSize = 5000;
      for (let i = 0; i < items.length; i += chunkSize) {
          const chunk = items.slice(i, i + chunkSize);
          await prisma[modelName].createMany({
              data: chunk,
              skipDuplicates: true
          });
          process.stdout.write(`\rInsertados ${Math.min(i + chunkSize, items.length)} / ${items.length} en ${modelName}`);
      }
      console.log('');
  }

  await insertChunks(newProducts, 'product');
  await insertChunks(newPrices, 'productPrice');

  console.log("CARGA MASIVA FINALIZADA.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
