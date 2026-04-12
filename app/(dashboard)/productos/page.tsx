import { getActiveBranch } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import Link from 'next/link';
import { Image as ImageIcon, MoreVertical, Filter, Plus } from 'lucide-react';
import ExportButton from './ExportButton';
import ImportButton from './ImportButton';
import ProductListClient from './ProductListClient';

export const dynamic = 'force-dynamic';

export default async function ProductosPage() {
  const branch = await getActiveBranch();
  const products = await prisma.product.findMany({
    where: { branchId: branch?.id || '' },
    orderBy: { createdAt: 'desc' },
    take: 50
  });

  return (
    <div>
      {/* Header section identical to Pulpos */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Productos e Inventario</h1>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <ImportButton />
          <ExportButton products={products} />
          <Link href="/productos/nuevo" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', padding: '0.5rem 1.5rem' }}>
            <Plus size={18} /> Nuevo Producto
          </Link>
        </div>
      </div>

      <ProductListClient initialProducts={products} branchId={branch?.id || ''} />
    </div>
  );
}
