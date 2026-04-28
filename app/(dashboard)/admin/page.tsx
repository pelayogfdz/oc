import { getAdminDashboardData } from '@/app/actions/admin';
import AdminClient from './AdminClient';
import { redirect } from 'next/navigation';

export default async function AdminPage() {
  let data;
  try {
    data = await getAdminDashboardData();
  } catch (error) {
    redirect('/');
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <AdminClient initialData={data} />
    </div>
  );
}
