import { getActiveBranch } from "@/app/actions/auth";
import { createProduct } from "@/app/actions/product";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Image as ImageIcon } from 'lucide-react';
import ProductFormClient from "./ProductFormClient";

export default async function NuevoProductoPage({ searchParams }: { searchParams: { cloneId?: string } }) {
  const branch = await getActiveBranch();
  const searchP = await searchParams;
  const cloneId = searchP?.cloneId;
  
  let cloneProduct = null;
  if (cloneId) {
    cloneProduct = await prisma.product.findUnique({ 
      where: { id: cloneId },
      include: { prices: true } 
    });
  }

  const suppliers = await prisma.supplier.findMany({
    orderBy: { name: 'asc' }
  });
  const priceLists = await prisma.priceList.findMany({
    where: { branchId: branch?.id }
  });

  // Fetch distinct categories for this tenant's branches
  const categoriesData = await prisma.product.findMany({
    where: { 
      branch: { tenantId: branch?.tenantId },
      isActive: true,
      category: { not: null }
    },
    select: { category: true },
    distinct: ['category']
  });
  const categories = categoriesData
    .map(c => c.category?.trim())
    .filter(Boolean) as string[];

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem', gap: '1rem' }}>
        <Link href="/productos" style={{ textDecoration: 'none', color: 'var(--caanma-text-muted)', fontSize: '1.25rem' }}>← Volver</Link>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>{cloneProduct ? `Clonar: ${cloneProduct.name}` : 'Crear Nuevo Producto'}</h1>
      </div>

      <ProductFormClient 
        cloneProduct={cloneProduct} 
        suppliers={suppliers} 
        priceLists={priceLists} 
        branchId={branch?.id} 
        tenantId={branch?.tenantId}
        categories={categories}
      />
    </div>
  );
}
