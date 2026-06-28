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

  // Fetch distinct categories for the current branch
  const categoriesData = await prisma.product.findMany({
    where: { 
      branchId: branch?.id,
      NOT: [
        { category: null },
        { category: "" }
      ]
    },
    select: { category: true },
    distinct: ['category']
  });
  const categories = categoriesData
    .map(c => c.category)
    .filter(Boolean)
    .map(c => c!.trim())
    .filter(c => c !== "")
    .sort();

  // Deduplicate case-insensitively just in case
  const uniqueCategories = Array.from(new Set(categories));

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
        categories={uniqueCategories}
      />
    </div>
  );
}
