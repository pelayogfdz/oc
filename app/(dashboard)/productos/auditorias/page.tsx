import { getAudits } from '@/app/actions/audit';
import { getActiveBranch } from '@/app/actions/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import AuditListClient from './AuditListClient';

export default async function AuditoriasPage() {
  const branch = await getActiveBranch();
  if (!branch) redirect('/login');

  const tenantBranches = await prisma.branch.findMany({
    where: { tenantId: branch.tenantId, isActive: true },
    select: { id: true, name: true },
    orderBy: { name: 'asc' }
  });

  const audits = await getAudits();
  
  return (
    <div style={{ padding: '2rem' }}>
      <AuditListClient 
        initialAudits={audits} 
        branches={tenantBranches} 
        currentBranchId={branch.id} 
      />
    </div>
  );
}
