import Link from 'next/link';
import AdjustmentClient from '../AdjustmentClient';
import { getActiveBranch } from '@/app/actions/auth';
import { prisma } from '@/lib/prisma';

export default async function Nuevo() {
  const branch = await getActiveBranch();
  
  if (branch?.id === 'GLOBAL') {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: '#fee2e2', borderRadius: '12px', color: '#991b1b', border: '1px solid #f87171', margin: '2rem auto', maxWidth: '600px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>VISTA GLOBAL ACTIVA</h2>
        <p>No se pueden crear ajustes manuales en modo "Todas las Sucursales".<br/>Por favor, selecciona una sucursal específica en el selector de arriba para registrar un ajuste en su inventario.</p>
      </div>
    );
  }
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
