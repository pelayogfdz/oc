const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const data = await prisma.inventoryMovement.findMany({ 
    where: { 
      product: { branchId: "SANJUANDEL_ID" },
      NOT: [
        { reason: { startsWith: 'Venta #' } },
        { reason: { startsWith: 'Compra #' } },
        { reason: { startsWith: 'Traspaso salida hacia sucursal' } },
        { reason: { startsWith: 'Recepción de traspaso' } },
        { reason: { startsWith: 'Auditoría' } }
      ]
    }, 
    include: { 
      product: true,
      user: true
    }, 
    take: 50, 
    orderBy: { createdAt: "desc" } 
  });
  console.log(`Found ${data.length} records.`);
  data.forEach(d => console.log(`- ${d.type} | ${d.reason} | ${d.product.name}`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
