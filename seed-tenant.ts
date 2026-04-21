import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Master Tenant...');

  // 1. Create or Find default Tenant
  let masterTenant = await prisma.tenant.findFirst({
    where: { slug: 'master-tenant' }
  });

  if (!masterTenant) {
    masterTenant = await prisma.tenant.create({
      data: {
        name: 'Empresa Demo (SaaS Master)',
        slug: 'master-tenant',
        isActive: true
      }
    });
    console.log('Master Tenant created:', masterTenant.id);
  } else {
    console.log('Master Tenant already exists:', masterTenant.id);
  }

  // 2. Map all existing users to this tenant
  const userResult = await prisma.user.updateMany({
    where: { tenantId: null },
    data: { tenantId: masterTenant.id }
  });
  console.log(`Mapped ${userResult.count} users successfully to master tenant.`);

  // 3. Map all existing branches to this tenant
  const branchResult = await prisma.branch.updateMany({
    where: { tenantId: null },
    data: { tenantId: masterTenant.id }
  });
  console.log(`Mapped ${branchResult.count} branches successfully to master tenant.`);

}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
