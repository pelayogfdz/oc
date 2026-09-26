import Link from 'next/link';
import AdjustmentClient from '../AdjustmentClient';
import { getActiveBranch } from '@/app/actions/auth';
import { prisma } from '@/lib/prisma';
import BackButton from '@/app/components/ui/BackButton';

export default async function Nuevo() {
  const branch = await getActiveBranch();
  if (!branch) return null;

  const tenantBranches = await prisma.branch.findMany({
    where: { tenantId: branch.tenantId, isActive: true },
    select: { id: true, name: true },
    orderBy: { name: 'asc' }
  });
  const tenantBranchIds = tenantBranches.map(b => b.id);

  const products = await prisma.product.findMany({ 
    where: { 
      branchId: branch.id === 'GLOBAL' ? { in: tenantBranchIds } : branch.id, 
      isActive: true 
    }, 
    take: 50,
    orderBy: { name: 'asc' } 
  });
  
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem', gap: '1rem' }}>
        <BackButton fallbackHref="/productos/ajustes" label="Volver" style={{ fontSize: '1.1rem' }} />
        <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>Ingresar Registro / Ajustes Manuales</h1>
      </div>

      
      <div className="card" style={{ padding: '0', backgroundColor: 'transparent', border: 'none', boxShadow: 'none' }}>
        <AdjustmentClient branchId={branch?.id || ''} initialProducts={products} />
      </div>
    </div>
  );
}
