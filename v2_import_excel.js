const { PrismaClient } = require('@prisma/client');
const xlsx = require('xlsx');

const prisma = new PrismaClient();

async function main() {
  console.log("Cargando archivo Excel en memoria...");
  const filePath = 'C:\\Users\\barca2\\Downloads\\PRODUCTOS___.xlsx';
  
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Leer todo
  const data = xlsx.utils.sheet_to_json(sheet, {header: 1}); // Using header:1 to work with raw array by index
  
  // Headers están en el índice 2 (fila 3)
  const headers = data[2];

  // Mapeo dinámico de sucursales igual que antes
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

  console.log("Sincronizando 11 Sucursales Físicas correspondientes...");
  const branchesDb = {};
  for (const b of branchMap) {
    const safeId = b.name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10).toUpperCase() + '_ID';
    const branch = await prisma.branch.upsert({
      where: { id: safeId },
      create: {
        id: safeId,
        name: b.name,
        location: 'QRO'
      },
      update: {
        name: b.name
      }
    });

    // Mapear listas de precios extra
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
      // Find or create this exact price list by name and branchId
      const listRecord = await prisma.$transaction(async (tx) => {
          let found = await tx.priceList.findFirst({
              where: { branchId: safeId, name: pl.name }
          });
          if (!found) {
              found = await tx.priceList.create({
                  data: { branchId: safeId, name: pl.name }
              });
          }
          return found;
      });
      listsMap[pl.name] = { id: listRecord.id, col: pl.col };
    }

    branchesDb[b.name] = {
        branch: branch,
        priceLists: listsMap
    };
  }
  console.log("✓ 11 Sucursales y sus listas de precios generadas en Base de Datos");

  let productCount = 0;
  let skuSkipped = 0;

  console.log("Escaneando e Inyectando Productos a múltiples sucursales...");
  // Los datos empiezan en el índice 3
  for (let i = 3; i < data.length; i++) {
    const row = data[i];
    if (!row || !row[0]) continue; // Skip empty names
    
    const name = String(row[0] || '').trim();
    if (name === '' || name === 'Nombre del Producto') continue;

    let sku = String(row[9] || '').trim();
    if (!sku) {
        skuSkipped++;
        continue;
    }

    const description = String(row[4] || '');
    const category = String(row[5] || 'General');
    const brand = String(row[6] || 'Genérica');
    const unit = String(row[7] || 'Pieza');
    const barcode = String(row[8] || '');

    const price = parseFloat(row[63]) || 0;     // Precio Público
    const wholesalePrice = parseFloat(row[66]) || 0; // Precio Mayoreo
    const cost = parseFloat(row[71]) || 0;

    for (const b of branchMap) {
       const branchObject = branchesDb[b.name].branch;
       const priceListsMap = branchesDb[b.name].priceLists;
       
       const stockVal = parseInt(row[b.stockCol], 10) || 0;
       const minStockVal = parseInt(row[b.minCol], 10) || 0;

       const product = await prisma.product.upsert({
         where: {
           sku_branchId: {
             sku: sku,
             branchId: branchObject.id
           }
         },
         create: {
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
         },
         update: {
           name,
           price,
           wholesalePrice,
           cost,
           stock: stockVal,
           minStock: minStockVal
         }
       });

       // Now loop over the additional price lists and upsert ProductPrice
       for (const plName of Object.keys(priceListsMap)) {
           const listMetadata = priceListsMap[plName];
           const listVal = parseFloat(row[listMetadata.col]) || 0;
           if (listVal > 0) {
               await prisma.productPrice.upsert({
                   where: {
                       productId_priceListId: {
                           productId: product.id,
                           priceListId: listMetadata.id
                       }
                   },
                   create: {
                       productId: product.id,
                       priceListId: listMetadata.id,
                       price: listVal
                   },
                   update: {
                       price: listVal
                   }
               });
           }
       }

       productCount++;
    }
  }

  console.log("====================================");
  console.log("MIGRACIÓN MASIVA VERSIÓN 2 COMPLETADA CON ÉXITO");
  console.log("====================================");
  console.log("Registros de sucursales-producto procesados: " + productCount);
  console.log("SKUs ignorados por falta de clave: " + skuSkipped);

}

main().catch(console.error).finally(() => prisma.$disconnect());
