import { getSubscriptionData } from '@/app/actions/subscription';
import SubscriptionClient from './SubscriptionClient';

export default async function SubscripcionPage() {
  const data = await getSubscriptionData();

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
      <SubscriptionClient initialData={data} />
    </div>
  );
}
