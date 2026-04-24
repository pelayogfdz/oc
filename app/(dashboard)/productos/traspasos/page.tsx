import { getActiveBranch } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import * as Icons from 'lucide-react';
import { FileText, Plus, Trash2, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { deleteEntity } from '@/app/actions/crud';
import DashboardMatrix from './DashboardMatrix';
import TraspasosClient from './TraspasosClient';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const branch = await getActiveBranch();
  const whereClause = branch.id === 'GLOBAL' ? {} : { 
    OR: [
      { branchId: branch.id },
      { toBranchId: branch.id }
    ]
  };

  const data = await prisma.transfer.findMany({ 
    where: whereClause,
    include: { toBranch: true, branch: true, createdBy: true, receivedBy: true },
    orderBy: { createdAt: 'desc' }
  });
  const SpecificIcon = (Icons as any)['Truck'] || Icons.Box;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <SpecificIcon size={28} color="var(--pulpos-primary)" />
            Traspasos de Inventario
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Link href="/productos/traspasos/solicitar" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', color: '#334155', padding: '0.5rem 1rem', borderRadius: '4px', textDecoration: 'none', fontWeight: 'bold' }}>
            Solicitar Traspaso
          </Link>
          <Link href="/productos/traspasos/salida" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--pulpos-primary)', borderColor: 'var(--pulpos-primary)', color: 'white', textDecoration: 'none' }}>
            <ArrowRight size={18} /> Enviar Traspaso Directo
          </Link>
        </div>
      </div>

      <DashboardMatrix activeBranch={branch} />

      <TraspasosClient initialTransfers={data} currentBranchId={branch.id} />
    </div>
  );
}
