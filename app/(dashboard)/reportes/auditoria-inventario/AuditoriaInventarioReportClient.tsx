'use client';

import { useState, useMemo } from 'react';
import {
  ClipboardList,
  AlertTriangle,
  CheckCircle2,
  Search,
  Download,
  Printer,
  Loader2,
  Package,
  Calendar,
  FileSpreadsheet,
  ArrowRight,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { exportToExcel } from '@/lib/exportExcel';
import { formatCurrency } from '@/lib/utils';
import { getAuditCoverageReport } from '@/app/actions/audit';
import BackButton from '@/app/components/ui/BackButton';

const ITEMS_PER_PAGE = 50;

export default function AuditoriaInventarioReportClient({
  initialData,
  initialStartDate,
  initialEndDate,
  initialBranchId
}: {
  initialData: any;
  initialStartDate: string;
  initialEndDate: string;
  initialBranchId: string;
}) {
  const [data, setData] = useState<any>(initialData);
  const [startDateStr, setStartDateStr] = useState(initialStartDate);
  const [endDateStr, setEndDateStr] = useState(initialEndDate);
  const [branchId, setBranchId] = useState(initialBranchId);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [brandFilter, setBrandFilter] = useState('ALL');
  const [locationFilter, setLocationFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewTab, setViewTab] = useState<'UNCOUNTED_WITH_STOCK' | 'COUNTED_IN_PERIOD' | 'ALL_WITH_STOCK'>('UNCOUNTED_WITH_STOCK');
  const [includeZeroStock, setIncludeZeroStock] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const triggerUpdate = async (startStr: string, endStr: string, bId: string) => {
    setIsLoading(true);
    try {
      const res = await getAuditCoverageReport(startStr, endStr, bId);
      setData(res);
      setCurrentPage(1);
    } catch (err) {
      console.error('Error fetching audit coverage report:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePresetChange = (preset: string) => {
    const today = new Date();
    const start = new Date();
    const end = new Date();

    switch (preset) {
      case 'TODAY':
        break;
      case 'THIS_WEEK': {
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1);
        start.setDate(diff);
        break;
      }
      case 'THIS_MONTH':
        start.setDate(1);
        break;
      case 'LAST_MONTH':
        start.setMonth(start.getMonth() - 1);
        start.setDate(1);
        end.setDate(0);
        break;
      case 'LAST_30_DAYS':
        start.setDate(today.getDate() - 30);
        break;
      case 'LAST_90_DAYS':
        start.setDate(today.getDate() - 90);
        break;
      default:
        return;
    }

    const sStr = start.toISOString().split('T')[0];
    const eStr = end.toISOString().split('T')[0];
    setStartDateStr(sStr);
    setEndDateStr(eStr);
    triggerUpdate(sStr, eStr, branchId);
  };

  const handleApplyFilters = () => {
    triggerUpdate(startDateStr, endDateStr, branchId);
  };

  // Filter items according to selected tab and secondary filters
  const filteredItems = useMemo(() => {
    const list: any[] = data?.items || [];

    return list.filter(item => {
      // 1. Tab filter
      if (viewTab === 'UNCOUNTED_WITH_STOCK') {
        if (item.countedInPeriod) return false;
        if (!includeZeroStock && item.stock <= 0) return false;
      } else if (viewTab === 'COUNTED_IN_PERIOD') {
        if (!item.countedInPeriod) return false;
        if (!includeZeroStock && item.stock <= 0 && (item.periodAudit?.countedQty ?? 0) <= 0) {
          // Still show counted items in period unless filtered out
        }
      } else if (viewTab === 'ALL_WITH_STOCK') {
        if (!includeZeroStock && item.stock <= 0) return false;
      }

      // 2. Category / Brand / Location
      if (categoryFilter !== 'ALL' && item.category !== categoryFilter) return false;
      if (brandFilter !== 'ALL' && item.brand !== brandFilter) return false;
      if (locationFilter !== 'ALL' && item.location !== locationFilter) return false;

      // 3. Search term
      if (searchTerm.trim() !== '') {
        const normQuery = searchTerm.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
        const words = normQuery.split(/\s+/).filter(Boolean);
        const normName = (item.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const normSku = (item.sku || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const normBarcode = (item.barcode || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const normCat = (item.category || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const normLoc = (item.location || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        const matches = words.every(
          w =>
            normName.includes(w) ||
            normSku.includes(w) ||
            normBarcode.includes(w) ||
            normCat.includes(w) ||
            normLoc.includes(w)
        );
        if (!matches) return false;
      }

      return true;
    });
  }, [data?.items, viewTab, includeZeroStock, categoryFilter, brandFilter, locationFilter, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedItems = filteredItems.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  const handleExportExcel = () => {
    const headers = [
      'Sucursal',
      'SKU',
      'Código de Barras',
      'Producto',
      'Categoría',
      'Marca',
      'Ubicación',
      'Stock en CAANMA',
      'Costo Unitario',
      'Valor Stock (Costo)',
      'Precio Venta',
      'Valor Stock (Venta)',
      'Estado en Periodo',
      'Auditoría en Periodo',
      'Fecha Conteo en Periodo',
      'Conteo Físico en Periodo',
      'Diferencia en Auditoría',
      'Última Auditoría Histórica',
      'Fecha Última Auditoría Histórica',
      'Conteo Físico (Para Revisar)'
    ];

    const rows = filteredItems.map((item: any) => [
      item.branchName,
      item.sku || '-',
      item.barcode || '-',
      item.name,
      item.category,
      item.brand,
      item.location,
      item.stock,
      Number((item.cost || 0).toFixed(2)),
      Number((item.costValue || 0).toFixed(2)),
      Number((item.price || 0).toFixed(2)),
      Number((item.priceValue || 0).toFixed(2)),
      item.countedInPeriod ? 'CONTADO EN PERIODO' : 'FALTA POR REVISAR (SIN CONTAR)',
      item.periodAudit ? item.periodAudit.auditName : '-',
      item.periodAudit ? new Date(item.periodAudit.auditDate).toLocaleString('es-MX') : '-',
      item.periodAudit ? item.periodAudit.countedQty : '-',
      item.periodAudit ? item.periodAudit.discrepancy : '-',
      item.lastHistoricalAudit ? item.lastHistoricalAudit.auditName : 'Nunca auditado',
      item.lastHistoricalAudit ? new Date(item.lastHistoricalAudit.auditDate).toLocaleDateString('es-MX') : '-',
      ''
    ]);

    const tabLabel =
      viewTab === 'UNCOUNTED_WITH_STOCK'
        ? 'Faltantes_Por_Revisar'
        : viewTab === 'COUNTED_IN_PERIOD'
          ? 'Contados_En_Periodo'
          : 'Cobertura_Completa';

    exportToExcel(headers, rows, `Reporte_Auditoria_${tabLabel}_${startDateStr}_a_${endDateStr}`);
  };

  const handleDownloadCSVForAudit = () => {
    let content = 'sku,cantidad\n';
    filteredItems.forEach((item: any) => {
      if (item.sku) {
        content += `${item.sku},\n`;
      }
    });
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Plantilla_Conteo_Faltantes_${startDateStr}_a_${endDateStr}.csv`;
    a.click();
  };

  const metrics = data?.metrics || {
    totalCatalogProducts: 0,
    totalWithStock: 0,
    uncountedWithStockCount: 0,
    countedWithStockCount: 0,
    allCountedInPeriodCount: 0,
    uncountedUnits: 0,
    uncountedCostValue: 0,
    uncountedPriceValue: 0,
    coveragePercent: 0,
    auditsInPeriodCount: 0
  };

  return (
    <div style={{ maxWidth: '1250px', margin: '0 auto', fontFamily: 'var(--font-geist-sans)' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem' }}>
        <div>
          <div style={{ marginBottom: '0.5rem' }}>
            <BackButton fallbackHref="/reportes" label="Volver a Reportes" style={{ color: '#3b82f6', fontSize: '0.9rem' }} />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', margin: '0 0 0.25rem 0', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <ClipboardList size={28} color="#0284c7" />
            Reporte de Auditoría de Inventario (Artículos por Revisar)
          </h1>
          <p style={{ color: 'var(--caanma-text-muted)', margin: 0 }}>
            Detecta qué artículos tienen inventario en CAANMA pero <strong>no han sido contados</strong> en el rango de fechas seleccionado.
          </p>
        </div>

        <div className="no-print" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link
            href="/productos/auditorias"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: 'white',
              color: '#0284c7',
              border: '1px solid #bae6fd',
              padding: '0.65rem 1.1rem',
              borderRadius: '8px',
              fontWeight: 'bold',
              textDecoration: 'none',
              fontSize: '0.9rem'
            }}
          >
            <ClipboardList size={18} /> Ir a Toma Física
          </Link>

          <button
            type="button"
            onClick={handleDownloadCSVForAudit}
            title="Descargar plantilla CSV lista para subir en una Toma Física de Inventario"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: 'white',
              color: '#334155',
              border: '1px solid #cbd5e1',
              padding: '0.65rem 1.1rem',
              borderRadius: '8px',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            <Download size={18} /> Plantilla CSV (Toma Física)
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: '#6d28d9',
              color: 'white',
              border: 'none',
              padding: '0.65rem 1.15rem',
              borderRadius: '8px',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            <Printer size={18} /> Imprimir / PDF
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: '#15803d',
              color: 'white',
              border: 'none',
              padding: '0.65rem 1.35rem',
              borderRadius: '8px',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '0.95rem',
              boxShadow: '0 2px 4px rgba(21, 128, 61, 0.2)'
            }}
          >
            <FileSpreadsheet size={18} /> Exportar Excel (.xlsx)
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="no-print" style={{ backgroundColor: 'white', padding: '1.25rem 1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '1.75rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(165px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.4rem' }}>Periodo Rápido</label>
            <select
              onChange={e => handlePresetChange(e.target.value)}
              defaultValue="LAST_30_DAYS"
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', outline: 'none' }}
            >
              <option value="TODAY">Hoy</option>
              <option value="THIS_WEEK">Esta Semana</option>
              <option value="THIS_MONTH">Este Mes</option>
              <option value="LAST_MONTH">Mes Anterior</option>
              <option value="LAST_30_DAYS">Últimos 30 días</option>
              <option value="LAST_90_DAYS">Últimos 90 días</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.4rem' }}>Fecha Inicio</label>
            <input
              type="date"
              value={startDateStr}
              onChange={e => setStartDateStr(e.target.value)}
              style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.4rem' }}>Fecha Fin</label>
            <input
              type="date"
              value={endDateStr}
              onChange={e => setEndDateStr(e.target.value)}
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
              {data?.filters?.branches?.map((b: any) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.4rem' }}>Categoría</label>
            <select
              value={categoryFilter}
              onChange={e => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', outline: 'none' }}
            >
              <option value="ALL">Todas las Categorías</option>
              {data?.filters?.categories?.map((c: string) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.4rem' }}>Marca</label>
            <select
              value={brandFilter}
              onChange={e => { setBrandFilter(e.target.value); setCurrentPage(1); }}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', outline: 'none' }}
            >
              <option value="ALL">Todas las Marcas</option>
              {data?.filters?.brands?.map((b: string) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {data?.filters?.locations?.length > 0 && (
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.4rem' }}>Ubicación</label>
              <select
                value={locationFilter}
                onChange={e => { setLocationFilter(e.target.value); setCurrentPage(1); }}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', outline: 'none' }}
              >
                <option value="ALL">Todas las Ubicaciones</option>
                {data?.filters?.locations?.map((loc: string) => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>
          )}

          <button
            type="button"
            onClick={handleApplyFilters}
            disabled={isLoading}
            style={{
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              padding: '0.55rem 1rem',
              borderRadius: '6px',
              fontWeight: 'bold',
              fontSize: '0.875rem',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.35rem'
            }}
          >
            {isLoading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : 'Consultar Periodo'}
          </button>
        </div>
      </div>

      {isLoading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', color: '#2563eb', fontWeight: 'bold', fontSize: '0.9rem' }}>
          <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
          Analizando auditorías e inventario en el periodo seleccionado...
        </div>
      )}

      {/* KPI Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.75rem', opacity: isLoading ? 0.6 : 1 }}>
        <div style={{ backgroundColor: '#fff1f2', padding: '1.25rem', borderRadius: '12px', border: '1px solid #fecdd3' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <AlertTriangle size={20} color="#e11d48" />
            <h3 style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#9f1239', margin: 0 }}>Faltantes por Revisar (Con Stock)</h3>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#be123c' }}>
            {metrics.uncountedWithStockCount.toLocaleString('es-MX')} <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>artículos</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#9f1239', marginTop: '0.35rem', fontWeight: 600 }}>
            {metrics.uncountedUnits.toLocaleString('es-MX')} uds en sistema sin auditar
          </div>
        </div>

        <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Package size={20} color="#d97706" />
            <h3 style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#64748b', margin: 0 }}>Valor Sin Revisar (A Costo)</h3>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: '900', color: '#0f172a' }}>
            {formatCurrency(metrics.uncountedCostValue)}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.35rem' }}>
            Precio Venta: <strong>{formatCurrency(metrics.uncountedPriceValue)}</strong>
          </div>
        </div>

        <div style={{ backgroundColor: '#f0fdf4', padding: '1.25rem', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <CheckCircle2 size={20} color="#16a34a" />
            <h3 style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#166534', margin: 0 }}>Auditados en el Periodo</h3>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#15803d' }}>
            {metrics.countedWithStockCount.toLocaleString('es-MX')} <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>de {metrics.totalWithStock.toLocaleString('es-MX')}</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#166534', marginTop: '0.35rem', fontWeight: 600 }}>
            Cobertura con stock: {metrics.coveragePercent}% ({metrics.auditsInPeriodCount} auditorías)
          </div>
        </div>
      </div>

      {/* Audits in Period Summary Pills */}
      {data?.auditsInPeriod?.length > 0 && (
        <div className="no-print" style={{ backgroundColor: '#f8fafc', padding: '0.9rem 1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Calendar size={15} /> Auditorías registradas en este periodo ({data.auditsInPeriod.length}):
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {data.auditsInPeriod.map((a: any) => (
              <Link
                key={a.id}
                href={`/productos/auditorias/${a.id}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.35rem 0.7rem',
                  borderRadius: '999px',
                  backgroundColor: 'white',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.78rem',
                  color: '#1e293b',
                  textDecoration: 'none',
                  fontWeight: 600
                }}
              >
                <span>{a.name}</span>
                <span style={{ color: '#64748b' }}>({a.itemsCount} contados)</span>
                <ArrowRight size={12} color="#2563eb" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Main Table Card */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        {/* View Tabs & Search */}
        <div className="no-print" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', backgroundColor: '#f8fafc' }}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => { setViewTab('UNCOUNTED_WITH_STOCK'); setCurrentPage(1); }}
              style={{
                padding: '0.55rem 1rem',
                borderRadius: '8px',
                border: viewTab === 'UNCOUNTED_WITH_STOCK' ? '2px solid #e11d48' : '1px solid #cbd5e1',
                backgroundColor: viewTab === 'UNCOUNTED_WITH_STOCK' ? '#fff1f2' : 'white',
                color: viewTab === 'UNCOUNTED_WITH_STOCK' ? '#be123c' : '#475569',
                fontWeight: 'bold',
                fontSize: '0.88rem',
                cursor: 'pointer'
              }}
            >
              🚨 Faltantes por Revisar (Sin Contar) ({metrics.uncountedWithStockCount})
            </button>

            <button
              type="button"
              onClick={() => { setViewTab('COUNTED_IN_PERIOD'); setCurrentPage(1); }}
              style={{
                padding: '0.55rem 1rem',
                borderRadius: '8px',
                border: viewTab === 'COUNTED_IN_PERIOD' ? '2px solid #16a34a' : '1px solid #cbd5e1',
                backgroundColor: viewTab === 'COUNTED_IN_PERIOD' ? '#f0fdf4' : 'white',
                color: viewTab === 'COUNTED_IN_PERIOD' ? '#15803d' : '#475569',
                fontWeight: 'bold',
                fontSize: '0.88rem',
                cursor: 'pointer'
              }}
            >
              ✅ Contados en el Periodo ({metrics.allCountedInPeriodCount})
            </button>

            <button
              type="button"
              onClick={() => { setViewTab('ALL_WITH_STOCK'); setCurrentPage(1); }}
              style={{
                padding: '0.55rem 1rem',
                borderRadius: '8px',
                border: viewTab === 'ALL_WITH_STOCK' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                backgroundColor: viewTab === 'ALL_WITH_STOCK' ? '#eff6ff' : 'white',
                color: viewTab === 'ALL_WITH_STOCK' ? '#1d4ed8' : '#475569',
                fontWeight: 'bold',
                fontSize: '0.88rem',
                cursor: 'pointer'
              }}
            >
              📋 Todos con Inventario ({metrics.totalWithStock})
            </button>

            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', color: '#475569', marginLeft: '0.5rem', cursor: 'pointer', fontWeight: 500 }}>
              <input
                type="checkbox"
                checked={includeZeroStock}
                onChange={e => { setIncludeZeroStock(e.target.checked); setCurrentPage(1); }}
              />
              Incluir artículos con stock 0
            </label>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', width: '270px' }}>
              <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Buscar SKU, código, producto..."
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                style={{ width: '100%', padding: '0.5rem 0.75rem 0.5rem 2.2rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', backgroundColor: 'white' }}
              />
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #f1f5f9', backgroundColor: '#f8fafc', color: '#475569', fontSize: '0.8rem', fontWeight: 'bold' }}>
                <th style={{ padding: '0.9rem 1rem' }}>Sucursal</th>
                <th style={{ padding: '0.9rem 1rem' }}>SKU / Código</th>
                <th style={{ padding: '0.9rem 1rem' }}>Producto</th>
                <th style={{ padding: '0.9rem 1rem' }}>Categoría / Ubicación</th>
                <th style={{ padding: '0.9rem 1rem', textAlign: 'center' }}>Stock en CAANMA</th>
                <th style={{ padding: '0.9rem 1rem', textAlign: 'right' }}>Costo / Valor Stock</th>
                <th style={{ padding: '0.9rem 1rem', textAlign: 'center' }}>Estado en Periodo</th>
                <th style={{ padding: '0.9rem 1rem' }}>Última Revisión / Auditoría</th>
              </tr>
            </thead>
            <tbody style={{ fontSize: '0.875rem', color: '#334155' }}>
              {paginatedItems.length > 0 ? (
                paginatedItems.map((item: any) => (
                  <tr
                    key={item.id}
                    style={{ borderBottom: '1px solid #f1f5f9' }}
                  >
                    <td style={{ padding: '0.85rem 1rem', color: '#475569', fontWeight: 500 }}>
                      {item.branchName}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', fontSize: '0.8rem', color: '#475569' }}>
                      <div><strong>SKU:</strong> {item.sku || '-'}</div>
                      <div style={{ color: '#94a3b8' }}><strong>Cód:</strong> {item.barcode || '-'}</div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 'bold', color: '#0f172a' }}>
                      {item.name}
                      {item.brand && item.brand !== 'Sin marca' && (
                        <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 'normal' }}>Marca: {item.brand}</div>
                      )}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.82rem', color: '#475569' }}>
                      <div>{item.category}</div>
                      {item.location && item.location !== 'Sin ubicación' && (
                        <div style={{ color: '#0284c7', fontWeight: 600, fontSize: '0.75rem' }}>📍 {item.location}</div>
                      )}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '0.25rem 0.65rem',
                        borderRadius: '8px',
                        fontWeight: '900',
                        fontSize: '0.95rem',
                        backgroundColor: item.stock > 0 ? '#eff6ff' : '#f1f5f9',
                        color: item.stock > 0 ? '#1d4ed8' : '#64748b'
                      }}>
                        {item.stock} {item.unit}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                      <div style={{ fontWeight: 'bold', color: '#0f172a' }}>{formatCurrency(item.costValue)}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Unit: {formatCurrency(item.cost)}</div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                      {item.countedInPeriod ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          backgroundColor: '#dcfce7',
                          color: '#166534',
                          padding: '0.25rem 0.65rem',
                          borderRadius: '999px',
                          fontSize: '0.75rem',
                          fontWeight: 'bold'
                        }}>
                          <CheckCircle2 size={14} /> Contado ({item.periodAudit?.countedQty})
                        </span>
                      ) : (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          backgroundColor: '#ffe4e6',
                          color: '#be123c',
                          padding: '0.25rem 0.65rem',
                          borderRadius: '999px',
                          fontSize: '0.75rem',
                          fontWeight: 'bold'
                        }}>
                          <AlertTriangle size={14} /> Falta por revisar
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.8rem', color: '#475569' }}>
                      {item.periodAudit ? (
                        <div>
                          <div style={{ fontWeight: 'bold', color: '#0f172a' }}>{item.periodAudit.auditName}</div>
                          <div style={{ color: '#64748b' }}>
                            {new Date(item.periodAudit.auditDate).toLocaleDateString('es-MX')} &bull; Dif:{' '}
                            <strong style={{ color: item.periodAudit.discrepancy === 0 ? '#16a34a' : '#dc2626' }}>
                              {item.periodAudit.discrepancy > 0 ? `+${item.periodAudit.discrepancy}` : item.periodAudit.discrepancy}
                            </strong>
                          </div>
                        </div>
                      ) : item.lastHistoricalAudit ? (
                        <div>
                          <div style={{ color: '#64748b' }}>Última vez: <strong>{new Date(item.lastHistoricalAudit.auditDate).toLocaleDateString('es-MX')}</strong></div>
                          <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{item.lastHistoricalAudit.auditName}</div>
                        </div>
                      ) : (
                        <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Nunca auditado</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} style={{ padding: '3rem 1rem', textAlign: 'center', color: '#94a3b8' }}>
                    No se encontraron artículos con los filtros seleccionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="no-print" style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>
            Mostrando <strong>{paginatedItems.length}</strong> de <strong>{filteredItems.length.toLocaleString('es-MX')}</strong> artículos (El botón <strong>Exportar Excel</strong> descarga los {filteredItems.length.toLocaleString('es-MX')} registros completos)
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  padding: '0.45rem 0.85rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: safePage <= 1 ? '#f1f5f9' : 'white',
                  color: safePage <= 1 ? '#94a3b8' : '#1e293b',
                  fontWeight: 'bold',
                  fontSize: '0.85rem',
                  cursor: safePage <= 1 ? 'not-allowed' : 'pointer'
                }}
              >
                <ChevronLeft size={16} /> Anterior
              </button>
              <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#475569' }}>
                Página {safePage} de {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  padding: '0.45rem 0.85rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: safePage >= totalPages ? '#f1f5f9' : 'white',
                  color: safePage >= totalPages ? '#94a3b8' : '#1e293b',
                  fontWeight: 'bold',
                  fontSize: '0.85rem',
                  cursor: safePage >= totalPages ? 'not-allowed' : 'pointer'
                }}
              >
                Siguiente <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
