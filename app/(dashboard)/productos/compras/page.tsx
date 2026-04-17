import { prisma } from '@/lib/prisma';
import { getActiveBranch } from '@/app/actions/auth';
import Link from 'next/link';
import { PlusCircle, ShoppingCart, AlertCircle, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { getBranchFilter } from '@/lib/utils';
import ComprasTabsClient from './ComprasTabsClient';

export default async function ComprasPage() {
  const branch = await getActiveBranch();

  const purchases = await prisma.purchase.findMany({
    where: getBranchFilter(branch),
    include: {
      supplier: true,
      user: true,
      _count: {
        select: { items: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  const purchaseRequests = await prisma.purchaseRequest.findMany({
    where: { branchId: branch?.id || '' },
    include: {
      product: true,
      requestedBy: true,
      transfer: {
        include: { toBranch: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>Historial de Compras y Solicitudes</h1>
          <p style={{ color: 'var(--pulpos-text-muted)' }}>Registro de abastecimiento de inventario</p>
        </div>
        <Link href="/productos/compras/nueva" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
          <PlusCircle size={20} />
          Registrar Compra
        </Link>
      </div>

      <ComprasTabsClient purchases={purchases} purchaseRequests={purchaseRequests} />

    </div>
  );
}
