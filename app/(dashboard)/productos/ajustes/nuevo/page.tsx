import Link from 'next/link';
import AdjustmentClient from '../AdjustmentClient';
import { getActiveBranch } from '@/app/actions/auth';
import { prisma } from '@/lib/prisma';

export default async function Nuevo() {
  const branch = await getActiveBranch();
  const products = await prisma.product.findMany({ 
    where: { branchId: branch?.id, isActive: true }, 
    take: 50,
    orderBy: { name: 'asc' } 
  });
  
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem', gap: '1rem' }}>
        <Link href="/productos/ajustes" style={{ textDecoration: 'none', color: 'var(--pulpos-text-muted)', fontSize: '1.25rem' }}>← Volver</Link>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>Ingresar Registro / Ajustes Manuales</h1>
      </div>
      
      <div className="card" style={{ padding: '0', backgroundColor: 'transparent', border: 'none', boxShadow: 'none' }}>
        <AdjustmentClient branchId={branch?.id || ''} initialProducts={products} />
      </div>
    </div>
  );
}
