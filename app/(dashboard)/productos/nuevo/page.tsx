import { getActiveBranch } from "@/app/actions/auth";
import { createProduct } from "@/app/actions/product";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Image as ImageIcon } from 'lucide-react';
import ProductFormClient from "./ProductFormClient";
import { getTenantSuppliers } from "@/app/actions/supplier";

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

  const suppliers = await getTenantSuppliers();
  const allPriceLists = await prisma.priceList.findMany({
    orderBy: { name: 'asc' }
  });

  const priceListsMap = new Map();
  const targetBranchId = branch?.id;
  if (targetBranchId && targetBranchId !== 'GLOBAL') {
    for (const pl of allPriceLists) {
      if (pl.branchId === targetBranchId) {
        priceListsMap.set(pl.name, pl);
      }
    }
  }
  for (const pl of allPriceLists) {
    if (!priceListsMap.has(pl.name)) {
      priceListsMap.set(pl.name, pl);
    }
  }
  const priceLists = Array.from(priceListsMap.values()).sort((a: any, b: any) => a.name.localeCompare(b.name));

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

  // Fetch distinct brands for the current branch
  const brandsData = await prisma.product.findMany({
    where: { 
      branchId: branch?.id,
      NOT: [
        { brand: null },
        { brand: "" }
      ]
    },
    select: { brand: true },
    distinct: ['brand']
  });
  const brands = brandsData
    .map(b => b.brand)
    .filter(Boolean)
    .map(b => b!.trim())
    .filter(b => b !== "")
    .sort();

  const uniqueBrands = Array.from(new Set(brands));

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
        brands={uniqueBrands}
      />
    </div>
  );
}
