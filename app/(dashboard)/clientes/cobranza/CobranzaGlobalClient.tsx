'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, History, ArrowRight, X, FileText, Send, Copy, Check, ExternalLink } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export default function CobranzaGlobalClient({ initialData }: { initialData: any[] }) {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'NOT_OVERDUE' | '0_15' | '15_30' | '30_60' | '60_90' | '90_PLUS'>('ALL');
  const [selectedGroup, setSelectedGroup] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);

  const getDaysOverdue = (dueDateStr: string | null | undefined): number => {
    if (!dueDateStr) return -1;
    const dueDate = new Date(dueDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    
    const diffTime = today.getTime() - dueDate.getTime();
    if (diffTime <= 0) return 0;
    
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  const getOldestDueDateText = (dueDateStr: string | null): { text: string; isOverdue: boolean } => {
    if (!dueDateStr) return { text: 'N/A', isOverdue: false };
    const dueDate = new Date(dueDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    
    const diffTime = today.getTime() - dueDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 0) {
      return { text: `Vencido hace ${diffDays} día(s) (${dueDate.toLocaleDateString()})`, isOverdue: true };
    } else if (diffDays === 0) {
      return { text: `Vence hoy (${dueDate.toLocaleDateString()})`, isOverdue: true };
    } else {
      return { text: `Vence en ${Math.abs(diffDays)} día(s) (${dueDate.toLocaleDateString()})`, isOverdue: false };
    }
  };

  const buckets = {
    ALL: { label: 'Todos', sales: [] as any[], total: 0 },
    NOT_OVERDUE: { label: 'Sin Vencer', sales: [] as any[], total: 0 },
    '0_15': { label: '0 a 15 días', sales: [] as any[], total: 0 },
    '15_30': { label: '15 a 30 días', sales: [] as any[], total: 0 },
    '30_60': { label: '30 a 60 días', sales: [] as any[], total: 0 },
    '60_90': { label: '60 a 90 días', sales: [] as any[], total: 0 },
    '90_PLUS': { label: 'Más de 90 días', sales: [] as any[], total: 0 }
  };

  initialData.forEach(sale => {
    const days = getDaysOverdue(sale.dueDate);
    buckets.ALL.sales.push(sale);
    buckets.ALL.total += sale.balanceDue || 0;

    if (days === 0 || days === -1) {
      buckets.NOT_OVERDUE.sales.push(sale);
      buckets.NOT_OVERDUE.total += sale.balanceDue || 0;
    } else if (days > 0 && days <= 15) {
      buckets['0_15'].sales.push(sale);
      buckets['0_15'].total += sale.balanceDue || 0;
    } else if (days > 15 && days <= 30) {
      buckets['15_30'].sales.push(sale);
      buckets['15_30'].total += sale.balanceDue || 0;
    } else if (days > 30 && days <= 60) {
      buckets['30_60'].sales.push(sale);
      buckets['30_60'].total += sale.balanceDue || 0;
    } else if (days > 60 && days <= 90) {
      buckets['60_90'].sales.push(sale);
      buckets['60_90'].total += sale.balanceDue || 0;
    } else if (days > 90) {
      buckets['90_PLUS'].sales.push(sale);
      buckets['90_PLUS'].total += sale.balanceDue || 0;
    }
  });

  const activeBucketSales = buckets[activeFilter].sales;

  const filteredSales = activeBucketSales.filter(sale => {
    const term = search.toLowerCase();
    const customerMatch = sale.customer?.name?.toLowerCase().includes(term);
    const saleIdMatch = sale.id.toLowerCase().includes(term);
    const folioMatch = sale.folio?.toLowerCase().includes(term);
    return customerMatch || saleIdMatch || folioMatch;
  });

  // Group filtered sales by customer
  const groupedClients = useMemo(() => {
    const groups: { [customerId: string]: { customer: any; sales: any[]; totalBalanceDue: number; oldestDueDate: string | null } } = {};
    
    filteredSales.forEach(sale => {
      const customerId = sale.customer?.id || 'public';
      if (!groups[customerId]) {
        groups[customerId] = {
          customer: sale.customer || { id: 'public', name: 'Público en General', phone: '' },
          sales: [],
          totalBalanceDue: 0,
          oldestDueDate: null
        };
      }
      groups[customerId].sales.push(sale);
      groups[customerId].totalBalanceDue += sale.balanceDue || 0;
      
      if (sale.dueDate) {
        if (!groups[customerId].oldestDueDate || new Date(sale.dueDate) < new Date(groups[customerId].oldestDueDate!)) {
          groups[customerId].oldestDueDate = sale.dueDate;
        }
      }
    });

    return Object.values(groups).sort((a, b) => b.totalBalanceDue - a.totalBalanceDue);
  }, [filteredSales]);

  const totalDeudaGlobal = filteredSales.reduce((acc, sale) => acc + (sale.balanceDue || 0), 0);

  const handleCopyLink = async (customerId: string) => {
    const link = `${window.location.origin}/api/clientes/${customerId}/estado-de-cuenta`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      alert(`Enlace: ${link}`);
    }
  };

  const handleSendWhatsApp = (client: any) => {
    const phone = client.customer.phone ? client.customer.phone.replace(/\D/g, '') : '';
    const msgText = `Hola, le compartimos su Estado de Cuenta. Su saldo total pendiente es ${formatCurrency(client.totalBalanceDue)}. Puede consultarlo e imprimirlo en el siguiente enlace: ${window.location.origin}/api/clientes/${client.customer.id}/estado-de-cuenta`;
    const waUrl = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(msgText)}`;
    window.open(waUrl, '_blank');
  };

  const handleViewPdf = (customerId: string) => {
    window.open(`/api/clientes/${customerId}/estado-de-cuenta`, '_blank');
  };

  return (
    <div className="card">
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '300px', position: 'relative' }}>
                <Search size={18} style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '1rem', color: '#94a3b8' }} />
                <input 
                    type="text" 
                    placeholder="Buscar por cliente o folio de venta..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
            </div>
            <div style={{ padding: '0.75rem 1.5rem', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '8px', fontWeight: 'bold' }}>
                Deuda Global Filtrada: {formatCurrency(totalDeudaGlobal, 2)}
            </div>
        </div>

        {/* Filtros de Vencimiento */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
          {(Object.keys(buckets) as Array<keyof typeof buckets>).map((key) => {
            const bucket = buckets[key];
            const isActive = activeFilter === key;
            return (
              <button
                key={key}
                onClick={() => setActiveFilter(key)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '9999px',
                  border: isActive ? '1px solid var(--caanma-primary)' : '1px solid #e2e8f0',
                  backgroundColor: isActive ? 'rgba(109, 40, 217, 0.08)' : 'white',
                  color: isActive ? 'var(--caanma-primary)' : '#64748b',
                  fontSize: '0.85rem',
                  fontWeight: isActive ? 'bold' : 'normal',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.2s ease',
                  boxShadow: isActive ? '0 1px 3px rgba(109, 40, 217, 0.1)' : 'none'
                }}
              >
                <span>{bucket.label}</span>
                <span style={{ 
                  fontSize: '0.75rem', 
                  backgroundColor: isActive ? 'var(--caanma-primary)' : '#f1f5f9', 
                  color: isActive ? 'white' : '#64748b', 
                  padding: '0.1rem 0.4rem', 
                  borderRadius: '9999px',
                  fontWeight: 'bold'
                }}>
                  {bucket.sales.length}
                </span>
                <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                  ({formatCurrency(bucket.total, 2)})
                </span>
              </button>
            );
          })}
        </div>

        <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: '#f8fafc' }}>
                <tr>
                    <th style={{ padding: '1rem', borderBottom: '1px solid var(--caanma-border)' }}>Cliente</th>
                    <th style={{ padding: '1rem', borderBottom: '1px solid var(--caanma-border)', textAlign: 'center' }}>Facturas / Ventas</th>
                    <th style={{ padding: '1rem', borderBottom: '1px solid var(--caanma-border)' }}>Vencimiento Más Antiguo</th>
                    <th style={{ padding: '1rem', borderBottom: '1px solid var(--caanma-border)', textAlign: 'right' }}>Deuda Total</th>
                    <th style={{ padding: '1rem', borderBottom: '1px solid var(--caanma-border)', textAlign: 'center' }}>Acciones</th>
                </tr>
            </thead>
            <tbody>
                {groupedClients.map((client: any) => {
                    const overdueInfo = getOldestDueDateText(client.oldestDueDate);
                    return (
                        <tr key={client.customer.id} style={{ borderBottom: '1px solid var(--caanma-border)' }}>
                            <td data-label="Cliente" style={{ padding: '1rem', fontWeight: 'bold' }}>
                                {client.customer.name}
                            </td>
                            <td data-label="Facturas / Ventas" style={{ padding: '1rem', textAlign: 'center' }}>
                                <span style={{ backgroundColor: '#f1f5f9', color: '#475569', padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', border: '1px solid #cbd5e1' }}>
                                    {client.sales.length} doctos.
                                </span>
                            </td>
                            <td data-label="Vencimiento Más Antiguo" style={{ padding: '1rem', fontWeight: '500', color: overdueInfo.isOverdue ? '#dc2626' : '#16a34a' }}>
                                {overdueInfo.text}
                            </td>
                            <td data-label="Deuda Total" style={{ padding: '1rem', fontWeight: 'bold', color: '#dc2626', fontSize: '1.1rem', textAlign: 'right' }}>
                                {formatCurrency(client.totalBalanceDue, 2)}
                            </td>
                            <td data-label="Acciones" style={{ padding: '1rem' }}>
                                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', alignItems: 'center' }}>
                                    <button
                                        onClick={() => setSelectedGroup(client)}
                                        style={{ border: '1px solid #cbd5e1', padding: '0.35rem 0.75rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', backgroundColor: 'white', color: 'var(--caanma-primary)', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', transition: 'all 0.15s ease' }}
                                    >
                                        Detalle de Facturas
                                    </button>
                                    {client.customer?.id && client.customer.id !== 'public' && (
                                        <Link href={`/clientes/${client.customer.id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', textDecoration: 'none', color: '#64748b', fontWeight: 'bold', fontSize: '0.8rem' }}>
                                            Ir al Perfil y Abonar <ArrowRight size={14}/>
                                        </Link>
                                    )}
                                </div>
                            </td>
                        </tr>
                    )
                })}
                {groupedClients.length === 0 && (
                    <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                            <History size={32} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                            No hay cuentas pendientes o coincidencia con tu búsqueda.
                        </td>
                    </tr>
                )}
            </tbody>
        </table>

        {/* Modal Detalle de Facturas */}
        {selectedGroup && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
            <div style={{ backgroundColor: 'white', borderRadius: '12px', width: '750px', maxWidth: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
              {/* Header */}
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1e293b' }}>Detalle de Cuentas por Cobrar</h3>
                  <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.15rem' }}>{selectedGroup.customer.name}</p>
                </div>
                <button 
                  onClick={() => setSelectedGroup(null)}
                  style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '4px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}
                >
                  <X size={20} />
                </button>
              </div>
              
              {/* Actions panel */}
              {selectedGroup.customer.id !== 'public' && (
                <div style={{ padding: '1rem 1.5rem', backgroundColor: '#f0fdf4', borderBottom: '1px solid #bbf7d0', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#166534', marginRight: 'auto' }}>
                    Deuda Total: {formatCurrency(selectedGroup.totalBalanceDue, 2)}
                  </span>
                  <button 
                    onClick={() => handleViewPdf(selectedGroup.customer.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.5rem 0.75rem', backgroundColor: '#ffffff', border: '1px solid #bbf7d0', borderRadius: '6px', color: '#15803d', fontWeight: 'bold', fontSize: '0.825rem', cursor: 'pointer' }}
                  >
                    <FileText size={15} /> Ver PDF
                  </button>
                  <button 
                    onClick={() => handleSendWhatsApp(selectedGroup)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.5rem 0.75rem', backgroundColor: '#25d366', border: 'none', borderRadius: '6px', color: 'white', fontWeight: 'bold', fontSize: '0.825rem', cursor: 'pointer' }}
                  >
                    <Send size={15} /> WhatsApp
                  </button>
                  <button 
                    onClick={() => handleCopyLink(selectedGroup.customer.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.5rem 0.75rem', backgroundColor: '#ffffff', border: '1px solid #bbf7d0', borderRadius: '6px', color: '#15803d', fontWeight: 'bold', fontSize: '0.825rem', cursor: 'pointer', minWidth: '120px', justifyContent: 'center' }}
                  >
                    {copied ? <><Check size={15} /> Copiado</> : <><Copy size={15} /> Copiar Enlace</>}
                  </button>
                </div>
              )}

              {/* List */}
              <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569', fontWeight: '600' }}>
                      <th style={{ padding: '0.5rem', textAlign: 'left' }}>Folio</th>
                      <th style={{ padding: '0.5rem', textAlign: 'left' }}>Fecha</th>
                      <th style={{ padding: '0.5rem', textAlign: 'left' }}>Vencimiento</th>
                      <th style={{ padding: '0.5rem', textAlign: 'right' }}>Deuda</th>
                      <th style={{ padding: '0.5rem', textAlign: 'center' }}>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedGroup.sales.map((sale: any) => {
                      const overdueInfo = getOldestDueDateText(sale.dueDate);
                      return (
                        <tr key={sale.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '0.75rem 0.5rem', fontFamily: 'monospace', fontWeight: '500' }}>
                            {sale.folio ? `#${sale.folio}` : `#${sale.id.slice(0,8).toUpperCase()}`}
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem', color: '#64748b' }}>
                            {new Date(sale.createdAt).toLocaleDateString()}
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem', color: overdueInfo.isOverdue ? '#dc2626' : '#16a34a', fontWeight: '500' }}>
                            {sale.dueDate ? new Date(sale.dueDate).toLocaleDateString() : 'N/A'}
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontWeight: 'bold', color: '#dc2626' }}>
                            {formatCurrency(sale.balanceDue, 2)}
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                            <Link 
                              href={`/ventas/detalle/${sale.id}`} 
                              target="_blank"
                              style={{ color: '#4f46e5', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.15rem' }}
                            >
                              Ver Venta <ExternalLink size={12} />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              {/* Footer */}
              <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', backgroundColor: '#f8fafc' }}>
                <button 
                  onClick={() => setSelectedGroup(null)}
                  className="btn-secondary"
                  style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white', color: '#334155', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
