"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

const officeCityLocations = [
  { name: "Corporativo Matriz (Guadalajara)", coords: "20.6766,-103.3475", desc: "Av. de las Américas 1500, Country Club, GDL" },
  { name: "Sucursal Querétaro PIQ", coords: "20.7302,-103.3855", desc: "Parque Industrial Querétaro, Qro." },
  { name: "Sucursal Querétaro Centro", coords: "20.5888,-100.3899", desc: "Av. Zaragoza 120, Centro Histórico, Qro." },
  { name: "Sucursal Querétaro Norte (Juriquilla)", coords: "20.6908,-100.4439", desc: "Plaza Urban Juriquilla, Qro." }
];

const officeCityContacts = [
  { label: "Asesor José Samuel Subero", name: "José Samuel Subero Sánchez", phone: "5213344556677", email: "samuelsubero@canma.com", title: "Ejecutivo de Ventas B2B" },
  { label: "Office City Ventas Corporativas", name: "Oficina de Ventas Canma", phone: "5215580004321", email: "pelayof@tdq.com.mx", title: "Corporativo Central" },
  { label: "Soporte Técnico Canma", name: "Soporte Técnico Canma", phone: "5218009876543", email: "contacto@canma.com", title: "Mesa de Ayuda" }
];

const emojis = ['😊', '😂', '👍', '❤️', '🙌', '🙏', '🎉', '🔥', '🤔', '💡', '📞', '💼', '🏢', '✨', '🤝', '✅'];

const defaultPresets = [
  { title: "👋 Saludo Inicial", text: "¡Hola! Bienvenido a Office City. ¿En qué podemos ayudarle el día de hoy con sus insumos de oficina?" },
  { title: "📄 Envío de Cotización", text: "Con mucho gusto. Le comparto la cotización solicitada adjunta en este chat. Quedo muy al pendiente de sus comentarios." },
  { title: "📍 Ubicación y Horario", text: "Nuestra sucursal se encuentra ubicada en: Zona Industrial PIQ, Querétaro. Horario de atención: Lunes a Viernes de 9 AM a 6 PM." },
  { title: "📦 Catálogo Completo", text: "Estimado cliente, le comparto nuestro catálogo virtual de papelería, mobiliario y tecnología para oficinas: https://canma.com/catalogo" }
];

