import { getAdminDashboardData } from '@/app/actions/admin';
import AdminClient from './AdminClient';

export default async function AdminPage() {
  const data = await getAdminDashboardData();

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <AdminClient initialData={data} />
    </div>
  );
}
