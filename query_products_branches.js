const { PrismaClient } = require('@prisma/client');

process.env.DATABASE_URL = 'postgresql://neondb_owner:npg_qyaYGzkut09D@ep-withered-glade-anfun696-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const prisma = new PrismaClient();

async function main() {
  try {
    const tenantId = '8b52cbcd-c956-4717-a1bd-02e57386aaa2'; // Active tenant in verify
    const branches = await prisma.branch.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, name: true }
    });
    console.log("Branches:", branches);

    // Let's count products per branch
    for (const b of branches) {
      const count = await prisma.product.count({ where: { branchId: b.id, isActive: true } });
      console.log(`Branch ${b.name} (${b.id}) has ${count} active products.`);
    }

    // Let's find some duplicate SKUs across branches
    const duplicates = await prisma.$queryRaw`
      SELECT sku, COUNT(DISTINCT "branchId") as branch_count
      FROM "Product"
      WHERE "isActive" = true AND sku IS NOT NULL AND sku <> ''
      GROUP BY sku
      HAVING COUNT(DISTINCT "branchId") > 1
      LIMIT 10
    `;
    console.log("Duplicate SKUs across branches:", duplicates);

  } catch (err) {
    console.error("Failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
