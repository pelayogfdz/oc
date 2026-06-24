'use client';

import { useState, useMemo, useEffect } from 'react';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Search, 
  Clock, 
  User, 
  Phone, 
  Mail, 
  FileText, 
  Trash2, 
  Check, 
  X, 
  MapPin,
  AlertCircle
} from 'lucide-react';
import { 
  getAppointments, 
  createAppointment, 
  updateAppointment, 
  deleteAppointment 
} from '@/app/actions/citas';
import toast, { Toaster } from 'react-hot-toast';

interface AppointmentData {
  id: string;
  title: string;
  notes: string | null;
  scheduledAt: string; // ISO string
  duration: number;
  customerId: string | null;
  userId: string | null;
  clientName: string | null;
  clientPhone: string | null;
  clientEmail: string | null;
  status: string;
  branchId: string;
  customer?: { id: string; name: string; phone: string | null; email: string | null } | null;
  user?: { id: string; name: string } | null;
  branch?: { id: string; name: string } | null;
}

interface CitasClientProps {
  initialAppointments: AppointmentData[];
  resources: {
    customers: Array<{ id: string; name: string; phone: string | null; email: string | null }>;
    users: Array<{ id: string; name: string }>;
    branches: Array<{ id: string; name: string }>;
  };
  initialBranchId: string;
}

