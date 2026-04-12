import { getAudits } from '@/app/actions/audit';
import AuditListClient from './AuditListClient';

export default async function AuditoriasPage() {
  const audits = await getAudits();
  
  return (
    <div style={{ padding: '2rem' }}>
      <AuditListClient initialAudits={audits} />
    </div>
  );
}
