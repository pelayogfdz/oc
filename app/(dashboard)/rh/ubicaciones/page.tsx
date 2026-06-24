import React from 'react'
import { getHrLocations } from '@/app/actions/hr-locations'
import LocationsClient from './LocationsClient'

export const dynamic = 'force-dynamic'

export default async function HrLocationsPage() {
  const locations = await getHrLocations()

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--caanma-primary)', marginBottom: '0.5rem' }}>
        Ubicaciones GPS Extra
      </h1>
      <p style={{ color: 'var(--caanma-text-muted)', marginBottom: '2rem' }}>
        Gestiona ubicaciones adicionales para el registro de asistencia. Estas ubicaciones podrán ser asignadas a los empleados en su perfil para permitirles hacer check-in desde sitios externos.
      </p>

      <LocationsClient initialLocations={locations} />
    </div>
  )
}
