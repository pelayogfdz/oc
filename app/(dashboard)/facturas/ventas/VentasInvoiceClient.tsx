'use client';

import { useState, useTransition, useEffect } from 'react';
import { 
  FileText, Send, AlertTriangle, Download, Plus, Search, 
  Check, X, FileDown, Layers, Loader2, Sparkles,
  Printer, Share2, CheckCircle, Mail
} from 'lucide-react';
import { stampInvoice, cancelInvoice, stampMultipleSalesInvoice, sendInvoiceByEmail } from '@/app/actions/facturacion';
import { createCustomerBilling } from '@/app/actions/customer';

interface VentasInvoiceClientProps {
  initialSales: any[];
  initialCustomers: any[];
}

export default function VentasInvoiceClient({ initialSales, initialCustomers }: VentasInvoiceClientProps) {
  const [sales, setSales] = useState<any[]>(initialSales);
  const [customers, setCustomers] = useState<any[]>(initialCustomers);
  const [selectedSaleIds, setSelectedSaleIds] = useState<string[]>([]);
  const [activeInvoicingSaleIds, setActiveInvoicingSaleIds] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);

  // WhatsApp Share States for Invoices
  const [isWhatsappOpen, setIsWhatsappOpen] = useState(false);
  const [activeSale, setActiveSale] = useState<any>(null);
  const [phone, setPhone] = useState('');
  const [prospects, setProspects] = useState<any[]>([]);
  const [selectedProspectId, setSelectedProspectId] = useState<string>('');
  const [isLoadingProspects, setIsLoadingProspects] = useState(false);
  const [isSendingWhatsapp, setIsSendingWhatsapp] = useState(false);
  const [whatsappSuccess, setWhatsappSuccess] = useState(false);
  const [whatsappError, setWhatsappError] = useState<string | null>(null);

  // Email Share States for Invoices
  const [isEmailOpen, setIsEmailOpen] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  // Load prospects for WhatsApp Option B
  useEffect(() => {
    if (isWhatsappOpen && activeSale) {
      setPhone(activeSale.customer?.phone || '');
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
                (activeSale.customer?.phone && p.phone === activeSale.customer.phone) ||
                (activeSale.customer?.name && p.name?.toLowerCase().includes(activeSale.customer.name.toLowerCase()))
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
  }, [isWhatsappOpen, activeSale]);

  const getWhatsappMessage = (sale: any) => {
    if (!sale) return '';
    const link = `${window.location.origin}/api/facturacion/download?invoiceId=${sale.invoiceId}&format=pdf`;
    const displayFolio = sale.invoiceFolio || sale.invoiceId || sale.id.slice(0, 8);
    return `¡Hola ${sale.customer?.name || 'Cliente'}! Le comparto la factura CFDI digital de su compra en CAANMA.\n\n` +
      `*Folio CFDI:* #${displayFolio}\n` +
      `*Total:* ${new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(sale.total)}\n\n` +
      `Puede descargar el PDF de su factura en el siguiente enlace:\n${link}\n\n` +
      `¡Muchas gracias por su preferencia! Excelente día.`;
  };

  const handleOpenWhatsappModal = (sale: any) => {
    setActiveSale(sale);
    setPhone(sale.customer?.phone || '');
    setIsWhatsappOpen(true);
  };

  const handleOpenEmailModal = (sale: any) => {
    setActiveSale(sale);
    setEmailInput(sale.customer?.email || '');
    setIsEmailOpen(true);
  };

  const handleOpenWhatsAppWeb = () => {
    if (!activeSale) return;
    const cleanPhone = phone.replace(/\D/g, '');
    const finalPhone = cleanPhone.startsWith('52') ? cleanPhone : `52${cleanPhone}`;
    const text = encodeURIComponent(getWhatsappMessage(activeSale));
    window.open(`https://api.whatsapp.com/send?phone=${finalPhone}&text=${text}`, '_blank');
    setIsWhatsappOpen(false);
  };

  const handleSendViaCaanma = async () => {
    if (!selectedProspectId || !activeSale) return;
    const selectedProspect = prospects.find((p) => p.id === selectedProspectId);
    if (!selectedProspect) return;

    setIsSendingWhatsapp(true);
    setWhatsappError(null);

    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: selectedProspect.phone,
          message: getWhatsappMessage(activeSale),
          prospectId: selectedProspect.id,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setWhatsappSuccess(true);
        setTimeout(() => {
          setIsWhatsappOpen(false);
          setWhatsappSuccess(false);
        }, 1500);
      } else {
        throw new Error(data.error || 'Error al enviar mensaje');
      }
    } catch (err: any) {
      console.error(err);
      setWhatsappError(err.message || 'Error de red o de microservicio de WhatsApp desconectado.');
    } finally {
      setIsSendingWhatsapp(false);
    }
  };

  const handleSendEmail = async () => {
    if (!emailInput || !activeSale) return;
    setIsSendingEmail(true);
    setEmailError(null);
    try {
      const result = await sendInvoiceByEmail(activeSale.id, emailInput);
      if (result.success) {
        setEmailSuccess(true);
        setTimeout(() => {
          setIsEmailOpen(false);
          setEmailSuccess(false);
        }, 1500);
      } else {
        throw new Error(result.error || 'Error al enviar correo.');
      }
    } catch (e: any) {
      console.error(e);
      setEmailError(e.message || 'Error de red o SMTP no configurado.');
    } finally {
      setIsSendingEmail(false);
    }
  };

  // New Customer Form State
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    legalName: '',
    taxId: '',
    taxRegime: '601',
    zipCode: '',
    cfdiUse: 'G03',
    email: '',
    phone: ''
  });

  // Filter out sales that are already invoiced to Público en General or other, but let's show all
  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    (c.taxId && c.taxId.toLowerCase().includes(customerSearch.toLowerCase()))
  );

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      // Select all Completed sales that don't have an invoiceId yet
      const uninvoicedIds = sales.filter(s => !s.invoiceId).map(s => s.id);
      setSelectedSaleIds(uninvoicedIds);
    } else {
      setSelectedSaleIds([]);
    }
  };

  const handleSelectSale = (saleId: string) => {
    setSelectedSaleIds(prev => 
      prev.includes(saleId) ? prev.filter(id => id !== saleId) : [...prev, saleId]
    );
  };

  const handleStampSingle = (saleId: string) => {
    if (!confirm('¿Deseas emitir la factura para esta venta ante el SAT?')) return;
    startTransition(async () => {
      const res = await stampInvoice(saleId);
      if (res.success) {
        alert('Factura emitida exitosamente. ID: ' + res.invoiceId);
        // Refresh local state
        setSales(prev => prev.map(s => s.id === saleId ? { ...s, invoiceId: res.invoiceId } : s));
      } else {
        alert('Error al timbrar factura: ' + res.error);
      }
    });
  };

  const handleCancelSingle = (saleId: string, invoiceId: string) => {
    if (!confirm('¿Estás seguro de cancelar la factura ante el SAT? Esto cancelará la factura con motivo "02" en Facturapi.')) return;
    startTransition(async () => {
      const res = await cancelInvoice(saleId);
      if (res.success) {
        alert('Factura cancelada exitosamente.');
        // Refresh local state
        setSales(prev => prev.map(s => s.id === saleId ? { ...s, invoiceId: null } : s));
      } else {
        alert('Error al cancelar factura: ' + res.error);
      }
    });
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomer.name || !newCustomer.taxId || !newCustomer.zipCode) {
      alert('Por favor completa los campos obligatorios: Razón Social, RFC y Código Postal.');
      return;
    }

    try {
      const res = await createCustomerBilling(newCustomer);
      alert('Cliente fiscal registrado exitosamente.');
      // Add to list and select it
      setCustomers(prev => [res, ...prev]);
      setSelectedCustomerId(res.id);
      setIsCreatingCustomer(false);
      // Reset form
      setNewCustomer({
        name: '',
        legalName: '',
        taxId: '',
        taxRegime: '601',
        zipCode: '',
        cfdiUse: 'G03',
        email: '',
        phone: ''
      });
    } catch (err: any) {
      alert('Error al registrar cliente: ' + err.message);
    }
  };

  const handleGroupInvoiceSubmit = () => {
    if (activeInvoicingSaleIds.length === 0) return;
    
    startTransition(async () => {
      let res;
      if (activeInvoicingSaleIds.length === 1) {
        res = await stampInvoice(activeInvoicingSaleIds[0], selectedCustomerId || null);
      } else {
        res = await stampMultipleSalesInvoice(activeInvoicingSaleIds, selectedCustomerId || null);
      }
      
      if (res.success) {
        alert('Factura emitida exitosamente. ID: ' + res.invoiceId);
        // Refresh local state
        setSales(prev => prev.map(s => activeInvoicingSaleIds.includes(s.id) ? { ...s, invoiceId: res.invoiceId } : s));
        // Remove from selected list
        setSelectedSaleIds(prev => prev.filter(id => !activeInvoicingSaleIds.includes(id)));
        setActiveInvoicingSaleIds([]);
        setIsModalOpen(false);
      } else {
        alert('Error al timbrar factura: ' + res.error);
      }
    });
  };

  const totalSelected = sales
    .filter(s => selectedSaleIds.includes(s.id))
    .reduce((acc, s) => acc + s.total, 0);

  const activeInvoicingTotal = sales
    .filter(s => activeInvoicingSaleIds.includes(s.id))
    .reduce((acc, s) => acc + s.total, 0);

  return (
    <div style={{ position: 'relative' }}>
      
      {/* Title block */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#0f172a' }}>
            <FileText size={28} color="var(--caanma-primary)" />
            Facturación de Ventas
          </h1>
          <p style={{ color: 'var(--caanma-text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Timbra comprobantes individuales o selecciona múltiples ventas para consolidarlas en una sola factura.
          </p>
        </div>
      </div>

      {/* Floating Action Banner for Selection */}
      {selectedSaleIds.length > 0 && (
        <div style={{
          position: 'fixed',
          bottom: '2rem',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          padding: '1rem 2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '2rem',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3), 0 10px 10px -5px rgba(0,0,0,0.3)',
          zIndex: 999,
          color: 'white',
          border: '1px solid rgba(255,255,255,0.1)',
          animation: 'slideUp 0.3s ease-out'
        }}>
          <div>
            <div style={{ fontSize: '0.8rem', opacity: 0.8, fontWeight: '500' }}>VENTAS SELECCIONADAS</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#3b82f6' }}>
              {selectedSaleIds.length} <span style={{ color: 'white', fontSize: '0.9rem', fontWeight: 'normal' }}>de contado por</span> ${totalSelected.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button 
              onClick={() => {
                setSelectedCustomerId('');
                setActiveInvoicingSaleIds(selectedSaleIds);
                setIsModalOpen(true);
              }}
              style={{
                backgroundColor: 'var(--caanma-primary)',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.9rem',
                transition: 'all 0.2s'
              }}
            >
              <Layers size={18} /> Facturar Agrupadas
            </button>
            <button 
              onClick={() => setSelectedSaleIds([])}
              style={{
                backgroundColor: 'rgba(255,255,255,0.1)',
                color: '#e2e8f0',
                border: 'none',
                padding: '0.75rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Limpiar selección"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Sales list Table Card */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--caanma-border)' }}>
        <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: '#f8fafc' }}>
            <tr style={{ borderBottom: '1px solid var(--caanma-border)' }}>
              <th style={{ padding: '1rem', width: '40px', textAlign: 'center' }}>
                <input 
                  type="checkbox" 
                  onChange={handleSelectAll}
                  checked={selectedSaleIds.length > 0 && selectedSaleIds.length === sales.filter(s => !s.invoiceId).length}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
              </th>
              <th style={{ padding: '1rem', color: '#475569', fontWeight: 'bold' }}>Folio / Fecha</th>
              <th style={{ padding: '1rem', color: '#475569', fontWeight: 'bold' }}>Cliente / Método</th>
              <th style={{ padding: '1rem', color: '#475569', fontWeight: 'bold', textAlign: 'right' }}>Total</th>
              <th style={{ padding: '1rem', color: '#475569', fontWeight: 'bold', textAlign: 'center' }}>Estado SAT</th>
              <th style={{ padding: '1rem', color: '#475569', fontWeight: 'bold', textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((sale) => {
              const isSelected = selectedSaleIds.includes(sale.id);
              const isSaleInvoiced = !!sale.invoiceId;

              return (
                <tr 
                  key={sale.id} 
                  style={{ 
                    borderBottom: '1px solid var(--caanma-border)',
                    backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.03)' : 'transparent',
                    transition: 'all 0.15s'
                  }}
                >
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <input 
                      type="checkbox" 
                      checked={isSelected}
                      disabled={isSaleInvoiced}
                      onChange={() => handleSelectSale(sale.id)}
                      style={{ 
                        width: '18px', 
                        height: '18px', 
                        cursor: isSaleInvoiced ? 'not-allowed' : 'pointer',
                        opacity: isSaleInvoiced ? 0.3 : 1
                      }}
                    />
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: 'bold', color: '#0f172a' }}>#{sale.folio || sale.id.substring(0,8).toUpperCase()}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--caanma-text-muted)', marginTop: '0.2rem' }}>
                      {new Date(sale.createdAt).toLocaleDateString()} {new Date(sale.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: '500', color: '#1e293b' }}>
                      {sale.customer?.legalName || sale.customer?.name || 'Público en General'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--caanma-text-muted)', display: 'flex', gap: '0.5rem', marginTop: '0.2rem' }}>
                      <span>RFC: {sale.customer?.taxId || 'XAXX010101000'}</span>
                      <span>•</span>
                      <span style={{ fontWeight: '500', color: '#2563eb' }}>
                        {sale.paymentMethod === 'CASH' ? 'Efectivo' : sale.paymentMethod === 'CARD' ? 'Tarjeta' : sale.paymentMethod === 'TRANSFER' ? 'Transf' : sale.paymentMethod}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold', color: '#0f172a' }}>
                    ${sale.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    {isSaleInvoiced ? (
                      <span style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '0.25rem', 
                        color: '#15803d', 
                        backgroundColor: '#dcfce7', 
                        padding: '0.25rem 0.75rem', 
                        borderRadius: '12px', 
                        fontSize: '0.8rem', 
                        fontWeight: 'bold' 
                      }}>
                        Facturado ✓
                      </span>
                    ) : (
                      <span style={{ 
                        color: '#94a3b8', 
                        backgroundColor: '#f1f5f9', 
                        padding: '0.25rem 0.75rem', 
                        borderRadius: '12px', 
                        fontSize: '0.8rem', 
                        fontWeight: 'bold' 
                      }}>
                        Pendiente
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                      {isSaleInvoiced ? (
                        <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                          {/* PDF */}
                          <a 
                            href={`/api/facturacion/download?invoiceId=${sale.invoiceId}&format=pdf`} 
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ 
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              padding: '0.4rem 0.8rem',
                              backgroundColor: '#fee2e2', 
                              border: '1px solid #fecaca',
                              borderRadius: '6px', 
                              cursor: 'pointer',
                              fontWeight: '600',
                              fontSize: '0.825rem',
                              color: '#b91c1c', 
                              textDecoration: 'none',
                              transition: 'all 0.15s ease'
                            }} 
                            title="Descargar PDF de la Factura"
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#fecaca';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#fee2e2';
                            }}
                          >
                            <Download size={15} /> PDF
                          </a>

                          {/* XML */}
                          <a 
                            href={`/api/facturacion/download?invoiceId=${sale.invoiceId}&format=xml`} 
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ 
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              padding: '0.4rem 0.8rem',
                              backgroundColor: '#f1f5f9', 
                              border: '1px solid #cbd5e1',
                              borderRadius: '6px', 
                              cursor: 'pointer',
                              fontWeight: '600',
                              fontSize: '0.825rem',
                              color: '#475569', 
                              textDecoration: 'none',
                              transition: 'all 0.15s ease'
                            }} 
                            title="Descargar XML de la Factura"
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#e2e8f0';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#f1f5f9';
                            }}
                          >
                            <Download size={15} /> XML
                          </a>

                          {/* WhatsApp */}
                          <button
                            onClick={() => handleOpenWhatsappModal(sale)}
                            title="Compartir Factura por WhatsApp"
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

                          {/* Enviar por mail */}
                          <button
                            onClick={() => handleOpenEmailModal(sale)}
                            title="Enviar Factura por Correo"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              padding: '0.4rem 0.8rem',
                              backgroundColor: '#eff6ff',
                              border: '1px solid #bfdbfe',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontWeight: '600',
                              fontSize: '0.825rem',
                              color: '#1d4ed8',
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#dbeafe';
                              e.currentTarget.style.borderColor = '#93c5fd';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#eff6ff';
                              e.currentTarget.style.borderColor = '#bfdbfe';
                            }}
                          >
                            <Mail size={15} />
                            Enviar por mail
                          </button>

                          {/* Cancelar */}
                          <button 
                            disabled={isPending}
                            onClick={() => handleCancelSingle(sale.id, sale.invoiceId)}
                            style={{ 
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              padding: '0.4rem 0.8rem',
                              backgroundColor: 'rgba(239, 68, 68, 0.1)', 
                              border: '1px solid rgba(239, 68, 68, 0.2)',
                              borderRadius: '6px', 
                              cursor: isPending ? 'not-allowed' : 'pointer',
                              fontWeight: '600',
                              fontSize: '0.825rem',
                              color: '#ef4444', 
                              transition: 'all 0.15s ease',
                              opacity: isPending ? 0.6 : 1
                            }}
                            title="Cancelar Factura ante el SAT"
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                            }}
                          >
                            <AlertTriangle size={15} /> Cancelar
                          </button>
                        </div>
                      ) : (
                        <button 
                          disabled={isPending}
                          onClick={() => {
                            setSelectedCustomerId(sale.customerId || '');
                            setActiveInvoicingSaleIds([sale.id]);
                            setIsModalOpen(true);
                          }}
                          style={{ 
                            padding: '0.5rem 1rem', 
                            backgroundColor: '#eff6ff', 
                            color: '#2563eb', 
                            borderRadius: '6px', 
                            border: '1px solid #bfdbfe', 
                            cursor: 'pointer', 
                            fontWeight: 'bold', 
                            fontSize: '0.8rem', 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.35rem' 
                          }}
                        >
                          <Send size={14} /> Facturar SAT
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {sales.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: '4rem', textAlign: 'center', color: 'var(--caanma-text-muted)' }}>
                  <FileText size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                  No hay ventas registradas para facturar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Group Facturacion Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          color: '#1e293b'
        }}>
          <div className="card" style={{ 
            width: '90%', 
            maxWidth: '650px', 
            maxHeight: '90vh', 
            overflowY: 'auto', 
            padding: '2rem', 
            backgroundColor: 'white', 
            borderRadius: '16px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            position: 'relative'
          }}>
            <button 
              onClick={() => setIsModalOpen(false)}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}
            >
              <X size={24} />
            </button>

            {!isCreatingCustomer ? (
              <div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Layers size={22} color="var(--caanma-primary)" />
                  {activeInvoicingSaleIds.length === 1 ? 'Facturar Venta' : `Facturar ${activeInvoicingSaleIds.length} Ventas Agrupadas`}
                </h3>
                <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                  {activeInvoicingSaleIds.length === 1 ? 'Monto de la venta:' : 'Monto consolidado:'} <strong style={{ color: '#0f172a' }}>${activeInvoicingTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>
                </p>

                {/* Search Customer */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
                  <label style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Selecciona el receptor fiscal:</span>
                    <button 
                      onClick={() => setIsCreatingCustomer(true)}
                      style={{ border: 'none', background: 'none', color: 'var(--caanma-primary)', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem' }}
                    >
                      <Plus size={16} /> Registrar Cliente Nuevo
                    </button>
                  </label>
                  
                  <div style={{ position: 'relative' }}>
                    <Search style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={18} />
                    <input 
                      type="text" 
                      placeholder="Buscar por Nombre, Razón Social o RFC..."
                      value={customerSearch}
                      onChange={e => setCustomerSearch(e.target.value)}
                      style={{ width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.5rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem' }}
                    />
                  </div>

                  <div style={{ 
                    maxHeight: '200px', 
                    overflowY: 'auto', 
                    border: '1px solid #e2e8f0', 
                    borderRadius: '8px', 
                    marginTop: '0.5rem' 
                  }}>
                    {/* Default Public Option */}
                    <div 
                      onClick={() => setSelectedCustomerId('')}
                      style={{ 
                        padding: '0.75rem 1rem', 
                        cursor: 'pointer', 
                        backgroundColor: selectedCustomerId === '' ? 'rgba(59, 130, 246, 0.05)' : 'white',
                        borderBottom: '1px solid #f1f5f9',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Público en General</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>RFC: XAXX010101000</div>
                      </div>
                      {selectedCustomerId === '' && <Check size={18} color="var(--caanma-primary)" />}
                    </div>

                    {filteredCustomers.map((c) => (
                      <div 
                        key={c.id}
                        onClick={() => setSelectedCustomerId(c.id)}
                        style={{ 
                          padding: '0.75rem 1rem', 
                          cursor: 'pointer', 
                          backgroundColor: selectedCustomerId === c.id ? 'rgba(59, 130, 246, 0.05)' : 'white',
                          borderBottom: '1px solid #f1f5f9',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{c.legalName || c.name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>RFC: {c.taxId || 'Sin RFC'}</div>
                        </div>
                        {selectedCustomerId === c.id && <Check size={18} color="var(--caanma-primary)" />}
                      </div>
                    ))}
                    {filteredCustomers.length === 0 && customerSearch !== '' && (
                      <div style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
                        No se encontraron clientes con "{customerSearch}".
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    style={{ flex: 1, padding: '0.75rem', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleGroupInvoiceSubmit}
                    disabled={isPending}
                    style={{ flex: 2, padding: '0.75rem', backgroundColor: 'var(--caanma-primary)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                  >
                    {isPending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                    {isPending ? 'Timbrando CFDI...' : 'Emitir Factura SAT'}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Sparkles size={20} color="var(--caanma-primary)" />
                  Dar de alta Cliente Fiscal
                </h3>
                
                <form onSubmit={handleCreateCustomer} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.25rem' }}>Nombre o Razón Social *</label>
                      <input 
                        type="text" 
                        placeholder="Ej. Distribuidora S.A. de C.V."
                        value={newCustomer.name}
                        onChange={e => setNewCustomer(prev => ({ ...prev, name: e.target.value, legalName: e.target.value }))}
                        required
                        style={{ width: '100%', padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.25rem' }}>RFC *</label>
                      <input 
                        type="text" 
                        placeholder="RFC a 12 o 13 posiciones"
                        value={newCustomer.taxId}
                        onChange={e => {
                          const newRfc = e.target.value.toUpperCase().replace(/[^A-Z0-9&]/g, '');
                          setNewCustomer(prev => {
                            let newRegime = prev.taxRegime;
                            if (newRfc.length === 13 && (prev.taxRegime === '601' || prev.taxRegime === '603')) {
                              newRegime = '605';
                            } else if (newRfc.length === 12 && (prev.taxRegime !== '601' && prev.taxRegime !== '603')) {
                              newRegime = '601';
                            }
                            return { ...prev, taxId: newRfc, taxRegime: newRegime };
                          });
                        }}
                        required
                        style={{ width: '100%', padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.25rem' }}>Régimen Fiscal</label>
                      <select 
                        value={newCustomer.taxRegime}
                        onChange={e => setNewCustomer(prev => ({ ...prev, taxRegime: e.target.value }))}
                        style={{ width: '100%', padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem', backgroundColor: 'white' }}
                      >
                        <option value="601">General de Ley Personas Morales (601)</option>
                        <option value="603">Personas Morales con Fines no Lucrativos (603)</option>
                        <option value="605">Sueldos y Salarios (605)</option>
                        <option value="606">Arrendamiento (606)</option>
                        <option value="612">Actividades Empresariales y Profesionales (612)</option>
                        <option value="616">Sin obligaciones fiscales (616)</option>
                        <option value="621">Incorporación Fiscal (621)</option>
                        <option value="626">RESICO (626)</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.25rem' }}>Código Postal *</label>
                      <input 
                        type="text" 
                        placeholder="5 dígitos"
                        value={newCustomer.zipCode}
                        onChange={e => setNewCustomer(prev => ({ ...prev, zipCode: e.target.value }))}
                        required
                        style={{ width: '100%', padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.25rem' }}>Uso de CFDI</label>
                      <select 
                        value={newCustomer.cfdiUse}
                        onChange={e => setNewCustomer(prev => ({ ...prev, cfdiUse: e.target.value }))}
                        style={{ width: '100%', padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem', backgroundColor: 'white' }}
                      >
                        <option value="G01">Adquisición de mercancías (G01)</option>
                        <option value="G03">Gastos en general (G03)</option>
                        <option value="I01">Construcciones (I01)</option>
                        <option value="I02">Mobiliario y equipo de oficina (I02)</option>
                        <option value="I03">Equipo de transporte (I03)</option>
                        <option value="I04">Equipo de cómputo y accesorios (I04)</option>
                        <option value="I08">Otra maquinaria y equipo (I08)</option>
                        <option value="D01">Honorarios médicos y dentales (D01)</option>
                        <option value="D02">Gastos médicos por incapacidad (D02)</option>
                        <option value="S01">Sin efectos fiscales (S01)</option>
                        <option value="CP01">Pagos (CP01)</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.25rem' }}>Correo Electrónico</label>
                      <input 
                        type="email" 
                        placeholder="cliente@ejemplo.com"
                        value={newCustomer.email}
                        onChange={e => setNewCustomer(prev => ({ ...prev, email: e.target.value }))}
                        style={{ width: '100%', padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.25rem' }}>Teléfono</label>
                    <input 
                      type="tel" 
                      placeholder="10 dígitos"
                      value={newCustomer.phone}
                      onChange={e => setNewCustomer(prev => ({ ...prev, phone: e.target.value }))}
                      style={{ width: '100%', padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem' }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                    <button 
                      type="button"
                      onClick={() => setIsCreatingCustomer(false)}
                      style={{ flex: 1, padding: '0.75rem', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      Atrás
                    </button>
                    <button 
                      type="submit"
                      style={{ flex: 1, padding: '0.75rem', backgroundColor: 'var(--caanma-primary)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      Registrar y Usar
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modern Share Modal */}
      {isWhatsappOpen && activeSale && (
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
                  💬 Compartir Factura CFDI
                </h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', opacity: 0.9 }}>
                  Elige la forma preferida de enviarle la factura a tu cliente.
                </p>
              </div>
              <button
                onClick={() => setIsWhatsappOpen(false)}
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
                  Envía el link de la factura directamente usando la sesión de WhatsApp vinculada en la plataforma.
                </p>

                {isLoadingProspects ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.85rem' }}>
                    <Loader2 size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} /> Cargando chats de la bandeja...
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
                      disabled={isSendingWhatsapp || !selectedProspectId || whatsappSuccess}
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
                      {isSendingWhatsapp ? (
                        <>
                          <Loader2 size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                          Enviando...
                        </>
                      ) : whatsappSuccess ? (
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

                {whatsappError && (
                  <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '6px', fontSize: '0.775rem', color: '#b91c1c' }}>
                    {whatsappError}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Email Share Modal */}
      {isEmailOpen && activeSale && (
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
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '480px',
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
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                color: 'white',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  ✉️ Enviar Factura por Correo
                </h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', opacity: 0.9 }}>
                  Envía el archivo PDF y XML de la factura por correo.
                </p>
              </div>
              <button
                onClick={() => setIsEmailOpen(false)}
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
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#475569' }}>Correo Destinatario</label>
                <input
                  type="email"
                  placeholder="ejemplo@correo.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  style={{
                    padding: '0.625rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
              </div>

              {emailError && (
                <div style={{ padding: '0.5rem 0.75rem', backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '6px', fontSize: '0.775rem', color: '#b91c1c' }}>
                  {emailError}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  onClick={() => setIsEmailOpen(false)}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: 'white',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    color: '#475569',
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSendEmail}
                  disabled={isSendingEmail || !emailInput || emailSuccess}
                  style={{
                    padding: '0.5rem 1.25rem',
                    backgroundColor: '#1d4ed8',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1e40af')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1d4ed8')}
                >
                  {isSendingEmail ? (
                    <>
                      <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                      Enviando...
                    </>
                  ) : emailSuccess ? (
                    <>
                      <CheckCircle size={14} color="#4ade80" /> ¡Enviado!
                    </>
                  ) : (
                    <>
                      Enviar <Send size={12} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CSS style block for slideUp animation */}
      <style jsx global>{`
        @keyframes slideUp {
          from {
            transform: translate(-50%, 100%);
            opacity: 0;
          }
          to {
            transform: translate(-50%, 0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
