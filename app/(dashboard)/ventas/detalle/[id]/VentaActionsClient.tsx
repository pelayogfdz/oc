'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Share2, AlertTriangle, Send, Loader2, CheckCircle } from 'lucide-react';
import { cancelSale } from '@/app/actions/sale';
import { cancelInvoice } from '@/app/actions/facturacion';

interface VentaActionsClientProps {
  saleId: string;
  saleFolio?: string | null;
  status: string;
  paymentMethod: string;
  customerPhone?: string | null;
  customerName?: string | null;
  saleTotal: number;
  invoiceId?: string | null;
}

export default function VentaActionsClient({
  saleId,
  saleFolio,
  status,
  paymentMethod,
  customerPhone,
  customerName,
  saleTotal,
  invoiceId
}: VentaActionsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [phone, setPhone] = useState(customerPhone || '');
  const [prospects, setProspects] = useState<any[]>([]);
  const [selectedProspectId, setSelectedProspectId] = useState<string>('');
  const [isLoadingProspects, setIsLoadingProspects] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // Prefilled WhatsApp message
  const getShareMessage = () => {
    const formattedTotal = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(saleTotal);
    const link = `${window.location.origin}/ventas/detalle/${saleId}/imprimir`;
    const displayFolio = saleFolio || saleId.slice(0, 8).toUpperCase();
    return `¡Hola ${customerName || 'Cliente'}! Le comparto el comprobante de su compra de CAANMA.\n\n` +
      `*Folio:* #${displayFolio}\n` +
      `*Total:* ${formattedTotal}\n` +
      `*Método:* ${paymentMethod === 'CASH' ? 'Efectivo' : paymentMethod === 'CARD' ? 'Tarjeta' : paymentMethod === 'TRANSFER' ? 'Transferencia' : paymentMethod}\n\n` +
      `Puede ver e imprimir el recibo detallado aquí:\n${link}\n\n` +
      `¡Muchas gracias por su preferencia! Que tenga un excelente día.`;
  };

  // Fetch prospects for Option B
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

  const handleOpenWhatsAppWeb = () => {
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
      setSendError(err.message || 'Error de red o microservicio desconectado.');
    } finally {
      setIsSending(false);
    }
  };

  const handleCancelSale = () => {
    if (!confirm('¿ESTÁS SEGURO DE CANCELAR ESTA VENTA? El stock será devuelto, los saldos reversados y esto no se puede deshacer.')) return;
    
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append('saleId', saleId);
        await cancelSale(formData);
        alert('Venta cancelada exitosamente.');
        router.refresh();
      } catch (err: any) {
        alert(err.message || 'Error al cancelar venta.');
      }
    });
  };

  const handleCancelInvoice = () => {
    if (!confirm('¿ESTÁS SEGURO DE CANCELAR LA FACTURA DE ESTA VENTA? Se solicitará la cancelación en Facturapi y no se podrá deshacer.')) return;
    
    startTransition(async () => {
      try {
        const res = await cancelInvoice(saleId);
        if (res.success) {
          alert('Factura cancelada exitosamente.');
          router.refresh();
        } else {
          alert(res.error || 'Error al cancelar la factura.');
        }
      } catch (err: any) {
        alert(err.message || 'Error al cancelar la factura.');
      }
    });
  };

  return (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
      {/* Share WhatsApp */}
      {status !== 'CANCELLED' && (
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-secondary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.25rem',
            borderRadius: '4px',
            backgroundColor: '#e6f4ea',
            color: '#137333',
            border: '1px solid #c2e7cc',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          <Share2 size={18} />
          Enviar Venta (WhatsApp)
        </button>
      )}

      {/* Cancel Sale */}
      {status === 'COMPLETED' && (
        <button
          onClick={handleCancelSale}
          disabled={isPending}
          className="btn-danger"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.25rem',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
            border: 'none',
            opacity: isPending ? 0.7 : 1
          }}
        >
          <AlertTriangle size={18} />
          {isPending ? 'Cancelando...' : 'Cancelar Venta'}
        </button>
      )}

      {/* Cancel Invoice */}
      {invoiceId && (
        <button
          onClick={handleCancelInvoice}
          disabled={isPending}
          className="btn-danger"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.25rem',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
            border: 'none',
            backgroundColor: '#dc2626',
            color: 'white',
            opacity: isPending ? 0.7 : 1
          }}
        >
          <AlertTriangle size={18} />
          {isPending ? 'Cancelando Factura...' : 'Cancelar Factura (SAT)'}
        </button>
      )}

      {/* WhatsApp Share Modal */}
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
            color: '#1e293b'
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '520px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              textAlign: 'left'
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
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '700' }}>
                  💬 Compartir Venta #{saleFolio || saleId.slice(0, 8).toUpperCase()}
                </h3>
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
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Option A */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem', backgroundColor: '#f8fafc' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', fontWeight: '700' }}>
                  Opción A: Abrir en WhatsApp Web / App
                </h4>
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
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    Abrir Chat <Send size={14} />
                  </button>
                </div>
              </div>

              {/* Option B */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem', backgroundColor: '#f8fafc' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', fontWeight: '700' }}>
                  Opción B: Enviar desde la Bandeja de CAANMA
                </h4>
                {isLoadingProspects ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.85rem' }}>
                    <Loader2 size={16} className="animate-spin" /> Cargando chats de la bandeja...
                  </div>
                ) : prospects.length === 0 ? (
                  <div style={{ fontSize: '0.85rem', color: '#ef4444', fontWeight: '500' }}>
                    ⚠️ No hay chats activos en la bandeja de WhatsApp para vincular.
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
                      }}
                    >
                      {isSending ? (
                        <>
                          <Loader2 size={16} className="animate-spin" /> Enviando...
                        </>
                      ) : sendSuccess ? (
                        <>
                          <CheckCircle size={16} color="#4ade80" /> ¡Enviado!
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
