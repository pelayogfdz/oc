import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { getTableDetails, getMenuProducts } from '@/app/actions/restaurantActions';
import { getActiveUser } from '@/app/actions/auth';
import ComandaClient from './ComandaClient';

export const dynamic = 'force-dynamic';

export default async function ComandaPage({
  params
}: {
  params: Promise<{ tableId: string }>;
}) {
  const { tableId } = await params;
  const user = await getActiveUser();

  const [tableRes, menuRes] = await Promise.all([
    getTableDetails(tableId),
    getMenuProducts()
  ]);

  if (!tableRes.success || !tableRes.table) {
    notFound();
  }

  // Si no hay comanda activa, redirigir a mesas
  if (!tableRes.activeOrder) {
    redirect('/restaurante/mesas');
  }

  return (
    <ComandaClient
      table={tableRes.table}
      activeOrder={tableRes.activeOrder}
      products={(menuRes.products as any) || []}
      categories={menuRes.categories || []}
      currentUserId={user?.id}
    />
  );
}
