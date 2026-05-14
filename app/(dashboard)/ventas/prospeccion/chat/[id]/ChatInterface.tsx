"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ChatInterface({ prospect }: { prospect: any }) {
  const [messages, setMessages] = useState<any[]>(prospect.messages || []);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Auto-scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Polling for new messages (could be replaced by WebSocket/SSE later)
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
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [prospect.id, messages.length]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    setIsSending(true);
    const tempMsg = {
      id: `temp-${Date.now()}`,
      body: inputText,
      isFromMe: true,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempMsg]);
    setInputText("");

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
        // We let polling or immediate refresh grab the real DB record
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
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
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
          <button title="Emojis" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', fontSize: '1.25rem', opacity: 0.7, transition: 'opacity 0.2s' }} onMouseOver={e => e.currentTarget.style.opacity='1'} onMouseOut={e => e.currentTarget.style.opacity='0.7'}>
            😀
          </button>
          <button title="Adjuntar Archivo / Foto" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', fontSize: '1.25rem', opacity: 0.7, transition: 'opacity 0.2s' }} onMouseOver={e => e.currentTarget.style.opacity='1'} onMouseOut={e => e.currentTarget.style.opacity='0.7'}>
            📎
          </button>
          <button title="Cotización Rápida" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', fontSize: '1.25rem', opacity: 0.7, transition: 'opacity 0.2s' }} onMouseOver={e => e.currentTarget.style.opacity='1'} onMouseOut={e => e.currentTarget.style.opacity='0.7'}>
            📋
          </button>
          <button title="Mensajes Preestablecidos" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', fontSize: '1.25rem', opacity: 0.7, transition: 'opacity 0.2s' }} onMouseOver={e => e.currentTarget.style.opacity='1'} onMouseOut={e => e.currentTarget.style.opacity='0.7'}>
            💬
          </button>
          <button title="Opciones de Sistema" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', fontSize: '1.25rem', opacity: 0.7, transition: 'opacity 0.2s' }} onMouseOver={e => e.currentTarget.style.opacity='1'} onMouseOut={e => e.currentTarget.style.opacity='0.7'}>
            ⚙️
          </button>
          <div style={{ flex: 1 }}></div>
          <button title="Generar con IA" style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', cursor: 'pointer', padding: '0.25rem 0.75rem', borderRadius: '16px', fontSize: '0.875rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            ✨ Asistente IA
          </button>
        </div>

        <form onSubmit={sendMessage} style={{ display: 'flex', width: '100%', gap: '0.5rem' }}>
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
