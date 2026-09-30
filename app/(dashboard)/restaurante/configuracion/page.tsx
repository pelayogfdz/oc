import React from 'react';
import { getRestaurantAreas, getKitchenStations } from '@/app/actions/restaurantActions';
import ConfiguracionClient from './ConfiguracionClient';

export const dynamic = 'force-dynamic';

export default async function ConfiguracionPage() {
  const [areasRes, stationsRes] = await Promise.all([
    getRestaurantAreas(),
    getKitchenStations()
  ]);

  const areas = areasRes.success ? (areasRes.areas as any) : [];
  const stations = stationsRes.success ? (stationsRes.stations as any) : [];

  return (
    <ConfiguracionClient
      areas={areas}
      stations={stations}
    />
  );
}
