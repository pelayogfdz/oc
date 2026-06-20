'use client';

import React, { useState } from 'react';
import { 
  Plus, ClipboardList, CheckCircle2, AlertCircle, 
  Trash2, Search, Calendar, RefreshCw, FileText, X, Eye, Pencil 
} from 'lucide-react';
import { createCollaboratorTask, deleteCollaboratorTask, updateCollaboratorTask, getTaskEvidence } from '@/app/actions/task';

type Collaborator = {
  id: string;
  name: string | null;
  email: string | null;
};

type Task = {
  id: string;
  title: string;
  instructions: string;
  assignedToId: string;
  createdById: string;
  branchId: string;
  status: string;
  recurrence: string;
  dueDate: Date | null;
  evidenceFile?: string | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  assignedTo: {
    name: string | null;
    email: string | null;
  };
  createdBy: {
    name: string | null;
    email: string | null;
  };
};

export default function TareasClient({ 
  collaborators, 
  initialTasks 
}: { 
  collaborators: Collaborator[]; 
  initialTasks: Task[]; 
}) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('ALL');
  
  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedEvidence, setSelectedEvidence] = useState<string | null>(null);
  const [selectedEvidenceTitle, setSelectedEvidenceTitle] = useState('');
  const [selectedEvidenceLoading, setSelectedEvidenceLoading] = useState<string | null>(null);

  // Create Form State
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [assignedToId, setAssignedToId] = useState('');
  const [recurrence, setRecurrence] = useState('ONCE');
  const [dueDate, setDueDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatToDatetimeLocal = (date: Date | string | null | undefined): string => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    const pad = (num: number) => String(num).padStart(2, '0');
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const handleEditClick = (task: Task) => {
    setEditingTask(task);
    setTitle(task.title);
    setInstructions(task.instructions);
    setAssignedToId(task.assignedToId);
    setRecurrence(task.recurrence);
    setDueDate(formatToDatetimeLocal(task.dueDate));
    setIsCreateModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsCreateModalOpen(false);
    setEditingTask(null);
    setTitle('');
    setInstructions('');
    setAssignedToId('');
    setRecurrence('ONCE');
    setDueDate('');
  };

  const handleSubmitTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !instructions || !assignedToId) {
      alert('Por favor completa los campos obligatorios.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingTask) {
        const res = await updateCollaboratorTask(editingTask.id, {
          title,
          instructions,
          assignedToId,
          recurrence,
          dueDate: dueDate || undefined
        });

        if (res.success && res.task) {
          const assignedUser = collaborators.find(c => c.id === assignedToId);
          const updatedTask: Task = {
            ...res.task,
            assignedTo: {
              name: assignedUser?.name || null,
              email: assignedUser?.email || null
            },
            createdBy: editingTask.createdBy
          } as Task;

          setTasks(tasks.map(t => t.id === editingTask.id ? updatedTask : t));
          handleCloseModal();
        }
      } else {
        const res = await createCollaboratorTask({
          title,
          instructions,
          assignedToId,
          recurrence,
          dueDate: dueDate || undefined
        });

        if (res.success && res.task) {
          const assignedUser = collaborators.find(c => c.id === assignedToId);
          const newTask: Task = {
            ...res.task,
            assignedTo: {
              name: assignedUser?.name || null,
              email: assignedUser?.email || null
            },
            createdBy: {
              name: 'Tú',
              email: ''
            }
          } as Task;

          setTasks([newTask, ...tasks]);
          handleCloseModal();
        }
      }
    } catch (err: any) {
      alert(err.message || `Error al ${editingTask ? 'editar' : 'crear'} la tarea`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewEvidence = async (taskId: string, taskTitle: string) => {
    setSelectedEvidenceLoading(taskId);
    try {
      const res = await getTaskEvidence(taskId);
      if (res.success && res.evidence) {
        setSelectedEvidence(res.evidence);
        setSelectedEvidenceTitle(taskTitle);
      } else {
        alert('No se encontró evidencia para esta tarea.');
      }
    } catch (err: any) {
      alert(err.message || 'Error al obtener la evidencia.');
    } finally {
      setSelectedEvidenceLoading(null);
    }
  };;

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta tarea?')) return;
    try {
      const res = await deleteCollaboratorTask(taskId);
      if (res.success) {
        setTasks(tasks.filter(t => t.id !== taskId));
      }
    } catch (err: any) {
      alert(err.message || 'Error al eliminar la tarea');
    }
  };

  const getRecurrenceLabel = (rec: string) => {
    switch (rec) {
      case 'ONCE': return 'Única';
      case 'DAILY': return 'Diaria';
      case 'WEEKLY': return 'Semanal';
      case 'MONTHLY': return 'Mensual';
      default: return rec;
    }
  };

  const getRecurrenceColor = (rec: string) => {
    switch (rec) {
      case 'ONCE': return '#f1f5f9';
      case 'DAILY': return '#ecfdf5';
      case 'WEEKLY': return '#eff6ff';
      case 'MONTHLY': return '#fdf2f8';
      default: return '#f1f5f9';
    }
  };

  const getRecurrenceTextColor = (rec: string) => {
    switch (rec) {
      case 'ONCE': return '#475569';
      case 'DAILY': return '#059669';
      case 'WEEKLY': return '#2563eb';
      case 'MONTHLY': return '#db2777';
      default: return '#475569';
    }
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = 
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.assignedTo.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.assignedTo.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = 
      statusFilter === 'ALL' || 
      task.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', fontFamily: 'var(--font-geist-sans)' }}>
      
      {/* Header Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        
        {/* Filters */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', flex: 1 }}>
          <div style={{ position: 'relative', minWidth: '280px', flex: 1, maxWidth: '400px' }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Buscar por título o colaborador..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem 0.55rem 2.2rem',
                borderRadius: '8px',
                border: '1px solid var(--pulpos-border)',
                fontSize: '0.875rem',
                outline: 'none',
                backgroundColor: 'white',
                color: 'var(--pulpos-text)'
              }}
            />
          </div>

          <div style={{ display: 'flex', borderRadius: '8px', border: '1px solid var(--pulpos-border)', overflow: 'hidden', backgroundColor: 'white' }}>
            <button
              onClick={() => setStatusFilter('ALL')}
              style={{
                padding: '0.5rem 1rem',
                border: 'none',
                backgroundColor: statusFilter === 'ALL' ? '#f1f5f9' : 'transparent',
                color: statusFilter === 'ALL' ? 'var(--pulpos-text)' : 'var(--pulpos-text-muted)',
                fontSize: '0.85rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Todas
            </button>
            <button
              onClick={() => setStatusFilter('PENDING')}
              style={{
                padding: '0.5rem 1rem',
                border: 'none',
                backgroundColor: statusFilter === 'PENDING' ? '#fef3c7' : 'transparent',
                color: statusFilter === 'PENDING' ? '#b45309' : 'var(--pulpos-text-muted)',
                fontSize: '0.85rem',
                fontWeight: '600',
                cursor: 'pointer',
                borderLeft: '1px solid var(--pulpos-border)',
                borderRight: '1px solid var(--pulpos-border)'
              }}
            >
              Pendientes
            </button>
            <button
              onClick={() => setStatusFilter('COMPLETED')}
              style={{
                padding: '0.5rem 1rem',
                border: 'none',
                backgroundColor: statusFilter === 'COMPLETED' ? '#dcfce7' : 'transparent',
                color: statusFilter === 'COMPLETED' ? '#15803d' : 'var(--pulpos-text-muted)',
                fontSize: '0.85rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Completadas
            </button>
          </div>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            backgroundColor: 'var(--pulpos-primary)',
            color: 'white',
            border: 'none',
            padding: '0.6rem 1.25rem',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '0.9rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
        >
          <Plus size={18} /> Asignar Tarea
        </button>
      </div>

      {/* Task List Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
        {filteredTasks.map(task => {
          const isCompleted = task.status === 'COMPLETED';
          const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !isCompleted;
          
          return (
            <div 
              key={task.id}
              style={{
                backgroundColor: 'white',
                border: '1px solid var(--pulpos-border)',
                borderRadius: '12px',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                position: 'relative',
                transition: 'transform 0.15s, box-shadow 0.15s'
              }}
            >
              {/* Top Row: Title & Action menu */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 'bold', margin: 0, color: 'var(--pulpos-text)', wordBreak: 'break-word' }}>
                  {task.title}
                </h3>
                <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0 }}>
                  <button 
                    onClick={() => handleEditClick(task)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#6366f1',
                      cursor: 'pointer',
                      padding: '0.25rem',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'background-color 0.2s'
                    }}
                    title="Editar tarea"
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f5f3ff'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <Pencil size={16} />
                  </button>
                  <button 
                    onClick={() => handleDeleteTask(task.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ef4444',
                      cursor: 'pointer',
                      padding: '0.25rem',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'background-color 0.2s'
                    }}
                    title="Eliminar tarea"
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fef2f2'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Instructions */}
              <p style={{ 
                fontSize: '0.875rem', 
                color: 'var(--pulpos-text-muted)', 
                margin: 0, 
                whiteSpace: 'pre-wrap',
                flex: 1
              }}>
                {task.instructions}
              </p>

              {/* Attributes (Recurrence, Status, Dates) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem', fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748b' }}>Asignado a:</span>
                  <span style={{ fontWeight: '600', color: 'var(--pulpos-text)' }}>
                    {task.assignedTo.name || task.assignedTo.email || 'N/A'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748b' }}>Frecuencia:</span>
                  <span style={{ 
                    padding: '0.15rem 0.4rem', 
                    borderRadius: '4px', 
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    backgroundColor: getRecurrenceColor(task.recurrence),
                    color: getRecurrenceTextColor(task.recurrence)
                  }}>
                    {getRecurrenceLabel(task.recurrence)}
                  </span>
                </div>

                {task.dueDate && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748b' }}>Fecha Límite:</span>
                    <span style={{ 
                      fontWeight: '600', 
                      color: isOverdue ? '#ef4444' : 'var(--pulpos-text)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}>
                      <Calendar size={12} />
                      {new Date(task.dueDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748b' }}>Estado:</span>
                  <span style={{ 
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    fontWeight: 'bold',
                    color: isCompleted ? '#16a34a' : isOverdue ? '#ef4444' : '#d97706',
                    backgroundColor: isCompleted ? '#dcfce7' : isOverdue ? '#fef2f2' : '#fef3c7',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.75rem'
                  }}>
                    {isCompleted ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                    {isCompleted ? 'Completada' : isOverdue ? 'Atrasada' : 'Pendiente'}
                  </span>
                </div>

                {isCompleted && task.completedAt && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748b' }}>Completada el:</span>
                    <span style={{ fontWeight: '500', color: 'var(--pulpos-text-muted)' }}>
                      {new Date(task.completedAt).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              {/* Evidence Row */}
              {isCompleted && (
                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem' }}>
                  <button
                    onClick={() => handleViewEvidence(task.id, task.title)}
                    disabled={selectedEvidenceLoading === task.id}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      backgroundColor: '#f8fafc',
                      border: '1px solid var(--pulpos-border)',
                      padding: '0.5rem',
                      borderRadius: '6px',
                      cursor: selectedEvidenceLoading === task.id ? 'not-allowed' : 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: 'bold',
                      color: 'var(--pulpos-primary)',
                      transition: 'background-color 0.2s',
                      opacity: selectedEvidenceLoading === task.id ? 0.7 : 1
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                  >
                    <Eye size={14} /> {selectedEvidenceLoading === task.id ? 'Cargando...' : 'Ver Evidencia Cargada'}
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {filteredTasks.length === 0 && (
          <div style={{
            gridColumn: '1 / -1',
            padding: '4rem',
            textAlign: 'center',
            color: 'var(--pulpos-text-muted)',
            backgroundColor: 'white',
            borderRadius: '12px',
            border: '1px dashed var(--pulpos-border)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem'
          }}>
            <ClipboardList size={48} color="#94a3b8" />
            <div>
              <h4 style={{ margin: '0 0 0.25rem 0', fontWeight: 'bold', color: 'var(--pulpos-text)' }}>No se encontraron tareas</h4>
              <p style={{ margin: 0, fontSize: '0.9rem' }}>Ajusta los filtros o crea una nueva tarea para comenzar.</p>
            </div>
          </div>
        )}
      </div>

      {/* CREATE TASK MODAL */}
      {isCreateModalOpen && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          backgroundColor: 'rgba(15, 23, 42, 0.6)', 
          backdropFilter: 'blur(4px)',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          zIndex: 1000 
        }}>
          <div style={{ 
            backgroundColor: 'white', 
            padding: '2rem', 
            borderRadius: '16px', 
            width: '100%',
            maxWidth: '500px', 
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            border: '1px solid #e2e8f0',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--pulpos-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ClipboardList size={22} color="var(--pulpos-primary)" /> {editingTask ? 'Editar Tarea' : 'Asignar Nueva Tarea'}
              </h3>
              <button 
                onClick={handleCloseModal} 
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', padding: '0.25rem', borderRadius: '50%' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmitTask} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: '600', fontSize: '0.85rem', color: '#475569' }}>Título de la Tarea *</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ej. Limpieza de amasadora"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--pulpos-border)',
                    backgroundColor: '#f8fafc',
                    color: 'var(--pulpos-text)',
                    fontSize: '0.9rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: '600', fontSize: '0.85rem', color: '#475569' }}>Colaborador Asignado *</label>
                <select 
                  required
                  value={assignedToId}
                  onChange={e => setAssignedToId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--pulpos-border)',
                    backgroundColor: '#f8fafc',
                    color: 'var(--pulpos-text)',
                    fontSize: '0.9rem',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="">Seleccionar colaborador...</option>
                  {collaborators.map(collab => (
                    <option key={collab.id} value={collab.id}>
                      {collab.name || collab.email}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: '600', fontSize: '0.85rem', color: '#475569' }}>Frecuencia</label>
                  <select 
                    value={recurrence}
                    onChange={e => setRecurrence(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.75rem',
                      borderRadius: '8px',
                      border: '1px solid var(--pulpos-border)',
                      backgroundColor: '#f8fafc',
                      color: 'var(--pulpos-text)',
                      fontSize: '0.9rem',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="ONCE">Única</option>
                    <option value="DAILY">Diaria</option>
                    <option value="WEEKLY">Semanal</option>
                    <option value="MONTHLY">Mensual</option>
                  </select>
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: '600', fontSize: '0.85rem', color: '#475569' }}>Fecha y Hora Límite</label>
                  <input 
                    type="datetime-local" 
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.75rem',
                      borderRadius: '8px',
                      border: '1px solid var(--pulpos-border)',
                      backgroundColor: '#f8fafc',
                      color: 'var(--pulpos-text)',
                      fontSize: '0.9rem',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: '600', fontSize: '0.85rem', color: '#475569' }}>Instrucciones Claras *</label>
                <textarea 
                  required
                  placeholder="Instrucciones paso a paso para realizar esta tarea..."
                  value={instructions}
                  onChange={e => setInstructions(e.target.value)}
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--pulpos-border)',
                    backgroundColor: '#f8fafc',
                    color: 'var(--pulpos-text)',
                    fontSize: '0.9rem',
                    outline: 'none',
                    resize: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button 
                  type="button"
                  onClick={handleCloseModal} 
                  style={{ 
                    padding: '0.6rem 1.25rem', 
                    border: '1px solid var(--pulpos-border)', 
                    backgroundColor: 'transparent', 
                    color: 'var(--pulpos-text)', 
                    borderRadius: '8px', 
                    cursor: 'pointer', 
                    fontWeight: 'bold', 
                    fontSize: '0.9rem' 
                  }}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  style={{ 
                    padding: '0.6rem 1.25rem', 
                    border: 'none', 
                    backgroundColor: 'var(--pulpos-primary)', 
                    color: 'white', 
                    borderRadius: '8px', 
                    cursor: isSubmitting ? 'not-allowed' : 'pointer', 
                    fontWeight: 'bold', 
                    fontSize: '0.9rem',
                    opacity: isSubmitting ? 0.7 : 1
                  }}
                >
                  {isSubmitting ? (editingTask ? 'Guardando...' : 'Asignando...') : (editingTask ? 'Guardar Cambios' : 'Asignar Tarea')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EVIDENCE LIGHTBOX MODAL */}
      {selectedEvidence && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          backgroundColor: 'rgba(15, 23, 42, 0.95)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          zIndex: 1100,
          padding: '2rem'
        }}>
          <div style={{ 
            position: 'relative', 
            maxWidth: '100%', 
            maxHeight: '100%', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            gap: '1rem'
          }}>
            <button 
              onClick={() => setSelectedEvidence(null)} 
              style={{ 
                position: 'fixed', 
                top: '1.5rem', 
                right: '1.5rem', 
                background: 'rgba(255, 255, 255, 0.1)', 
                border: 'none', 
                color: 'white', 
                cursor: 'pointer', 
                display: 'flex', 
                padding: '0.5rem', 
                borderRadius: '50%',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
            >
              <X size={24} />
            </button>

            <h4 style={{ color: 'white', margin: 0, fontSize: '1.2rem', fontWeight: 'bold', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
              Evidencia: {selectedEvidenceTitle}
            </h4>

            {selectedEvidence.startsWith('data:image/') ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img 
                src={selectedEvidence} 
                alt="Evidencia cargada" 
                style={{ 
                  maxWidth: '90vw', 
                  maxHeight: '80vh', 
                  borderRadius: '8px', 
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                  objectFit: 'contain',
                  border: '1px solid rgba(255, 255, 255, 0.2)'
                }} 
              />
            ) : (
              <div style={{ 
                backgroundColor: 'white', 
                padding: '2rem', 
                borderRadius: '12px', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                gap: '1rem',
                minWidth: '320px'
              }}>
                <FileText size={64} color="var(--pulpos-primary)" />
                <div style={{ textAlign: 'center' }}>
                  <p style={{ margin: '0 0 0.5rem 0', fontWeight: 'bold', color: 'var(--pulpos-text)' }}>Evidencia de Archivo Cargada</p>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--pulpos-text-muted)' }}>El archivo se guardó correctamente.</p>
                </div>
                <a 
                  href={selectedEvidence} 
                  download={`evidencia_${selectedEvidenceTitle.replace(/\s+/g, '_').toLowerCase()}`}
                  style={{
                    backgroundColor: 'var(--pulpos-primary)',
                    color: 'white',
                    padding: '0.6rem 1.25rem',
                    borderRadius: '6px',
                    fontWeight: 'bold',
                    textDecoration: 'none',
                    fontSize: '0.9rem',
                    textAlign: 'center',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}
                >
                  Descargar Archivo
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
