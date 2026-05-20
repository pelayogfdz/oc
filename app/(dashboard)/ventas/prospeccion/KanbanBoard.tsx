"use client";

import { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import Link from "next/link";
import { useRouter } from "next/navigation";

const COLUMNS = [
  { id: "NEW", title: "Nuevos", color: "#3b82f6", bg: "#eff6ff" },
  { id: "CONTACTED", title: "Contactados", color: "#8b5cf6", bg: "#f5f3ff" },
  { id: "QUOTED", title: "Cotizados", color: "#f59e0b", bg: "#fffbeb" },
  { id: "WON", title: "Venta Cerrada", color: "#10b981", bg: "#ecfdf5" },
  { id: "LOST", title: "Perdidos", color: "#ef4444", bg: "#fef2f2" }
];

export default function KanbanBoard({ initialProspects, users, currentUser }: any) {
  const [prospects, setProspects] = useState(initialProspects);
  const router = useRouter();

  // Hydration fix for DragDropContext
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const onDragEnd = async (result: any) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;

    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    const newStage = destination.droppableId;
    
    // Optimistic UI update
    setProspects((prev: any) => 
      prev.map((p: any) => p.id === draggableId ? { ...p, funnelStage: newStage } : p)
    );

    // Persist to DB
    try {
      await fetch(`/api/prospects/${draggableId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ funnelStage: newStage })
      });
      router.refresh();
    } catch (e) {
      console.error(e);
      // Rollback on error could go here
    }
  };

  const handleAssign = async (prospectId: string, userId: string) => {
    const finalUserId = userId === "" ? null : userId;
    setProspects((prev: any) => 
      prev.map((p: any) => p.id === prospectId ? { ...p, assignedUserId: finalUserId } : p)
    );
    try {
      await fetch(`/api/prospects/${prospectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedUserId: finalUserId })
      });
      router.refresh();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (prospectId: string) => {
    if (confirm("¿Está seguro que desea eliminar este prospecto permanentemente? Esta acción no se puede deshacer y borrará todos sus mensajes asociados.")) {
      try {
        const res = await fetch(`/api/prospects/${prospectId}`, {
          method: "DELETE"
        });
        if (res.ok) {
          setProspects((prev: any) => prev.filter((p: any) => p.id !== prospectId));
          alert("Prospecto eliminado exitosamente.");
          router.refresh();
        } else {
          alert("Error al eliminar el prospecto");
        }
      } catch (e) {
        console.error(e);
        alert("Error de conexión");
      }
    }
  };

  if (!isMounted) return null;

  return (
    <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '1rem', minHeight: '65vh' }}>
      <DragDropContext onDragEnd={onDragEnd}>
        {COLUMNS.map(column => {
          const colProspects = prospects.filter((p: any) => p.funnelStage === column.id);
          
          return (
            <div key={column.id} style={{ minWidth: '300px', flex: '1', display: 'flex', flexDirection: 'column', backgroundColor: column.bg, borderRadius: '12px', padding: '1rem', border: `1px solid ${column.color}20` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontWeight: '600', color: column.color }}>{column.title}</h3>
                <span style={{ fontSize: '0.875rem', backgroundColor: 'white', padding: '0.2rem 0.6rem', borderRadius: '1rem', fontWeight: 'bold', color: column.color }}>
                  {colProspects.length}
                </span>
              </div>

              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    style={{ flex: 1, minHeight: '150px', transition: 'background-color 0.2s ease', backgroundColor: snapshot.isDraggingOver ? 'rgba(0,0,0,0.02)' : 'transparent', borderRadius: '8px' }}
                  >
                    {colProspects.map((prospect: any, index: number) => (
                      <Draggable key={prospect.id} draggableId={prospect.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            style={{
                              ...provided.draggableProps.style,
                              userSelect: "none",
                              padding: "1rem",
                              margin: "0 0 0.75rem 0",
                              backgroundColor: "white",
                              borderRadius: "10px",
                              boxShadow: snapshot.isDragging ? "0 10px 15px -3px rgb(0 0 0 / 0.1)" : "0 1px 3px 0 rgb(0 0 0 / 0.1)",
                              border: '1px solid #e2e8f0',
                              transition: 'box-shadow 0.2s ease',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.5rem'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <strong style={{ fontSize: '1rem', color: '#1e293b', maxWidth: '70%', overflow: 'hidden', textOverflow: 'ellipsis' }}>{prospect.name}</strong>
                              {/* Icon to Chat and Delete */}
                              <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                                <Link href={`/ventas/prospeccion/chat/${prospect.id}`} style={{ color: '#25D366', padding: '4px', borderRadius: '50%', backgroundColor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                                </Link>
                                <button 
                                  onClick={() => handleDelete(prospect.id)}
                                  title="Eliminar prospecto"
                                  style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px', borderRadius: '50%', backgroundColor: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                  </svg>
                                </button>
                              </div>
                            </div>
                            
                            <div style={{ fontSize: '0.875rem', color: 'var(--pulpos-text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                              {prospect.phone}
                            </div>
                            {prospect.company && (
                              <div style={{ fontSize: '0.875rem', color: 'var(--pulpos-text-muted)' }}>Empresa: {prospect.company}</div>
                            )}

                            {/* Dropdown for assignment if coordinator/lider */}
                            {(currentUser.isSuperAdmin || currentUser.commissionRole === 'COORDINADOR' || currentUser.commissionRole === 'LIDER') && (
                              <div style={{ marginTop: '0.5rem' }}>
                                <select 
                                  value={prospect.assignedUserId || ""}
                                  onChange={(e) => handleAssign(prospect.id, e.target.value)}
                                  style={{ width: '100%', padding: '0.25rem', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#475569' }}
                                >
                                  <option value="">Sin asignar</option>
                                  {users.map((u: any) => (
                                    <option key={u.id} value={u.id}>{u.name} ({u.commissionRole})</option>
                                  ))}
                                </select>
                              </div>
                            )}
                            {(!currentUser.isSuperAdmin && currentUser.commissionRole === 'VENDEDOR') && prospect.assignedUser && (
                              <div style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: '#64748b' }}>
                                Asignado a: {prospect.assignedUser.name}
                              </div>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </DragDropContext>
    </div>
  );
}
