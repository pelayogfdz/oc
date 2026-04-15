import { getActiveBranch } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import { FileText, Plus } from 'lucide-react';
import Link from 'next/link';
import AdjustmentHistoryClient from './AdjustmentHistoryClient';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const branch = await getActiveBranch();
  
  if (!branch) {
    return <div>No branch active.</div>;
  }

  // Fetch only adjustments (including backwards compatibility for older adjustments saved as IN/OUT)
  // Fetch only adjustments
  const docs = await prisma.inventoryAdjustmentDoc.findMany({ 
    where: { branchId: branch.id },
    include: { 
      user: true,
      movements: {
        include: {
          product: true
        }
      }
    }, 
    take: 50, 
    orderBy: { createdAt: "desc" } 
  });

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '0 0 0.5rem 0' }}>
            <FileText size={28} color="#2563eb" />
            Bitácora de Ajustes Manuales - {branch.name}
          </h1>
          <p style={{ color: 'var(--pulpos-text-muted)', margin: 0 }}>
            Historial de alteraciones de stock hechas directamente o mediante conteos.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Link href="/productos/auditorias" className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', backgroundColor: 'white' }}>
            Ir a Auditorías (Físico)
          </Link>
          <Link href="/productos/ajustes/nuevo" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
            <Plus size={18} /> Forzar Ajuste Directo
          </Link>
        </div>
      </div>

      <AdjustmentHistoryClient data={docs} />
    </div>
  );
}
