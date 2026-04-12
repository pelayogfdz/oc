const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.product.count({where: {isActive: true}}).then(c=>console.log('Active Products:', c)).catch(console.error).finally(()=>prisma.$disconnect());
