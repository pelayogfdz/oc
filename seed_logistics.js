const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst();
  console.log('Using user:', user.email);

  const sale1 = await prisma.sale.findFirst();

  if (!sale1) {
    console.log('No sales found for this tenant. Exiting.');
    return;
  }

  console.log('Found sale:', sale1.id);

  // Check if delivery order already exists
  const existing = await prisma.deliveryOrder.findUnique({
    where: { saleId: sale1.id }
  });

  if (!existing) {
    console.log('Creating DeliveryOrder for sale:', sale1.id);
    const order = await prisma.deliveryOrder.create({
      data: {
        saleId: sale1.id,
        branchId: sale1.branchId,
        street: 'Av. Siempre Viva',
        exteriorNumber: '742',
        neighborhood: 'Springfield',
        city: 'Queretaro',
        state: 'Qro',
        zipCode: '76000',
        notes: 'Llamar antes de entregar. Paquete frágil.',
        status: 'PENDING',
      }
    });
    console.log('Created:', order);
  } else {
    console.log('DeliveryOrder already exists:', existing);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
