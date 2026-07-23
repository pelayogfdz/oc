import { getActiveBranch } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import { ArrowLeft, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import CrearCompraForm from './CrearCompraForm';

export const dynamic = 'force-dynamic';

export default async function NuevaCompraPage() {
  const branch = await getActiveBranch();
  
  if (branch?.id === 'GLOBAL') {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: '#fee2e2', borderRadius: '12px', color: '#991b1b', border: '1px solid #f87171', margin: '2rem auto', maxWidth: '600px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>VISTA GLOBAL ACTIVA</h2>
        <p>No se pueden registrar compras en modo "Todas las Sucursales".<br/>Por favor, selecciona una sucursal específica en el selector de arriba para registrar la compra de mercancía.</p>
      </div>
    );
  }
  
  const query = { branchId: branch.id };
  const products = await prisma.product.findMany({
    where: query,
    select: { id: true, name: true, stock: true, cost: true }
  });
  
  const suppliers = await prisma.supplier.findMany({
    where: query
  });

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Link href="/productos/compras" style={{ color: 'var(--pulpos-text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <ArrowLeft size={18} /> Volver a Historial de Compras
        </Link>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ShoppingBag size={28} color="var(--pulpos-primary)" />
            Registrar Compra Directa
          </h1>
          <p style={{ color: 'var(--pulpos-text-muted)', marginTop: '0.25rem' }}>
            Ingresa mercancía a tu inventario con o sin proveedor registrado.
          </p>
        </div>
      </div>

      <CrearCompraForm products={products} suppliers={suppliers} branchId={branch.id} />
    </div>
  );
}
