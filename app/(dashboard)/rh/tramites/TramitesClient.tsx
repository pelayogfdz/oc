'use client';

import { FileText, CheckCircle2, XCircle, Clock, Edit2, X, Briefcase, Search, Calendar } from 'lucide-react';
import { updateLeaveRequestStatus, editLeaveRequest, updateEmployeeVacationSettings } from '@/app/actions/hr';
import { useState } from 'react';
import { toast } from 'react-hot-toast';

const typeLabels: Record<string, string> = {
  VACATION: 'Vacaciones',
  SICK_LEAVE: 'Incapacidad',
  PAID_LEAVE: 'Con goce de sueldo',
  UNPAID_LEAVE: 'Sin goce de sueldo',
  PATERNITY_LEAVE: 'Paternidad',
};

const getLawDaysForYear = (year: number): number => {
  if (year <= 0) return 0;
  if (year === 1) return 12;
  if (year === 2) return 14;
  if (year === 3) return 16;
  if (year === 4) return 18;
  if (year === 5) return 20;
  if (year >= 6 && year <= 10) return 22;
  if (year >= 11 && year <= 15) return 24;
  if (year >= 16 && year <= 20) return 26;
  if (year >= 21 && year <= 25) return 28;
  if (year >= 26 && year <= 30) return 30;
  if (year >= 31 && year <= 35) return 32;
  return 32 + Math.floor((year - 35) / 5) * 2;
};

const calculateAccruedVacationDays = (hireDateStr: string | null, vacationStartDateStr: string | null): number => {
  if (!hireDateStr) return 0;
  const hireDate = new Date(hireDateStr);
  if (isNaN(hireDate.getTime())) return 0;
  const vacationStartDate = vacationStartDateStr ? new Date(vacationStartDateStr) : null;
  const now = new Date();
  let totalAccrued = 0;

  let anniversaryYear = 1;
  while (anniversaryYear < 100) {
    const anniversaryDate = new Date(hireDate);
    anniversaryDate.setFullYear(hireDate.getFullYear() + anniversaryYear);

    if (isNaN(anniversaryDate.getTime()) || anniversaryDate > now) {
      break;
    }

    // Only count this anniversary if it happens AFTER the vacationStartDate baseline
    if (!vacationStartDate || isNaN(vacationStartDate.getTime()) || anniversaryDate > vacationStartDate) {
      totalAccrued += getLawDaysForYear(anniversaryYear);
    }

    anniversaryYear++;
  }

  return totalAccrued;
};

