'use client';

import { FileText, CheckCircle2, XCircle, Clock } from 'lucide-react';

export default function TramitesClient({ requests }: { requests: any[] }) {
  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#1e293b' }}>Trámites y Solicitudes</h1>
          <p style={{ color: 'var(--pulpos-text-muted)' }}>Gestión de vacaciones, permisos y justificantes.</p>
        </div>
      </div>

      <div className="card">
        {requests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
            <FileText size={48} style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
            <p>No hay solicitudes pendientes.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Empleado</th>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Tipo</th>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Fechas</th>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Estado</th>
                <th style={{ padding: '1rem', textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {requests.map(req => (
                <tr key={req.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '1rem', fontWeight: '500' }}>{req.user?.name}</td>
                  <td style={{ padding: '1rem' }}>{req.type === 'VACATION' ? 'Vacaciones' : req.type === 'SICK_LEAVE' ? 'Incapacidad' : 'Permiso Especial'}</td>
                  <td style={{ padding: '1rem', fontSize: '0.9rem', color: '#64748b' }}>
                    {new Date(req.startDate).toLocaleDateString('es-MX')} - {new Date(req.endDate).toLocaleDateString('es-MX')}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    {req.status === 'PENDING' && <span style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={16} /> Pendiente</span>}
                    {req.status === 'APPROVED' && <span style={{ color: '#16a34a', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><CheckCircle2 size={16} /> Aprobado</span>}
                    {req.status === 'REJECTED' && <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><XCircle size={16} /> Rechazado</span>}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    {req.status === 'PENDING' && (
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button style={{ backgroundColor: '#16a34a', color: 'white', border: 'none', padding: '0.25rem 0.5rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>Aprobar</button>
                        <button style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '0.25rem 0.5rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>Rechazar</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
