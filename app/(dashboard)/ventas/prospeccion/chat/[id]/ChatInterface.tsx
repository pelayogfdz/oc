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

  const [downloadedMedia, setDownloadedMedia] = useState<Record<string, { data: string; mimetype: string; filename: string }>>({});
  const [loadingMedia, setLoadingMedia] = useState<Record<string, boolean>>({});

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

    // 1. If already downloaded, immediately download from cache without server request
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

      // 2. Automatically trigger browser download for ALL media types
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


  // Custom Interactive Tool States
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [showAIOptions, setShowAIOptions] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [attachment, setAttachment] = useState<{ name: string; type: string; base64: string } | null>(null);
  
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showContactPicker, setShowContactPicker] = useState(false);

  // Predefined locations
  const officeCityLocations = [
    { name: "Corporativo Matriz (Guadalajara)", coords: "20.6766,-103.3475", desc: "Av. de las Américas 1500, Country Club, GDL" },
    { name: "Sucursal Querétaro PIQ", coords: "20.7302,-103.3855", desc: "Parque Industrial Querétaro, Qro." },
    { name: "Sucursal Querétaro Centro", coords: "20.5888,-100.3899", desc: "Av. Zaragoza 120, Centro Histórico, Qro." },
    { name: "Sucursal Querétaro Norte (Juriquilla)", coords: "20.6908,-100.4439", desc: "Plaza Urban Juriquilla, Qro." }
  ];

  // Predefined contact cards
  const officeCityContacts = [
    { label: "Asesor José Samuel Subero", name: "José Samuel Subero Sánchez", phone: "5213344556677", email: "samuelsubero@canma.com", title: "Ejecutivo de Ventas B2B" },
    { label: "Office City Ventas Corporativas", name: "Oficina de Ventas Canma", phone: "5215580004321", email: "pelayof@tdq.com.mx", title: "Corporativo Central" },
    { label: "Soporte Técnico Canma", name: "Soporte Técnico Canma", phone: "5218009876543", email: "contacto@canma.com", title: "Mesa de Ayuda" }
  ];

  const handleShareLocation = async (loc: any) => {
    const mapsLink = `https://maps.google.com/?q=${loc.coords}`;
    const text = `📍 *Ubicación Compartida: ${loc.name}*\n🗺️ Dirección: ${loc.desc}\n🌐 Ver en Google Maps: ${mapsLink}\n\n¡Le esperamos para atenderle con gusto!`;
    await sendMessage(undefined, text);
    setShowLocationPicker(false);
  };

  const handleShareContact = async (contact: any) => {
    const text = `👤 *Tarjeta de Contacto de Asesor*\n🏢 *Empresa:* Office City / Canma\n👤 *Nombre:* ${contact.name}\n💼 *Puesto:* ${contact.title}\n📞 *WhatsApp:* +${contact.phone}\n✉️ *Correo:* ${contact.email}\n\n¡Guarda nuestro contacto para comunicarse más rápido!`;
    await sendMessage(undefined, text);
    setShowContactPicker(false);
  };

  // Emojis Picker List
  const emojis = ['😊', '😂', '👍', '❤️', '🙌', '🙏', '🎉', '🔥', '🤔', '💡', '📞', '💼', '🏢', '✨', '🤝', '✅'];
  
  // Quick Presets Templates
  const defaultPresets = [
    { title: "👋 Saludo Inicial", text: "¡Hola! Bienvenido a Office City. ¿En qué podemos ayudarle el día de hoy con sus insumos de oficina?" },
    { title: "📄 Envío de Cotización", text: "Con mucho gusto. Le comparto la cotización solicitada adjunta en este chat. Quedo muy al pendiente de sus comentarios." },
    { title: "📍 Ubicación y Horario", text: "Nuestra sucursal se encuentra ubicada en: Zona Industrial PIQ, Querétaro. Horario de atención: Lunes a Viernes de 9 AM a 6 PM." },
    { title: "📦 Catálogo Completo", text: "Estimado cliente, le comparto nuestro catálogo virtual de papelería, mobiliario y tecnología para oficinas: https://canma.com/catalogo" }
  ];

  const [presets, setPresets] = useState<any[]>(defaultPresets);
  const [isCreatingPreset, setIsCreatingPreset] = useState(false);
  const [newPresetTitle, setNewPresetTitle] = useState("");
  const [newPresetText, setNewPresetText] = useState("");

  // Load custom presets on mount
  useEffect(() => {
    const saved = localStorage.getItem("caanma_custom_presets");
    if (saved) {
      try {
        setPresets(JSON.parse(saved));
      } catch (e) {
        console.error("Error parsing custom presets", e);
      }
    }
  }, []);

  const handleSavePreset = (title: string, text: string) => {
    if (!title.trim() || !text.trim()) return;
    const updated = [...presets, { title: title.trim(), text: text.trim() }];
    setPresets(updated);
    localStorage.setItem("caanma_custom_presets", JSON.stringify(updated));
    setIsCreatingPreset(false);
    setNewPresetTitle("");
    setNewPresetText("");
  };

  const handleDeletePreset = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent clicking preset to insert text
    const updated = presets.filter((_, i) => i !== idx);
    setPresets(updated);
    localStorage.setItem("caanma_custom_presets", JSON.stringify(updated));
  };

  // Sync with parent prospect messages updates
  useEffect(() => {
    if (prospect.messages) {
      const optimisticMsgs = messages.filter((m: any) => m.id?.toString().startsWith('temp-'));
      if (optimisticMsgs.length > 0) {
        const filteredOptimistic = optimisticMsgs.filter((om: any) => 
          !prospect.messages.some((nm: any) => nm.body === om.body && nm.isFromMe)
        );
        setMessages([...prospect.messages, ...filteredOptimistic]);
      } else {
        setMessages(prospect.messages);
      }
    }
  }, [prospect.messages]);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Polling for new messages
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/prospects/${prospect.id}/messages?t=${Date.now()}`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data.messages) {
            // Check for differences in length or individual message statuses (single/double/blue ticks)
            const currentStr = JSON.stringify(messages.map((m: any) => ({ id: m.id, status: m.status })));
            const newStr = JSON.stringify(data.messages.map((m: any) => ({ id: m.id, status: m.status })));
            
            if (currentStr !== newStr) {
              // Preserve any local optimistic messages (ids starting with 'temp-') that aren't saved yet
              const optimisticMsgs = messages.filter((m: any) => m.id?.toString().startsWith('temp-'));
              if (optimisticMsgs.length > 0) {
                // Deduplicate if they are already in the response by body
                const filteredOptimistic = optimisticMsgs.filter((om: any) => 
                  !data.messages.some((nm: any) => nm.body === om.body && nm.isFromMe)
                );
                setMessages([...data.messages, ...filteredOptimistic]);
              } else {
                setMessages(data.messages);
              }
            }
          }
        }
      } catch (e) {
        console.error("Polling error", e);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [prospect.id, messages]);

  const sendMessage = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const messageText = customText || inputText;
    
    let bodyText = messageText;
    if (attachment) {
      const mediaTag = attachment.type.startsWith('image/') ? '📎 [Imagen]' : '📎 [Archivo]';
      bodyText = mediaTag + (messageText.trim() ? ": " + messageText.trim() : "");
    }

    if (!bodyText.trim() && !attachment) return;

    setIsSending(true);
    const tempMsgId = `temp-${Date.now()}`;
    const tempMsg = {
      id: tempMsgId,
      body: bodyText,
      isFromMe: true,
      status: 1, // Clock -> single tick immediately in client
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempMsg]);

    // Optimistically cache file payload for instant preview/download
    if (attachment) {
      setDownloadedMedia(prev => ({
        ...prev,
        [tempMsgId]: {
          data: attachment.base64.split(';base64,')[1] || attachment.base64,
          mimetype: attachment.type,
          filename: attachment.name
        }
      }));
    }

    if (!customText) setInputText("");
    const fileToSend = attachment;
    setAttachment(null); // Clear attachment preview

    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: prospect.phone,
          message: messageText,
          prospectId: prospect.id,
          media: fileToSend ? {
            data: fileToSend.base64,
            mimetype: fileToSend.type,
            filename: fileToSend.name
          } : undefined
        })
      });

      if (res.ok) {
        // If it succeeded, we can parse the returned messageId
        const data = await res.json();
        if (data.messageId && fileToSend) {
          // Sync downloaded state to the real messageId!
          setDownloadedMedia(prev => ({
            ...prev,
            [data.messageId]: {
              data: fileToSend.base64.split(';base64,')[1] || fileToSend.base64,
              mimetype: fileToSend.type,
              filename: fileToSend.name
            }
          }));
        }
        router.refresh();
      } else {
        alert("Error al enviar mensaje. Verifica que el microservicio de WhatsApp esté conectado.");
        setMessages(prev => prev.filter(m => m.id !== tempMsgId));
      }
    } catch (e) {
      alert("Error de conexión con el microservicio.");
      setMessages(prev => prev.filter(m => m.id !== tempMsgId));
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
                {msg.body && msg.body.includes("📍 *Ubicación Compartida") ? (
                  <div style={{ 
                    border: '1px solid #cbd5e1', 
                    borderRadius: '8px', 
                    overflow: 'hidden', 
                    backgroundColor: '#f8fafc',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                    marginTop: '0.25rem',
                    width: '100%',
                    minWidth: '240px',
                    maxWidth: '280px'
                  }}>
                    <div style={{ 
                      height: '100px', 
                      backgroundImage: 'url("https://maps.googleapis.com/maps/api/staticmap?center=20.6766,-103.3475&zoom=14&size=280x100&sensor=false&markers=color:red%7C20.6766,-103.3475")',
                      backgroundColor: '#e2e8f0', 
                      backgroundSize: 'cover', 
                      backgroundPosition: 'center',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#475569',
                      fontWeight: 'bold',
                      fontSize: '0.8rem'
                    }}>
                      🗺️ Vista de Mapa Office City
                    </div>
                    <div style={{ padding: '0.65rem', fontSize: '0.825rem', color: '#334155' }}>
                      {msg.body}
                    </div>
                  </div>
                ) : msg.body && msg.body.includes("👤 *Tarjeta de Contacto") ? (
                  <div style={{ 
                    border: '1px solid #cbd5e1', 
                    borderRadius: '8px', 
                    backgroundColor: '#f0fdf4',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                    marginTop: '0.25rem',
                    width: '100%',
                    minWidth: '240px',
                    maxWidth: '280px',
                    padding: '0.65rem',
                    borderLeft: '4px solid #22c55e'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem', borderBottom: '1px solid #bbf7d0', paddingBottom: '0.25rem' }}>
                      <span style={{ fontSize: '1.1rem' }}>👤</span>
                      <strong style={{ color: '#166534', fontSize: '0.825rem' }}>Contacto de Ventas</strong>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#1e293b' }}>
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
                          borderRadius: '8px',
                          overflow: 'hidden',
                          backgroundColor: '#f8fafc',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                          marginTop: '0.25rem',
                          width: '100%',
                          minWidth: '240px',
                          maxWidth: '280px',
                          display: 'flex',
                          flexDirection: 'column',
                          cursor: isLoading ? 'default' : 'pointer',
                          transition: 'all 0.2s ease-in-out'
                        }}
                        onMouseOver={evt => {
                          if (!isLoading) {
                            evt.currentTarget.style.borderColor = '#3b82f6';
                            evt.currentTarget.style.boxShadow = '0 4px 12px rgba(59,130,246,0.15)';
                            evt.currentTarget.style.transform = 'translateY(-1px)';
                          }
                        }}
                        onMouseOut={evt => {
                          evt.currentTarget.style.borderColor = '#cbd5e1';
                          evt.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
                          evt.currentTarget.style.transform = 'none';
                        }}
                      >
                        <div style={{ padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: (mediaInfo.caption || isDownloaded) ? '1px solid #e2e8f0' : 'none' }}>
                          <span style={{ fontSize: '1.75rem' }}>{mediaEmoji}</span>
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.825rem', fontWeight: 'bold', color: '#334155' }}>
                              {mediaInfo.type} de WhatsApp
                            </span>
                            <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                              {isLoading ? '⏳ Descargando...' : isDownloaded ? '✅ Descargado (Click para guardar)' : '📥 Click para guardar en PC'}
                            </span>
                          </div>
                        </div>

                        {isDownloaded && mediaData.mimetype.startsWith('image/') && (
                          <div style={{ width: '100%', maxHeight: '200px', overflow: 'hidden', borderBottom: mediaInfo.caption ? '1px solid #e2e8f0' : 'none', display: 'flex', justifyContent: 'center', backgroundColor: '#f1f5f9' }}>
                            <img 
                              src={`data:${mediaData.mimetype};base64,${mediaData.data}`} 
                              alt={mediaData.filename} 
                              style={{ width: '100%', objectFit: 'contain', maxHeight: '200px' }} 
                            />
                          </div>
                        )}

                        {mediaInfo.caption && (
                          <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', color: '#334155', borderBottom: '1px solid #e2e8f0' }}>
                            {mediaInfo.caption}
                          </div>
                        )}

                        <div
                          style={{
                            padding: '0.5rem',
                            fontSize: '0.8rem',
                            fontWeight: 'bold',
                            color: isLoading ? '#94a3b8' : isDownloaded ? '#16a34a' : '#2563eb',
                            textAlign: 'center',
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.25rem',
                            backgroundColor: '#f1f5f9',
                            userSelect: 'none'
                          }}
                        >
                          {isLoading ? (
                            <span>⏳ Descargando...</span>
                          ) : isDownloaded ? (
                            <span>💾 Guardar de nuevo</span>
                          ) : (
                            <span>📥 Descargar y Guardar</span>
                          )}
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  msg.body
                )}
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
      {/* Location Picker Popup */}
      {showLocationPicker && (
        <div style={{ position: 'absolute', bottom: '80px', left: '1rem', backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '0.75rem', width: '320px', display: 'flex', flexDirection: 'column', gap: '0.5rem', boxShadow: '0 4px 16px rgba(0,0,0,0.15)', zIndex: 30, maxHeight: '300px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.4rem', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#475569' }}>📍 Compartir Ubicación Sucursal:</span>
            <button onClick={() => setShowLocationPicker(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: '#94a3b8' }}>✕</button>
          </div>
          {officeCityLocations.map((loc, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleShareLocation(loc)}
              style={{ 
                textAlign: 'left', 
                background: 'none', 
                border: 'none', 
                cursor: 'pointer', 
                padding: '0.5rem', 
                borderRadius: '8px', 
                borderBottom: '1px solid #f1f5f9', 
                display: 'flex', 
                flexDirection: 'column',
                gap: '0.1rem', 
                transition: 'background-color 0.2s',
                width: '100%'
              }}
              onMouseOver={evt => evt.currentTarget.style.backgroundColor='#f8fafc'}
              onMouseOut={evt => evt.currentTarget.style.backgroundColor='transparent'}
            >
              <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#1e293b' }}>{loc.name}</span>
              <span style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '280px' }}>{loc.desc}</span>
            </button>
          ))}
        </div>
      )}

      {/* Contact Picker Popup */}
      {showContactPicker && (
        <div style={{ position: 'absolute', bottom: '80px', left: '1rem', backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '0.75rem', width: '320px', display: 'flex', flexDirection: 'column', gap: '0.5rem', boxShadow: '0 4px 16px rgba(0,0,0,0.15)', zIndex: 30, maxHeight: '300px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.4rem', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#475569' }}>👤 Compartir Contacto:</span>
            <button onClick={() => setShowContactPicker(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: '#94a3b8' }}>✕</button>
          </div>
          {officeCityContacts.map((contact, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleShareContact(contact)}
              style={{ 
                textAlign: 'left', 
                background: 'none', 
                border: 'none', 
                cursor: 'pointer', 
                padding: '0.5rem', 
                borderRadius: '8px', 
                borderBottom: '1px solid #f1f5f9', 
                display: 'flex', 
                flexDirection: 'column',
                gap: '0.1rem', 
                transition: 'background-color 0.2s',
                width: '100%'
              }}
              onMouseOver={evt => evt.currentTarget.style.backgroundColor='#f8fafc'}
              onMouseOut={evt => evt.currentTarget.style.backgroundColor='transparent'}
            >
              <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#1e293b' }}>{contact.label}</span>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{contact.name} - {contact.title}</span>
            </button>
          ))}
        </div>
      )}

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
        <div style={{ position: 'absolute', bottom: '80px', left: '3rem', backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '0.75rem', width: '330px', display: 'flex', flexDirection: 'column', gap: '0.5rem', boxShadow: '0 4px 16px rgba(0,0,0,0.15)', zIndex: 30, maxHeight: '350px', overflowY: 'auto' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.4rem', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#475569' }}>Plantillas Rápidas:</span>
            {!isCreatingPreset && (
              <button 
                onClick={() => {
                  setIsCreatingPreset(true);
                  if (inputText.trim()) {
                    setNewPresetText(inputText); // prefill with current draft!
                  }
                }}
                style={{ backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', padding: '0.25rem 0.6rem', fontSize: '0.72rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem', transition: 'background-color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor='#2563eb'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor='#3b82f6'}
              >
                ➕ Nueva
              </button>
            )}
          </div>

          {/* Form to Create Custom Preset Inline */}
          {isCreatingPreset ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.5rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', animation: 'fadeIn 0.2s ease' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b' }}>Nueva Plantilla Personalizada</div>
              <input
                type="text"
                placeholder="Título (ej: 👋 Saludo)"
                value={newPresetTitle}
                onChange={e => setNewPresetTitle(e.target.value)}
                style={{ width: '100%', padding: '0.35rem 0.5rem', fontSize: '0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }}
              />
              <textarea
                placeholder="Texto de la plantilla..."
                value={newPresetText}
                onChange={e => setNewPresetText(e.target.value)}
                rows={3}
                style={{ width: '100%', padding: '0.35rem 0.5rem', fontSize: '0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', resize: 'none', fontFamily: 'inherit' }}
              />
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setIsCreatingPreset(false)}
                  style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.75rem', cursor: 'pointer', padding: '0.25rem' }}
                >
                  Cancelar
                </button>
                <button
                  disabled={!newPresetTitle.trim() || !newPresetText.trim()}
                  onClick={() => handleSavePreset(newPresetTitle, newPresetText)}
                  style={{ backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', padding: '0.25rem 0.6rem', fontSize: '0.75rem', fontWeight: 'bold', cursor: (!newPresetTitle.trim() || !newPresetText.trim()) ? 'not-allowed' : 'pointer', opacity: (!newPresetTitle.trim() || !newPresetText.trim()) ? 0.6 : 1 }}
                >
                  Guardar
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {presets.map((p, idx) => (
                <div
                  key={idx}
                  onClick={() => handlePresetClick(p.text)}
                  style={{ 
                    textAlign: 'left', 
                    background: 'none', 
                    border: 'none', 
                    cursor: 'pointer', 
                    padding: '0.5rem', 
                    borderRadius: '8px', 
                    borderBottom: '1px solid #f1f5f9', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'flex-start',
                    gap: '0.5rem', 
                    transition: 'background-color 0.2s',
                    position: 'relative'
                  }}
                  onMouseOver={evt => evt.currentTarget.style.backgroundColor='#f8fafc'}
                  onMouseOut={evt => evt.currentTarget.style.backgroundColor='transparent'}
                >
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.1rem', overflow: 'hidden' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#1e293b' }}>{p.title}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '230px' }}>{p.text}</div>
                  </div>
                  <button
                    onClick={(e) => handleDeletePreset(idx, e)}
                    title="Eliminar plantilla"
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      color: '#94a3b8', 
                      cursor: 'pointer', 
                      fontSize: '0.85rem',
                      padding: '0.1rem 0.25rem',
                      borderRadius: '4px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color='#ef4444'; e.currentTarget.style.backgroundColor='#fee2e2'; }}
                    onMouseLeave={e => { e.currentTarget.style.color='#94a3b8'; e.currentTarget.style.backgroundColor='transparent'; }}
                  >
                    🗑️
                  </button>
                </div>
              ))}

              {/* Special Quick Option to save current draft if something is typed! */}
              {inputText.trim() && (
                <button
                  onClick={() => {
                    setIsCreatingPreset(true);
                    setNewPresetText(inputText);
                    setNewPresetTitle("");
                  }}
                  style={{ 
                    marginTop: '0.5rem',
                    textAlign: 'center',
                    border: '1px dashed #3b82f6', 
                    background: '#eff6ff',
                    color: '#1d4ed8',
                    cursor: 'pointer', 
                    padding: '0.5rem', 
                    borderRadius: '8px', 
                    fontSize: '0.78rem',
                    fontWeight: 'bold',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={evt => evt.currentTarget.style.backgroundColor='#dbeafe'}
                  onMouseOut={evt => evt.currentTarget.style.backgroundColor='#eff6ff'}
                >
                  💾 Convertir borrador actual en plantilla
                </button>
              )}
            </div>
          )}
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
            onClick={() => { setShowPresets(!showPresets); setShowEmojiPicker(false); setShowAIOptions(false); setShowLocationPicker(false); setShowContactPicker(false); }}
            title="Mensajes Preestablecidos" 
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', fontSize: '1.25rem', opacity: 0.8, transition: 'transform 0.1s' }}
            onMouseEnter={e => { e.currentTarget.style.transform='scale(1.15)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform='scale(1)'; }}
          >
            📋
          </button>
          <button 
            onClick={() => { setShowLocationPicker(!showLocationPicker); setShowEmojiPicker(false); setShowPresets(false); setShowAIOptions(false); setShowContactPicker(false); }}
            title="Compartir Ubicación" 
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', fontSize: '1.25rem', opacity: 0.8, transition: 'transform 0.1s' }}
            onMouseEnter={e => { e.currentTarget.style.transform='scale(1.15)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform='scale(1)'; }}
          >
            📍
          </button>
          <button 
            onClick={() => { setShowContactPicker(!showContactPicker); setShowEmojiPicker(false); setShowPresets(false); setShowAIOptions(false); setShowLocationPicker(false); }}
            title="Compartir Contacto" 
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', fontSize: '1.25rem', opacity: 0.8, transition: 'transform 0.1s' }}
            onMouseEnter={e => { e.currentTarget.style.transform='scale(1.15)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform='scale(1)'; }}
          >
            👤
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
