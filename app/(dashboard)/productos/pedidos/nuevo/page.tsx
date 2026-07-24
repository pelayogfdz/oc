import { getActiveBranch } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import { ShoppingCart, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import CrearPedidoForm from './CrearPedidoForm';
import { getTenantSuppliers } from "@/app/actions/supplier";

export const dynamic = 'force-dynamic';

export default async function NuevoPedidoPage({ searchParams }: { searchParams: Promise<{ requestId?: string; requestIds?: string }> }) {
  const branch = await getActiveBranch();
  const resolvedSearchParams = await searchParams;
  const requestId = resolvedSearchParams.requestId;
  const requestIds = resolvedSearchParams.requestIds;
  
  // Data for the form
  const query = branch?.id === 'GLOBAL' ? {} : { branchId: branch?.id || '' };
  const products = await prisma.product.findMany({
    where: query,
    include: { variants: true }
  });
  
  const suppliers = await getTenantSuppliers();

  const pendingRequests = await prisma.purchaseRequest.findMany({
    where: { ...query, status: 'PENDING' },
    include: {
      requestedBy: true,
      product: true
    }
  });

  // Load preselected items from searchParams
  let initialItems: any[] = [];
  if (requestId || requestIds) {
    const ids = (requestIds || requestId || '').split(',').filter(Boolean);
    const preselectedRequests = await prisma.purchaseRequest.findMany({
      where: { id: { in: ids } },
      include: { product: true }
    });
    initialItems = preselectedRequests.map(req => {
      if (req.product) {
        return {
          productId: req.product.id,
          name: req.product.name,
          sku: req.product.sku,
          barcode: req.product.barcode,
          quantity: req.quantity,
          cost: req.product.cost,
          requestId: req.id,
          imageUrl: req.product.imageUrl
        };
      }
      return null;
    }).filter(Boolean);
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Link href="/productos/pedidos" style={{ color: 'var(--caanma-text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <ArrowLeft size={18} /> Volver a Pedidos
        </Link>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ShoppingCart size={28} color="var(--caanma-primary)" />
            Crear Pedido a Proveedor
          </h1>
          <p style={{ color: 'var(--caanma-text-muted)', marginTop: '0.25rem' }}>
            Selecciona los productos a solicitar. Puedes usar <strong>Sugeridos</strong> automáticamente según el faltante de Inventario Mínimo.
          </p>
        </div>
      </div>

      <CrearPedidoForm 
        products={products} 
        suppliers={suppliers} 
        pendingRequests={pendingRequests} 
        branchId={branch?.id || ''} 
        initialItems={initialItems}
      />
    </div>
  );
}
