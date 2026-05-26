import { getActiveBranch } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import ProductListClient from './ProductListClient';

export const dynamic = 'force-dynamic';

export default async function ProductosPage() {
  const branch = await getActiveBranch();
  const products = await prisma.product.findMany({
    where: { branchId: branch?.id || '' },
    orderBy: { createdAt: 'desc' },
    take: 50
  });

  const safeProducts = JSON.parse(JSON.stringify(products));

  return (
    <div>
      <ProductListClient initialProducts={safeProducts} branchId={branch?.id || ''} />
    </div>
  );
}
