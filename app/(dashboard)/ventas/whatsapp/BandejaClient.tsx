"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ChatInterface from "../prospeccion/chat/[id]/ChatInterface";
import { useEffect } from "react";
import { getRecentQuotes, searchCustomers, assignCustomerToProspect } from "@/app/actions/whatsapp-crm";

export default function BandejaClient({ initialProspects, users, currentUser, customers = [] }: any) {
  const [prospects, setProspects] = useState(initialProspects);
  const [selectedProspectId, setSelectedProspectId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState("");

  // Keep prospects synced with server props
  useEffect(() => {
    setProspects(initialProspects);
  }, [initialProspects]);

  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [newChatName, setNewChatName] = useState("");
  const [newChatPhone, setNewChatPhone] = useState("");
  const [newChatCustomerId, setNewChatCustomerId] = useState<string>("");

  // Modal states for Header actions
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [quotes, setQuotes] = useState<any[]>([]);
  
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [searchedCustomers, setSearchedCustomers] = useState<any[]>([]);

  const handleCreateChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatName || !newChatPhone) return;

    try {
      const res = await fetch("/api/prospects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newChatName, phone: newChatPhone, customerId: newChatCustomerId || null })
      });
      if (res.ok) {
        const data = await res.json();
        
        // Add to list if it's new
        if (data.isNew) {
          setProspects((prev: any) => [data.prospect, ...prev]);
        }
        
        // Select it
        setSelectedProspectId(data.prospect.id);
        setIsNewChatModalOpen(false);
        setNewChatName("");
        setNewChatPhone("");
        setNewChatCustomerId("");
      } else {
        alert("Error al crear el chat");
      }
    } catch (e) {
      console.error(e);
      alert("Error de conexión");
    }
  };

  const selectedProspect = prospects.find((p: any) => p.id === selectedProspectId);

  useEffect(() => {
    if (selectedProspect) {
      setTempName(selectedProspect.name || "");
    }
    setIsEditingName(false);
  }, [selectedProspectId, selectedProspect]);

  const handleAssign = async (prospectId: string, userId: string) => {
    const finalUserId = userId === "" ? null : userId;

    // Optimistic update
    setProspects((prev: any) => 
      prev.map((p: any) => p.id === prospectId ? { 
        ...p, 
        assignedUserId: finalUserId,
        assignedUser: finalUserId ? users.find((u:any) => u.id === finalUserId) : null
      } : p)
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

  const handleOpenQuotes = async () => {
    if (!selectedProspect) return;
    setShowQuoteModal(true);
    const data = await getRecentQuotes(currentUser?.tenantId || "");
    setQuotes(data);
  };

  const handleSendQuote = async (quoteId: string) => {
    if (!selectedProspect) return;
    const link = `${window.location.origin}/ventas/detalle/${quoteId}/imprimir-cotizacion`;
    const msg = `¡Hola! Aquí tienes el enlace a tu cotización solicitada: \n${link}`;
    
    try {
      await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: selectedProspect.phone,
          message: msg,
          prospectId: selectedProspect.id
        })
      });
      setShowQuoteModal(false);
      // Let polling in ChatInterface pick it up, or trigger a refresh
      router.refresh();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSearchCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProspect) return;
    const data = await searchCustomers(customerSearch, currentUser?.tenantId || "");
    setSearchedCustomers(data);
  };

  const handleAssignCustomer = async (customerId: string) => {
    if (!selectedProspect) return;
    await assignCustomerToProspect(selectedProspect.id, customerId);
    const matchedCustomer = customers.find((c: any) => c.id === customerId) || searchedCustomers.find((c: any) => c.id === customerId);
    setProspects((prev: any) =>
      prev.map((p: any) => p.id === selectedProspect.id ? { ...p, customerId, customer: matchedCustomer } : p)
    );
    setShowCustomerModal(false);
    alert("Cliente asignado exitosamente.");
    router.refresh();
  };

  const handleSaveName = async () => {
    if (!selectedProspect || !tempName.trim()) return;
    try {
      const res = await fetch(`/api/prospects/${selectedProspect.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: tempName })
      });
      if (res.ok) {
        const updated = await res.json();
        setProspects((prev: any) =>
          prev.map((p: any) => p.id === selectedProspect.id ? { ...p, name: updated.name } : p)
        );
        setIsEditingName(false);
        router.refresh();
      } else {
        alert("Error al actualizar nombre");
      }
    } catch (err) {
      console.error(err);
      alert("Error de conexión");
    }
  };

  const handleUnlinkCustomer = async () => {
    if (!selectedProspect) return;
    if (confirm("¿Desvincular este chat de su cliente?")) {
      try {
        const res = await fetch(`/api/prospects/${selectedProspect.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customerId: null })
        });
        if (res.ok) {
          setProspects((prev: any) =>
            prev.map((p: any) => p.id === selectedProspect.id ? { ...p, customerId: null, customer: null } : p)
          );
          alert("Desvinculado exitosamente.");
          router.refresh();
        } else {
          alert("Error al desvincular");
        }
      } catch (e) {
        console.error(e);
        alert("Error de conexión");
      }
    }
  };

  const handleDeleteConversation = async () => {
    if (!selectedProspect) return;
    if (confirm("¿Está seguro que desea eliminar este prospecto y toda su conversación de WhatsApp permanentemente? Esta acción no se puede deshacer.")) {
      try {
        const res = await fetch(`/api/prospects/${selectedProspect.id}`, {
          method: "DELETE"
        });
        if (res.ok) {
          setProspects((prev: any) => prev.filter((p: any) => p.id !== selectedProspect.id));
          setSelectedProspectId(null);
          alert("Conversación eliminada exitosamente.");
          router.refresh();
        } else {
          alert("Error al eliminar conversación");
        }
      } catch (e) {
        console.error(e);
        alert("Error de conexión");
      }
    }
  };

  const filteredProspects = prospects.filter((p: any) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const nameMatch = p.name ? p.name.toLowerCase().includes(term) : false;
    const phoneMatch = p.phone ? p.phone.includes(term) : false;
    return nameMatch || phoneMatch;
  });

  return (
    <div style={{ display: 'flex', height: '100%', position: 'relative' }}>
      {/* Modal Nuevo Chat */}
      {isNewChatModalOpen && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', width: '400px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Nuevo Chat de WhatsApp</h3>
            <form onSubmit={handleCreateChat}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Cliente (Opcional)</label>
                <select 
                  value={newChatCustomerId} 
                  onChange={e => {
                    setNewChatCustomerId(e.target.value);
                    const c = customers.find((x: any) => x.id === e.target.value);
                    if (c) {
                      setNewChatName(c.name);
                      if (c.phone) setNewChatPhone(c.phone);
                    }
                  }} 
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  <option value="">-- Seleccionar o crear nuevo --</option>
                  {customers.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Nombre del Contacto</label>
                <input required type="text" value={newChatName} onChange={e => setNewChatName(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Número de Teléfono (ej. 521...)</label>
                <input required type="text" value={newChatPhone} onChange={e => setNewChatPhone(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" onClick={() => setIsNewChatModalOpen(false)} style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white' }}>Cancelar</button>
                <button type="submit" style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', backgroundColor: '#2563eb', color: 'white', fontWeight: '500' }}>Crear y Chatear</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modals Overlay para Cotizaciones y Clientes */}
      {(showQuoteModal || showCustomerModal) && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          
          {/* Quote Modal */}
          {showQuoteModal && (
            <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', width: '90%', maxWidth: '500px', maxHeight: '80%', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Últimas Cotizaciones</h3>
                <button onClick={() => setShowQuoteModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {quotes.length === 0 ? <p style={{ color: '#64748b' }}>No hay cotizaciones recientes.</p> : quotes.map(q => (
                  <div key={q.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Cotización #{q.id.substring(0,6).toUpperCase()}</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{q.customer?.name || "Público General"} - ${q.total.toFixed(2)}</div>
                    </div>
                    <button 
                      onClick={() => handleSendQuote(q.id)}
                      style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}>
                      Enviar Link
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Customer Modal */}
          {showCustomerModal && (
            <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', width: '90%', maxWidth: '500px', maxHeight: '80%', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Asignar a Cliente Existente</h3>
                <button onClick={() => setShowCustomerModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
              </div>
              <form onSubmit={handleSearchCustomer} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <input type="text" value={customerSearch} onChange={e => setCustomerSearch(e.target.value)} placeholder="Buscar nombre de cliente..." style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                <button type="submit" style={{ backgroundColor: '#0f172a', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer' }}>Buscar</button>
              </form>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {searchedCustomers.length === 0 ? <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Busca un cliente para asignarlo.</p> : searchedCustomers.map(c => (
                  <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{c.name}</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{c.phone || c.email || 'Sin datos de contacto'}</div>
                    </div>
                    <button 
                      onClick={() => handleAssignCustomer(c.id)}
                      style={{ backgroundColor: '#16a34a', color: 'white', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}>
                      Vincular
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sidebar de Conversaciones */}
      <div style={{ width: '350px', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', backgroundColor: '#f8fafc' }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0', backgroundColor: 'white' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontWeight: '600', fontSize: '1.125rem' }}>Chats Entrantes</h2>
            <button 
              onClick={() => setIsNewChatModalOpen(true)}
              style={{ padding: '0.3rem 0.6rem', backgroundColor: '#2563eb', color: 'white', borderRadius: '6px', border: 'none', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 'bold' }}>
              + Nuevo
            </button>
          </div>
          <input 
            type="text" 
            placeholder="Buscar conversación..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', marginTop: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
          />
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filteredProspects.map((prospect: any) => {
            const isSelected = selectedProspectId === prospect.id;
            const isUnassigned = !prospect.assignedUserId;
            
            // Determinar último mensaje (ahora están ordenados por asc en la query de DB para que el chat funcione)
            const lastMessage = prospect.messages && prospect.messages.length > 0 
              ? prospect.messages[prospect.messages.length - 1] 
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
                {isEditingName ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <input 
                      type="text" 
                      value={tempName} 
                      onChange={e => setTempName(e.target.value)} 
                      style={{ 
                        fontSize: '1.1rem', 
                        fontWeight: 'bold', 
                        padding: '0.25rem 0.5rem', 
                        borderRadius: '6px', 
                        border: '1px solid #cbd5e1',
                        outline: 'none'
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleSaveName();
                        if (e.key === 'Escape') setIsEditingName(false);
                      }}
                      autoFocus
                    />
                    <button 
                      onClick={handleSaveName} 
                      style={{ padding: '0.25rem 0.75rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}>
                      Guardar
                    </button>
                    <button 
                      onClick={() => setIsEditingName(false)} 
                      style={{ padding: '0.25rem 0.75rem', backgroundColor: '#cbd5e1', color: '#334155', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}>
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>{selectedProspect.name}</h3>
                    <button 
                      onClick={() => {
                        setTempName(selectedProspect.name || "");
                        setIsEditingName(true);
                      }} 
                      title="Editar nombre"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', display: 'inline-flex', alignItems: 'center', color: '#64748b' }}>
                      ✏️
                    </button>
                  </div>
                )}
                <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>{selectedProspect.phone}</p>
                {selectedProspect.customerId ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                    <span style={{ 
                      fontSize: '0.75rem', 
                      backgroundColor: '#eff6ff', 
                      color: '#1d4ed8', 
                      padding: '0.25rem 0.5rem', 
                      borderRadius: '12px', 
                      border: '1px solid #bfdbfe',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}>
                      🫱🔗 Cliente: {selectedProspect.customer?.name || "Cargando..."}
                    </span>
                    <button 
                      onClick={() => setShowCustomerModal(true)} 
                      style={{ 
                        background: 'none', 
                        border: 'none', 
                        color: '#2563eb', 
                        cursor: 'pointer', 
                        fontSize: '0.75rem', 
                        textDecoration: 'underline',
                        padding: 0
                      }}>
                      Cambiar
                    </button>
                    <span style={{ color: '#cbd5e1', fontSize: '0.75rem' }}>|</span>
                    <button 
                      onClick={handleUnlinkCustomer} 
                      style={{ 
                        background: 'none', 
                        border: 'none', 
                        color: '#ef4444', 
                        cursor: 'pointer', 
                        fontSize: '0.75rem', 
                        textDecoration: 'underline',
                        padding: 0
                      }}>
                      Desvincular
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                    <span style={{ 
                      fontSize: '0.75rem', 
                      backgroundColor: '#f8fafc', 
                      color: '#64748b', 
                      padding: '0.25rem 0.5rem', 
                      borderRadius: '12px', 
                      border: '1px solid #e2e8f0',
                      fontWeight: 500
                    }}>
                      Sin cliente vinculado
                    </span>
                    <button 
                      onClick={() => setShowCustomerModal(true)} 
                      style={{ 
                        background: 'none', 
                        border: 'none', 
                        color: '#2563eb', 
                        cursor: 'pointer', 
                        fontSize: '0.75rem', 
                        textDecoration: 'underline',
                        padding: 0
                      }}>
                      Vincular Cliente
                    </button>
                  </div>
                )}
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                
                <button 
                  onClick={handleOpenQuotes}
                  style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569', cursor: 'pointer', padding: '0.25rem 0.75rem', borderRadius: '16px', fontSize: '0.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  📂 Cargar Cotización
                </button>

                <button 
                  onClick={() => setShowCustomerModal(true)}
                  style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', cursor: 'pointer', padding: '0.25rem 0.75rem', borderRadius: '16px', fontSize: '0.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  👤 {selectedProspect.customerId ? "Cliente Vinculado" : "Asignar a Cliente Existente"}
                </button>

                {!selectedProspect.customerId && (
                  <button
                    onClick={async () => {
                      if(confirm("¿Guardar este prospecto como cliente en el sistema?")) {
                        try {
                          const res = await fetch(`/api/prospects/${selectedProspect.id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ createCustomer: true })
                          });
                          if (res.ok) {
                            const updated = await res.json();
                            setProspects((prev: any) =>
                              prev.map((p: any) => p.id === selectedProspect.id ? { ...p, customerId: updated.customerId, customer: updated.customer } : p)
                            );
                            router.refresh();
                          }
                        } catch(e) {
                          alert("Error al guardar como cliente");
                        }
                      }
                    }}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: '#f59e0b',
                      color: 'white',
                      borderRadius: '8px',
                      border: 'none',
                      fontWeight: 'bold',
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                      <line x1="20" y1="8" x2="20" y2="14"></line>
                      <line x1="23" y1="11" x2="17" y2="11"></line>
                    </svg>
                    Guardar en Clientes
                  </button>
                )}

                <button
                  onClick={() => {
                    if (selectedProspect.customerId) {
                      router.push(`/ventas/cotizaciones/nueva?customerId=${selectedProspect.customerId}`);
                    } else {
                      router.push(`/ventas/cotizaciones/nueva?prospectId=${selectedProspect.id}`);
                    }
                  }}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#10b981',
                    color: 'white',
                    borderRadius: '8px',
                    border: 'none',
                    fontWeight: 'bold',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                  </svg>
                  Crear Cotización
                </button>

                <span style={{ fontSize: '0.875rem', color: '#475569', fontWeight: '500', marginLeft: '1rem' }}>Agente asignado:</span>
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
                    cursor: 'pointer',
                    marginRight: '0.5rem'
                  }}
                >
                  <option value="">-- Sin asignar --</option>
                  {users.map((u: any) => (
                    <option key={u.id} value={u.id}>{u.name} ({u.commissionRole})</option>
                  ))}
                </select>

                <button
                  onClick={handleDeleteConversation}
                  title="Eliminar Conversación"
                  style={{
                    padding: '0.5rem',
                    backgroundColor: '#fee2e2',
                    border: '1px solid #fecaca',
                    color: '#dc2626',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#fecaca';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#fee2e2';
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                  </svg>
                </button>
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
