import { getActiveBranch } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import NuevaSolicitudClient from './NuevaSolicitudClient';
import { ClipboardPlus } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function NuevaSolicitudPage() {
  const branch = await getActiveBranch();
  
  const products = await prisma.product.findMany({
    where: branch.id === 'GLOBAL' ? {} : { branchId: branch.id },
    select: {
      id: true,
      name: true,
      sku: true,
      stock: true
    }
  });

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <ClipboardPlus size={28} color="var(--pulpos-primary)" />
          Nueva Solicitud de Compra
        </h1>
        <p style={{ color: 'var(--pulpos-text-muted)', marginTop: '0.25rem' }}>
          Agrega productos del catálogo o solicita productos nuevos para que sean comprados.
        </p>
      </div>

      <NuevaSolicitudClient products={products} />
    </div>
  );
}
