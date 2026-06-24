'use client'

import React, { useState } from 'react'
import { createHrLocation, updateHrLocation, deleteHrLocation } from '@/app/actions/hr-locations'

type LocationType = {
  id: string
  name: string
  lat: number
  lng: number
  radius: number
}

export default function LocationsClient({ initialLocations }: { initialLocations: LocationType[] }) {
  const [locations, setLocations] = useState<LocationType[]>(initialLocations)
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [form, setForm] = useState<{ id?: string; name: string; lat: number; lng: number; radius: number }>({
    name: '',
    lat: 0,
    lng: 0,
    radius: 50,
  })

  const openForm = (loc?: LocationType) => {
    if (loc) {
      setForm({ ...loc })
    } else {
      setForm({ name: '', lat: 0, lng: 0, radius: 50 })
    }
    setIsEditing(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    if (form.id) {
      const res = await updateHrLocation(form.id, {
        name: form.name,
        lat: Number(form.lat),
        lng: Number(form.lng),
        radius: Number(form.radius),
      })
      if (res.success) {
        setLocations(locations.map((l) => (l.id === form.id ? (form as LocationType) : l)))
        setIsEditing(false)
      } else {
        alert('Error: ' + res.error)
      }
    } else {
      const res = await createHrLocation({
        name: form.name,
        lat: Number(form.lat),
        lng: Number(form.lng),
        radius: Number(form.radius),
      })
      if (res.success && res.id) {
        setLocations([...locations, { ...form, id: res.id } as LocationType])
        setIsEditing(false)
      } else {
        alert('Error: ' + res.error)
      }
    }
    setIsLoading(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar esta ubicación? Si la eliminas, también se quitará de los usuarios asignados.')) return
    
    setIsLoading(true)
    const res = await deleteHrLocation(id)
    if (res.success) {
      setLocations(locations.filter((l) => l.id !== id))
    } else {
      alert('Error: ' + res.error)
    }
    setIsLoading(false)
  }

  return (
    <div>
      {!isEditing ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
            <button
              onClick={() => openForm()}
              style={{
                backgroundColor: 'var(--caanma-primary)',
                color: 'white',
                border: 'none',
                padding: '0.6rem 1.2rem',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              + Nueva Ubicación
            </button>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '1rem', fontWeight: 'bold', color: 'var(--caanma-text)' }}>Nombre</th>
                <th style={{ padding: '1rem', fontWeight: 'bold', color: 'var(--caanma-text)' }}>Coordenadas</th>
                <th style={{ padding: '1rem', fontWeight: 'bold', color: 'var(--caanma-text)' }}>Radio (m)</th>
                <th style={{ padding: '1rem', fontWeight: 'bold', color: 'var(--caanma-text)', textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {locations.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: 'var(--caanma-text-muted)' }}>
                    No hay ubicaciones registradas.
                  </td>
                </tr>
              ) : (
                locations.map((loc) => (
                  <tr key={loc.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '1rem' }}>{loc.name}</td>
                    <td style={{ padding: '1rem' }}>
                      <a 
                        href={`https://www.google.com/maps/search/?api=1&query=${loc.lat},${loc.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: 'var(--caanma-primary)', textDecoration: 'underline' }}
                      >
                        {loc.lat}, {loc.lng}
                      </a>
                    </td>
                    <td style={{ padding: '1rem' }}>{loc.radius}</td>
                    <td style={{ padding: '1rem', textAlign: 'right', gap: '0.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => openForm(loc)}
                        style={{ padding: '0.4rem 0.8rem', backgroundColor: '#e2e8f0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(loc.id)}
                        style={{ padding: '0.4rem 0.8rem', backgroundColor: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </>
      ) : (
        <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1.5rem', color: 'var(--caanma-primary)' }}>
            {form.id ? 'Editar Ubicación' : 'Nueva Ubicación'}
          </h2>
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '500px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Nombre descriptivo</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ej. Oficina Cliente A"
                style={{ width: '100%', padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Latitud</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={form.lat}
                  onChange={(e) => setForm({ ...form, lat: parseFloat(e.target.value) || 0 })}
                  style={{ width: '100%', padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Longitud</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={form.lng}
                  onChange={(e) => setForm({ ...form, lng: parseFloat(e.target.value) || 0 })}
                  style={{ width: '100%', padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Radio de tolerancia (metros)</label>
              <input
                type="number"
                min="10"
                required
                value={form.radius}
                onChange={(e) => setForm({ ...form, radius: parseFloat(e.target.value) || 50 })}
                style={{ width: '100%', padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
              />
              <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.5rem' }}>
                Define la distancia máxima permitida para hacer check-in. Lo recomendado es entre 50 y 100 metros.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button
                type="submit"
                disabled={isLoading}
                style={{
                  backgroundColor: 'var(--caanma-primary)',
                  color: 'white',
                  border: 'none',
                  padding: '0.6rem 1.2rem',
                  borderRadius: '6px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  flex: 1
                }}
              >
                {isLoading ? 'Guardando...' : 'Guardar Ubicación'}
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                disabled={isLoading}
                style={{
                  backgroundColor: 'white',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  padding: '0.6rem 1.2rem',
                  borderRadius: '6px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  flex: 1
                }}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
