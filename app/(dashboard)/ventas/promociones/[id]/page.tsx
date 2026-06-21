import { prisma } from "@/lib/prisma";
import { getActiveBranch } from "@/app/actions/auth";
import { notFound } from "next/navigation";
import Link from 'next/link';
import EditarPromocionForm from "./EditarPromocionForm";

export default async function EditarPromocionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const branch = await getActiveBranch();
  if (!branch) return null;
  
  if (!id) return notFound();

  // Fetch the promotion to edit
  const promotion = await prisma.promotion.findUnique({
    where: { id }
  });

  if (!promotion) return notFound();

  // Extract selected products from promotion metadata
  let selectedProductIds: string[] = [];
  try {
    if (promotion.metadata) {
      const parsed = JSON.parse(promotion.metadata);
      if (Array.isArray(parsed.targetProducts)) {
        selectedProductIds = parsed.targetProducts;
      }
    }
  } catch (e) {
    console.error("Failed to parse metadata", e);
  }

  // Fetch only the selected products initially
  const products = await prisma.product.findMany({
    where: { 
      id: { in: selectedProductIds }
    },
    select: {
      id: true,
      name: true,
      sku: true,
      brand: true,
      category: true
    },
    orderBy: { name: 'asc' }
  });

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

  // Fetch unique categories and brands
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

  const safePromotion = JSON.parse(JSON.stringify(promotion));
  const safeProducts = JSON.parse(JSON.stringify(products));

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem', gap: '1rem' }}>
        <Link href="/ventas/promociones" style={{ textDecoration: 'none', color: 'var(--pulpos-text-muted)', fontSize: '1.25rem' }}>← Catálogo Promo</Link>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>Editar Regla de Promoción</h1>
      </div>

      <EditarPromocionForm 
        promotion={safePromotion}
        products={safeProducts}
        branchId={branch.id}
        categories={categories}
        brands={brands}
      />
    </div>
  );
}
