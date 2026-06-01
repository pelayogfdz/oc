const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tenantId = 'db5d3949-f8dd-41f6-9627-90374d55d044';
  
  console.log("=== PETQRO DATABASE MAPPING ===");

  // 1. Fetch Users
  const users = await prisma.user.findMany({
    where: { tenantId }
  });
  console.log(`\nUsers found (${users.length}):`);
  users.forEach(u => {
    console.log(`- ID: ${u.id}, Name: ${u.name}, Email: ${u.email}, Role: ${u.role}`);
  });

  // 2. Fetch Customers
  const petqroBranchIds = ['2e215b8c-b9e3-444f-adc3-c4387a684e05', 'PETQROCERRITO_ID'];
  const customers = await prisma.customer.findMany({
    where: { branchId: { in: petqroBranchIds } },
    take: 10
  });
  const customerCount = await prisma.customer.count({
    where: { branchId: { in: petqroBranchIds } }
  });
  console.log(`\nCustomers found (Sample first 10, Total: ${customerCount}):`);
  customers.forEach(c => {
    console.log(`- ID: ${c.id}, Name: ${c.name}, Email: ${c.email || 'N/A'}, Phone: ${c.phone || 'N/A'}`);
  });

  // 3. Fetch Products
  const productCount = await prisma.product.count({
    where: { branch: { tenantId } }
  });
  const sampleProducts = await prisma.product.findMany({
    where: { branch: { tenantId } },
    select: { id: true, sku: true, name: true, brand: true, branchId: true },
    take: 10
  });
  console.log(`\nProducts found (Sample first 10, Total in all branches: ${productCount}):`);
  sampleProducts.forEach(p => {
    console.log(`- ID: ${p.id}, SKU: ${p.sku}, Name: ${p.name}, Brand: ${p.brand || 'N/A'}, BranchId: ${p.branchId}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
