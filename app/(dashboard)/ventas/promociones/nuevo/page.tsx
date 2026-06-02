import { prisma } from "@/lib/prisma";
import { getActiveBranch } from "@/app/actions/auth";
import Link from 'next/link';
import CrearPromocionForm from "./CrearPromocionForm";

export default async function NuevoPromocion() {
  const branch = await getActiveBranch();
  
  // Fetch active products in this branch
  const products = await prisma.product.findMany({
    where: { branchId: branch.id, isActive: true },
    select: {
      id: true,
      name: true,
      sku: true,
      brand: true,
      category: true
    },
    orderBy: { name: 'asc' }
  });

  // Extract unique categories and brands that are not null or empty
  const categoriesRaw = await prisma.product.findMany({
    where: { branchId: branch.id, category: { not: null, notIn: [""] } },
    select: { category: true },
    distinct: ['category']
  });

  const brandsRaw = await prisma.product.findMany({
    where: { branchId: branch.id, brand: { not: null, notIn: [""] } },
    select: { brand: true },
    distinct: ['brand']
  });

  const categories = categoriesRaw.map(c => c.category as string).filter(Boolean);
  const brands = brandsRaw.map(b => b.brand as string).filter(Boolean);

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem', gap: '1rem' }}>
        <Link href="/ventas/promociones" style={{ textDecoration: 'none', color: 'var(--pulpos-text-muted)', fontSize: '1.25rem' }}>← Catálogo Promo</Link>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>Crear Regla de Promoción</h1>
      </div>

      <CrearPromocionForm 
        products={products}
        categories={categories}
        brands={brands}
      />
    </div>
  );
}
