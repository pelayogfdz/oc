import { prisma } from "@/lib/prisma";
import { getSession } from "@/app/actions/auth";
import ReposicionMinimosClient from "./ReposicionMinimosClient";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function ReposicionMinimosPage() {
  const session = await getSession();
  const tenantId = session?.tenantId;

  if (!tenantId) {
    redirect('/login');
  }

  // Get active branches for filters
  const branches = await prisma.branch.findMany({
    where: { tenantId, isActive: true },
    orderBy: { name: 'asc' }
  });

  // Query all active products with minStock configured
  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      isService: false,
      minStock: { gt: 0 },
      branch: { tenantId, isActive: true }
    },
    include: {
      branch: true,
      supplier: true
    },
    orderBy: [{ sku: 'asc' }, { branch: { name: 'asc' } }]
  });

  // Filter to only those whose stock is below or equal to minStock
  const belowMin = products.filter(p => p.stock <= p.minStock);

  // Serialize lists for client component
  const serializedBranches = branches.map(b => ({
    id: b.id,
    name: b.name
  }));

  const serializedData = belowMin.map(p => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    description: p.description,
    stock: p.stock,
    minStock: p.minStock,
    cost: p.cost,
    branch: {
      id: p.branch.id,
      name: p.branch.name
    },
    supplier: p.supplier ? {
      id: p.supplier.id,
      name: p.supplier.name
    } : null
  }));

  return (
    <div style={{ maxWidth: '1300px', margin: '0 auto', fontFamily: 'var(--font-geist-sans)' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>Reposición de Mínimos</h1>
        <p style={{ color: 'var(--caanma-text-muted)' }}>Listado de artículos con stock por debajo del mínimo para reposición inmediata.</p>
      </div>

      <ReposicionMinimosClient 
        branches={serializedBranches}
        products={serializedData}
      />
    </div>
  );
}
