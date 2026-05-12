const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.whatsAppSession.findMany().then(console.log).finally(() => prisma.$disconnect());
