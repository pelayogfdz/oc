'use client';

import React, { useEffect, useState } from 'react';
import { getPendingTasks, completeCollaboratorTask } from '@/app/actions/task';
import { Camera, Upload, X, Check, FileText, Clock } from 'lucide-react';

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
  evidenceFile: string | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: {
    name: string | null;
    email: string | null;
  };
};

export default function CollaboratorTaskPopup({ userId }: { userId: string }) {
  const [pendingTasks, setPendingTasks] = useState<Task[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidenceBase64, setEvidenceBase64] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Dragging logic
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const positionRef = React.useRef({ x: 0, y: 0 });
  const dragRef = React.useRef({
    isDragging: false,
    startX: 0,
    startY: 0,
    startOffsetX: 0,
    startOffsetY: 0,
    hasMoved: false
  });
  const justDraggedRef = React.useRef(false);

  useEffect(() => {
    // Load from localStorage on mount
    try {
      const saved = localStorage.getItem("task_widget_position");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === "number" && typeof parsed.y === "number") {
          setPosition(parsed);
          positionRef.current = parsed;
        }
      }
    } catch (e) {}

    const handleGlobalMove = (clientX: number, clientY: number) => {
      if (!dragRef.current.isDragging) return;
      
      const dx = clientX - dragRef.current.startX;
      const dy = clientY - dragRef.current.startY;
      
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        dragRef.current.hasMoved = true;
      }
      
      const newX = dragRef.current.startOffsetX + dx;
      const newY = dragRef.current.startOffsetY + dy;
      
      const minX = -14;
      const maxX = Math.max(10, window.innerWidth - 80);
      const minY = 10 - (window.innerHeight - 80);
      const maxY = 14;
      
      const clampedX = Math.min(Math.max(newX, minX), maxX);
      const clampedY = Math.min(Math.max(newY, minY), maxY);
      
      const newPos = { x: clampedX, y: clampedY };
      setPosition(newPos);
      positionRef.current = newPos;
    };

    const handleMouseMove = (e: MouseEvent) => {
      handleGlobalMove(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!dragRef.current.isDragging) return;
      if (e.touches.length === 1) {
        e.preventDefault();
        handleGlobalMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handleGlobalEnd = () => {
      if (!dragRef.current.isDragging) return;
      
      if (dragRef.current.hasMoved) {
        justDraggedRef.current = true;
        try {
          localStorage.setItem("task_widget_position", JSON.stringify(positionRef.current));
        } catch (e) {}
      }
      
      dragRef.current.isDragging = false;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleGlobalEnd);
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleGlobalEnd);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleGlobalEnd);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleGlobalEnd);
    };
  }, []);

  const startDrag = (clientX: number, clientY: number) => {
    dragRef.current = {
      isDragging: true,
      startX: clientX,
      startY: clientY,
      startOffsetX: positionRef.current.x,
      startOffsetY: positionRef.current.y,
      hasMoved: false
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    startDrag(e.clientX, e.clientY);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    startDrag(e.touches[0].clientX, e.touches[0].clientY);
  };

  // Fetch pending tasks on mount
  useEffect(() => {
    async function loadTasks() {
      try {
        const tasks = await getPendingTasks(userId);
        // Cast as Task[]
        setPendingTasks(tasks as any);
        if (tasks.length > 0) {
          setIsOpen(true);
        }
      } catch (err) {
        console.error('Error al cargar tareas pendientes:', err);
      }
    }
    if (userId) {
      loadTasks();
    }
  }, [userId]);

  // Current task is the first in the list
  const currentTask = pendingTasks[0];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg('');
    setEvidenceFile(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setEvidenceBase64(reader.result as string);
    };
    reader.onerror = () => {
      setErrorMsg('Error al leer el archivo. Intenta con otro.');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTask) return;
    if (!evidenceBase64) {
      setErrorMsg('Por favor, selecciona o toma una fotografía como evidencia.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const res = await completeCollaboratorTask(currentTask.id, evidenceBase64);
      if (res.success) {
        // Remove completed task from local state
        const remaining = pendingTasks.slice(1);
        setPendingTasks(remaining);
        setEvidenceFile(null);
        setEvidenceBase64(null);
        if (remaining.length === 0) {
          setIsOpen(false);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar la evidencia.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  if (pendingTasks.length === 0 || !currentTask) return null;

  const creatorName = currentTask.createdBy.name || currentTask.createdBy.email || 'Administrador';

  return (
    <>
      {/* Floating Clock Button */}
      {!isOpen && (
        <button
          onClick={() => {
            if (justDraggedRef.current) {
              justDraggedRef.current = false;
              return;
            }
            setIsOpen(true);
          }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          className="task-floating-btn"
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '24px',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            cursor: 'pointer',
            zIndex: 9998,
            boxShadow: '0 4px 15px rgba(79, 70, 229, 0.4)',
            transform: `translate(${position.x}px, ${position.y}px)`,
            transition: dragRef.current.isDragging ? 'none' : 'transform 0.15s ease-out',
            touchAction: 'none',
            userSelect: 'none',
            outline: 'none',
            animation: dragRef.current.isDragging ? 'none' : 'taskFloatPulse 2.5s infinite ease-in-out'
          }}
          onMouseEnter={e => {
            if (!dragRef.current.isDragging) {
              e.currentTarget.style.transform = `translate(${positionRef.current.x}px, ${positionRef.current.y}px) scale(1.08)`;
            }
          }}
          onMouseLeave={e => {
            if (!dragRef.current.isDragging) {
              e.currentTarget.style.transform = `translate(${positionRef.current.x}px, ${positionRef.current.y}px) scale(1)`;
            }
          }}
          title="Tienes tareas pendientes"
        >
          <Clock size={24} />
          
          {/* Badge indicating pending task count */}
          <span style={{
            position: 'absolute',
            top: '-2px',
            right: '-2px',
            backgroundColor: '#ef4444',
            color: 'white',
            fontSize: '0.75rem',
            fontWeight: 'bold',
            borderRadius: '50%',
            width: '20px',
            height: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            border: '2px solid white'
          }}>
            {pendingTasks.length}
          </span>
        </button>
      )}

      {/* Global CSS for floating button animations */}
      <style>{`
        @keyframes taskFloatPulse {
          0% { box-shadow: 0 4px 15px rgba(79, 70, 229, 0.4); }
          50% { box-shadow: 0 4px 25px rgba(79, 70, 229, 0.7); }
          100% { box-shadow: 0 4px 15px rgba(79, 70, 229, 0.4); }
        }
        .task-floating-btn {
          transition: transform 0.15s ease-out, box-shadow 0.2s ease;
        }
      `}</style>

      {/* Modal Popup */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '520px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            animation: 'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            {/* Header Banner */}
            <div style={{
              background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
              padding: '1.5rem',
              color: 'white',
              position: 'relative',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start'
            }}>
              <div>
                <span style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '9999px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Nueva Tarea Asignada
                </span>
                <h3 style={{ margin: '0.5rem 0 0 0', fontSize: '1.25rem', fontWeight: 'bold' }}>
                  {currentTask.title}
                </h3>
              </div>
              <button
                onClick={handleClose}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  padding: '0.4rem',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
              >
                <X size={18} />
              </button>
            </div>

            {/* Task Details */}
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>
                  Asignado por:
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#334155' }}>
                  {creatorName}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                  Instrucciones a realizar:
                </div>
                <div style={{
                  backgroundColor: '#f8fafc',
                  borderLeft: '4px solid #4f46e5',
                  padding: '1rem',
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                  color: '#334155',
                  lineHeight: '1.5',
                  whiteSpace: 'pre-wrap'
                }}>
                  {currentTask.instructions}
                </div>
              </div>

              {/* Form to submit evidence */}
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                    Subir Evidencia de Realización (Fotografía o Archivo) *
                  </div>

                  {/* Upload Dropzone */}
                  <div style={{ position: 'relative' }}>
                    <input
                      type="file"
                      id="evidenceInput"
                      accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      onChange={handleFileChange}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        opacity: 0,
                        cursor: 'pointer',
                        zIndex: 10
                      }}
                    />

                    {!evidenceBase64 ? (
                      <div style={{
                        border: '2px dashed #cbd5e1',
                        borderRadius: '12px',
                        padding: '2rem 1rem',
                        textAlign: 'center',
                        backgroundColor: '#fafafa',
                        transition: 'border-color 0.2s',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem'
                      }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          backgroundColor: '#eff6ff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#2563eb'
                        }}>
                          <Camera size={20} />
                        </div>
                        <div>
                          <span style={{ fontSize: '0.875rem', fontWeight: 'bold', color: 'var(--pulpos-primary)' }}>Haz clic para tomar foto</span>
                          <span style={{ fontSize: '0.875rem', color: '#64748b' }}> o seleccionar archivo</span>
                        </div>
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Formatos aceptados: Imágenes o Documentos</span>
                      </div>
                    ) : (
                      <div style={{
                        border: '2px solid #22c55e',
                        borderRadius: '12px',
                        padding: '1rem',
                        backgroundColor: '#f0fdf4',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '1rem'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                          {evidenceBase64.startsWith('data:image/') ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={evidenceBase64}
                              alt="Previsualización"
                              style={{
                                width: '48px',
                                height: '48px',
                                objectFit: 'cover',
                                borderRadius: '6px',
                                border: '1px solid #bbf7d0'
                              }}
                            />
                          ) : (
                            <div style={{
                              width: '48px',
                              height: '48px',
                              borderRadius: '6px',
                              backgroundColor: '#dcfce7',
                              color: '#16a34a',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              <FileText size={20} />
                            </div>
                          )}
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#166534', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {evidenceFile?.name || 'Archivo seleccionado'}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#16a34a' }}>
                              {( (evidenceFile?.size || 0) / 1024 ).toFixed(1)} KB • Listo para enviar
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setEvidenceFile(null);
                            setEvidenceBase64(null);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#dc2626',
                            cursor: 'pointer',
                            padding: '0.25rem',
                            display: 'flex'
                          }}
                        >
                          <X size={18} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {errorMsg && (
                  <div style={{
                    color: '#dc2626',
                    fontSize: '0.8rem',
                    backgroundColor: '#fef2f2',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '6px',
                    borderLeft: '3px solid #dc2626'
                  }}>
                    {errorMsg}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={handleClose}
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      border: '1px solid #cbd5e1',
                      backgroundColor: 'white',
                      color: '#475569',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '0.9rem',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}
                  >
                    Completar más tarde
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !evidenceBase64}
                    style={{
                      flex: 1.5,
                      padding: '0.75rem',
                      border: 'none',
                      backgroundColor: '#22c55e',
                      color: 'white',
                      borderRadius: '10px',
                      cursor: (isSubmitting || !evidenceBase64) ? 'not-allowed' : 'pointer',
                      fontWeight: 'bold',
                      fontSize: '0.9rem',
                      boxShadow: '0 4px 6px -1px rgba(34, 197, 94, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      opacity: (isSubmitting || !evidenceBase64) ? 0.6 : 1
                    }}
                  >
                    {isSubmitting ? (
                      'Guardando...'
                    ) : (
                      <>
                        <Check size={18} /> Marcar como Realizada
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

