import { prisma } from '@/lib/prisma';
import { getActiveBranch } from '@/app/actions/auth';
import PurchaseClient from './PurchaseClient';

export const dynamic = 'force-dynamic';

export default async function NuevaCompraPage() {
  const branch = await getActiveBranch();
  
  if (branch?.id === 'GLOBAL') {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: '#fee2e2', borderRadius: '12px', color: '#991b1b', border: '1px solid #f87171', margin: '2rem auto', maxWidth: '600px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>VISTA GLOBAL ACTIVA</h2>
        <p>No se pueden registrar compras en modo "Todas las Sucursales".<br/>Por favor, selecciona una sucursal específica en el selector de arriba para la cual registrar la entrada de la mercancía.</p>
      </div>
    );
  }

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
