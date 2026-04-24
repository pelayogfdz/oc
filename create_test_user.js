const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();
async function run() {
  const password = await bcrypt.hash('testpass', 10);
  
  // Find tenant
  const tenant = await prisma.tenant.findFirst();
  if(!tenant) return console.log("No tenant");
  
  const user = await prisma.user.create({
    data: {
      name: 'Test Agent',
      email: 'testagent123@example.com',
      password: password,
      role: 'ADMIN',
      tenantId: tenant.id
    }
  });
  console.log("Created user", user.email);
}
run();
