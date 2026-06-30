import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { getActiveBranch } from "@/app/actions/auth";
import { getTenantSuppliers } from "@/app/actions/supplier";
import Link from 'next/link';
import { ArrowLeft, ShoppingCart } from 'lucide-react';
import EditarPedidoForm from "./EditarPedidoForm";

export const dynamic = 'force-dynamic';

export default async function PurchaseOrderDetailPage({ params }: { params: { id: string } }) {
  const { id } = await params;

  const order = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          product: true
        }
      },
      supplier: true,
      branch: true,
      user: true
    }
  });

  if (!order) {
    notFound();
  }

  const branch = await getActiveBranch();
  const query = branch?.id === 'GLOBAL' ? {} : { branchId: branch?.id || '' };
  
  const products = await prisma.product.findMany({
    where: query,
    select: { id: true, name: true, sku: true, barcode: true, cost: true, imageUrl: true }
  });

  const suppliers = await getTenantSuppliers();

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Link href="/productos/pedidos" style={{ color: 'var(--caanma-text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <ArrowLeft size={18} /> Volver a Pedidos
        </Link>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ShoppingCart size={28} color="var(--caanma-primary)" />
            Detalle de Pedido #{order.id.substring(0, 8).toUpperCase()}
          </h1>
          <p style={{ color: 'var(--caanma-text-muted)', marginTop: '0.25rem' }}>
            Visualiza, edita o cancela este borrador de pedido a proveedor antes de consolidarlo.
          </p>
        </div>
      </div>

      <EditarPedidoForm order={order} products={products} suppliers={suppliers} />
    </div>
  );
}