export default function CitasClient({ initialAppointments, resources, initialBranchId }: CitasClientProps) {
  const [appointments, setAppointments] = useState<AppointmentData[]>(initialAppointments);
  const [branchId, setBranchId] = useState(initialBranchId);
  const [selectedSpecialist, setSelectedSpecialist] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentData | null>(null);
  
  // Form states
  const [formId, setFormId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formTime, setFormTime] = useState('');
  const [formDuration, setFormDuration] = useState(30);
  const [formCustomerId, setFormCustomerId] = useState<string>('');
  const [formSpecialistId, setFormSpecialistId] = useState<string>('');
  const [formBranchId, setFormBranchId] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formClientName, setFormClientName] = useState('');
  const [formClientPhone, setFormClientPhone] = useState('');
  const [formClientEmail, setFormClientEmail] = useState('');
  const [isManualCustomer, setIsManualCustomer] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);

  // Load appointments when branchId changes
  const refreshAppointments = async (bId: string) => {
    try {
      const data = await getAppointments(bId);
      setAppointments(data as AppointmentData[]);
    } catch (error) {
      toast.error('Error al cargar las citas.');
      console.error(error);
    }
  };

  useEffect(() => {
    refreshAppointments(branchId);
  }, [branchId]);

  // Set default branch in form if not set
  useEffect(() => {
    if (resources.branches.length > 0 && !formBranchId) {
      setFormBranchId(branchId === 'ALL' ? resources.branches[0].id : branchId);
    }
  }, [branchId, resources.branches]);

  // Date constants & calculations
  const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  // Helper: Format time string from date
  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    const h = d.getHours().toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  };

  // Helper: Format date readable
  const formatDateReadable = (isoString: string) => {
    const d = new Date(isoString);
    return `${d.getDate()} de ${months[d.getMonth()]}, ${d.getFullYear()}`;
  };

  // Filter appointments on screen
  const filteredAppointments = useMemo(() => {
    return appointments.filter(app => {
      const matchSpecialist = selectedSpecialist === 'ALL' || app.userId === selectedSpecialist;
      
      const title = app.title.toLowerCase();
      const cName = (app.customer?.name || app.clientName || '').toLowerCase();
      const cPhone = (app.customer?.phone || app.clientPhone || '').toLowerCase();
      const sName = (app.user?.name || '').toLowerCase();
      const notes = (app.notes || '').toLowerCase();
      const query = searchQuery.toLowerCase();

      const matchSearch = !searchQuery || 
        title.includes(query) || 
        cName.includes(query) || 
        cPhone.includes(query) || 
        sName.includes(query) ||
        notes.includes(query);

      return matchSpecialist && matchSearch;
    });
  }, [appointments, selectedSpecialist, searchQuery]);

  // Calendar dates generation
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // First day of current month
    const firstDay = new Date(year, month, 1);
    const startDayIndex = firstDay.getDay(); // Sunday=0, Monday=1, ...

    // Total days in current month
    const totalDays = new Date(year, month + 1, 0).getDate();

    // Days from previous month for padding
    const prevMonthDays = new Date(year, month, 0).getDate();

    const days = [];

    // Add padding from previous month
    for (let i = startDayIndex - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthDays - i),
        isCurrentMonth: false
      });
    }

    // Add current month days
    for (let i = 1; i <= totalDays; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true
      });
    }

    // Add padding for next month to make grid perfect 6-weeks (42 items)
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false
      });
    }

    return days;
  }, [currentDate]);

  // Week view days (7 days Sunday to Saturday)
  const weekDays = useMemo(() => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay()); // Go to Sunday of current week
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    return days;
  }, [currentDate]);

  // Hour slots for Week & Day views: 7:00 AM to 9:00 PM (14 hours)
  const hourSlots = useMemo(() => {
    const slots = [];
    for (let i = 7; i <= 21; i++) {
      slots.push(i);
    }
    return slots;
  }, []);

  // Filtered customer options for select autocompletion
  const filteredCustomers = useMemo(() => {
    if (!customerSearchTerm) return resources.customers.slice(0, 10);
    const term = customerSearchTerm.toLowerCase();
    return resources.customers.filter(c => 
      c.name.toLowerCase().includes(term) || 
      (c.phone && c.phone.toLowerCase().includes(term)) ||
      (c.email && c.email.toLowerCase().includes(term))
    );
  }, [resources.customers, customerSearchTerm]);

  // Navigation handlers
  const handlePrev = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') {
      newDate.setMonth(currentDate.getMonth() - 1);
    } else if (viewMode === 'week') {
      newDate.setDate(currentDate.getDate() - 7);
    } else {
      newDate.setDate(currentDate.getDate() - 1);
    }
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') {
      newDate.setMonth(currentDate.getMonth() + 1);
    } else if (viewMode === 'week') {
      newDate.setDate(currentDate.getDate() + 7);
    } else {
      newDate.setDate(currentDate.getDate() + 1);
    }
    setCurrentDate(newDate);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Open modal to create appointment
  const handleNewAppointment = (date?: Date, hour?: number) => {
    setFormId(null);
    setFormTitle('');
    
    // Set default date/time
    const now = date ? new Date(date) : new Date();
    setFormDate(now.toISOString().split('T')[0]);
    
    if (hour !== undefined) {
      setFormTime(`${hour.toString().padStart(2, '0')}:00`);
    } else {
      const currentHour = now.getHours().toString().padStart(2, '0');
      const currentMin = (Math.ceil(now.getMinutes() / 15) * 15 % 60).toString().padStart(2, '0');
      setFormTime(`${currentHour}:${currentMin}`);
    }

    setFormDuration(30);
    setFormCustomerId('');
    setCustomerSearchTerm('');
    setFormSpecialistId(resources.users.length > 0 ? resources.users[0].id : '');
    setFormBranchId(branchId === 'ALL' ? (resources.branches[0]?.id || '') : branchId);
    setFormNotes('');
    setFormClientName('');
    setFormClientPhone('');
    setFormClientEmail('');
    setIsManualCustomer(false);
    setIsModalOpen(true);
  };

  // Open modal to edit appointment
  const handleEditAppointment = (app: AppointmentData) => {
    setFormId(app.id);
    setFormTitle(app.title);
    
    const d = new Date(app.scheduledAt);
    setFormDate(d.toISOString().split('T')[0]);
    setFormTime(`${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`);
    setFormDuration(app.duration);
    setFormCustomerId(app.customerId || '');
    
    if (app.customerId) {
      const matched = resources.customers.find(c => c.id === app.customerId);
      setCustomerSearchTerm(matched ? matched.name : '');
      setIsManualCustomer(false);
    } else {
      setFormClientName(app.clientName || '');
      setFormClientPhone(app.clientPhone || '');
      setFormClientEmail(app.clientEmail || '');
      setIsManualCustomer(true);
    }
    
    setFormSpecialistId(app.userId || '');
    setFormBranchId(app.branchId);
    setFormNotes(app.notes || '');
    setIsDetailOpen(false);
    setIsModalOpen(true);
  };

  // Open appointment details
  const handleViewDetails = (app: AppointmentData) => {
    setSelectedAppointment(app);
    setIsDetailOpen(true);
  };

  // Submit appointment form
  const handleSaveAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle) {
      toast.error('Por favor, ingresa el título o servicio.');
      return;
    }
    if (!formBranchId) {
      toast.error('Por favor, selecciona una sucursal.');
      return;
    }
    if (isManualCustomer && !formClientName) {
      toast.error('Por favor, ingresa el nombre del cliente.');
      return;
    }
    if (!isManualCustomer && !formCustomerId) {
      toast.error('Por favor, selecciona un cliente del catálogo.');
      return;
    }

    const scheduledAtStr = `${formDate}T${formTime}:00`;
    
    const payload = {
      title: formTitle,
      notes: formNotes,
      scheduledAt: scheduledAtStr,
      duration: formDuration,
      customerId: isManualCustomer ? undefined : formCustomerId,
      userId: formSpecialistId || undefined,
      clientName: isManualCustomer ? formClientName : undefined,
      clientPhone: isManualCustomer ? formClientPhone : undefined,
      clientEmail: isManualCustomer ? formClientEmail : undefined,
      branchId: formBranchId
    };

    try {
      if (formId) {
        await updateAppointment(formId, payload);
        toast.success('Cita actualizada exitosamente.');
      } else {
        await createAppointment(payload);
        toast.success('Cita agendada exitosamente.');
      }
      setIsModalOpen(false);
      refreshAppointments(branchId);
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar la cita.');
    }
  };

  // Change appointment status from details
  const handleChangeStatus = async (id: string, status: string) => {
    try {
      await updateAppointment(id, { status });
      toast.success(`Cita marcada como ${status === 'CONFIRMED' ? 'Confirmada' : status === 'COMPLETED' ? 'Completada' : 'Cancelada'}.`);
      setIsDetailOpen(false);
      refreshAppointments(branchId);
    } catch (err: any) {
      toast.error(err.message || 'Error al cambiar estatus.');
    }
  };

  // Delete appointment
  const handleDeleteAppointment = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta cita?')) return;
    try {
      await deleteAppointment(id);
      toast.success('Cita eliminada correctamente.');
      setIsDetailOpen(false);
      refreshAppointments(branchId);
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar cita.');
    }
  };

  // Helper to get status pill styling
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return { bg: '#dcfce7', text: '#16a34a', border: '#bbf7d0', name: 'Confirmada' };
      case 'COMPLETED':
        return { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe', name: 'Completada' };
      case 'CANCELLED':
        return { bg: '#f1f5f9', text: '#64748b', border: '#e2e8f0', name: 'Cancelada' };
      case 'PENDING':
      default:
        return { bg: '#fef9c3', text: '#ca8a04', border: '#fef08a', name: 'Pendiente' };
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', fontFamily: 'var(--font-geist-sans)' }}>
      <Toaster position="top-right" />
      
      {/* Dynamic CSS injecting styles for grid positioning, custom scrollbars, and microanimations */}
      <style>{`
        .calendar-grid-cell {
          aspect-ratio: 1.2;
          border-right: 1px solid #e2e8f0;
          border-bottom: 1px solid #e2e8f0;
          padding: 0.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          min-height: 90px;
          background-color: white;
          transition: background-color 0.1s ease;
          position: relative;
        }
        .calendar-grid-cell:hover {
          background-color: #f8fafc;
        }
        .calendar-grid-cell.inactive {
          background-color: #f1f5f9;
          color: #94a3b8;
        }
        .calendar-event-pill {
          padding: 0.2rem 0.4rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: bold;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.25rem;
          border-width: 1px;
          border-style: solid;
          box-shadow: 0 1px 2px rgba(0,0,0,0.03);
          transition: transform 0.1s ease;
        }
        .calendar-event-pill:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 6px rgba(0,0,0,0.05);
        }
        .time-grid-row {
          display: grid;
          grid-template-columns: 80px repeat(7, 1fr);
          border-bottom: 1px solid #e2e8f0;
          min-height: 60px;
          position: relative;
        }
        .time-grid-row.day-view {
          grid-template-columns: 80px 1fr;
          min-height: 70px;
        }
        .time-slot-cell {
          border-right: 1px solid #e2e8f0;
          position: relative;
          cursor: pointer;
        }
        .time-slot-cell:hover {
          background-color: rgba(37, 99, 235, 0.02);
        }
        .event-box-week {
          position: absolute;
          left: 4px;
          right: 4px;
          border-radius: 6px;
          padding: 0.4rem;
          font-size: 0.75rem;
          font-weight: bold;
          overflow: hidden;
          cursor: pointer;
          border-width: 1px;
          border-style: solid;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
          display: flex;
          flex-direction: column;
          gap: 0.1rem;
          z-index: 10;
        }
        .event-box-week:hover {
          z-index: 20;
          box-shadow: 0 8px 16px rgba(0,0,0,0.1);
        }
        /* Custom scrollbars */
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        ::-webkit-scrollbar-track {
          background: #f1f5f9;
        }
        ::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>

      {/* Header Module */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            📅 Control de Citas y Calendario
          </h1>
          <p style={{ color: 'var(--caanma-text-muted)' }}>
            Gestiona la agenda de clientes, especialistas y servicios de tu negocio en tiempo real.
          </p>
        </div>
        <button 
          onClick={() => handleNewAppointment()}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            backgroundColor: '#2563eb', 
            color: 'white', 
            border: 'none', 
            padding: '0.65rem 1.25rem', 
            borderRadius: '8px', 
            fontWeight: 'bold', 
            cursor: 'pointer', 
            boxShadow: '0 4px 6px rgba(37, 99, 235, 0.2)',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor='#1d4ed8'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor='#2563eb'}
        >
          <Plus size={18} /> Agendar Cita
        </button>
      </div>

      {/* Control / Filter Bar */}
      <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
          
          {/* Sucursal filter - visible if Global */}
          {initialBranchId === 'ALL' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#475569' }}>Sucursal</label>
              <select 
                value={branchId}
                onChange={e => setBranchId(e.target.value)}
                style={{ padding: '0.45rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
              >
                <option value="ALL">Todas las Sucursales</option>
                {resources.branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Specialist filter */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#475569' }}>Especialista / Empleado</label>
            <select 
              value={selectedSpecialist}
              onChange={e => setSelectedSpecialist(e.target.value)}
              style={{ padding: '0.45rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
            >
              <option value="ALL">Todos los Especialistas</option>
              {resources.users.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>

          {/* Search query */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#475569' }}>Buscar</label>
            <div style={{ position: 'relative' }}>
              <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="text"
                placeholder="Cliente, servicio, notas..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ padding: '0.45rem 0.75rem 0.45rem 1.8rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', width: '200px' }}
              />
            </div>
          </div>
        </div>

        {/* View toggle */}
        <div style={{ display: 'flex', backgroundColor: '#f1f5f9', padding: '0.25rem', borderRadius: '8px' }}>
          <button 
            onClick={() => setViewMode('month')}
            style={{ padding: '0.35rem 0.75rem', borderRadius: '6px', border: 'none', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', backgroundColor: viewMode === 'month' ? 'white' : 'transparent', color: viewMode === 'month' ? '#1e293b' : '#64748b', boxShadow: viewMode === 'month' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none' }}
          >
            Mes
          </button>
          <button 
            onClick={() => setViewMode('week')}
            style={{ padding: '0.35rem 0.75rem', borderRadius: '6px', border: 'none', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', backgroundColor: viewMode === 'week' ? 'white' : 'transparent', color: viewMode === 'week' ? '#1e293b' : '#64748b', boxShadow: viewMode === 'week' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none' }}
          >
            Semana
          </button>
          <button 
            onClick={() => setViewMode('day')}
            style={{ padding: '0.35rem 0.75rem', borderRadius: '6px', border: 'none', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', backgroundColor: viewMode === 'day' ? 'white' : 'transparent', color: viewMode === 'day' ? '#1e293b' : '#64748b', boxShadow: viewMode === 'day' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none' }}
          >
            Día
          </button>
        </div>
      </div>

      {/* Calendar Navigation Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', backgroundColor: 'white', padding: '1rem 1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button 
            onClick={handlePrev} 
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '6px', border: '1px solid #cbd5e1', cursor: 'pointer', backgroundColor: 'white' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor='#f8fafc'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor='white'}
          >
            <ChevronLeft size={18} />
          </button>
          <button 
            onClick={handleNext} 
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '6px', border: '1px solid #cbd5e1', cursor: 'pointer', backgroundColor: 'white' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor='#f8fafc'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor='white'}
          >
            <ChevronRight size={18} />
          </button>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#0f172a', margin: '0 0.5rem' }}>
            {viewMode === 'month' && `${months[currentDate.getMonth()]} ${currentDate.getFullYear()}`}
            {viewMode === 'week' && `Semana del ${weekDays[0].getDate()} de ${months[weekDays[0].getMonth()]} al ${weekDays[6].getDate()} de ${months[weekDays[6].getMonth()]}`}
            {viewMode === 'day' && `${currentDate.getDate()} de ${months[currentDate.getMonth()]}, ${currentDate.getFullYear()}`}
          </h2>
        </div>
        <button 
          onClick={handleToday}
          style={{ padding: '0.45rem 1rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', backgroundColor: 'white' }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor='#f8fafc'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor='white'}
        >
          Hoy
        </button>
      </div>

      {/* Main Calendar View Area */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        
        {/* ==================== MONTH VIEW ==================== */}
        {viewMode === 'month' && (
          <div>
            {/* Days header */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', textAlign: 'center', fontWeight: 'bold', fontSize: '0.85rem', color: '#475569' }}>
              {daysOfWeek.map(day => (
                <div key={day} style={{ padding: '0.75rem 0' }}>{day}</div>
              ))}
            </div>
            
            {/* Monthly grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', backgroundColor: '#cbd5e1' }}>
              {calendarDays.map((day, idx) => {
                const dateStr = day.date.toISOString().split('T')[0];
                const dayAppointments = filteredAppointments.filter(app => app.scheduledAt.startsWith(dateStr));
                const isToday = new Date().toDateString() === day.date.toDateString();

                return (
                  <div 
                    key={idx} 
                    className={`calendar-grid-cell ${day.isCurrentMonth ? '' : 'inactive'}`}
                    onDoubleClick={() => handleNewAppointment(day.date)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                      <span style={{ 
                        fontSize: '0.85rem', 
                        fontWeight: 'bold', 
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: isToday ? '#2563eb' : 'transparent',
                        color: isToday ? 'white' : 'inherit'
                      }}>
                        {day.date.getDate()}
                      </span>
                      {day.isCurrentMonth && (
                        <button 
                          onClick={() => handleNewAppointment(day.date)}
                          style={{ border: 'none', background: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
                          title="Agendar cita en este día"
                          onMouseEnter={e => e.currentTarget.style.color='#2563eb'}
                          onMouseLeave={e => e.currentTarget.style.color='#94a3b8'}
                        >
                          <Plus size={14} />
                        </button>
                      )}
                    </div>

                    {/* Event pills list */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto', flex: 1, maxHeight: '80px' }}>
                      {dayAppointments.map(app => {
                        const style = getStatusStyle(app.status);
                        return (
                          <div 
                            key={app.id} 
                            className="calendar-event-pill"
                            style={{ backgroundColor: style.bg, color: style.text, borderColor: style.border }}
                            onClick={() => handleViewDetails(app)}
                            title={`${formatTime(app.scheduledAt)} - ${app.title} (${app.customer?.name || app.clientName})`}
                          >
                            <span style={{ fontWeight: 'bold', fontSize: '0.7rem' }}>{formatTime(app.scheduledAt)}</span>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{app.title}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ==================== WEEK VIEW ==================== */}
        {viewMode === 'week' && (
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: '800px' }}>
              {/* Header: Hour label & 7 columns of Days */}
              <div style={{ display: 'grid', gridTemplateColumns: '80px repeat(7, 1fr)', borderBottom: '2px solid #e2e8f0', backgroundColor: '#f8fafc', fontWeight: 'bold', fontSize: '0.85rem', color: '#475569', textAlign: 'center' }}>
                <div style={{ padding: '0.75rem 0', borderRight: '1px solid #e2e8f0' }}>Hora</div>
                {weekDays.map((day, idx) => {
                  const isToday = new Date().toDateString() === day.toDateString();
                  return (
                    <div key={idx} style={{ padding: '0.75rem 0', borderRight: '1px solid #e2e8f0', backgroundColor: isToday ? '#eff6ff' : 'transparent' }}>
                      <div>{daysOfWeek[idx]}</div>
                      <div style={{ 
                        fontSize: '1.1rem', 
                        marginTop: '0.1rem',
                        color: isToday ? '#2563eb' : 'inherit'
                      }}>{day.getDate()}</div>
                    </div>
                  );
                })}
              </div>

              {/* Weekly Time Grid */}
              <div style={{ position: 'relative', height: '675px', overflowY: 'auto' }}>
                {/* Visual Hour Slots */}
                {hourSlots.map(hour => (
                  <div key={hour} className="time-grid-row">
                    <div style={{ 
                      padding: '0.25rem 0.5rem', 
                      fontSize: '0.75rem', 
                      color: '#64748b', 
                      textAlign: 'right', 
                      borderRight: '1px solid #e2e8f0',
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      height: '100%',
                      backgroundColor: '#f8fafc'
                    }}>
                      {hour.toString().padStart(2, '0')}:00
                    </div>
                    {/* 7 Day cells for clicking/grid */}
                    {weekDays.map((day, dayIdx) => (
                      <div 
                        key={dayIdx} 
                        className="time-slot-cell"
                        onDoubleClick={() => handleNewAppointment(day, hour)}
                        title="Doble clic para agendar cita"
                      />
                    ))}
                  </div>
                ))}

                {/* Absolutely Positioned Event Boxes */}
                {weekDays.map((day, dayIdx) => {
                  const dateStr = day.toISOString().split('T')[0];
                  const dayAppointments = filteredAppointments.filter(app => app.scheduledAt.startsWith(dateStr));
                  
                  return dayAppointments.map(app => {
                    const appTime = new Date(app.scheduledAt);
                    const appHour = appTime.getHours();
                    const appMin = appTime.getMinutes();
                    
                    // Clamp to display bounds (7:00 AM to 9:00 PM)
                    if (appHour < 7 || appHour > 21) return null;

                    // Calculate top offset: (minutes from 7:00 AM / total minutes in grid 15 hours = 900 minutes) * 100
                    const startMin = (appHour - 7) * 60 + appMin;
                    const topPercent = (startMin / 900) * 100;
                    
                    // Calculate height: (duration / 900) * 100
                    const heightPercent = (app.duration / 900) * 100;

                    // Calculate horizontal position (Sunday is column 1, Saturday column 7)
                    // We render within dayIdx: Sunday=0 ... Saturday=6
                    // Column left offset: 80px + (dayIdx * 1/7 of remaining width)
                    const leftPercent = 80 + (dayIdx * (100 - 80 / 10)) / 7; // simplified absolute position within React render
                    
                    const style = getStatusStyle(app.status);

                    return (
                      <div 
                        key={app.id} 
                        className="event-box-week"
                        style={{ 
                          top: `calc(${topPercent}% + 4px)`, 
                          height: `calc(${heightPercent}% - 8px)`,
                          left: `calc(80px + (${dayIdx} * (100% - 80px) / 7) + 4px)`,
                          width: `calc((100% - 80px) / 7 - 8px)`,
                          backgroundColor: style.bg, 
                          color: style.text, 
                          borderColor: style.border
                        }}
                        onClick={() => handleViewDetails(app)}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', opacity: 0.8 }}>
                          <span>{formatTime(app.scheduledAt)} ({app.duration}m)</span>
                        </div>
                        <div style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', fontWeight: 'bold' }}>{app.title}</div>
                        <div style={{ fontSize: '0.65rem', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {app.customer?.name || app.clientName}
                        </div>
                      </div>
                    );
                  });
                })}
              </div>
            </div>
          </div>
        )}

        {/* ==================== DAY VIEW ==================== */}
        {viewMode === 'day' && (
          <div>
            {/* Header day */}
            <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', borderBottom: '2px solid #e2e8f0', backgroundColor: '#f8fafc', fontWeight: 'bold', fontSize: '0.85rem', color: '#475569' }}>
              <div style={{ padding: '1rem', borderRight: '1px solid #e2e8f0', textAlign: 'right' }}>Hora</div>
              <div style={{ padding: '1rem 1.5rem' }}>
                Citas de hoy
              </div>
            </div>

            {/* Daily Grid */}
            <div style={{ position: 'relative', height: '675px', overflowY: 'auto' }}>
              {hourSlots.map(hour => (
                <div key={hour} className="time-grid-row day-view">
                  <div style={{ 
                    padding: '0.25rem 0.5rem', 
                    fontSize: '0.75rem', 
                    color: '#64748b', 
                    textAlign: 'right', 
                    borderRight: '1px solid #e2e8f0',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    height: '100%',
                    backgroundColor: '#f8fafc'
                  }}>
                    {hour.toString().padStart(2, '0')}:00
                  </div>
                  <div 
                    className="time-slot-cell"
                    onDoubleClick={() => handleNewAppointment(currentDate, hour)}
                    title="Doble clic para agendar cita"
                  />
                </div>
              ))}

              {/* Absolutely Positioned Event Boxes */}
              {(() => {
                const dateStr = currentDate.toISOString().split('T')[0];
                const dayAppointments = filteredAppointments.filter(app => app.scheduledAt.startsWith(dateStr));
                
                return dayAppointments.map(app => {
                  const appTime = new Date(app.scheduledAt);
                  const appHour = appTime.getHours();
                  const appMin = appTime.getMinutes();
                  
                  if (appHour < 7 || appHour > 21) return null;

                  const startMin = (appHour - 7) * 60 + appMin;
                  const topPercent = (startMin / 900) * 100;
                  const heightPercent = (app.duration / 900) * 100;
                  const style = getStatusStyle(app.status);

                  return (
                    <div 
                      key={app.id} 
                      className="event-box-week"
                      style={{ 
                        top: `calc(${topPercent}% + 4px)`, 
                        height: `calc(${heightPercent}% - 8px)`,
                        left: 'calc(80px + 10px)',
                        width: 'calc(100% - 80px - 20px)',
                        backgroundColor: style.bg, 
                        color: style.text, 
                        borderColor: style.border,
                        padding: '0.75rem',
                        fontSize: '0.85rem'
                      }}
                      onClick={() => handleViewDetails(app)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 'bold' }}>
                          <Clock size={12} /> {formatTime(app.scheduledAt)} ({app.duration} min)
                        </span>
                        <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem', borderRadius: '4px', backgroundColor: style.border, color: style.text }}>
                          {style.name}
                        </span>
                      </div>
                      <div style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '0.2rem' }}>{app.title}</div>
                      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.75rem', color: '#475569' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <User size={12} /> {app.customer?.name || app.clientName}
                        </span>
                        {app.user && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <User size={12} /> Especialista: {app.user.name}
                          </span>
                        )}
                        {app.notes && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', opacity: 0.8 }}>
                            <FileText size={12} /> {app.notes}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}
      </div>

      {/* ==================== DETAIL OVERLAY MODAL ==================== */}
      {isDetailOpen && selectedAppointment && (() => {
        const style = getStatusStyle(selectedAppointment.status);
        return (
          <div 
            onClick={() => setIsDetailOpen(false)}
            style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          >
            <div 
              style={{ backgroundColor: 'white', width: '450px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden' }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header status */}
              <div style={{ padding: '1.5rem', backgroundColor: style.bg, borderBottom: `1px solid ${style.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold', padding: '0.25rem 0.5rem', borderRadius: '4px', backgroundColor: style.border, color: style.text }}>
                    {style.name}
                  </span>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginTop: '0.5rem', color: '#0f172a' }}>{selectedAppointment.title}</h3>
                </div>
                <button 
                  onClick={() => setIsDetailOpen(false)}
                  style={{ border: 'none', background: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1.25rem' }}
                >
                  ✕
                </button>
              </div>

              {/* Content body */}
              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.9rem', color: '#334155' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Clock size={16} color="#64748b" />
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{formatDateReadable(selectedAppointment.scheduledAt)}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Hora: {formatTime(selectedAppointment.scheduledAt)} (Duración: {selectedAppointment.duration} mins)</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <User size={16} color="#64748b" />
                  <div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Cliente</div>
                    <div style={{ fontWeight: 'bold' }}>{selectedAppointment.customer?.name || selectedAppointment.clientName}</div>
                    {(selectedAppointment.customer?.phone || selectedAppointment.clientPhone) && (
                      <div style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.1rem' }}>
                        <Phone size={12} /> {selectedAppointment.customer?.phone || selectedAppointment.clientPhone}
                      </div>
                    )}
                    {(selectedAppointment.customer?.email || selectedAppointment.clientEmail) && (
                      <div style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Mail size={12} /> {selectedAppointment.customer?.email || selectedAppointment.clientEmail}
                      </div>
                    )}
                  </div>
                </div>

                {selectedAppointment.user && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <User size={16} color="#64748b" />
                    <div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Especialista Asignado</div>
                      <div style={{ fontWeight: 'bold' }}>{selectedAppointment.user.name}</div>
                    </div>
                  </div>
                )}

                {selectedAppointment.branch && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <MapPin size={16} color="#64748b" />
                    <div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Sucursal</div>
                      <div style={{ fontWeight: 'bold' }}>{selectedAppointment.branch.name}</div>
                    </div>
                  </div>
                )}

                {selectedAppointment.notes && (
                  <div style={{ display: 'flex', gap: '0.75rem', backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <FileText size={16} color="#64748b" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Notas / Comentarios</div>
                      <div style={{ fontStyle: 'italic', marginTop: '0.1rem' }}>"{selectedAppointment.notes}"</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div style={{ padding: '1rem 1.5rem', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <button 
                    onClick={() => handleEditAppointment(selectedAppointment)}
                    style={{ padding: '0.45rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer', backgroundColor: 'white' }}
                  >
                    Editar
                  </button>
                  <button 
                    onClick={() => handleDeleteAppointment(selectedAppointment.id)}
                    style={{ padding: '0.45rem 0.75rem', borderRadius: '6px', border: 'none', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer', backgroundColor: '#fee2e2', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                  >
                    <Trash2 size={12} /> Eliminar
                  </button>
                </div>
                
                {/* Estatus workflow buttons */}
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  {selectedAppointment.status === 'PENDING' && (
                    <button 
                      onClick={() => handleChangeStatus(selectedAppointment.id, 'CONFIRMED')}
                      style={{ padding: '0.45rem 0.75rem', borderRadius: '6px', border: 'none', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer', backgroundColor: '#16a34a', color: 'white' }}
                    >
                      Confirmar
                    </button>
                  )}
                  {selectedAppointment.status === 'CONFIRMED' && (
                    <button 
                      onClick={() => handleChangeStatus(selectedAppointment.id, 'COMPLETED')}
                      style={{ padding: '0.45rem 0.75rem', borderRadius: '6px', border: 'none', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer', backgroundColor: '#2563eb', color: 'white' }}
                    >
                      Completar
                    </button>
                  )}
                  {selectedAppointment.status !== 'CANCELLED' && selectedAppointment.status !== 'COMPLETED' && (
                    <button 
                      onClick={() => handleChangeStatus(selectedAppointment.id, 'CANCELLED')}
                      style={{ padding: '0.45rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer', backgroundColor: 'white', color: '#64748b' }}
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ==================== CREATE / EDIT MODAL DRAWER ==================== */}
      {isModalOpen && (
        <div 
          onClick={() => setIsModalOpen(false)}
          style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
        >
          <form 
            onSubmit={handleSaveAppointment}
            onClick={e => e.stopPropagation()}
            style={{ backgroundColor: 'white', width: '500px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}
          >
            {/* Header */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#0f172a' }}>
                {formId ? '✍️ Editar Cita' : '📅 Agendar Nueva Cita'}
              </h3>
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{ border: 'none', background: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1.25rem' }}
              >
                ✕
              </button>
            </div>

            {/* Scrollable form body */}
            <div style={{ padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem', fontSize: '0.9rem' }}>
              
              {/* Service/Title */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontWeight: 'bold', color: '#334155' }}>Servicio o Título de la Cita *</label>
                <input 
                  type="text"
                  placeholder="Ej: Corte de Cabello, Consulta Veterinaria, Terapia"
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  required
                  style={{ padding: '0.55rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none' }}
                />
              </div>

              {/* Date, Time, Duration */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '0.75rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontWeight: 'bold', color: '#334155' }}>Fecha *</label>
                  <input 
                    type="date"
                    value={formDate}
                    onChange={e => setFormDate(e.target.value)}
                    required
                    style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontWeight: 'bold', color: '#334155' }}>Hora *</label>
                  <input 
                    type="time"
                    value={formTime}
                    onChange={e => setFormTime(e.target.value)}
                    required
                    style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontWeight: 'bold', color: '#334155' }}>Duración *</label>
                  <select 
                    value={formDuration}
                    onChange={e => setFormDuration(parseInt(e.target.value))}
                    required
                    style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                  >
                    <option value={15}>15 min</option>
                    <option value={30}>30 min</option>
                    <option value={45}>45 min</option>
                    <option value={60}>1 hora (60m)</option>
                    <option value={90}>1.5 horas (90m)</option>
                    <option value={120}>2 horas (120m)</option>
                    <option value={180}>3 horas (180m)</option>
                  </select>
                </div>
              </div>

              {/* Branch Selection (Only if global selector is ALL) */}
              {initialBranchId === 'ALL' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontWeight: 'bold', color: '#334155' }}>Sucursal *</label>
                  <select 
                    value={formBranchId}
                    onChange={e => setFormBranchId(e.target.value)}
                    required
                    style={{ padding: '0.55rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none' }}
                  >
                    {resources.branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Specialist Selection */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontWeight: 'bold', color: '#334155' }}>Asignar Especialista / Empleado</label>
                <select 
                  value={formSpecialistId}
                  onChange={e => setFormSpecialistId(e.target.value)}
                  style={{ padding: '0.55rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none' }}
                >
                  <option value="">Selecciona un especialista...</option>
                  {resources.users.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>

              {/* Customer Selector / Manual toggler */}
              <div style={{ border: '1px solid #e2e8f0', padding: '1rem', borderRadius: '8px', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 'bold', color: '#334155' }}>Información del Cliente</span>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', color: '#475569', cursor: 'pointer' }}>
                    <input 
                      type="checkbox"
                      checked={isManualCustomer}
                      onChange={e => setIsManualCustomer(e.target.checked)}
                      style={{ cursor: 'pointer' }}
                    />
                    <span>Registrar cliente manualmente</span>
                  </label>
                </div>

                {!isManualCustomer ? (
                  // Search/Select client dropdown
                  <div style={{ position: 'relative' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.2rem' }}>Buscar en Directorio *</label>
                    <div style={{ position: 'relative' }}>
                      <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)' }} />
                      <input 
                        type="text"
                        placeholder="Escribe el nombre del cliente..."
                        value={customerSearchTerm}
                        onChange={e => {
                          setCustomerSearchTerm(e.target.value);
                          setIsCustomerDropdownOpen(true);
                        }}
                        onFocus={() => setIsCustomerDropdownOpen(true)}
                        style={{ width: '100%', padding: '0.5rem 0.5rem 0.5rem 1.8rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                      />
                    </div>
                    {/* Autocomplete Dropdown */}
                    {isCustomerDropdownOpen && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', marginTop: '0.25rem', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', zIndex: 999, maxHeight: '150px', overflowY: 'auto' }}>
                        {filteredCustomers.length > 0 ? (
                          filteredCustomers.map(c => (
                            <div 
                              key={c.id} 
                              onClick={() => {
                                setFormCustomerId(c.id);
                                setCustomerSearchTerm(c.name);
                                setIsCustomerDropdownOpen(false);
                              }}
                              style={{ padding: '0.5rem 0.75rem', cursor: 'pointer', fontSize: '0.85rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                              onMouseEnter={e => e.currentTarget.style.backgroundColor='#eff6ff'}
                              onMouseLeave={e => e.currentTarget.style.backgroundColor='white'}
                            >
                              <div>
                                <div style={{ fontWeight: 'bold' }}>{c.name}</div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{c.phone || 'Sin tel'}</div>
                              </div>
                              {formCustomerId === c.id && <Check size={14} color="#2563eb" />}
                            </div>
                          ))
                        ) : (
                          <div style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.85rem', color: '#94a3b8' }}>
                            No se encontraron clientes. 
                            <button 
                              type="button" 
                              onClick={() => {
                                setIsManualCustomer(true);
                                setIsCustomerDropdownOpen(false);
                              }}
                              style={{ border: 'none', background: 'none', color: '#2563eb', fontWeight: 'bold', cursor: 'pointer', marginLeft: '0.25rem', textDecoration: 'underline' }}
                            >
                              Registrar manual
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  // Manual input fields
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.1rem' }}>Nombre Completo *</label>
                      <input 
                        type="text"
                        placeholder="Ej: Juan Pérez"
                        value={formClientName}
                        onChange={e => setFormClientName(e.target.value)}
                        required={isManualCustomer}
                        style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '0.5rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.1rem' }}>Teléfono de Contacto</label>
                        <input 
                          type="tel"
                          placeholder="Ej: 5512345678"
                          value={formClientPhone}
                          onChange={e => setFormClientPhone(e.target.value)}
                          style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.1rem' }}>Correo Electrónico</label>
                        <input 
                          type="email"
                          placeholder="Ej: juan@ejemplo.com"
                          value={formClientEmail}
                          onChange={e => setFormClientEmail(e.target.value)}
                          style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontWeight: 'bold', color: '#334155' }}>Comentarios o Notas</label>
                <textarea 
                  placeholder="Detalles sobre el servicio, preferencias del cliente, síntomas, etc."
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  rows={3}
                  style={{ padding: '0.55rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none', resize: 'vertical' }}
                />
              </div>

            </div>

            {/* Footer buttons */}
            <div style={{ padding: '1rem 1.5rem', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{ padding: '0.55rem 1rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', fontWeight: 'bold', cursor: 'pointer', backgroundColor: 'white' }}
              >
                Cancelar
              </button>
              <button 
                type="submit"
                style={{ padding: '0.55rem 1.25rem', borderRadius: '6px', border: 'none', fontSize: '0.875rem', fontWeight: 'bold', cursor: 'pointer', backgroundColor: '#2563eb', color: 'white', boxShadow: '0 2px 4px rgba(37, 99, 235, 0.1)' }}
              >
                Guardar Cita
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
