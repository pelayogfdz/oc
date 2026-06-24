'use client';

import { FileText, CheckCircle2, XCircle, Clock, Edit2, X } from 'lucide-react';
import { updateLeaveRequestStatus, editLeaveRequest } from '@/app/actions/hr';
import { useState } from 'react';
import { toast } from 'react-hot-toast';

const typeLabels: Record<string, string> = {
  VACATION: 'Vacaciones',
  SICK_LEAVE: 'Incapacidad',
  PAID_LEAVE: 'Con goce de sueldo',
  UNPAID_LEAVE: 'Sin goce de sueldo',
  PATERNITY_LEAVE: 'Paternidad',
};

export default function TramitesClient({ requests, timezone }: { requests: any[], timezone: string }) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editingReq, setEditingReq] = useState<any>(null);

  const handleUpdate = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    setUpdatingId(id);
    try {
      await updateLeaveRequestStatus(id, status);
      toast.success(status === 'REJECTED' ? "Permiso cancelado/rechazado." : "Permiso aprobado.");
    } catch (e: any) {
      toast.error("Error: " + e.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReq) return;
    
    try {
      await editLeaveRequest(editingReq.id, {
        type: editingReq.type,
        startDate: editingReq.startDate,
        endDate: editingReq.endDate
      });
      toast.success("Trámite editado y regresado a estado Pendiente.");
      setEditingReq(null);
    } catch (error: any) {
      toast.error("Error al editar trámite: " + error.message);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#1e293b' }}>Trámites y Solicitudes</h1>
          <p style={{ color: 'var(--caanma-text-muted)' }}>Gestión de vacaciones, permisos y justificantes.</p>
        </div>
      </div>

      <div className="card">
        {requests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
            <FileText size={48} style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
            <p>No hay solicitudes pendientes.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
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
                  <tr key={req.id} style={{ borderBottom: '1px solid #f1f5f9', opacity: updatingId === req.id ? 0.5 : 1 }}>
                    <td data-label="Empleado" style={{ padding: '1rem', fontWeight: '500' }}>{req.user?.name}</td>
                    <td data-label="Tipo" style={{ padding: '1rem' }}>{typeLabels[req.type] || req.type}</td>
                    <td data-label="Fechas" style={{ padding: '1rem', fontSize: '0.9rem', color: '#64748b' }}>
                      {new Date(req.startDate).toLocaleDateString('es-MX', { timeZone: timezone })} - {new Date(req.endDate).toLocaleDateString('es-MX', { timeZone: timezone })}
                    </td>
                    <td data-label="Estado" style={{ padding: '1rem' }}>
                      {req.status === 'PENDING' && <span style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={16} /> Pendiente</span>}
                      {req.status === 'APPROVED' && <span style={{ color: '#16a34a', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><CheckCircle2 size={16} /> Aprobado</span>}
                      {req.status === 'REJECTED' && <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><XCircle size={16} /> Rechazado / Cancelado</span>}
                    </td>
                    <td data-label="Acciones" style={{ padding: '1rem', textAlign: 'right' }}>
                      {req.status === 'PENDING' && (
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button onClick={() => handleUpdate(req.id, 'APPROVED')} disabled={updatingId === req.id} style={{ backgroundColor: '#16a34a', color: 'white', border: 'none', padding: '0.25rem 0.5rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>Aprobar</button>
                          <button onClick={() => handleUpdate(req.id, 'REJECTED')} disabled={updatingId === req.id} style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '0.25rem 0.5rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>Rechazar</button>
                        </div>
                      )}
                      {req.status === 'APPROVED' && (
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button onClick={() => setEditingReq({ 
                            ...req, 
                            startDate: new Date(req.startDate).toISOString().split('T')[0],
                            endDate: new Date(req.endDate).toISOString().split('T')[0]
                          })} disabled={updatingId === req.id} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', backgroundColor: '#e2e8f0', color: '#1e293b', border: 'none', padding: '0.25rem 0.5rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>
                            <Edit2 size={14} /> Editar
                          </button>
                          <button onClick={() => handleUpdate(req.id, 'REJECTED')} disabled={updatingId === req.id} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', padding: '0.25rem 0.5rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>
                            <X size={14} /> Cancelar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editingReq && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Editar Trámite</h2>
              <button onClick={() => setEditingReq(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} color="#64748b" /></button>
            </div>
            
            <form onSubmit={handleEditSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 'bold', color: '#475569' }}>Tipo de Solicitud</label>
                <select 
                  value={editingReq.type}
                  onChange={(e) => setEditingReq({ ...editingReq, type: e.target.value })}
                  className="caanma-input"
                  required
                >
                  {Object.entries(typeLabels).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 'bold', color: '#475569' }}>Fecha de Inicio</label>
                <input 
                  type="date"
                  value={editingReq.startDate}
                  onChange={(e) => setEditingReq({ ...editingReq, startDate: e.target.value })}
                  className="caanma-input"
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 'bold', color: '#475569' }}>Fecha de Fin</label>
                <input 
                  type="date"
                  value={editingReq.endDate}
                  onChange={(e) => setEditingReq({ ...editingReq, endDate: e.target.value })}
                  className="caanma-input"
                  required
                />
              </div>

              <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setEditingReq(null)} style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: 'white', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', backgroundColor: '#0284c7', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
