"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import ChatInterface from "../prospeccion/chat/[id]/ChatInterface";
import { 
  getRecentQuotes, 
  searchCustomers, 
  assignCustomerToProspect, 
  getCustomerCrmDetails, 
  createCustomerFromProspect 
} from "@/app/actions/whatsapp-crm";
import { formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";

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
  const prospectsRef = useRef(prospects);
  useEffect(() => {
    prospectsRef.current = prospects;
  }, [prospects]);
  const [selectedProspectId, setSelectedProspectId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [readStatus, setReadStatus] = useState<Record<string, number>>({});
  const [filterTab, setFilterTab] = useState<'all' | 'read' | 'unread' | 'mine' | 'unassigned'>('all');
  const [showCrmDrawer, setShowCrmDrawer] = useState(true);
  const [crmCustomerDetails, setCrmCustomerDetails] = useState<any>(null);
  const [isLoadingCrm, setIsLoadingCrm] = useState(false);
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const isSendingQuoteRef = useRef(false);

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

  // Función para marcar todos los chats como leídos
  const handleMarkAllAsRead = () => {
    const updated = { ...readStatus };
    const now = Date.now();
    prospects.forEach((p: any) => {
      updated[p.id] = now;
    });
    setReadStatus(updated);
    localStorage.setItem("whatsapp_chats_read_status", JSON.stringify(updated));
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
    if (!body) return { isMedia: false, type: "", caption: "", filename: "", base64Data: "" };

    let raw = body.trim();
    let type = "";
    let rest = "";
    let isMedia = false;
    let filename = "";

    const tagMatch = raw.match(/^(?:📎|📷|🖼️|📄|🎥|🎵|📇)?\s*\[(Imagen|Video|Audio|Documento|Archivo|Sticker|Nota de voz)(?::\s*([^\]]*))?\](?::?\s*([\s\S]*))?$/i);

    if (tagMatch) {
      isMedia = true;
      type = tagMatch[1];
      filename = tagMatch[2]?.trim() || "";
      rest = tagMatch[3]?.trim() || "";
      if (type.toLowerCase() === 'nota de voz') type = 'Audio';
    } else if (raw.startsWith('📎') || raw.startsWith('📷') || raw.startsWith('🖼️') || raw.startsWith('📄')) {
      const bracketOpen = raw.indexOf('[');
      const bracketClose = raw.indexOf(']');
      if (bracketOpen !== -1 && bracketClose > bracketOpen) {
        const inside = raw.substring(bracketOpen + 1, bracketClose).trim();
        const after = raw.substring(bracketClose + 1).trim();
        if (inside.toLowerCase().startsWith('documento:')) {
          isMedia = true;
          type = 'Documento';
          filename = inside.substring(10).trim();
          rest = after.startsWith(':') ? after.substring(1).trim() : after;
        } else if (['imagen', 'video', 'audio', 'documento', 'archivo', 'sticker', 'nota de voz'].includes(inside.toLowerCase())) {
          isMedia = true;
          type = inside.charAt(0).toUpperCase() + inside.slice(1);
          rest = after.startsWith(':') ? after.substring(1).trim() : after;
        }
      }
    }

    let base64Data: string | undefined = undefined;
    let cleanCaption = rest;

    const textToCheck = rest || raw;
    const dataUriMatch = textToCheck.match(/data:image\/[a-zA-Z0-9+.-]+;base64,([A-Za-z0-9+/=]{40,})/);
    if (dataUriMatch) {
      isMedia = true;
      if (!type) type = 'Imagen';
      base64Data = dataUriMatch[1];
      cleanCaption = cleanCaption.replace(dataUriMatch[0], '').trim();
    } else {
      const b64Match = textToCheck.match(/(\/9j\/[A-Za-z0-9+/=]{40,}|iVBORw0KGgo[A-Za-z0-9+/=]{40,}|[A-Za-z0-9+/]{100,}={0,2})/);
      if (b64Match) {
        isMedia = true;
        if (!type) type = 'Imagen';
        base64Data = b64Match[1];
        cleanCaption = cleanCaption.replace(b64Match[0], '').trim();
      }
    }

    if (cleanCaption.startsWith(':')) cleanCaption = cleanCaption.substring(1).trim();
    if (cleanCaption === filename) cleanCaption = "";

    if (isMedia) {
      return {
        isMedia: true,
        type: type || "Archivo",
        caption: cleanCaption,
        filename: filename || (type === "Imagen" ? "imagen.jpg" : "archivo"),
        base64Data
      };
    }

    return { isMedia: false, type: "", caption: "", filename: "", base64Data: "" };
  };

  const formatSidebarLastMessage = (body: string): string => {
    if (!body) return '';
    const clean = body.trim();
    const media = parseMediaMsg(clean);
    if (media.isMedia) {
      if (media.type === 'Imagen') {
        return media.caption ? `📷 Imagen: ${media.caption}` : '📷 Imagen';
      }
      if (media.type === 'Documento') {
        return media.filename ? `📄 Documento: ${media.filename}` : '📄 Documento';
      }
      if (media.type === 'Video') {
        return media.caption ? `🎥 Video: ${media.caption}` : '🎥 Video';
      }
      if (media.type === 'Audio') {
        return '🎵 Audio';
      }
      return `📎 ${media.filename || media.type}`;
    }
    if (clean.includes('👤 *Tarjeta de Contacto')) return '👤 Tarjeta de Contacto';
    if (clean.includes('🗺️') || clean.includes('📍 [Ubicación]')) return '📍 Ubicación compartida';
    if (clean.startsWith('[Mensaje tipo:')) return '💬 Mensaje de WhatsApp';
    return clean;
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
            const currentStr = JSON.stringify((prospectsRef.current || []).map((p: any) => ({
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
  }, [pollInterval]);

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
  const [isSearchingCustomers, setIsSearchingCustomers] = useState(false);
  const [linkingCustomerId, setLinkingCustomerId] = useState<string | null>(null);

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

  const getInitials = (name?: string) => {
    if (!name) return "WA";
    const clean = name.trim().replace(/^[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ]+/, '');
    const parts = clean.split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  useEffect(() => {
    let isMounted = true;
    if (selectedProspect?.customerId) {
      setIsLoadingCrm(true);
      getCustomerCrmDetails(selectedProspect.customerId)
        .then((details) => {
          if (isMounted) {
            setCrmCustomerDetails(details);
            setIsLoadingCrm(false);
          }
        })
        .catch((err) => {
          console.error("Error loading CRM details:", err);
          if (isMounted) setIsLoadingCrm(false);
        });
    } else {
      setCrmCustomerDetails(null);
      setIsLoadingCrm(false);
    }
    return () => {
      isMounted = false;
    };
  }, [selectedProspect?.customerId, selectedProspect?.id]);

  const handleQuickCreateCustomer = async () => {
    if (!selectedProspect) return;
    setIsCreatingCustomer(true);
    try {
      const res = await createCustomerFromProspect(selectedProspect.id, {
        name: selectedProspect.name,
        phone: selectedProspect.phone
      });
      if (res.success && res.customer) {
        toast.success("¡Cliente creado y vinculado exitosamente!");
        setProspects((prev: any) =>
          prev.map((p: any) =>
            p.id === selectedProspect.id
              ? { ...p, customerId: res.customer.id, customer: res.customer }
              : p
          )
        );
        setCrmCustomerDetails({
          ...res.customer,
          quotes: [],
          sales: []
        });
        router.refresh();
      } else {
        toast.error(res.error || "No se pudo crear el cliente.");
      }
    } catch (err: any) {
      console.error("Error creating customer:", err);
      toast.error("Error al crear cliente.");
    } finally {
      setIsCreatingCustomer(false);
    }
  };

  useEffect(() => {
    if (showCustomerModal) {
      if (customers && customers.length > 0 && searchedCustomers.length === 0) {
        setSearchedCustomers(customers.slice(0, 15));
      } else {
        handleSearchCustomer(undefined, "");
      }
    }
  }, [showCustomerModal]);

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
    if (isSendingQuoteRef.current) return;
    if (!selectedProspect) return;
    const link = `${window.location.origin}/ventas/detalle/${quoteId}/imprimir-cotizacion`;
    const msg = `¡Hola! Aquí tienes el enlace a tu cotización solicitada: \n${link}`;
    
    isSendingQuoteRef.current = true;
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
    } finally {
      isSendingQuoteRef.current = false;
    }
  };

  const handleSearchCustomer = async (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    if (!selectedProspect) return;
    const query = customQuery !== undefined ? customQuery : customerSearch;
    setIsSearchingCustomers(true);
    try {
      const data = await searchCustomers(query, currentUser?.tenantId || "");
      setSearchedCustomers(data || []);
    } catch (err) {
      console.error("Error al buscar clientes:", err);
    } finally {
      setIsSearchingCustomers(false);
    }
  };

  const handleAssignCustomer = async (customerId: string) => {
    if (!selectedProspect || linkingCustomerId) return;
    setLinkingCustomerId(customerId);
    try {
      let updatedProspectObj: any = null;
      // 1. Try PATCH via API
      try {
        const res = await fetch(`/api/prospects/${selectedProspect.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customerId })
        });
        if (res.ok) {
          updatedProspectObj = await res.json();
        }
      } catch (patchErr) {
        console.warn("PATCH API error, trying Server Action fallback:", patchErr);
      }

      // 2. Fallback to Server Action if needed
      if (!updatedProspectObj) {
        const actionRes = await assignCustomerToProspect(selectedProspect.id, customerId);
        if (actionRes?.success && actionRes?.prospect) {
          updatedProspectObj = actionRes.prospect;
        } else if (!actionRes?.success) {
          throw new Error(actionRes?.error || "Error al vincular cliente.");
        }
      }

      const matchedCustomer = updatedProspectObj?.customer ||
        searchedCustomers.find((c: any) => c.id === customerId) ||
        customers.find((c: any) => c.id === customerId) ||
        { id: customerId, name: "Cliente Vinculado" };

      setProspects((prev: any) =>
        prev.map((p: any) => p.id === selectedProspect.id ? { 
          ...p, 
          customerId, 
          customer: matchedCustomer 
        } : p)
      );

      setShowCustomerModal(false);
      toast.success("Cliente vinculado exitosamente");
      router.refresh();
    } catch (e: any) {
      console.error("Error al vincular cliente:", e);
      alert(e?.message || "No se pudo vincular el cliente. Por favor verifica tu conexión e intenta de nuevo.");
    } finally {
      setLinkingCustomerId(null);
    }
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

  const unreadCount = prospects.filter((p: any) => isProspectUnread(p)).length;
  const mineCount = currentUser?.id ? prospects.filter((p: any) => p.assignedUserId === currentUser.id).length : 0;
  const unassignedCount = prospects.filter((p: any) => !p.assignedUserId).length;

  const filteredProspects = prospects
    .filter((p: any) => {
      // 1. Filtro por término de búsqueda
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const nameMatch = p.name ? p.name.toLowerCase().includes(term) : false;
        const phoneMatch = p.phone ? p.phone.includes(term) : false;
        if (!nameMatch && !phoneMatch) return false;
      }
      
      // 2. Filtro por pestañas (Todos, Leídos, No leídos, Mis chats, Sin asignar)
      if (filterTab === 'read') {
        return !isProspectUnread(p);
      } else if (filterTab === 'unread') {
        return isProspectUnread(p);
      } else if (filterTab === 'mine') {
        return currentUser?.id ? p.assignedUserId === currentUser.id : true;
      } else if (filterTab === 'unassigned') {
        return !p.assignedUserId;
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
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{q.customer?.name || "Público General"} - {formatCurrency(q.total)}</div>
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
            <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', width: '90%', maxWidth: '520px', maxHeight: '80%', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 'bold', color: '#0f172a' }}>Asignar a Cliente Existente</h3>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>Vincula este chat de WhatsApp con un cliente del catálogo</p>
                </div>
                <button onClick={() => setShowCustomerModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#94a3b8' }}>✕</button>
              </div>
              <form onSubmit={handleSearchCustomer} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <input 
                  type="text" 
                  value={customerSearch} 
                  onChange={e => setCustomerSearch(e.target.value)} 
                  placeholder="Buscar por nombre, RFC o teléfono..." 
                  style={{ flex: 1, padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }} 
                />
                <button 
                  type="submit" 
                  disabled={isSearchingCustomers}
                  style={{ backgroundColor: '#0f172a', color: 'white', border: 'none', padding: '0.6rem 1.1rem', borderRadius: '8px', cursor: isSearchingCustomers ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '0.875rem' }}
                >
                  {isSearchingCustomers ? 'Buscando...' : 'Buscar'}
                </button>
              </form>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '350px', overflowY: 'auto' }}>
                {isSearchingCustomers ? (
                  <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#64748b' }}>
                    <div style={{ width: '20px', height: '20px', border: '2px solid #cbd5e1', borderTop: '2px solid #0f172a', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 0.5rem auto' }} />
                    <span style={{ fontSize: '0.875rem' }}>Buscando clientes...</span>
                  </div>
                ) : searchedCustomers.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                    <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 500 }}>No se encontraron clientes</p>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>Prueba con otro término de búsqueda o RFC</p>
                  </div>
                ) : searchedCustomers.map(c => {
                  const isCurrentLinked = selectedProspect?.customerId === c.id;
                  const isLinkingThis = linkingCustomerId === c.id;
                  return (
                    <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', border: isCurrentLinked ? '2px solid #16a34a' : '1px solid #e2e8f0', backgroundColor: isCurrentLinked ? '#f0fdf4' : 'white', borderRadius: '8px' }}>
                      <div style={{ flex: 1, marginRight: '0.5rem' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#0f172a' }}>{c.name || c.legalName || 'Sin Nombre'}</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.2rem' }}>
                          {c.phone && <span>📞 {c.phone}</span>}
                          {c.taxId && <span>🆔 {c.taxId}</span>}
                          {c.email && <span>✉️ {c.email}</span>}
                        </div>
                      </div>
                      <button 
                        onClick={() => handleAssignCustomer(c.id)}
                        disabled={isLinkingThis || isCurrentLinked}
                        style={{ 
                          backgroundColor: isCurrentLinked ? '#64748b' : isLinkingThis ? '#86efac' : '#16a34a', 
                          color: 'white', 
                          border: 'none', 
                          padding: '0.45rem 0.9rem', 
                          borderRadius: '6px', 
                          cursor: (isLinkingThis || isCurrentLinked) ? 'default' : 'pointer', 
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          minWidth: '85px',
                          justifyContent: 'center'
                        }}
                      >
                        {isLinkingThis ? (
                          <>
                            <span style={{ width: '12px', height: '12px', border: '2px solid rgba(255,255,255,0.4)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 1s linear infinite', display: 'inline-block' }} />
                            <span>...</span>
                          </>
                        ) : isCurrentLinked ? 'Vinculado' : 'Vincular'}
                      </button>
                    </div>
                  );
                })}
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.2rem', marginTop: '0.75rem', padding: '0.2rem', backgroundColor: '#f1f5f9', borderRadius: '10px' }}>
            <button 
              type="button"
              onClick={() => setFilterTab('all')} 
              style={{
                padding: '0.45rem 0.15rem',
                borderRadius: '8px',
                fontSize: '0.725rem',
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
                justifyContent: 'center'
              }}
            >
              Todos
            </button>
            <button 
              type="button"
              onClick={() => setFilterTab('unread')} 
              style={{
                padding: '0.45rem 0.15rem',
                borderRadius: '8px',
                fontSize: '0.725rem',
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
                gap: '0.2rem'
              }}
            >
              <span>No leídos</span>
              {unreadCount > 0 && (
                <span style={{ 
                  backgroundColor: '#ef4444', 
                  color: 'white', 
                  fontSize: '0.6rem', 
                  fontWeight: 'bold', 
                  padding: '0.05rem 0.3rem', 
                  borderRadius: '10px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {unreadCount}
                </span>
              )}
            </button>
            <button 
              type="button"
              onClick={() => setFilterTab('mine')} 
              style={{
                padding: '0.45rem 0.15rem',
                borderRadius: '8px',
                fontSize: '0.725rem',
                fontWeight: '700',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: filterTab === 'mine' ? 'white' : 'transparent',
                color: filterTab === 'mine' ? '#0f172a' : '#64748b',
                boxShadow: filterTab === 'mine' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.2s ease',
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.2rem'
              }}
            >
              <span>Míos</span>
              {mineCount > 0 && (
                <span style={{ 
                  backgroundColor: '#2563eb', 
                  color: 'white', 
                  fontSize: '0.6rem', 
                  fontWeight: 'bold', 
                  padding: '0.05rem 0.3rem', 
                  borderRadius: '10px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {mineCount}
                </span>
              )}
            </button>
            <button 
              type="button"
              onClick={() => setFilterTab('unassigned')} 
              style={{
                padding: '0.45rem 0.15rem',
                borderRadius: '8px',
                fontSize: '0.725rem',
                fontWeight: '700',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: filterTab === 'unassigned' ? 'white' : 'transparent',
                color: filterTab === 'unassigned' ? '#0f172a' : '#64748b',
                boxShadow: filterTab === 'unassigned' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.2s ease',
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.2rem'
              }}
            >
              <span>Sin asignar</span>
              {unassignedCount > 0 && (
                <span style={{ 
                  backgroundColor: '#f59e0b', 
                  color: 'white', 
                  fontSize: '0.6rem', 
                  fontWeight: 'bold', 
                  padding: '0.05rem 0.3rem', 
                  borderRadius: '10px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {unassignedCount}
                </span>
              )}
            </button>
          </div>
          
          {filterTab === 'unread' && prospects.filter((p: any) => isProspectUnread(p)).length > 0 && (
            <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fef2f2', padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #fecaca' }}>
              <span style={{ fontSize: '0.725rem', color: '#991b1b', fontWeight: '500' }}>Sin abrir acumulados en historial</span>
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                style={{ fontSize: '0.725rem', fontWeight: 'bold', color: '#b91c1c', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Marcar todos como leídos
              </button>
            </div>
          )}
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
                  padding: '0.85rem 0.75rem', 
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
                  gap: '0.75rem',
                  alignItems: 'center'
                }}
              >
                {/* Avatar Initials Circle */}
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: isSelected 
                    ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' 
                    : isUnread 
                      ? 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)' 
                      : '#e2e8f0',
                  color: isSelected || isUnread ? 'white' : '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '700',
                  fontSize: '0.875rem',
                  flexShrink: 0
                }}>
                  {getInitials(prospect.name)}
                </div>

                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ 
                      fontSize: '0.95rem', 
                      color: isSelected ? '#1e40af' : isUnread ? '#0f172a' : '#334155',
                      fontWeight: isUnread ? '700' : '600',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {prospect.name}
                    </strong>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexShrink: 0 }}>
                      {isUnassigned && (
                        <span style={{ fontSize: '0.625rem', backgroundColor: '#ef4444', color: 'white', padding: '0.05rem 0.35rem', borderRadius: '1rem', fontWeight: 'bold' }}>
                          NUEVO
                        </span>
                      )}
                      {lastMessage && (
                        <span style={{ 
                          fontSize: '0.7rem', 
                          color: isUnread ? '#4f46e5' : '#94a3b8', 
                          fontWeight: isUnread ? '600' : 'normal' 
                        }}>
                          {new Date(lastMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                    {lastMessage ? (
                      <div style={{ 
                        fontSize: '0.8rem', 
                        color: isSelected ? '#3b82f6' : isUnread ? '#334155' : '#94a3b8', 
                        fontWeight: isUnread ? '600' : 'normal',
                        whiteSpace: 'nowrap', 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis',
                        flex: 1
                      }}>
                        {lastMessage.isFromMe ? "Tú: " : ""}{formatSidebarLastMessage(lastMessage.body)}
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>
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
                        fontSize: '0.65rem', 
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

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.725rem', marginTop: '0.1rem' }}>
                    <span style={{ color: '#94a3b8' }}>{prospect.phone}</span>
                    <span style={{ color: prospect.assignedUser ? '#2563eb' : '#f59e0b', fontWeight: '500' }}>
                      {prospect.assignedUser ? `👤 ${prospect.assignedUser.name.split(' ')[0]}` : 'Sin asignar'}
                    </span>
                  </div>
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
            <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid #e2e8f0', backgroundColor: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                {/* Avatar */}
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  boxShadow: '0 2px 4px rgba(2, 132, 199, 0.2)',
                  flexShrink: 0
                }}>
                  {getInitials(selectedProspect.name)}
                </div>

                <div style={{ minWidth: 0 }}>
                  {isEditingName ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                      <input 
                        type="text" 
                        value={tempName} 
                        onChange={e => setTempName(e.target.value)} 
                        style={{ 
                          fontSize: '1rem', 
                          fontWeight: 'bold', 
                          padding: '0.2rem 0.5rem', 
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
                        style={{ padding: '0.2rem 0.6rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.75rem' }}>
                        Guardar
                      </button>
                      <button 
                        onClick={() => setIsEditingName(false)} 
                        style={{ padding: '0.2rem 0.6rem', backgroundColor: '#cbd5e1', color: '#334155', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.75rem' }}>
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#1e293b', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {selectedProspect.name}
                      </h3>
                      <button 
                        onClick={() => {
                          setTempName(selectedProspect.name || "");
                          setIsEditingName(true);
                        }} 
                        title="Editar nombre"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem', display: 'inline-flex', alignItems: 'center', color: '#64748b' }}>
                        ✏️
                      </button>
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{selectedProspect.phone}</span>
                    {selectedProspect.customerId ? (
                      <span 
                        onClick={() => setShowCrmDrawer(true)}
                        style={{ 
                          fontSize: '0.725rem', 
                          backgroundColor: '#ecfdf5', 
                          color: '#059669', 
                          padding: '0.1rem 0.5rem', 
                          borderRadius: '10px', 
                          border: '1px solid #a7f3d0',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        ✅ Cliente Vinculado
                      </span>
                    ) : (
                      <span 
                        onClick={() => setShowCrmDrawer(true)}
                        style={{ 
                          fontSize: '0.725rem', 
                          backgroundColor: '#fffbeb', 
                          color: '#d97706', 
                          padding: '0.1rem 0.5rem', 
                          borderRadius: '10px', 
                          border: '1px solid #fde68a',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        ⚠️ Prospecto
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {/* Botón Drawer CRM */}
                <button 
                  onClick={() => setShowCrmDrawer(prev => !prev)}
                  title={showCrmDrawer ? "Ocultar panel lateral" : "Ver detalles y CRM del cliente"}
                  style={{
                    backgroundColor: showCrmDrawer ? '#dbeafe' : '#f1f5f9',
                    border: showCrmDrawer ? '1px solid #93c5fd' : '1px solid #cbd5e1',
                    color: showCrmDrawer ? '#1d4ed8' : '#475569',
                    cursor: 'pointer',
                    padding: '0.4rem 0.75rem',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    transition: 'all 0.2s'
                  }}
                >
                  <span>{showCrmDrawer ? '◀ CRM Activo' : 'ℹ️ Ver CRM'}</span>
                </button>

                <button 
                  onClick={handleOpenQuotes}
                  style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569', cursor: 'pointer', padding: '0.4rem 0.75rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  📂 Cargar Cotización
                </button>

                {selectedProspect.customerId && (
                  <button
                    onClick={() => router.push(`/pos?customerId=${selectedProspect.customerId}`)}
                    style={{
                      padding: '0.4rem 0.75rem',
                      backgroundColor: '#059669',
                      color: 'white',
                      borderRadius: '8px',
                      border: 'none',
                      fontWeight: 'bold',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem'
                    }}
                  >
                    <span>🛒</span>
                    <span>Venta POS</span>
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
                    padding: '0.4rem 0.75rem',
                    backgroundColor: '#10b981',
                    color: 'white',
                    borderRadius: '8px',
                    border: 'none',
                    fontWeight: 'bold',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem'
                  }}
                >
                  <span>📄</span>
                  <span>Cotizar</span>
                </button>

                <select 
                  value={selectedProspect.assignedUserId || ""}
                  onChange={(e) => handleAssign(selectedProspect.id, e.target.value)}
                  style={{ 
                    padding: '0.4rem 0.65rem', 
                    fontSize: '0.8rem', 
                    borderRadius: '8px', 
                    border: '1px solid #cbd5e1', 
                    backgroundColor: '#f8fafc', 
                    color: '#1e293b',
                    fontWeight: '600',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="">👤 Sin asignar</option>
                  {users.map((u: any) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>

                <button
                  onClick={handleDeleteConversation}
                  title="Eliminar Conversación"
                  style={{
                    padding: '0.4rem',
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
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Área de Chat + CRM Drawer Panel */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100%' }}>
                {/* Es crucial agregar el key={selectedProspect.id} para que React desmonte y vuelva a montar el ChatInterface, asegurando que se resetee el estado de mensajes cuando cambiamos de prospecto */}
                <ChatInterface key={selectedProspect.id} prospect={selectedProspect} />
              </div>

              {/* Panel Lateral Drawer CRM */}
              {showCrmDrawer && (
                <div style={{
                  width: '340px',
                  borderLeft: '1px solid #e2e8f0',
                  backgroundColor: '#ffffff',
                  display: 'flex',
                  flexDirection: 'column',
                  flexShrink: 0,
                  height: '100%',
                  overflowY: 'auto'
                }}>
                  {/* Drawer Header */}
                  <div style={{
                    padding: '0.85rem 1rem',
                    borderBottom: '1px solid #f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: '#f8fafc'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ fontSize: '1rem' }}>📋</span>
                      <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '700', color: '#0f172a' }}>
                        Ficha de Contacto & CRM
                      </h4>
                    </div>
                    <button 
                      onClick={() => setShowCrmDrawer(false)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        fontSize: '1.1rem',
                        padding: '0.2rem 0.4rem',
                        borderRadius: '4px'
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = '#0f172a'}
                      onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
                    >
                      ✕
                    </button>
                  </div>

                  <div style={{ padding: '1.1rem', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                    {/* Contact Overview */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                      <div style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold',
                        fontSize: '1.25rem',
                        boxShadow: '0 4px 6px -1px rgba(2, 132, 199, 0.25)',
                        marginBottom: '0.5rem'
                      }}>
                        {getInitials(selectedProspect.name)}
                      </div>
                      <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', color: '#0f172a' }}>
                        {selectedProspect.name}
                      </h3>
                      <span style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.15rem' }}>
                        {selectedProspect.phone}
                      </span>
                      {selectedProspect.customerId ? (
                        <span style={{
                          marginTop: '0.4rem',
                          fontSize: '0.725rem',
                          backgroundColor: '#ecfdf5',
                          color: '#059669',
                          padding: '0.15rem 0.55rem',
                          borderRadius: '20px',
                          border: '1px solid #a7f3d0',
                          fontWeight: 700
                        }}>
                          ✅ Cliente Registrado
                        </span>
                      ) : (
                        <span style={{
                          marginTop: '0.4rem',
                          fontSize: '0.725rem',
                          backgroundColor: '#fffbeb',
                          color: '#d97706',
                          padding: '0.15rem 0.55rem',
                          borderRadius: '20px',
                          border: '1px solid #fde68a',
                          fontWeight: 700
                        }}>
                          ⚠️ Prospecto no registrado
                        </span>
                      )}
                    </div>

                    {/* Asesor Asignado Selector */}
                    <div style={{ backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: '700', color: '#475569', marginBottom: '0.3rem' }}>
                        👤 Asesor Responsable
                      </label>
                      <select 
                        value={selectedProspect.assignedUserId || ""}
                        onChange={(e) => handleAssign(selectedProspect.id, e.target.value)}
                        style={{ 
                          width: '100%',
                          padding: '0.4rem 0.5rem', 
                          fontSize: '0.8rem', 
                          borderRadius: '6px', 
                          border: '1px solid #cbd5e1', 
                          backgroundColor: 'white', 
                          color: '#1e293b',
                          fontWeight: '600',
                          outline: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="">-- Sin asignar --</option>
                        {users.map((u: any) => (
                          <option key={u.id} value={u.id}>{u.name} ({u.commissionRole || 'Ventas'})</option>
                        ))}
                      </select>
                    </div>

                    {/* CRM Details - If customer is linked */}
                    {selectedProspect.customerId ? (
                      <>
                        {isLoadingCrm ? (
                          <div style={{ textAlign: 'center', padding: '1.25rem', color: '#64748b' }}>
                            <div style={{ width: '20px', height: '20px', border: '2px solid #cbd5e1', borderTop: '2px solid #2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 0.5rem auto' }} />
                            <span style={{ fontSize: '0.75rem' }}>Cargando métricas...</span>
                          </div>
                        ) : (
                          <>
                            {/* Financial Metrics Cards (2x2 Grid) */}
                            <div>
                              <div style={{ fontSize: '0.775rem', fontWeight: '700', color: '#334155', marginBottom: '0.4rem' }}>
                                📊 Resumen Financiero
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.45rem' }}>
                                {/* Saldo Deudor */}
                                <div style={{
                                  backgroundColor: (crmCustomerDetails?.creditBalance || 0) > 0 ? '#fef2f2' : '#f0fdf4',
                                  border: (crmCustomerDetails?.creditBalance || 0) > 0 ? '1px solid #fecaca' : '1px solid #bbf7d0',
                                  borderRadius: '8px',
                                  padding: '0.6rem'
                                }}>
                                  <div style={{ fontSize: '0.675rem', color: '#64748b', fontWeight: '600' }}>Saldo Deudor</div>
                                  <div style={{
                                    fontSize: '0.9rem',
                                    fontWeight: '800',
                                    color: (crmCustomerDetails?.creditBalance || 0) > 0 ? '#dc2626' : '#16a34a',
                                    marginTop: '0.1rem'
                                  }}>
                                    {formatCurrency(crmCustomerDetails?.creditBalance || 0)}
                                  </div>
                                  <div style={{ fontSize: '0.625rem', color: (crmCustomerDetails?.creditBalance || 0) > 0 ? '#ef4444' : '#15803d', marginTop: '0.05rem' }}>
                                    {(crmCustomerDetails?.creditBalance || 0) > 0 ? '⚠️ Pendiente' : '✅ Al día'}
                                  </div>
                                </div>

                                {/* Límite de Crédito */}
                                <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.6rem' }}>
                                  <div style={{ fontSize: '0.675rem', color: '#64748b', fontWeight: '600' }}>Límite Crédito</div>
                                  <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#0f172a', marginTop: '0.1rem' }}>
                                    {formatCurrency(crmCustomerDetails?.creditLimit || 0)}
                                  </div>
                                  <div style={{ fontSize: '0.625rem', color: '#64748b', marginTop: '0.05rem' }}>
                                    {crmCustomerDetails?.creditDays || 0} días plazo
                                  </div>
                                </div>

                                {/* Monedero */}
                                <div style={{ backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', padding: '0.6rem' }}>
                                  <div style={{ fontSize: '0.675rem', color: '#047857', fontWeight: '600' }}>Monedero</div>
                                  <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#059669', marginTop: '0.1rem' }}>
                                    {formatCurrency(crmCustomerDetails?.storeCredit || 0)}
                                  </div>
                                  <div style={{ fontSize: '0.625rem', color: '#065f46', marginTop: '0.05rem' }}>
                                    Saldo a favor
                                  </div>
                                </div>

                                {/* Tarifa / Lista */}
                                <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '0.6rem' }}>
                                  <div style={{ fontSize: '0.675rem', color: '#1e40af', fontWeight: '600' }}>Lista Precios</div>
                                  <div style={{ fontSize: '0.8rem', fontWeight: '800', color: '#1d4ed8', marginTop: '0.1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {crmCustomerDetails?.priceList || 'Público'}
                                  </div>
                                  <div style={{ fontSize: '0.625rem', color: '#2563eb', marginTop: '0.05rem' }}>
                                    RFC: {crmCustomerDetails?.taxId || 'XAXX010101000'}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Acciones Rápidas */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                              <button
                                onClick={() => router.push(`/pos?customerId=${selectedProspect.customerId}`)}
                                style={{
                                  padding: '0.5rem',
                                  backgroundColor: '#059669',
                                  color: 'white',
                                  borderRadius: '6px',
                                  border: 'none',
                                  fontWeight: '700',
                                  fontSize: '0.775rem',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '0.35rem',
                                  boxShadow: '0 2px 4px rgba(5, 150, 105, 0.2)'
                                }}
                              >
                                <span>🛒</span>
                                <span>Abrir Punto de Venta (POS)</span>
                              </button>

                              <button
                                onClick={() => router.push(`/ventas/cotizaciones/nueva?customerId=${selectedProspect.customerId}`)}
                                style={{
                                  padding: '0.5rem',
                                  backgroundColor: '#2563eb',
                                  color: 'white',
                                  borderRadius: '6px',
                                  border: 'none',
                                  fontWeight: '700',
                                  fontSize: '0.775rem',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '0.35rem',
                                  boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)'
                                }}
                              >
                                <span>📄</span>
                                <span>Crear Nueva Cotización</span>
                              </button>
                            </div>

                            {/* Cotizaciones Recientes */}
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                                <span style={{ fontSize: '0.775rem', fontWeight: '700', color: '#334155' }}>
                                  📑 Cotizaciones Recientes ({crmCustomerDetails?.quotes?.length || 0})
                                </span>
                              </div>
                              {(!crmCustomerDetails?.quotes || crmCustomerDetails.quotes.length === 0) ? (
                                <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic', padding: '0.4rem', backgroundColor: '#f8fafc', borderRadius: '6px', textAlign: 'center' }}>
                                  Sin cotizaciones registradas
                                </div>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                  {crmCustomerDetails.quotes.map((q: any) => (
                                    <div key={q.id} style={{
                                      padding: '0.45rem 0.55rem',
                                      backgroundColor: '#f8fafc',
                                      border: '1px solid #e2e8f0',
                                      borderRadius: '6px',
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                      gap: '0.4rem'
                                    }}>
                                      <div style={{ minWidth: 0, flex: 1 }}>
                                        <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#0f172a' }}>
                                          #{q.folio || q.id.slice(0, 6).toUpperCase()}
                                        </div>
                                        <div style={{ fontSize: '0.675rem', color: '#64748b' }}>
                                          {new Date(q.createdAt).toLocaleDateString([], { day: '2-digit', month: 'short' })} • {formatCurrency(q.total)}
                                        </div>
                                      </div>
                                      <button
                                        onClick={() => handleSendQuote(q.id)}
                                        title="Enviar enlace por WhatsApp"
                                        style={{
                                          padding: '0.25rem 0.5rem',
                                          backgroundColor: '#10b981',
                                          color: 'white',
                                          border: 'none',
                                          borderRadius: '5px',
                                          fontSize: '0.675rem',
                                          fontWeight: '700',
                                          cursor: 'pointer',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '0.2rem',
                                          flexShrink: 0
                                        }}
                                      >
                                        <span>📤</span>
                                        <span>Enviar</span>
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Ventas Recientes */}
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                                <span style={{ fontSize: '0.775rem', fontWeight: '700', color: '#334155' }}>
                                  🛍️ Compras Recientes ({crmCustomerDetails?.sales?.length || 0})
                                </span>
                              </div>
                              {(!crmCustomerDetails?.sales || crmCustomerDetails.sales.length === 0) ? (
                                <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic', padding: '0.4rem', backgroundColor: '#f8fafc', borderRadius: '6px', textAlign: 'center' }}>
                                  Sin compras registradas
                                </div>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                  {crmCustomerDetails.sales.map((s: any) => (
                                    <div key={s.id} style={{
                                      padding: '0.45rem 0.55rem',
                                      backgroundColor: '#f8fafc',
                                      border: '1px solid #e2e8f0',
                                      borderRadius: '6px',
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center'
                                    }}>
                                      <div>
                                        <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#0f172a' }}>
                                          #{s.folio || s.id.slice(0, 6).toUpperCase()}
                                        </div>
                                        <div style={{ fontSize: '0.675rem', color: '#64748b' }}>
                                          {new Date(s.createdAt).toLocaleDateString([], { day: '2-digit', month: 'short' })}
                                        </div>
                                      </div>
                                      <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.775rem', fontWeight: '800', color: '#0f172a' }}>
                                          {formatCurrency(s.total)}
                                        </div>
                                        <div style={{ fontSize: '0.625rem', color: '#16a34a', fontWeight: '600' }}>
                                          {s.paymentMethod || 'Pagado'}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Cliente management footer */}
                            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.65rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <button
                                onClick={() => setShowCustomerModal(true)}
                                style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.725rem', fontWeight: '600', cursor: 'pointer', textDecoration: 'underline' }}
                              >
                                Cambiar Cliente
                              </button>
                              <button
                                onClick={handleUnlinkCustomer}
                                style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.725rem', fontWeight: '600', cursor: 'pointer', textDecoration: 'underline' }}
                              >
                                Desvincular
                              </button>
                            </div>
                          </>
                        )}
                      </>
                    ) : (
                      /* If customer is NOT linked */
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div style={{
                          backgroundColor: '#eff6ff',
                          border: '1px solid #bfdbfe',
                          borderRadius: '8px',
                          padding: '0.75rem',
                          fontSize: '0.775rem',
                          color: '#1e40af',
                          lineHeight: 1.4
                        }}>
                          💡 <strong>Vincula este chat</strong> para consultar límites de crédito, saldo deudor, crear cotizaciones formales y asignar ventas con 1 clic.
                        </div>

                        <button
                          onClick={handleQuickCreateCustomer}
                          disabled={isCreatingCustomer}
                          style={{
                            padding: '0.6rem 0.85rem',
                            backgroundColor: isCreatingCustomer ? '#93c5fd' : '#2563eb',
                            color: 'white',
                            borderRadius: '8px',
                            border: 'none',
                            fontWeight: '700',
                            fontSize: '0.825rem',
                            cursor: isCreatingCustomer ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.35rem',
                            boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)'
                          }}
                        >
                          {isCreatingCustomer ? (
                            <>
                              <span style={{ width: '12px', height: '12px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 1s linear infinite', display: 'inline-block' }} />
                              <span>Creando cliente...</span>
                            </>
                          ) : (
                            <>
                              <span>🌟</span>
                              <span>Convertir en Cliente (1 Clic)</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => setShowCustomerModal(true)}
                          style={{
                            padding: '0.55rem 0.85rem',
                            backgroundColor: 'white',
                            color: '#334155',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            fontWeight: '600',
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.35rem'
                          }}
                        >
                          <span>🔍</span>
                          <span>Vincular a Cliente Existente</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
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
