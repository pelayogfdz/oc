"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getRecentQuotes, searchCustomers, assignCustomerToProspect } from "../../../../../actions/whatsapp-crm";

const getCoordsFromMessage = (body: string) => {
  if (!body) return "20.6766,-103.3475";
  const match = body.match(/q=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (match) {
    return `${match[1]},${match[2]}`;
  }
  return "20.6766,-103.3475";
};

export default function ChatInterface({ prospect }: { prospect: any }) {
  const [messages, setMessages] = useState<any[]>(prospect.messages || []);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const isSendingRef = useRef(false);
  const [whatsappStatus, setWhatsappStatus] = useState<string>("CONNECTED");
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const [downloadedMedia, setDownloadedMedia] = useState<Record<string, { data: string; mimetype: string; filename: string }>>({});
  const [loadingMedia, setLoadingMedia] = useState<Record<string, boolean>>({});
  const [previewModalImage, setPreviewModalImage] = useState<string | null>(null);
  const [previewModalPdf, setPreviewModalPdf] = useState<{ url: string; filename: string; rawData?: string } | null>(null);

  // Media Modal para previsualización antes de enviar (pegar Ctrl+V, drag & drop, selector)
  const [mediaModal, setMediaModal] = useState<{
    name: string;
    type: string;
    base64: string;
    caption: string;
    size?: number;
  } | null>(null);

  // Drag & drop state
  const [isDragging, setIsDragging] = useState(false);

  // Citar / responder mensaje
  const [replyingTo, setReplyingTo] = useState<{
    id: string;
    messageId?: string;
    body: string;
    sender: string;
    isFromMe: boolean;
  } | null>(null);

  // Reacciones a mensajes
  const [reactions, setReactions] = useState<Record<string, string[]>>({});
  const [activeReactionMenuMsgId, setActiveReactionMenuMsgId] = useState<string | null>(null);

  // Feedback de copiado
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  // Zoom y Rotación en Lightbox
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotationDeg, setRotationDeg] = useState(0);

  // Hover en mensajes
  const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null);

  // Cargar reacciones desde localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && prospect?.id) {
      try {
        const saved = localStorage.getItem(`whatsapp_reactions_${prospect.id}`);
        if (saved) setReactions(JSON.parse(saved));
      } catch (e) {}
    }
  }, [prospect?.id]);

  const toggleReaction = (msgId: string, emoji: string) => {
    setReactions(prev => {
      const current = prev[msgId] || [];
      const exists = current.includes(emoji);
      const updated = exists ? current.filter(e => e !== emoji) : [...current, emoji];
      const next = { ...prev, [msgId]: updated };
      try {
        localStorage.setItem(`whatsapp_reactions_${prospect.id}`, JSON.stringify(next));
      } catch (e) {}
      return next;
    });
    setActiveReactionMenuMsgId(null);
  };

  const handleCopyMessage = (msgId: string, text: string) => {
    const clean = text.replace(/^>\s*\[(?:Cita|Respuesta):[\s\S]*?\]\s*\n\n/, '').trim();
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(clean);
    }
    setCopiedMsgId(msgId);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const getDateChipLabel = (timestamp: string) => {
    const d = new Date(timestamp);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const msgDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diffDays = Math.round((today.getTime() - msgDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Hoy";
    if (diffDays === 1) return "Ayer";
    if (diffDays < 7) {
      const dayName = d.toLocaleDateString('es-MX', { weekday: 'long' });
      return dayName.charAt(0).toUpperCase() + dayName.slice(1);
    }
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  // Safe formatting renderer for WhatsApp text
  const renderWhatsAppFormattedText = (rawText: string) => {
    if (!rawText) return null;

    let quotePart: { author: string; text: string } | null = null;
    let remainingText = rawText;

    const quoteMatch = rawText.match(/^>\s*\[(?:Cita|Respuesta):\s*([^:]+):\s*([\s\S]*?)\]\s*\n\n([\s\S]*)$/);
    if (quoteMatch) {
      quotePart = { author: quoteMatch[1].trim(), text: quoteMatch[2].trim() };
      remainingText = quoteMatch[3];
    }

    const formatTokens = (text: string) => {
      const regex = /(https?:\/\/[^\s]+|\*[^*\n\r]+\*|_[^_\n\r]+_|~[^~\n\r]+~|```[^`]+```)/g;
      const parts = text.split(regex);

      return parts.map((part, index) => {
        if (!part) return null;

        if (part.startsWith('http://') || part.startsWith('https://')) {
          return (
            <a
              key={index}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#0284c7', textDecoration: 'underline', wordBreak: 'break-all' }}
              onClick={(e) => e.stopPropagation()}
            >
              {part}
            </a>
          );
        }

        if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
          return <strong key={index} style={{ fontWeight: 'bold' }}>{part.slice(1, -1)}</strong>;
        }

        if (part.startsWith('_') && part.endsWith('_') && part.length > 2) {
          return <em key={index} style={{ fontStyle: 'italic' }}>{part.slice(1, -1)}</em>;
        }

        if (part.startsWith('~') && part.endsWith('~') && part.length > 2) {
          return <del key={index}>{part.slice(1, -1)}</del>;
        }

        if (part.startsWith('```') && part.endsWith('```') && part.length > 6) {
          return (
            <code
              key={index}
              style={{
                backgroundColor: 'rgba(0,0,0,0.06)',
                padding: '2px 4px',
                borderRadius: '4px',
                fontFamily: 'monospace',
                fontSize: '0.85em'
              }}
            >
              {part.slice(3, -3)}
            </code>
          );
        }

        return part;
      });
    };

    return (
      <>
        {quotePart && (
          <div
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.05)',
              borderLeft: '4px solid #10b981',
              borderRadius: '4px',
              padding: '4px 8px',
              marginBottom: '6px',
              fontSize: '0.8rem',
              userSelect: 'none'
            }}
          >
            <div style={{ fontWeight: 'bold', color: '#047857', fontSize: '0.75rem' }}>
              {quotePart.author}
            </div>
            <div style={{ color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {quotePart.text}
            </div>
          </div>
        )}
        {formatTokens(remainingText)}
      </>
    );
  };


  const parseMediaMsg = (body: string) => {
    if (!body) return { isMedia: false, type: "", caption: "", filename: "", base64Data: "", isPdf: false };

    let raw = body.trim();
    let type = "";
    let rest = "";
    let isMedia = false;
    let filename = "";

    // 1. Check for standard tags: 📎 [Tipo: filename], 📷 [Tipo], 🖼️ [Tipo], 📄 [Tipo], etc.
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

    // 2. Extract embedded base64 data (if any)
    let base64Data: string | undefined = undefined;
    let cleanCaption = rest;

    const textToCheck = rest || raw;
    const dataUriMatch = textToCheck.match(/data:([a-zA-Z0-9/+-]+);base64,([A-Za-z0-9+/=]{40,})/);
    if (dataUriMatch) {
      isMedia = true;
      const mime = dataUriMatch[1];
      if (!type) {
        type = mime.includes('pdf') ? 'Documento' : mime.startsWith('image/') ? 'Imagen' : mime.startsWith('video/') ? 'Video' : mime.startsWith('audio/') ? 'Audio' : 'Archivo';
      }
      base64Data = dataUriMatch[2];
      cleanCaption = cleanCaption.replace(dataUriMatch[0], '').trim();
    } else {
      const b64Match = textToCheck.match(/(JVBERi0[A-Za-z0-9+/=]{40,}|\/9j\/[A-Za-z0-9+/=]{40,}|iVBORw0KGgo[A-Za-z0-9+/=]{40,}|[A-Za-z0-9+/]{100,}={0,2})/);
      if (b64Match) {
        isMedia = true;
        const b64 = b64Match[1];
        if (!type) {
          if (b64.startsWith('JVBERi0')) type = 'Documento';
          else if (b64.startsWith('/9j/') || b64.startsWith('iVBORw')) type = 'Imagen';
          else type = 'Archivo';
        }
        base64Data = b64;
        cleanCaption = cleanCaption.replace(b64Match[0], '').trim();
      }
    }

    if (cleanCaption.startsWith(':')) cleanCaption = cleanCaption.substring(1).trim();

    // If rest text looks like a filename (e.g. "cotizacion.pdf") and filename was empty
    if (!filename && cleanCaption && /^[a-zA-Z0-9_\-\s()]+\.[a-zA-Z0-9]{2,5}$/.test(cleanCaption)) {
      filename = cleanCaption;
      cleanCaption = "";
    }

    if (cleanCaption === filename) cleanCaption = "";

    const isPdf = (type && type.toLowerCase() === 'documento') || (filename && filename.toLowerCase().endsWith('.pdf')) || (base64Data ? base64Data.startsWith('JVBERi0') : false);

    if (isMedia) {
      if (!filename) {
        filename = isPdf ? 'documento.pdf' : (type === 'Imagen' ? 'imagen.jpg' : 'archivo');
      }
      return {
        isMedia: true,
        type: type || (isPdf ? "Documento" : "Archivo"),
        caption: cleanCaption,
        filename,
        base64Data,
        isPdf
      };
    }

    return { isMedia: false, type: "", caption: "", filename: "", base64Data: "", isPdf: false };
  };

  const formatChatDisplayBody = (body: string) => {
    if (!body) return '';
    if (body.startsWith('[Mensaje tipo:')) {
      if (body.includes('e2e_notification')) {
        return '🔒 Los mensajes y llamadas están cifrados de extremo a extremo. Nadie fuera de este chat puede leerlos ni escucharlos.';
      }
      if (body.includes('notification_template') || body.includes('ciphertext') || body.includes('biz_content')) {
        return '🔒 Los mensajes en este chat están protegidos con cifrado de extremo a extremo.';
      }
      if (body.includes('call_log')) return '📞 [Llamada de WhatsApp]';
      if (body.includes('interactive') || body.includes('template')) return '📋 [Mensaje interactivo de WhatsApp]';
      if (body.includes('album')) return '📎 [Álbum de fotos/videos]';
      if (body.includes('video')) return '📎 [Video]';
      if (body.includes('ptt') || body.includes('audio')) return '📎 [Nota de voz]';
      if (body.includes('pinned')) return '📌 [Mensaje fijado]';
      return '💬 [Mensaje de WhatsApp]';
    }
    return body;
  };

  const isSystemNotice = (body: string) => {
    if (!body) return false;
    const clean = body.trim();
    return (
      clean.startsWith('🔒') ||
      clean.startsWith('ℹ️') ||
      clean.startsWith('🚫 [Mensaje eliminado') ||
      clean.startsWith('[Mensaje tipo:')
    );
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

  // Helper to trigger direct file download from base64
  const triggerBrowserDownload = (base64Data: string, filename: string, mimetype: string) => {
    let cleanB64 = base64Data;
    if (cleanB64.includes(';base64,')) {
      cleanB64 = cleanB64.split(';base64,')[1];
    }
    const byteCharacters = atob(cleanB64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimetype });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = ensureExtension(filename || 'archivo', mimetype);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // Handler to view media (opens PDF in viewer/modal or image in lightbox)
  const handleViewMedia = async (messageId: string, filename: string, directBase64?: string, directMime?: string) => {
    if (!messageId && !directBase64) return;

    const isPdfFile = filename.toLowerCase().endsWith('.pdf') || directMime?.includes('pdf');

    const openBlobPreview = (data: string, mimetype: string, fname: string) => {
      try {
        let cleanB64 = data;
        if (cleanB64.includes(';base64,')) {
          cleanB64 = cleanB64.split(';base64,')[1];
        }
        const byteCharacters = atob(cleanB64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: mimetype });
        const url = window.URL.createObjectURL(blob);
        
        if (mimetype.startsWith('image/')) {
          setPreviewModalImage(url);
        } else if (mimetype.includes('pdf') || fname.toLowerCase().endsWith('.pdf')) {
          setPreviewModalPdf({ url, filename: fname, rawData: cleanB64 });
        } else {
          window.open(url, '_blank');
        }
      } catch (err) {
        console.error("Error opening media blob:", err);
      }
    };

    // 1. If already downloaded in memory
    if (messageId && downloadedMedia[messageId]?.data) {
      const media = downloadedMedia[messageId];
      openBlobPreview(media.data, media.mimetype || directMime || (isPdfFile ? 'application/pdf' : 'application/octet-stream'), media.filename || filename);
      return;
    }

    // 2. Fetch from server
    if (messageId) {
      if (loadingMedia[messageId]) return;
      setLoadingMedia(prev => ({ ...prev, [messageId]: true }));
      try {
        const response = await fetch(`/api/whatsapp/media/${encodeURIComponent(messageId)}?t=${Date.now()}`);
        if (!response.ok) {
          const errJson = await response.json().catch(() => null);
          throw new Error(errJson?.error || "Failed to download media");
        }
        const media = await response.json();
        if (media.error) throw new Error(media.error);

        const mime = media.mimetype || directMime || (isPdfFile ? 'application/pdf' : 'application/octet-stream');
        const fname = ensureExtension(media.filename || filename || 'archivo', mime);

        const fileToSave = {
          data: media.data,
          mimetype: mime,
          filename: fname
        };

        setDownloadedMedia(prev => ({
          ...prev,
          [messageId]: fileToSave
        }));

        openBlobPreview(fileToSave.data, fileToSave.mimetype, fileToSave.filename);
        return;
      } catch (error: any) {
        console.warn("Could not download media from server:", error);
      } finally {
        setLoadingMedia(prev => ({ ...prev, [messageId]: false }));
      }
    }

    // 3. Fallback: if we have directBase64
    if (directBase64) {
      const mime = directMime || (isPdfFile ? 'application/pdf' : 'image/jpeg');
      openBlobPreview(directBase64, mime, filename);
    }
  };

  const handleDownloadMedia = async (messageId: string, filename: string, directBase64?: string, directMime?: string) => {
    if (!messageId && !directBase64) return;

    const isPdfFile = filename.toLowerCase().endsWith('.pdf') || directMime?.includes('pdf');
    const defaultMime = isPdfFile ? 'application/pdf' : 'image/jpeg';

    // 1. If already downloaded in high resolution (in downloadedMedia), download instantly
    if (messageId && downloadedMedia[messageId]?.data) {
      const media = downloadedMedia[messageId];
      try {
        triggerBrowserDownload(media.data, media.filename || filename, media.mimetype || defaultMime);
        return;
      } catch (err: any) {
        console.error("Local download failed:", err);
      }
    }

    // 2. Fetch full high-resolution original media from server
    if (messageId) {
      if (loadingMedia[messageId]) return;
      setLoadingMedia(prev => ({ ...prev, [messageId]: true }));
      try {
        const response = await fetch(`/api/whatsapp/media/${encodeURIComponent(messageId)}?t=${Date.now()}`);
        if (!response.ok) {
          const errJson = await response.json().catch(() => null);
          throw new Error(errJson?.error || "Failed to download media");
        }
        const media = await response.json();
        if (media.error) {
          throw new Error(media.error);
        }
        
        const mime = media.mimetype || directMime || defaultMime;
        const fileToSave = {
          data: media.data,
          mimetype: mime,
          filename: ensureExtension(media.filename || filename || 'archivo', mime)
        };

        setDownloadedMedia(prev => ({
          ...prev,
          [messageId]: fileToSave
        }));

        triggerBrowserDownload(fileToSave.data, fileToSave.filename, fileToSave.mimetype);
        return;
      } catch (error: any) {
        console.warn("Could not download high-res from server, checking fallback:", error);
      } finally {
        setLoadingMedia(prev => ({ ...prev, [messageId]: false }));
      }
    }

    // 3. Fallback: If server fetch failed and we have directBase64 (thumbnail), save thumbnail as fallback
    if (directBase64) {
      try {
        const mime = directMime || defaultMime;
        triggerBrowserDownload(directBase64, filename, mime);
      } catch (e) {}
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

  // Dynamic States for Tenant Info and Customizations
  const [tenantName, setTenantName] = useState("Mi Empresa");
  const [branchName, setBranchName] = useState("");
  const [branchLocation, setBranchLocation] = useState("");
  const [locations, setLocations] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [presets, setPresets] = useState<any[]>([]);
  const [isCreatingPreset, setIsCreatingPreset] = useState(false);
  const [newPresetTitle, setNewPresetTitle] = useState("");
  const [newPresetText, setNewPresetText] = useState("");

  // Load tenant customizations and presets on mount
  useEffect(() => {
    const fetchStatusAndData = async () => {
      try {
        const res = await fetch(`/api/whatsapp/status?t=${Date.now()}`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setWhatsappStatus(data.session?.status || "DISCONNECTED");
          const resolvedTenantName = data.tenantName || "Mi Empresa";
          const resolvedBranchName = data.branchName || "";
          const resolvedBranchLocation = data.branchLocation || "";
          
          setTenantName(resolvedTenantName);
          setBranchName(resolvedBranchName);
          setBranchLocation(resolvedBranchLocation);

          const isOfficeCity = resolvedTenantName.toUpperCase().includes("OFFICE CITY") || resolvedTenantName.toUpperCase().includes("CANMA");

          // Set dynamic locations
          let loadedLocations = [];
          if (isOfficeCity) {
            loadedLocations = [
              { name: "Corporativo Matriz (Guadalajara)", coords: "20.6766,-103.3475", desc: "Av. de las Américas 1500, Country Club, GDL" },
              { name: "Sucursal Querétaro PIQ", coords: "20.7302,-103.3855", desc: "Parque Industrial Querétaro, Qro." },
              { name: "Sucursal Querétaro Centro", coords: "20.5888,-100.3899", desc: "Av. Zaragoza 120, Centro Histórico, Qro." },
              { name: "Sucursal Querétaro Norte (Juriquilla)", coords: "20.6908,-100.4439", desc: "Plaza Urban Juriquilla, Qro." }
            ];
          } else {
            loadedLocations = [
              {
                name: resolvedBranchName || resolvedTenantName || "Sucursal Matriz",
                coords: "20.5888,-100.3899",
                desc: resolvedBranchLocation || "Dirección de Sucursal"
              }
            ];
          }
          setLocations(loadedLocations);

          // Set dynamic contacts
          let loadedContacts = [];
          if (isOfficeCity) {
            loadedContacts = [
              { label: "Asesor José Samuel Subero", name: "José Samuel Subero Sánchez", phone: "5213344556677", email: "samuelsubero@canma.com", title: "Ejecutivo de Ventas B2B" },
              { label: "Office City Ventas Corporativas", name: "Oficina de Ventas Canma", phone: "5215580004321", email: "pelayof@tdq.com.mx", title: "Corporativo Central" },
              { label: "Soporte Técnico Canma", name: "Soporte Técnico Canma", phone: "5218009876543", email: "contacto@canma.com", title: "Mesa de Ayuda" }
            ];
          } else {
            loadedContacts = [
              {
                label: `Ventas ${resolvedTenantName}`,
                name: `Atención a Clientes`,
                phone: data.session?.phone || "",
                email: `contacto@${resolvedTenantName.toLowerCase().replace(/\s+/g, '')}.com`,
                title: "Ejecutivo de Ventas"
              }
            ];
          }
          setContacts(loadedContacts);

          // Load Presets: check localStorage with tenant-specific namespace to avoid visual leak
          const customKey = `custom_presets_${resolvedTenantName.toLowerCase().replace(/\s+/g, '_')}`;
          const savedPresets = localStorage.getItem(customKey);
          if (savedPresets) {
            try {
              setPresets(JSON.parse(savedPresets));
            } catch (err) {
              console.error("Error parsing custom presets from localStorage", err);
            }
          } else {
            // Default presets based on tenant
            if (isOfficeCity) {
              setPresets([
                { title: "👋 Saludo Inicial", text: "¡Hola! Bienvenido a Office City. ¿En qué podemos ayudarle el día de hoy con sus insumos de oficina?" },
                { title: "📄 Envío de Cotización", text: "Con mucho gusto. Le comparto la cotización solicitada adjunta en este chat. Quedo muy al pendiente de sus comentarios." },
                { title: "📍 Ubicación y Horario", text: "Nuestra sucursal se encuentra ubicada en: Zona Industrial PIQ, Querétaro. Horario de atención: Lunes a Viernes de 9 AM a 6 PM." },
                { title: "📦 Catálogo Completo", text: "Estimado cliente, le comparto nuestro catálogo virtual de papelería, mobiliario y tecnología para oficinas: https://canma.com/catalogo" }
              ]);
            } else {
              setPresets([
                { title: "👋 Saludo Inicial", text: `¡Hola! Bienvenido a ${resolvedTenantName}. ¿En qué podemos ayudarle el día de hoy?` },
                { title: "📄 Envío de Cotización", text: "Con mucho gusto. Le comparto la cotización solicitada adjunta en este chat. Quedo muy al pendiente de sus comentarios." },
                { title: "📍 Ubicación y Horario", text: `Nuestra sucursal se encuentra ubicada en: ${resolvedBranchLocation || "Dirección de Sucursal"}. Horario de atención: Lunes a Viernes de 9 AM a 6 PM.` },
                { title: "📦 Información de Servicios", text: `Estimado cliente, con mucho gusto le compartimos más detalles sobre nuestros productos y servicios de ${resolvedTenantName}.` }
              ]);
            }
          }
        }
      } catch (err) {
        console.error("Error fetching status and data in chat interface mount:", err);
      }
    };
    fetchStatusAndData();
  }, []);

  const handleShareLocation = async (loc: any) => {
    const mapsLink = `https://maps.google.com/?q=${loc.coords}`;
    const text = `📍 *Ubicación Compartida: ${loc.name}*\n🗺️ Dirección: ${loc.desc}\n🌐 Ver en Google Maps: ${mapsLink}\n\n¡Le esperamos para atenderle con gusto!`;
    await sendMessage(undefined, text);
    setShowLocationPicker(false);
  };

  const handleShareContact = async (contact: any) => {
    const text = `👤 *Tarjeta de Contacto de Asesor*\n🏢 *Empresa:* ${tenantName}\n👤 *Nombre:* ${contact.name}\n💼 *Puesto:* ${contact.title}\n📞 *WhatsApp:* +${contact.phone}\n✉️ *Correo:* ${contact.email}\n\n¡Guarda nuestro contacto para comunicarse más rápido!`;
    await sendMessage(undefined, text);
    setShowContactPicker(false);
  };

  // Emojis Picker List
  const emojis = ['😊', '😂', '👍', '❤️', '🙌', '🙏', '🎉', '🔥', '🤔', '💡', '📞', '💼', '🏢', '✨', '🤝', '✅'];

  const handleSavePreset = (title: string, text: string) => {
    if (!title.trim() || !text.trim()) return;
    const updated = [...presets, { title: title.trim(), text: text.trim() }];
    setPresets(updated);
    const customKey = `custom_presets_${tenantName.toLowerCase().replace(/\s+/g, '_')}`;
    localStorage.setItem(customKey, JSON.stringify(updated));
    setIsCreatingPreset(false);
    setNewPresetTitle("");
    setNewPresetText("");
  };

  const handleDeletePreset = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent clicking preset to insert text
    const updated = presets.filter((_, i) => i !== idx);
    setPresets(updated);
    const customKey = `custom_presets_${tenantName.toLowerCase().replace(/\s+/g, '_')}`;
    localStorage.setItem(customKey, JSON.stringify(updated));
  };

  const deduplicateMessages = (msgList: any[]) => {
    const seenIds = new Set<string>();
    const seenMessageIds = new Set<string>();
    const seenBodyTime = new Map<string, number>();
    const result: any[] = [];

    for (const m of msgList) {
      if (!m) continue;
      const dbId = m.id ? String(m.id) : '';
      const waId = m.messageId ? String(m.messageId) : '';

      if (dbId && seenIds.has(dbId)) continue;
      if (waId && seenMessageIds.has(waId)) continue;

      // Filter duplicate identical outgoing messages sent within 6 seconds of each other
      if (m.isFromMe && m.body) {
        const timeVal = m.timestamp ? new Date(m.timestamp).getTime() : Date.now();
        const prevTime = seenBodyTime.get(m.body);
        if (prevTime !== undefined && Math.abs(timeVal - prevTime) < 6000) {
          continue;
        }
        seenBodyTime.set(m.body, timeVal);
      }

      if (dbId) seenIds.add(dbId);
      if (waId) seenMessageIds.add(waId);

      result.push(m);
    }
    return result;
  };

  // Sync with parent prospect messages updates
  useEffect(() => {
    if (prospect.messages) {
      const optimisticMsgs = messages.filter((m: any) => m.id?.toString().startsWith('temp-'));
      if (optimisticMsgs.length > 0) {
        const filteredOptimistic = optimisticMsgs.filter((om: any) => 
          !prospect.messages.some((nm: any) => nm.body === om.body && nm.isFromMe)
        );
        setMessages(deduplicateMessages([...prospect.messages, ...filteredOptimistic]));
      } else {
        setMessages(deduplicateMessages(prospect.messages));
      }
    }
  }, [prospect.messages]);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Dynamic polling interval: poll faster (1.2 seconds) if there are pending messages (messageId is null or FAILED_)
  const hasPending = messages.some((m: any) => !m.messageId || m.messageId.startsWith('FAILED_') || m.status === 0);
  const pollInterval = hasPending ? 1200 : 4000;

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
                setMessages(deduplicateMessages([...data.messages, ...filteredOptimistic]));
              } else {
                setMessages(deduplicateMessages(data.messages));
              }
            }
          }
        }
      } catch (e) {
        console.error("Polling error", e);
      }
    }, pollInterval);

    return () => clearInterval(interval);
  }, [prospect.id, messages, pollInterval]);

  // Polling for WhatsApp connection status
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/whatsapp/status?t=${Date.now()}`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setWhatsappStatus(data.session?.status || "DISCONNECTED");
        }
      } catch (err) {
        console.error("Error fetching WhatsApp status in polling:", err);
      }
    };
    const interval = setInterval(checkStatus, 8000);
    return () => clearInterval(interval);
  }, []);

  // Keep focus on the text input whenever sending completes or the component updates
  useEffect(() => {
    if (!isSending) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isSending]);

  // Escape key handler for modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (previewModalImage) setPreviewModalImage(null);
        if (previewModalPdf) setPreviewModalPdf(null);
        if (mediaModal) setMediaModal(null);
        if (activeReactionMenuMsgId) setActiveReactionMenuMsgId(null);
        if (showEmojiPicker) setShowEmojiPicker(false);
        if (showPresets) setShowPresets(false);
        if (showLocationPicker) setShowLocationPicker(false);
        if (showContactPicker) setShowContactPicker(false);
        if (showAIOptions) setShowAIOptions(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewModalImage, previewModalPdf, mediaModal, activeReactionMenuMsgId, showEmojiPicker, showPresets, showLocationPicker, showContactPicker, showAIOptions]);

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf("image") !== -1) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = () => {
            setMediaModal({
              name: file.name || `captura_${Date.now()}.png`,
              type: file.type || 'image/png',
              base64: reader.result as string,
              caption: inputText.trim(),
              size: file.size
            });
            setInputText("");
          };
          reader.readAsDataURL(file);
          return;
        }
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();
    reader.onload = () => {
      setMediaModal({
        name: file.name,
        type: file.type || 'application/octet-stream',
        base64: reader.result as string,
        caption: inputText.trim(),
        size: file.size
      });
      setInputText("");
    };
    reader.readAsDataURL(file);
  };

  const sendMessage = async (e?: React.FormEvent, customText?: string, explicitMedia?: { name: string; type: string; base64: string }) => {
    if (e) e.preventDefault();
    if (isSendingRef.current || isSending) return;
    
    const fileToSend = explicitMedia || attachment;
    const messageText = customText !== undefined ? customText : inputText;

    let quotePrefix = "";
    if (replyingTo) {
      quotePrefix = `> [Cita: ${replyingTo.sender}: ${replyingTo.body.replace(/\n/g, ' ').substring(0, 80)}]\n\n`;
      setReplyingTo(null);
    }
    
    let bodyText = messageText;
    if (fileToSend) {
      const isPdf = fileToSend.type.includes('pdf') || fileToSend.name.toLowerCase().endsWith('.pdf');
      const mediaTag = isPdf ? `📎 [Documento: ${fileToSend.name}]` : fileToSend.type.startsWith('image/') ? '📎 [Imagen]' : `📎 [Archivo: ${fileToSend.name}]`;
      bodyText = mediaTag + (messageText.trim() ? ": " + messageText.trim() : "");
    }

    if (quotePrefix) {
      bodyText = quotePrefix + bodyText;
    }

    if (!bodyText.trim() && !fileToSend) return;

    isSendingRef.current = true;
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
    if (fileToSend) {
      setDownloadedMedia(prev => ({
        ...prev,
        [tempMsgId]: {
          data: fileToSend.base64.split(';base64,')[1] || fileToSend.base64,
          mimetype: fileToSend.type,
          filename: fileToSend.name
        }
      }));
    }

    if (customText === undefined) setInputText("");
    setAttachment(null); // Clear attachment preview
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);

    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: prospect.phone,
          message: (quotePrefix ? quotePrefix : '') + (messageText || ''),
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
        if (data.messageId) {
          if (fileToSend) {
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
          // Update the optimistic message's ID to the real database ID
          setMessages(prev => prev.map(m => m.id === tempMsgId ? { ...m, id: data.messageId } : m));
        }
      } else {
        alert("Error al enviar mensaje. Verifica que el microservicio de WhatsApp esté conectado.");
        setMessages(prev => prev.filter(m => m.id !== tempMsgId));
      }
    } catch (e) {
      alert("Error de conexión con el microservicio.");
      setMessages(prev => prev.filter(m => m.id !== tempMsgId));
    } finally {
      isSendingRef.current = false;
      setIsSending(false);
      // Staggered refocus intervals to survive DOM swapping during router.refresh()
      const focusIntervals = [50, 150, 300, 500];
      focusIntervals.forEach(delay => {
        setTimeout(() => {
          inputRef.current?.focus();
        }, delay);
      });
    }
  };

  const handleSendMediaModal = async () => {
    if (!mediaModal) return;
    const file = {
      name: mediaModal.name,
      type: mediaModal.type,
      base64: mediaModal.base64
    };
    const caption = mediaModal.caption;
    setMediaModal(null);
    await sendMessage(undefined, caption, file);
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

  // File Upload Handler (Abre MediaModal de previsualización)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setMediaModal({
        name: file.name,
        type: file.type || 'application/octet-stream',
        base64: reader.result as string,
        caption: inputText.trim(),
        size: file.size
      });
      setInputText("");
      e.target.value = "";
    };
    reader.readAsDataURL(file);
  };

  // Smart Premium AI Rewriter Handler
  const handleAIRewrite = (style: 'formal' | 'friendly' | 'sales') => {
    setIsGeneratingAI(true);
    setShowAIOptions(false);

    // Dynamic professional Spanish rephrasing tailored to active tenant
    setTimeout(() => {
      let result = "";
      const baseText = inputText.trim();
      const isOfficeCity = tenantName.toUpperCase().includes("OFFICE CITY") || tenantName.toUpperCase().includes("CANMA");

      if (style === 'formal') {
        if (!baseText) {
          result = isOfficeCity 
            ? "Estimado cliente, es un placer saludarle. Nos ponemos a sus órdenes para asistirle en todo lo referente a mobiliario, consumibles y equipamiento para su oficina. ¿Cómo podríamos apoyarle en esta ocasión?"
            : `Estimado cliente, es un placer saludarle. Nos ponemos a sus órdenes en ${tenantName} para asistirle en lo que requiera. ¿Cómo podríamos apoyarle en esta ocasión?`;
        } else {
          result = `Estimado cliente, con mucho gusto le doy seguimiento a su atenta solicitud. En respuesta a su mensaje: "${baseText}", nos encontramos coordinando los detalles correspondientes para brindarle una respuesta formal a la brevedad. Quedamos a su entera disposición.`;
        }
      } else if (style === 'friendly') {
        if (!baseText) {
          result = `¡Hola! Qué gusto saludarte. Bienvenidos a ${tenantName}. 😊 Cuéntanos, ¿qué estás buscando hoy? Con mucho gusto te ayudamos a encontrar la mejor opción.`;
        } else {
          result = `¡Hola! Claro que sí, con mucho gusto te apoyo. 😊 Respecto a lo que me comentas: "${baseText}", ya lo estamos revisando para darte una respuesta súper rápida. ¡Excelente día!`;
        }
      } else if (style === 'sales') {
        if (!baseText) {
          result = isOfficeCity
            ? "¡Hola! Aprovecha que esta semana tenemos promociones exclusivas en toda nuestra línea de papelería y mobiliario de oficina, ¡con entrega inmediata en tu sucursal más cercana! ¿Te gustaría que te coticemos algún producto en especial?"
            : `¡Hola! Aprovecha que esta semana tenemos promociones y ofertas exclusivas en todos nuestros servicios y productos en ${tenantName}. ¿Te gustaría que te coticemos algo en especial?`;
        } else {
          result = `¡Excelente elección! Comentándote que lo que mencionas ("${baseText}") es de lo más cotizado por su alta calidad y durabilidad. ¡Tenemos stock disponible con envío rápido y precio especial hoy mismo! ¿Te preparo la cotización?`;
        }
      }

      setInputText(result);
      setIsGeneratingAI(false);
    }, 1200); // 1.2s realistic loading micro-animation
  };

  return (
    <div 
      onPaste={handlePaste}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}
    >
      {/* Overlay Drag & Drop */}
      {isDragging && (
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(240, 253, 244, 0.92)',
          border: '3px dashed #16a34a',
          zIndex: 60,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#166534',
          pointerEvents: 'none'
        }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '0.5rem' }}>📷</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 'bold' }}>Suelta la imagen o archivo aquí</div>
          <div style={{ fontSize: '0.875rem', color: '#15803d', marginTop: '0.25rem' }}>Podrás previsualizarla y escribir un pie de foto antes de enviar</div>
        </div>
      )}

      {/* Mensajes Area */}
      <div style={{ flex: 1, padding: '1.25rem 1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', backgroundRepeat: 'repeat', backgroundColor: '#e5e7eb', backgroundBlendMode: 'overlay' }}>
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: '12px', alignSelf: 'center', color: '#64748b', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💬</div>
            <div style={{ fontWeight: '600' }}>No hay mensajes aún en esta conversación.</div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.25rem' }}>Escribe o pega una imagen con Ctrl+V para comenzar</div>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const displayBody = formatChatDisplayBody(msg.body || '');
            const currentDateStr = new Date(msg.timestamp).toDateString();
            const prevDateStr = idx > 0 ? new Date(messages[idx - 1].timestamp).toDateString() : null;
            const showDateChip = currentDateStr !== prevDateStr;

            if (isSystemNotice(msg.body || '')) {
              return (
                <div key={msg.id || idx} style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                  {showDateChip && (
                    <div style={{ alignSelf: 'center', margin: '0.5rem 0', zIndex: 1 }}>
                      <span style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.94)',
                        color: '#475569',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        padding: '0.25rem 0.75rem',
                        borderRadius: '16px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                        border: '1px solid #e2e8f0',
                        textTransform: 'capitalize'
                      }}>
                        {getDateChipLabel(msg.timestamp)}
                      </span>
                    </div>
                  )}
                  <div 
                    style={{
                      alignSelf: 'center',
                      backgroundColor: '#fef9c3',
                      border: '1px solid #fef08a',
                      padding: '0.45rem 0.9rem',
                      borderRadius: '8px',
                      maxWidth: '85%',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                      textAlign: 'center',
                      fontSize: '0.78rem',
                      color: '#854d0e',
                      margin: '0.25rem 0',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.2rem'
                    }}
                  >
                    <span style={{ fontWeight: 500, lineHeight: 1.4 }}>{displayBody}</span>
                    <span style={{ fontSize: '0.65rem', color: '#a16207' }}>
                      {new Date(msg.timestamp).toLocaleString([], { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            }

            const mediaInfo = parseMediaMsg(displayBody);
            const isDownloaded = !!downloadedMedia[msg.messageId || msg.id];
            const isLoading = !!loadingMedia[msg.messageId || msg.id];
            const mediaData = downloadedMedia[msg.messageId || msg.id];

            const directBase64 = mediaInfo.base64Data || (mediaData ? mediaData.data : undefined);
            const isImage = mediaInfo.type === "Imagen" || (mediaData && mediaData.mimetype.startsWith('image/')) || !!mediaInfo.base64Data;
            const imgSrc = mediaData ? `data:${mediaData.mimetype};base64,${mediaData.data}` : (mediaInfo.base64Data ? (mediaInfo.base64Data.startsWith('data:') ? mediaInfo.base64Data : `data:image/jpeg;base64,${mediaInfo.base64Data}`) : null);
            const isPdf = mediaInfo.isPdf || mediaInfo.type === "Documento" || mediaInfo.filename.toLowerCase().endsWith('.pdf') || (mediaData && mediaData.mimetype === 'application/pdf');
            const isOnlyImage = isImage && !mediaInfo.caption;

            return (
              <div key={msg.id || idx} style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                {showDateChip && (
                  <div style={{ alignSelf: 'center', margin: '0.65rem 0', zIndex: 1 }}>
                    <span style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.94)',
                      color: '#475569',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      padding: '0.25rem 0.75rem',
                      borderRadius: '16px',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                      border: '1px solid #e2e8f0',
                      textTransform: 'capitalize'
                    }}>
                      {getDateChipLabel(msg.timestamp)}
                    </span>
                  </div>
                )}

                <div 
                  id={`msg-${msg.id}`}
                  onMouseEnter={() => setHoveredMsgId(msg.id)}
                  onMouseLeave={() => {
                    setHoveredMsgId(null);
                    if (activeReactionMenuMsgId === msg.id) {
                      // leave reaction menu open until clicked outside or selected
                    }
                  }}
                  style={{
                    alignSelf: msg.isFromMe ? 'flex-end' : 'flex-start',
                    backgroundColor: msg.isFromMe ? '#d9fdd3' : '#ffffff',
                    padding: isOnlyImage ? '3px' : '0.55rem 0.85rem',
                    borderRadius: '8px',
                    borderTopRightRadius: msg.isFromMe ? '0' : '8px',
                    borderTopLeftRadius: !msg.isFromMe ? '0' : '8px',
                    maxWidth: isImage ? '340px' : '75%',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                    position: 'relative',
                    marginBottom: (reactions[msg.id] && reactions[msg.id].length > 0) ? '0.6rem' : '0.15rem'
                  }}
                >
                  {/* Hover Actions Toolbar */}
                  {hoveredMsgId === msg.id && (
                    <div style={{
                      position: 'absolute',
                      top: '-16px',
                      right: msg.isFromMe ? '8px' : 'auto',
                      left: msg.isFromMe ? 'auto' : '8px',
                      backgroundColor: '#ffffff',
                      borderRadius: '16px',
                      padding: '2px 6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                      border: '1px solid #e2e8f0',
                      zIndex: 10
                    }}>
                      <button
                        type="button"
                        title="Reaccionar con emoji"
                        onClick={() => setActiveReactionMenuMsgId(activeReactionMenuMsgId === msg.id ? null : msg.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', padding: '2px 4px', borderRadius: '4px' }}
                      >
                        😀
                      </button>
                      <button
                        type="button"
                        title="Responder / Citar mensaje"
                        onClick={() => {
                          const quoteContent = mediaInfo.isMedia 
                            ? (isImage ? '📷 Foto' : `📄 ${mediaInfo.filename || 'Archivo'}`) 
                            : displayBody;
                          setReplyingTo({
                            id: msg.id,
                            messageId: msg.messageId,
                            body: quoteContent,
                            sender: msg.isFromMe ? 'Tú' : (prospect.name || 'Cliente'),
                            isFromMe: msg.isFromMe
                          });
                          inputRef.current?.focus();
                        }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', padding: '2px 4px', borderRadius: '4px' }}
                      >
                        ↩️
                      </button>
                      <button
                        type="button"
                        title={copiedMsgId === msg.id ? "¡Copiado!" : "Copiar texto"}
                        onClick={() => handleCopyMessage(msg.id, displayBody)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', padding: '2px 4px', borderRadius: '4px', color: copiedMsgId === msg.id ? '#16a34a' : '#475569' }}
                      >
                        {copiedMsgId === msg.id ? '✓' : '📋'}
                      </button>
                    </div>
                  )}

                  {/* Quick Reactions Menu Popup */}
                  {activeReactionMenuMsgId === msg.id && (
                    <div style={{
                      position: 'absolute',
                      top: '-44px',
                      right: msg.isFromMe ? '8px' : 'auto',
                      left: msg.isFromMe ? 'auto' : '8px',
                      backgroundColor: '#ffffff',
                      borderRadius: '24px',
                      padding: '4px 8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
                      border: '1px solid #cbd5e1',
                      zIndex: 25
                    }}>
                      {['👍', '❤️', '😂', '😮', '😢', '🙏'].map(emoji => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => toggleReaction(msg.id, emoji)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '1.2rem',
                            padding: '2px',
                            borderRadius: '50%',
                            transition: 'transform 0.15s'
                          }}
                          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.25)'}
                          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Message Content */}
                  <div style={{ fontSize: '0.92rem', color: '#1e293b', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                    {displayBody && displayBody.includes("📍 *Ubicación Compartida") ? (
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
                          backgroundImage: `url("https://maps.googleapis.com/maps/api/staticmap?center=${getCoordsFromMessage(displayBody)}&zoom=14&size=280x100&sensor=false&markers=color:red%7C${getCoordsFromMessage(displayBody)}")`,
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
                          🗺️ Vista de Mapa {tenantName}
                        </div>
                        <div style={{ padding: '0.65rem', fontSize: '0.825rem', color: '#334155' }}>
                          {displayBody}
                        </div>
                      </div>
                    ) : displayBody && displayBody.includes("👤 *Tarjeta de Contacto") ? (
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
                          {displayBody}
                        </div>
                      </div>
                    ) : mediaInfo.isMedia ? (
                      <div>
                        {/* Native WhatsApp Image Display */}
                        {isImage && (imgSrc || directBase64) ? (
                          <div style={{ position: 'relative', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#0f172a' }}>
                            <img 
                              src={imgSrc || `data:image/jpeg;base64,${directBase64}`}
                              alt={mediaInfo.filename || "Imagen"}
                              onClick={() => handleViewMedia(msg.messageId || msg.id, mediaInfo.filename || 'imagen.jpg', directBase64, 'image/jpeg')}
                              style={{
                                width: '100%',
                                maxHeight: '320px',
                                objectFit: 'cover',
                                display: 'block',
                                cursor: 'zoom-in',
                                transition: 'opacity 0.2s'
                              }}
                              title="Clic para ver en pantalla grande"
                            />
                            {/* Hover Direct Download Button in corner of Image */}
                            <button
                              type="button"
                              title="Descargar imagen a la PC"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadMedia(msg.messageId || msg.id, mediaInfo.filename || 'imagen.jpg', directBase64, 'image/jpeg');
                              }}
                              style={{
                                position: 'absolute',
                                top: '6px',
                                right: '6px',
                                backgroundColor: 'rgba(0, 0, 0, 0.65)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '50%',
                                width: '30px',
                                height: '30px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                                transition: 'background-color 0.2s'
                              }}
                              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.9)'}
                              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.65)'}
                            >
                              📥
                            </button>

                            {/* Timestamp overlay if image only (no caption) */}
                            {isOnlyImage && (
                              <div style={{
                                position: 'absolute',
                                bottom: '6px',
                                right: '6px',
                                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                                color: 'white',
                                padding: '2px 6px',
                                borderRadius: '10px',
                                fontSize: '0.65rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                backdropFilter: 'blur(2px)'
                              }}>
                                <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                {msg.isFromMe && (
                                  <span style={{ display: 'flex', color: msg.status === 3 ? '#60a5fa' : '#cbd5e1' }}>
                                    {msg.status === 0 && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
                                    {msg.status === 1 && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>}
                                    {(msg.status === 2 || msg.status === 3) && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="18 6 7 17 2 12"/><polyline points="22 6 11 17 9.5 15.5"/></svg>}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          /* Document / PDF Card */
                          <div 
                            style={{
                              border: isPdf ? '1px solid #fca5a5' : '1px solid #cbd5e1',
                              borderRadius: '8px',
                              overflow: 'hidden',
                              backgroundColor: isPdf ? '#fff8f8' : '#f8fafc',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                              marginTop: '0.2rem',
                              width: '100%',
                              minWidth: '240px',
                              maxWidth: '300px',
                              display: 'flex',
                              flexDirection: 'column'
                            }}
                          >
                            <div style={{ padding: '0.6rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                              {isPdf ? (
                                <div style={{
                                  width: '36px',
                                  height: '36px',
                                  borderRadius: '6px',
                                  backgroundColor: '#ef4444',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: 'white',
                                  fontWeight: 'bold',
                                  fontSize: '0.75rem',
                                  flexShrink: 0
                                }}>
                                  PDF
                                </div>
                              ) : (
                                <div style={{
                                  width: '36px',
                                  height: '36px',
                                  borderRadius: '6px',
                                  backgroundColor: '#3b82f6',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: 'white',
                                  fontWeight: 'bold',
                                  fontSize: '0.75rem',
                                  flexShrink: 0
                                }}>
                                  DOC
                                </div>
                              )}
                              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                <span style={{ fontSize: '0.825rem', fontWeight: 'bold', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={mediaInfo.filename}>
                                  {mediaInfo.filename || (isPdf ? 'Documento.pdf' : 'Archivo adjunto')}
                                </span>
                                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                                  {isLoading ? '⏳ Descargando de WhatsApp...' : isPdf ? 'Documento PDF' : 'Archivo adjunto'}
                                </span>
                              </div>
                            </div>

                            {/* Dual Ver & Descargar Buttons */}
                            <div style={{ display: 'flex', borderTop: '1px solid #e2e8f0', backgroundColor: '#f1f5f9' }}>
                              <button
                                type="button"
                                onClick={() => handleViewMedia(msg.messageId || msg.id, mediaInfo.filename || 'documento.pdf', directBase64, isPdf ? 'application/pdf' : undefined)}
                                disabled={isLoading}
                                style={{
                                  flex: 1,
                                  padding: '0.5rem 0.4rem',
                                  fontSize: '0.78rem',
                                  fontWeight: 'bold',
                                  color: isLoading ? '#94a3b8' : '#2563eb',
                                  textAlign: 'center',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '0.25rem',
                                  backgroundColor: 'transparent',
                                  border: 'none',
                                  borderRight: '1px solid #cbd5e1',
                                  cursor: isLoading ? 'default' : 'pointer'
                                }}
                              >
                                👁️ Ver {isPdf ? 'PDF' : 'archivo'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDownloadMedia(msg.messageId || msg.id, mediaInfo.filename || 'documento.pdf', directBase64, isPdf ? 'application/pdf' : undefined)}
                                disabled={isLoading}
                                style={{
                                  flex: 1,
                                  padding: '0.5rem 0.4rem',
                                  fontSize: '0.78rem',
                                  fontWeight: 'bold',
                                  color: isLoading ? '#94a3b8' : '#16a34a',
                                  textAlign: 'center',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '0.25rem',
                                  backgroundColor: 'transparent',
                                  border: 'none',
                                  cursor: isLoading ? 'default' : 'pointer'
                                }}
                              >
                                📥 Guardar
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Caption Text if Present */}
                        {mediaInfo.caption && (
                          <div style={{ padding: isImage ? '0.4rem 0.2rem 0.1rem 0.2rem' : '0.4rem 0', fontSize: '0.92rem', color: '#1e293b' }}>
                            {renderWhatsAppFormattedText(mediaInfo.caption)}
                          </div>
                        )}
                      </div>
                    ) : (
                      renderWhatsAppFormattedText(displayBody)
                    )}
                  </div>

                  {/* Regular Message Timestamp & Status Ticks (hidden if only image) */}
                  {!isOnlyImage && (
                    <div style={{ fontSize: '0.65rem', color: '#94a3b8', textAlign: 'right', marginTop: '0.25rem', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.25rem' }}>
                      {new Date(msg.timestamp).toLocaleString([], { hour: '2-digit', minute: '2-digit' })}
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
                  )}

                  {/* Message Reactions Badge */}
                  {reactions[msg.id] && reactions[msg.id].length > 0 && (
                    <div 
                      onClick={() => setActiveReactionMenuMsgId(activeReactionMenuMsgId === msg.id ? null : msg.id)}
                      title="Reacciones"
                      style={{
                        position: 'absolute',
                        bottom: '-10px',
                        left: msg.isFromMe ? 'auto' : '8px',
                        right: msg.isFromMe ? '8px' : 'auto',
                        backgroundColor: '#ffffff',
                        borderRadius: '12px',
                        padding: '1px 6px',
                        fontSize: '0.75rem',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px',
                        zIndex: 2,
                        cursor: 'pointer'
                      }}
                    >
                      {reactions[msg.id].map((emoji, eIdx) => (
                        <span key={eIdx}>{emoji}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
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

      {/* Input Area */}
      <div style={{ padding: '0.75rem 1rem', backgroundColor: '#ffffff', borderTop: '1px solid var(--caanma-border)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        
        {/* Reply Quote Banner */}
        {replyingTo && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.45rem 0.85rem',
            backgroundColor: '#f1f5f9',
            borderLeft: `4px solid ${replyingTo.isFromMe ? '#16a34a' : '#2563eb'}`,
            borderRadius: '8px',
            marginBottom: '0.25rem',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            animation: 'fadeIn 0.15s ease'
          }}>
            <div style={{ flex: 1, minWidth: 0, marginRight: '0.5rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: replyingTo.isFromMe ? '#166534' : '#1d4ed8' }}>
                ↩️ Respondiendo a {replyingTo.sender}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {replyingTo.body}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setReplyingTo(null)}
              title="Cancelar respuesta"
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1rem', padding: '0.2rem' }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Attachment Thumbnail if Selected via Old State */}
        {attachment && (
          <div style={{ padding: '0.5rem 1rem', backgroundColor: '#f1f5f9', borderTop: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', gap: '0.75rem', animation: 'fadeIn 0.2s ease', borderRadius: '8px' }}>
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

        {/* Barra de Acciones / Herramientas */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.15rem', alignItems: 'center' }}>
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
              padding: '0.35rem 0.85rem', 
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

        {whatsappStatus !== 'CONNECTED' && (
          <div style={{
            padding: '0.75rem 1rem',
            backgroundColor: '#fff1f2',
            border: '1px solid #fecaca',
            borderRadius: '12px',
            color: '#991b1b',
            fontSize: '0.85rem',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem',
            marginBottom: '0.25rem'
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              ⚠️ WhatsApp Desconectado en esta Sucursal. Vincula tu cuenta en el panel de configuración.
            </span>
            <button 
              type="button"
              onClick={() => router.push('/configuracion/whatsapp')}
              style={{
                padding: '0.35rem 0.85rem',
                backgroundColor: '#e11d48',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 'bold',
                fontSize: '0.75rem',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor='#be123c'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor='#e11d48'}
            >
              Vincular WhatsApp
            </button>
          </div>
        )}

        <form onSubmit={e => sendMessage(e)} style={{ display: 'flex', width: '100%', gap: '0.5rem' }}>
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder={whatsappStatus === 'CONNECTED' ? "Escribe un mensaje... (Ctrl+V para pegar imagen)" : "WhatsApp Desconectado. Vincula tu cuenta..."}
            style={{ 
              flex: 1, 
              padding: '0.75rem 1rem', 
              borderRadius: '24px', 
              border: '1px solid #cbd5e1', 
              outline: 'none', 
              backgroundColor: whatsappStatus === 'CONNECTED' ? '#f8fafc' : '#f1f5f9', 
              fontSize: '0.92rem',
              cursor: whatsappStatus === 'CONNECTED' ? 'text' : 'not-allowed'
            }}
            disabled={isGeneratingAI || whatsappStatus !== 'CONNECTED'}
          />
          <button 
            type="submit" 
            disabled={(!inputText.trim() && !attachment) || isSending || isGeneratingAI || whatsappStatus !== 'CONNECTED'}
            style={{ 
              width: '48px', height: '48px', borderRadius: '50%', 
              backgroundColor: ((inputText.trim() || attachment) && whatsappStatus === 'CONNECTED') ? '#25d366' : '#cbd5e1', 
              color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', 
              cursor: ((inputText.trim() || attachment) && whatsappStatus === 'CONNECTED') ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s ease',
              boxShadow: ((inputText.trim() || attachment) && whatsappStatus === 'CONNECTED') ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
            }}
            onMouseEnter={e => { if ((inputText.trim() || attachment) && whatsappStatus === 'CONNECTED') e.currentTarget.style.backgroundColor='#1ebe57'; }}
            onMouseLeave={e => { if ((inputText.trim() || attachment) && whatsappStatus === 'CONNECTED') e.currentTarget.style.backgroundColor='#25d366'; }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'translateX(-2px) translateY(1px)' }}>
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </form>
      </div>

      {/* Media Send Modal (Previsualización antes de enviar con pie de foto) */}
      {mediaModal && (
        <div 
          onClick={() => setMediaModal(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(11, 20, 26, 0.88)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            backdropFilter: 'blur(4px)'
          }}
        >
          <div 
            onClick={e => e.stopPropagation()}
            style={{
              backgroundColor: '#1e293b',
              borderRadius: '16px',
              width: '95%',
              maxWidth: '640px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
              overflow: 'hidden',
              border: '1px solid #334155'
            }}
          >
            {/* Modal Header */}
            <div style={{ padding: '0.75rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', backgroundColor: '#0f172a' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                <span style={{ fontSize: '1.25rem' }}>{mediaModal.type.startsWith('image/') ? '🖼️' : '📄'}</span>
                <span style={{ color: 'white', fontWeight: 'bold', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {mediaModal.name}
                </span>
                {mediaModal.size && (
                  <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                    ({(mediaModal.size / 1024).toFixed(0)} KB)
                  </span>
                )}
              </div>
              <button 
                type="button"
                onClick={() => setMediaModal(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem', padding: '0.2rem' }}
              >
                ✕
              </button>
            </div>

            {/* Modal Preview Body */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.25rem', backgroundColor: '#0b141a', minHeight: '280px', maxHeight: '55vh', overflow: 'hidden' }}>
              {mediaModal.type.startsWith('image/') ? (
                <img 
                  src={mediaModal.base64} 
                  alt="Previsualización" 
                  style={{ maxWidth: '100%', maxHeight: '50vh', objectFit: 'contain', borderRadius: '8px' }} 
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', color: '#cbd5e1' }}>
                  <span style={{ fontSize: '3.5rem' }}>📄</span>
                  <span style={{ fontWeight: 'bold', fontSize: '1rem' }}>{mediaModal.name}</span>
                </div>
              )}
            </div>

            {/* Modal Caption and Send Footer */}
            <div style={{ padding: '0.85rem 1.25rem', backgroundColor: '#1e293b', borderTop: '1px solid #334155', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <input 
                type="text"
                autoFocus
                placeholder="Añade un pie de foto... (Enter para enviar)"
                value={mediaModal.caption}
                onChange={e => setMediaModal({ ...mediaModal, caption: e.target.value })}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSendMediaModal();
                  }
                }}
                style={{
                  flex: 1,
                  padding: '0.75rem 1rem',
                  borderRadius: '24px',
                  border: '1px solid #475569',
                  backgroundColor: '#0f172a',
                  color: 'white',
                  fontSize: '0.92rem',
                  outline: 'none'
                }}
              />
              <button
                type="button"
                onClick={handleSendMediaModal}
                disabled={isSending}
                title="Enviar"
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  backgroundColor: '#25d366',
                  color: 'white',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: isSending ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.25)',
                  transition: 'background-color 0.2s',
                  flexShrink: 0
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1ebe57'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#25d366'}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'translateX(-1px) translateY(1px)' }}>
                  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full-Screen Image Lightbox Preview Modal con Zoom y Descarga Directa */}
      {previewModalImage && (
        <div 
          onClick={() => setPreviewModalImage(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(11, 20, 26, 0.95)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            backdropFilter: 'blur(6px)'
          }}
        >
          <div 
            onClick={e => e.stopPropagation()}
            style={{
              position: 'relative',
              width: '95vw',
              maxWidth: '1200px',
              height: '92vh',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#0f172a',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
              border: '1px solid #1e293b'
            }}
          >
            {/* Top Toolbar */}
            <div style={{ 
              width: '100%', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              padding: '0.75rem 1.25rem', 
              backgroundColor: '#0b141a',
              borderBottom: '1px solid #1e293b'
            }}>
              <span style={{ color: '#f8fafc', fontWeight: 'bold', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                🖼️ Vista Previa en Alta Definición
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                {/* Rotate Button */}
                <button
                  type="button"
                  title="Rotar 90°"
                  onClick={() => setRotationDeg(r => (r + 90) % 360)}
                  style={{
                    backgroundColor: '#1e293b',
                    color: '#f8fafc',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    padding: '0.35rem 0.65rem',
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                  🔄 Rotar
                </button>
                {/* Zoom Out Button */}
                <button
                  type="button"
                  title="Alejar (-)"
                  onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.25))}
                  style={{
                    backgroundColor: '#1e293b',
                    color: '#f8fafc',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    padding: '0.35rem 0.65rem',
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                  ➖
                </button>
                <span style={{ color: '#94a3b8', fontSize: '0.75rem', minWidth: '40px', textAlign: 'center' }}>
                  {Math.round(zoomLevel * 100)}%
                </span>
                {/* Zoom In Button */}
                <button
                  type="button"
                  title="Acercar (+)"
                  onClick={() => setZoomLevel(z => Math.min(3, z + 0.25))}
                  style={{
                    backgroundColor: '#1e293b',
                    color: '#f8fafc',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    padding: '0.35rem 0.65rem',
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                  ➕
                </button>
                {/* Reset Zoom Button */}
                <button
                  type="button"
                  title="Tamaño Original (100%)"
                  onClick={() => { setZoomLevel(1); setRotationDeg(0); }}
                  style={{
                    backgroundColor: '#1e293b',
                    color: '#f8fafc',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    padding: '0.35rem 0.65rem',
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                  1:1
                </button>
                {/* Prominent Direct Download Button */}
                <button
                  type="button"
                  onClick={() => {
                    handleDownloadMedia("", "imagen_whatsapp.jpg", previewModalImage, "image/jpeg");
                  }}
                  style={{
                    backgroundColor: '#16a34a',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.4rem 0.95rem',
                    fontSize: '0.825rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    boxShadow: '0 2px 4px rgba(22,163,74,0.3)',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#15803d'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = '#16a34a'}
                >
                  📥 Guardar en PC
                </button>
                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setPreviewModalImage(null)}
                  style={{
                    backgroundColor: '#334155',
                    color: '#f8fafc',
                    border: 'none',
                    borderRadius: '6px',
                    width: '32px',
                    height: '32px',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginLeft: '0.5rem'
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Image Canvas */}
            <div 
              onWheel={(e) => {
                if (e.deltaY < 0) {
                  setZoomLevel(z => Math.min(3, z + 0.15));
                } else {
                  setZoomLevel(z => Math.max(0.5, z - 0.15));
                }
              }}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'auto',
                padding: '1.5rem',
                backgroundColor: '#070b0e'
              }}
            >
              <img 
                src={previewModalImage} 
                alt="Vista previa" 
                style={{
                  maxWidth: '85vw',
                  maxHeight: '75vh',
                  objectFit: 'contain',
                  borderRadius: '8px',
                  transform: `scale(${zoomLevel}) rotate(${rotationDeg}deg)`,
                  transition: 'transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Full-Screen PDF Viewer Modal */}
      {previewModalPdf && (
        <div 
          onClick={() => setPreviewModalPdf(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            backdropFilter: 'blur(4px)'
          }}
        >
          <div 
            onClick={e => e.stopPropagation()}
            style={{
              width: '95vw',
              maxWidth: '1100px',
              height: '90vh',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#1e293b',
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}
          >
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              padding: '0.75rem 1.25rem', 
              backgroundColor: '#0f172a', 
              borderBottom: '1px solid #334155' 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
                <span style={{ fontSize: '1.25rem' }}>📄</span>
                <span style={{ color: '#f8fafc', fontWeight: 'bold', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {previewModalPdf.filename}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => {
                    handleDownloadMedia("", previewModalPdf.filename, previewModalPdf.rawData, "application/pdf");
                  }}
                  style={{
                    backgroundColor: '#16a34a',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.4rem 0.85rem',
                    fontSize: '0.8rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                >
                  📥 Guardar en PC
                </button>
                <a
                  href={previewModalPdf.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    backgroundColor: '#2563eb',
                    color: 'white',
                    borderRadius: '6px',
                    padding: '0.4rem 0.85rem',
                    fontSize: '0.8rem',
                    fontWeight: 'bold',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                >
                  ↗️ Pestaña Nueva
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewModalPdf(null)}
                  style={{
                    backgroundColor: '#334155',
                    color: '#f8fafc',
                    border: 'none',
                    borderRadius: '6px',
                    width: '32px',
                    height: '32px',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
            <div style={{ flex: 1, width: '100%', height: '100%', backgroundColor: '#525659' }}>
              <iframe 
                src={previewModalPdf.url} 
                title={previewModalPdf.filename}
                style={{ width: '100%', height: '100%', border: 'none' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
