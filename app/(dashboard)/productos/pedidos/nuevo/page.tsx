import { getActiveBranch } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import { ShoppingCart, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import CrearPedidoForm from './CrearPedidoForm';

export const dynamic = 'force-dynamic';

export default async function NuevoPedidoPage() {
  const branch = await getActiveBranch();
  
  // Data for the form
  const query = branch.id === 'GLOBAL' ? {} : { branchId: branch.id };
  const products = await prisma.product.findMany({
    where: query,
    select: { id: true, name: true, stock: true, minStock: true, cost: true }
  });
  
  const suppliers = await prisma.supplier.findMany({
    where: query
  });

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Link href="/productos/pedidos" style={{ color: 'var(--pulpos-text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <ArrowLeft size={18} /> Volver a Pedidos
        </Link>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ShoppingCart size={28} color="var(--pulpos-primary)" />
            Crear Pedido a Proveedor
          </h1>
          <p style={{ color: 'var(--pulpos-text-muted)', marginTop: '0.25rem' }}>
            Selecciona los productos a solicitar. Puedes usar <strong>Sugeridos</strong> automáticamente según el faltante de Inventario Mínimo.
          </p>
        </div>
      </div>

      <CrearPedidoForm products={products} suppliers={suppliers} />
    </div>
  );
}
