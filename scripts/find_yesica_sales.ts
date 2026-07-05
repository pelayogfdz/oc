/**
 * Quick diagnostic: Find ALL sales by Yesica across all branches
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const yesicaUsers = await prisma.user.findMany({
    where: { name: { contains: 'YESICA', mode: 'insensitive' } },
    select: { id: true, name: true }
  });
  
  if (yesicaUsers.length === 0) {
    console.log('No user found');
    return;
  }

  const yesica = yesicaUsers[0];
  console.log(`User: ${yesica.name} (${yesica.id})\n`);

  const sales = await prisma.sale.findMany({
    where: { userId: yesica.id },
    include: {
      branch: { select: { id: true, name: true } },
      items: { select: { id: true, quantity: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: 50
  });

  console.log(`Total sales: ${sales.length}\n`);
  
  const byBranch: Record<string, number> = {};
  for (const s of sales) {
    const bName = s.branch?.name || 'Sin sucursal';
    byBranch[bName] = (byBranch[bName] || 0) + 1;
    const itemCount = s.items.reduce((sum, i) => sum + i.quantity, 0);
    console.log(`  ${s.folio || s.id.slice(0,8)} | ${new Date(s.createdAt).toLocaleDateString('es-MX')} | $${s.total} | ${itemCount} pzas | Branch: ${bName} (${s.branchId})`);
  }

  console.log(`\nResumen por sucursal:`);
  for (const [name, count] of Object.entries(byBranch)) {
    console.log(`  ${name}: ${count} ventas`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
