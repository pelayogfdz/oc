'use client';

import { useState } from 'react';
import { 
  Search, MapPin, Clock, AlertTriangle, CheckCircle2, 
  User, PlusCircle, Calendar, Filter, Image as ImageIcon, 
  Map, Eye, X, Smartphone, ClipboardCheck 
} from 'lucide-react';
import { registerAttendanceAdmin, getFilteredAttendanceLogs } from '@/app/actions/hr';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';

export default function MonitoreoClient({ 
  users, 
  branches 
}: { 
  users: any[]; 
  branches: any[]; 
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'today' | 'history'>('today');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Real-time correction modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [manualType, setManualType] = useState<'CHECK_IN' | 'CHECK_OUT'>('CHECK_IN');
  const [manualDate, setManualDate] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // History filters states
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [filterUser, setFilterUser] = useState('ALL');
  const [filterBranch, setFilterBranch] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterType, setFilterType] = useState('ALL');
  
  // Date range (defaults to last 7 days)
  const defaultStartDate = () => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  };
  const defaultEndDate = () => {
    return new Date().toISOString().split('T')[0];
  };
  
  const [startDate, setStartDate] = useState(defaultStartDate());
  const [endDate, setEndDate] = useState(defaultEndDate());

  // Lightbox selfie states
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Filter today's users locally
  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Trigger history search using our new server action
  const handleSearchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await getFilteredAttendanceLogs({
        startDate,
        endDate,
        userId: filterUser,
        branchId: filterBranch,
        status: filterStatus,
        type: filterType
      });

      if (res && res.success && res.logs) {
        setHistoryLogs(res.logs);
        toast.success(`Se encontraron ${res.logs.length} registros.`);
      } else {
        throw new Error(res.error || "No se pudieron obtener los registros.");
      }
    } catch (err: any) {
      toast.error(err.message || "Error al buscar en el historial.");
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const openManualModal = (user: any) => {
    setSelectedUser(user);
    const logs = user.attendanceLogs || [];
    const checkIn = logs.find((l: any) => l.type === 'CHECK_IN');
    const checkOut = logs.find((l: any) => l.type === 'CHECK_OUT');
    
    if (checkIn && !checkOut) setManualType('CHECK_OUT');
    else setManualType('CHECK_IN');

    const now = new Date();
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
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>Monitoreo de Asistencia</h1>
          <p style={{ color: 'var(--pulpos-text-muted)', margin: '0.25rem 0 0' }}>Panel en tiempo real e historial detallado de entradas y salidas.</p>
        </div>

        {/* Tab Buttons */}
        <div style={{ display: 'inline-flex', backgroundColor: '#e2e8f0', padding: '0.25rem', borderRadius: '10px' }}>
          <button 
            onClick={() => setActiveTab('today')}
            style={{ 
              padding: '0.5rem 1.25rem', 
              borderRadius: '8px', 
              fontWeight: 'bold', 
              fontSize: '0.85rem',
              border: 'none', 
              cursor: 'pointer',
              backgroundColor: activeTab === 'today' ? 'white' : 'transparent',
              color: activeTab === 'today' ? '#1e293b' : '#64748b',
              boxShadow: activeTab === 'today' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            📋 Monitoreo de Hoy
          </button>
          <button 
            onClick={() => { setActiveTab('history'); handleSearchHistory(); }}
            style={{ 
              padding: '0.5rem 1.25rem', 
              borderRadius: '8px', 
              fontWeight: 'bold', 
              fontSize: '0.85rem',
              border: 'none', 
              cursor: 'pointer',
              backgroundColor: activeTab === 'history' ? 'white' : 'transparent',
              color: activeTab === 'history' ? '#1e293b' : '#64748b',
              boxShadow: activeTab === 'history' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            🔍 Historial Completo
          </button>
        </div>
      </div>

      {/* ================= TAB 1: REAL-TIME MONITORING (TODAY) ================= */}
      {activeTab === 'today' && (
        <>
          {/* Quick search input */}
          <div className="card" style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <div style={{ position: 'relative', width: '350px', maxWidth: '100%' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input 
                type="text" 
                placeholder="Buscar empleado de hoy..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', backgroundColor: 'white' }}
              />
            </div>
          </div>

          {/* Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.5rem' }}>
            {filteredUsers.map(user => {
              const logs = user.attendanceLogs || [];
              const checkIn = logs.find((l: any) => l.type === 'CHECK_IN');
              const checkOut = logs.find((l: any) => l.type === 'CHECK_OUT');

              const formatTime12h = (dateStr: string | Date) => {
                const date = new Date(dateStr);
                const timeString = date.toLocaleTimeString('es-MX', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true
                });
                return timeString
                  .toLowerCase()
                  .replace(/\s+/g, '')
                  .replace(/([ap]\.?m\.?)/g, ' $1')
                  .replace(/am/g, 'a.m.')
                  .replace(/pm/g, 'p.m.');
              };

              let statusColor = '#94a3b8'; // default (no data)
              let statusText = 'Sin Registro';

              if (checkIn && !checkOut) {
                statusColor = '#16a34a'; // green
                statusText = 'Trabajando';
                if (checkIn.status === 'LATE') {
                  statusColor = '#ea580c'; // orange
                  statusText = 'Trabajando (Retardo)';
                } else if (checkIn.status === 'OUTSIDE_RADIUS') {
                  statusColor = '#d97706'; // amber
                  statusText = 'Fuera de Geocerca';
                }
              } else if (checkIn && checkOut) {
                statusColor = '#64748b'; // gray
                statusText = 'Turno Finalizado';
              }

              return (
                <div key={user.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ width: '48px', height: '48px', backgroundColor: '#eff6ff', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', border: '1px solid #bfdbfe' }}>
                        <User size={24} color="#2563eb" />
                      </div>
                      <div>
                        <h3 style={{ fontWeight: 'bold', color: '#1e293b', margin: 0, fontSize: '1.05rem' }}>{user.name}</h3>
                        <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0.15rem 0 0' }}>📍 {user.branch?.name || 'Sin Sucursal'}</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                      <div style={{ padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 'bold', backgroundColor: `${statusColor}15`, color: statusColor, border: `1px solid ${statusColor}30` }}>
                        {statusText}
                      </div>
                      <button 
                        onClick={() => openManualModal(user)}
                        style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', fontWeight: 'bold', padding: 0 }}
                      >
                        <PlusCircle size={14} /> Corregir
                      </button>
                    </div>
                  </div>

                  {/* Today Logs Details Block */}
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    backgroundColor: '#ffffff', 
                    padding: '1.25rem 1rem', 
                    borderRadius: '12px', 
                    border: '1px solid #e2e8f0',
                    gap: '1rem'
                  }}>
                    {/* CHECK IN BLOCK */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: '1 1 0%', minWidth: '120px' }}>
                      {checkIn ? (
                        <>
                          {/* Circle Icon */}
                          <div style={{ 
                            width: '42px', 
                            height: '42px', 
                            backgroundColor: '#e6f9ee', 
                            borderRadius: '50%', 
                            display: 'flex', 
                            justifyContent: 'center', 
                            alignItems: 'center',
                            flexShrink: 0
                          }}>
                            <CheckCircle2 size={22} color="#16a34a" />
                          </div>
                          
                          {/* Texts */}
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: 'bold', color: '#1e293b', fontSize: '1rem' }}>Entrada</span>
                              {checkIn.status === 'LATE' && (
                                <span style={{ 
                                  padding: '0.15rem 0.4rem', 
                                  borderRadius: '4px', 
                                  fontSize: '0.6rem', 
                                  fontWeight: '700', 
                                  backgroundColor: '#ffe4e6', 
                                  color: '#ef4444',
                                  letterSpacing: '0.025em'
                                }}>
                                  RETARDO
                                </span>
                              )}
                              {checkIn.status === 'OUTSIDE_RADIUS' && (
                                <span style={{ 
                                  padding: '0.15rem 0.4rem', 
                                  borderRadius: '4px', 
                                  fontSize: '0.6rem', 
                                  fontWeight: '700', 
                                  backgroundColor: '#fff7ed', 
                                  color: '#ea580c',
                                  letterSpacing: '0.025em'
                                }}>
                                  GPS LEJOS
                                </span>
                              )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.15rem' }}>
                              <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '500' }}>
                                {formatTime12h(checkIn.timestamp)}
                              </span>
                              
                              {/* Action buttons (Map & Photo) */}
                              {checkIn.lat !== null && checkIn.lng !== null && (
                                <a 
                                  href={`https://www.google.com/maps/search/?api=1&query=${checkIn.lat},${checkIn.lng}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  style={{ 
                                    display: 'inline-flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    width: '22px', 
                                    height: '22px', 
                                    backgroundColor: '#eff6ff', 
                                    borderRadius: '50%', 
                                    color: '#2563eb', 
                                    border: '1px solid #bfdbfe',
                                    transition: 'all 0.2s' 
                                  }}
                                  title="Ver ubicación en Google Maps"
                                >
                                  <MapPin size={11} />
                                </a>
                              )}
                              {checkIn.photoUrl && (
                                <button 
                                  onClick={() => setLightboxImage(checkIn.photoUrl)}
                                  style={{ 
                                    display: 'inline-flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    width: '22px', 
                                    height: '22px', 
                                    backgroundColor: '#f0fdf4', 
                                    borderRadius: '50%', 
                                    color: '#16a34a', 
                                    border: '1px solid #bbf7d0', 
                                    cursor: 'pointer' 
                                  }}
                                  title="Ver selfie"
                                >
                                  <ImageIcon size={11} />
                                </button>
                              )}
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          {/* Empty/Pending Check In */}
                          <div style={{ 
                            width: '42px', 
                            height: '42px', 
                            backgroundColor: '#f1f5f9', 
                            borderRadius: '50%', 
                            display: 'flex', 
                            justifyContent: 'center', 
                            alignItems: 'center',
                            flexShrink: 0
                          }}>
                            <Clock size={20} color="#94a3b8" />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 'bold', color: '#94a3b8', fontSize: '1rem' }}>Entrada</span>
                            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic', marginTop: '0.15rem' }}>Pendiente</span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Divider Line */}
                    <div style={{ width: '1px', alignSelf: 'stretch', backgroundColor: '#e2e8f0', display: 'block' }} />

                    {/* CHECK OUT BLOCK */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: '1 1 0%', minWidth: '120px' }}>
                      {checkOut ? (
                        <>
                          {/* Circle Icon */}
                          <div style={{ 
                            width: '42px', 
                            height: '42px', 
                            backgroundColor: '#fff7ed', 
                            borderRadius: '50%', 
                            display: 'flex', 
                            justifyContent: 'center', 
                            alignItems: 'center',
                            flexShrink: 0
                          }}>
                            <AlertTriangle size={20} color="#ea580c" />
                          </div>
                          
                          {/* Texts */}
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: 'bold', color: '#1e293b', fontSize: '1rem' }}>Salida</span>
                              {checkOut.status === 'OUTSIDE_RADIUS' && (
                                <span style={{ 
                                  padding: '0.15rem 0.4rem', 
                                  borderRadius: '4px', 
                                  fontSize: '0.6rem', 
                                  fontWeight: '700', 
                                  backgroundColor: '#fff7ed', 
                                  color: '#ea580c',
                                  letterSpacing: '0.025em'
                                }}>
                                  GPS LEJOS
                                </span>
                              )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.15rem' }}>
                              <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '500' }}>
                                {formatTime12h(checkOut.timestamp)}
                              </span>
                              
                              {/* Action buttons (Map & Photo) */}
                              {checkOut.lat !== null && checkOut.lng !== null && (
                                <a 
                                  href={`https://www.google.com/maps/search/?api=1&query=${checkOut.lat},${checkOut.lng}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  style={{ 
                                    display: 'inline-flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    width: '22px', 
                                    height: '22px', 
                                    backgroundColor: '#fff7ed', 
                                    borderRadius: '50%', 
                                    color: '#ea580c', 
                                    border: '1px solid #fed7aa',
                                    transition: 'all 0.2s' 
                                  }}
                                  title="Ver ubicación en Google Maps"
                                >
                                  <MapPin size={11} />
                                </a>
                              )}
                              {checkOut.photoUrl && (
                                <button 
                                  onClick={() => setLightboxImage(checkOut.photoUrl)}
                                  style={{ 
                                    display: 'inline-flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    width: '22px', 
                                    height: '22px', 
                                    backgroundColor: '#f0fdf4', 
                                    borderRadius: '50%', 
                                    color: '#16a34a', 
                                    border: '1px solid #bbf7d0', 
                                    cursor: 'pointer' 
                                  }}
                                  title="Ver selfie"
                                >
                                  <ImageIcon size={11} />
                                </button>
                              )}
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          {/* Empty/Pending Check Out */}
                          <div style={{ 
                            width: '42px', 
                            height: '42px', 
                            backgroundColor: '#fffaf5', 
                            borderRadius: '50%', 
                            display: 'flex', 
                            justifyContent: 'center', 
                            alignItems: 'center',
                            flexShrink: 0,
                            border: '1px solid #fed7aa'
                          }}>
                            <AlertTriangle size={20} color="#cbd5e1" />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 'bold', color: '#94a3b8', fontSize: '1rem' }}>Salida</span>
                            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic', marginTop: '0.15rem' }}>
                              {checkIn ? 'Trabajando...' : 'Pendiente'}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ================= TAB 2: DETAILED ATTENDANCE HISTORY ================= */}
      {activeTab === 'history' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Advanced Filters Panel */}
          <div className="card" style={{ padding: '1.5rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <Filter size={18} color="#2563eb" />
              <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>Filtros de Búsqueda Avanzada</h2>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              {/* Employee Filter */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#475569' }}>Empleado</label>
                <select 
                  value={filterUser} 
                  onChange={e => setFilterUser(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white', outline: 'none' }}
                >
                  <option value="ALL">Todos los empleados</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>

              {/* Location Filter */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#475569' }}>Sucursal / Ubicación</label>
                <select 
                  value={filterBranch} 
                  onChange={e => setFilterBranch(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white', outline: 'none' }}
                >
                  <option value="ALL">Todas las sucursales</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              {/* Type Filter */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#475569' }}>Tipo de Registro</label>
                <select 
                  value={filterType} 
                  onChange={e => setFilterType(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white', outline: 'none' }}
                >
                  <option value="ALL">Todos (Entrada/Salida)</option>
                  <option value="CHECK_IN">Entrada (Check-in)</option>
                  <option value="CHECK_OUT">Salida (Check-out)</option>
                </select>
              </div>

              {/* Status Filter */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#475569' }}>Estado</label>
                <select 
                  value={filterStatus} 
                  onChange={e => setFilterStatus(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white', outline: 'none' }}
                >
                  <option value="ALL">Todos</option>
                  <option value="ON_TIME">A Tiempo</option>
                  <option value="LATE">Retardo</option>
                  <option value="OUTSIDE_RADIUS">Fuera de Rango</option>
                </select>
              </div>

              {/* Start Date */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#475569' }}>Desde</label>
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={e => setStartDate(e.target.value)}
                  style={{ width: '100%', padding: '0.45rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white', outline: 'none' }}
                />
              </div>

              {/* End Date */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#475569' }}>Hasta</label>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={e => setEndDate(e.target.value)}
                  style={{ width: '100%', padding: '0.45rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white', outline: 'none' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button 
                onClick={handleSearchHistory}
                disabled={isLoadingHistory}
                style={{ 
                  padding: '0.65rem 1.75rem', 
                  backgroundColor: '#2563eb', 
                  color: 'white', 
                  borderRadius: '8px', 
                  fontWeight: 'bold', 
                  fontSize: '0.875rem',
                  border: 'none', 
                  cursor: 'pointer',
                  boxShadow: '0 4px 6px -1px rgba(37,99,235,0.2)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                {isLoadingHistory ? 'Buscando...' : '🔍 Buscar en Historial'}
              </button>
            </div>
          </div>

          {/* Results Table */}
          <div className="card" style={{ padding: '0', overflow: 'hidden', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 'bold', color: '#1e293b', fontSize: '0.95rem' }}>Resultados del Historial</span>
              <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '500' }}>{historyLogs.length} registros cargados</span>
            </div>

            {isLoadingHistory ? (
              <div style={{ padding: '4rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', color: '#64748b' }}>
                <Clock className="animate-spin" size={32} color="#2563eb" />
                <span style={{ fontWeight: '500' }}>Cargando registros del historial...</span>
              </div>
            ) : historyLogs.length === 0 ? (
              <div style={{ padding: '5rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', color: '#94a3b8' }}>
                <ClipboardCheck size={40} />
                <p style={{ fontWeight: 'bold', margin: 0 }}>Sin registros en el historial</p>
                <p style={{ fontSize: '0.85rem', margin: 0 }}>Intenta ajustar los filtros de fecha o empleado y busca de nuevo.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '850px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '0.75rem 1.5rem', fontSize: '0.8rem', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase' }}>Empleado</th>
                      <th style={{ padding: '0.75rem 1.5rem', fontSize: '0.8rem', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase' }}>Sucursal</th>
                      <th style={{ padding: '0.75rem 1.5rem', fontSize: '0.8rem', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase' }}>Tipo</th>
                      <th style={{ padding: '0.75rem 1.5rem', fontSize: '0.8rem', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase' }}>Fecha y Hora</th>
                      <th style={{ padding: '0.75rem 1.5rem', fontSize: '0.8rem', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase' }}>Estado</th>
                      <th style={{ padding: '0.75rem 1.5rem', fontSize: '0.8rem', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase', textAlign: 'center' }}>Selfie</th>
                      <th style={{ padding: '0.75rem 1.5rem', fontSize: '0.8rem', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase', textAlign: 'center' }}>GPS Map</th>
                      <th style={{ padding: '0.75rem 1.5rem', fontSize: '0.8rem', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase' }}>Dispositivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyLogs.map(log => {
                      const logDate = new Date(log.timestamp);
                      const isCheckIn = log.type === 'CHECK_IN';
                      const isLate = log.status === 'LATE';
                      
                      return (
                        <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          {/* Employee info */}
                          <td style={{ padding: '0.75rem 1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #cbd5e1' }}>
                                <User size={16} color="#475569" />
                              </div>
                              <div>
                                <span style={{ fontWeight: 'bold', display: 'block', color: '#1e293b', fontSize: '0.9rem' }}>{log.user?.name}</span>
                                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{log.user?.email}</span>
                              </div>
                            </div>
                          </td>
                          
                          {/* Branch */}
                          <td style={{ padding: '0.75rem 1.5rem', fontSize: '0.85rem', color: '#334155', fontWeight: '500' }}>
                            {log.user?.branch?.name || 'Sin Sucursal'}
                          </td>

                          {/* Type */}
                          <td style={{ padding: '0.75rem 1.5rem' }}>
                            <span style={{ 
                              padding: '0.2rem 0.6rem', 
                              borderRadius: '6px', 
                              fontSize: '0.75rem', 
                              fontWeight: 'bold',
                              backgroundColor: isCheckIn ? '#dcfce7' : '#ffedd5',
                              color: isCheckIn ? '#16a34a' : '#ea580c',
                              border: isCheckIn ? '1px solid #bbf7d0' : '1px solid #fed7aa'
                            }}>
                              {isCheckIn ? 'Entrada' : 'Salida'}
                            </span>
                          </td>

                          {/* Date and time */}
                          <td style={{ padding: '0.75rem 1.5rem', fontSize: '0.85rem', color: '#334155' }}>
                            <span style={{ display: 'block', fontWeight: '600' }}>
                              {logDate.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              🕒 {logDate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </td>

                          {/* Status */}
                          <td style={{ padding: '0.75rem 1.5rem' }}>
                            {log.status === 'OUTSIDE_RADIUS' ? (
                              <span style={{ 
                                padding: '0.2rem 0.5rem', 
                                borderRadius: '4px', 
                                fontSize: '0.75rem', 
                                fontWeight: 'bold',
                                backgroundColor: '#fef3c7',
                                color: '#d97706',
                                border: '1px solid #fde68a'
                              }}>
                                ⚠️ Fuera de Rango
                              </span>
                            ) : (
                              <span style={{ 
                                padding: '0.2rem 0.5rem', 
                                borderRadius: '4px', 
                                fontSize: '0.75rem', 
                                fontWeight: 'bold',
                                backgroundColor: isLate ? '#fef2f2' : '#f0fdf4',
                                color: isLate ? '#ef4444' : '#16a34a'
                              }}>
                                {isLate ? 'Retardo' : 'A Tiempo'}
                              </span>
                            )}
                          </td>

                          {/* Photo selfie modal popup */}
                          <td style={{ padding: '0.75rem 1.5rem', textAlign: 'center' }}>
                            {log.photoUrl ? (
                              <button 
                                onClick={() => setLightboxImage(log.photoUrl)}
                                style={{ 
                                  display: 'inline-flex', 
                                  alignItems: 'center', 
                                  gap: '0.25rem', 
                                  padding: '0.25rem 0.5rem', 
                                  backgroundColor: '#f0fdf4', 
                                  color: '#16a34a', 
                                  border: '1px solid #bbf7d0', 
                                  borderRadius: '6px', 
                                  fontSize: '0.75rem', 
                                  fontWeight: 'bold', 
                                  cursor: 'pointer' 
                                }}
                              >
                                <Eye size={12} /> Ver Foto
                              </button>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>Sin foto</span>
                            )}
                          </td>

                          {/* Google maps coordinate link */}
                          <td style={{ padding: '0.75rem 1.5rem', textAlign: 'center' }}>
                            {log.lat !== null && log.lng !== null ? (
                              <a 
                                href={`https://www.google.com/maps/search/?api=1&query=${log.lat},${log.lng}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                style={{ 
                                  display: 'inline-flex', 
                                  alignItems: 'center', 
                                  gap: '0.25rem', 
                                  padding: '0.25rem 0.5rem', 
                                  backgroundColor: '#eff6ff', 
                                  color: '#2563eb', 
                                  border: '1px solid #bfdbfe', 
                                  borderRadius: '6px', 
                                  fontSize: '0.75rem', 
                                  fontWeight: 'bold',
                                  textDecoration: 'none'
                                }}
                              >
                                <MapPin size={12} /> Google Maps
                              </a>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>Sin GPS</span>
                            )}
                          </td>

                          {/* Device / Notes */}
                          <td style={{ padding: '0.75rem 1.5rem', fontSize: '0.75rem', color: '#64748b', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.deviceInfo || ''}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Smartphone size={12} /> {log.deviceInfo || 'N/D'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= LIGHTBOX IMAGE VIEW POPUP ================= */}
      {lightboxImage && (
        <div 
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100, padding: '1.5rem', animation: 'fade-in 0.2s' }}
          onClick={() => setLightboxImage(null)}
        >
          <div 
            style={{ position: 'relative', width: '100%', maxWidth: '400px', backgroundColor: 'white', borderRadius: '16px', padding: '1rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
            onClick={e => e.stopPropagation()}
          >
            <button 
              onClick={() => setLightboxImage(null)}
              style={{ position: 'absolute', top: '16px', right: '16px', border: 'none', backgroundColor: 'rgba(0,0,0,0.5)', color: 'white', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', zIndex: 10 }}
            >
              <X size={16} />
            </button>
            <div style={{ width: '100%', aspectRatio: '1/1', overflow: 'hidden', borderRadius: '10px', backgroundColor: '#e2e8f0' }}>
              <img src={lightboxImage} alt="Selfie ampliada" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e293b', fontSize: '0.85rem', fontWeight: 'bold' }}>
              <ImageIcon size={16} color="#16a34a" />
              <span>Selfie de Asistencia del Empleado</span>
            </div>
          </div>
        </div>
      )}

      {/* ================= CORRECTION MODAL (MANUAL REGISTER) ================= */}
      {isModalOpen && selectedUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '400px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', border: 'none', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>Registro Manual</h2>
            <p style={{ color: 'var(--pulpos-text-muted)', fontSize: '0.9rem', margin: 0 }}>Agregando registro para <strong>{selectedUser.name}</strong></p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#475569' }}>Tipo de Registro</label>
              <select 
                value={manualType} 
                onChange={(e) => setManualType(e.target.value as any)}
                style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
              >
                <option value="CHECK_IN">Entrada (Check-in)</option>
                <option value="CHECK_OUT">Salida (Check-out)</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#475569' }}>Fecha y Hora</label>
              <input 
                type="datetime-local" 
                value={manualDate}
                onChange={(e) => setManualDate(e.target.value)}
                style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#475569' }}>Motivo / Comentarios (Opcional)</label>
              <input 
                type="text" 
                placeholder="Ej. Olvidó marcar, Falla de sistema"
                value={manualNotes}
                onChange={(e) => setManualNotes(e.target.value)}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.25rem' }}>
              <button 
                onClick={() => setIsModalOpen(false)}
                style={{ flex: 1, padding: '0.65rem 1rem', border: '1px solid #cbd5e1', color: '#475569', borderRadius: '8px', backgroundColor: 'transparent', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Cancelar
              </button>
              <button 
                onClick={handleManualSubmit}
                disabled={isSubmitting}
                style={{ flex: 1, padding: '0.65rem 1rem', border: 'none', color: 'white', borderRadius: '8px', backgroundColor: '#2563eb', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 6px -1px rgba(37,99,235,0.2)' }}
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
