const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('CaanmaTest123!', 10);
  
  // Find first active branch and tenant
  const tenant = await prisma.tenant.findFirst();
  const branch = await prisma.branch.findFirst();
  
  if (!tenant || !branch) {
    console.error("Error: No tenant or branch found in the database. Ensure the database is seeded.");
    process.exit(1);
  }
  
  // Check if test user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: 'testagent@caanma.com' }
  });
  
  if (existingUser) {
    console.log("Test user already exists:", existingUser.email);
    return;
  }
  
  const user = await prisma.user.create({
    data: {
      email: 'testagent@caanma.com',
      name: 'Agent Test',
      password: hashedPassword,
      role: 'ADMIN',
      branch: { connect: { id: branch.id } },
      tenant: { connect: { id: tenant.id } },
      initialVacationDays: 12,
      vacationStartDate: new Date(),
      hireDate: new Date(),
      phone: '1234567890',
    }
  });
  console.log("SUCCESS: Created test user:", user.email);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