export default function TramitesClient({ requests, users, timezone }: { requests: any[], users: any[], timezone: string }) {
  const [activeTab, setActiveTab] = useState<'requests' | 'vacations'>('requests');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'name', direction: 'asc' });
  const [selectedUserForHistory, setSelectedUserForHistory] = useState<any | null>(null);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<any | null>(null);
  const [adjustingInitialDays, setAdjustingInitialDays] = useState<number>(0);
  const [adjustingStartDate, setAdjustingStartDate] = useState<string>('');
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);

  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editingReq, setEditingReq] = useState<any>(null);

  const getDaysGrantedThisYear = (hireDateStr: string | null): number => {
    if (!hireDateStr) return 0;
    const hireDate = new Date(hireDateStr);
    const now = new Date();
    const currentYear = now.getFullYear();
    const years = currentYear - hireDate.getFullYear();
    if (years <= 0) return 0;
    return getLawDaysForYear(years);
  };

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

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

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForEdit) return;
    setIsUpdatingSettings(true);
    try {
      const res = await updateEmployeeVacationSettings(
        selectedUserForEdit.id,
        adjustingInitialDays,
        adjustingStartDate || null
      );
      if (res.success) {
        toast.success("Saldo de vacaciones actualizado correctamente.");
        setSelectedUserForEdit(null);
      } else {
        toast.error("Error: " + res.error);
      }
    } catch (err: any) {
      toast.error("Error: " + err.message);
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  const getUserVacationStats = (user: any) => {
    const lawVacationDays = calculateAccruedVacationDays(user.hireDate, user.vacationStartDate);
    const totalVacationDays = (user.initialVacationDays || 0) + lawVacationDays;
    
    const usedVacationDays = user.leaveRequests
      .filter((req: any) => req.status === 'APPROVED' && req.type === 'VACATION')
      .reduce((acc: number, req: any) => {
        const diffTime = Math.abs(new Date(req.endDate).getTime() - new Date(req.startDate).getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; 
        return acc + diffDays;
      }, 0);

    const availableVacationDays = Math.max(0, totalVacationDays - usedVacationDays);

    return {
      lawVacationDays,
      totalVacationDays,
      usedVacationDays,
      availableVacationDays
    };
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()));
      
    if (!matchesSearch) return false;
    
    if (filterStatus === 'with_available') {
      const stats = getUserVacationStats(user);
      return stats.availableVacationDays > 0;
    }
    if (filterStatus === 'no_available') {
      const stats = getUserVacationStats(user);
      return stats.availableVacationDays === 0;
    }
    if (filterStatus === 'with_hire_date') {
      return !!user.hireDate;
    }
    if (filterStatus === 'no_hire_date') {
      return !user.hireDate;
    }
    
    return true;
  });

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (!sortConfig) return 0;
    
    let aValue: any;
    let bValue: any;
    
    if (sortConfig.key === 'name') {
      aValue = a.name.toLowerCase();
      bValue = b.name.toLowerCase();
    } else if (sortConfig.key === 'hireDate') {
      aValue = a.hireDate ? new Date(a.hireDate).getTime() : 0;
      bValue = b.hireDate ? new Date(b.hireDate).getTime() : 0;
    } else {
      const statsA = getUserVacationStats(a);
      const statsB = getUserVacationStats(b);
      if (sortConfig.key === 'initial') {
        aValue = a.initialVacationDays || 0;
        bValue = b.initialVacationDays || 0;
      } else if (sortConfig.key === 'law') {
        aValue = statsA.lawVacationDays;
        bValue = statsB.lawVacationDays;
      } else if (sortConfig.key === 'thisYear') {
        aValue = getDaysGrantedThisYear(a.hireDate);
        bValue = getDaysGrantedThisYear(b.hireDate);
      } else if (sortConfig.key === 'total') {
        aValue = statsA.totalVacationDays;
        bValue = statsB.totalVacationDays;
      } else if (sortConfig.key === 'used') {
        aValue = statsA.usedVacationDays;
        bValue = statsB.usedVacationDays;
      } else if (sortConfig.key === 'available') {
        aValue = statsA.availableVacationDays;
        bValue = statsB.availableVacationDays;
      }
    }
    
    if (aValue < bValue) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#1e293b' }}>Recursos Humanos - Trámites</h1>
          <p style={{ color: 'var(--caanma-text-muted)' }}>Gestión de vacaciones, justificantes y saldos del personal.</p>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid #e2e8f0', marginBottom: '1.5rem', paddingBottom: '0.1rem' }}>
        <button 
          onClick={() => setActiveTab('requests')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.25rem',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'requests' ? '3px solid #0284c7' : '3px solid transparent',
            color: activeTab === 'requests' ? '#0284c7' : '#64748b',
            fontWeight: activeTab === 'requests' ? '600' : '500',
            cursor: 'pointer',
            fontSize: '0.95rem',
            transition: 'all 0.2s',
            marginTop: '2px'
          }}
        >
          <FileText size={18} />
          Solicitudes de Permisos
        </button>
        <button 
          onClick={() => setActiveTab('vacations')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.25rem',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'vacations' ? '3px solid #0284c7' : '3px solid transparent',
            color: activeTab === 'vacations' ? '#0284c7' : '#64748b',
            fontWeight: activeTab === 'vacations' ? '600' : '500',
            cursor: 'pointer',
            fontSize: '0.95rem',
            transition: 'all 0.2s',
            marginTop: '2px'
          }}
        >
          <Briefcase size={18} />
          Control de Vacaciones
        </button>
      </div>

      {/* Tab Content: Requests */}
      {activeTab === 'requests' && (
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
      )}

      {/* Tab Content: Vacations Control */}
      {activeTab === 'vacations' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Search bar & Filters */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, display: 'flex', gap: '1rem', alignItems: 'center', backgroundColor: 'white', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', minWidth: '280px' }}>
              <Search size={18} color="#64748b" />
              <input 
                type="text" 
                placeholder="Buscar empleado por nombre o correo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ border: 'none', width: '100%', outline: 'none', fontSize: '0.95rem' }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '500' }}>Filtrar por:</span>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                style={{
                  padding: '0.65rem 1rem',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  outline: 'none',
                  fontSize: '0.9rem',
                  color: '#334155',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              >
                <option value="all">Todos los Empleados</option>
                <option value="with_available">Con Días Disponibles</option>
                <option value="no_available">Sin Días Disponibles</option>
                <option value="with_hire_date">Ingreso Registrado</option>
                <option value="no_hire_date">Ingreso No Registrado</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="card">
            {sortedUsers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                <Briefcase size={48} style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
                <p>No se encontraron empleados.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: '950px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                      <th onClick={() => requestSort('name')} style={{ padding: '1rem', textAlign: 'left', cursor: 'pointer', userSelect: 'none' }}>
                        Empleado {sortConfig?.key === 'name' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                      </th>
                      <th onClick={() => requestSort('hireDate')} style={{ padding: '1rem', textAlign: 'left', cursor: 'pointer', userSelect: 'none' }}>
                        Ingreso {sortConfig?.key === 'hireDate' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                      </th>
                      <th onClick={() => requestSort('initial')} style={{ padding: '1rem', textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}>
                        Base Inicial {sortConfig?.key === 'initial' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                      </th>
                      <th onClick={() => requestSort('law')} style={{ padding: '1rem', textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}>
                        Acumulado Ley {sortConfig?.key === 'law' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                      </th>
                      <th onClick={() => requestSort('thisYear')} style={{ padding: '1rem', textAlign: 'center', cursor: 'pointer', userSelect: 'none', color: 'var(--caanma-primary)', fontWeight: 'bold' }}>
                        Ley este Año {sortConfig?.key === 'thisYear' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                      </th>
                      <th onClick={() => requestSort('total')} style={{ padding: '1rem', textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}>
                        Total {sortConfig?.key === 'total' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                      </th>
                      <th onClick={() => requestSort('used')} style={{ padding: '1rem', textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}>
                        Gozadas {sortConfig?.key === 'used' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                      </th>
                      <th onClick={() => requestSort('available')} style={{ padding: '1rem', textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}>
                        Disponibles {sortConfig?.key === 'available' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                      </th>
                      <th style={{ padding: '1rem', textAlign: 'right' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedUsers.map(user => {
                      const stats = getUserVacationStats(user);
                      const daysThisYear = getDaysGrantedThisYear(user.hireDate);
                      return (
                        <tr key={user.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td data-label="Empleado" style={{ padding: '1rem', fontWeight: '500' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span>{user.name}</span>
                              <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 'normal' }}>{user.email}</span>
                            </div>
                          </td>
                          <td data-label="Ingreso" style={{ padding: '1rem', color: '#475569' }}>
                            {user.hireDate ? new Date(user.hireDate).toLocaleDateString('es-MX', { timeZone: timezone }) : 'No registrada'}
                          </td>
                          <td data-label="Base Inicial" style={{ padding: '1rem', textAlign: 'center', color: '#475569' }}>
                            {user.initialVacationDays || 0} días
                          </td>
                          <td data-label="Acumulado Ley" style={{ padding: '1rem', textAlign: 'center', color: '#475569' }}>
                            {stats.lawVacationDays} días
                          </td>
                          <td data-label="Ley este Año" style={{ padding: '1rem', textAlign: 'center', color: 'var(--caanma-primary)', fontWeight: 'bold' }}>
                            {daysThisYear} días
                          </td>
                          <td data-label="Total" style={{ padding: '1rem', textAlign: 'center', color: '#475569', fontWeight: 'bold' }}>
                            {stats.totalVacationDays}
                          </td>
                          <td data-label="Gozadas" style={{ padding: '1rem', textAlign: 'center', color: '#64748b' }}>
                            {stats.usedVacationDays}
                          </td>
                          <td data-label="Disponibles" style={{ padding: '1rem', textAlign: 'center' }}>
                            <span style={{ 
                              padding: '0.25rem 0.5rem', 
                              borderRadius: '9999px', 
                              fontSize: '0.85rem',
                              fontWeight: '600',
                              backgroundColor: stats.availableVacationDays > 0 ? '#dcfce7' : '#f1f5f9',
                              color: stats.availableVacationDays > 0 ? '#15803d' : '#475569'
                            }}>
                              {stats.availableVacationDays} días
                            </span>
                          </td>
                          <td data-label="Acciones" style={{ padding: '1rem', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                              <button 
                                onClick={() => setSelectedUserForHistory(user)} 
                                style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', backgroundColor: '#e0f2fe', color: '#0369a1', border: 'none', padding: '0.35rem 0.65rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '500' }}
                              >
                                <Calendar size={14} /> Ver Historial
                              </button>
                              <button 
                                onClick={() => {
                                  setSelectedUserForEdit(user);
                                  setAdjustingInitialDays(user.initialVacationDays || 0);
                                  setAdjustingStartDate(user.vacationStartDate ? new Date(user.vacationStartDate).toISOString().split('T')[0] : '');
                                }} 
                                style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', backgroundColor: '#f1f5f9', color: '#334155', border: 'none', padding: '0.35rem 0.65rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '500' }}
                              >
                                <Edit2 size={14} /> Ajustar Saldo
                              </button>
                            </div>
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

      {/* Existing Edit Request Modal */}
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

      {/* Modal: Employee leaves history */}
      {selectedUserForHistory && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '650px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1e293b' }}>Historial de Vacaciones y Permisos</h2>
                <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>{selectedUserForHistory.name}</p>
              </div>
              <button onClick={() => setSelectedUserForHistory(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} color="#64748b" /></button>
            </div>

            {/* Vacation stats summary inside modal */}
            <div style={{ padding: '1rem 1.5rem', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', textAlign: 'center' }}>
              <div style={{ backgroundColor: 'white', padding: '0.5rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <span style={{ display: 'block', fontSize: '0.8rem', color: '#64748b' }}>Saldo Total</span>
                <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#1e293b' }}>{getUserVacationStats(selectedUserForHistory).totalVacationDays} días</span>
              </div>
              <div style={{ backgroundColor: 'white', padding: '0.5rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <span style={{ display: 'block', fontSize: '0.8rem', color: '#64748b' }}>Gozadas (Aprobadas)</span>
                <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#475569' }}>{getUserVacationStats(selectedUserForHistory).usedVacationDays} días</span>
              </div>
              <div style={{ backgroundColor: 'white', padding: '0.5rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <span style={{ display: 'block', fontSize: '0.8rem', color: '#64748b' }}>Disponibles</span>
                <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#16a34a' }}>{getUserVacationStats(selectedUserForHistory).availableVacationDays} días</span>
              </div>
            </div>
            
            <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
              {selectedUserForHistory.leaveRequests.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                  <Calendar size={36} style={{ margin: '0 auto 0.75rem auto', opacity: 0.5 }} />
                  <p>No se registran trámites ni vacaciones para este empleado.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {selectedUserForHistory.leaveRequests.map((req: any) => {
                    const diffTime = Math.abs(new Date(req.endDate).getTime() - new Date(req.startDate).getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                    return (
                      <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #f1f5f9', backgroundColor: '#fafafa' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontWeight: '600', fontSize: '0.95rem', color: '#1e293b' }}>{typeLabels[req.type] || req.type}</span>
                            <span style={{ fontSize: '0.8rem', padding: '0.1rem 0.4rem', borderRadius: '4px', backgroundColor: '#e0f2fe', color: '#0369a1', fontWeight: '500' }}>{diffDays} {diffDays === 1 ? 'díe' : 'días'}</span>
                          </div>
                          <span style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem' }}>
                            Del {new Date(req.startDate).toLocaleDateString('es-MX', { timeZone: timezone })} al {new Date(req.endDate).toLocaleDateString('es-MX', { timeZone: timezone })}
                          </span>
                          {req.notes && (
                            <span style={{ display: 'block', fontSize: '0.8rem', color: '#475569', fontStyle: 'italic', marginTop: '0.25rem' }}>
                              Nota: "{req.notes}"
                            </span>
                          )}
                        </div>
                        <div>
                          {req.status === 'PENDING' && <span style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem', borderRadius: '4px', backgroundColor: '#fef3c7', color: '#d97706', fontWeight: '500' }}>Pendiente</span>}
                          {req.status === 'APPROVED' && <span style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem', borderRadius: '4px', backgroundColor: '#dcfce7', color: '#15803d', fontWeight: '500' }}>Aprobado</span>}
                          {req.status === 'REJECTED' && <span style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem', borderRadius: '4px', backgroundColor: '#fee2e2', color: '#ef4444', fontWeight: '500' }}>Rechazado</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setSelectedUserForHistory(null)} style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: 'white', cursor: 'pointer', fontWeight: '500' }}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Adjust employee baseline settings */}
      {selectedUserForEdit && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '420px' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1e293b' }}>Ajustar Saldo de Vacaciones</h2>
                <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>{selectedUserForEdit.name}</p>
              </div>
              <button onClick={() => setSelectedUserForEdit(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} color="#64748b" /></button>
            </div>

            <form onSubmit={handleUpdateSettings} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 'bold', color: '#475569' }}>Días Iniciales (Base)</label>
                <input 
                  type="number" 
                  value={adjustingInitialDays}
                  onChange={(e) => setAdjustingInitialDays(parseInt(e.target.value, 10) || 0)}
                  className="caanma-input"
                  min="0"
                  required
                />
                <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginTop: '0.25rem' }}>
                  Días acumulados históricos previos a la fecha de inicio.
                </span>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 'bold', color: '#475569' }}>Fecha de Inicio de Vacaciones (Corte)</label>
                <input 
                  type="date" 
                  value={adjustingStartDate}
                  onChange={(e) => setAdjustingStartDate(e.target.value)}
                  className="caanma-input"
                />
                <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginTop: '0.25rem' }}>
                  Fecha a partir de la cual empezarán a acumularse días de ley. Dejar en blanco para acumular desde la contratación.
                </span>
              </div>

              <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setSelectedUserForEdit(null)} style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: 'white', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" disabled={isUpdatingSettings} style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', backgroundColor: '#0284c7', color: 'white', fontWeight: 'bold', cursor: 'pointer', opacity: isUpdatingSettings ? 0.7 : 1 }}>
                  {isUpdatingSettings ? 'Guardando...' : 'Guardar Ajustes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
