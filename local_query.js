const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const products = await prisma.product.findMany({ 
    where: { 
      OR: [
        { barcode: { contains: '067401' } },
        { sku: { contains: '067401' } },
        { barcode: { contains: '2738307' } },
        { sku: { contains: '2738307' } }
      ]
    },
    include: { branch: { include: { tenant: true } } }
  });
  console.log("Found products containing parts of the barcode LOCALLY:");
  console.log(products.map(p => ({ id: p.id, name: p.name, sku: p.sku, barcode: p.barcode, stock: p.stock })));
}
main().catch(console.error).finally(() => prisma.$disconnect());
