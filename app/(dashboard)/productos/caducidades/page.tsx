import { getActiveBranch } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import { CalendarClock, FileSpreadsheet } from "lucide-react";
import CaducidadesClient from "./CaducidadesClient";
import Link from "next/link";

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
        select: { id: true, name: true, sku: true, barcode: true, imageUrl: true }
      }
    },
    orderBy: { expirationDate: 'asc' }
  });

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}>
            <CalendarClock size={28} color="var(--caanma-primary)" />
            Control de Caducidades
          </h1>
          <p style={{ color: 'var(--caanma-text-muted)', marginTop: '0.25rem' }}>
            Monitorea los lotes de productos perecederos próximos a expirar.
          </p>
        </div>

        <Link 
          href="/reportes/lotes-caducidades"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.6rem 1.1rem',
            backgroundColor: 'var(--caanma-primary)',
            color: 'white',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: 'bold',
            fontSize: '0.9rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
        >
          <FileSpreadsheet size={18} />
          Ver Reporte Completo con Filtros & Excel
        </Link>
      </div>

      <CaducidadesClient initialBatches={batches} />
    </div>
  );
}
