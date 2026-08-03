'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, Calculator, ArrowRight, X, FileText, Send, Copy, Check, ExternalLink, Printer, Download, ArrowUpDown } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { exportToExcel } from '@/lib/exportExcel';

interface Branch {
  id: string;
  name: string;
}

interface Sale {
  id: string;
  folio: string | null;
  createdAt: string;
  dueDate: string | null;
  balanceDue: number;
  paymentMethod: string;
  status: string;
  branchId: string;
  customer: {
    id: string;
    name: string;
    phone: string | null;
  } | null;
  branch: Branch;
}

export default function CuentasPorCobrarReportClient({
  initialSales,
  branches
}: {
  initialSales: Sale[];
  branches: Branch[];
}) {
  const [search, setSearch] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('ALL');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'NOT_OVERDUE' | '0_15' | '15_30' | '30_60' | '60_90' | '90_PLUS'>('ALL');
  const [selectedGroup, setSelectedGroup] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);
  const [sortBy, setSortBy] = useState<'NAME' | 'AMOUNT' | 'ANTIQUITY'>('AMOUNT');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

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

  const getOldestDueDateText = (dueDateStr: string | null): { text: string; isOverdue: boolean; days: number } => {
    if (!dueDateStr) return { text: 'N/A', isOverdue: false, days: -9999 };
    const dueDate = new Date(dueDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    
    const diffTime = today.getTime() - dueDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 0) {
      return { text: `Vencido hace ${diffDays} día(s) (${dueDate.toLocaleDateString()})`, isOverdue: true, days: diffDays };
    } else if (diffDays === 0) {
      return { text: `Vence hoy (${dueDate.toLocaleDateString()})`, isOverdue: true, days: 0 };
    } else {
      return { text: `Vence en ${Math.abs(diffDays)} día(s) (${dueDate.toLocaleDateString()})`, isOverdue: false, days: diffDays };
    }
  };

  // Step 1: Filter sales by branch and search term first
  const branchFilteredSales = useMemo(() => {
    return initialSales.filter(sale => {
      if (selectedBranchId !== 'ALL' && sale.branchId !== selectedBranchId) {
        return false;
      }
      if (search.trim() !== '') {
        const term = search.toLowerCase();
        const customerName = sale.customer?.name?.toLowerCase() || '';
        const folioStr = sale.folio?.toLowerCase() || '';
        const saleId = sale.id.toLowerCase();
        if (!customerName.includes(term) && !folioStr.includes(term) && !saleId.includes(term)) {
          return false;
        }
      }
      return true;
    });
  }, [initialSales, selectedBranchId, search]);

  // Step 2: Categorize into buckets
  const buckets = useMemo(() => {
    const categories = {
      ALL: { label: 'Todos', sales: [] as Sale[], total: 0 },
      NOT_OVERDUE: { label: 'Sin Vencer', sales: [] as Sale[], total: 0 },
      '0_15': { label: '0 a 15 días', sales: [] as Sale[], total: 0 },
      '15_30': { label: '15 a 30 días', sales: [] as Sale[], total: 0 },
      '30_60': { label: '30 a 60 días', sales: [] as Sale[], total: 0 },
      '60_90': { label: '60 a 90 días', sales: [] as Sale[], total: 0 },
      '90_PLUS': { label: 'Más de 90 días', sales: [] as Sale[], total: 0 }
    };

    branchFilteredSales.forEach(sale => {
      const days = getDaysOverdue(sale.dueDate);
      categories.ALL.sales.push(sale);
      categories.ALL.total += sale.balanceDue || 0;

      if (days === 0 || days === -1) {
        categories.NOT_OVERDUE.sales.push(sale);
        categories.NOT_OVERDUE.total += sale.balanceDue || 0;
      } else if (days > 0 && days <= 15) {
        categories['0_15'].sales.push(sale);
        categories['0_15'].total += sale.balanceDue || 0;
      } else if (days > 15 && days <= 30) {
        categories['15_30'].sales.push(sale);
        categories['15_30'].total += sale.balanceDue || 0;
      } else if (days > 30 && days <= 60) {
        categories['30_60'].sales.push(sale);
        categories['30_60'].total += sale.balanceDue || 0;
      } else if (days > 60 && days <= 90) {
        categories['60_90'].sales.push(sale);
        categories['60_90'].total += sale.balanceDue || 0;
      } else if (days > 90) {
        categories['90_PLUS'].sales.push(sale);
        categories['90_PLUS'].total += sale.balanceDue || 0;
      }
    });

    return categories;
  }, [branchFilteredSales]);

  // Step 3: Get sales of the active filter/bucket
  const activeBucketSales = useMemo(() => {
    return buckets[activeFilter].sales;
  }, [buckets, activeFilter]);

  // Step 4: Group filtered sales by customer
  const groupedClients = useMemo(() => {
    const groups: { [customerId: string]: { customer: any; sales: Sale[]; totalBalanceDue: number; oldestDueDate: string | null; branches: Set<string> } } = {};
    
    activeBucketSales.forEach(sale => {
      const customerId = sale.customer?.id || 'public';
      if (!groups[customerId]) {
        groups[customerId] = {
          customer: sale.customer || { id: 'public', name: 'Público en General', phone: '' },
          sales: [],
          totalBalanceDue: 0,
          oldestDueDate: null,
          branches: new Set<string>()
        };
      }
      groups[customerId].sales.push(sale);
      groups[customerId].totalBalanceDue += sale.balanceDue || 0;
      groups[customerId].branches.add(sale.branch.name);
      
      if (sale.dueDate) {
        if (!groups[customerId].oldestDueDate || new Date(sale.dueDate) < new Date(groups[customerId].oldestDueDate!)) {
          groups[customerId].oldestDueDate = sale.dueDate;
        }
      }
    });

    const list = Object.values(groups);

    // Apply Sorting
    list.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'NAME') {
        const nameA = a.customer.name.toLowerCase();
        const nameB = b.customer.name.toLowerCase();
        comparison = nameA.localeCompare(nameB);
      } else if (sortBy === 'AMOUNT') {
        comparison = a.totalBalanceDue - b.totalBalanceDue;
      } else if (sortBy === 'ANTIQUITY') {
        const dateA = a.oldestDueDate ? new Date(a.oldestDueDate).getTime() : 9999999999999;
        const dateB = b.oldestDueDate ? new Date(b.oldestDueDate).getTime() : 9999999999999;
        comparison = dateA - dateB;
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return list;
  }, [activeBucketSales, sortBy, sortOrder]);

  // Totals calculations
  const totals = useMemo(() => {
    let totalCobrar = 0;
    let totalVencido = 0;
    let totalCorriente = 0;
    let totalDocs = 0;

    branchFilteredSales.forEach(sale => {
      const balance = sale.balanceDue || 0;
      totalCobrar += balance;
      totalDocs++;
      const days = getDaysOverdue(sale.dueDate);
      if (days > 0) {
        totalVencido += balance;
      } else {
        totalCorriente += balance;
      }
    });

    return { totalCobrar, totalVencido, totalCorriente, totalDocs };
  }, [branchFilteredSales]);

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

  const downloadExcel = () => {
    const headers = ["Cliente", "Sucursal(es)", "Documentos Pendientes", "Vencimiento Más Antiguo", "Deuda Total"];
    const rows = groupedClients.map(client => {
      const overdueInfo = getOldestDueDateText(client.oldestDueDate);
      return [
        client.customer.name,
        Array.from(client.branches).join(', '),
        client.sales.length,
        overdueInfo.text,
        client.totalBalanceDue
      ];
    });
    exportToExcel(headers, rows, 'Reporte_Cuentas_Por_Cobrar');
  };

  const toggleSort = (field: 'NAME' | 'AMOUNT' | 'ANTIQUITY') => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Reporte de Cuentas por Cobrar (CxC)</h1>
          <p style={{ color: 'var(--caanma-text-muted)' }}>Saldos de crédito pendientes de clientes, vencimientos y antigüedad de deudas.</p>
        </div>
        <div className="no-print" style={{ display: 'flex', gap: '0.75rem' }}>
          <button 
            onClick={() => window.print()}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#6d28d9', color: 'white', border: 'none', padding: '0.65rem 1.25rem', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: 'background-color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor='#5b21b6'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor='#6d28d9'}
          >
            <Printer size={18} /> Imprimir / PDF
          </button>
          <button 
            onClick={downloadExcel}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#0f172a', color: 'white', border: 'none', padding: '0.65rem 1.25rem', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: 'background-color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor='#1e293b'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor='#0f172a'}
          >
            <Download size={18} /> Exportar Excel
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--caanma-border)', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
          <h3 style={{ fontSize: '0.85rem', color: 'var(--caanma-text-muted)', marginBottom: '0.5rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Cartera Total (CxC)</h3>
          <div style={{ fontSize: '1.85rem', fontWeight: '900', color: 'var(--caanma-text)' }}>{formatCurrency(totals.totalCobrar)}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--caanma-text-muted)', marginTop: '0.5rem' }}>{totals.totalDocs} documentos pendientes</div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--caanma-border)', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
          <h3 style={{ fontSize: '0.85rem', color: 'var(--caanma-text-muted)', marginBottom: '0.5rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Saldo Vencido</h3>
          <div style={{ fontSize: '1.85rem', fontWeight: '900', color: '#dc2626' }}>{formatCurrency(totals.totalVencido)}</div>
          <div style={{ fontSize: '0.8rem', color: '#dc2626', marginTop: '0.5rem', fontWeight: '500' }}>
            {totals.totalCobrar > 0 ? `${((totals.totalVencido / totals.totalCobrar) * 100).toFixed(1)}%` : '0%'} de la cartera
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--caanma-border)', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
          <h3 style={{ fontSize: '0.85rem', color: 'var(--caanma-text-muted)', marginBottom: '0.5rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Saldo al Corriente</h3>
          <div style={{ fontSize: '1.85rem', fontWeight: '900', color: '#16a34a' }}>{formatCurrency(totals.totalCorriente)}</div>
          <div style={{ fontSize: '0.8rem', color: '#16a34a', marginTop: '0.5rem', fontWeight: '500' }}>
            {totals.totalCobrar > 0 ? `${((totals.totalCorriente / totals.totalCobrar) * 100).toFixed(1)}%` : '0%'} al día
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: '1.5rem', backgroundColor: 'white', borderRadius: '12px', border: '1px solid var(--caanma-border)' }}>
        {/* Filters Panel */}
        <div className="no-print" style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '250px', position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '1rem', color: '#94a3b8' }} />
            <input 
              type="text" 
              placeholder="Buscar por cliente o folio..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', padding: '0.65rem 1rem 0.65rem 2.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.9rem' }}
            />
          </div>

          {/* Branch Select */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#475569' }}>Sucursal:</span>
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              style={{ padding: '0.6rem 2rem 0.6rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.875rem', backgroundColor: 'white', cursor: 'pointer' }}
            >
              <option value="ALL">Todas las Sucursales</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Age buckets tab filter */}
        <div className="no-print" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
          {(Object.keys(buckets) as Array<keyof typeof buckets>).map((key) => {
            const bucket = buckets[key];
            const isActive = activeFilter === key;
            return (
              <button
                key={key}
                onClick={() => setActiveFilter(key)}
                style={{
                  padding: '0.4rem 0.95rem',
                  borderRadius: '9999px',
                  border: isActive ? '1px solid var(--caanma-primary)' : '1px solid #e2e8f0',
                  backgroundColor: isActive ? 'rgba(109, 40, 217, 0.08)' : 'white',
                  color: isActive ? 'var(--caanma-primary)' : '#64748b',
                  fontSize: '0.825rem',
                  fontWeight: isActive ? 'bold' : 'normal',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>{bucket.label}</span>
                <span style={{ 
                  fontSize: '0.7rem', 
                  backgroundColor: isActive ? 'var(--caanma-primary)' : '#f1f5f9', 
                  color: isActive ? 'white' : '#64748b', 
                  padding: '0.05rem 0.35rem', 
                  borderRadius: '9999px',
                  fontWeight: 'bold'
                }}>
                  {bucket.sales.length}
                </span>
                <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>
                  ({formatCurrency(bucket.total, 0)})
                </span>
              </button>
            );
          })}
        </div>

        {/* Report Table */}
        <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: '#f8fafc' }}>
            <tr style={{ borderBottom: '1px solid var(--caanma-border)' }}>
              <th 
                onClick={() => toggleSort('NAME')} 
                style={{ padding: '0.85rem 1rem', cursor: 'pointer', userSelect: 'none' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 'bold', fontSize: '0.85rem', color: '#475569' }}>
                  Cliente <ArrowUpDown size={14} />
                </div>
              </th>
              {selectedBranchId === 'ALL' && (
                <th style={{ padding: '0.85rem 1rem', fontWeight: 'bold', fontSize: '0.85rem', color: '#475569' }}>Sucursal(es)</th>
              )}
              <th style={{ padding: '0.85rem 1rem', fontWeight: 'bold', fontSize: '0.85rem', color: '#475569', textAlign: 'center' }}>Documentos</th>
              <th 
                onClick={() => toggleSort('ANTIQUITY')} 
                style={{ padding: '0.85rem 1rem', cursor: 'pointer', userSelect: 'none' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 'bold', fontSize: '0.85rem', color: '#475569' }}>
                  Vencimiento Más Antiguo <ArrowUpDown size={14} />
                </div>
              </th>
              <th 
                onClick={() => toggleSort('AMOUNT')} 
                style={{ padding: '0.85rem 1rem', cursor: 'pointer', userSelect: 'none', textAlign: 'right' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 'bold', fontSize: '0.85rem', color: '#475569', justifyContent: 'flex-end' }}>
                  Deuda Total <ArrowUpDown size={14} />
                </div>
              </th>
              <th className="no-print" style={{ padding: '0.85rem 1rem', fontWeight: 'bold', fontSize: '0.85rem', color: '#475569', textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {groupedClients.map((client: any) => {
              const overdueInfo = getOldestDueDateText(client.oldestDueDate);
              return (
                <tr key={client.customer.id} style={{ borderBottom: '1px solid var(--caanma-border)', fontSize: '0.9rem' }}>
                  <td data-label="Cliente" style={{ padding: '0.85rem 1rem', fontWeight: 'bold' }}>
                    {client.customer.name}
                  </td>
                  {selectedBranchId === 'ALL' && (
                    <td data-label="Sucursal" style={{ padding: '0.85rem 1rem', color: '#64748b' }}>
                      {Array.from(client.branches).join(', ')}
                    </td>
                  )}
                  <td data-label="Documentos" style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                    <span style={{ backgroundColor: '#f1f5f9', color: '#475569', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.775rem', fontWeight: 'bold', border: '1px solid #cbd5e1' }}>
                      {client.sales.length} docs
                    </span>
                  </td>
                  <td data-label="Vencimiento" style={{ padding: '0.85rem 1rem', fontWeight: '500', color: overdueInfo.isOverdue ? '#dc2626' : '#16a34a' }}>
                    {overdueInfo.text}
                  </td>
                  <td data-label="Deuda" style={{ padding: '0.85rem 1rem', fontWeight: 'bold', color: '#dc2626', textAlign: 'right' }}>
                    {formatCurrency(client.totalBalanceDue)}
                  </td>
                  <td data-label="Acciones" className="no-print" style={{ padding: '0.85rem 1rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', alignItems: 'center' }}>
                      <button
                        onClick={() => setSelectedGroup(client)}
                        style={{ border: '1px solid #cbd5e1', padding: '0.3rem 0.6rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', backgroundColor: 'white', color: 'var(--caanma-primary)', fontSize: '0.775rem', transition: 'all 0.15s ease' }}
                      >
                        Ver Detalle
                      </button>
                      {client.customer?.id && client.customer.id !== 'public' && (
                        <Link href={`/clientes/${client.customer.id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.15rem', textDecoration: 'none', color: '#64748b', fontWeight: 'bold', fontSize: '0.775rem' }}>
                          Perfil <ArrowRight size={12}/>
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
            {groupedClients.length === 0 && (
              <tr>
                <td colSpan={selectedBranchId === 'ALL' ? 6 : 5} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                  No hay deudas o coincidencia con los filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Detalle de Facturas */}
      {selectedGroup && (
        <div className="no-print" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', width: '700px', maxWidth: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 'bold', color: '#1e293b' }}>Detalle de Cuentas por Cobrar</h3>
                <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.15rem' }}>{selectedGroup.customer.name}</p>
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
              <div style={{ padding: '1rem 1.5rem', backgroundColor: '#f0fdf4', borderBottom: '1px solid #bbf7d0', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#166534', marginRight: 'auto' }}>
                  Deuda Total: {formatCurrency(selectedGroup.totalBalanceDue)}
                </span>
                <button 
                  onClick={() => handleViewPdf(selectedGroup.customer.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.45rem 0.65rem', backgroundColor: '#ffffff', border: '1px solid #bbf7d0', borderRadius: '6px', color: '#15803d', fontWeight: 'bold', fontSize: '0.8rem', cursor: 'pointer' }}
                >
                  <FileText size={14} /> PDF
                </button>
                <button 
                  onClick={() => handleSendWhatsApp(selectedGroup)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.45rem 0.65rem', backgroundColor: '#25d366', border: 'none', borderRadius: '6px', color: 'white', fontWeight: 'bold', fontSize: '0.8rem', cursor: 'pointer' }}
                >
                  <Send size={14} /> WhatsApp
                </button>
                <button 
                  onClick={() => handleCopyLink(selectedGroup.customer.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.45rem 0.65rem', backgroundColor: '#ffffff', border: '1px solid #bbf7d0', borderRadius: '6px', color: '#15803d', fontWeight: 'bold', fontSize: '0.8rem', cursor: 'pointer', minWidth: '110px', justifyContent: 'center' }}
                >
                  {copied ? <><Check size={14} /> Copiado</> : <><Copy size={14} /> Enlace</>}
                </button>
              </div>
            )}

            {/* List */}
            <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
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
                  {selectedGroup.sales.map((sale: Sale) => {
                    const overdueInfo = getOldestDueDateText(sale.dueDate);
                    return (
                      <tr key={sale.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '0.65rem 0.5rem', fontFamily: 'monospace', fontWeight: '500' }}>
                          {sale.folio ? `#${sale.folio}` : `#${sale.id.slice(0,8).toUpperCase()}`}
                        </td>
                        <td style={{ padding: '0.65rem 0.5rem', color: '#64748b' }}>
                          {new Date(sale.createdAt).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '0.65rem 0.5rem', color: overdueInfo.isOverdue ? '#dc2626' : '#16a34a', fontWeight: '500' }}>
                          {sale.dueDate ? new Date(sale.dueDate).toLocaleDateString() : 'N/A'}
                        </td>
                        <td style={{ padding: '0.65rem 0.5rem', textAlign: 'right', fontWeight: 'bold', color: '#dc2626' }}>
                          {formatCurrency(sale.balanceDue)}
                        </td>
                        <td style={{ padding: '0.65rem 0.5rem', textAlign: 'center' }}>
                          <Link 
                            href={`/ventas/detalle/${sale.id}`} 
                            target="_blank"
                            style={{ color: '#4f46e5', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.825rem', display: 'inline-flex', alignItems: 'center', gap: '0.15rem' }}
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
                style={{ padding: '0.45rem 1rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white', color: '#334155', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem' }}
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
