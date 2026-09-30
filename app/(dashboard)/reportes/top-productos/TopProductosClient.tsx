'use client';

import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, Package, Loader2, Search, DollarSign, Printer, Download, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { getTopProductsReport, getAvailableFilters } from '@/app/actions/reportes';
import { exportToExcel } from '@/lib/exportExcel';

function formatDateInput(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function TopProductosClient({ 
  initialData, 
  initialBranchId, 
  availableFilters 
}: { 
  initialData: any[], 
  initialBranchId: string, 
  availableFilters: any 
}) {
  const [data, setData] = useState<any[]>(initialData);
  const [usersList, setUsersList] = useState<any[]>(availableFilters.users || []);
  const [branchId, setBranchId] = useState(initialBranchId);
  const [category, setCategory] = useState('ALL');
  const [brand, setBrand] = useState('ALL');
  const [sellerId, setSellerId] = useState('ALL');
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Chart Metric Mode: 'units' | 'revenue' | 'profit'
  const [chartMetric, setChartMetric] = useState<'units' | 'revenue' | 'profit'>('units');

  // Sorting
  const [sortField, setSortField] = useState<string>('totalRevenue');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Default dates (last 30 days)
  const defaultEnd = new Date();
  const defaultStart = new Date();
  defaultStart.setDate(defaultEnd.getDate() - 30);

  const [startDateStr, setStartDateStr] = useState(formatDateInput(defaultStart));
  const [endDateStr, setEndDateStr] = useState(formatDateInput(defaultEnd));
  const [selectedPreset, setSelectedPreset] = useState('LAST_30_DAYS');

  // Predefined Date Ranges
  const handlePresetChange = (preset: string) => {
    setSelectedPreset(preset);
    if (preset === 'CUSTOM') return;

    const now = new Date();
    let start = new Date();
    let end = new Date();

    switch (preset) {
      case 'TODAY':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        break;
      case 'THIS_MONTH':
        start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
      case 'LAST_MONTH':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        break;
      case 'LAST_30_DAYS':
        start = new Date();
        start.setDate(now.getDate() - 30);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'LAST_90_DAYS':
        start = new Date();
        start.setDate(now.getDate() - 90);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'THIS_YEAR':
        start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
        end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        break;
      default:
        return;
    }

    setStartDateStr(formatDateInput(start));
    setEndDateStr(formatDateInput(end));
    triggerUpdate(start, end, branchId, category, brand, sellerId);
  };

  const triggerUpdate = async (start: Date, end: Date, bId: string, cat: string, brnd: string, sId: string) => {
    setIsLoading(true);
    try {
      const [res, filterRes] = await Promise.all([
        getTopProductsReport(start, end, bId, cat, brnd, sId),
        getAvailableFilters({ startDate: start, endDate: end, branchId: bId !== 'ALL' ? bId : undefined })
      ]);
      setData(res || []);
      if (filterRes?.users) {
        setUsersList(filterRes.users);
        if (sId !== 'ALL' && !filterRes.users.some((u: any) => u.id === sId)) {
          setSellerId('ALL');
        }
      }
    } catch (error) {
      console.error("Error updating products report:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyFilters = () => {
    const [sy, sm, sd] = startDateStr.split('-').map(Number);
    const [ey, em, ed] = endDateStr.split('-').map(Number);
    const start = new Date(sy, sm - 1, sd, 0, 0, 0, 0);
    const end = new Date(ey, em - 1, ed, 23, 59, 59, 999);
    triggerUpdate(start, end, branchId, category, brand, sellerId);
  };

  // Format currency
  const formatter = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

  // Filter & Sort local search inside the table
  const filteredData = useMemo(() => {
    let list = data.filter(p => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        (p.name && p.name.toLowerCase().includes(term)) ||
        (p.sku && p.sku.toLowerCase().includes(term)) ||
        (p.barcode && p.barcode.toLowerCase().includes(term)) ||
        (p.category && p.category.toLowerCase().includes(term)) ||
        (p.brand && p.brand.toLowerCase().includes(term))
      );
    });

    list.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = (valB || '').toLowerCase();
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }

      valA = Number(valA) || 0;
      valB = Number(valB) || 0;
      return sortOrder === 'asc' ? valA - valB : valB - valA;
    });

    return list;
  }, [data, searchTerm, sortField, sortOrder]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Aggregate stats
  const stats = useMemo(() => {
    const totalProducts = data.length;
    const totalUnits = data.reduce((acc, p) => acc + p.quantitySold, 0);
    const totalRevenue = data.reduce((acc, p) => acc + p.totalRevenue, 0);
    const totalRevenueSinIva = data.reduce((acc, p) => acc + (p.totalRevenueSinIva || 0), 0);
    const totalCost = data.reduce((acc, p) => acc + p.totalCost, 0);
    const grossProfit = data.reduce((acc, p) => acc + (p.grossProfit !== undefined ? p.grossProfit : (p.totalRevenue - p.totalCost)), 0);
    const avgMargin = totalRevenueSinIva > 0 
      ? (grossProfit / totalRevenueSinIva) * 100 
      : (totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0);

    return {
      totalProducts,
      totalUnits,
      totalRevenue,
      totalCost,
      grossProfit,
      avgMargin
    };
  }, [data]);

  // Chart data: Top 10 products sorted by selected metric
  const chartData = useMemo(() => {
    const sorted = [...data].sort((a, b) => {
      if (chartMetric === 'units') return b.quantitySold - a.quantitySold;
      if (chartMetric === 'revenue') return b.totalRevenue - a.totalRevenue;
      return b.grossProfit - a.grossProfit;
    });

    return sorted.slice(0, 10).map(p => {
      const metricValue = chartMetric === 'units' 
        ? p.quantitySold 
        : chartMetric === 'revenue' 
        ? p.totalRevenue 
        : p.grossProfit;

      const cleanName = p.name || 'Producto';
      const shortLabel = cleanName.length > 22 ? cleanName.substring(0, 20) + "…" : cleanName;

      return {
        name: shortLabel,
        fullName: cleanName,
        sku: p.sku,
        value: metricValue,
        units: p.quantitySold,
        revenue: p.totalRevenue,
        profit: p.grossProfit
      };
    });
  }, [data, chartMetric]);

  // HSL visual color generator for bars
  const getHslColor = (idx: number) => {
    return `hsl(${(idx * 36 + 210) % 360}, 75%, 45%)`;
  };

  // Download CSV report
  const downloadExcel = () => {
    const headers = ["Lugar", "Nombre del Producto", "SKU / Código", "Categoría", "Marca", "Costo Unit.", "Precio Unit.", "Uds Vendidas", "Ventas Totales", "Costo Total", "Ganancia Bruta", "Margen %"];
    const rows = filteredData.map((p, idx) => [
      idx + 1,
      p.name,
      `${p.sku || '-'} | ${p.barcode || '-'}`,
      p.category || "General",
      p.brand || "General",
      p.cost,
      p.price,
      p.quantitySold,
      p.totalRevenue,
      p.totalCost,
      p.grossProfit,
      `${p.margin ? p.margin.toFixed(2) : 0}%`
    ]);

    exportToExcel(headers, rows, `Reporte_Productos_Mas_Vendidos_${startDateStr}_a_${endDateStr}`);
  };

  const renderSortIcon = (field: string) => {
    if (sortField !== field) return <ArrowUpDown size={13} style={{ opacity: 0.3, marginLeft: '4px' }} />;
    return sortOrder === 'asc' 
      ? <ArrowUp size={13} style={{ color: '#2563eb', marginLeft: '4px' }} /> 
      : <ArrowDown size={13} style={{ color: '#2563eb', marginLeft: '4px' }} />;
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', fontFamily: 'var(--font-geist-sans)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>📦 Reporte Financiero: Productos Más Vendidos</h1>
          <p style={{ color: 'var(--caanma-text-muted)' }}>Análisis de volúmenes de venta, ingresos consolidados, costos y margen de rentabilidad por SKU.</p>
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

      {/* Advanced Filter Bar */}
      <div className="no-print" style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.4rem' }}>Filtros Rápidos</label>
            <select 
              value={selectedPreset}
              onChange={e => handlePresetChange(e.target.value)} 
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', outline: 'none' }}
            >
              <option value="TODAY">Hoy</option>
              <option value="THIS_MONTH">Este Mes</option>
              <option value="LAST_MONTH">Mes Anterior</option>
              <option value="LAST_30_DAYS">Últimos 30 días</option>
              <option value="LAST_90_DAYS">Últimos 90 días</option>
              <option value="CUSTOM">Personalizado</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.4rem' }}>Fecha Inicio</label>
            <input 
              type="date" 
              value={startDateStr} 
              onChange={e => {
                setStartDateStr(e.target.value);
                setSelectedPreset('CUSTOM');
              }} 
              style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', outline: 'none' }} 
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.4rem' }}>Fecha Fin</label>
            <input 
              type="date" 
              value={endDateStr} 
              onChange={e => {
                setEndDateStr(e.target.value);
                setSelectedPreset('CUSTOM');
              }} 
              style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', outline: 'none' }} 
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.4rem' }}>Sucursal</label>
            <select 
              value={branchId} 
              onChange={e => setBranchId(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', outline: 'none' }}
            >
              <option value="ALL">Todas las Sucursales</option>
              {availableFilters.branches.map((b: any) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.4rem' }}>Categoría de Producto</label>
            <select 
              value={category} 
              onChange={e => setCategory(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', outline: 'none' }}
            >
              <option value="ALL">Todas las Categorías</option>
              {availableFilters.categories.map((c: string) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.4rem' }}>Marca</label>
            <select 
              value={brand} 
              onChange={e => setBrand(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', outline: 'none' }}
            >
              <option value="ALL">Todas las Marcas</option>
              {availableFilters.brands?.map((b: string) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.4rem' }}>Vendedor</label>
            <select 
              value={sellerId} 
              onChange={e => setSellerId(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', outline: 'none' }}
            >
              <option value="ALL">Todos los Vendedores</option>
              {usersList?.map((u: any) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>

          <button 
            onClick={handleApplyFilters}
            disabled={isLoading}
            style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '0.55rem', borderRadius: '6px', fontWeight: 'bold', fontSize: '0.875rem', cursor: 'pointer', transition: 'background-color 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor='#1d4ed8'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor='#2563eb'}
          >
            {isLoading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : 'Aplicar'}
          </button>
        </div>
      </div>

      {isLoading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: '#2563eb', fontWeight: 'bold', fontSize: '0.9rem' }}>
          <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
          Calculando análisis detallado...
        </div>
      )}

      <div style={{ opacity: isLoading ? 0.5 : 1, transition: 'opacity 0.2s' }}>
        {/* KPI Panel Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ backgroundColor: 'white', padding: '1.25rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', minWidth: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem', minWidth: 0 }}>
              <div style={{ padding: '0.45rem', backgroundColor: '#eff6ff', borderRadius: '8px', flexShrink: 0 }}><Package size={18} color="#3b82f6" /></div>
              <h3 style={{ fontSize: '0.825rem', fontWeight: 'bold', color: '#64748b', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>SKUs Vendidos</h3>
            </div>
            <div 
              style={{ fontSize: 'clamp(1.15rem, 1.4vw, 1.55rem)', fontWeight: '900', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.02em', lineHeight: 1.2 }}
              title={stats.totalProducts.toLocaleString('es-MX')}
            >
              {stats.totalProducts.toLocaleString('es-MX')}
            </div>
          </div>

          <div style={{ backgroundColor: 'white', padding: '1.25rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', minWidth: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem', minWidth: 0 }}>
              <div style={{ padding: '0.45rem', backgroundColor: '#fdf2f8', borderRadius: '8px', flexShrink: 0 }}><Package size={18} color="#be185d" /></div>
              <h3 style={{ fontSize: '0.825rem', fontWeight: 'bold', color: '#64748b', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Unidades Vendidas</h3>
            </div>
            <div 
              style={{ fontSize: 'clamp(1.15rem, 1.4vw, 1.55rem)', fontWeight: '900', color: '#be185d', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.02em', lineHeight: 1.2 }}
              title={`${stats.totalUnits.toLocaleString('es-MX')} uds`}
            >
              {stats.totalUnits.toLocaleString('es-MX')}{' '}
              <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#94a3b8' }}>uds</span>
            </div>
          </div>

          <div style={{ backgroundColor: 'white', padding: '1.25rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', minWidth: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem', minWidth: 0 }}>
              <div style={{ padding: '0.45rem', backgroundColor: '#f0fdf4', borderRadius: '8px', flexShrink: 0 }}><DollarSign size={18} color="#16a34a" /></div>
              <h3 style={{ fontSize: '0.825rem', fontWeight: 'bold', color: '#64748b', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Ingresos Totales</h3>
            </div>
            <div 
              style={{ fontSize: 'clamp(1.1rem, 1.3vw, 1.45rem)', fontWeight: '900', color: '#16a34a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.02em', lineHeight: 1.2 }}
              title={formatter.format(stats.totalRevenue)}
            >
              {formatter.format(stats.totalRevenue)}
            </div>
          </div>

          <div style={{ backgroundColor: 'white', padding: '1.25rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', minWidth: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem', minWidth: 0 }}>
              <div style={{ padding: '0.45rem', backgroundColor: '#fef2f2', borderRadius: '8px', flexShrink: 0 }}><DollarSign size={18} color="#ef4444" /></div>
              <h3 style={{ fontSize: '0.825rem', fontWeight: 'bold', color: '#64748b', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Costo de Ventas</h3>
            </div>
            <div 
              style={{ fontSize: 'clamp(1.1rem, 1.3vw, 1.45rem)', fontWeight: '900', color: '#ef4444', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.02em', lineHeight: 1.2 }}
              title={formatter.format(stats.totalCost)}
            >
              {formatter.format(stats.totalCost)}
            </div>
          </div>

          <div style={{ backgroundColor: 'white', padding: '1.25rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', minWidth: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem', minWidth: 0 }}>
              <div style={{ padding: '0.45rem', backgroundColor: '#f5f3ff', borderRadius: '8px', flexShrink: 0 }}><TrendingUp size={18} color="#7c3aed" /></div>
              <h3 style={{ fontSize: '0.825rem', fontWeight: 'bold', color: '#64748b', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Ganancia Bruta</h3>
            </div>
            <div 
              style={{ fontSize: 'clamp(1.1rem, 1.3vw, 1.45rem)', fontWeight: '900', color: '#7c3aed', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.02em', lineHeight: 1.2 }}
              title={formatter.format(stats.grossProfit)}
            >
              {formatter.format(stats.grossProfit)}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#7c3aed', fontWeight: 'bold', marginTop: '0.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Margen: {stats.avgMargin.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Chart View */}
        {chartData.length > 0 && (
          <div style={{ backgroundColor: 'white', padding: '1.75rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>
                {chartMetric === 'units' && 'Top 10 Productos por Volumen de Desplazamiento (Unidades)'}
                {chartMetric === 'revenue' && 'Top 10 Productos por Ingresos Brutos ($)'}
                {chartMetric === 'profit' && 'Top 10 Productos por Utilidad Bruta ($)'}
              </h2>

              <div className="no-print" style={{ display: 'flex', backgroundColor: '#f1f5f9', padding: '3px', borderRadius: '8px', gap: '4px' }}>
                <button
                  onClick={() => setChartMetric('units')}
                  style={{
                    padding: '0.35rem 0.75rem',
                    fontSize: '0.8rem',
                    fontWeight: 'bold',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: chartMetric === 'units' ? '#2563eb' : 'transparent',
                    color: chartMetric === 'units' ? 'white' : '#475569',
                    transition: 'all 0.2s'
                  }}
                >
                  📦 Por Unidades
                </button>
                <button
                  onClick={() => setChartMetric('revenue')}
                  style={{
                    padding: '0.35rem 0.75rem',
                    fontSize: '0.8rem',
                    fontWeight: 'bold',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: chartMetric === 'revenue' ? '#2563eb' : 'transparent',
                    color: chartMetric === 'revenue' ? 'white' : '#475569',
                    transition: 'all 0.2s'
                  }}
                >
                  💵 Por Ingresos ($)
                </button>
                <button
                  onClick={() => setChartMetric('profit')}
                  style={{
                    padding: '0.35rem 0.75rem',
                    fontSize: '0.8rem',
                    fontWeight: 'bold',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: chartMetric === 'profit' ? '#2563eb' : 'transparent',
                    color: chartMetric === 'profit' ? 'white' : '#475569',
                    transition: 'all 0.2s'
                  }}
                >
                  📈 Por Ganancia ($)
                </button>
              </div>
            </div>

            <div style={{ width: '100%', height: '320px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 30 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} angle={-20} textAnchor="end" height={55} interval={0} />
                  <YAxis 
                    tick={{ fontSize: 11, fill: '#64748b' }} 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(val) => chartMetric === 'units' ? Number(val).toLocaleString('es-MX') : `$${(val / 1000).toFixed(0)}k`} 
                  />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <Tooltip 
                    formatter={(value: any) => [
                      chartMetric === 'units' ? `${Number(value).toLocaleString('es-MX')} unidades` : formatter.format(Number(value)),
                      chartMetric === 'units' ? 'Cantidad Vendida' : (chartMetric === 'revenue' ? 'Ingresos Totales' : 'Utilidad Bruta')
                    ]}
                    labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', backgroundColor: 'white' }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={45}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getHslColor(index)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Detailed Product Table */}
        <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>Desglose de Desempeño Comercial por SKU</h2>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{filteredData.length} productos listados</span>
            </div>

            <div className="no-print" style={{ position: 'relative', width: '320px' }}>
              <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="text" 
                placeholder="Buscar por SKU, nombre, categoría, marca..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '0.5rem 0.75rem 0.5rem 2.2rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
              />
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#475569', fontSize: '0.85rem', userSelect: 'none' }}>
                  <th style={{ padding: '0.85rem 0.75rem' }}>Lugar</th>
                  <th onClick={() => handleSort('name')} style={{ padding: '0.85rem 0.75rem', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>Nombre del Producto {renderSortIcon('name')}</div>
                  </th>
                  <th onClick={() => handleSort('sku')} style={{ padding: '0.85rem 0.75rem', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>SKU / Código {renderSortIcon('sku')}</div>
                  </th>
                  <th onClick={() => handleSort('category')} style={{ padding: '0.85rem 0.75rem', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>Categoría {renderSortIcon('category')}</div>
                  </th>
                  <th onClick={() => handleSort('cost')} style={{ padding: '0.85rem 0.75rem', textAlign: 'right', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>Costo {renderSortIcon('cost')}</div>
                  </th>
                  <th onClick={() => handleSort('price')} style={{ padding: '0.85rem 0.75rem', textAlign: 'right', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>Precio Venta {renderSortIcon('price')}</div>
                  </th>
                  <th onClick={() => handleSort('quantitySold')} style={{ padding: '0.85rem 0.75rem', textAlign: 'center', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Uds Vendidas {renderSortIcon('quantitySold')}</div>
                  </th>
                  <th onClick={() => handleSort('totalRevenue')} style={{ padding: '0.85rem 0.75rem', textAlign: 'right', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>Ingresos Brutos {renderSortIcon('totalRevenue')}</div>
                  </th>
                  <th onClick={() => handleSort('totalCost')} style={{ padding: '0.85rem 0.75rem', textAlign: 'right', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>Costo Total {renderSortIcon('totalCost')}</div>
                  </th>
                  <th onClick={() => handleSort('grossProfit')} style={{ padding: '0.85rem 0.75rem', textAlign: 'right', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>Utilidad {renderSortIcon('grossProfit')}</div>
                  </th>
                  <th onClick={() => handleSort('margin')} style={{ padding: '0.85rem 0.75rem', textAlign: 'right', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>Margen {renderSortIcon('margin')}</div>
                  </th>
                </tr>
              </thead>
              <tbody style={{ fontSize: '0.875rem', color: '#334155' }}>
                {filteredData.length > 0 ? (
                  filteredData.map((p, idx) => {
                    return (
                      <tr key={p.id || idx} style={{ borderBottom: '1px solid #e2e8f0', transition: 'background-color 0.2s' }} onMouseOver={e => e.currentTarget.style.backgroundColor='#f8fafc'} onMouseOut={e => e.currentTarget.style.backgroundColor='transparent'}>
                        <td style={{ padding: '0.85rem 0.75rem', fontWeight: 'bold', color: '#64748b' }}>#{idx + 1}</td>
                        <td style={{ padding: '0.85rem 0.75rem', fontWeight: 'bold', color: '#0f172a' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div 
                              onClick={() => p.imageUrl && setLightboxImage(p.imageUrl)}
                              style={{ 
                                width: '40px', 
                                height: '40px', 
                                borderRadius: '6px', 
                                border: '1px solid #cbd5e1', 
                                overflow: 'hidden', 
                                backgroundColor: '#f8fafc',
                                cursor: p.imageUrl ? 'pointer' : 'default',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                              }}
                            >
                              {p.imageUrl ? (
                                <img src={p.imageUrl} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>S/F</span>
                              )}
                            </div>
                            <span>{p.name}</span>
                          </div>
                        </td>
                        <td style={{ padding: '0.85rem 0.75rem', fontFamily: 'monospace', fontSize: '0.8rem' }}>{p.sku || "-"} | {p.barcode || "-"}</td>
                        <td style={{ padding: '0.85rem 0.75rem', color: '#64748b' }}>{p.category || "General"}</td>
                        <td style={{ padding: '0.85rem 0.75rem', textAlign: 'right', color: '#64748b' }}>{formatter.format(p.cost)}</td>
                        <td style={{ padding: '0.85rem 0.75rem', textAlign: 'right', color: '#64748b' }}>{formatter.format(p.price)}</td>
                        <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center', fontWeight: 'bold' }}>{p.quantitySold.toLocaleString('es-MX')}</td>
                        <td style={{ padding: '0.85rem 0.75rem', textAlign: 'right', fontWeight: 'bold', color: '#16a34a' }}>{formatter.format(p.totalRevenue)}</td>
                        <td style={{ padding: '0.85rem 0.75rem', textAlign: 'right', color: '#ef4444' }}>{formatter.format(p.totalCost)}</td>
                        <td style={{ padding: '0.85rem 0.75rem', textAlign: 'right', fontWeight: 'bold', color: '#7c3aed' }}>{formatter.format(p.grossProfit)}</td>
                        <td style={{ padding: '0.85rem 0.75rem', textAlign: 'right', fontWeight: 'bold', color: (p.margin || 0) > 20 ? '#16a34a' : '#d97706', fontSize: '0.8rem' }}>
                          {(p.margin || 0).toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={11} style={{ padding: '3rem 0', textAlign: 'center', color: '#94a3b8' }}>
                      No se encontraron productos en el rango de búsqueda o filtros seleccionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {/* Lightbox Modal */}
      {lightboxImage && (
        <div 
          onClick={() => setLightboxImage(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            cursor: 'zoom-out'
          }}
        >
          <div 
            style={{ 
              position: 'relative', 
              maxWidth: '90%', 
              maxHeight: '90%',
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '8px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onClick={e => e.stopPropagation()}
          >
            <img 
              src={lightboxImage} 
              alt="Ampliada" 
              style={{ 
                maxWidth: '100%', 
                maxHeight: '80vh', 
                borderRadius: '8px', 
                objectFit: 'contain' 
              }} 
            />
            <button 
              onClick={() => setLightboxImage(null)}
              style={{
                position: 'absolute',
                top: '-15px',
                right: '-15px',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '30px',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
