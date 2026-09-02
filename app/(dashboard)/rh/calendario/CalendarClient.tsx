'use client';

import { useState } from 'react';
import { 
  format, addMonths, subMonths, startOfMonth, endOfMonth, 
  eachDayOfInterval, isSameMonth, isSameDay, startOfWeek, endOfWeek 
} from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import { createIncidentAdmin, updateIncidentAdmin, deleteIncidentAdmin } from '@/app/actions/hr';

const INCIDENT_TYPES: Record<string, { label: string, color: string, bg: string }> = {
  FALTA: { label: 'Falta', color: '#ef4444', bg: '#fef2f2' },
  RETARDO: { label: 'Retardo', color: '#f59e0b', bg: '#fffbeb' },
  VACATION: { label: 'Vacaciones', color: '#3b82f6', bg: '#eff6ff' },
  SICK_LEAVE: { label: 'Incapacidad', color: '#8b5cf6', bg: '#f5f3ff' },
  PAID_LEAVE: { label: 'Permiso (Pagado)', color: '#10b981', bg: '#ecfdf5' },
  UNPAID_LEAVE: { label: 'Permiso (Sin goce)', color: '#64748b', bg: '#f8fafc' },
  PATERNITY_LEAVE: { label: 'Paternidad/Maternidad', color: '#ec4899', bg: '#fdf2f8' }
};

