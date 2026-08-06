import { getActiveBranch } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import UsoInsumosClient from "./UsoInsumosClient";

export default async function UsoInsumosPage() {
  const branch = await getActiveBranch();

  if (branch.id === 'GLOBAL') {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--caanma-text)' }}>Selecciona una sucursal</h2>
        <p style={{ color: '#64748b', marginTop: '0.5rem' }}>Debes seleccionar una sucursal específica para poder registrar el uso de insumos.</p>
      </div>
    );
  }

  // Load all products in this branch that are active
  const products = await prisma.product.findMany({
    where: {
      branchId: branch.id,
      isActive: true,
    },
    include: {
      variants: true,
    },
    orderBy: {
      name: 'asc',
    },
  });

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', height: '100%' }}>
      <UsoInsumosClient products={products} branchName={branch.name} />
    </div>
  );
}
