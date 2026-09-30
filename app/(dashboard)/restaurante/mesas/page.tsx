import React from 'react';
import { getRestaurantAreas } from '@/app/actions/restaurantActions';
import { getActiveUser } from '@/app/actions/auth';
import MesasClient from './MesasClient';

export const dynamic = 'force-dynamic';

export default async function MesasPage() {
  const user = await getActiveUser();
  const res = await getRestaurantAreas();
  const areas = res.success ? (res.areas as any) : [];

  return (
    <MesasClient
      initialAreas={areas}
      currentUserId={user?.id}
      currentUserName={user?.name}
    />
  );
}
