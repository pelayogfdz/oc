const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testNuevaVenta() {
  try {
    const user = await prisma.user.findFirst({
      where: { email: 'pelayof@tdq.com.mx' },
      include: { tenant: true }
    });
    console.log('User:', user?.email, 'BranchId:', user?.branchId, 'TenantId:', user?.tenantId);

    const branch = await prisma.branch.findUnique({
      where: { id: user.branchId }
    });
    console.log('Branch:', branch?.name);

    const branchId = branch?.id || '';
    const tenantId = user.tenantId || branch?.tenantId || '';

    const tenantBranches = await prisma.branch.findMany({
      where: { tenantId, isActive: true },
      select: { id: true }
    });
    console.log('Tenant Branches:', tenantBranches.length);

    const [
      products,
      customers,
      promotions,
      allPriceLists,
      pendingQuotes,
      settings,
      drivers
    ] = await Promise.all([
      prisma.product.findMany({
        where: { branchId, isActive: true },
        include: { variants: true, prices: true },
        orderBy: { name: 'asc' },
        take: 50
      }),
      prisma.customer.findMany({
        orderBy: { name: 'asc' },
        take: 500
      }),
      prisma.promotion.findMany({
        where: { branchId, active: true }
      }),
      prisma.priceList.findMany({
        orderBy: { name: 'asc' }
      }),
      prisma.quote.findMany({
        where: { branchId, status: 'PENDING' },
        include: { customer: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 30
      }),
      prisma.branchSettings.findFirst({ where: { branchId } }),
      prisma.user.findMany({
        where: {
          tenantId: user.tenantId,
          branchId: branchId && branchId !== 'GLOBAL' ? branchId : undefined
        },
        select: { id: true, name: true, role: true },
        orderBy: { name: 'asc' }
      })
    ]);

    console.log('Data loaded successfully:');
    console.log('- Products:', products.length);
    console.log('- Customers:', customers.length);
    console.log('- Promotions:', promotions.length);
    console.log('- PriceLists:', allPriceLists.length);
    console.log('- Quotes:', pendingQuotes.length);
    console.log('- Settings:', !!settings);
    console.log('- Drivers:', drivers.length);

    // Test JSON Serialization (what Next.js RSC does)
    const payload = {
      products,
      customers,
      promotions,
      allPriceLists,
      pendingQuotes,
      settings,
      drivers
    };

    JSON.stringify(payload);
    console.log('JSON serialization passed!');

  } catch (err) {
    console.error('CRASH IN NUEVA VENTA TEST:', err);
  } finally {
    await prisma.$disconnect();
  }
}

testNuevaVenta();
