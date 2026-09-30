import React from 'react';
import { getKitchenOrders, getKitchenStations } from '@/app/actions/restaurantActions';
import KDSClient from './KDSClient';

export const dynamic = 'force-dynamic';

export default async function KDSPage() {
  const [ordersRes, stationsRes] = await Promise.all([
    getKitchenOrders('ALL'),
    getKitchenStations()
  ]);

  const orders = ordersRes.success ? (ordersRes.orders as any) : [];
  const stations = stationsRes.success ? (stationsRes.stations as any) : [];

  return (
    <KDSClient
      initialOrders={orders}
      stations={stations}
    />
  );
}
