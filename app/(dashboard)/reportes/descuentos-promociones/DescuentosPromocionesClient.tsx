'use client';

import React, { useState, useTransition, useMemo } from 'react';
import Link from 'next/link';
import { 
  Tag, 
  Search, 
  Calendar, 
  Building2, 
  User, 
  Download, 
  Printer, 
  TrendingDown, 
  Package, 
  Receipt, 
  Percent, 
  DollarSign, 
  Sparkles,
  Layers,
  ArrowUpDown,
  Filter,
  RefreshCw,
  Eye
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { getDiscountPromotionsReport, DiscountReportSummary, DiscountItemRow } from '@/app/actions/reporte-descuentos';

interface Props {
  initialData: DiscountReportSummary;
  initialStartDate: string;
  initialEndDate: string;
  initialBranchId: string;
}

export default function DescuentosPromocionesClient({
  initialData,
  initialStartDate,
  initialEndDate,
  initialBranchId
}: Props) {
  const [data, setData] = useState<DiscountReportSummary>(initialData);
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [selectedBranch, setSelectedBranch] = useState(initialBranchId);
  const [selectedUser, setSelectedUser] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'detail' | 'products' | 'types'>('detail');
  const [isPending, startTransition] = useTransition();

  // Sorting
  const [sortField, setSortField] = useState<'saleDate' | 'totalDiscount' | 'quantity' | 'discountPct' | 'totalCharged'>('saleDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Pagination for details
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  // Handle Quick Date Filters
  const handleQuickDate = (type: 'today' | 'yesterday' | 'week' | 'month' | '30days' | 'year') => {
    const today = new Date();
    let start = new Date();
    let end = new Date();

    if (type === 'today') {
      start = today;
      end = today;
    } else if (type === 'yesterday') {
      start.setDate(today.getDate() - 1);
      end.setDate(today.getDate() - 1);
    } else if (type === 'week') {
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1);
      start.setDate(diff);
      end = today;
    } else if (type === 'month') {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      end = today;
    } else if (type === '30days') {
      start.setDate(today.getDate() - 30);
      end = today;
    } else if (type === 'year') {
      start = new Date(today.getFullYear(), 0, 1);
      end = today;
    }

    const sStr = start.toISOString().split('T')[0];
    const eStr = end.toISOString().split('T')[0];
    setStartDate(sStr);
    setEndDate(eStr);
    fetchData(sStr, eStr, selectedBranch, selectedUser, selectedType);
  };

  const fetchData = (s: string, e: string, b: string, u: string, t: string) => {
    startTransition(async () => {
      try {
        const result = await getDiscountPromotionsReport(s, e, b, u, t);
        setData(result);
        setCurrentPage(1);
      } catch (err) {
        console.error("Error fetching report:", err);
      }
    });
  };

  const handleFilterApply = () => {
    fetchData(startDate, endDate, selectedBranch, selectedUser, selectedType);
  };

  // Filter rows locally by searchTerm
  const filteredRows = useMemo(() => {
    let result = data.rows;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter(r => 
        r.productName.toLowerCase().includes(term) ||
        r.productSku.toLowerCase().includes(term) ||
        r.productBarcode.toLowerCase().includes(term) ||
        r.saleFolio.toLowerCase().includes(term) ||
        r.customerName.toLowerCase().includes(term) ||
        r.userName.toLowerCase().includes(term) ||
        r.branchName.toLowerCase().includes(term) ||
        r.discountReason.toLowerCase().includes(term)
      );
    }

    // Sort rows
    return [...result].sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (sortField === 'saleDate') {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data.rows, searchTerm, sortField, sortDirection]);

  // Paginated Rows
  const totalPages = Math.ceil(filteredRows.length / pageSize) || 1;
  const paginatedRows = useMemo(() => {
    const startIdx = (currentPage - 1) * pageSize;
    return filteredRows.slice(startIdx, startIdx + pageSize);
  }, [filteredRows, currentPage]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (filteredRows.length === 0) return;

    const headers = [
      'Folio Venta',
      'Fecha y Hora',
      'Sucursal',
      'Vendedor',
      'Cliente',
      'Producto',
      'SKU',
      'Codigo de Barras',
      'Categoria',
      'Cantidad',
      'Precio Regular (Unitario)',
      'Precio Cobrado (Unitario)',
      'Descuento Unitario',
      'Descuento Total',
      '% Descuento',
      'Total Regular',
      'Total Cobrado',
      'Tipo de Beneficio',
      'Detalle / Motivo'
    ];

    const csvContent = [
      headers.join(','),
      ...filteredRows.map(r => [
        `"${r.saleFolio}"`,
        `"${new Date(r.saleDate).toLocaleString()}"`,
        `"${r.branchName.replace(/"/g, '""')}"`,
        `"${r.userName.replace(/"/g, '""')}"`,
        `"${r.customerName.replace(/"/g, '""')}"`,
        `"${r.productName.replace(/"/g, '""')}"`,
        `"${r.productSku}"`,
        `"${r.productBarcode}"`,
        `"${r.productCategory.replace(/"/g, '""')}"`,
        r.quantity,
        r.regularPrice.toFixed(2),
        r.chargedPrice.toFixed(2),
        r.unitDiscount.toFixed(2),
        r.totalDiscount.toFixed(2),
        r.discountPct.toFixed(1) + '%',
        r.totalRegular.toFixed(2),
        r.totalCharged.toFixed(2),
        `"${r.discountType}"`,
        `"${r.discountReason.replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `reporte_descuentos_${startDate}_a_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getDiscountTypeBadge = (type: DiscountItemRow['discountType'], label: string) => {
    switch (type) {
      case 'PROMOTION':
        return (
          <span style={{ backgroundColor: '#fef3c7', color: '#b45309', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            <Sparkles size={12} /> Promoción
          </span>
        );
      case 'PRICE_LIST':
        return (
          <span style={{ backgroundColor: '#e0e7ff', color: '#4338ca', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            <Layers size={12} /> Lista de Precios
          </span>
        );
      case 'LOYALTY_POINTS':
        return (
          <span style={{ backgroundColor: '#f3e8ff', color: '#7e22ce', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            <DollarSign size={12} /> Monedero
          </span>
        );
      case 'MANUAL_DISCOUNT':
      default:
        return (
          <span style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            <TrendingDown size={12} /> Descuento Directo
          </span>
        );
    }
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', fontFamily: 'var(--font-geist-sans)', paddingBottom: '3rem' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <div style={{ backgroundColor: '#fee2e2', padding: '0.5rem', borderRadius: '8px', color: '#dc2626' }}>
              <Tag size={24} />
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', margin: 0 }}>Reporte de Descuentos y Promociones</h1>
          </div>
          <p style={{ color: 'var(--caanma-text-muted)', margin: 0, fontSize: '0.9rem' }}>
            Auditoría de todos los artículos vendidos con promociones activas, listas de precios preferenciales o descuentos manuales.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            onClick={handleExportCSV}
            disabled={filteredRows.length === 0}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.6rem 1rem',
              backgroundColor: '#16a34a',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '0.85rem',
              cursor: filteredRows.length === 0 ? 'not-allowed' : 'pointer',
              opacity: filteredRows.length === 0 ? 0.6 : 1
            }}
          >
            <Download size={16} /> Exportar Excel / CSV
          </button>
          <button
            onClick={() => window.print()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.6rem 1rem',
              backgroundColor: 'white',
              color: '#1e293b',
              border: '1px solid var(--caanma-border)',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            <Printer size={16} /> Imprimir
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        
        {/* Total Descuentos */}
        <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--caanma-border)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--caanma-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Total Descontado
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#dc2626', marginTop: '0.25rem' }}>
                {formatCurrency(data.kpis.totalDiscountAmount)}
              </div>
            </div>
            <div style={{ backgroundColor: '#fee2e2', padding: '0.6rem', borderRadius: '10px', color: '#dc2626' }}>
              <TrendingDown size={22} />
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem' }}>
            Ahorro total otorgado a clientes
          </div>
        </div>

        {/* Unidades Vendidas */}
        <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--caanma-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--caanma-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Piezas con Descuento
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#2563eb', marginTop: '0.25rem' }}>
                {data.kpis.totalDiscountedUnits.toLocaleString()} <span style={{ fontSize: '0.9rem', fontWeight: 'normal', color: '#64748b' }}>uds</span>
              </div>
            </div>
            <div style={{ backgroundColor: '#dbeafe', padding: '0.6rem', borderRadius: '10px', color: '#2563eb' }}>
              <Package size={22} />
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem' }}>
            Unidades vendidas bajo oferta o descuento
          </div>
        </div>

        {/* Tickets con Descuento */}
        <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--caanma-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--caanma-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Tickets con Beneficio
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#7c3aed', marginTop: '0.25rem' }}>
                {data.kpis.totalDiscountedSalesCount.toLocaleString()}
              </div>
            </div>
            <div style={{ backgroundColor: '#ede9fe', padding: '0.6rem', borderRadius: '10px', color: '#7c3aed' }}>
              <Receipt size={22} />
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem' }}>
            Transacciones con descuentos aplicados
          </div>
        </div>

        {/* % Descuento Promedio */}
        <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--caanma-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--caanma-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                % Descuento Promedio
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#d97706', marginTop: '0.25rem' }}>
                {data.kpis.averageDiscountPct}%
              </div>
            </div>
            <div style={{ backgroundColor: '#fef3c7', padding: '0.6rem', borderRadius: '10px', color: '#d97706' }}>
              <Percent size={22} />
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem' }}>
            Sobre el valor regular de los artículos
          </div>
        </div>

        {/* Total Cobrado */}
        <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--caanma-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--caanma-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Total Cobrado Neto
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#16a34a', marginTop: '0.25rem' }}>
                {formatCurrency(data.kpis.totalChargedAmount)}
              </div>
            </div>
            <div style={{ backgroundColor: '#dcfce7', padding: '0.6rem', borderRadius: '10px', color: '#16a34a' }}>
              <DollarSign size={22} />
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem' }}>
            Valor regular: {formatCurrency(data.kpis.totalRegularAmount)}
          </div>
        </div>

      </div>

      {/* Control Panel: Date Presets & Filter Bar */}
      <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--caanma-border)', marginBottom: '1.5rem' }}>
        
        {/* Quick Date Presets */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--caanma-text-muted)', marginRight: '0.25rem' }}>Período rápido:</span>
          {[
            { id: 'today', label: 'Hoy' },
            { id: 'yesterday', label: 'Ayer' },
            { id: 'week', label: 'Esta Semana' },
            { id: 'month', label: 'Este Mes' },
            { id: '30days', label: 'Últimos 30 días' },
            { id: 'year', label: 'Este Año' }
          ].map(preset => (
            <button
              key={preset.id}
              onClick={() => handleQuickDate(preset.id as any)}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid var(--caanma-border)',
                backgroundColor: '#f8fafc',
                fontSize: '0.8rem',
                fontWeight: '500',
                color: '#334155',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Filters Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1rem', alignItems: 'end' }}>
          
          {/* Fecha Inicio */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--caanma-text-muted)', marginBottom: '0.35rem' }}>
              Desde:
            </label>
            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--caanma-border)', borderRadius: '6px', padding: '0.4rem 0.6rem', backgroundColor: 'white' }}>
              <Calendar size={16} color="#64748b" style={{ marginRight: '0.4rem' }} />
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                style={{ border: 'none', outline: 'none', width: '100%', fontSize: '0.85rem' }}
              />
            </div>
          </div>

          {/* Fecha Fin */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--caanma-text-muted)', marginBottom: '0.35rem' }}>
              Hasta:
            </label>
            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--caanma-border)', borderRadius: '6px', padding: '0.4rem 0.6rem', backgroundColor: 'white' }}>
              <Calendar size={16} color="#64748b" style={{ marginRight: '0.4rem' }} />
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                style={{ border: 'none', outline: 'none', width: '100%', fontSize: '0.85rem' }}
              />
            </div>
          </div>

          {/* Sucursal */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--caanma-text-muted)', marginBottom: '0.35rem' }}>
              Sucursal:
            </label>
            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--caanma-border)', borderRadius: '6px', padding: '0.4rem 0.6rem', backgroundColor: 'white' }}>
              <Building2 size={16} color="#64748b" style={{ marginRight: '0.4rem' }} />
              <select
                value={selectedBranch}
                onChange={e => setSelectedBranch(e.target.value)}
                style={{ border: 'none', outline: 'none', width: '100%', fontSize: '0.85rem', backgroundColor: 'transparent' }}
              >
                <option value="ALL">Todas las Sucursales</option>
                {data.availableBranches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Vendedor */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--caanma-text-muted)', marginBottom: '0.35rem' }}>
              Vendedor / Cajero:
            </label>
            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--caanma-border)', borderRadius: '6px', padding: '0.4rem 0.6rem', backgroundColor: 'white' }}>
              <User size={16} color="#64748b" style={{ marginRight: '0.4rem' }} />
              <select
                value={selectedUser}
                onChange={e => setSelectedUser(e.target.value)}
                style={{ border: 'none', outline: 'none', width: '100%', fontSize: '0.85rem', backgroundColor: 'transparent' }}
              >
                <option value="ALL">Todos los Vendedores</option>
                {data.availableUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Tipo de Descuento */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--caanma-text-muted)', marginBottom: '0.35rem' }}>
              Tipo de Beneficio:
            </label>
            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--caanma-border)', borderRadius: '6px', padding: '0.4rem 0.6rem', backgroundColor: 'white' }}>
              <Filter size={16} color="#64748b" style={{ marginRight: '0.4rem' }} />
              <select
                value={selectedType}
                onChange={e => setSelectedType(e.target.value)}
                style={{ border: 'none', outline: 'none', width: '100%', fontSize: '0.85rem', backgroundColor: 'transparent' }}
              >
                <option value="ALL">Todos los Tipos</option>
                <option value="PROMOTION">Promociones de Campaña</option>
                <option value="PRICE_LIST">Listas de Precios (Mayoreo/Especial)</option>
                <option value="MANUAL_DISCOUNT">Descuentos Manuales POS</option>
                <option value="LOYALTY_POINTS">Puntos de Monedero</option>
              </select>
            </div>
          </div>

          {/* Botón Aplicar */}
          <div>
            <button
              onClick={handleFilterApply}
              disabled={isPending}
              style={{
                width: '100%',
                padding: '0.55rem 1rem',
                backgroundColor: 'var(--caanma-primary)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 'bold',
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem'
              }}
            >
              {isPending ? <RefreshCw size={16} className="animate-spin" /> : <Filter size={16} />}
              {isPending ? 'Filtrando...' : 'Aplicar Filtros'}
            </button>
          </div>

        </div>

      </div>

      {/* Tabs Navigation */}
      <div style={{ display: 'flex', borderBottom: '2px solid var(--caanma-border)', marginBottom: '1.5rem', gap: '1rem' }}>
        <button
          onClick={() => setActiveTab('detail')}
          style={{
            padding: '0.75rem 1.25rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'detail' ? '3px solid var(--caanma-primary)' : '3px solid transparent',
            color: activeTab === 'detail' ? 'var(--caanma-primary)' : 'var(--caanma-text-muted)',
            fontWeight: 'bold',
            fontSize: '0.95rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '-2px'
          }}
        >
          <Receipt size={18} /> Detalle de Partidas Vendidas ({filteredRows.length})
        </button>

        <button
          onClick={() => setActiveTab('products')}
          style={{
            padding: '0.75rem 1.25rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'products' ? '3px solid var(--caanma-primary)' : '3px solid transparent',
            color: activeTab === 'products' ? 'var(--caanma-primary)' : 'var(--caanma-text-muted)',
            fontWeight: 'bold',
            fontSize: '0.95rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '-2px'
          }}
        >
          <Package size={18} /> Resumen por Producto ({data.byProduct.length})
        </button>

        <button
          onClick={() => setActiveTab('types')}
          style={{
            padding: '0.75rem 1.25rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'types' ? '3px solid var(--caanma-primary)' : '3px solid transparent',
            color: activeTab === 'types' ? 'var(--caanma-primary)' : 'var(--caanma-text-muted)',
            fontWeight: 'bold',
            fontSize: '0.95rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '-2px'
          }}
        >
          <Sparkles size={18} /> Por Tipo de Beneficio ({data.byType.length})
        </button>
      </div>

      {/* TAB 1: DETALLE POR PARTIDA */}
      {activeTab === 'detail' && (
        <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid var(--caanma-border)', overflow: 'hidden' }}>
          
          {/* Table Search & Record Count */}
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--caanma-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '260px', maxWidth: '450px' }}>
              <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--caanma-border)', borderRadius: '6px', padding: '0.4rem 0.75rem', width: '100%', backgroundColor: '#f8fafc' }}>
                <Search size={16} color="#64748b" style={{ marginRight: '0.5rem' }} />
                <input
                  type="text"
                  placeholder="Buscar por producto, SKU, folio, cliente..."
                  value={searchTerm}
                  onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  style={{ border: 'none', outline: 'none', width: '100%', fontSize: '0.85rem', backgroundColor: 'transparent' }}
                />
              </div>
            </div>

            <div style={{ fontSize: '0.85rem', color: 'var(--caanma-text-muted)' }}>
              Mostrando <strong>{paginatedRows.length}</strong> de <strong>{filteredRows.length}</strong> partidas con descuento
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--caanma-border)', color: 'var(--caanma-text-muted)' }}>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 'bold' }}>Folio / Fecha</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 'bold' }}>Producto / SKU</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 'bold' }}>Cliente / Sucursal</th>
                  <th 
                    onClick={() => handleSort('quantity')} 
                    style={{ padding: '0.75rem 1rem', fontWeight: 'bold', cursor: 'pointer', textAlign: 'center' }}
                  >
                    Cant. <ArrowUpDown size={12} style={{ display: 'inline' }} />
                  </th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 'bold', textAlign: 'right' }}>P. Regular</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 'bold', textAlign: 'right' }}>P. Cobrado</th>
                  <th 
                    onClick={() => handleSort('totalDiscount')} 
                    style={{ padding: '0.75rem 1rem', fontWeight: 'bold', color: '#dc2626', cursor: 'pointer', textAlign: 'right' }}
                  >
                    Descuento Total <ArrowUpDown size={12} style={{ display: 'inline' }} />
                  </th>
                  <th 
                    onClick={() => handleSort('discountPct')} 
                    style={{ padding: '0.75rem 1rem', fontWeight: 'bold', cursor: 'pointer', textAlign: 'center' }}
                  >
                    % Ahorro <ArrowUpDown size={12} style={{ display: 'inline' }} />
                  </th>
                  <th 
                    onClick={() => handleSort('totalCharged')} 
                    style={{ padding: '0.75rem 1rem', fontWeight: 'bold', color: '#16a34a', cursor: 'pointer', textAlign: 'right' }}
                  >
                    Total Cobrado <ArrowUpDown size={12} style={{ display: 'inline' }} />
                  </th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 'bold' }}>Tipo / Motivo</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ padding: '3rem', textAlign: 'center', color: 'var(--caanma-text-muted)' }}>
                      No se encontraron productos vendidos con descuento en el período y filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map(row => (
                    <tr key={row.id} style={{ borderBottom: '1px solid var(--caanma-border)', transition: 'background-color 0.15s' }}>
                      
                      {/* Folio & Date */}
                      <td style={{ padding: '0.75rem 1rem', verticalAlign: 'top' }}>
                        <Link 
                          href={`/ventas/detalle/${row.saleId}`}
                          target="_blank"
                          style={{ fontWeight: 'bold', color: 'var(--caanma-primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                          #{row.saleFolio} <Eye size={12} />
                        </Link>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.15rem' }}>
                          {new Date(row.saleDate).toLocaleDateString()} {new Date(row.saleDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      {/* Product */}
                      <td style={{ padding: '0.75rem 1rem', verticalAlign: 'top', maxWidth: '300px' }}>
                        <div style={{ fontWeight: '600', color: '#1e293b' }}>{row.productName}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', gap: '0.5rem', marginTop: '0.15rem' }}>
                          <span>SKU: <strong>{row.productSku}</strong></span>
                          {row.variantAttribute && <span>Var: <strong>{row.variantAttribute}</strong></span>}
                          <span>Cat: <strong>{row.productCategory}</strong></span>
                        </div>
                      </td>

                      {/* Customer & Branch */}
                      <td style={{ padding: '0.75rem 1rem', verticalAlign: 'top' }}>
                        <div style={{ fontWeight: '500', color: '#334155' }}>{row.customerName}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.15rem' }}>
                          {row.branchName} • Vendedor: {row.userName}
                        </div>
                      </td>

                      {/* Quantity */}
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center', verticalAlign: 'top', fontWeight: 'bold', fontSize: '0.95rem' }}>
                        {row.quantity}
                      </td>

                      {/* Regular Price */}
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right', verticalAlign: 'top', color: '#64748b', textDecoration: 'line-through' }}>
                        ${row.regularPrice.toFixed(2)}
                      </td>

                      {/* Charged Price */}
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right', verticalAlign: 'top', fontWeight: 'bold', color: '#1e293b' }}>
                        ${row.chargedPrice.toFixed(2)}
                      </td>

                      {/* Total Discount */}
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right', verticalAlign: 'top', fontWeight: '900', color: '#dc2626' }}>
                        -${row.totalDiscount.toFixed(2)}
                        <div style={{ fontSize: '0.7rem', color: '#ef4444' }}>
                          (-${row.unitDiscount.toFixed(2)} c/u)
                        </div>
                      </td>

                      {/* Discount % */}
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center', verticalAlign: 'top' }}>
                        <span style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '0.2rem 0.45rem', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.8rem' }}>
                          -{row.discountPct}%
                        </span>
                      </td>

                      {/* Total Charged */}
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right', verticalAlign: 'top', fontWeight: 'bold', color: '#16a34a' }}>
                        ${row.totalCharged.toFixed(2)}
                      </td>

                      {/* Discount Type & Reason */}
                      <td style={{ padding: '0.75rem 1rem', verticalAlign: 'top' }}>
                        <div>{getDiscountTypeBadge(row.discountType, row.discountReason)}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem', maxWidth: '200px' }}>
                          {row.discountReason}
                        </div>
                      </td>

                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div style={{ padding: '1rem', borderTop: '1px solid var(--caanma-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--caanma-text-muted)' }}>
                Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={{
                    padding: '0.4rem 0.85rem',
                    borderRadius: '6px',
                    border: '1px solid var(--caanma-border)',
                    backgroundColor: 'white',
                    fontSize: '0.8rem',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    opacity: currentPage === 1 ? 0.5 : 1
                  }}
                >
                  Anterior
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: '0.4rem 0.85rem',
                    borderRadius: '6px',
                    border: '1px solid var(--caanma-border)',
                    backgroundColor: 'white',
                    fontSize: '0.8rem',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    opacity: currentPage === totalPages ? 0.5 : 1
                  }}
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}

        </div>
      )}

      {/* TAB 2: RESUMEN POR PRODUCTO */}
      {activeTab === 'products' && (
        <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid var(--caanma-border)', overflow: 'hidden' }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--caanma-border)' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 'bold' }}>Ranking de Productos con Mayor Descuento Otorgado</h3>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--caanma-text-muted)' }}>
              Identifica los productos que más se han vendido mediante promociones o listas preferenciales.
            </p>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--caanma-border)', color: 'var(--caanma-text-muted)' }}>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 'bold' }}>#</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 'bold' }}>Producto</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 'bold' }}>SKU</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 'bold' }}>Categoría</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 'bold', textAlign: 'center' }}>Unidades con Descuento</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 'bold', color: '#dc2626', textAlign: 'right' }}>Total Descontado ($)</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 'bold', color: '#16a34a', textAlign: 'right' }}>Total Cobrado Real ($)</th>
                </tr>
              </thead>
              <tbody>
                {data.byProduct.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--caanma-text-muted)' }}>
                      No hay productos registrados con descuento en este período.
                    </td>
                  </tr>
                ) : (
                  data.byProduct.map((prod, idx) => (
                    <tr key={prod.productId} style={{ borderBottom: '1px solid var(--caanma-border)' }}>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 'bold', color: '#94a3b8' }}>
                        {idx + 1}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: '600', color: '#1e293b' }}>
                        {prod.productName}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>
                        {prod.productSku}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>
                        {prod.productCategory}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 'bold' }}>
                        {prod.unitsSoldWithDiscount} uds
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: '900', color: '#dc2626' }}>
                        -${prod.totalDiscountAmount.toFixed(2)}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 'bold', color: '#16a34a' }}>
                        ${prod.totalChargedAmount.toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: RESUMEN POR TIPO DE BENEFICIO */}
      {activeTab === 'types' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {data.byType.map(item => {
            const pctOfTotal = data.kpis.totalDiscountAmount > 0 
              ? ((item.totalDiscountAmount / data.kpis.totalDiscountAmount) * 100).toFixed(1) 
              : '0';

            return (
              <div 
                key={item.type} 
                style={{ 
                  backgroundColor: 'white', 
                  borderRadius: '12px', 
                  border: '1px solid var(--caanma-border)', 
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 'bold', color: '#1e293b' }}>
                      {item.label}
                    </h3>
                    <span style={{ fontSize: '0.8rem', backgroundColor: '#fee2e2', color: '#dc2626', padding: '0.2rem 0.5rem', borderRadius: '6px', fontWeight: 'bold' }}>
                      {pctOfTotal}% del total
                    </span>
                  </div>

                  <div style={{ fontSize: '2rem', fontWeight: '900', color: '#dc2626', marginBottom: '0.5rem' }}>
                    -${item.totalDiscountAmount.toFixed(2)}
                  </div>

                  {/* Progress bar */}
                  <div style={{ width: '100%', height: '8px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden', marginBottom: '1rem' }}>
                    <div 
                      style={{ 
                        width: `${pctOfTotal}%`, 
                        height: '100%', 
                        backgroundColor: '#dc2626',
                        borderRadius: '4px'
                      }} 
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', paddingTop: '1rem', borderTop: '1px solid var(--caanma-border)', fontSize: '0.85rem' }}>
                  <div>
                    <div style={{ color: 'var(--caanma-text-muted)', fontSize: '0.75rem' }}>Piezas Vendidas:</div>
                    <div style={{ fontWeight: 'bold', color: '#1e293b', marginTop: '0.1rem' }}>{item.units} uds</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--caanma-text-muted)', fontSize: '0.75rem' }}>Total Cobrado:</div>
                    <div style={{ fontWeight: 'bold', color: '#16a34a', marginTop: '0.1rem' }}>${item.totalChargedAmount.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
