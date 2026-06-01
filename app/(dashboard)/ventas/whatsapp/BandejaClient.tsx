"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ChatInterface from "../prospeccion/chat/[id]/ChatInterface";
import { useEffect } from "react";
import { getRecentQuotes, searchCustomers, assignCustomerToProspect } from "@/app/actions/whatsapp-crm";

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

export default function BandejaClient({ initialProspects, users, currentUser, customers = [] }: any) {
  const [prospects, setProspects] = useState(initialProspects);
  const [selectedProspectId, setSelectedProspectId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [readStatus, setReadStatus] = useState<Record<string, number>>({});
  const [filterTab, setFilterTab] = useState<'all' | 'read' | 'unread'>('all');

  // Cargar estado de lectura desde localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("whatsapp_chats_read_status");
      if (saved) {
        try {
          setReadStatus(JSON.parse(saved));
        } catch (e) {
          console.error("Error parsing read status from localStorage", e);
        }
      }
    }
  }, []);

  // Función para marcar un chat como leído
  const markAsRead = (prospectId: string, timestamp?: string) => {
    const time = timestamp ? new Date(timestamp).getTime() : Date.now();
    setReadStatus(prev => {
      if (prev[prospectId] && prev[prospectId] >= time) {
        return prev;
      }
      const updated = { ...prev, [prospectId]: time };
      localStorage.setItem("whatsapp_chats_read_status", JSON.stringify(updated));
      return updated;
    });
  };

  // Marcar chat seleccionado como leído automáticamente
  useEffect(() => {
    if (selectedProspectId) {
      const prospect = prospects.find((p: any) => p.id === selectedProspectId);
      if (prospect) {
        const lastMsg = prospect.messages && prospect.messages.length > 0 
          ? prospect.messages[prospect.messages.length - 1] 
          : null;
        markAsRead(selectedProspectId, lastMsg?.timestamp);
      }
    }
  }, [selectedProspectId, prospects]);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/whatsapp/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      if (res.ok) {
        alert("Sincronización profunda iniciada con éxito en segundo plano.");
        router.refresh();
      } else {
        const data = await res.json();
        alert("Error al sincronizar: " + (data.error || "error de conexión"));
      }
    } catch (e) {
      console.error(e);
      alert("Error de conexión");
    } finally {
      setIsSyncing(false);
    }
  };


  const [downloadedMedia, setDownloadedMedia] = useState<Record<string, { data: string; mimetype: string; filename: string }>>({});
  const [loadingMedia, setLoadingMedia] = useState<Record<string, boolean>>({});

  const parseMediaMsg = (body: string) => {
    if (!body) return { isMedia: false, type: "", caption: "" };
    const match = body.match(/^📎 \[(Imagen|Video|Audio|Archivo)\](?::\s*([\s\S]*))?$/);
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


  // Dynamic polling interval: poll faster (1.2 seconds) if there are pending messages (status = 0 or messageId is null or FAILED_) in any prospect
  const hasPending = prospects.some((p: any) =>
    p.messages?.some((m: any) => !m.messageId || m.messageId.startsWith('FAILED_') || m.status === 0)
  );
  const pollInterval = hasPending ? 1200 : 4000;

  // Real-time Polling of Prospects List
  useEffect(() => {
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
        console.error("Error polling prospects list", err);
      }
    }, pollInterval);

    return () => clearInterval(interval);
  }, [prospects, pollInterval]);

  // Campaign Modal States
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [campaignMessage, setCampaignMessage] = useState("");
  const [isCampaignScheduled, setIsCampaignScheduled] = useState(false);
  const [campaignScheduledDate, setCampaignScheduledDate] = useState("");
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [isSavingCampaign, setIsSavingCampaign] = useState(false);

  // Total open conversations count (prospects who have at least one message)
  const openConversationsCount = prospects.filter((p: any) => p.messages && p.messages.length > 0).length;

  const fetchCampaigns = async () => {
    try {
      const res = await fetch(`/api/whatsapp/campaign?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data.campaigns || []);
      }
    } catch (err) {
      console.error("Error fetching campaigns", err);
    }
  };

  const handleCreateCampaign = async () => {
    if (!campaignMessage.trim()) return;
    setIsSavingCampaign(true);

    try {
      const res = await fetch("/api/whatsapp/campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: campaignMessage,
          scheduledAt: isCampaignScheduled ? campaignScheduledDate : null
        })
      });

      if (res.ok) {
        const data = await res.json();
        alert(isCampaignScheduled 
          ? `Envío masivo programado con éxito para ${data.totalQueued} clientes.`
          : `Envío masivo iniciado con éxito para ${data.totalQueued} clientes. Se enviarán secuencialmente en segundo plano cada 5 segundos.`
        );
        setCampaignMessage("");
        setIsCampaignScheduled(false);
        setCampaignScheduledDate("");
        fetchCampaigns();
        router.refresh();
      } else {
        const errData = await res.json();
        alert(`Error: ${errData.error || "No se pudo crear la campaña"}`);
      }
    } catch (e) {
      console.error(e);
      alert("Error de conexión");
    } finally {
      setIsSavingCampaign(false);
    }
  };

  const handleCancelCampaign = async (bodyText: string, scheduledTime: string) => {
    if (confirm("¿Seguro que deseas cancelar y eliminar este envío masivo programado?")) {
      try {
        const res = await fetch("/api/whatsapp/campaign", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: bodyText, scheduledAt: scheduledTime })
        });
        if (res.ok) {
          alert("Envío masivo cancelado exitosamente.");
          fetchCampaigns();
          router.refresh();
        } else {
          alert("Error al cancelar envío");
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

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
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: selectedProspect.phone,
          message: msg,
          prospectId: selectedProspect.id
        })
      });
      setShowQuoteModal(false);
      
      if (res.ok) {
        const data = await res.json();
        if (data.messageId) {
          const optimisticQuoteMsg = {
            id: data.messageId,
            body: msg,
            isFromMe: true,
            status: 1, // Sent to queue
            timestamp: new Date().toISOString()
          };
          setProspects((prev: any) =>
            prev.map((p: any) => p.id === selectedProspect.id ? {
              ...p,
              messages: [...(p.messages || []), optimisticQuoteMsg]
            } : p)
          );
        }
      }
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

  // Helper para obtener el último mensaje
  const getLastMessage = (p: any) => {
    return p.messages && p.messages.length > 0 
      ? p.messages[p.messages.length - 1] 
      : null;
  };

  // Helper para verificar si un prospecto tiene mensajes no leídos
  const isProspectUnread = (p: any) => {
    const lastMsg = getLastMessage(p);
    if (!lastMsg) return false;
    if (lastMsg.isFromMe) return false;
    const lastReadTime = readStatus[p.id];
    if (!lastReadTime) return true;
    return new Date(lastMsg.timestamp).getTime() > lastReadTime;
  };

  // Helper para contar la cantidad de mensajes no leídos
  const getUnreadMessagesCount = (p: any) => {
    if (!p.messages || p.messages.length === 0) return 0;
    const lastReadTime = readStatus[p.id];
    if (!lastReadTime) {
      return p.messages.filter((m: any) => !m.isFromMe).length;
    }
    return p.messages.filter((m: any) => !m.isFromMe && new Date(m.timestamp).getTime() > lastReadTime).length;
  };

  // Helper para determinar el timestamp de la última actividad
  const getLatestActivityTime = (p: any) => {
    const lastMsg = getLastMessage(p);
    if (lastMsg) {
      return new Date(lastMsg.timestamp).getTime();
    }
    return new Date(p.updatedAt || p.createdAt).getTime();
  };

  const filteredProspects = prospects
    .filter((p: any) => {
      // 1. Filtro por término de búsqueda
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const nameMatch = p.name ? p.name.toLowerCase().includes(term) : false;
        const phoneMatch = p.phone ? p.phone.includes(term) : false;
        if (!nameMatch && !phoneMatch) return false;
      }
      
      // 2. Filtro por estado de lectura (Tabs)
      if (filterTab === 'unread') {
        return isProspectUnread(p);
      } else if (filterTab === 'read') {
        return !isProspectUnread(p);
      }
      return true;
    })
    .sort((a: any, b: any) => {
      return getLatestActivityTime(b) - getLatestActivityTime(a);
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

      {/* Modal Mensaje Masivo / Campañas */}
      {isCampaignModalOpen && (
        <div style={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          backgroundColor: 'rgba(15, 23, 42, 0.45)', 
          backdropFilter: 'blur(8px)',
          zIndex: 50, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <style>{`
            @keyframes modalFadeIn {
              from { opacity: 0; transform: scale(0.95); }
              to { opacity: 1; transform: scale(1); }
            }
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
          <div style={{ 
            backgroundColor: 'white', 
            borderRadius: '16px', 
            width: '600px', 
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', 
            border: '1px solid rgba(226, 232, 240, 0.8)',
            overflow: 'hidden',
            animation: 'modalFadeIn 0.3s ease-out'
          }}>
            {/* Header */}
            <div style={{ 
              padding: '1.25rem 1.5rem', 
              borderBottom: '1px solid #f1f5f9', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
              color: 'white'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  📢 Envío de Mensajes Masivos
                </h3>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.775rem', opacity: 0.9 }}>
                  Envía notificaciones a tus clientes activos con 5 segundos de espera anti-spam.
                </p>
              </div>
              <button 
                onClick={() => setIsCampaignModalOpen(false)} 
                style={{ 
                  background: 'rgba(255, 255, 255, 0.15)', 
                  border: 'none', 
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  cursor: 'pointer', 
                  fontSize: '1rem',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.25)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)'}
              >
                ✕
              </button>
            </div>

            {/* Scrollable Content */}
            <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Target Indicator */}
              <div style={{ 
                backgroundColor: '#eff6ff', 
                border: '1px solid #bfdbfe', 
                borderRadius: '10px', 
                padding: '0.85rem 1rem', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between' 
              }}>
                <div>
                  <span style={{ fontSize: '0.825rem', color: '#1e40af', fontWeight: '500' }}>Conversaciones abiertas detectadas:</span>
                  <div style={{ fontSize: '0.75rem', color: '#60a5fa', marginTop: '0.1rem' }}>Clientes con al menos 1 mensaje en esta sucursal.</div>
                </div>
                <div style={{ 
                  backgroundColor: '#3b82f6', 
                  color: 'white', 
                  fontWeight: '800', 
                  fontSize: '1.2rem', 
                  padding: '0.25rem 0.85rem', 
                  borderRadius: '20px' 
                }}>
                  {openConversationsCount}
                </div>
              </div>

              {/* Message Editor */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem', fontWeight: '600', color: '#334155' }}>
                  Contenido del Mensaje
                </label>
                <textarea 
                  required
                  placeholder="Escribe el mensaje masivo aquí... Ej: ¡Hola! Te informamos que ya tenemos listo tu pedido..." 
                  value={campaignMessage} 
                  onChange={e => setCampaignMessage(e.target.value)} 
                  rows={4}
                  style={{ 
                    width: '100%', 
                    padding: '0.75rem', 
                    borderRadius: '8px', 
                    border: '1px solid #cbd5e1', 
                    fontSize: '0.9rem',
                    fontFamily: 'inherit',
                    outline: 'none',
                    resize: 'vertical',
                    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)'
                  }} 
                />
              </div>

              {/* Scheduling Panel */}
              <div style={{ 
                border: '1px solid #e2e8f0', 
                borderRadius: '10px', 
                padding: '1rem',
                backgroundColor: '#f8fafc' 
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#334155' }}>📅 Planificar Envío</span>
                    <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                      Activa esta opción para programar el envío para una fecha/hora futura.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={isCampaignScheduled} 
                      onChange={e => setIsCampaignScheduled(e.target.checked)} 
                      className="sr-only peer" 
                      style={{ display: 'none' }}
                    />
                    <div 
                      onClick={() => setIsCampaignScheduled(!isCampaignScheduled)}
                      style={{
                        width: '44px',
                        height: '24px',
                        backgroundColor: isCampaignScheduled ? '#4f46e5' : '#cbd5e1',
                        borderRadius: '12px',
                        position: 'relative',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s'
                      }}
                    >
                      <div style={{
                        width: '18px',
                        height: '18px',
                        backgroundColor: 'white',
                        borderRadius: '50%',
                        position: 'absolute',
                        top: '3px',
                        left: isCampaignScheduled ? '23px' : '3px',
                        transition: 'left 0.2s'
                      }} />
                    </div>
                  </label>
                </div>

                {isCampaignScheduled && (
                  <div style={{ marginTop: '0.75rem', animation: 'fadeIn 0.2s' }}>
                    <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.775rem', fontWeight: '500', color: '#475569' }}>
                      Fecha y Hora de Lanzamiento:
                    </label>
                    <input 
                      type="datetime-local" 
                      required
                      value={campaignScheduledDate}
                      onChange={e => setCampaignScheduledDate(e.target.value)}
                      style={{ 
                        width: '100%', 
                        padding: '0.5rem', 
                        borderRadius: '6px', 
                        border: '1px solid #cbd5e1',
                        fontSize: '0.875rem',
                        outline: 'none',
                        color: '#1e293b'
                      }} 
                    />
                  </div>
                )}
              </div>

              {/* Anti-Spam Banner */}
              <div style={{ 
                backgroundColor: '#fffbeb', 
                border: '1px solid #fef3c7', 
                borderRadius: '10px', 
                padding: '0.75rem 1rem', 
                display: 'flex', 
                gap: '0.5rem', 
                alignItems: 'flex-start' 
              }}>
                <span style={{ fontSize: '1.1rem' }}>🛡️</span>
                <div>
                  <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#b45309' }}>Protección Antispam Inteligente Activa</span>
                  <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.75rem', color: '#d97706', lineHeight: 1.35 }}>
                    Para evitar bloqueos de WhatsApp, cada mensaje se enviará uno por uno con una espera obligatoria de **5 segundos**.
                  </p>
                </div>
              </div>

              {/* Scheduled Campaigns List */}
              {campaigns.length > 0 && (
                <div style={{ marginTop: '0.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '700', color: '#1e293b' }}>
                    📋 Envíos Programados Activos ({campaigns.length})
                  </label>
                  <div style={{ 
                    border: '1px solid #e2e8f0', 
                    borderRadius: '8px', 
                    maxHeight: '180px', 
                    overflowY: 'auto',
                    backgroundColor: '#fafafa'
                  }}>
                    {campaigns.map((c, idx) => {
                      const dateStr = new Date(c.scheduledAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
                      const isPast = new Date(c.scheduledAt) <= new Date();
                      return (
                        <div key={idx} style={{ 
                          padding: '0.75rem', 
                          borderBottom: idx === campaigns.length - 1 ? 'none' : '1px solid #f1f5f9',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '1rem'
                        }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ 
                              fontSize: '0.825rem', 
                              fontWeight: '600', 
                              color: '#334155',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis' 
                            }}>
                              {c.body}
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.15rem', fontSize: '0.725rem', color: '#64748b' }}>
                              <span>👥 {c.totalTargets} destinatarios</span>
                              <span>•</span>
                              <span style={{ color: isPast ? '#10b981' : '#4f46e5', fontWeight: '500' }}>
                                📅 {isPast ? 'Enviando ahora' : `Programado: ${dateStr}`}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleCancelCampaign(c.body, c.scheduledAt)}
                            title="Cancelar envío programado"
                            style={{
                              backgroundColor: 'transparent',
                              border: 'none',
                              color: '#ef4444',
                              cursor: 'pointer',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.775rem',
                              fontWeight: 'bold',
                              transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fee2e2'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            Cancelar
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div style={{ 
              padding: '1rem 1.5rem', 
              borderTop: '1px solid #f1f5f9', 
              display: 'flex', 
              justifyContent: 'flex-end', 
              gap: '0.75rem',
              backgroundColor: '#f8fafc'
            }}>
              <button 
                type="button" 
                onClick={() => setIsCampaignModalOpen(false)} 
                style={{ 
                  padding: '0.55rem 1.25rem', 
                  borderRadius: '8px', 
                  border: '1px solid #cbd5e1', 
                  backgroundColor: 'white',
                  color: '#475569',
                  fontWeight: '600',
                  fontSize: '0.875rem',
                  cursor: 'pointer' 
                }}
              >
                Cancelar
              </button>
              <button 
                onClick={handleCreateCampaign}
                disabled={isSavingCampaign || !campaignMessage.trim() || (isCampaignScheduled && !campaignScheduledDate)}
                style={{ 
                  padding: '0.55rem 1.5rem', 
                  borderRadius: '8px', 
                  border: 'none', 
                  backgroundColor: isSavingCampaign ? '#93c5fd' : '#4f46e5', 
                  color: 'white', 
                  fontWeight: '700',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2)'
                }}
              >
                {isSavingCampaign ? (
                  <>
                    <span style={{
                      width: '14px',
                      height: '14px',
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTop: '2px solid white',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                      display: 'inline-block'
                    }} />
                    Procesando...
                  </>
                ) : isCampaignScheduled ? 'Programar Envío' : 'Enviar Ahora ⚡'}
              </button>
            </div>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
            <h2 style={{ fontWeight: '600', fontSize: '1.125rem', margin: 0 }}>Chats</h2>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button 
                onClick={handleManualSync}
                disabled={isSyncing}
                title="Sincronizar chats de WhatsApp anteriores"
                style={{ 
                  padding: '0.35rem 0.6rem', 
                  backgroundColor: isSyncing ? '#f1f5f9' : '#0f172a', 
                  color: isSyncing ? '#94a3b8' : 'white', 
                  borderRadius: '6px', 
                  border: 'none', 
                  fontSize: '0.8rem', 
                  cursor: isSyncing ? 'not-allowed' : 'pointer', 
                  fontWeight: 'bold', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.2rem', 
                  transition: 'all 0.2s' 
                }}
              >
                <span style={{ display: 'inline-block', animation: isSyncing ? 'spin 1s linear infinite' : 'none' }}>🔄</span>
                {isSyncing ? 'Sync...' : 'Sync'}
              </button>
              <button 
                onClick={() => {
                  setIsCampaignModalOpen(true);
                  fetchCampaigns();
                }}
                title="Mensaje Masivo"
                style={{ padding: '0.35rem 0.6rem', backgroundColor: '#4f46e5', color: 'white', borderRadius: '6px', border: 'none', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.2rem', transition: 'all 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor='#4338ca'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor='#4f46e5'}
              >
                📢 Masivo
              </button>
              <button 
                onClick={() => setIsNewChatModalOpen(true)}
                style={{ padding: '0.35rem 0.6rem', backgroundColor: '#2563eb', color: 'white', borderRadius: '6px', border: 'none', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor='#1d4ed8'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor='#2563eb'}
              >
                + Nuevo
              </button>
            </div>

          </div>
          <input 
            type="text" 
            placeholder="Buscar conversación..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', marginTop: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
          />

          {/* Filtros de Chats Segmented Control */}
          <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.75rem', padding: '0.15rem', backgroundColor: '#f1f5f9', borderRadius: '10px' }}>
            <button 
              type="button"
              onClick={() => setFilterTab('all')} 
              style={{
                flex: 1,
                padding: '0.45rem 0.25rem',
                borderRadius: '8px',
                fontSize: '0.775rem',
                fontWeight: '700',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: filterTab === 'all' ? 'white' : 'transparent',
                color: filterTab === 'all' ? '#0f172a' : '#64748b',
                boxShadow: filterTab === 'all' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.2s ease',
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.25rem'
              }}
            >
              Todos
            </button>
            <button 
              type="button"
              onClick={() => setFilterTab('read')} 
              style={{
                flex: 1,
                padding: '0.45rem 0.25rem',
                borderRadius: '8px',
                fontSize: '0.775rem',
                fontWeight: '700',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: filterTab === 'read' ? 'white' : 'transparent',
                color: filterTab === 'read' ? '#0f172a' : '#64748b',
                boxShadow: filterTab === 'read' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.2s ease',
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.25rem'
              }}
            >
              Leídos
            </button>
            <button 
              type="button"
              onClick={() => setFilterTab('unread')} 
              style={{
                flex: 1,
                padding: '0.45rem 0.25rem',
                borderRadius: '8px',
                fontSize: '0.775rem',
                fontWeight: '700',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: filterTab === 'unread' ? 'white' : 'transparent',
                color: filterTab === 'unread' ? '#0f172a' : '#64748b',
                boxShadow: filterTab === 'unread' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.2s ease',
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.25rem'
              }}
            >
              <span>No leídos</span>
              {prospects.filter((p: any) => isProspectUnread(p)).length > 0 && (
                <span style={{ 
                  backgroundColor: '#ef4444', 
                  color: 'white', 
                  fontSize: '0.65rem', 
                  fontWeight: 'bold', 
                  padding: '0.05rem 0.35rem', 
                  borderRadius: '10px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {prospects.filter((p: any) => isProspectUnread(p)).length}
                </span>
              )}
            </button>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filteredProspects.map((prospect: any) => {
            const isSelected = selectedProspectId === prospect.id;
            const isUnassigned = !prospect.assignedUserId;
            const isUnread = isProspectUnread(prospect);
            
            // Determinar último mensaje
            const lastMessage = getLastMessage(prospect);

            return (
              <div 
                key={prospect.id}
                onClick={() => setSelectedProspectId(prospect.id)}
                style={{ 
                  padding: '1rem 1rem 1rem 0.75rem', 
                  borderBottom: '1px solid #e2e8f0', 
                  cursor: 'pointer',
                  backgroundColor: isSelected 
                    ? '#eff6ff' 
                    : isUnread 
                      ? '#f8fafc' 
                      : 'white',
                  borderLeft: isSelected 
                    ? '4px solid #2563eb' 
                    : isUnread 
                      ? '4px solid #4f46e5' 
                      : '4px solid transparent',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ 
                    fontSize: '1rem', 
                    color: isSelected ? '#1e40af' : isUnread ? '#0f172a' : '#334155',
                    fontWeight: isUnread ? '700' : '600'
                  }}>
                    {prospect.name}
                  </strong>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    {isUnassigned && (
                      <span style={{ fontSize: '0.65rem', backgroundColor: '#ef4444', color: 'white', padding: '0.1rem 0.4rem', borderRadius: '1rem', fontWeight: 'bold' }}>
                        NUEVO
                      </span>
                    )}
                  </div>
                </div>
                
                <div style={{ fontSize: '0.875rem', color: isUnread ? '#475569' : '#64748b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{prospect.phone}</span>
                  {lastMessage && (
                    <span style={{ 
                      fontSize: '0.725rem', 
                      color: isUnread ? '#4f46e5' : '#94a3b8', 
                      fontWeight: isUnread ? '600' : 'normal' 
                    }}>
                      {new Date(lastMessage.timestamp).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                  {lastMessage ? (
                    <div style={{ 
                      fontSize: '0.825rem', 
                      color: isSelected ? '#3b82f6' : isUnread ? '#334155' : '#94a3b8', 
                      fontWeight: isUnread ? '600' : 'normal',
                      whiteSpace: 'nowrap', 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis',
                      flex: 1
                    }}>
                      {lastMessage.isFromMe ? "Tú: " : ""}{lastMessage.body}
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.825rem', color: '#94a3b8', fontStyle: 'italic' }}>
                      Sin mensajes
                    </div>
                  )}
                  {isUnread && (
                    <span style={{ 
                      backgroundColor: '#4f46e5', 
                      color: 'white', 
                      borderRadius: '50%', 
                      minWidth: '18px', 
                      height: '18px', 
                      fontSize: '0.7rem', 
                      fontWeight: 'bold', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      padding: '0 4px',
                      flexShrink: 0,
                      boxShadow: '0 2px 4px rgba(79, 70, 229, 0.2)'
                    }}>
                      {getUnreadMessagesCount(prospect)}
                    </span>
                  )}
                </div>

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
