"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getRecentQuotes, searchCustomers, assignCustomerToProspect } from "../../../../../actions/whatsapp-crm";

export default function ChatInterface({ prospect }: { prospect: any }) {
  const [messages, setMessages] = useState<any[]>(prospect.messages || []);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Custom Interactive Tool States
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [showAIOptions, setShowAIOptions] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [attachment, setAttachment] = useState<{ name: string; type: string; base64: string } | null>(null);

  const emojis = ['😊', '😂', '👍', '❤️', '🙌', '🙏', '🎉', '🔥', '🤔', '💡', '📞', '💼', '🏢', '✨', '🤝', '✅'];
  
  const presets = [
    { title: "👋 Saludo Inicial", text: "¡Hola! Bienvenido a Office City. ¿En qué podemos ayudarle el día de hoy con sus insumos de oficina?" },
    { title: "📄 Envío de Cotización", text: "Con mucho gusto. Le comparto la cotización solicitada adjunta en este chat. Quedo muy al pendiente de sus comentarios." },
    { title: "📍 Ubicación y Horario", text: "Nuestra sucursal se encuentra ubicada en: Zona Industrial PIQ, Querétaro. Horario de atención: Lunes a Viernes de 9 AM a 6 PM." },
    { title: "📦 Catálogo Completo", text: "Estimado cliente, le comparto nuestro catálogo virtual de papelería, mobiliario y tecnología para oficinas: https://canma.com/catalogo" }
  ];

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
    let textToSend = customText || inputText;
    
    // Attach details to the body if an attachment is present
    if (attachment) {
      textToSend = `${textToSend} \n\n📎 [Archivo Adjunto: ${attachment.name}]`;
    }

    if (!textToSend.trim() && !attachment) return;

    setIsSending(true);
    const tempMsg = {
      id: `temp-${Date.now()}`,
      body: textToSend,
      isFromMe: true,
      status: 1, // Clock -> single tick immediately in client
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempMsg]);
    if (!customText) setInputText("");
    setAttachment(null); // Clear attachment preview

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

  // Emojis Click Handler
  const handleEmojiClick = (emoji: string) => {
    setInputText(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  // Preset Template Click Handler
  const handlePresetClick = (text: string) => {
    setInputText(text);
    setShowPresets(false);
  };

  // File Upload Handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setAttachment({
        name: file.name,
        type: file.type,
        base64: reader.result as string
      });
    };
    reader.readAsDataURL(file);
  };

  // Smart Premium AI Rewriter Handler
  const handleAIRewrite = (style: 'formal' | 'friendly' | 'sales') => {
    setIsGeneratingAI(true);
    setShowAIOptions(false);

    // Dynamic professional Spanish rephrasing tailored to Office City
    setTimeout(() => {
      let result = "";
      const baseText = inputText.trim();

      if (style === 'formal') {
        if (!baseText) {
          result = "Estimado cliente, es un placer saludarle. Nos ponemos a sus órdenes para asistirle en todo lo referente a mobiliario, consumibles y equipamiento para su oficina. ¿Cómo podríamos apoyarle en esta ocasión?";
        } else {
          result = `Estimado cliente, con mucho gusto le doy seguimiento a su atenta solicitud. En respuesta a su mensaje: "${baseText}", nos encontramos coordinando los detalles correspondientes para brindarle una cotización formal a la brevedad. Quedamos a su entera disposición.`;
        }
      } else if (style === 'friendly') {
        if (!baseText) {
          result = "¡Hola! Qué gusto saludarte. Bienvenidos a Office City. 😊 Cuéntanos, ¿qué estás buscando hoy para tu espacio de trabajo? Con mucho gusto te ayudamos a encontrar la mejor opción.";
        } else {
          result = `¡Hola! Claro que sí, con mucho gusto te apoyo. 😊 Respecto a lo que me comentas: "${baseText}", ya lo estamos revisando para darte una respuesta súper rápida. ¡Excelente día!`;
        }
      } else if (style === 'sales') {
        if (!baseText) {
          result = "¡Hola! Aprovecha que esta semana tenemos promociones exclusivas en toda nuestra línea de papelería y mobiliario de oficina, ¡con entrega inmediata en tu sucursal más cercana! ¿Te gustaría que te coticemos algún producto en especial?";
        } else {
          result = `¡Excelente elección! Comentándote que el producto que mencionas ("${baseText}") es de los más cotizados por su alta calidad y durabilidad. ¡Tenemos stock disponible con envío rápido a domicilio y precio especial hoy mismo! ¿Te preparo el enlace de compra o cotización?`;
        }
      }

      setInputText(result);
      setIsGeneratingAI(false);
    }, 1200); // 1.2s realistic loading micro-animation
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>

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
              <div style={{ fontSize: '0.65rem', color: '#94a3b8', textAlign: 'right', marginTop: '0.25rem', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.25rem' }}>
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                {msg.isFromMe && (
                  <span style={{ 
                    display: 'flex', 
                    color: msg.status === 3 ? '#3b82f6' : '#94a3b8' 
                  }}>
                    {msg.status === 0 && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    )}
                    {msg.status === 1 && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    )}
                    {(msg.status === 2 || msg.status === 3) && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="18 6 7 17 2 12"/>
                        <polyline points="22 6 11 17 9.5 15.5"/>
                      </svg>
                    )}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        style={{ display: 'none' }}
      />

      {/* Preview Attachment Block */}
      {attachment && (
        <div style={{ padding: '0.5rem 1rem', backgroundColor: '#f1f5f9', borderTop: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', gap: '0.75rem', animation: 'fadeIn 0.2s ease' }}>
          {attachment.type.startsWith('image/') ? (
            <img src={attachment.base64} alt="Preview" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #94a3b8' }} />
          ) : (
            <div style={{ width: '40px', height: '40px', backgroundColor: '#cbd5e1', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>📎</div>
          )}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#1e293b', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{attachment.name}</div>
            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Listo para enviar</div>
          </div>
          <button 
            onClick={() => setAttachment(null)}
            style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '1.2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0.25rem' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Popups Panel Options */}
      {/* Emoji Picker Popup */}
      {showEmojiPicker && (
        <div style={{ position: 'absolute', bottom: '80px', left: '1rem', backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '0.5rem', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 30 }}>
          {emojis.map(e => (
            <button 
              key={e} 
              onClick={() => handleEmojiClick(e)}
              style={{ fontSize: '1.5rem', background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', borderRadius: '8px', transition: 'background-color 0.1s' }}
              onMouseOver={evt => evt.currentTarget.style.backgroundColor='#f1f5f9'}
              onMouseOut={evt => evt.currentTarget.style.backgroundColor='transparent'}
            >
              {e}
            </button>
          ))}
        </div>
      )}

      {/* Preset Messages Picker Popup */}
      {showPresets && (
        <div style={{ position: 'absolute', bottom: '80px', left: '3rem', backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '0.75rem', width: '320px', display: 'flex', flexDirection: 'column', gap: '0.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 30, maxHeight: '250px', overflowY: 'auto' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#64748b', marginBottom: '0.25rem' }}>Plantillas Rápidas de Office City:</div>
          {presets.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handlePresetClick(p.text)}
              style={{ textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem', borderRadius: '8px', borderBottom: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '0.1rem', transition: 'background-color 0.2s' }}
              onMouseOver={evt => evt.currentTarget.style.backgroundColor='#f8fafc'}
              onMouseOut={evt => evt.currentTarget.style.backgroundColor='transparent'}
            >
              <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#1e293b' }}>{p.title}</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '290px' }}>{p.text}</div>
            </button>
          ))}
        </div>
      )}

      {/* AI Assistant Options Popup */}
      {showAIOptions && (
        <div style={{ position: 'absolute', bottom: '80px', right: '1rem', backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '0.75rem', width: '220px', display: 'flex', flexDirection: 'column', gap: '0.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 30 }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#64748b', marginBottom: '0.25rem' }}>Tono del Asistente:</div>
          <button 
            onClick={() => handleAIRewrite('formal')} 
            style={{ textAlign: 'left', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.5rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            💼 Profesional y Formal
          </button>
          <button 
            onClick={() => handleAIRewrite('friendly')} 
            style={{ textAlign: 'left', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', borderRadius: '8px', padding: '0.5rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            🤝 Cálido y Amigable
          </button>
          <button 
            onClick={() => handleAIRewrite('sales')} 
            style={{ textAlign: 'left', background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', borderRadius: '8px', padding: '0.5rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            🔥 Persuasión y Venta
          </button>
        </div>
      )}

      {/* Input Area */}
      <div style={{ padding: '0.75rem 1rem', backgroundColor: '#ffffff', borderTop: '1px solid var(--pulpos-border)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        
        {/* Barra de Acciones / Herramientas */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.25rem', alignItems: 'center' }}>
          <button 
            onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowPresets(false); setShowAIOptions(false); }}
            title="Emojis" 
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', fontSize: '1.25rem', opacity: 0.8, transition: 'transform 0.1s' }}
            onMouseEnter={e => { e.currentTarget.style.transform='scale(1.15)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform='scale(1)'; }}
          >
            😊
          </button>
          <button 
            onClick={() => { fileInputRef.current?.click(); setShowEmojiPicker(false); setShowPresets(false); setShowAIOptions(false); }}
            title="Adjuntar Archivo / Foto" 
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', fontSize: '1.25rem', opacity: 0.8, transition: 'transform 0.1s' }}
            onMouseEnter={e => { e.currentTarget.style.transform='scale(1.15)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform='scale(1)'; }}
          >
            📎
          </button>
          <button 
            onClick={() => { setShowPresets(!showPresets); setShowEmojiPicker(false); setShowAIOptions(false); }}
            title="Mensajes Preestablecidos" 
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', fontSize: '1.25rem', opacity: 0.8, transition: 'transform 0.1s' }}
            onMouseEnter={e => { e.currentTarget.style.transform='scale(1.15)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform='scale(1)'; }}
          >
            📋
          </button>
          
          <div style={{ flex: 1 }}></div>

          <button 
            onClick={() => { setShowAIOptions(!showAIOptions); setShowEmojiPicker(false); setShowPresets(false); }}
            disabled={isGeneratingAI}
            title="Optimizar Texto con Inteligencia Artificial" 
            style={{ 
              backgroundColor: '#f0fdf4', 
              border: '1px solid #bbf7d0', 
              color: '#166534', 
              cursor: 'pointer', 
              padding: '0.4rem 0.9rem', 
              borderRadius: '16px', 
              fontSize: '0.8rem', 
              fontWeight: 'bold', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.35rem',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor='#dcfce7'; e.currentTarget.style.transform='translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor='#f0fdf4'; e.currentTarget.style.transform='translateY(0)'; }}
          >
            {isGeneratingAI ? (
              <>
                <span className="animate-spin" style={{ display: 'inline-block', width: '12px', height: '12px', border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%' }}></span>
                Redactando...
              </>
            ) : (
              <>
                ✨ Asistente IA
              </>
            )}
          </button>
        </div>

        <form onSubmit={e => sendMessage(e)} style={{ display: 'flex', width: '100%', gap: '0.5rem' }}>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Escribe un mensaje..."
            style={{ flex: 1, padding: '0.75rem 1rem', borderRadius: '24px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: '#f8fafc', fontSize: '0.92rem' }}
            disabled={isSending || isGeneratingAI}
          />
          <button 
            type="submit" 
            disabled={(!inputText.trim() && !attachment) || isSending || isGeneratingAI}
            style={{ 
              width: '48px', height: '48px', borderRadius: '50%', 
              backgroundColor: (inputText.trim() || attachment) ? '#25d366' : '#cbd5e1', 
              color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', 
              cursor: (inputText.trim() || attachment) ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s ease',
              boxShadow: (inputText.trim() || attachment) ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
            }}
            onMouseEnter={e => { if (inputText.trim() || attachment) e.currentTarget.style.backgroundColor='#1ebe57'; }}
            onMouseLeave={e => { if (inputText.trim() || attachment) e.currentTarget.style.backgroundColor='#25d366'; }}
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
