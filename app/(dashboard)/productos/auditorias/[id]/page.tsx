import { prisma } from '@/lib/prisma';
import AuditDetailClient from './AuditDetailClient';
import { getActiveBranch } from '@/app/actions/auth';
import { redirect } from 'next/navigation';

export default async function AuditDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const branch = await getActiveBranch();
  if (!branch) redirect('/login');

  const audit = await prisma.inventoryAudit.findUnique({
    where: { id: id, branchId: branch.id },
    include: {
      items: {
        include: { product: true }
      }
    }
  });

  if (!audit) redirect('/productos/auditorias');

  const products = await prisma.product.findMany({
    where: { branchId: branch.id, isActive: true },
    select: { id: true, name: true, sku: true, stock: true }
  });

  return (
    <div style={{ padding: '2rem' }}>
      <AuditDetailClient audit={audit} products={products} />
    </div>
  );
}
