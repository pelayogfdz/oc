const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function create() {
  const hash = await bcrypt.hash('Caanma2026!', 10);
  
  let tenant = await prisma.tenant.findFirst({ where: { slug: 'master-tenant' } });
  
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        name: 'Administración Global',
        slug: 'master-tenant',
        isActive: true
      }
    });
  }

  const user = await prisma.user.create({
    data: {
      name: 'Super Administrador',
      email: 'pelayogfdz@gmail.com',
      password: hash,
      role: 'ADMIN',
      isSuperAdmin: true,
      tenantId: tenant.id
    }
  });
  console.log('User created:', user.email);
}

create()
  .then(() => process.exit(0))
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
