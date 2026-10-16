import { getAuditCoverageReport } from '@/app/actions/audit';
import { getActiveBranch } from '@/app/actions/auth';
import AuditoriaInventarioReportClient from './AuditoriaInventarioReportClient';

export const dynamic = 'force-dynamic';

export default async function AuditoriaInventarioReportPage() {
  const branch = await getActiveBranch();
  if (!branch) return null;

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 30);

  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];
  const initialBranchId = branch.id === 'GLOBAL' ? 'ALL' : branch.id;

  const data = await getAuditCoverageReport(startDateStr, endDateStr, initialBranchId);
  const safeData = JSON.parse(JSON.stringify(data));

  return (
    <AuditoriaInventarioReportClient
      initialData={safeData}
      initialStartDate={startDateStr}
      initialEndDate={endDateStr}
      initialBranchId={initialBranchId}
    />
  );
}
