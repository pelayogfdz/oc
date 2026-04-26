'use client';

import { useState } from 'react';
import { Search, MapPin, Clock, AlertTriangle, CheckCircle2, User } from 'lucide-react';

export default function MonitoreoClient({ users }: { users: any[] }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#1e293b' }}>Monitoreo de Asistencia</h1>
          <p style={{ color: 'var(--pulpos-text-muted)' }}>Panel en tiempo real de entradas y salidas de hoy.</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ position: 'relative', width: '300px' }}>
          <Search size={18} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--pulpos-text-muted)' }} />
          <input 
            type="text" 
            placeholder="Buscar empleado..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '0.5rem 0.5rem 0.5rem 2.5rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
        {filteredUsers.map(user => {
          const logs = user.attendanceLogs || [];
          const checkIn = logs.find((l: any) => l.type === 'CHECK_IN');
          const checkOut = logs.find((l: any) => l.type === 'CHECK_OUT');

          let statusColor = '#94a3b8'; // default (no data)
          let statusText = 'Sin Registro';

          if (checkIn && !checkOut) {
            statusColor = '#16a34a'; // green
            statusText = 'Trabajando';
            if (checkIn.status === 'LATE') {
              statusColor = '#ea580c'; // orange
              statusText = 'Trabajando (Retardo)';
            }
          } else if (checkIn && checkOut) {
            statusColor = '#64748b'; // gray
            statusText = 'Turno Finalizado';
          }

          return (
            <div key={user.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '48px', height: '48px', backgroundColor: '#e2e8f0', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <User size={24} color="#64748b" />
                  </div>
                  <div>
                    <h3 style={{ fontWeight: 'bold', color: '#1e293b' }}>{user.name}</h3>
                    <p style={{ fontSize: '0.85rem', color: '#64748b' }}>{user.branch?.name || 'Sin Sucursal'}</p>
                  </div>
                </div>
                <div style={{ padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 'bold', backgroundColor: `${statusColor}20`, color: statusColor }}>
                  {statusText}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '6px' }}>
                {checkIn ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#16a34a' }}>
                      <CheckCircle2 size={16} /> Entrada:
                    </span>
                    <span style={{ fontWeight: '500' }}>
                      {new Date(checkIn.timestamp).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.9rem', color: '#94a3b8' }}>No ha registrado entrada</div>
                )}

                {checkOut && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ea580c' }}>
                      <AlertTriangle size={16} /> Salida:
                    </span>
                    <span style={{ fontWeight: '500' }}>
                      {new Date(checkOut.timestamp).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
