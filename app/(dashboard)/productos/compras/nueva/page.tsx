import { prisma } from '@/lib/prisma';
import { getActiveBranch } from '@/app/actions/auth';
import PurchaseClient from './PurchaseClient';

export const dynamic = 'force-dynamic';

export default async function NuevaCompraPage() {
  const branch = await getActiveBranch();

  // Load products (need to get cost instead of price)
  const products = await prisma.product.findMany({
    where: { branchId: branch?.id || '', isActive: true },
    take: 50,
    select: {
      id: true,
      name: true,
      sku: true,
      barcode: true,
      cost: true,
      stock: true,
      imageUrl: true,
    }
  });

  const suppliers = await prisma.supplier.findMany({
    where: { branchId: branch?.id || '' },
    select: {
      id: true,
      name: true,
    }
  });

  return (
    <div style={{ height: 'calc(100vh - 40px)', display: 'flex', flexDirection: 'column' }}>
      <PurchaseClient products={products} suppliers={suppliers} branchId={branch?.id || ''} />
    </div>
  );
}
