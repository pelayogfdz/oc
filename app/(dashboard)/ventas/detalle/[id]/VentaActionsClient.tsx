'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Share2, AlertTriangle, Send, Loader2, CheckCircle, Edit3, FileText, CheckSquare, Square, DollarSign, Truck, MapPin, Trash2, User } from 'lucide-react';
import { cancelSale, updateSale, confirmSalePayment } from '@/app/actions/sale';
import { cancelInvoice, stampInvoice, checkDocumentSatStatus, syncSingleSaleWithInvoiceAction } from '@/app/actions/facturacion';
import { updateDeliveryOrder, upsertDeliveryOrderForSale, deleteDeliveryOrder } from '@/app/actions/logistica';
import { useOfflineSync } from '@/app/components/OfflineSyncProvider';

interface VentaActionsClientProps {
  saleId: string;
  saleFolio?: string | null;
  status: string;
  paymentMethod: string;
  customerPhone?: string | null;
  customerName?: string | null;
  customerAddress?: {
    street?: string;
    exteriorNumber?: string;
    interiorNumber?: string;
    neighborhood?: string;
    city?: string;
    zipCode?: string;
  };
  saleTotal: number;
  invoiceId?: string | null;
  currentCustomerId?: string | null;
  currentNotes?: string | null;
  customers: { id: string; name: string; street?: string | null; exteriorNumber?: string | null; interiorNumber?: string | null; neighborhood?: string | null; city?: string | null; zipCode?: string | null; phone?: string | null }[];
  deliveryOrder?: any | null;
  drivers?: { id: string; name: string; role?: string | null }[];
  customerHasCredit?: boolean;
  metodosConfig?: any;
}

