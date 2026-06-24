'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Printer, Send, Share2, Loader2, CheckCircle, ArrowRight, Pencil } from 'lucide-react';

interface QuoteActionsProps {
  quoteId: string;
  quoteFolio?: string | null;
  status: string;
  customerPhone?: string | null;
  customerName?: string | null;
  quoteTotal: number;
}

export default function QuoteActions({ quoteId, quoteFolio, status, customerPhone, customerName, quoteTotal }: QuoteActionsProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [phone, setPhone] = useState(customerPhone || '');
  const [prospects, setProspects] = useState<any[]>([]);
  const [selectedProspectId, setSelectedProspectId] = useState<string>('');
  const [isLoadingProspects, setIsLoadingProspects] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // Generate standard prefilled message
  const getShareMessage = () => {
    const formattedTotal = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(quoteTotal);
    const link = `${window.location.origin}/ventas/detalle/${quoteId}/imprimir-cotizacion`;
    const displayFolio = quoteFolio || quoteId.slice(0, 8).toUpperCase();
    return `¡Hola ${customerName || 'Cliente'}! Le comparto la cotización solicitada de CAANMA.\n\n` +
      `*Folio:* #${displayFolio}\n` +
      `*Total:* ${formattedTotal}\n\n` +
      `Puede ver el detalle e imprimir su cotización en el siguiente enlace:\n${link}\n\n` +
      `Quedo muy al pendiente de sus comentarios. ¡Excelente día!`;
  };

  // Fetch prospects when the modal is opened
  useEffect(() => {
    if (isModalOpen) {
      setIsLoadingProspects(true);
      fetch(`/api/prospects?t=${Date.now()}`)
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error('Failed to load prospects');
        })
        .then((data) => {
          if (data.prospects) {
            setProspects(data.prospects);
            // Pre-select prospect if name or phone matches
            const matched = data.prospects.find(
              (p: any) =>
                (customerPhone && p.phone === customerPhone) ||
                (customerName && p.name?.toLowerCase().includes(customerName.toLowerCase()))
            );
            if (matched) {
              setSelectedProspectId(matched.id);
            } else if (data.prospects.length > 0) {
              setSelectedProspectId(data.prospects[0].id);
            }
          }
        })
        .catch((err) => console.error('Error fetching prospects:', err))
        .finally(() => setIsLoadingProspects(false));
    }
  }, [isModalOpen, customerPhone, customerName]);

  const handleConvert = () => {
    router.push(`/ventas/nueva?quoteId=${quoteId}`);
  };

  const handlePrint = () => {
    window.open(`/ventas/detalle/${quoteId}/imprimir-cotizacion`, '_blank');
  };

  const handleOpenWhatsAppWeb = () => {
    // Clean phone number (keep only digits)
    const cleanPhone = phone.replace(/\D/g, '');
    const finalPhone = cleanPhone.startsWith('52') ? cleanPhone : `52${cleanPhone}`;
    const text = encodeURIComponent(getShareMessage());
    window.open(`https://api.whatsapp.com/send?phone=${finalPhone}&text=${text}`, '_blank');
    setIsModalOpen(false);
  };

  const handleSendViaCaanma = async () => {
    if (!selectedProspectId) return;
    const selectedProspect = prospects.find((p) => p.id === selectedProspectId);
    if (!selectedProspect) return;

    setIsSending(true);
    setSendError(null);

    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: selectedProspect.phone,
          message: getShareMessage(),
          prospectId: selectedProspect.id,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSendSuccess(true);
        setTimeout(() => {
          setIsModalOpen(false);
          setSendSuccess(false);
        }, 1500);
      } else {
        throw new Error(data.error || 'Error al enviar mensaje');
      }
    } catch (err: any) {
      console.error(err);
      setSendError(err.message || 'Error de red o de microservicio de WhatsApp desconectado.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
      {/* Print Quote */}
      <a
        href={`/ventas/detalle/${quoteId}/imprimir-cotizacion`}
        target="_blank"
        rel="noopener noreferrer"
        title="Imprimir o Descargar PDF"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          padding: '0.4rem 0.8rem',
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '6px',
          cursor: 'pointer',
          fontWeight: '600',
          fontSize: '0.825rem',
          color: '#475569',
          textDecoration: 'none',
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#f1f5f9';
          e.currentTarget.style.borderColor = '#cbd5e1';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#f8fafc';
          e.currentTarget.style.borderColor = '#e2e8f0';
        }}
      >
        <Printer size={15} />
        Imprimir
      </a>

      {/* Share Quote WhatsApp */}
      <button
        onClick={() => setIsModalOpen(true)}
        title="Compartir por WhatsApp"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          padding: '0.4rem 0.8rem',
          backgroundColor: '#e6f4ea',
          border: '1px solid #c2e7cc',
          borderRadius: '6px',
          cursor: 'pointer',
          fontWeight: '600',
          fontSize: '0.825rem',
          color: '#137333',
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#d2e3d6';
          e.currentTarget.style.borderColor = '#99d2aa';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#e6f4ea';
          e.currentTarget.style.borderColor = '#c2e7cc';
        }}
      >
        <Share2 size={15} />
        WhatsApp
      </button>

      {/* Edit Quote Button (If Pending) */}
      {status === 'PENDING' && (
        <button
          onClick={() => router.push(`/ventas/cotizaciones/nueva?quoteId=${quoteId}`)}
          title="Editar Cotización"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.4rem 0.8rem',
            backgroundColor: '#e0f2fe',
            border: '1px solid #bae6fd',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '0.825rem',
            color: '#0369a1',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#bae6fd';
            e.currentTarget.style.borderColor = '#7dd3fc';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#e0f2fe';
            e.currentTarget.style.borderColor = '#bae6fd';
          }}
        >
          <Pencil size={15} />
          Editar
        </button>
      )}

      {/* Convert Quote to Sale (If Pending) */}
      {status === 'PENDING' && (
        <button
          onClick={handleConvert}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.4rem 0.8rem',
            backgroundColor: 'var(--caanma-primary, #6366f1)',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '0.825rem',
            color: 'white',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#4f46e5';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--caanma-primary, #6366f1)';
          }}
        >
          Convertir <ArrowRight size={14} />
        </button>
      )}

      {/* Modern Share Modal */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(8px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes scaleIn {
              from { transform: scale(0.95); opacity: 0; }
              to { transform: scale(1); opacity: 1; }
            }
          `}</style>
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '520px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              animation: 'scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid #f1f5f9',
                background: 'linear-gradient(135deg, #128c7e 0%, #075e54 100%)',
                color: 'white',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  💬 Compartir Cotización #{quoteFolio || quoteId.slice(0, 8).toUpperCase()}
                </h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', opacity: 0.9 }}>
                  Elige la forma preferida de enviarle la cotización a tu cliente.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.25)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)')}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Option 1: WhatsApp Web / Direct Link */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem', backgroundColor: '#f8fafc' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#1e293b', fontWeight: '700' }}>
                  Opción A: Abrir en WhatsApp Web / App
                </h4>
                <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.775rem', color: '#64748b', lineHeight: '1.4' }}>
                  Ideal para enviar desde tu propio teléfono o tu cuenta de WhatsApp Web de forma instantánea.
                </p>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="tel"
                    placeholder="Número de Teléfono (ej. 4421234567)"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '0.5rem 0.75rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.875rem',
                      outline: 'none',
                    }}
                  />
                  <button
                    onClick={handleOpenWhatsAppWeb}
                    disabled={!phone}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: '#25d366',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: '700',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#128c7e')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#25d366')}
                  >
                    Abrir Chat <Send size={14} />
                  </button>
                </div>
              </div>

              {/* Option 2: Send from CAANMA Inbox */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem', backgroundColor: '#f8fafc' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#1e293b', fontWeight: '700' }}>
                  Opción B: Enviar desde la Bandeja de CAANMA
                </h4>
                <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.775rem', color: '#64748b', lineHeight: '1.4' }}>
                  Envía el link directamente usando la sesión de WhatsApp vinculada en la plataforma.
                </p>

                {isLoadingProspects ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.85rem' }}>
                    <Loader2 size={16} className="animate-spin" /> Cargando chats de la bandeja...
                  </div>
                ) : prospects.length === 0 ? (
                  <div style={{ fontSize: '0.85rem', color: '#ef4444', fontWeight: '500' }}>
                    ⚠️ No hay chats activos en la bandeja de WhatsApp para vincular. Por favor usa la Opción A.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <select
                      value={selectedProspectId}
                      onChange={(e) => setSelectedProspectId(e.target.value)}
                      style={{
                        padding: '0.5rem',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.875rem',
                        outline: 'none',
                        backgroundColor: 'white',
                      }}
                    >
                      {prospects.map((p: any) => (
                        <option key={p.id} value={p.id}>
                          {p.name || 'Chat sin Nombre'} ({p.phone})
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={handleSendViaCaanma}
                      disabled={isSending || !selectedProspectId || sendSuccess}
                      style={{
                        padding: '0.6rem 1rem',
                        backgroundColor: '#075e54',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: '700',
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#053e37')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#075e54')}
                    >
                      {isSending ? (
                        <>
                          <Loader2 size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                          Enviando...
                        </>
                      ) : sendSuccess ? (
                        <>
                          <CheckCircle size={16} color="#4ade80" /> ¡Enviado con Éxito!
                        </>
                      ) : (
                        <>
                          Enviar Directo desde CAANMA <Send size={14} />
                        </>
                      )}
                    </button>
                  </div>
                )}

                {sendError && (
                  <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '6px', fontSize: '0.775rem', color: '#b91c1c' }}>
                    {sendError}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
