'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, Calculator, ArrowRight, X, ExternalLink, Printer, Download, ArrowUpDown } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { exportToExcel } from '@/lib/exportExcel';

interface Branch {
  id: string;
  name: string;
}

interface Purchase {
  id: string;
  folio: string | null;
  supplierFolio: string | null;
  createdAt: string;
  dueDate: string | null;
  balanceDue: number;
  paymentMethod: string;
  status: string;
  branchId: string;
  supplier: {
    id: string;
    name: string;
    code: string | null;
    phone: string | null;
  } | null;
  branch: Branch;
}

export default function CuentasPorPagarReportClient({
  initialPurchases,
  branches
}: {
  initialPurchases: Purchase[];
  branches: Branch[];
}) {
  const [search, setSearch] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('ALL');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'NOT_OVERDUE' | '0_15' | '15_30' | '30_60' | '60_90' | '90_PLUS'>('ALL');
  const [selectedGroup, setSelectedGroup] = useState<any | null>(null);
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

  // Step 1: Filter purchases by branch and search term first
  const branchFilteredPurchases = useMemo(() => {
    return initialPurchases.filter(purchase => {
      if (selectedBranchId !== 'ALL' && purchase.branchId !== selectedBranchId) {
        return false;
      }
      if (search.trim() !== '') {
        const term = search.toLowerCase();
        const supplierName = purchase.supplier?.name?.toLowerCase() || '';
        const supplierCode = purchase.supplier?.code?.toLowerCase() || '';
        const folioStr = purchase.folio?.toLowerCase() || '';
        const supplierFolioStr = purchase.supplierFolio?.toLowerCase() || '';
        if (!supplierName.includes(term) && !supplierCode.includes(term) && !folioStr.includes(term) && !supplierFolioStr.includes(term)) {
          return false;
        }
      }
      return true;
    });
  }, [initialPurchases, selectedBranchId, search]);

  // Step 2: Categorize into buckets
  const buckets = useMemo(() => {
    const categories = {
      ALL: { label: 'Todos', purchases: [] as Purchase[], total: 0 },
      NOT_OVERDUE: { label: 'Sin Vencer', purchases: [] as Purchase[], total: 0 },
      '0_15': { label: '0 a 15 días', purchases: [] as Purchase[], total: 0 },
      '15_30': { label: '15 a 30 días', purchases: [] as Purchase[], total: 0 },
      '30_60': { label: '30 a 60 días', purchases: [] as Purchase[], total: 0 },
      '60_90': { label: '60 a 90 días', purchases: [] as Purchase[], total: 0 },
      '90_PLUS': { label: 'Más de 90 días', purchases: [] as Purchase[], total: 0 }
    };

    branchFilteredPurchases.forEach(purchase => {
      const days = getDaysOverdue(purchase.dueDate);
      categories.ALL.purchases.push(purchase);
      categories.ALL.total += purchase.balanceDue || 0;

      if (days === 0 || days === -1) {
        categories.NOT_OVERDUE.purchases.push(purchase);
        categories.NOT_OVERDUE.total += purchase.balanceDue || 0;
      } else if (days > 0 && days <= 15) {
        categories['0_15'].purchases.push(purchase);
        categories['0_15'].total += purchase.balanceDue || 0;
      } else if (days > 15 && days <= 30) {
        categories['15_30'].purchases.push(purchase);
        categories['15_30'].total += purchase.balanceDue || 0;
      } else if (days > 30 && days <= 60) {
        categories['30_60'].purchases.push(purchase);
        categories['30_60'].total += purchase.balanceDue || 0;
      } else if (days > 60 && days <= 90) {
        categories['60_90'].purchases.push(purchase);
        categories['60_90'].total += purchase.balanceDue || 0;
      } else if (days > 90) {
        categories['90_PLUS'].purchases.push(purchase);
        categories['90_PLUS'].total += purchase.balanceDue || 0;
      }
    });

    return categories;
  }, [branchFilteredPurchases]);

  // Step 3: Get purchases of the active filter/bucket
  const activeBucketPurchases = useMemo(() => {
    return buckets[activeFilter].purchases;
  }, [buckets, activeFilter]);

  // Step 4: Group filtered purchases by supplier
  const groupedSuppliers = useMemo(() => {
    const groups: { [supplierId: string]: { supplier: any; purchases: Purchase[]; totalBalanceDue: number; oldestDueDate: string | null; branches: Set<string> } } = {};
    
    activeBucketPurchases.forEach(purchase => {
      const supplierId = purchase.supplier?.id || 'unknown';
      if (!groups[supplierId]) {
        groups[supplierId] = {
          supplier: purchase.supplier || { id: 'unknown', name: 'Sin Proveedor / Compra Directa', code: '', phone: '' },
          purchases: [],
          totalBalanceDue: 0,
          oldestDueDate: null,
          branches: new Set<string>()
        };
      }
      groups[supplierId].purchases.push(purchase);
      groups[supplierId].totalBalanceDue += purchase.balanceDue || 0;
      groups[supplierId].branches.add(purchase.branch.name);
      
      if (purchase.dueDate) {
        if (!groups[supplierId].oldestDueDate || new Date(purchase.dueDate) < new Date(groups[supplierId].oldestDueDate!)) {
          groups[supplierId].oldestDueDate = purchase.dueDate;
        }
      }
    });

    const list = Object.values(groups);

    // Apply Sorting
    list.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'NAME') {
        const nameA = a.supplier.name.toLowerCase();
        const nameB = b.supplier.name.toLowerCase();
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
  }, [activeBucketPurchases, sortBy, sortOrder]);

  // Totals calculations
  const totals = useMemo(() => {
    let totalPagar = 0;
    let totalVencido = 0;
    let totalCorriente = 0;
    let totalDocs = 0;

    branchFilteredPurchases.forEach(purchase => {
      const balance = purchase.balanceDue || 0;
      totalPagar += balance;
      totalDocs++;
      const days = getDaysOverdue(purchase.dueDate);
      if (days > 0) {
        totalVencido += balance;
      } else {
        totalCorriente += balance;
      }
    });

    return { totalPagar, totalVencido, totalCorriente, totalDocs };
  }, [branchFilteredPurchases]);

  const downloadExcel = () => {
    const headers = ["Proveedor", "Sucursal(es)", "Documentos Pendientes", "Vencimiento Más Antiguo", "Deuda Total"];
    const rows = groupedSuppliers.map(supplier => {
      const overdueInfo = getOldestDueDateText(supplier.oldestDueDate);
      return [
        supplier.supplier.name,
        Array.from(supplier.branches).join(', '),
        supplier.purchases.length,
        overdueInfo.text,
        supplier.totalBalanceDue
      ];
    });
    exportToExcel(headers, rows, 'Reporte_Cuentas_Por_Pagar');
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
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Reporte de Cuentas por Pagar (CxP)</h1>
          <p style={{ color: 'var(--caanma-text-muted)' }}>Adeudos a proveedores por compras a crédito, vencimientos y antigüedad de saldos.</p>
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
          <h3 style={{ fontSize: '0.85rem', color: 'var(--caanma-text-muted)', marginBottom: '0.5rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Total Cuentas por Pagar</h3>
          <div style={{ fontSize: '1.85rem', fontWeight: '900', color: 'var(--caanma-text)' }}>{formatCurrency(totals.totalPagar)}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--caanma-text-muted)', marginTop: '0.5rem' }}>{totals.totalDocs} facturas pendientes</div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--caanma-border)', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
          <h3 style={{ fontSize: '0.85rem', color: 'var(--caanma-text-muted)', marginBottom: '0.5rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Saldo Vencido</h3>
          <div style={{ fontSize: '1.85rem', fontWeight: '900', color: '#dc2626' }}>{formatCurrency(totals.totalVencido)}</div>
          <div style={{ fontSize: '0.8rem', color: '#dc2626', marginTop: '0.5rem', fontWeight: '500' }}>
            {totals.totalPagar > 0 ? `${((totals.totalVencido / totals.totalPagar) * 100).toFixed(1)}%` : '0%'} vencido
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--caanma-border)', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
          <h3 style={{ fontSize: '0.85rem', color: 'var(--caanma-text-muted)', marginBottom: '0.5rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Saldo al Corriente</h3>
          <div style={{ fontSize: '1.85rem', fontWeight: '900', color: '#16a34a' }}>{formatCurrency(totals.totalCorriente)}</div>
          <div style={{ fontSize: '0.8rem', color: '#16a34a', marginTop: '0.5rem', fontWeight: '500' }}>
            {totals.totalPagar > 0 ? `${((totals.totalCorriente / totals.totalPagar) * 100).toFixed(1)}%` : '0%'} al corriente
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
              placeholder="Buscar por proveedor o folio compra..." 
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
                  {bucket.purchases.length}
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
                  Proveedor <ArrowUpDown size={14} />
                </div>
              </th>
              {selectedBranchId === 'ALL' && (
                <th style={{ padding: '0.85rem 1rem', fontWeight: 'bold', fontSize: '0.85rem', color: '#475569' }}>Sucursal(es)</th>
              )}
              <th style={{ padding: '0.85rem 1rem', fontWeight: 'bold', fontSize: '0.85rem', color: '#475569', textAlign: 'center' }}>Facturas / Compras</th>
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
                  Saldo Pendiente <ArrowUpDown size={14} />
                </div>
              </th>
              <th className="no-print" style={{ padding: '0.85rem 1rem', fontWeight: 'bold', fontSize: '0.85rem', color: '#475569', textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {groupedSuppliers.map((supplier: any) => {
              const overdueInfo = getOldestDueDateText(supplier.oldestDueDate);
              return (
                <tr key={supplier.supplier.id} style={{ borderBottom: '1px solid var(--caanma-border)', fontSize: '0.9rem' }}>
                  <td data-label="Proveedor" style={{ padding: '0.85rem 1rem', fontWeight: 'bold' }}>
                    {supplier.supplier.name}
                    {supplier.supplier.code && (
                      <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '0.5rem', fontWeight: 'normal', backgroundColor: '#f1f5f9', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>
                        {supplier.supplier.code}
                      </span>
                    )}
                  </td>
                  {selectedBranchId === 'ALL' && (
                    <td data-label="Sucursal" style={{ padding: '0.85rem 1rem', color: '#64748b' }}>
                      {Array.from(supplier.branches).join(', ')}
                    </td>
                  )}
                  <td data-label="Documentos" style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                    <span style={{ backgroundColor: '#f1f5f9', color: '#475569', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.775rem', fontWeight: 'bold', border: '1px solid #cbd5e1' }}>
                      {supplier.purchases.length} compras
                    </span>
                  </td>
                  <td data-label="Vencimiento" style={{ padding: '0.85rem 1rem', fontWeight: '500', color: overdueInfo.isOverdue ? '#dc2626' : '#16a34a' }}>
                    {overdueInfo.text}
                  </td>
                  <td data-label="Deuda" style={{ padding: '0.85rem 1rem', fontWeight: 'bold', color: '#dc2626', textAlign: 'right' }}>
                    {formatCurrency(supplier.totalBalanceDue)}
                  </td>
                  <td data-label="Acciones" className="no-print" style={{ padding: '0.85rem 1rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', alignItems: 'center' }}>
                      <button
                        onClick={() => setSelectedGroup(supplier)}
                        style={{ border: '1px solid #cbd5e1', padding: '0.3rem 0.6rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', backgroundColor: 'white', color: 'var(--caanma-primary)', fontSize: '0.775rem', transition: 'all 0.15s ease' }}
                      >
                        Ver Detalle
                      </button>
                      {supplier.supplier?.id && supplier.supplier.id !== 'unknown' && (
                        <Link href={`/proveedores/cuentas`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.15rem', textDecoration: 'none', color: '#64748b', fontWeight: 'bold', fontSize: '0.775rem' }}>
                          Abonar <ArrowRight size={12}/>
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
            {groupedSuppliers.length === 0 && (
              <tr>
                <td colSpan={selectedBranchId === 'ALL' ? 6 : 5} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                  No hay deudas con proveedores o coincidencia con los filtros.
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
                <h3 style={{ fontSize: '1.15rem', fontWeight: 'bold', color: '#1e293b' }}>Detalle de Cuentas por Pagar</h3>
                <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.15rem' }}>{selectedGroup.supplier.name}</p>
              </div>
              <button 
                onClick={() => setSelectedGroup(null)}
                style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '4px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Actions panel */}
            <div style={{ padding: '1rem 1.5rem', backgroundColor: '#fef2f2', borderBottom: '1px solid #fee2e2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#991b1b' }}>
                Saldo Pendiente Total: {formatCurrency(selectedGroup.totalBalanceDue)}
              </span>
              {selectedGroup.supplier?.id && selectedGroup.supplier.id !== 'unknown' && (
                <Link 
                  href={`/proveedores/cuentas`}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.45rem 0.75rem', backgroundColor: '#dc2626', borderRadius: '6px', color: 'white', fontWeight: 'bold', fontSize: '0.8rem', textDecoration: 'none' }}
                >
                  Registrar Abono / Pago <ArrowRight size={14} />
                </Link>
              )}
            </div>

            {/* List */}
            <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569', fontWeight: '600' }}>
                    <th style={{ padding: '0.5rem', textAlign: 'left' }}>Folio Compra</th>
                    <th style={{ padding: '0.5rem', textAlign: 'left' }}>Folio Proveedor</th>
                    <th style={{ padding: '0.5rem', textAlign: 'left' }}>Fecha</th>
                    <th style={{ padding: '0.5rem', textAlign: 'left' }}>Vencimiento</th>
                    <th style={{ padding: '0.5rem', textAlign: 'right' }}>Deuda</th>
                    <th style={{ padding: '0.5rem', textAlign: 'center' }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedGroup.purchases.map((purchase: Purchase) => {
                    const overdueInfo = getOldestDueDateText(purchase.dueDate);
                    return (
                      <tr key={purchase.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '0.65rem 0.5rem', fontFamily: 'monospace', fontWeight: '500' }}>
                          {purchase.folio ? `#${purchase.folio}` : `#${purchase.id.slice(0,8).toUpperCase()}`}
                        </td>
                        <td style={{ padding: '0.65rem 0.5rem', color: '#64748b' }}>
                          {purchase.supplierFolio ? purchase.supplierFolio : '-'}
                        </td>
                        <td style={{ padding: '0.65rem 0.5rem', color: '#64748b' }}>
                          {new Date(purchase.createdAt).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '0.65rem 0.5rem', color: overdueInfo.isOverdue ? '#dc2626' : '#16a34a', fontWeight: '500' }}>
                          {purchase.dueDate ? new Date(purchase.dueDate).toLocaleDateString() : 'N/A'}
                        </td>
                        <td style={{ padding: '0.65rem 0.5rem', textAlign: 'right', fontWeight: 'bold', color: '#dc2626' }}>
                          {formatCurrency(purchase.balanceDue)}
                        </td>
                        <td style={{ padding: '0.65rem 0.5rem', textAlign: 'center' }}>
                          <Link 
                            href={`/productos/compras/${purchase.id}`} 
                            target="_blank"
                            style={{ color: '#4f46e5', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.825rem', display: 'inline-flex', alignItems: 'center', gap: '0.15rem' }}
                          >
                            Detalle <ExternalLink size={12} />
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
