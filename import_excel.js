const { PrismaClient } = require('./node_modules/@prisma/client');
const xlsx = require('xlsx');

const prisma = new PrismaClient();

async function main() {
  console.log("Cargando archivo Excel en memoria...");
  const filePath = 'C:\\Users\\barca\\Downloads\\PRODUCTOS___ (1).xlsx';
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Leer todo
  const data = xlsx.utils.sheet_to_json(sheet);
  
  // Mapeo dinámico de sucursales según análisis previo
  const branchMap = [
    { name: 'Zona Industrial El Marqués', stockCol: '__EMPTY_19', minCol: '__EMPTY_20' },
    { name: 'Zona Industrial PIQ', stockCol: '__EMPTY_23', minCol: '__EMPTY_24' },
    { name: 'San Juan del Río', stockCol: '__EMPTY_27', minCol: '__EMPTY_28' },
    { name: 'Querétaro Centro (Ezequiel Montes)', stockCol: '__EMPTY_31', minCol: '__EMPTY_32' },
    { name: 'El Mirador', stockCol: '__EMPTY_35', minCol: '__EMPTY_36' },
    { name: 'Zakia', stockCol: '__EMPTY_39', minCol: '__EMPTY_40' },
    { name: 'Sonterra', stockCol: '__EMPTY_43', minCol: '__EMPTY_44' },
    { name: 'Pradera', stockCol: '__EMPTY_47', minCol: '__EMPTY_48' },
    { name: 'Cerrito Colorado', stockCol: '__EMPTY_51', minCol: '__EMPTY_52' },
    { name: 'Almacén Ezequiel', stockCol: '__EMPTY_55', minCol: '__EMPTY_56' },
    { name: 'Almacén Balvanera', stockCol: '__EMPTY_59', minCol: '__EMPTY_60' }
  ];

  console.log("Sincronizando 11 Sucursales Físicas correspondientes...");
  const branchesDb = {};
  for (const b of branchMap) {
    const branch = await prisma.branch.upsert({
      where: { id: b.name.replace(/[^a-zA-Z0-9]/g, '').slice(0,10) + '_ID' }, // Generar ID consistente
      create: {
        id: b.name.replace(/[^a-zA-Z0-9]/g, '').slice(0,10) + '_ID',
        name: b.name,
        location: 'QRO'
      },
      update: {
        name: b.name
      }
    });
    branchesDb[b.name] = branch;
  }
  console.log("✓ 11 Sucursales generadas en Base de Datos");

  let productCount = 0;
  let skuSkipped = 0;

  console.log("Escaneando e Inyectando Productos a múltiples sucursales...");
  for (const row of data) {
    if (!row.__EMPTY || row.__EMPTY === 'Nombre del Producto' || row.__EMPTY.length < 2) continue; // Saltar nulos o cabeceras repetidas

    const name = String(row.__EMPTY);
    let sku = String(row.__EMPTY_9 || '');
    if (!sku || sku.trim() === '') {
        skuSkipped++;
        continue;
    }

    const description = String(row.__EMPTY_4 || '');
    const category = String(row.__EMPTY_5 || 'General');
    const brand = String(row.__EMPTY_6 || 'Genérica');
    const unit = String(row.__EMPTY_7 || 'Pieza');
    const barcode = String(row.__EMPTY_8 || '');

    const price = parseFloat(row.__EMPTY_63) || 0;     // Precio Público
    const wholesalePrice = parseFloat(row.__EMPTY_66) || 0; // Precio Mayoreo
    const cost = parseFloat(row.__EMPTY_71) || 0;

    for (const b of branchMap) {
       const branchObject = branchesDb[b.name];
       
       let stockVal = 0;
       if (row[b.stockCol]) stockVal = parseInt(row[b.stockCol], 10) || 0;
       
       let minStockVal = 0;
       if (row[b.minCol]) minStockVal = parseInt(row[b.minCol], 10) || 0;

       await prisma.product.upsert({
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
           stock: stockVal, // Sobrescribir stock real matriz
           minStock: minStockVal
         }
       });
       productCount++;
    }
  }

  console.log("====================================");
  console.log("MIGRACIÓN MASIVA COMPLETADA CON ÉXITO");
  console.log("====================================");
  console.log("Productos Inyectados/Actualizados globalmente: " + productCount);
  console.log("SKUs ignorados por falta de clave: " + skuSkipped);

}

main().catch(console.error).finally(() => prisma.$disconnect());