export default function VentaActionsClient({
  saleId,
  saleFolio,
  status,
  paymentMethod,
  customerPhone,
  customerName,
  customerAddress,
  saleTotal,
  invoiceId,
  currentCustomerId = '',
  currentNotes = '',
  customers = [],
  deliveryOrder = null,
  drivers = [],
  customerHasCredit = false,
  metodosConfig = null
}: VentaActionsClientProps) {
  const router = useRouter();
  const { refreshCatalogs } = useOfflineSync();
  const [isPending, startTransition] = useTransition();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [phone, setPhone] = useState(customerPhone || '');
  const [prospects, setProspects] = useState<any[]>([]);
  const [selectedProspectId, setSelectedProspectId] = useState<string>('');
  const [isLoadingProspects, setIsLoadingProspects] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // Edit Sale States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editCustomerId, setEditCustomerId] = useState(currentCustomerId || '');
  const [editNotes, setEditNotes] = useState(currentNotes || '');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delivery Modal States
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [delStreet, setDelStreet] = useState(deliveryOrder?.street || customerAddress?.street || '');
  const [delExtNumber, setDelExtNumber] = useState(deliveryOrder?.exteriorNumber || customerAddress?.exteriorNumber || '');
  const [delIntNumber, setDelIntNumber] = useState(deliveryOrder?.interiorNumber || customerAddress?.interiorNumber || '');
  const [delNeighborhood, setDelNeighborhood] = useState(deliveryOrder?.neighborhood || customerAddress?.neighborhood || '');
  const [delCity, setDelCity] = useState(deliveryOrder?.city || customerAddress?.city || '');
  const [delZipCode, setDelZipCode] = useState(deliveryOrder?.zipCode || customerAddress?.zipCode || '');
  const [delNotes, setDelNotes] = useState(deliveryOrder?.notes || '');
  const [delDate, setDelDate] = useState(deliveryOrder?.deliveryDate ? new Date(deliveryOrder.deliveryDate).toISOString().split('T')[0] : '');
  const [delTime, setDelTime] = useState(deliveryOrder?.maxDeliveryTime || '');
  const [delDriverId, setDelDriverId] = useState(deliveryOrder?.driverId || '');
  const [delStatus, setDelStatus] = useState(deliveryOrder?.status || 'PENDING');
  const [isSavingDelivery, setIsSavingDelivery] = useState(false);
  const [isDeletingDelivery, setIsDeletingDelivery] = useState(false);
  const [deliveryActionError, setDeliveryActionError] = useState<string | null>(null);

  useEffect(() => {
    if (deliveryOrder) {
      setDelStreet(deliveryOrder.street || '');
      setDelExtNumber(deliveryOrder.exteriorNumber || '');
      setDelIntNumber(deliveryOrder.interiorNumber || '');
      setDelNeighborhood(deliveryOrder.neighborhood || '');
      setDelCity(deliveryOrder.city || '');
      setDelZipCode(deliveryOrder.zipCode || '');
      setDelNotes(deliveryOrder.notes || '');
      setDelDate(deliveryOrder.deliveryDate ? new Date(deliveryOrder.deliveryDate).toISOString().split('T')[0] : '');
      setDelTime(deliveryOrder.maxDeliveryTime || '');
      setDelDriverId(deliveryOrder.driverId || '');
      setDelStatus(deliveryOrder.status || 'PENDING');
    } else if (customerAddress) {
      setDelStreet(customerAddress.street || '');
      setDelExtNumber(customerAddress.exteriorNumber || '');
      setDelIntNumber(customerAddress.interiorNumber || '');
      setDelNeighborhood(customerAddress.neighborhood || '');
      setDelCity(customerAddress.city || '');
      setDelZipCode(customerAddress.zipCode || '');
    }
  }, [deliveryOrder, customerAddress]);

  const handleSaveDelivery = async () => {
    setIsSavingDelivery(true);
    setDeliveryActionError(null);
    try {
      const res = await upsertDeliveryOrderForSale(saleId, {
        street: delStreet,
        exteriorNumber: delExtNumber,
        interiorNumber: delIntNumber,
        neighborhood: delNeighborhood,
        city: delCity,
        zipCode: delZipCode,
        notes: delNotes,
        deliveryDate: delDate || null,
        maxDeliveryTime: delTime || null,
        driverId: delDriverId || null,
        status: delStatus
      });
      if (res.success) {
        setIsDeliveryModalOpen(false);
        router.refresh();
      } else {
        throw new Error(res.error || 'Error al guardar la entrega');
      }
    } catch (err: any) {
      setDeliveryActionError(err.message || 'Error al guardar la orden de entrega.');
    } finally {
      setIsSavingDelivery(false);
    }
  };

  const handleDeleteDelivery = async () => {
    if (!deliveryOrder) return;
    if (!confirm('¿Estás seguro de eliminar el envío a domicilio de esta venta?')) return;
    setIsDeletingDelivery(true);
    try {
      const res = await deleteDeliveryOrder(deliveryOrder.id);
      if (res.success) {
        setIsDeliveryModalOpen(false);
        router.refresh();
      } else {
        alert(res.error || 'Error al eliminar el envío');
      }
    } catch (err: any) {
      alert(err.message || 'Error al eliminar envío.');
    } finally {
      setIsDeletingDelivery(false);
    }
  };

  // Invoicing States
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [selectedCustomerIdForInvoice, setSelectedCustomerIdForInvoice] = useState(currentCustomerId || '');

  // SAT Live Status States
  const [satStatus, setSatStatus] = useState<string | null>(null);
  const [satCancellationStatus, setSatCancellationStatus] = useState<string | null>(null);
  const [isLoadingSat, setIsLoadingSat] = useState(false);

  // Delivery and Payment Confirmation States
  const [isConfirmPaymentModalOpen, setIsConfirmPaymentModalOpen] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('CASH');

  const handleToggleDeliveryStatus = () => {
    if (!deliveryOrder) return;
    const nextStatus = deliveryOrder.status === 'DELIVERED' ? 'PENDING' : 'DELIVERED';
    
    startTransition(async () => {
      try {
        const res = await updateDeliveryOrder(deliveryOrder.id, { status: nextStatus });
        if (res.success) {
          alert(`Estatus de entrega actualizado a: ${nextStatus === 'DELIVERED' ? 'Entregado' : 'Pendiente de entrega'}`);
          router.refresh();
        } else {
          alert(res.error || 'Error al actualizar el estatus de entrega');
        }
      } catch (err: any) {
        alert(err.message || 'Error de red al actualizar entrega.');
      }
    });
  };

  const handleConfirmPayment = () => {
    startTransition(async () => {
      try {
        const res = await confirmSalePayment(saleId, selectedPaymentMethod);
        if (res.success) {
          alert('Pago confirmado exitosamente.');
          setIsConfirmPaymentModalOpen(false);
          router.refresh();
        } else {
          alert(res.error || 'Error al confirmar el pago');
        }
      } catch (err: any) {
        alert(err.message || 'Error de red al confirmar el pago.');
      }
    });
  };


  useEffect(() => {
    if (invoiceId) {
      setIsLoadingSat(true);
      checkDocumentSatStatus(saleId, 'sale')
        .then((res: any) => {
          if (res.success) {
            setSatStatus(res.status);
            setSatCancellationStatus(res.cancellationStatus);
            // Refresh to sync the server component data (banner, totals, etc.) with the new SAT state
            router.refresh();
          }
        })
        .catch((err) => console.error("Error fetching SAT status:", err))
        .finally(() => setIsLoadingSat(false));
    }
  }, [invoiceId, saleId]);

  const handleSaveEdit = async () => {
    setIsSavingEdit(true);
    setEditError(null);
    try {
      const res = await updateSale(saleId, editCustomerId || null, editNotes || null);
      if (res.success) {
        setIsEditModalOpen(false);
        router.refresh();
      } else {
        throw new Error(res.error || 'Error al guardar los cambios');
      }
    } catch (err: any) {
      setEditError(err.message || 'Error al actualizar la venta.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Prefilled WhatsApp message
  const getShareMessage = () => {
    const formattedTotal = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(saleTotal);
    const link = `${window.location.origin}/ventas/detalle/${saleId}/imprimir`;
    const displayFolio = saleFolio || saleId.slice(0, 8).toUpperCase();
    return `¡Hola ${customerName || 'Cliente'}! Le comparto el comprobante de su compra de CAANMA.\n\n` +
      `*Folio:* #${displayFolio}\n` +
      `*Total:* ${formattedTotal}\n` +
      `*Método:* ${paymentMethod === 'CASH' ? 'Efectivo' : paymentMethod === 'CARD' ? 'Tarjeta' : paymentMethod === 'CARD_CREDIT' ? 'Tarjeta de Crédito' : paymentMethod === 'CARD_DEBIT' ? 'Tarjeta de Débito' : paymentMethod === 'TRANSFER' ? 'Transferencia' : paymentMethod === 'CHECK' || paymentMethod === 'CHEQUE' ? 'Cheque' : paymentMethod}\n\n` +
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
        
        try {
          if (refreshCatalogs) {
            await refreshCatalogs(true);
          }
        } catch (syncErr) {
          console.error("Local catalog sync failed after cancellation:", syncErr);
        }

        alert('Venta cancelada exitosamente.');
        router.refresh();
      } catch (err: any) {
        alert(err.message || 'Error al cancelar venta.');
      }
    });
  };

  const handleCancelInvoice = () => {
    if (!confirm('¿ESTÁS SEGURO DE CANCELAR LA FACTURA DE ESTA VENTA? Se solicitará la cancelación en Facturapi y no se podrá deshacer.')) return;
    const cancelSale = confirm('¿Deseas también CANCELAR la venta (cuenta), devolver el inventario y anular la deuda en el sistema?');
    
    startTransition(async () => {
      try {
        const res = await cancelInvoice(saleId, cancelSale);
        if (res.success) {
          setSatStatus(res.status || 'canceled');
          setSatCancellationStatus(res.cancellationStatus || 'pending');
          alert(cancelSale ? 'Factura y venta canceladas exitosamente.' : 'Factura cancelada exitosamente.');
          router.refresh();
        } else {
          alert(res.error || 'Error al cancelar la factura.');
        }
      } catch (err: any) {
        alert(err.message || 'Error al cancelar la factura.');
      }
    });
  };

  const handleInvoiceSubmit = () => {
    setIsInvoiceModalOpen(false);
    
    startTransition(async () => {
      try {
        const res = await stampInvoice(saleId, selectedCustomerIdForInvoice || null);
        if (res.success) {
          alert('Factura emitida exitosamente. ID: ' + res.invoiceId);
          router.refresh();
        } else {
          alert(res.error || 'Error al timbrar la factura.');
        }
      } catch (err: any) {
        alert(err.message || 'Error al timbrar la factura.');
      }
    });
  };

  const handleSyncSaleTotal = () => {
    startTransition(async () => {
      try {
        const res = await syncSingleSaleWithInvoiceAction(saleId);
        if (res.success) {
          alert(`Venta sincronizada correctamente con la Factura SAT. Nuevo total: $${res.targetTotal?.toFixed(2)}`);
          router.refresh();
        } else {
          alert(`Error al sincronizar: ${res.error}`);
        }
      } catch (err: any) {
        alert(`Error al sincronizar: ${err.message || String(err)}`);
      }
    });
  };

  return (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
      {/* Sincronizar Total con Factura SAT */}
      {invoiceId && (
        <button
          onClick={handleSyncSaleTotal}
          disabled={isPending}
          className="btn-secondary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.5rem 0.85rem',
            borderRadius: '6px',
            backgroundColor: '#f0fdf4',
            color: '#16a34a',
            border: '1px solid #bbf7d0',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '0.85rem',
            opacity: isPending ? 0.7 : 1
          }}
          title="Sincronizar total y saldos de CxC con el comprobante fiscal SAT"
        >
          <CheckCircle size={16} />
          {isPending ? 'Sincronizando...' : 'Cuadrar Venta con SAT'}
        </button>
      )}
      {/* Share WhatsApp */}
      {status !== 'CANCELLED' && (
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-secondary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.5rem 0.85rem',
            borderRadius: '6px',
            backgroundColor: '#e6f4ea',
            color: '#137333',
            border: '1px solid #c2e7cc',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '0.85rem',
          }}
        >
          <Share2 size={16} />
          Enviar Venta (WhatsApp)
        </button>
      )}

      {/* Edit Sale */}
      {status !== 'CANCELLED' && (
        <button
          onClick={() => setIsEditModalOpen(true)}
          className="btn-secondary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.5rem 0.85rem',
            borderRadius: '6px',
            backgroundColor: '#f1f5f9',
            color: '#475569',
            border: '1px solid #cbd5e1',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '0.85rem',
          }}
        >
          <Edit3 size={16} />
          Editar Venta
        </button>
      )}

      {/* Botón de Envío a Domicilio y Chofer */}
      {status !== 'CANCELLED' && (
        <button
          onClick={() => setIsDeliveryModalOpen(true)}
          className="btn-secondary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.5rem 0.85rem',
            borderRadius: '6px',
            backgroundColor: deliveryOrder ? (deliveryOrder.status === 'DELIVERED' ? '#f0fdf4' : '#eff6ff') : '#f8fafc',
            color: deliveryOrder ? (deliveryOrder.status === 'DELIVERED' ? '#16a34a' : '#1d4ed8') : '#475569',
            border: `1px solid ${deliveryOrder ? (deliveryOrder.status === 'DELIVERED' ? '#bbf7d0' : '#bfdbfe') : '#cbd5e1'}`,
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '0.85rem',
          }}
          title="Ver o editar datos de entrega a domicilio y chofer asignado"
        >
          <Truck size={16} />
          {deliveryOrder ? (
            <span>
              {deliveryOrder.status === 'DELIVERED' ? '✅ Entregado' : deliveryOrder.driver ? `🚚 Chofer: ${deliveryOrder.driver.name.split(' ')[0]}` : '🚚 Envío Sin Chofer'}
            </span>
          ) : (
            'Enviar a Domicilio / Chofer'
          )}
        </button>
      )}

      {/* Botones de Pedido (Estatus de Entrega y Confirmar Pago) */}
      {deliveryOrder && status !== 'CANCELLED' && (
        <>
          <button
            onClick={handleToggleDeliveryStatus}
            disabled={isPending}
            className="btn-secondary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 0.85rem',
              borderRadius: '6px',
              backgroundColor: deliveryOrder.status === 'DELIVERED' ? '#fff7ed' : '#eff6ff',
              color: deliveryOrder.status === 'DELIVERED' ? '#c2410c' : '#1d4ed8',
              border: `1px solid ${deliveryOrder.status === 'DELIVERED' ? '#fde68a' : '#bfdbfe'}`,
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '0.85rem',
              opacity: isPending ? 0.7 : 1
            }}
          >
            {deliveryOrder.status === 'DELIVERED' ? <Square size={16} /> : <CheckSquare size={16} />}
            {deliveryOrder.status === 'DELIVERED' ? 'Marcar Pendiente' : 'Marcar Entregado'}
          </button>

          {status === 'PENDING' && (
            <button
              onClick={() => setIsConfirmPaymentModalOpen(true)}
              disabled={isPending}
              className="btn-secondary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.5rem 0.85rem',
                borderRadius: '6px',
                backgroundColor: '#fef3c7',
                color: '#b45309',
                border: '1px solid #fde68a',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '0.85rem',
                opacity: isPending ? 0.7 : 1
              }}
            >
              <DollarSign size={16} />
              Confirmar Pago
            </button>
          )}
        </>
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
            gap: '0.4rem',
            padding: '0.5rem 0.85rem',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '0.85rem',
            border: 'none',
            opacity: isPending ? 0.7 : 1
          }}
        >
          <AlertTriangle size={16} />
          {isPending ? 'Cancelando...' : 'Cancelar Venta'}
        </button>
      )}

      {/* Timbrar Factura */}
      {status === 'COMPLETED' && !invoiceId && (
        <button
          onClick={() => {
            setSelectedCustomerIdForInvoice(currentCustomerId || '');
            setIsInvoiceModalOpen(true);
          }}
          disabled={isPending}
          className="btn-primary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.5rem 0.85rem',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '0.85rem',
            border: 'none',
            opacity: isPending ? 0.7 : 1
          }}
        >
          <FileText size={16} />
          {isPending ? 'Facturando...' : 'Timbrar Factura (SAT)'}
        </button>
      )}

      {/* Descargar PDF y XML */}
      {invoiceId && (
        <>
          <a
            href={`/api/facturacion/download?invoiceId=${invoiceId}&format=pdf`}
            download
            className="btn-secondary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 0.85rem',
              borderRadius: '6px',
              backgroundColor: '#eff6ff',
              color: '#1d4ed8',
              border: '1px solid #bfdbfe',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '0.85rem',
              textDecoration: 'none'
            }}
          >
            <FileText size={16} />
            Descargar PDF (CFDI)
          </a>
          <a
            href={`/api/facturacion/download?invoiceId=${invoiceId}&format=xml`}
            download
            className="btn-secondary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 0.85rem',
              borderRadius: '6px',
              backgroundColor: '#f8fafc',
              color: '#475569',
              border: '1px solid #cbd5e1',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '0.85rem',
              textDecoration: 'none'
            }}
          >
            <FileText size={16} />
            Descargar XML (CFDI)
          </a>

          {/* Botones de Acuse de Cancelación */}
          {(satStatus === 'canceled' || satCancellationStatus === 'pending') && (
            <>
              <a
                href={`/api/facturacion/download?invoiceId=${invoiceId}&format=pdf&type=cancellation`}
                download
                className="btn-secondary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.5rem 0.85rem',
                  borderRadius: '6px',
                  backgroundColor: '#fef2f2',
                  color: '#dc2626',
                  border: '1px solid #fca5a5',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '0.85rem',
                  textDecoration: 'none'
                }}
              >
                <FileText size={16} />
                Descargar Acuse PDF
              </a>
              <a
                href={`/api/facturacion/download?invoiceId=${invoiceId}&format=xml&type=cancellation`}
                download
                className="btn-secondary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.5rem 0.85rem',
                  borderRadius: '6px',
                  backgroundColor: '#fff7ed',
                  color: '#c2410c',
                  border: '1px solid #ffedd5',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '0.85rem',
                  textDecoration: 'none'
                }}
              >
                <FileText size={16} />
                Descargar Acuse XML
              </a>
            </>
          )}
        </>
      )}

      {/* Cancel Invoice */}
      {invoiceId && satStatus !== 'canceled' && satCancellationStatus !== 'pending' && (
        <button
          onClick={handleCancelInvoice}
          disabled={isPending}
          className="btn-danger"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.5rem 0.85rem',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '0.85rem',
            border: 'none',
            backgroundColor: '#dc2626',
            color: 'white',
            opacity: isPending ? 0.7 : 1
          }}
        >
          <AlertTriangle size={16} />
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

      {/* Edit Sale Modal */}
      {isEditModalOpen && (
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
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                color: 'white',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '700' }}>
                  ✏️ Editar Venta #{saleFolio || saleId.slice(0, 8).toUpperCase()}
                </h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
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
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#475569' }}>
                  Cliente asignado:
                </label>
                <select
                  value={editCustomerId}
                  onChange={(e) => setEditCustomerId(e.target.value)}
                  style={{
                    padding: '0.6rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.875rem',
                    outline: 'none',
                    backgroundColor: 'white',
                    color: 'black'
                  }}
                >
                  <option value="">Público General</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#475569' }}>
                  Notas del Ticket:
                </label>
                <textarea
                  placeholder="Escribe aquí notas internas o comentarios..."
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={4}
                  style={{
                    padding: '0.6rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.875rem',
                    outline: 'none',
                    resize: 'vertical',
                    color: 'black'
                  }}
                />
              </div>

              {editError && (
                <div style={{ padding: '0.75rem', backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', fontSize: '0.8rem', color: '#b91c1c' }}>
                  {editError}
                </div>
              )}

              {/* Footer Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={isSavingEdit}
                  style={{
                    padding: '0.6rem 1.25rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    backgroundColor: '#f8fafc',
                    color: '#64748b',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: '0.875rem'
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={isSavingEdit}
                  style={{
                    padding: '0.6rem 1.5rem',
                    border: 'none',
                    borderRadius: '8px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.875rem'
                  }}
                >
                  {isSavingEdit ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Guardando...
                    </>
                  ) : (
                    'Guardar Cambios'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Invoicing Modal */}
      {isInvoiceModalOpen && (
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
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                color: 'white',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '700' }}>
                  📄 Timbrar Factura (SAT)
                </h3>
              </div>
              <button
                onClick={() => setIsInvoiceModalOpen(false)}
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
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b' }}>
                Selecciona a qué cliente deseas timbrar la factura de esta venta por un total de <strong>${saleTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#475569' }}>
                  Cliente receptor fiscal:
                </label>
                <select
                  value={selectedCustomerIdForInvoice}
                  onChange={(e) => setSelectedCustomerIdForInvoice(e.target.value)}
                  style={{
                    padding: '0.6rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.875rem',
                    outline: 'none',
                    backgroundColor: 'white',
                    color: 'black'
                  }}
                >
                  <option value="">Público General (RFC: XAXX010101000)</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Footer Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  onClick={() => setIsInvoiceModalOpen(false)}
                  disabled={isPending}
                  style={{
                    padding: '0.6rem 1.25rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    backgroundColor: '#f8fafc',
                    color: '#64748b',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: '0.875rem'
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleInvoiceSubmit}
                  disabled={isPending}
                  style={{
                    padding: '0.6rem 1.5rem',
                    border: 'none',
                    borderRadius: '8px',
                    backgroundColor: '#2563eb',
                    color: 'white',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.875rem'
                  }}
                >
                  {isPending ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Timbrando...
                    </>
                  ) : (
                    <>
                      <Send size={16} /> Emitir Factura SAT
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Payment Modal */}
      {isConfirmPaymentModalOpen && (
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
              maxWidth: '450px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              textAlign: 'left'
            }}
          >
            {/* Header */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold', color: '#0f172a' }}>Confirmar Pago de Pedido</h3>
              <button 
                onClick={() => setIsConfirmPaymentModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: '#94a3b8' }}
              >
                &times;
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '1.5rem', maxHeight: '60vh', overflowY: 'auto' }}>
              <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: '#475569', lineHeight: '1.4' }}>
                Selecciona el método de pago utilizado por el cliente para liquidar el pedido por un total de <strong>${saleTotal.toLocaleString('es-MX', {minimumFractionDigits: 2})}</strong>:
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {(() => {
                  let allowedMethods = [
                    { id: 'CASH', label: '💵 Efectivo (Caja)' },
                    { id: 'CARD_DEBIT', label: '💳 Tarjeta de Débito' },
                    { id: 'CARD_CREDIT', label: '💳 Tarjeta de Crédito' },
                    { id: 'TRANSFER', label: '🏦 Transferencia Electrónica' },
                    { id: 'CHEQUE', label: '📑 Cheque' },
                    { id: 'VALES', label: '🎟️ Vales de Despensa / Monedero' },
                    { id: 'DEPOSIT', label: '🏛️ Depósito Bancario' }
                  ];

                  if (metodosConfig?.methods && Array.isArray(metodosConfig.methods)) {
                    allowedMethods = metodosConfig.methods.map((m: any) => ({
                      id: m.id,
                      label: m.name
                    }));
                  } else if (metodosConfig?.enabledIds && Array.isArray(metodosConfig.enabledIds)) {
                     allowedMethods = allowedMethods.filter(m => {
                        if (metodosConfig.enabledIds.includes(m.id)) return true;
                        if (m.id === 'CARD_CREDIT' || m.id === 'CARD_DEBIT') return metodosConfig.enabledIds.includes('CARD') || metodosConfig.enabledIds.includes('CARD_CREDIT');
                        return false;
                     });
                     if (metodosConfig.customMethods && Array.isArray(metodosConfig.customMethods)) {
                         metodosConfig.customMethods.forEach((cm: any) => {
                             if (metodosConfig.enabledIds.includes(cm.id)) allowedMethods.push({ id: cm.id, label: cm.name });
                         });
                     }
                  }

                  const isCreditEnabled = metodosConfig?.enabledIds ? metodosConfig.enabledIds.includes('CREDIT') : true;
                  if (customerHasCredit && isCreditEnabled && !allowedMethods.find(m => m.id === 'CREDIT')) {
                    allowedMethods.push({ id: 'CREDIT', label: '📋 Crédito Cta. (A Cuenta del Cliente)' });
                  }
                  
                  if (!allowedMethods.find(m => m.id === 'OTHER')) {
                    allowedMethods.push({ id: 'OTHER', label: '🔄 Otro Método de Pago' });
                  }

                  return allowedMethods.map((method) => {
                    const isSelected = selectedPaymentMethod === method.id;
                  return (
                    <label 
                      key={method.id}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.6rem', 
                        cursor: 'pointer', 
                        padding: '0.65rem 0.85rem', 
                        borderRadius: '8px', 
                        border: isSelected ? '2px solid var(--caanma-primary, #8b5cf6)' : '1px solid #cbd5e1',
                        backgroundColor: isSelected ? '#f5f3ff' : 'white',
                        fontWeight: isSelected ? 'bold' : 'normal',
                        fontSize: '0.9rem',
                        transition: 'all 0.15s ease-in-out'
                      }} 
                      className="hover:bg-slate-50"
                    >
                      <input 
                        type="radio" 
                        name="paymentMethodSelect" 
                        value={method.id} 
                        checked={isSelected}
                        onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                        style={{ width: '1.1rem', height: '1.1rem', accentColor: '#8b5cf6' }}
                      />
                      <span>{method.label}</span>
                    </label>
                  );
                })})()}
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: '1rem 1.5rem', backgroundColor: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                onClick={() => setIsConfirmPaymentModalOpen(false)}
                style={{
                  padding: '0.6rem 1.25rem',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  backgroundColor: 'white',
                  color: '#64748b',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmPayment}
                disabled={isPending}
                style={{
                  padding: '0.6rem 1.5rem',
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: '#16a34a',
                  color: 'white',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.875rem',
                  opacity: isPending ? 0.7 : 1
                }}
              >
                {isPending ? <Loader2 size={16} className="animate-spin" /> : null}
                Confirmar Pago
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Envío a Domicilio y Chofer */}
      {isDeliveryModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ padding: '0.4rem', backgroundColor: '#dbeafe', color: '#1e40af', borderRadius: '8px' }}>
                  <Truck size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold', color: '#0f172a' }}>
                    {deliveryOrder ? 'Editar Envío a Domicilio y Chofer' : 'Registrar Envío a Domicilio'}
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                    Folio: #{saleFolio || saleId.slice(0, 8).toUpperCase()} - Cliente: {customerName || 'Público General'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDeliveryModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.25rem', padding: '0.25rem' }}
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {deliveryActionError && (
                <div style={{ padding: '0.75rem 1rem', backgroundColor: '#fee2e2', border: '1px solid #f87171', borderRadius: '8px', color: '#991b1b', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertTriangle size={18} />
                  {deliveryActionError}
                </div>
              )}

              {/* Asignación de Chofer y Estatus */}
              <div style={{ backgroundColor: '#eff6ff', padding: '1rem', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#1e40af', marginBottom: '0.4rem' }}>
                  🚚 Chofer / Repartidor Asignado
                </label>
                <select
                  value={delDriverId}
                  onChange={e => {
                    setDelDriverId(e.target.value);
                    if (e.target.value && delStatus === 'PENDING') {
                      setDelStatus('IN_PROGRESS');
                    }
                  }}
                  style={{ width: '100%', padding: '0.6rem', fontSize: '0.9rem', borderRadius: '6px', border: '1px solid #93c5fd', backgroundColor: 'white', fontWeight: '500' }}
                >
                  <option value="">-- Sin chofer asignado (Pendiente en Logística) --</option>
                  {drivers && drivers.map((d: any) => (
                    <option key={d.id} value={d.id}>
                      {d.name} {d.role ? `(${d.role})` : ''}
                    </option>
                  ))}
                </select>

                <div style={{ marginTop: '0.75rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#1e40af', marginBottom: '0.4rem' }}>
                    Estatus de la Entrega
                  </label>
                  <select
                    value={delStatus}
                    onChange={e => setDelStatus(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem', borderRadius: '6px', border: '1px solid #93c5fd', backgroundColor: 'white' }}
                  >
                    <option value="PENDING">Pendiente de asignar / recolectar</option>
                    <option value="IN_PROGRESS">En Ruta / Asignado</option>
                    <option value="DELIVERED">Entregado</option>
                    <option value="POSTPONED">Pospuesto</option>
                  </select>
                </div>
              </div>

              {/* Dirección de Entrega */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#334155' }}>
                    Calle / Dirección <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  {customerAddress && customerAddress.street && (
                    <button
                      type="button"
                      onClick={() => {
                        setDelStreet(customerAddress.street || '');
                        setDelExtNumber(customerAddress.exteriorNumber || '');
                        setDelIntNumber(customerAddress.interiorNumber || '');
                        setDelNeighborhood(customerAddress.neighborhood || '');
                        setDelCity(customerAddress.city || '');
                        setDelZipCode(customerAddress.zipCode || '');
                      }}
                      style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                    >
                      📋 Cargar dirección de {customerName}
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={delStreet}
                  onChange={e => setDelStreet(e.target.value)}
                  placeholder="Nombre de la calle"
                  style={{ width: '100%', padding: '0.6rem', fontSize: '0.9rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.3rem' }}>No. Exterior</label>
                  <input
                    type="text"
                    value={delExtNumber}
                    onChange={e => setDelExtNumber(e.target.value)}
                    placeholder="Ej: 123"
                    style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.3rem' }}>No. Interior</label>
                  <input
                    type="text"
                    value={delIntNumber}
                    onChange={e => setDelIntNumber(e.target.value)}
                    placeholder="Ej: Depto 4"
                    style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 0.8fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.3rem' }}>Colonia</label>
                  <input
                    type="text"
                    value={delNeighborhood}
                    onChange={e => setDelNeighborhood(e.target.value)}
                    placeholder="Colonia"
                    style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.3rem' }}>Ciudad</label>
                  <input
                    type="text"
                    value={delCity}
                    onChange={e => setDelCity(e.target.value)}
                    placeholder="Ciudad"
                    style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.3rem' }}>C.P.</label>
                  <input
                    type="text"
                    value={delZipCode}
                    onChange={e => setDelZipCode(e.target.value)}
                    placeholder="C.P."
                    style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.3rem' }}>Referencias / Indicaciones de Entrega</label>
                <textarea
                  value={delNotes}
                  onChange={e => setDelNotes(e.target.value)}
                  rows={2}
                  placeholder="Ej: Portón café, llamar antes de llegar, etc."
                  style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem', borderRadius: '6px', border: '1px solid #cbd5e1', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.3rem' }}>Fecha de Entrega</label>
                  <input
                    type="date"
                    value={delDate}
                    onChange={e => setDelDate(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.3rem' }}>Hora Límite de Entrega</label>
                  <input
                    type="time"
                    value={delTime}
                    onChange={e => setDelTime(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: '1rem 1.5rem', backgroundColor: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {deliveryOrder ? (
                <button
                  type="button"
                  onClick={handleDeleteDelivery}
                  disabled={isDeletingDelivery || isSavingDelivery}
                  style={{
                    padding: '0.5rem 0.85rem',
                    border: '1px solid #fca5a5',
                    borderRadius: '6px',
                    backgroundColor: '#fef2f2',
                    color: '#dc2626',
                    fontWeight: 'bold',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                >
                  <Trash2 size={14} />
                  {isDeletingDelivery ? 'Eliminando...' : 'Eliminar Envío'}
                </button>
              ) : <div />}

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setIsDeliveryModalOpen(false)}
                  style={{
                    padding: '0.55rem 1.25rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    backgroundColor: 'white',
                    color: '#64748b',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: '0.85rem'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveDelivery}
                  disabled={isSavingDelivery}
                  style={{
                    padding: '0.55rem 1.5rem',
                    border: 'none',
                    borderRadius: '6px',
                    backgroundColor: '#2563eb',
                    color: 'white',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    fontSize: '0.85rem'
                  }}
                >
                  {isSavingDelivery ? <Loader2 size={16} className="animate-spin" /> : <Truck size={16} />}
                  Guardar Envío y Chofer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
