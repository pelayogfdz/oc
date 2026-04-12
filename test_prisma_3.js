const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
console.time('findMany');
prisma.product.findMany({
  where: { isActive: true },
  select: { id: true, name: true, sku: true, stock: true }
}).then(res => {
  console.timeEnd('findMany');
  console.log('Got', res.length, 'products. payload size roughly:', JSON.stringify(res).length / 1024 / 1024, 'MB');
}).catch(console.error).finally(()=>prisma.$disconnect());
