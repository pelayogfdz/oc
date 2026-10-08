'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle, 
  Calendar, 
  Filter, 
  Download, 
  Printer, 
  Store, 
  Package, 
  DollarSign, 
  Clock, 
  ArrowUpDown,
  RefreshCw
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import * as XLSX from 'xlsx';

interface BranchItem {
  id: string;
  name: string;
}

interface BatchItem {
  id: string;
  productId: string;
  batchNumber: string | null;
  expirationDate: string | null;
  stock: number;
  cost: number;
  product: {
    id: string;
    name: string;
    sku: string | null;
    barcode: string | null;
    imageUrl: string | null;
    cost: number;
    price: number;
    unit: string;
    category: string | null;
    brand: string | null;
    branchId: string;
    branch: {
      id: string;
      name: string;
    };
    supplier: {
      id: string;
      name: string;
    } | null;
  };
}

export default function ReporteCaducidadesClient({
  initialBatches,
  branches,
  activeBranchId
}: {
  initialBatches: any[];
  branches: BranchItem[];
  activeBranchId: string;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL'); // ALL, EXPIRED, 7_DAYS, 15_DAYS, 30_DAYS, 60_DAYS, 90_DAYS, HEALTHY
  const [selectedBranch, setSelectedBranch] = useState<string>(activeBranchId === 'GLOBAL' ? 'ALL' : activeBranchId);
  const [stockOnly, setStockOnly] = useState<boolean>(true);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [sortBy, setSortBy] = useState<'expirationDate' | 'stock' | 'name' | 'cost'>('expirationDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const getStatusInfo = (expDateStr: string | null) => {
    if (!expDateStr) {
      return { 
        statusType: 'UNKNOWN',
        label: 'Sin Fecha', 
        diffDays: 9999, 
        color: '#64748b', 
        bg: '#f1f5f9', 
        border: '#cbd5e1',
        icon: <Clock size={15} /> 
      };
    }
    const expDate = new Date(expDateStr);
    expDate.setHours(0, 0, 0, 0);
    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      const daysAgo = Math.abs(diffDays);
      return { 
        statusType: 'EXPIRED',
        label: `Vencido hace ${daysAgo} ${daysAgo === 1 ? 'día' : 'días'}`, 
        diffDays, 
        color: '#dc2626', 
        bg: '#fef2f2', 
        border: '#fca5a5',
        icon: <AlertCircle size={15} color="#dc2626" /> 
      };
    }
    if (diffDays === 0) {
      return { 
        statusType: 'EXPIRED',
        label: 'Vence Hoy', 
        diffDays: 0, 
        color: '#ea580c', 
        bg: '#fff7ed', 
        border: '#fdba74',
        icon: <AlertTriangle size={15} color="#ea580c" /> 
      };
    }
    if (diffDays <= 7) {
      return { 
        statusType: '7_DAYS',
        label: `Vence en ${diffDays} días`, 
        diffDays, 
        color: '#dc2626', 
        bg: '#fef2f2', 
        border: '#fca5a5',
        icon: <AlertTriangle size={15} color="#dc2626" /> 
      };
    }
    if (diffDays <= 15) {
      return { 
        statusType: '15_DAYS',
        label: `Vence en ${diffDays} días`, 
        diffDays, 
        color: '#d97706', 
        bg: '#fffbeb', 
        border: '#fde68a',
        icon: <AlertTriangle size={15} color="#d97706" /> 
      };
    }
    if (diffDays <= 30) {
      return { 
        statusType: '30_DAYS',
        label: `Vence en ${diffDays} días`, 
        diffDays, 
        color: '#ca8a04', 
        bg: '#fefce8', 
        border: '#fef08a',
        icon: <AlertTriangle size={15} color="#ca8a04" /> 
      };
    }
    if (diffDays <= 60) {
      return { 
        statusType: '60_DAYS',
        label: `Vence en ${diffDays} días`, 
        diffDays, 
        color: '#0284c7', 
        bg: '#f0f9ff', 
        border: '#bae6fd',
        icon: <Clock size={15} color="#0284c7" /> 
      };
    }
    if (diffDays <= 90) {
      return { 
        statusType: '90_DAYS',
        label: `Vence en ${diffDays} días`, 
        diffDays, 
        color: '#0d9488', 
        bg: '#f0fdfa', 
        border: '#99f6e4',
        icon: <Clock size={15} color="#0d9488" /> 
      };
    }
    return { 
      statusType: 'HEALTHY',
      label: `Vigente (${diffDays} días)`, 
      diffDays, 
      color: '#16a34a', 
      bg: '#f0fdf4', 
      border: '#bbf7d0',
      icon: <CheckCircle size={15} color="#16a34a" /> 
    };
  };

  // Metrics Calculation on full initialBatches
  const metrics = useMemo(() => {
    let expiredCount = 0;
    let expiredUnits = 0;
    let expiredCost = 0;

    let warning30Count = 0;
    let warning30Units = 0;
    let warning30Cost = 0;

    let healthyCount = 0;
    let healthyUnits = 0;
    let healthyCost = 0;

    let totalBatches = 0;
    let totalUnits = 0;
    let totalCost = 0;

    initialBatches.forEach(b => {
      const s = getStatusInfo(b.expirationDate);
      const stock = b.stock || 0;
      const unitCost = b.cost || b.product?.cost || 0;
      const val = stock * unitCost;

      totalBatches++;
      totalUnits += stock;
      totalCost += val;

      if (s.diffDays <= 0) {
        expiredCount++;
        expiredUnits += stock;
        expiredCost += val;
      } else if (s.diffDays <= 30) {
        warning30Count++;
        warning30Units += stock;
        warning30Cost += val;
      } else {
        healthyCount++;
        healthyUnits += stock;
        healthyCost += val;
      }
    });

    return {
      totalBatches,
      totalUnits,
      totalCost,
      expiredCount,
      expiredUnits,
      expiredCost,
      warning30Count,
      warning30Units,
      warning30Cost,
      healthyCount,
      healthyUnits,
      healthyCost
    };
  }, [initialBatches, today]);

  // Filter and Sort Batches
  const filteredBatches = useMemo(() => {
    return initialBatches.filter(b => {
      // Stock filter
      if (stockOnly && b.stock <= 0) return false;

      // Branch filter
      if (selectedBranch !== 'ALL' && b.product?.branchId !== selectedBranch) return false;

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesName = b.product?.name?.toLowerCase().includes(q);
        const matchesSku = b.product?.sku?.toLowerCase().includes(q);
        const matchesBarcode = b.product?.barcode?.toLowerCase().includes(q);
        const matchesBatch = b.batchNumber?.toLowerCase().includes(q);
        const matchesSupplier = b.product?.supplier?.name?.toLowerCase().includes(q);
        if (!matchesName && !matchesSku && !matchesBarcode && !matchesBatch && !matchesSupplier) {
          return false;
        }
      }

      const s = getStatusInfo(b.expirationDate);

      // Status pill filter
      if (statusFilter === 'EXPIRED' && s.diffDays > 0) return false;
      if (statusFilter === '7_DAYS' && (s.diffDays <= 0 || s.diffDays > 7)) return false;
      if (statusFilter === '15_DAYS' && (s.diffDays <= 0 || s.diffDays > 15)) return false;
      if (statusFilter === '30_DAYS' && (s.diffDays <= 0 || s.diffDays > 30)) return false;
      if (statusFilter === '60_DAYS' && (s.diffDays <= 0 || s.diffDays > 60)) return false;
      if (statusFilter === '90_DAYS' && (s.diffDays <= 0 || s.diffDays > 90)) return false;
      if (statusFilter === 'HEALTHY' && s.diffDays <= 30) return false;

      // Date range filter (expiration date between startDate and endDate)
      if (startDate && b.expirationDate) {
        const exp = new Date(b.expirationDate).toISOString().split('T')[0];
        if (exp < startDate) return false;
      }
      if (endDate && b.expirationDate) {
        const exp = new Date(b.expirationDate).toISOString().split('T')[0];
        if (exp > endDate) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'expirationDate') {
        const dateA = a.expirationDate ? new Date(a.expirationDate).getTime() : 0;
        const dateB = b.expirationDate ? new Date(b.expirationDate).getTime() : 0;
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      }
      if (sortBy === 'stock') {
        return sortOrder === 'asc' ? a.stock - b.stock : b.stock - a.stock;
      }
      if (sortBy === 'cost') {
        const valA = (a.stock || 0) * (a.cost || a.product?.cost || 0);
        const valB = (b.stock || 0) * (b.cost || b.product?.cost || 0);
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }
      if (sortBy === 'name') {
        const nameA = a.product?.name || '';
        const nameB = b.product?.name || '';
        return sortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
      }
      return 0;
    });
  }, [initialBatches, searchTerm, statusFilter, selectedBranch, stockOnly, startDate, endDate, sortBy, sortOrder, today]);

  // Export to Excel
  const handleExportExcel = () => {
    const dataToExport = filteredBatches.map(b => {
      const s = getStatusInfo(b.expirationDate);
      const unitCost = b.cost || b.product?.cost || 0;
      const totalVal = (b.stock || 0) * unitCost;
      const formattedExp = b.expirationDate 
        ? new Date(b.expirationDate).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : 'N/A';

      return {
        'Producto': b.product?.name || 'S/N',
        'SKU': b.product?.sku || '',
        'Código de Barras': b.product?.barcode || '',
        'Sucursal': b.product?.branch?.name || '',
        'Lote': b.batchNumber || 'S/N',
        'Existencia': b.stock || 0,
        'Unidad': b.product?.unit || 'Pza',
        'Costo Unitario ($)': unitCost,
        'Valor Total Lote ($)': totalVal,
        'Fecha de Caducidad': formattedExp,
        'Días Restantes': s.diffDays <= 0 ? `Vencido (${Math.abs(s.diffDays)} días)` : `${s.diffDays} días`,
        'Estatus': s.label,
        'Proveedor': b.product?.supplier?.name || 'Sin Proveedor'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Caducidades');
    XLSX.writeFile(workbook, `Reporte_Lotes_Caducidades_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
        {/* Vencidos */}
        <div 
          onClick={() => setStatusFilter(statusFilter === 'EXPIRED' ? 'ALL' : 'EXPIRED')}
          style={{ 
            backgroundColor: 'white', 
            padding: '1.25rem', 
            borderRadius: '12px', 
            border: statusFilter === 'EXPIRED' ? '2px solid #dc2626' : '1px solid #fee2e2', 
            borderLeft: '5px solid #dc2626',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.85rem', color: '#991b1b', fontWeight: 'bold' }}>🔴 Lotes Vencidos</div>
              <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#dc2626', marginTop: '0.25rem' }}>
                {metrics.expiredCount} <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#991b1b' }}>lotes ({metrics.expiredUnits} pzas)</span>
              </div>
            </div>
            <div style={{ padding: '0.5rem', backgroundColor: '#fef2f2', borderRadius: '8px' }}>
              <AlertCircle size={24} color="#dc2626" />
            </div>
          </div>
          <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#b91c1c', fontWeight: 600 }}>
            Valor en riesgo: {formatCurrency(metrics.expiredCost)}
          </div>
        </div>

        {/* Por Vencer <= 30 días */}
        <div 
          onClick={() => setStatusFilter(statusFilter === '30_DAYS' ? 'ALL' : '30_DAYS')}
          style={{ 
            backgroundColor: 'white', 
            padding: '1.25rem', 
            borderRadius: '12px', 
            border: statusFilter === '30_DAYS' ? '2px solid #ca8a04' : '1px solid #fef08a', 
            borderLeft: '5px solid #ca8a04',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.85rem', color: '#854d0e', fontWeight: 'bold' }}>🟡 Por Vencer (≤ 30 días)</div>
              <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#ca8a04', marginTop: '0.25rem' }}>
                {metrics.warning30Count} <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#854d0e' }}>lotes ({metrics.warning30Units} pzas)</span>
              </div>
            </div>
            <div style={{ padding: '0.5rem', backgroundColor: '#fefce8', borderRadius: '8px' }}>
              <AlertTriangle size={24} color="#ca8a04" />
            </div>
          </div>
          <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#a16207', fontWeight: 600 }}>
            Capital por expirar: {formatCurrency(metrics.warning30Cost)}
          </div>
        </div>

        {/* Vigentes / Sanos */}
        <div 
          onClick={() => setStatusFilter(statusFilter === 'HEALTHY' ? 'ALL' : 'HEALTHY')}
          style={{ 
            backgroundColor: 'white', 
            padding: '1.25rem', 
            borderRadius: '12px', 
            border: statusFilter === 'HEALTHY' ? '2px solid #16a34a' : '1px solid #dcfce7', 
            borderLeft: '5px solid #16a34a',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.85rem', color: '#166534', fontWeight: 'bold' }}>🟢 Vigentes / Sanos (&gt; 30 días)</div>
              <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#16a34a', marginTop: '0.25rem' }}>
                {metrics.healthyCount} <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#166534' }}>lotes ({metrics.healthyUnits} pzas)</span>
              </div>
            </div>
            <div style={{ padding: '0.5rem', backgroundColor: '#f0fdf4', borderRadius: '8px' }}>
              <CheckCircle size={24} color="#16a34a" />
            </div>
          </div>
          <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#15803d', fontWeight: 600 }}>
            Valor inventario: {formatCurrency(metrics.healthyCost)}
          </div>
        </div>

        {/* Total General */}
        <div style={{ 
          backgroundColor: 'white', 
          padding: '1.25rem', 
          borderRadius: '12px', 
          border: '1px solid #e2e8f0', 
          borderLeft: '5px solid #0f172a',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 'bold' }}>📦 Total Lotes Monitoreados</div>
              <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#0f172a', marginTop: '0.25rem' }}>
                {metrics.totalBatches} <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#475569' }}>lotes ({metrics.totalUnits} pzas)</span>
              </div>
            </div>
            <div style={{ padding: '0.5rem', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
              <Package size={24} color="#0f172a" />
            </div>
          </div>
          <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#334155', fontWeight: 600 }}>
            Valor total: {formatCurrency(metrics.totalCost)}
          </div>
        </div>
      </div>

      {/* Control Panel / Filters */}
      <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          
          {/* Search Box */}
          <div style={{ position: 'relative', flex: '1 1 300px', minWidth: '240px' }}>
            <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              placeholder="Buscar por producto, SKU, lote o proveedor..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ 
                padding: '0.6rem 1rem 0.6rem 2.5rem', 
                width: '100%', 
                borderRadius: '8px', 
                border: '1px solid #cbd5e1', 
                backgroundColor: '#f8fafc', 
                fontSize: '0.9rem',
                outline: 'none'
              }}
            />
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button 
              onClick={handleExportExcel}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.4rem', 
                padding: '0.6rem 1rem', 
                backgroundColor: '#16a34a', 
                color: 'white', 
                border: 'none', 
                borderRadius: '8px', 
                fontWeight: 'bold', 
                fontSize: '0.85rem', 
                cursor: 'pointer' 
              }}
            >
              <Download size={16} />
              Exportar Excel
            </button>
            <button 
              onClick={handlePrint}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.4rem', 
                padding: '0.6rem 1rem', 
                backgroundColor: '#0f172a', 
                color: 'white', 
                border: 'none', 
                borderRadius: '8px', 
                fontWeight: 'bold', 
                fontSize: '0.85rem', 
                cursor: 'pointer' 
              }}
            >
              <Printer size={16} />
              Imprimir
            </button>
          </div>
        </div>

        {/* Secondary Filter Row: Branch, Date Range, Stock Filter */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
          
          {/* Branch Selector */}
          {branches.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Store size={16} color="#64748b" />
              <select 
                value={selectedBranch}
                onChange={e => setSelectedBranch(e.target.value)}
                style={{ padding: '0.45rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: 'white', fontWeight: 500, outline: 'none' }}
              >
                <option value="ALL">Todas las Sucursales</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Date Range: Desde / Hasta */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
            <Calendar size={16} color="#64748b" />
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>Vence desde:</span>
            <input 
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            />
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>Hasta:</span>
            <input 
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            />
            {(startDate || endDate) && (
              <button 
                onClick={() => { setStartDate(''); setEndDate(''); }}
                style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Limpiar fechas
              </button>
            )}
          </div>

          {/* Stock Only Toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginLeft: 'auto' }}>
            <input 
              type="checkbox"
              checked={stockOnly}
              onChange={e => setStockOnly(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            Solo con existencias (&gt; 0)
          </label>
        </div>

        {/* Status Pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#64748b', alignSelf: 'center', marginRight: '0.25rem' }}>Estatus:</span>
          {[
            { id: 'ALL', label: 'Todos' },
            { id: 'EXPIRED', label: '🔴 Vencidos' },
            { id: '7_DAYS', label: '⚡ Próximos 7 días' },
            { id: '15_DAYS', label: '⚠️ Próximos 15 días' },
            { id: '30_DAYS', label: '🟡 Próximos 30 días' },
            { id: '60_DAYS', label: '🔵 Próximos 60 días' },
            { id: '90_DAYS', label: '🟣 Próximos 90 días' },
            { id: 'HEALTHY', label: '🟢 Vigentes / Sanos' }
          ].map(pill => {
            const isSelected = statusFilter === pill.id;
            return (
              <button
                key={pill.id}
                onClick={() => setStatusFilter(pill.id)}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: '20px',
                  border: isSelected ? '1px solid #0f172a' : '1px solid #e2e8f0',
                  backgroundColor: isSelected ? '#0f172a' : '#f8fafc',
                  color: isSelected ? 'white' : '#475569',
                  fontSize: '0.8rem',
                  fontWeight: isSelected ? 'bold' : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                {pill.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results Table */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
          <div style={{ fontWeight: 'bold', fontSize: '0.95rem', color: '#0f172a' }}>
            Listado de Lotes ({filteredBatches.length} registros)
          </div>
          <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Ordenado por: {sortBy === 'expirationDate' ? 'Fecha de Caducidad' : sortBy === 'stock' ? 'Existencia' : sortBy === 'cost' ? 'Valor' : 'Nombre'} ({sortOrder === 'asc' ? 'Ascendente' : 'Descendente'})
          </div>
        </div>

        {filteredBatches.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#94a3b8' }}>
            <Package size={48} style={{ margin: '0 auto 1rem auto', opacity: 0.4 }} />
            <p style={{ fontSize: '1.1rem', fontWeight: 600, color: '#64748b', margin: 0 }}>No se encontraron lotes con los filtros seleccionados.</p>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.25rem' }}>Prueba ajustando los filtros de fecha o búsqueda.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>Producto</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>Sucursal</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>Lote</th>
                  <th 
                    onClick={() => {
                      if (sortBy === 'stock') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      else { setSortBy('stock'); setSortOrder('desc'); }
                    }}
                    style={{ padding: '0.75rem 1rem', fontWeight: 700, cursor: 'pointer', userSelect: 'none' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      Existencia <ArrowUpDown size={13} />
                    </div>
                  </th>
                  <th 
                    onClick={() => {
                      if (sortBy === 'cost') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      else { setSortBy('cost'); setSortOrder('desc'); }
                    }}
                    style={{ padding: '0.75rem 1rem', fontWeight: 700, cursor: 'pointer', userSelect: 'none' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      Costo / Valor <ArrowUpDown size={13} />
                    </div>
                  </th>
                  <th 
                    onClick={() => {
                      if (sortBy === 'expirationDate') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      else { setSortBy('expirationDate'); setSortOrder('asc'); }
                    }}
                    style={{ padding: '0.75rem 1rem', fontWeight: 700, cursor: 'pointer', userSelect: 'none' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      Fecha Caducidad <ArrowUpDown size={13} />
                    </div>
                  </th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>Estatus</th>
                </tr>
              </thead>
              <tbody>
                {filteredBatches.map((batch, idx) => {
                  const s = getStatusInfo(batch.expirationDate);
                  const unitCost = batch.cost || batch.product?.cost || 0;
                  const totalVal = (batch.stock || 0) * unitCost;
                  const formattedExp = batch.expirationDate 
                    ? new Date(batch.expirationDate).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })
                    : 'Sin fecha';

                  return (
                    <tr 
                      key={batch.id} 
                      style={{ 
                        borderBottom: '1px solid #f1f5f9',
                        backgroundColor: idx % 2 === 0 ? 'white' : '#fafafa',
                        transition: 'background-color 0.15s'
                      }}
                    >
                      {/* Producto */}
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '6px', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.75rem', color: '#475569', overflow: 'hidden', flexShrink: 0 }}>
                            {batch.product?.name ? batch.product.name.substring(0, 2).toUpperCase() : 'PR'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: '#0f172a' }}>{batch.product?.name || 'Producto sin nombre'}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', gap: '0.5rem', marginTop: '0.15rem' }}>
                              {batch.product?.sku && <span>SKU: {batch.product.sku}</span>}
                              {batch.product?.barcode && <span>• Barcode: {batch.product.barcode}</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Sucursal */}
                      <td style={{ padding: '0.75rem 1rem', color: '#475569', fontSize: '0.8rem', fontWeight: 500 }}>
                        {batch.product?.branch?.name || 'N/A'}
                      </td>

                      {/* Lote */}
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span style={{ 
                          fontFamily: 'monospace', 
                          fontSize: '0.85rem', 
                          fontWeight: 'bold', 
                          backgroundColor: '#f1f5f9', 
                          padding: '0.2rem 0.5rem', 
                          borderRadius: '4px',
                          border: '1px solid #e2e8f0',
                          color: '#0f172a'
                        }}>
                          {batch.batchNumber || 'S/N'}
                        </span>
                      </td>

                      {/* Existencia */}
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span style={{ 
                          fontWeight: 'bold', 
                          fontSize: '0.95rem',
                          color: batch.stock <= 0 ? '#94a3b8' : '#0f172a'
                        }}>
                          {batch.stock}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '0.25rem' }}>
                          {batch.product?.unit || 'Pza'}
                        </span>
                      </td>

                      {/* Costo / Valor */}
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{formatCurrency(totalVal)}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Unit: {formatCurrency(unitCost)}</div>
                      </td>

                      {/* Fecha de Caducidad */}
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{formattedExp}</div>
                        <div style={{ fontSize: '0.75rem', color: s.color, fontWeight: 'bold', marginTop: '0.1rem' }}>
                          {s.diffDays < 0 ? `Vencido (-${Math.abs(s.diffDays)} d)` : s.diffDays === 0 ? 'Expira Hoy' : `${s.diffDays} días restantes`}
                        </div>
                      </td>

                      {/* Estatus Badge */}
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '0.35rem', 
                          padding: '0.3rem 0.65rem', 
                          borderRadius: '20px', 
                          fontSize: '0.78rem', 
                          fontWeight: 'bold',
                          backgroundColor: s.bg,
                          color: s.color,
                          border: `1px solid ${s.border}`
                        }}>
                          {s.icon}
                          {s.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
