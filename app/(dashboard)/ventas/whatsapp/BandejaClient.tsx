"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ChatInterface from "../prospeccion/chat/[id]/ChatInterface";

export default function BandejaClient({ initialProspects, users, currentUser }: any) {
  const [prospects, setProspects] = useState(initialProspects);
  const [selectedProspectId, setSelectedProspectId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();

  const selectedProspect = prospects.find((p: any) => p.id === selectedProspectId);

  const handleAssign = async (prospectId: string, userId: string) => {
    // Optimistic update
    setProspects((prev: any) => 
      prev.map((p: any) => p.id === prospectId ? { 
        ...p, 
        assignedUserId: userId,
        assignedUser: users.find((u:any) => u.id === userId) || null
      } : p)
    );

    try {
      await fetch(`/api/prospects/${prospectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedUserId: userId })
      });
      router.refresh();
    } catch (e) {
      console.error(e);
    }
  };

  const filteredProspects = prospects.filter((p: any) => 
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.phone?.includes(searchTerm)
  );

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {/* Sidebar de Conversaciones */}
      <div style={{ width: '350px', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', backgroundColor: '#f8fafc' }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0', backgroundColor: 'white' }}>
          <h2 style={{ fontWeight: '600', fontSize: '1.125rem' }}>Chats Entrantes</h2>
          <input 
            type="text" 
            placeholder="Buscar conversación..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', marginTop: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
          />
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filteredProspects.map((prospect: any) => {
            const isSelected = selectedProspectId === prospect.id;
            const isUnassigned = !prospect.assignedUserId;
            
            // Determinar último mensaje (están ordenados por desc en la query de DB)
            const lastMessage = prospect.messages && prospect.messages.length > 0 
              ? prospect.messages[0] 
              : null;

            return (
              <div 
                key={prospect.id}
                onClick={() => setSelectedProspectId(prospect.id)}
                style={{ 
                  padding: '1rem', 
                  borderBottom: '1px solid #e2e8f0', 
                  cursor: 'pointer',
                  backgroundColor: isSelected ? '#eff6ff' : 'white',
                  transition: 'background-color 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '1rem', color: '#1e293b' }}>{prospect.name}</strong>
                  {isUnassigned && (
                    <span style={{ fontSize: '0.7rem', backgroundColor: '#ef4444', color: 'white', padding: '0.1rem 0.4rem', borderRadius: '1rem', fontWeight: 'bold' }}>
                      NUEVO
                    </span>
                  )}
                </div>
                
                <div style={{ fontSize: '0.875rem', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{prospect.phone}</span>
                  {lastMessage && (
                    <span style={{ fontSize: '0.75rem' }}>
                      {new Date(lastMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
                
                {lastMessage && (
                  <div style={{ fontSize: '0.875rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {lastMessage.isFromMe ? "Tú: " : ""}{lastMessage.body}
                  </div>
                )}

                <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: prospect.assignedUser ? '#2563eb' : '#f59e0b', fontWeight: '500' }}>
                  {prospect.assignedUser ? `Asignado a: ${prospect.assignedUser.name}` : 'Sin asignar'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Panel Principal de Chat */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#f1f5f9' }}>
        {selectedProspect ? (
          <>
            {/* Header del Chat */}
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0', backgroundColor: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1e293b' }}>{selectedProspect.name}</h3>
                <p style={{ fontSize: '0.875rem', color: '#64748b' }}>{selectedProspect.phone}</p>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.875rem', color: '#475569', fontWeight: '500' }}>Agente asignado:</span>
                <select 
                  value={selectedProspect.assignedUserId || ""}
                  onChange={(e) => handleAssign(selectedProspect.id, e.target.value)}
                  style={{ 
                    padding: '0.5rem 1rem', 
                    fontSize: '0.875rem', 
                    borderRadius: '8px', 
                    border: '1px solid #cbd5e1', 
                    backgroundColor: '#f8fafc', 
                    color: '#1e293b',
                    fontWeight: '500',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="">-- Sin asignar --</option>
                  {users.map((u: any) => (
                    <option key={u.id} value={u.id}>{u.name} ({u.commissionRole})</option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Área de Chat (Reutilizando el componente) */}
            <div style={{ flex: 1, overflow: 'hidden' }}>
              {/* Es crucial agregar el key={selectedProspect.id} para que React desmonte y vuelva a montar el ChatInterface, asegurando que se resetee el estado de mensajes cuando cambiamos de prospecto */}
              <ChatInterface key={selectedProspect.id} prospect={selectedProspect} />
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '1rem', opacity: 0.5 }}>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '500' }}>Selecciona una conversación</h3>
            <p style={{ marginTop: '0.5rem' }}>Elige un prospecto de la izquierda para ver los mensajes o asignarlo a un asesor.</p>
          </div>
        )}
      </div>
    </div>
  );
}
