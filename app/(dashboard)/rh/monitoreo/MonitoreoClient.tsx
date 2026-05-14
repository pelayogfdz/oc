'use client';

import { useState } from 'react';
import { Search, MapPin, Clock, AlertTriangle, CheckCircle2, User, PlusCircle } from 'lucide-react';
import { registerAttendanceAdmin } from '@/app/actions/hr';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';

export default function MonitoreoClient({ users }: { users: any[] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [manualType, setManualType] = useState<'CHECK_IN' | 'CHECK_OUT'>('CHECK_IN');
  const [manualDate, setManualDate] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openManualModal = (user: any) => {
    setSelectedUser(user);
    
    // Auto-detect type based on missing log
    const logs = user.attendanceLogs || [];
    const checkIn = logs.find((l: any) => l.type === 'CHECK_IN');
    const checkOut = logs.find((l: any) => l.type === 'CHECK_OUT');
    
    if (checkIn && !checkOut) setManualType('CHECK_OUT');
    else setManualType('CHECK_IN');

    // Default datetime-local to now
    const now = new Date();
    // Format YYYY-MM-DDThh:mm
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setManualDate(now.toISOString().slice(0, 16));
    setManualNotes('');
    setIsModalOpen(true);
  };

  const handleManualSubmit = async () => {
    if (!selectedUser || !manualDate) return;
    setIsSubmitting(true);
    try {
      await registerAttendanceAdmin({
        userId: selectedUser.id,
        type: manualType,
        timestamp: new Date(manualDate).toISOString(),
        notes: manualNotes
      });
      toast.success("Registro manual guardado correctamente.");
      setIsModalOpen(false);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Error al guardar el registro.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#1e293b' }}>Monitoreo de Asistencia</h1>
          <p style={{ color: 'var(--pulpos-text-muted)' }}>Panel en tiempo real de entradas y salidas de hoy.</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
        <div style={{ position: 'relative', width: '350px', maxWidth: '100%' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input 
            type="text" 
            placeholder="Buscar empleado..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', backgroundColor: 'white' }}
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
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                  <div style={{ padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 'bold', backgroundColor: `${statusColor}20`, color: statusColor }}>
                    {statusText}
                  </div>
                  <button 
                    onClick={() => openManualModal(user)}
                    style={{ background: 'none', border: 'none', color: 'var(--pulpos-blue)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', padding: 0 }}
                  >
                    <PlusCircle size={14} /> Corregir
                  </button>
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

      {isModalOpen && selectedUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '400px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Registro Manual</h2>
            <p style={{ color: 'var(--pulpos-text-muted)', fontSize: '0.9rem' }}>Agregando registro para {selectedUser.name}</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>Tipo de Registro</label>
              <select 
                value={manualType} 
                onChange={(e) => setManualType(e.target.value as any)}
                className="pulpos-input"
              >
                <option value="CHECK_IN">Entrada (Check-in)</option>
                <option value="CHECK_OUT">Salida (Check-out)</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>Fecha y Hora</label>
              <input 
                type="datetime-local" 
                value={manualDate}
                onChange={(e) => setManualDate(e.target.value)}
                className="pulpos-input"
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>Motivo (Opcional)</label>
              <input 
                type="text" 
                placeholder="Ej. Olvidó marcar, Falla de sistema"
                value={manualNotes}
                onChange={(e) => setManualNotes(e.target.value)}
                className="pulpos-input"
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="btn-outline"
                style={{ flex: 1 }}
              >
                Cancelar
              </button>
              <button 
                onClick={handleManualSubmit}
                disabled={isSubmitting}
                className="btn-primary"
                style={{ flex: 1 }}
              >
                {isSubmitting ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
