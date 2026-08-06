import { prisma } from "@/lib/prisma";
import { getSession } from "@/app/actions/auth";
import MinimosMatrixClient from "./MinimosMatrixClient";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function MinimosPage() {
  const session = await getSession();
  const tenantId = session?.tenantId;

  if (!tenantId) {
    redirect('/login');
  }

  // Get active branches for this tenant
  const branches = await prisma.branch.findMany({
    where: { tenantId, isActive: true },
    orderBy: { name: 'asc' }
  });

  // Get active products for this tenant
  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      branch: { tenantId, isActive: true }
    },
    include: {
      branch: true
    },
    orderBy: [{ sku: 'asc' }, { branch: { name: 'asc' } }]
  });

  // Serialize lists for RSC
  const serializedBranches = branches.map(b => ({
    id: b.id,
    name: b.name
  }));

  const serializedProducts = products.map(p => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    description: p.description,
    stock: p.stock,
    minStock: p.minStock,
    branchId: p.branchId
  }));

  return (
    <div style={{ maxWidth: '1450px', margin: '0 auto', fontFamily: 'var(--font-geist-sans)' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>Mínimos por Artículo</h1>
        <p style={{ color: 'var(--caanma-text-muted)' }}>Matriz centralizada para gestionar el stock mínimo por sucursal.</p>
      </div>

      <MinimosMatrixClient 
        branches={serializedBranches}
        products={serializedProducts}
      />
    </div>
  );
}
