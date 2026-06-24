import { getActiveBranch } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import { CalendarClock } from "lucide-react";
import CaducidadesClient from "./CaducidadesClient";

export const dynamic = 'force-dynamic';

export default async function CaducidadesPage() {
  const branch = await getActiveBranch();
  
  const batches = await prisma.productBatch.findMany({
    where: {
      stock: { gt: 0 },
      expirationDate: { not: null },
      product: branch.id === 'GLOBAL' ? undefined : { branchId: branch.id }
    },
    include: {
      product: {
        select: { id: true, name: true, sku: true, imageUrl: true }
      }
    },
    orderBy: { expirationDate: 'asc' }
  });

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <CalendarClock size={28} color="var(--caanma-primary)" />
          Control de Caducidades
        </h1>
        <p style={{ color: 'var(--caanma-text-muted)', marginTop: '0.25rem' }}>
          Monitorea los lotes de productos perecederos próximos a expirar.
        </p>
      </div>

      <CaducidadesClient initialBatches={batches} />
    </div>
  );
}
