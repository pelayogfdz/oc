'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { Eye, Printer, RotateCcw, Calendar, User, MapPin, Tag, Receipt, Send, Share2, Loader2, CheckCircle, Mail, Download, X, AlertTriangle } from 'lucide-react';
import { sendSaleByEmail } from '@/app/actions/sale';
import { formatCurrency } from '@/lib/utils';

export default function VentasHistoryClient({
  initialSales,
  branches,
  users,
  currentBranch,
  timezone
}: {
  initialSales: any[];
  branches: any[];
  users: any[];
  currentBranch: any;
  timezone: string;
}) {
  const [filterDate, setFilterDate] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterBranch, setFilterBranch] = useState(currentBranch.id === 'GLOBAL' ? '' : currentBranch.id);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [filterCfdi, setFilterCfdi] = useState('');

  // WhatsApp Share States
  const [isWhatsappOpen, setIsWhatsappOpen] = useState(false);
  const [activeSale, setActiveSale] = useState<any>(null);
  const [phone, setPhone] = useState('');
  const [prospects, setProspects] = useState<any[]>([]);
  const [selectedProspectId, setSelectedProspectId] = useState<string>('');
  const [isLoadingProspects, setIsLoadingProspects] = useState(false);
  const [isSendingWhatsapp, setIsSendingWhatsapp] = useState(false);
  const [whatsappSuccess, setWhatsappSuccess] = useState(false);
  const [whatsappError, setWhatsappError] = useState<string | null>(null);

  // Email Share States
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
    const formattedTotal = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(sale.total);
    const link = `${window.location.origin}/ventas/detalle/${sale.id}/imprimir`;
    const displayFolio = sale.folio || sale.id.slice(0, 8).toUpperCase();
    return `¡Hola ${sale.customer?.name || 'Cliente'}! Le comparto el comprobante de su compra en CAANMA.\n\n` +
      `*Folio de Venta:* #${displayFolio}\n` +
      `*Total:* ${formattedTotal}\n\n` +
      `Puede ver e imprimir su nota de venta en el siguiente enlace:\n${link}\n\n` +
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
      const result = await sendSaleByEmail(activeSale.id, emailInput);
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

  // Extract unique statuses present in sales
  const statuses = useMemo(() => {
    const sSet = new Set<string>();
    initialSales.forEach(s => {
      if (s.status) sSet.add(s.status);
    });
    return Array.from(sSet);
  }, [initialSales]);

  // Filter logic
  const filteredSales = useMemo(() => {
    return initialSales.filter(sale => {
      // Date filter
      if (filterDate) {
        const saleDateStr = new Date(sale.createdAt).toLocaleDateString('sv-SE', { timeZone: timezone });
        if (saleDateStr !== filterDate) return false;
      }
      
      // User filter
      if (filterUser && sale.userId !== filterUser) {
        return false;
      }

      // Branch filter
      if (filterBranch && sale.branchId !== filterBranch) {
        return false;
      }

      // Status filter
      if (filterStatus && sale.status !== filterStatus) {
        return false;
      }

      // Client filter
      if (filterClient) {
        const clientName = sale.customer?.name || '';
        if (!clientName.toLowerCase().includes(filterClient.toLowerCase())) {
          return false;
        }
      }

      // CFDI filter
      if (filterCfdi) {
        const folioCfdi = sale.invoiceId || '';
        if (!folioCfdi.toLowerCase().includes(filterCfdi.toLowerCase())) {
          return false;
        }
      }

      return true;
    });
  }, [initialSales, filterDate, filterUser, filterBranch, filterStatus, filterClient, filterCfdi]);

  const hasActiveFilters = filterDate || filterUser || (currentBranch.id === 'GLOBAL' && filterBranch) || filterStatus || filterClient || filterCfdi;

  const handleClearFilters = () => {
    setFilterDate('');
    setFilterUser('');
    setFilterBranch(currentBranch.id === 'GLOBAL' ? '' : currentBranch.id);
    setFilterStatus('');
    setFilterClient('');
    setFilterCfdi('');
  };

  return (
    <div>
      <div className="page-header-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 className="page-header-title" style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>Historial de Ventas</h1>
          <p className="page-header-subtitle" style={{ color: 'var(--caanma-text-muted)', margin: 0 }}>Módulo de ventas y cortes de caja</p>
        </div>
        <div className="page-header-actions">
          <Link href="/ventas/nueva" className="btn-primary" style={{ padding: '0.75rem 1.5rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            + Nueva Venta / TPV
          </Link>
        </div>
      </div>

      {/* Filters Section */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
        gap: '1rem', 
        marginBottom: '1.5rem', 
        padding: '1.25rem', 
        backgroundColor: '#f8fafc', 
        borderRadius: '12px', 
        border: '1px solid var(--caanma-border)' 
      }}>
        {/* Date Filter */}
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', fontWeight: '600', color: 'var(--caanma-text-muted)', marginBottom: '0.5rem' }}>
            <Calendar size={14} /> Fecha
          </label>
          <input 
            type="date" 
            value={filterDate} 
            onChange={(e) => setFilterDate(e.target.value)} 
            style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid var(--caanma-border)', outline: 'none', backgroundColor: 'white', fontSize: '0.9rem' }} 
          />
        </div>

        {/* Client Filter */}
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', fontWeight: '600', color: 'var(--caanma-text-muted)', marginBottom: '0.5rem' }}>
            <User size={14} /> Cliente
          </label>
          <input 
            type="text" 
            placeholder="Buscar por cliente" 
            value={filterClient} 
            onChange={(e) => setFilterClient(e.target.value)} 
            style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid var(--caanma-border)', outline: 'none', backgroundColor: 'white', fontSize: '0.9rem' }} 
          />
        </div>

        {/* CFDI Filter */}
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', fontWeight: '600', color: 'var(--caanma-text-muted)', marginBottom: '0.5rem' }}>
            <Receipt size={14} /> Folio CFDI
          </label>
          <input 
            type="text" 
            placeholder="Buscar folio CFDI" 
            value={filterCfdi} 
            onChange={(e) => setFilterCfdi(e.target.value)} 
            style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid var(--caanma-border)', outline: 'none', backgroundColor: 'white', fontSize: '0.9rem' }} 
          />
        </div>

        {/* Seller Filter */}
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', fontWeight: '600', color: 'var(--caanma-text-muted)', marginBottom: '0.5rem' }}>
            <User size={14} /> Vendedor
          </label>
          <select 
            value={filterUser} 
            onChange={(e) => setFilterUser(e.target.value)} 
            style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid var(--caanma-border)', outline: 'none', backgroundColor: 'white', fontSize: '0.9rem' }}
          >
            <option value="">Todos los vendedores</option>
            {users.map((u: any) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>

        {/* Branch Filter */}
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', fontWeight: '600', color: 'var(--caanma-text-muted)', marginBottom: '0.5rem' }}>
            <MapPin size={14} /> Sucursal
          </label>
          <select 
            value={filterBranch} 
            onChange={(e) => setFilterBranch(e.target.value)} 
            disabled={currentBranch.id !== 'GLOBAL'}
            style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid var(--caanma-border)', outline: 'none', backgroundColor: currentBranch.id !== 'GLOBAL' ? '#f1f5f9' : 'white', fontSize: '0.9rem' }}
          >
            {currentBranch.id === 'GLOBAL' ? (
              <>
                <option value="">Todas las sucursales</option>
                {branches.map((b: any) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </>
            ) : (
              <option value={currentBranch.id}>{currentBranch.name}</option>
            )}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', fontWeight: '600', color: 'var(--caanma-text-muted)', marginBottom: '0.5rem' }}>
            <Tag size={14} /> Estado
          </label>
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)} 
            style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid var(--caanma-border)', outline: 'none', backgroundColor: 'white', fontSize: '0.9rem' }}
          >
            <option value="">Todos los estados</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status === 'COMPLETED' ? 'Completado' : status === 'CANCELLED' ? 'Cancelado' : status}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
          <button 
            type="button" 
            onClick={handleClearFilters}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.5rem 1rem', fontSize: '0.85rem', color: '#dc2626', backgroundColor: '#fee2e2', border: '1px solid #fecaca', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }}
          >
            <RotateCcw size={14} /> Limpiar Filtros
          </button>
        </div>
      )}

      {/* Table Section */}
      <div className="card">
        <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--caanma-border)', backgroundColor: '#f9fafb' }}>
              <th style={{ padding: '1rem', color: 'var(--caanma-text-muted)', fontWeight: '500' }}>ID Venta</th>
              <th style={{ padding: '1rem', color: 'var(--caanma-text-muted)', fontWeight: '500' }}>Fecha / Hora</th>
              <th style={{ padding: '1rem', color: 'var(--caanma-text-muted)', fontWeight: '500' }}>Cliente</th>
              <th style={{ padding: '1rem', color: 'var(--caanma-text-muted)', fontWeight: '500' }}>Folio CFDI</th>
              <th style={{ padding: '1rem', color: 'var(--caanma-text-muted)', fontWeight: '500' }}>Sucursal / Vendedor</th>
              <th style={{ padding: '1rem', color: 'var(--caanma-text-muted)', fontWeight: '500', textAlign: 'right' }}>Artículos</th>
              <th style={{ padding: '1rem', color: 'var(--caanma-text-muted)', fontWeight: '500', textAlign: 'right' }}>Total</th>
              <th style={{ padding: '1rem', color: 'var(--caanma-text-muted)', fontWeight: '500', textAlign: 'center' }}>Estado</th>
              <th style={{ padding: '1rem', color: 'var(--caanma-text-muted)', fontWeight: '500', textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredSales.map(sale => {
              const qtySum = sale.items.reduce((sum: number, item: any) => sum + item.quantity, 0);
              return (
                <tr key={sale.id} style={{ borderBottom: '1px solid var(--caanma-border)' }}>
                  <td data-label="ID Venta" style={{ padding: '1rem', fontFamily: 'monospace', fontWeight: 'bold' }}>
                    {sale.folio || sale.id.slice(0, 8).toUpperCase()}
                  </td>
                  <td data-label="Fecha / Hora" style={{ padding: '1rem' }}>
                    {new Date(sale.createdAt).toLocaleString('es-MX', { timeZone: timezone })}
                  </td>
                  <td data-label="Cliente" style={{ padding: '1rem' }}>
                    {sale.customer ? (
                      <div style={{ fontWeight: '500' }}>{sale.customer.name}</div>
                    ) : (
                      <div style={{ color: 'var(--caanma-text-muted)', fontStyle: 'italic' }}>Público General</div>
                    )}
                  </td>
                  <td data-label="Folio CFDI" style={{ padding: '1rem' }}>
                    {sale.invoiceId ? (
                      <a 
                        href={`/api/facturacion/download?invoiceId=${sale.invoiceId}&format=pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ 
                          fontFamily: 'monospace', 
                          fontSize: '0.85rem', 
                          fontWeight: 'bold', 
                          color: '#1d4ed8', 
                          backgroundColor: '#eff6ff', 
                          border: '1px solid #bfdbfe',
                          padding: '0.2rem 0.4rem', 
                          borderRadius: '4px',
                          textDecoration: 'none',
                          display: 'inline-block'
                        }} 
                        title="Ver PDF de la Factura (CFDI)"
                      >
                        {sale.invoiceFolio || sale.invoiceId.substring(0, 8).toUpperCase()}
                      </a>
                    ) : (
                      <span style={{ color: 'var(--caanma-text-muted)' }}>-</span>
                    )}
                  </td>
                  <td data-label="Sucursal / Vendedor" style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: '500' }}>{sale.branch?.name || currentBranch.name}</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--caanma-text-muted)' }}>Vendió: {sale.user.name}</div>
                  </td>
                  <td data-label="Artículos" style={{ padding: '1rem', textAlign: 'right', color: 'var(--caanma-text-muted)' }}>
                    {new Intl.NumberFormat('es-MX').format(qtySum)} Pzas
                  </td>
                  <td data-label="Total" style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold' }}>
                    {formatCurrency(sale.total)}
                  </td>
                  <td data-label="Estado" style={{ padding: '1rem', textAlign: 'center' }}>
                    <span style={{ 
                      padding: '0.25rem 0.5rem', 
                      borderRadius: '12px', 
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      backgroundColor: sale.status === 'COMPLETED' ? '#dcfce7' : sale.status === 'CANCELLED' ? '#fee2e2' : '#f1f5f9',
                      color: sale.status === 'COMPLETED' ? '#166534' : sale.status === 'CANCELLED' ? '#991b1b' : '#334155'
                    }}>
                      {sale.status === 'COMPLETED' ? 'Completado' : sale.status === 'CANCELLED' ? 'Cancelado' : sale.status}
                    </span>
                  </td>
                  <td data-label="Acciones" style={{ padding: '1rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                      {/* Detalle */}
                      <Link
                        href={`/ventas/detalle/${sale.id}`}
                        title="Ver Detalle"
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
                          color: '#334155',
                          textDecoration: 'none',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#e2e8f0';
                          e.currentTarget.style.borderColor = '#94a3b8';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#f1f5f9';
                          e.currentTarget.style.borderColor = '#cbd5e1';
                        }}
                      >
                        <Eye size={15} />
                        Detalle
                      </Link>

                      {/* Imprimir */}
                      <a
                        href={`/ventas/detalle/${sale.id}/imprimir`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Imprimir Nota (A4)"
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

                      {/* Ticket */}
                      <a
                        href={`/ventas/detalle/${sale.id}/imprimir-ticket`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Imprimir Ticket Térmico"
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
                          color: '#334155',
                          textDecoration: 'none',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#e2e8f0';
                          e.currentTarget.style.borderColor = '#94a3b8';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#f1f5f9';
                          e.currentTarget.style.borderColor = '#cbd5e1';
                        }}
                      >
                        <Receipt size={15} />
                        Ticket
                      </a >

                      {/* WhatsApp */}
                      <button
                        onClick={() => handleOpenWhatsappModal(sale)}
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

                      {/* Enviar por mail */}
                      <button
                        onClick={() => handleOpenEmailModal(sale)}
                        title="Enviar por Correo Electrónico"
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
                    </div>
                  </td>
                </tr>
              )
            })}
            {filteredSales.length === 0 && (
              <tr>
                <td colSpan={9} style={{ padding: '3rem', textAlign: 'center', color: 'var(--caanma-text-muted)' }}>
                  No se encontraron ventas con los filtros seleccionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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
                  💬 Compartir Venta #{activeSale.folio || activeSale.id.slice(0, 8).toUpperCase()}
                </h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', opacity: 0.9 }}>
                  Elige la forma preferida de enviarle el comprobante a tu cliente.
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
                  Envía el link directamente usando la sesión de WhatsApp vinculada en la plataforma.
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
                  ✉️ Enviar Venta por Correo
                </h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', opacity: 0.9 }}>
                  Envía el comprobante de venta digital a tu cliente.
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
    </div>
  );
}
