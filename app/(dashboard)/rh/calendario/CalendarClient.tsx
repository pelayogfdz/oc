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
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday start
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const dateFormat = "MMMM yyyy";
  const days = eachDayOfInterval({ start: startDate, end: endDate });

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
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#1e293b' }}>Calendario de Incidencias</h1>
          <p style={{ color: 'var(--pulpos-text-muted)' }}>Gestiona faltas, vacaciones y permisos del personal.</p>
        </div>
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
            padding: '0.5rem 1rem',
            backgroundColor: '#10b981',
            color: 'white',
            borderRadius: '8px',
            border: 'none',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: 'pointer'
          }}
        >
          <Plus size={18} /> Nueva Incidencia
        </button>
      </div>

      {/* Calendar Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', backgroundColor: 'white', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', textTransform: 'capitalize', margin: 0 }}>
          {format(currentDate, dateFormat, { locale: es })}
        </h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={prevMonth} style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: 'white', cursor: 'pointer' }}>
            <ChevronLeft size={20} />
          </button>
          <button onClick={today} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: 'white', cursor: 'pointer', fontWeight: '500' }}>
            Hoy
          </button>
          <button onClick={nextMonth} style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: 'white', cursor: 'pointer' }}>
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
        {/* Days of week */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
          {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
            <div key={day} style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold', color: '#64748b', fontSize: '0.875rem' }}>
              {day}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {days.map((day, i) => {
            const isCurrentMonth = isSameMonth(day, monthStart);
            const isToday = isSameDay(day, new Date());
            const dayIncidents = getIncidentsForDay(day);

            return (
              <div 
                key={day.toString()} 
                onClick={() => handleDayClick(day)}
                style={{
                  minHeight: '120px',
                  padding: '0.5rem',
                  borderRight: (i + 1) % 7 !== 0 ? '1px solid #e2e8f0' : 'none',
                  borderBottom: i < days.length - 7 ? '1px solid #e2e8f0' : 'none',
                  backgroundColor: isCurrentMonth ? 'white' : '#f8fafc',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = isCurrentMonth ? '#f1f5f9' : '#e2e8f0'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = isCurrentMonth ? 'white' : '#f8fafc'}
              >
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
                  <span style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    width: '24px', height: '24px', 
                    borderRadius: '50%', 
                    backgroundColor: isToday ? '#2563eb' : 'transparent',
                    color: isToday ? 'white' : (isCurrentMonth ? '#334155' : '#94a3b8'),
                    fontWeight: isToday ? 'bold' : 'normal',
                    fontSize: '0.875rem'
                  }}>
                    {format(day, 'd')}
                  </span>
                </div>
                
                {/* Render Incidents */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  {dayIncidents.map(inc => {
                    const typeInfo = INCIDENT_TYPES[inc.type] || { label: inc.type, color: '#64748b', bg: '#f1f5f9' };
                    // Extra logic for styling pending requests
                    const isPending = inc.status === 'PENDING';
                    
                    return (
                      <div 
                        key={inc.id}
                        onClick={(e) => handleIncidentClick(inc, e)}
                        title={`${inc.user?.name} - ${typeInfo.label} ${isPending ? '(Pendiente)' : ''} (Haz clic para editar/eliminar)`}
                        style={{
                          fontSize: '0.7rem',
                          padding: '0.125rem 0.25rem',
                          borderRadius: '4px',
                          backgroundColor: isPending ? '#fffbeb' : typeInfo.bg,
                          color: typeInfo.color,
                          border: `1px solid ${isPending ? '#fcd34d' : 'transparent'}`,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          fontWeight: '500',
                          cursor: 'pointer',
                          transition: 'filter 0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.filter = 'brightness(0.9)'}
                        onMouseLeave={e => e.currentTarget.style.filter = 'none'}
                      >
                        {inc.user?.name?.split(' ')[0]} - {typeInfo.label}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
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
