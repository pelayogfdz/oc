"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getRecentQuotes, searchCustomers, assignCustomerToProspect } from "../../../../../actions/whatsapp-crm";

export default function ChatInterface({ prospect }: { prospect: any }) {
  const [messages, setMessages] = useState<any[]>(prospect.messages || []);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Modal states
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [quotes, setQuotes] = useState<any[]>([]);
  
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");

  // Auto-scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Polling for new messages
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/prospects/${prospect.id}/messages`);
        if (res.ok) {
          const data = await res.json();
          if (data.messages && data.messages.length > messages.length) {
            setMessages(data.messages);
          }
        }
      } catch (e) {
        console.error("Polling error", e);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [prospect.id, messages.length]);

  const sendMessage = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const textToSend = customText || inputText;
    if (!textToSend.trim()) return;

    setIsSending(true);
    const tempMsg = {
      id: `temp-${Date.now()}`,
      body: textToSend,
      isFromMe: true,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempMsg]);
    if (!customText) setInputText("");

    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: prospect.phone,
          message: tempMsg.body,
          prospectId: prospect.id
        })
      });

      if (res.ok) {
        router.refresh();
      } else {
        alert("Error al enviar mensaje. Verifica que el microservicio de WhatsApp esté conectado.");
        setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
      }
    } catch (e) {
      alert("Error de conexión con el microservicio.");
      setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
    } finally {
      setIsSending(false);
    }
  };

  const handleOpenQuotes = async () => {
    setShowQuoteModal(true);
    const data = await getRecentQuotes(prospect.branch?.tenantId || "");
    setQuotes(data);
  };

  const handleSendQuote = (quoteId: string) => {
    const link = `${window.location.origin}/ventas/detalle/${quoteId}/imprimir-cotizacion`;
    const msg = `¡Hola! Aquí tienes el enlace a tu cotización solicitada: \n${link}`;
    sendMessage(undefined, msg);
    setShowQuoteModal(false);
  };

  const handleSearchCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = await searchCustomers(customerSearch, prospect.branch?.tenantId || "");
    setCustomers(data);
  };

  const handleAssignCustomer = async (customerId: string) => {
    await assignCustomerToProspect(prospect.id, customerId);
    setShowCustomerModal(false);
    alert("Cliente asignado exitosamente.");
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      
      {/* Modals Overlay */}
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
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Asignar a Cliente</h3>
                <button onClick={() => setShowCustomerModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
              </div>
              <form onSubmit={handleSearchCustomer} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <input type="text" value={customerSearch} onChange={e => setCustomerSearch(e.target.value)} placeholder="Buscar nombre de cliente..." style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                <button type="submit" style={{ backgroundColor: '#0f172a', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer' }}>Buscar</button>
              </form>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {customers.length === 0 ? <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Busca un cliente para asignarlo.</p> : customers.map(c => (
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

      {/* Mensajes Area */}
      <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', backgroundRepeat: 'repeat', backgroundColor: '#e5e7eb', backgroundBlendMode: 'overlay' }}>
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: '12px', alignSelf: 'center', color: '#64748b' }}>
            No hay mensajes aún. ¡Envía el primero!
          </div>
        ) : (
          messages.map(msg => (
            <div 
              key={msg.id} 
              style={{
                alignSelf: msg.isFromMe ? 'flex-end' : 'flex-start',
                backgroundColor: msg.isFromMe ? '#dcf8c6' : '#ffffff',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                borderTopRightRadius: msg.isFromMe ? '0' : '8px',
                borderTopLeftRadius: !msg.isFromMe ? '0' : '8px',
                maxWidth: '75%',
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                position: 'relative'
              }}
            >
              <div style={{ fontSize: '0.95rem', color: '#1e293b', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                {msg.body}
              </div>
              <div style={{ fontSize: '0.65rem', color: '#94a3b8', textAlign: 'right', marginTop: '0.25rem' }}>
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div style={{ padding: '0.75rem 1rem', backgroundColor: '#ffffff', borderTop: '1px solid var(--pulpos-border)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        
        {/* Barra de Acciones / Herramientas */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem', alignItems: 'center' }}>
          <button title="Emojis" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', fontSize: '1.25rem', opacity: 0.7, transition: 'opacity 0.2s' }} onMouseOver={e => e.currentTarget.style.opacity='1'} onMouseOut={e => e.currentTarget.style.opacity='0.7'}>
            😀
          </button>
          <button title="Adjuntar Archivo / Foto" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', fontSize: '1.25rem', opacity: 0.7, transition: 'opacity 0.2s' }} onMouseOver={e => e.currentTarget.style.opacity='1'} onMouseOut={e => e.currentTarget.style.opacity='0.7'}>
            📎
          </button>
          <button title="Mensajes Preestablecidos" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', fontSize: '1.25rem', opacity: 0.7, transition: 'opacity 0.2s' }} onMouseOver={e => e.currentTarget.style.opacity='1'} onMouseOut={e => e.currentTarget.style.opacity='0.7'}>
            💬
          </button>
          <div style={{ width: '1px', height: '24px', backgroundColor: '#cbd5e1', margin: '0 0.5rem' }}></div>
          
          <button 
            onClick={() => router.push('/ventas/cotizaciones/nueva?prospectId=' + prospect.id)}
            style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569', cursor: 'pointer', padding: '0.25rem 0.75rem', borderRadius: '16px', fontSize: '0.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            ➕ Nueva Cotización
          </button>
          
          <button 
            onClick={handleOpenQuotes}
            style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569', cursor: 'pointer', padding: '0.25rem 0.75rem', borderRadius: '16px', fontSize: '0.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            📂 Cargar Cotización
          </button>
          
          <button 
            onClick={() => setShowCustomerModal(true)}
            style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', cursor: 'pointer', padding: '0.25rem 0.75rem', borderRadius: '16px', fontSize: '0.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            👤 {prospect.customerId ? "Cliente Vinculado" : "Asignar a Cliente Existente"}
          </button>

          <div style={{ flex: 1 }}></div>
          <button title="Generar con IA" style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', cursor: 'pointer', padding: '0.25rem 0.75rem', borderRadius: '16px', fontSize: '0.875rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            ✨ Asistente IA
          </button>
        </div>

        <form onSubmit={e => sendMessage(e)} style={{ display: 'flex', width: '100%', gap: '0.5rem' }}>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Escribe un mensaje..."
            style={{ flex: 1, padding: '0.75rem 1rem', borderRadius: '24px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: '#f8fafc' }}
            disabled={isSending}
          />
          <button 
            type="submit" 
            disabled={!inputText.trim() || isSending}
            style={{ 
              width: '48px', height: '48px', borderRadius: '50%', backgroundColor: inputText.trim() ? '#25d366' : '#cbd5e1', 
              color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: inputText.trim() ? 'pointer' : 'not-allowed',
              transition: 'background-color 0.2s ease'
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'translateX(-2px) translateY(1px)' }}>
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