export default function CalendarClient({ employees, initialIncidents }: { employees: any[], initialIncidents: any[] }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingIncidentId, setEditingIncidentId] = useState<string | null>(null);
  
  const [weekStartsOn, setWeekStartsOn] = useState<0 | 1>(1); // Default to Monday (1)
  
  // Form State
  const [formData, setFormData] = useState({
    userId: '',
    type: 'FALTA',
    startDate: '',
    endDate: '',
    reason: ''
  });

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const today = () => setCurrentDate(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn });
  const endDate = endOfWeek(monthEnd, { weekStartsOn });

  const dateFormat = "MMMM yyyy";
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const dayHeaders = weekStartsOn === 1 
    ? ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
    : ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  const handleDayClick = (day: Date) => {
    setEditingIncidentId(null);
    setSelectedDate(day);
    setFormData({
      userId: '',
      type: 'FALTA',
      startDate: format(day, 'yyyy-MM-dd'),
      endDate: format(day, 'yyyy-MM-dd'),
      reason: ''
    });
    setIsModalOpen(true);
  };

  const handleIncidentClick = (inc: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingIncidentId(inc.id);
    const dStart = new Date(inc.startDate);
    setSelectedDate(new Date(dStart.getUTCFullYear(), dStart.getUTCMonth(), dStart.getUTCDate()));
    
    // safe date string extraction (offset-agnostic using UTC)
    const formatDateObj = (d: any) => {
      const date = new Date(d);
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    setFormData({
      userId: inc.userId,
      type: inc.type,
      startDate: formatDateObj(inc.startDate),
      endDate: formatDateObj(inc.endDate),
      reason: inc.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleDeleteIncident = async () => {
    if (!editingIncidentId) return;
    if (!confirm("¿Estás seguro de que deseas eliminar esta incidencia?")) return;
    
    setIsSubmitting(true);
    try {
      await deleteIncidentAdmin(editingIncidentId);
      setIsModalOpen(false);
      setEditingIncidentId(null);
    } catch (error: any) {
      alert(error.message || "Error al eliminar la incidencia");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.userId) {
      alert("Selecciona un empleado");
      return;
    }
    
    setIsSubmitting(true);
    try {
      if (editingIncidentId) {
        await updateIncidentAdmin(editingIncidentId, {
          userId: formData.userId,
          type: formData.type,
          startDate: formData.startDate,
          endDate: formData.endDate,
          reason: formData.reason
        });
      } else {
        await createIncidentAdmin({
          userId: formData.userId,
          type: formData.type,
          startDate: formData.startDate,
          endDate: formData.endDate,
          reason: formData.reason
        });
      }
      setIsModalOpen(false);
      setEditingIncidentId(null);
      setFormData({ userId: '', type: 'FALTA', startDate: '', endDate: '', reason: '' });
    } catch (error: any) {
      alert(error.message || "Error al guardar la incidencia");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to find incidents for a specific day
  const getIncidentsForDay = (day: Date) => {
    return initialIncidents.filter(inc => {
      const dStart = new Date(inc.startDate);
      const dEnd = new Date(inc.endDate);
      // Construct local dates using UTC components of stored date
      const incStart = new Date(dStart.getUTCFullYear(), dStart.getUTCMonth(), dStart.getUTCDate(), 0, 0, 0, 0);
      const incEnd = new Date(dEnd.getUTCFullYear(), dEnd.getUTCMonth(), dEnd.getUTCDate(), 23, 59, 59, 999);
      return day >= incStart && day <= incEnd;
    });
  };

  return (
    <div style={{ maxWidth: '1300px', margin: '0 auto', padding: '1rem', width: '100%', boxSizing: 'border-box' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>Calendario de Incidencias</h1>
          <p style={{ color: 'var(--caanma-text-muted)', margin: '0.25rem 0 0 0' }}>Gestiona faltas, vacaciones y permisos del personal.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button 
            onClick={() => {
              setEditingIncidentId(null);
              setSelectedDate(new Date());
              setFormData({
                userId: '',
                type: 'FALTA',
                startDate: format(new Date(), 'yyyy-MM-dd'),
                endDate: format(new Date(), 'yyyy-MM-dd'),
                reason: ''
              });
              setIsModalOpen(true);
            }}
            style={{
              padding: '0.55rem 1.1rem',
              backgroundColor: '#10b981',
              color: 'white',
              borderRadius: '8px',
              border: 'none',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)'
            }}
          >
            <Plus size={18} /> Nueva Incidencia
          </button>
        </div>
      </div>

      {/* Calendar Controls & View Options */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', backgroundColor: 'white', padding: '0.85rem 1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 style={{ fontSize: '1.35rem', fontWeight: 'bold', textTransform: 'capitalize', margin: 0, color: '#0f172a' }}>
          {format(currentDate, dateFormat, { locale: es })}
        </h2>
        
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Week Start Toggle */}
          <div style={{ display: 'flex', backgroundColor: '#f1f5f9', padding: '3px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
            <button
              onClick={() => setWeekStartsOn(1)}
              style={{
                padding: '0.35rem 0.75rem',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: weekStartsOn === 1 ? 'bold' : 'normal',
                backgroundColor: weekStartsOn === 1 ? 'white' : 'transparent',
                color: weekStartsOn === 1 ? '#0f172a' : '#64748b',
                boxShadow: weekStartsOn === 1 ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              Lun - Dom (Laboral)
            </button>
            <button
              onClick={() => setWeekStartsOn(0)}
              style={{
                padding: '0.35rem 0.75rem',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: weekStartsOn === 0 ? 'bold' : 'normal',
                backgroundColor: weekStartsOn === 0 ? 'white' : 'transparent',
                color: weekStartsOn === 0 ? '#0f172a' : '#64748b',
                boxShadow: weekStartsOn === 0 ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              Dom - Sáb
            </button>
          </div>

          <div style={{ display: 'flex', gap: '0.35rem' }}>
            <button onClick={prevMonth} title="Mes Anterior" style={{ padding: '0.45rem 0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ChevronLeft size={18} />
            </button>
            <button onClick={today} style={{ padding: '0.45rem 0.9rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: 'white', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}>
              Hoy
            </button>
            <button onClick={nextMonth} title="Mes Siguiente" style={{ padding: '0.45rem 0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Incident Types Legend */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem', padding: '0.6rem 1rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.8rem' }}>
        <span style={{ fontWeight: 'bold', color: '#475569' }}>Tipos:</span>
        {Object.entries(INCIDENT_TYPES).map(([key, info]) => (
          <span key={key} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#334155' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: info.color }} />
            {info.label}
          </span>
        ))}
      </div>

      {/* Calendar Grid Wrapper with Full Horizontal Protection */}
      <div style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', overflowX: 'auto', WebkitOverflowScrolling: 'touch', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', width: '100%' }}>
        <div style={{ minWidth: '780px' }}>
          {/* Days of week */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
            {dayHeaders.map((day, idx) => (
              <div 
                key={day} 
                style={{ 
                  padding: '0.75rem 0.5rem', 
                  textAlign: 'center', 
                  fontWeight: 'bold', 
                  color: (weekStartsOn === 1 ? idx >= 5 : (idx === 0 || idx === 6)) ? '#0284c7' : '#475569', 
                  fontSize: '0.875rem' 
                }}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
            {days.map((day, i) => {
              const isCurrentMonth = isSameMonth(day, monthStart);
              const isToday = isSameDay(day, new Date());
              const dayIncidents = getIncidentsForDay(day);

              return (
                <div 
                  key={day.toString()} 
                  onClick={() => handleDayClick(day)}
                  style={{
                    minHeight: '125px',
                    padding: '0.5rem',
                    minWidth: 0,
                    overflow: 'hidden',
                    borderRight: (i + 1) % 7 !== 0 ? '1px solid #e2e8f0' : 'none',
                    borderBottom: i < days.length - 7 ? '1px solid #e2e8f0' : 'none',
                    backgroundColor: isCurrentMonth ? 'white' : '#f8fafc',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'background-color 0.15s ease'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = isCurrentMonth ? '#f1f5f9' : '#e2e8f0'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = isCurrentMonth ? 'white' : '#f8fafc'}
                >
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.4rem' }}>
                    <span style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      width: '24px', height: '24px', 
                      borderRadius: '50%', 
                      backgroundColor: isToday ? '#2563eb' : 'transparent',
                      color: isToday ? 'white' : (isCurrentMonth ? '#334155' : '#94a3b8'),
                      fontWeight: isToday ? 'bold' : 'normal',
                      fontSize: '0.85rem'
                    }}>
                      {format(day, 'd')}
                    </span>
                  </div>
                  
                  {/* Render Incidents */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: 0 }}>
                    {dayIncidents.slice(0, 4).map(inc => {
                      const typeInfo = INCIDENT_TYPES[inc.type] || { label: inc.type, color: '#64748b', bg: '#f1f5f9' };
                      const isPending = inc.status === 'PENDING';
                      
                      return (
                        <div 
                          key={inc.id}
                          onClick={(e) => handleIncidentClick(inc, e)}
                          title={`${inc.user?.name} - ${typeInfo.label} ${isPending ? '(Pendiente)' : ''}\n${inc.notes || ''}\n(Haz clic para editar/eliminar)`}
                          style={{
                            fontSize: '0.72rem',
                            padding: '0.2rem 0.35rem',
                            borderRadius: '4px',
                            backgroundColor: isPending ? '#fffbeb' : typeInfo.bg,
                            color: typeInfo.color,
                            border: `1px solid ${isPending ? '#fcd34d' : 'transparent'}`,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                            minWidth: 0,
                            display: 'block'
                          }}
                          onMouseEnter={e => e.currentTarget.style.filter = 'brightness(0.92)'}
                          onMouseLeave={e => e.currentTarget.style.filter = 'none'}
                        >
                          {inc.user?.name?.split(' ')[0]} - {typeInfo.label}
                        </div>
                      );
                    })}
                    {dayIncidents.length > 4 && (
                      <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 'bold', paddingLeft: '0.2rem' }}>
                        +{dayIncidents.length - 4} más...
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Add Incident Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', width: '100%', maxWidth: '500px', padding: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>
                {editingIncidentId ? 'Editar Incidencia' : 'Registrar Incidencia'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} color="#64748b" /></button>
            </div>
            
            <form onSubmit={handleSaveIncident} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.25rem' }}>Empleado</label>
                <select 
                  required
                  value={formData.userId}
                  onChange={e => setFormData({...formData, userId: e.target.value})}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                >
                  <option value="">Seleccione un empleado...</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.25rem' }}>Tipo de Incidencia</label>
                <select 
                  required
                  value={formData.type}
                  onChange={e => setFormData({...formData, type: e.target.value})}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                >
                  {Object.entries(INCIDENT_TYPES).map(([key, info]) => (
                    <option key={key} value={key}>{info.label}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.25rem' }}>Fecha Inicio</label>
                  <input 
                    type="date" 
                    required
                    value={formData.startDate}
                    onChange={e => setFormData({...formData, startDate: e.target.value})}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.25rem' }}>Fecha Fin</label>
                  <input 
                    type="date" 
                    required
                    value={formData.endDate}
                    onChange={e => setFormData({...formData, endDate: e.target.value})}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.25rem' }}>Motivo / Notas (Opcional)</label>
                <textarea 
                  value={formData.reason}
                  onChange={e => setFormData({...formData, reason: e.target.value})}
                  rows={3}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', marginTop: '0.5rem' }}>
                {editingIncidentId ? (
                  <button 
                    type="button" 
                    onClick={handleDeleteIncident}
                    disabled={isSubmitting}
                    style={{ padding: '0.5rem 1rem', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', marginRight: 'auto' }}
                  >
                    Eliminar
                  </button>
                ) : <div />}
                
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    style={{ padding: '0.5rem 1rem', backgroundColor: 'transparent', color: '#64748b', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    style={{ padding: '0.5rem 1.5rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', opacity: isSubmitting ? 0.7 : 1 }}
                  >
                    {isSubmitting ? 'Guardando...' : 'Guardar Incidencia'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
