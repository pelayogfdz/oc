const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();
async function main() {
  const hash = await bcrypt.hash('Caanma2026!', 10);
  let tenant = await prisma.tenant.findFirst();
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: { name: 'Master Tenant', slug: 'master-tenant', isActive: true }
    });
  }
  const user = await prisma.user.upsert({
    where: { email: 'pelayogfdz@gmail.com' },
    update: { password: hash, role: 'ADMIN', isSuperAdmin: true },
    create: {
      email: 'pelayogfdz@gmail.com',
      name: 'Super Admin Gemini',
      password: hash,
      role: 'ADMIN',
      isSuperAdmin: true,
      tenantId: tenant.id
    }
  });
  console.log("Upserted user:", user.email);
}
main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

