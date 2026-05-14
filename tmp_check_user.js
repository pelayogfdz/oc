const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({where:{email:'pelayof@tdq.com.mx'}});
  console.log('Role:', user.role);
  console.log('Permissions:', user.permissions);
  const activeBranches = await prisma.branch.findMany({where:{isActive:true}});
  console.log('Active branches:', activeBranches.map(b => b.name));
}

main().finally(() => prisma.$disconnect());
