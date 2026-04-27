import { getActiveBranch } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import { ClipboardList, Plus } from 'lucide-react';
import Link from 'next/link';
import SolicitudesClient from './SolicitudesClient';

export const dynamic = 'force-dynamic';

export default async function SolicitudesPage() {
  const branch = await getActiveBranch();
  
  const requests = await prisma.purchaseRequest.findMany({
    where: branch.id === 'GLOBAL' ? {} : { branchId: branch.id },
    include: {
      requestedBy: true,
      product: true,
      branch: true
    },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ClipboardList size={28} color="var(--pulpos-primary)" />
            Solicitudes
          </h1>
          <p style={{ color: 'var(--pulpos-text-muted)', marginTop: '0.25rem' }}>
            Lista de productos solicitados por los ejecutivos de ventas para compras.
          </p>
        </div>
        <Link href="/productos/solicitudes/nueva" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--pulpos-primary)', borderColor: 'var(--pulpos-primary)', color: 'white', textDecoration: 'none' }}>
          <Plus size={18} /> Nueva Solicitud
        </Link>
      </div>

      <SolicitudesClient initialRequests={requests} />
    </div>
  );
}