export default function FloatingWhatsappWidget() {
  const pathname = usePathname();
  const router = useRouter();

  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const res = await fetch(`/api/whatsapp/status?t=${Date.now()}`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data.isAuthorized === false) {
            setIsAuthorized(false);
          } else {
            setIsAuthorized(true);
          }
        } else {
          setIsAuthorized(false);
        }
      } catch (err) {
        console.error("Error checking WhatsApp authorization in widget", err);
        setIsAuthorized(false);
      }
    };
    checkAuthStatus();
  }, []);

  const [prospects, setProspects] = useState<any[]>([]);
  const [isFloatingOpen, setIsFloatingOpen] = useState(false);
  const [floatingActiveChatId, setFloatingActiveChatId] = useState<string | null>(null);
  const [floatingReplyText, setFloatingReplyText] = useState("");
  const [isSendingFloatingReply, setIsSendingFloatingReply] = useState(false);
  const [showNotificationToast, setShowNotificationToast] = useState(false);
  const [latestIncomingChat, setLatestIncomingChat] = useState<any | null>(null);

  const [showFloatingEmojiPicker, setShowFloatingEmojiPicker] = useState(false);
  const [showFloatingLocationPicker, setShowFloatingLocationPicker] = useState(false);
  const [showFloatingContactPicker, setShowFloatingContactPicker] = useState(false);
  const [showFloatingPresets, setShowFloatingPresets] = useState(false);
  const [floatingAttachment, setFloatingAttachment] = useState<any | null>(null);

  const [downloadedMedia, setDownloadedMedia] = useState<Record<string, { data: string; mimetype: string; filename: string }>>({});
  const [loadingMedia, setLoadingMedia] = useState<Record<string, boolean>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to the bottom of the active chat
  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  useEffect(() => {
    if (floatingActiveChatId) {
      scrollToBottom();
    }
  }, [floatingActiveChatId, prospects]);

  const parseMediaMsg = (body: string) => {
    if (!body) return { isMedia: false, type: "", caption: "" };
    const match = body.match(/^📎 \[(Imagen|Video|Audio|Archivo)\](?::\s*(.*))?$/s);
    if (match) {
      return {
        isMedia: true,
        type: match[1],
        caption: match[2] || ""
      };
    }
    if (body.startsWith('📎 [')) {
      const endBracketIdx = body.indexOf(']');
      if (endBracketIdx > 2) {
        const type = body.substring(4, endBracketIdx);
        const rest = body.substring(endBracketIdx + 1);
        const caption = rest.startsWith(':') ? rest.substring(1).trim() : rest.trim();
        return {
          isMedia: true,
          type: type,
          caption: caption
        };
      }
    }
    return { isMedia: false, type: "", caption: "" };
  };

  const getExtensionFromMimetype = (mimetype: string): string => {
    if (!mimetype) return '';
    const mime = mimetype.toLowerCase();
    if (mime.includes('pdf')) return '.pdf';
    if (mime.includes('excel') || mime.includes('spreadsheetml') || mime.includes('sheet') || mime.includes('csv')) return '.xlsx';
    if (mime.includes('word') || mime.includes('officedocument.wordprocessingml') || mime.includes('msword')) return '.docx';
    if (mime.includes('powerpoint') || mime.includes('presentationml')) return '.pptx';
    if (mime.includes('jpeg') || mime.includes('jpg')) return '.jpg';
    if (mime.includes('png')) return '.png';
    if (mime.includes('webp')) return '.webp';
    if (mime.includes('gif')) return '.gif';
    if (mime.includes('mp4')) return '.mp4';
    if (mime.includes('audio/ogg') || mime.includes('opus')) return '.ogg';
    if (mime.includes('audio/mpeg') || mime.includes('mp3')) return '.mp3';
    if (mime.includes('audio/aac')) return '.aac';
    if (mime.includes('audio/mp4')) return '.m4a';
    if (mime.includes('zip')) return '.zip';
    if (mime.includes('text/plain') || mime.includes('text')) return '.txt';
    return '';
  };

  const ensureExtension = (filename: string, mimetype: string): string => {
    if (!filename) filename = 'archivo';
    const ext = getExtensionFromMimetype(mimetype);
    if (ext && !filename.toLowerCase().endsWith(ext)) {
      const hasAnyExtension = /\.[a-zA-Z0-9]{2,4}$/.test(filename);
      if (!hasAnyExtension) {
        return `${filename}${ext}`;
      }
    }
    return filename;
  };

  const handleDownloadMedia = async (messageId: string, filename: string) => {
    if (!messageId) return;

    if (downloadedMedia[messageId]) {
      const media = downloadedMedia[messageId];
      try {
        const byteCharacters = atob(media.data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: media.mimetype });
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = ensureExtension(media.filename, media.mimetype);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } catch (err: any) {
        console.error("Local download failed:", err);
      }
      return;
    }

    if (loadingMedia[messageId]) return;
    setLoadingMedia(prev => ({ ...prev, [messageId]: true }));
    try {
      const response = await fetch(`/api/whatsapp/media/${encodeURIComponent(messageId)}?t=${Date.now()}`);
      if (!response.ok) {
        throw new Error("Failed to download media");
      }
      const media = await response.json();
      if (media.error) {
        throw new Error(media.error);
      }
      
      const fileToSave = {
        data: media.data,
        mimetype: media.mimetype,
        filename: ensureExtension(media.filename || filename || 'archivo', media.mimetype)
      };

      setDownloadedMedia(prev => ({
        ...prev,
        [messageId]: fileToSave
      }));

      const byteCharacters = atob(media.data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: media.mimetype });
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileToSave.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error("Error downloading media:", error);
      alert("No se pudo descargar el archivo: " + (error.message || "error de conexión"));
    } finally {
      setLoadingMedia(prev => ({ ...prev, [messageId]: false }));
    }
  };

  // Fetch prospects list on mount and start polling
  useEffect(() => {
    if (isAuthorized !== true) return;
    const fetchProspects = async () => {
      try {
        const res = await fetch(`/api/prospects?t=${Date.now()}`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data.prospects) {
            setProspects(data.prospects);
          }
        }
      } catch (err) {
        console.error("Error loading prospects in floating widget", err);
      }
    };

    fetchProspects();

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/prospects?t=${Date.now()}`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data.prospects) {
            // Check for changes (lengths, updatedAt, or message statuses)
            const currentStr = JSON.stringify(prospects.map((p: any) => ({
              id: p.id,
              updatedAt: p.updatedAt,
              msgCount: p.messages?.length || 0,
              lastMsgStatus: p.messages?.length > 0 ? p.messages[p.messages.length - 1].status : 0
            })));
            const newStr = JSON.stringify(data.prospects.map((p: any) => ({
              id: p.id,
              updatedAt: p.updatedAt,
              msgCount: p.messages?.length || 0,
              lastMsgStatus: p.messages?.length > 0 ? p.messages[p.messages.length - 1].status : 0
            })));
            
            if (currentStr !== newStr) {
              setProspects(data.prospects);
            }
          }
        }
      } catch (err) {
        console.error("Error polling prospects in floating widget", err);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [prospects, isAuthorized]);

  // Track new incoming messages to show a floating Toast notification
  useEffect(() => {
    if (isAuthorized !== true) return;
    if (prospects && prospects.length > 0) {
      let newestIncomingMessage: any = null;
      let newestProspect: any = null;
      
      prospects.forEach((p: any) => {
        if (p.messages && p.messages.length > 0) {
          const lastMsg = p.messages[p.messages.length - 1];
          if (!lastMsg.isFromMe) {
            if (!newestIncomingMessage || new Date(lastMsg.timestamp) > new Date(newestIncomingMessage.timestamp)) {
              newestIncomingMessage = lastMsg;
              newestProspect = p;
            }
          }
        }
      });

      if (newestIncomingMessage) {
        const lastCheckedTimeStr = localStorage.getItem("last_checked_incoming_msg_time");
        const lastCheckedTime = lastCheckedTimeStr ? new Date(lastCheckedTimeStr) : new Date();
        const msgTime = new Date(newestIncomingMessage.timestamp);

        if (msgTime > lastCheckedTime) {
          if (floatingActiveChatId !== newestProspect.id) {
            setLatestIncomingChat({
              prospect: newestProspect,
              message: newestIncomingMessage
            });
            setShowNotificationToast(true);
            
            // Auto hide after 8 seconds
            const timer = setTimeout(() => {
              setShowNotificationToast(false);
            }, 8000);
          }
          localStorage.setItem("last_checked_incoming_msg_time", msgTime.toISOString());
        }
      }
    }
  }, [prospects, floatingActiveChatId, isAuthorized]);

  // Hide the floating widget if user is in main WhatsApp section, or is unauthorized, or still loading authorization status
  if (pathname === "/ventas/whatsapp" || isAuthorized === false || isAuthorized === null) {
    return null;
  }

  const sendFloatingMessage = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    
    const messageText = customText || floatingReplyText;
    let bodyText = messageText;
    if (floatingAttachment) {
      const mediaTag = floatingAttachment.type.startsWith('image/') ? '📎 [Imagen]' : '📎 [Archivo]';
      bodyText = mediaTag + (messageText.trim() ? ": " + messageText.trim() : "");
    }

    if (!bodyText.trim() && !floatingAttachment) return;
    if (!floatingActiveChatId) return;

    const activeChat = prospects.find((p: any) => p.id === floatingActiveChatId);
    if (!activeChat) return;

    setIsSendingFloatingReply(true);
    const tempMsgId = `temp-${Date.now()}`;
    
    // Cache the optimistic attachment payload instantly
    if (floatingAttachment) {
      setDownloadedMedia(prev => ({
        ...prev,
        [tempMsgId]: {
          data: floatingAttachment.base64.split(';base64,')[1] || floatingAttachment.base64,
          mimetype: floatingAttachment.type,
          filename: floatingAttachment.name
        }
      }));
    }

    setFloatingReplyText("");
    const fileToSend = floatingAttachment;
    setFloatingAttachment(null);
    setShowFloatingEmojiPicker(false);
    setShowFloatingLocationPicker(false);
    setShowFloatingContactPicker(false);
    setShowFloatingPresets(false);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);

    const tempMsg = {
      id: tempMsgId,
      body: bodyText,
      isFromMe: true,
      status: 1,
      timestamp: new Date().toISOString()
    };

    setProspects((prev: any) =>
      prev.map((p: any) => {
        if (p.id === floatingActiveChatId) {
          return {
            ...p,
            messages: [...(p.messages || []), tempMsg]
          };
        }
        return p;
      })
    );

    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: activeChat.phone,
          message: messageText,
          prospectId: activeChat.id,
          media: fileToSend ? {
            data: fileToSend.base64,
            mimetype: fileToSend.type,
            filename: fileToSend.name
          } : undefined
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.messageId && fileToSend) {
          setDownloadedMedia(prev => ({
            ...prev,
            [data.messageId]: {
              data: fileToSend.base64.split(';base64,')[1] || fileToSend.base64,
              mimetype: fileToSend.type,
              filename: fileToSend.name
            }
          }));
        }
        const pollRes = await fetch(`/api/prospects`, { cache: "no-store" });
        if (pollRes.ok) {
          const pollData = await pollRes.json();
          if (pollData.prospects) {
            setProspects(pollData.prospects);
          }
        }
        router.refresh();
      } else {
        alert("Error al enviar mensaje desde el chat flotante.");
        setProspects((prev: any) =>
          prev.map((p: any) => {
            if (p.id === floatingActiveChatId) {
              return {
                ...p,
                messages: (p.messages || []).filter((m: any) => m.id !== tempMsgId)
              };
            }
            return p;
          })
        );
      }
    } catch (e) {
      alert("Error de conexión al enviar mensaje.");
      setProspects((prev: any) =>
        prev.map((p: any) => {
          if (p.id === floatingActiveChatId) {
            return {
              ...p,
              messages: (p.messages || []).filter((m: any) => m.id !== tempMsgId)
            };
          }
          return p;
        })
      );
    } finally {
      setIsSendingFloatingReply(false);
    }
  };

  const handleFloatingShareLocation = async (loc: any) => {
    const mapsLink = `https://maps.google.com/?q=${loc.coords}`;
    const text = `📍 *Ubicación Compartida: ${loc.name}*\n🗺️ Dirección: ${loc.desc}\n🌐 Ver en Google Maps: ${mapsLink}\n\n¡Le esperamos para atenderle con gusto!`;
    await sendFloatingMessage(undefined, text);
  };

  const handleFloatingShareContact = async (contact: any) => {
    const text = `👤 *Tarjeta de Contacto de Asesor*\n🏢 *Empresa:* Office City / Canma\n👤 *Nombre:* ${contact.name}\n💼 *Puesto:* ${contact.title}\n📞 *WhatsApp:* +${contact.phone}\n✉️ *Correo:* ${contact.email}\n\n¡Guarda nuestro contacto para comunicarse más rápido!`;
    await sendFloatingMessage(undefined, text);
  };

  const handleFloatingFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setFloatingAttachment({
        name: file.name,
        type: file.type,
        base64: reader.result as string
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div style={{ 
      position: 'fixed', 
      bottom: '24px', 
      right: '24px', 
      zIndex: 100, 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'flex-end',
      gap: '12px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Style tag for keyframes and custom scrollbars */}
      <style>{`
        @keyframes floatingPulse {
          0% { transform: scale(1); box-shadow: 0 4px 15px rgba(37, 211, 102, 0.4); }
          50% { transform: scale(1.05); box-shadow: 0 4px 25px rgba(37, 211, 102, 0.7); }
          100% { transform: scale(1); box-shadow: 0 4px 15px rgba(37, 211, 102, 0.4); }
        }
        @keyframes slideUpFloating {
          from { opacity: 0; transform: translateY(30px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes toastSlideIn {
          from { opacity: 0; transform: translateX(100px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .floating-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .floating-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
        }
        .floating-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
      `}</style>

      {/* Real-time Sliding Toast Notification */}
      {showNotificationToast && latestIncomingChat && (
        <div 
          onClick={() => {
            setIsFloatingOpen(true);
            setFloatingActiveChatId(latestIncomingChat.prospect.id);
            setShowNotificationToast(false);
          }}
          style={{
            backgroundColor: 'white',
            boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
            borderLeft: '5px solid #25d366',
            borderRadius: '12px',
            padding: '12px 16px',
            width: '280px',
            cursor: 'pointer',
            animation: 'toastSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            transition: 'transform 0.2s',
            border: '1px solid rgba(226, 232, 240, 0.8)'
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#1e293b' }}>
              🟢 Nuevo mensaje de WA
            </span>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setShowNotificationToast(false);
              }}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.8rem', padding: '0 4px' }}
            >
              ✕
            </button>
          </div>
          <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>{latestIncomingChat.prospect.name}</strong>
          <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {latestIncomingChat.message.body}
          </p>
        </div>
      )}

      {/* Floating Chat Container (Drawer / Popup) */}
      {isFloatingOpen && (
        <div style={{
          width: '360px',
          height: '480px',
          borderRadius: '16px',
          boxShadow: '0 15px 35px rgba(15, 23, 42, 0.15)',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'slideUpFloating 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          backdropFilter: 'blur(10px)',
          backgroundColor: 'rgba(255, 255, 255, 0.98)'
        }}>
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #25d366 0%, #128c7e 100%)',
            color: 'white',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
          }}>
            {floatingActiveChatId ? (
              // Mini Chat Header
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
                <button 
                  onClick={() => {
                    setFloatingActiveChatId(null);
                    setFloatingReplyText("");
                  }}
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '28px',
                    height: '28px',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '0.9rem'
                  }}
                >
                  ←
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 'bold', fontSize: '0.92rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {prospects.find((p: any) => p.id === floatingActiveChatId)?.name}
                  </div>
                  <div style={{ fontSize: '0.72rem', opacity: 0.85, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {prospects.find((p: any) => p.id === floatingActiveChatId)?.phone}
                  </div>
                </div>
              </div>
            ) : (
              // Chat List Header
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.2rem' }}>💬</span>
                <div>
                  <h4 style={{ margin: 0, fontWeight: 'bold', fontSize: '0.95rem' }}>WhatsApp Office City</h4>
                  <span style={{ fontSize: '0.72rem', opacity: 0.9 }}>Conversaciones activas</span>
                </div>
              </div>
            )}

            <button 
              onClick={() => {
                setIsFloatingOpen(false);
                setFloatingActiveChatId(null);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                fontSize: '1.1rem',
                padding: '4px'
              }}
            >
              ✕
            </button>
          </div>

          {/* Body */}
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {floatingActiveChatId ? (
              // Mini Messages Stream
              (() => {
                const activeChat = prospects.find((p: any) => p.id === floatingActiveChatId);
                const activeMessages = activeChat?.messages || [];
                
                return (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                    {/* Scrollable Messages Stream */}
                    <div className="floating-scrollbar" style={{ 
                      flex: 1, 
                      padding: '12px 14px', 
                      overflowY: 'auto', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '8px', 
                      backgroundColor: '#e5e7eb',
                      backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")',
                      backgroundRepeat: 'repeat',
                      backgroundBlendMode: 'overlay',
                      backgroundSize: '200px'
                    }}>
                      {activeMessages.length === 0 ? (
                        <div style={{ margin: 'auto', textAlign: 'center', color: '#64748b', fontSize: '0.8rem', padding: '16px', backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: '8px' }}>
                          No hay mensajes aún en este chat flotante.
                        </div>
                      ) : (
                        activeMessages.map((msg: any, idx: number) => {
                          const isMe = msg.isFromMe;
                          return (
                            <div 
                              key={msg.id || idx}
                              style={{
                                alignSelf: isMe ? 'flex-end' : 'flex-start',
                                backgroundColor: isMe ? '#dcf8c6' : 'white',
                                color: '#1e293b',
                                padding: '6px 10px',
                                borderRadius: '8px',
                                borderTopRightRadius: isMe ? 0 : '8px',
                                borderTopLeftRadius: !isMe ? 0 : '8px',
                                maxWidth: '85%',
                                boxShadow: '0 1px 1px rgba(0,0,0,0.1)',
                                fontSize: '0.825rem',
                                lineHeight: 1.35,
                                position: 'relative'
                              }}
                            >
                              {msg.body && msg.body.includes("📍 *Ubicación Compartida") ? (
                                <div style={{ 
                                  border: '1px solid #cbd5e1', 
                                  borderRadius: '6px', 
                                  overflow: 'hidden', 
                                  backgroundColor: '#f8fafc',
                                  marginTop: '0.15rem',
                                  minWidth: '180px',
                                  maxWidth: '220px'
                                }}>
                                  <div style={{ 
                                    height: '60px', 
                                    backgroundImage: 'url("https://maps.googleapis.com/maps/api/staticmap?center=20.6766,-103.3475&zoom=14&size=220x60&sensor=false&markers=color:red%7C20.6766,-103.3475")',
                                    backgroundColor: '#e2e8f0', 
                                    backgroundSize: 'cover', 
                                    backgroundPosition: 'center',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#475569',
                                    fontSize: '0.7rem',
                                    fontWeight: 'bold'
                                  }}>
                                    📍 Mapa Office City
                                  </div>
                                  <div style={{ padding: '4px', fontSize: '0.75rem', color: '#334155' }}>
                                    {msg.body}
                                  </div>
                                </div>
                              ) : msg.body && msg.body.includes("👤 *Tarjeta de Contacto") ? (
                                <div style={{ 
                                  border: '1px solid #cbd5e1', 
                                  borderRadius: '6px', 
                                  backgroundColor: '#f0fdf4',
                                  marginTop: '0.15rem',
                                  minWidth: '180px',
                                  maxWidth: '220px',
                                  padding: '4px',
                                  borderLeft: '3px solid #22c55e'
                                }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px', borderBottom: '1px solid #bbf7d0', paddingBottom: '2px' }}>
                                    <strong style={{ color: '#166534', fontSize: '0.725rem' }}>👤 Contacto</strong>
                                  </div>
                                  <div style={{ fontSize: '0.725rem', color: '#1e293b' }}>
                                    {msg.body}
                                  </div>
                                </div>
                              ) : parseMediaMsg(msg.body).isMedia ? (
                                (() => {
                                  const mediaInfo = parseMediaMsg(msg.body);
                                  const isDownloaded = !!downloadedMedia[msg.messageId || msg.id];
                                  const isLoading = !!loadingMedia[msg.messageId || msg.id];
                                  const mediaData = downloadedMedia[msg.messageId || msg.id];

                                  let mediaEmoji = "📎";
                                  if (mediaInfo.type === "Imagen") mediaEmoji = "🖼️";
                                  else if (mediaInfo.type === "Video") mediaEmoji = "🎥";
                                  else if (mediaInfo.type === "Audio") mediaEmoji = "🎵";

                                  return (
                                    <div 
                                      onClick={() => {
                                        if (!isLoading) {
                                          handleDownloadMedia(msg.messageId || msg.id, mediaInfo.type.toLowerCase());
                                        }
                                      }}
                                      style={{
                                        border: '1px solid #cbd5e1',
                                        borderRadius: '6px',
                                        overflow: 'hidden',
                                        backgroundColor: '#f8fafc',
                                        marginTop: '0.15rem',
                                        minWidth: '180px',
                                        maxWidth: '220px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        cursor: isLoading ? 'default' : 'pointer',
                                        transition: 'all 0.2s ease-in-out'
                                      }}
                                      onMouseOver={evt => {
                                        if (!isLoading) {
                                          evt.currentTarget.style.borderColor = '#3b82f6';
                                          evt.currentTarget.style.boxShadow = '0 3px 8px rgba(59,130,246,0.12)';
                                          evt.currentTarget.style.transform = 'translateY(-1px)';
                                        }
                                      }}
                                      onMouseOut={evt => {
                                        evt.currentTarget.style.borderColor = '#cbd5e1';
                                        evt.currentTarget.style.boxShadow = 'none';
                                        evt.currentTarget.style.transform = 'none';
                                      }}
                                    >
                                      <div style={{ padding: '4px 6px', display: 'flex', alignItems: 'center', gap: '4px', borderBottom: (mediaInfo.caption || isDownloaded) ? '1px solid #e2e8f0' : 'none' }}>
                                        <span style={{ fontSize: '1.25rem' }}>{mediaEmoji}</span>
                                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                          <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#334155' }}>
                                            {mediaInfo.type}
                                          </span>
                                          <span style={{ fontSize: '0.6rem', color: '#64748b' }}>
                                            {isLoading ? '⏳ Bajando...' : isDownloaded ? '✅ Bajado (Guardar)' : '📥 Click para bajar'}
                                          </span>
                                        </div>
                                      </div>

                                      {isDownloaded && mediaData.mimetype.startsWith('image/') && (
                                        <div style={{ width: '100%', maxHeight: '120px', overflow: 'hidden', borderBottom: mediaInfo.caption ? '1px solid #e2e8f0' : 'none', display: 'flex', justifyContent: 'center', backgroundColor: '#f1f5f9' }}>
                                          <img 
                                            src={`data:${mediaData.mimetype};base64,${mediaData.data}`} 
                                            alt={mediaData.filename} 
                                            style={{ width: '100%', objectFit: 'contain', maxHeight: '120px' }} 
                                          />
                                        </div>
                                      )}

                                      {mediaInfo.caption && (
                                        <div style={{ padding: '4px 6px', fontSize: '0.725rem', color: '#334155', borderBottom: '1px solid #e2e8f0' }}>
                                          {mediaInfo.caption}
                                        </div>
                                      )}

                                      <div
                                        style={{
                                          padding: '4px',
                                          fontSize: '0.725rem',
                                          fontWeight: 'bold',
                                          color: isLoading ? '#94a3b8' : isDownloaded ? '#16a34a' : '#2563eb',
                                          textAlign: 'center',
                                          width: '100%',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          gap: '2px',
                                          backgroundColor: '#f1f5f9',
                                          userSelect: 'none'
                                        }}
                                      >
                                        {isLoading ? (
                                          <span>⏳ Bajando...</span>
                                        ) : isDownloaded ? (
                                          <span>💾 Guardar</span>
                                        ) : (
                                          <span>📥 Bajar y Guardar</span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })()
                              ) : (
                                msg.body
                              )}
                              <div style={{
                                fontSize: '0.625rem',
                                color: '#94a3b8',
                                textAlign: 'right',
                                marginTop: '2px',
                                display: 'flex',
                                justifyContent: 'flex-end',
                                alignItems: 'center',
                                gap: '2px'
                              }}>
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                {isMe && (
                                  <span style={{ color: msg.status === 3 ? '#3b82f6' : '#94a3b8', display: 'flex' }}>
                                    {(msg.status === 2 || msg.status === 3) ? (
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="18 6 7 17 2 12"/>
                                        <polyline points="22 6 11 17 9.5 15.5"/>
                                      </svg>
                                    ) : (
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Mini Chat Toolbar */}
                    <div style={{
                      display: 'flex',
                      gap: '8px',
                      padding: '6px 10px',
                      borderTop: '1px solid #e2e8f0',
                      backgroundColor: '#f8fafc',
                      alignItems: 'center'
                    }}>
                      <button
                        type="button"
                        onClick={() => {
                          setShowFloatingEmojiPicker(!showFloatingEmojiPicker);
                          setShowFloatingLocationPicker(false);
                          setShowFloatingContactPicker(false);
                          setShowFloatingPresets(false);
                        }}
                        style={{
                          background: showFloatingEmojiPicker ? '#e2e8f0' : 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '1.05rem',
                          padding: '4px',
                          borderRadius: '6px',
                          transition: 'background-color 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title="Emojis"
                      >
                        😊
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowFloatingPresets(!showFloatingPresets);
                          setShowFloatingEmojiPicker(false);
                          setShowFloatingLocationPicker(false);
                          setShowFloatingContactPicker(false);
                        }}
                        style={{
                          background: showFloatingPresets ? '#e2e8f0' : 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '1.05rem',
                          padding: '4px',
                          borderRadius: '6px',
                          transition: 'background-color 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title="Plantillas rápidas"
                      >
                        📋
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowFloatingLocationPicker(!showFloatingLocationPicker);
                          setShowFloatingEmojiPicker(false);
                          setShowFloatingPresets(false);
                          setShowFloatingContactPicker(false);
                        }}
                        style={{
                          background: showFloatingLocationPicker ? '#e2e8f0' : 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '1.05rem',
                          padding: '4px',
                          borderRadius: '6px',
                          transition: 'background-color 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title="Compartir ubicación"
                      >
                        📍
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowFloatingContactPicker(!showFloatingContactPicker);
                          setShowFloatingEmojiPicker(false);
                          setShowFloatingPresets(false);
                          setShowFloatingLocationPicker(false);
                        }}
                        style={{
                          background: showFloatingContactPicker ? '#e2e8f0' : 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '1.05rem',
                          padding: '4px',
                          borderRadius: '6px',
                          transition: 'background-color 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title="Compartir contacto"
                      >
                        👤
                      </button>

                      <label
                        style={{
                          cursor: 'pointer',
                          fontSize: '1.05rem',
                          padding: '4px',
                          borderRadius: '6px',
                          transition: 'background-color 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title="Adjuntar archivo"
                      >
                        📎
                        <input 
                          type="file" 
                          onChange={handleFloatingFileChange} 
                          style={{ display: 'none' }} 
                        />
                      </label>
                    </div>

                    {/* Popovers inline overlays */}
                    {showFloatingEmojiPicker && (
                      <div style={{
                        position: 'absolute',
                        bottom: '36px',
                        left: '10px',
                        backgroundColor: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        padding: '6px',
                        width: '200px',
                        boxShadow: '0 8px 16px rgba(0,0,0,0.12)',
                        zIndex: 40,
                        display: 'grid',
                        gridTemplateColumns: 'repeat(6, 1fr)',
                        gap: '4px'
                      }}>
                        {emojis.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => {
                              setFloatingReplyText(prev => prev + emoji);
                              setShowFloatingEmojiPicker(false);
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              fontSize: '1.2rem',
                              padding: '4px',
                              borderRadius: '4px'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}

                    {showFloatingPresets && (
                      <div style={{
                        position: 'absolute',
                        bottom: '36px',
                        left: '10px',
                        backgroundColor: 'white',
                        border: '1px solid #cbd5e1',
                        borderRadius: '10px',
                        padding: '6px',
                        width: '260px',
                        boxShadow: '0 8px 16px rgba(0,0,0,0.12)',
                        zIndex: 40,
                        maxHeight: '200px',
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '4px', marginBottom: '2px' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b' }}>Plantillas Rápidas:</span>
                          <button type="button" onClick={() => setShowFloatingPresets(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', color: '#94a3b8' }}>✕</button>
                        </div>
                        {defaultPresets.map((preset, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setFloatingReplyText(preset.text);
                              setShowFloatingPresets(false);
                            }}
                            style={{
                              textAlign: 'left',
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '6px 8px',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              color: '#334155',
                              borderBottom: '1px solid #f8fafc',
                              transition: 'background-color 0.2s',
                              width: '100%'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <strong>{preset.title}</strong>
                          </button>
                        ))}
                      </div>
                    )}

                    {showFloatingLocationPicker && (
                      <div style={{
                        position: 'absolute',
                        bottom: '36px',
                        left: '10px',
                        backgroundColor: 'white',
                        border: '1px solid #cbd5e1',
                        borderRadius: '10px',
                        padding: '6px',
                        width: '260px',
                        boxShadow: '0 8px 16px rgba(0,0,0,0.12)',
                        zIndex: 40,
                        maxHeight: '200px',
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '4px', marginBottom: '2px' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b' }}>📍 Compartir Ubicación:</span>
                          <button type="button" onClick={() => setShowFloatingLocationPicker(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', color: '#94a3b8' }}>✕</button>
                        </div>
                        {officeCityLocations.map((loc, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleFloatingShareLocation(loc)}
                            style={{
                              textAlign: 'left',
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '6px 8px',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              width: '100%',
                              transition: 'background-color 0.2s',
                              display: 'flex',
                              flexDirection: 'column'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <span style={{ fontWeight: 'bold', color: '#1e293b' }}>{loc.name}</span>
                            <span style={{ fontSize: '0.65rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '220px' }}>{loc.desc}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {showFloatingContactPicker && (
                      <div style={{
                        position: 'absolute',
                        bottom: '36px',
                        left: '10px',
                        backgroundColor: 'white',
                        border: '1px solid #cbd5e1',
                        borderRadius: '10px',
                        padding: '6px',
                        width: '260px',
                        boxShadow: '0 8px 16px rgba(0,0,0,0.12)',
                        zIndex: 40,
                        maxHeight: '200px',
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '4px', marginBottom: '2px' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b' }}>👤 Compartir Contacto:</span>
                          <button type="button" onClick={() => setShowFloatingContactPicker(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', color: '#94a3b8' }}>✕</button>
                        </div>
                        {officeCityContacts.map((contact, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleFloatingShareContact(contact)}
                            style={{
                              textAlign: 'left',
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '6px 8px',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              width: '100%',
                              transition: 'background-color 0.2s',
                              display: 'flex',
                              flexDirection: 'column'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <span style={{ fontWeight: 'bold', color: '#1e293b' }}>{contact.label}</span>
                            <span style={{ fontSize: '0.65rem', color: '#64748b' }}>{contact.name} ({contact.title})</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Mini Chat Input form */}
                    <form 
                      onSubmit={sendFloatingMessage}
                      style={{
                        padding: '8px 10px',
                        borderTop: '1px solid #e2e8f0',
                        backgroundColor: 'white',
                        display: 'flex',
                        gap: '8px',
                        alignItems: 'center'
                      }}
                    >
                      <input 
                        ref={inputRef}
                        type="text"
                        value={floatingReplyText}
                        onChange={(e) => setFloatingReplyText(e.target.value)}
                        placeholder="Escribe tu respuesta..."
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          borderRadius: '20px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.85rem',
                          outline: 'none',
                          backgroundColor: '#f8fafc'
                        }}
                      />
                      <button
                        type="submit"
                        disabled={!floatingReplyText.trim() || isSendingFloatingReply}
                        style={{
                          backgroundColor: floatingReplyText.trim() ? '#25d366' : '#cbd5e1',
                          color: 'white',
                          border: 'none',
                          borderRadius: '50%',
                          width: '32px',
                          height: '32px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: floatingReplyText.trim() ? 'pointer' : 'not-allowed',
                          transition: 'background-color 0.2s'
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                        </svg>
                      </button>
                    </form>
                  </div>
                );
              })()
            ) : (
              // Chat List
              <div className="floating-scrollbar" style={{ flex: 1, overflowY: 'auto', backgroundColor: '#f8fafc' }}>
                {prospects.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px', color: '#64748b', fontSize: '0.85rem' }}>
                    No hay conversaciones disponibles.
                  </div>
                ) : (
                  prospects.map((p: any) => {
                    const isUnassigned = !p.assignedUserId;
                    const lastMsg = p.messages && p.messages.length > 0 ? p.messages[p.messages.length - 1] : null;
                    
                    const nameVal = p.name || 'W';
                    const initial = nameVal.charAt(0).toUpperCase();
                    const charCode = initial.charCodeAt(0);
                    const colors = [
                      'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                      'linear-gradient(135deg, #10b981 0%, #047857 100%)',
                      'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
                      'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)',
                      'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
                      'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)'
                    ];
                    const avatarBg = colors[charCode % colors.length];

                    return (
                      <div 
                        key={p.id}
                        onClick={() => setFloatingActiveChatId(p.id)}
                        style={{
                          padding: '12px 16px',
                          borderBottom: '1px solid #edf2f7',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          transition: 'background-color 0.2s',
                          backgroundColor: 'white'
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}
                      >
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          background: avatarBg,
                          color: 'white',
                          fontWeight: 'bold',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1rem',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}>
                          {initial}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                            <span style={{ fontWeight: '600', fontSize: '0.85rem', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {p.name}
                            </span>
                            {lastMsg && (
                              <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                                {new Date(lastMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ 
                              fontSize: '0.775rem', 
                              color: '#64748b', 
                              whiteSpace: 'nowrap', 
                              overflow: 'hidden', 
                              textOverflow: 'ellipsis',
                              width: '180px'
                            }}>
                              {lastMsg ? `${lastMsg.isFromMe ? 'Tú: ' : ''}${lastMsg.body}` : p.phone}
                            </span>
                            {isUnassigned && (
                              <span style={{ 
                                fontSize: '0.625rem', 
                                backgroundColor: '#ef4444', 
                                color: 'white', 
                                padding: '2px 6px', 
                                borderRadius: '8px', 
                                fontWeight: 'bold' 
                              }}>
                                NUEVO
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Bubble Button */}
      <button
        onClick={() => setIsFloatingOpen(!isFloatingOpen)}
        style={{
          background: 'linear-gradient(135deg, #25d366 0%, #128c7e 100%)',
          border: 'none',
          borderRadius: '50%',
          width: '56px',
          height: '56px',
          color: 'white',
          fontSize: '1.6rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 4px 15px rgba(37, 211, 102, 0.4)',
          animation: !isFloatingOpen ? 'floatingPulse 2.5s infinite ease-in-out' : 'none',
          transition: 'transform 0.2s',
          outline: 'none',
          userSelect: 'none'
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        {isFloatingOpen ? '✕' : (
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            {prospects.filter((p: any) => !p.assignedUserId).length > 0 && (
              <span style={{
                position: 'absolute',
                top: '-6px',
                right: '-6px',
                backgroundColor: '#ef4444',
                color: 'white',
                borderRadius: '50%',
                width: '18px',
                height: '18px',
                fontSize: '0.675rem',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid white'
              }}>
                {prospects.filter((p: any) => !p.assignedUserId).length}
              </span>
            )}
          </div>
        )}
      </button>
    </div>
  );
}
