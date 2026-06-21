import { prisma } from "@/lib/prisma";
import { getActiveBranch } from "@/app/actions/auth";
import Link from 'next/link';
import CrearPromocionForm from "./CrearPromocionForm";

export default async function NuevoPromocion() {
  const branch = await getActiveBranch();
  if (!branch) return null;
  
  const isGlobal = branch.id === 'GLOBAL';
  let branchCondition: any;
  if (isGlobal) {
    const activeBranches = await prisma.branch.findMany({
      where: { tenantId: branch.tenantId, isActive: true },
      select: { id: true }
    });
    branchCondition = { in: activeBranches.map(b => b.id) };
  } else {
    branchCondition = branch.id;
  }

  // Extract unique categories and brands that are not null or empty
  const categoriesRaw = await prisma.product.findMany({
    where: { branchId: branchCondition, category: { not: null, notIn: [""] } },
    select: { category: true },
    distinct: ['category']
  });

  const brandsRaw = await prisma.product.findMany({
    where: { branchId: branchCondition, brand: { not: null, notIn: [""] } },
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
        products={[]}
        branchId={branch.id}
        categories={categories}
        brands={brands}
      />
    </div>
  );
}
