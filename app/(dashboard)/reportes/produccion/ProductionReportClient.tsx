'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Package, ArrowDownToLine, Loader2, Search, DollarSign, ArrowUpDown, ChevronLeft, ChevronRight, ChefHat } from 'lucide-react';
import { getProductionReportData } from '@/app/actions/reportes';
import { createProductionOrdersBulk } from '@/app/actions/manufacturing';

interface ProductionProduct {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  category: string;
  stock: number;
  cost: number;
  price: number;
  quantitySold: number;
  dailyAvg: number;
  imageUrl?: string | null;
  recipeId: string;
}

export default function ProductionReportClient({ 
  initialData, 
  initialBranchId, 
  availableFilters 
}: { 
  initialData: ProductionProduct[]; 
  initialBranchId: string; 
  availableFilters: any; 
}) {
  const router = useRouter();
  const [data, setData] = useState<ProductionProduct[]>(initialData);
  const [branchId, setBranchId] = useState(initialBranchId);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSendToProduction = async () => {
    // 1. Filter products that need production from filteredData
    const itemsToProduce = filteredData.filter(p => p.suggestedRestock > 0 && p.recipeId);
    if (itemsToProduce.length === 0) {
      alert("No hay productos con faltante en la consulta actual para enviar a producción.");
      return;
    }

    if (!confirm(`Se generarán órdenes de producción para ${itemsToProduce.length} artículos con faltantes. ¿Deseas continuar?`)) {
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = itemsToProduce.map(p => ({
        recipeId: p.recipeId,
        quantity: p.suggestedRestock
      }));

      const res = await createProductionOrdersBulk(payload);
      if (res && res.success) {
        alert(`¡Se crearon ${res.count} órdenes de producción con éxito! Redirigiendo al panel de procesos...`);
        router.push('/procesos');
      } else {
        alert(res?.error || "Error al enviar artículos a producción.");
      }
    } catch (e: any) {
      console.error(e);
      alert("Error de red al crear órdenes de producción.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const [category, setCategory] = useState('ALL');
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [coverageDays, setCoverageDays] = useState(30);
  const [onlyNeedsRestock, setOnlyNeedsRestock] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Sorting state
  const [sortBy, setSortBy] = useState<string>('suggestedRestock');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Default dates (last 30 days)
  const defaultEnd = new Date();
  const defaultStart = new Date();
  defaultStart.setDate(defaultEnd.getDate() - 30);

  const [startDateStr, setStartDateStr] = useState(defaultStart.toISOString().split('T')[0]);
  const [endDateStr, setEndDateStr] = useState(defaultEnd.toISOString().split('T')[0]);

  // Predefined Date Ranges
  const handlePresetChange = (preset: string) => {
    const today = new Date();
    let start = new Date();
    let end = new Date();

    switch (preset) {
      case 'TODAY':
        start.setHours(0, 0, 0, 0);
        break;
      case 'LAST_7_DAYS':
        start.setDate(today.getDate() - 7);
        break;
      case 'LAST_15_DAYS':
        start.setDate(today.getDate() - 15);
        break;
      case 'LAST_30_DAYS':
        start.setDate(today.getDate() - 30);
        break;
      case 'LAST_60_DAYS':
        start.setDate(today.getDate() - 60);
        break;
      case 'LAST_90_DAYS':
        start.setDate(today.getDate() - 90);
        break;
      case 'THIS_MONTH':
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        break;
      default:
        return;
    }

    setStartDateStr(start.toISOString().split('T')[0]);
    setEndDateStr(end.toISOString().split('T')[0]);
    triggerUpdate(start, end, branchId, category);
  };

  const triggerUpdate = async (start: Date, end: Date, bId: string, cat: string) => {
    setIsLoading(true);
    try {
      const res = await getProductionReportData(start, end, bId, cat);
      setData(res || []);
      setCurrentPage(1);
    } catch (error) {
      console.error("Error updating production report:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyFilters = () => {
    const start = new Date(startDateStr + 'T00:00:00');
    const end = new Date(endDateStr + 'T23:59:59');
    triggerUpdate(start, end, branchId, category);
  };

  // Format currency
  const formatter = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

  // Calculate dynamic values for all data based on current coverageDays
  const processedData = useMemo(() => {
    return data.map(p => {
      const neededStock = Math.ceil(p.dailyAvg * coverageDays);
      const suggestedRestock = Math.max(0, neededStock - p.stock);
      const replenishmentCost = suggestedRestock * p.cost;

      return {
        ...p,
        neededStock,
        suggestedRestock,
        replenishmentCost
      };
    });
  }, [data, coverageDays]);

  // Handle column sorting
  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  // Filter local search and onlyNeedsRestock inside the table
  const filteredData = useMemo(() => {
    let result = processedData.filter(p => {
      // Filter by text search
      const term = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
        p.name.toLowerCase().includes(term) ||
        (p.sku && p.sku.toLowerCase().includes(term)) ||
        (p.barcode && p.barcode.toLowerCase().includes(term));

      // Filter by restock constraint
      const matchesRestock = !onlyNeedsRestock || p.suggestedRestock > 0;

      return matchesSearch && matchesRestock;
    });

    // Apply sorting
    result.sort((a: any, b: any) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];

      // Handle string vs number sorting
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [processedData, searchTerm, onlyNeedsRestock, sortBy, sortOrder]);

  // Aggregate stats based on filtered data
  const stats = useMemo(() => {
    const totalSKUs = filteredData.length;
    const skusToRestock = filteredData.filter(p => p.suggestedRestock > 0).length;
    const totalUnitsToRestock = filteredData.reduce((acc, p) => acc + p.suggestedRestock, 0);
    const totalCostToRestock = filteredData.reduce((acc, p) => acc + p.replenishmentCost, 0);

    return {
      totalSKUs,
      skusToRestock,
      totalUnitsToRestock,
      totalCostToRestock
    };
  }, [filteredData]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredData.slice(startIndex, startIndex + pageSize);
  }, [filteredData, currentPage, pageSize]);

  // Download CSV report
  const downloadCSV = () => {
    const headers = [
      "SKU", 
      "Código de Barras",
      "Nombre del Producto", 
      "Costo Unitario", 
      "Precio Unitario", 
      "Existencias", 
      "Uds Vendidas", 
      `Días Cobertura (${coverageDays})`, 
      "Requerido", 
      "Sugerido a Producir", 
      "Costo Estimado Producción"
    ];
    const rows = filteredData.map(p => [
      p.sku || "N/A",
      p.barcode || "N/A",
      p.name,
      p.cost.toFixed(2),
      p.price.toFixed(2),
      p.stock,
      p.quantitySold,
      coverageDays,
      p.neededStock,
      p.suggestedRestock,
      p.replenishmentCost.toFixed(2)
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.map(val => `"${val.toString().replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Reporte_Produccion_${startDateStr}_a_${endDateStr}_cobertura_${coverageDays}d.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', fontFamily: 'var(--font-geist-sans)' }}>
      {/* Header section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            📋 Reporte de Producción
          </h1>
          <p style={{ color: 'var(--pulpos-text-muted)' }}>
            Sugerencia de fabricación de stock en base al ritmo de venta y stock actual de productos con receta.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button 
            onClick={handleSendToProduction}
            disabled={isSubmitting}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              backgroundColor: 'var(--pulpos-primary)', 
              color: 'white', 
              border: 'none', 
              padding: '0.65rem 1.25rem', 
              borderRadius: '8px', 
              fontWeight: 'bold', 
              cursor: isSubmitting ? 'not-allowed' : 'pointer', 
              transition: 'opacity 0.2s',
              boxShadow: '0 4px 6px -1px rgba(139, 92, 246, 0.2)',
              opacity: isSubmitting ? 0.7 : 1
            }}
          >
            <ChefHat size={18} /> Mandar a producción
          </button>
          <button 
            onClick={downloadCSV}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#0f172a', color: 'white', border: 'none', padding: '0.65rem 1.25rem', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: 'background-color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor='#1e293b'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor='#0f172a'}
          >
            <ArrowDownToLine size={18} /> Exportar CSV
          </button>
        </div>
      </div>

      {/* Advanced Filter Bar */}
      <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.4rem' }}>Filtros Rápidos</label>
            <select 
              onChange={e => handlePresetChange(e.target.value)} 
              defaultValue="LAST_30_DAYS"
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', outline: 'none' }}
            >
              <option value="TODAY">Hoy</option>
              <option value="LAST_7_DAYS">Últimos 7 días</option>
              <option value="LAST_15_DAYS">Últimos 15 días</option>
              <option value="LAST_30_DAYS">Últimos 30 días</option>
              <option value="LAST_60_DAYS">Últimos 60 días</option>
              <option value="LAST_90_DAYS">Últimos 90 días</option>
              <option value="THIS_MONTH">Este Mes</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.4rem' }}>Fecha Referencia Inicio</label>
            <input 
              type="date" 
              value={startDateStr} 
              onChange={e => setStartDateStr(e.target.value)} 
              style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', outline: 'none' }} 
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.4rem' }}>Fecha Referencia Fin</label>
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
              {availableFilters.branches.map((b: any) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.4rem' }}>Categoría</label>
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

          <button 
            onClick={handleApplyFilters}
            disabled={isLoading}
            style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '0.55rem', borderRadius: '6px', fontWeight: 'bold', fontSize: '0.875rem', cursor: 'pointer', transition: 'background-color 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor='#1d4ed8'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor='#2563eb'}
          >
            {isLoading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : 'Consultar ventas'}
          </button>
        </div>
      </div>

      {/* Coverage Days Section */}
      <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>⏱️ Proyección de Días de Cobertura</h3>
            <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>
              Define cuántos días de ventas deseas cubrir con tu stock disponible. Las sugerencias se recalcularán automáticamente en tiempo real.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input 
              type="number" 
              min={1} 
              max={365}
              value={coverageDays} 
              onChange={e => setCoverageDays(Math.max(1, parseInt(e.target.value) || 30))}
              style={{ width: '80px', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none', textAlign: 'center', fontWeight: 'bold' }} 
            />
            <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#475569' }}>días</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <input 
            type="range" 
            min={1} 
            max={120} 
            value={coverageDays} 
            onChange={e => setCoverageDays(parseInt(e.target.value))}
            style={{ flex: 1, accentColor: '#2563eb', height: '6px', cursor: 'pointer' }}
          />
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={() => setCoverageDays(7)} style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', cursor: 'pointer', backgroundColor: coverageDays === 7 ? '#2563eb' : 'white', color: coverageDays === 7 ? 'white' : '#475569', fontWeight: 'bold' }}>1 Sem (7d)</button>
            <button onClick={() => setCoverageDays(15)} style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', cursor: 'pointer', backgroundColor: coverageDays === 15 ? '#2563eb' : 'white', color: coverageDays === 15 ? 'white' : '#475569', fontWeight: 'bold' }}>Quincena (15d)</button>
            <button onClick={() => setCoverageDays(30)} style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', cursor: 'pointer', backgroundColor: coverageDays === 30 ? '#2563eb' : 'white', color: coverageDays === 30 ? 'white' : '#475569', fontWeight: 'bold' }}>1 Mes (30d)</button>
            <button onClick={() => setCoverageDays(60)} style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', cursor: 'pointer', backgroundColor: coverageDays === 60 ? '#2563eb' : 'white', color: coverageDays === 60 ? 'white' : '#475569', fontWeight: 'bold' }}>2 Meses (60d)</button>
          </div>
        </div>
      </div>

      {isLoading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: '#2563eb', fontWeight: 'bold', fontSize: '0.9rem' }}>
          <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
          Actualizando catálogo y proyecciones de producción...
        </div>
      )}

      <div style={{ opacity: isLoading ? 0.5 : 1, transition: 'opacity 0.2s' }}>
        {/* KPI Panel Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{ padding: '0.5rem', backgroundColor: '#eff6ff', borderRadius: '8px' }}><Package size={20} color="#3b82f6" /></div>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#64748b' }}>Productos con Receta</h3>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#1e293b' }}>{stats.totalSKUs}</div>
          </div>

          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{ padding: '0.5rem', backgroundColor: '#fef2f2', borderRadius: '8px' }}><Package size={20} color="#ef4444" /></div>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#64748b' }}>Artículos a Producir</h3>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#ef4444' }}>{stats.skusToRestock} <span style={{ fontSize: '1rem', fontWeight: 'normal', color: '#64748b' }}>recetas</span></div>
          </div>

          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{ padding: '0.5rem', backgroundColor: '#fff7ed', borderRadius: '8px' }}><Package size={20} color="#ea580c" /></div>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#64748b' }}>Total Unidades a Fabricar</h3>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#ea580c' }}>{stats.totalUnitsToRestock} <span style={{ fontSize: '1rem', fontWeight: 'normal', color: '#64748b' }}>uds</span></div>
          </div>

          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{ padding: '0.5rem', backgroundColor: '#f0fdf4', borderRadius: '8px' }}><DollarSign size={20} color="#16a34a" /></div>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#64748b' }}>Costo de Producción</h3>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#16a34a' }}>{formatter.format(stats.totalCostToRestock)}</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.1rem' }}>Estimado a precio de costo de receta</div>
          </div>
        </div>

        {/* Detailed Product Table */}
        <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>Desglose de Sugerencias de Producción</h2>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', color: '#475569', cursor: 'pointer', userSelect: 'none' }}>
                <input 
                  type="checkbox" 
                  checked={onlyNeedsRestock}
                  onChange={e => setOnlyNeedsRestock(e.target.checked)}
                  style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                />
                <span>Mostrar solo productos con falta de stock</span>
              </label>
            </div>
            <div style={{ position: 'relative', width: '280px' }}>
              <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="text" 
                placeholder="Buscar por SKU, CB, nombre..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '0.45rem 0.75rem 0.45rem 2.2rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
              />
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #f1f5f9', color: '#475569', fontSize: '0.8rem', fontWeight: 'bold', userSelect: 'none' }}>
                  <th style={{ padding: '1rem 0.75rem', cursor: 'pointer' }} onClick={() => handleSort('sku')}>
                    SKU <ArrowUpDown size={12} style={{ display: 'inline', marginLeft: '2px' }} />
                  </th>
                  <th style={{ padding: '1rem 0.75rem', cursor: 'pointer' }} onClick={() => handleSort('barcode')}>
                    Código de Barras <ArrowUpDown size={12} style={{ display: 'inline', marginLeft: '2px' }} />
                  </th>
                  <th style={{ padding: '1rem 0.75rem', cursor: 'pointer' }} onClick={() => handleSort('name')}>
                    Nombre del Producto <ArrowUpDown size={12} style={{ display: 'inline', marginLeft: '2px' }} />
                  </th>
                  <th style={{ padding: '1rem 0.75rem', textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('cost')}>
                    Costo <ArrowUpDown size={12} style={{ display: 'inline', marginLeft: '2px' }} />
                  </th>
                  <th style={{ padding: '1rem 0.75rem', textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('stock')}>
                    Stock Act. <ArrowUpDown size={12} style={{ display: 'inline', marginLeft: '2px' }} />
                  </th>
                  <th style={{ padding: '1rem 0.75rem', textAlign: 'center', cursor: 'pointer' }} onClick={() => handleSort('quantitySold')}>
                    Ventas <ArrowUpDown size={12} style={{ display: 'inline', marginLeft: '2px' }} />
                  </th>
                  <th style={{ padding: '1rem 0.75rem', textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('neededStock')}>
                    Requerido ({coverageDays}d) <ArrowUpDown size={12} style={{ display: 'inline', marginLeft: '2px' }} />
                  </th>
                  <th style={{ padding: '1rem 0.75rem', textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('suggestedRestock')}>
                    Sugerido a Producir <ArrowUpDown size={12} style={{ display: 'inline', marginLeft: '2px' }} />
                  </th>
                  <th style={{ padding: '1rem 0.75rem', textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('replenishmentCost')}>
                    Costo Estimado <ArrowUpDown size={12} style={{ display: 'inline', marginLeft: '2px' }} />
                  </th>
                </tr>
              </thead>
              <tbody style={{ fontSize: '0.875rem', color: '#334155' }}>
                {paginatedData.length > 0 ? (
                  paginatedData.map((p) => {
                    const needsBuy = p.suggestedRestock > 0;
                    return (
                      <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s', backgroundColor: needsBuy ? '#fff7ed' : 'transparent' }} onMouseOver={e => e.currentTarget.style.backgroundColor=needsBuy ? '#ffedd5' : '#f8fafc'} onMouseOut={e => e.currentTarget.style.backgroundColor=needsBuy ? '#fff7ed' : 'transparent'}>
                        <td style={{ padding: '0.85rem 0.75rem', fontFamily: 'monospace', fontSize: '0.8rem' }}>{p.sku || "N/A"}</td>
                        <td style={{ padding: '0.85rem 0.75rem', fontFamily: 'monospace', fontSize: '0.8rem' }}>{p.barcode || "N/A"}</td>
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
                        <td style={{ padding: '0.85rem 0.75rem', textAlign: 'right', color: '#64748b' }}>{formatter.format(p.cost)}</td>
                        <td style={{ padding: '0.85rem 0.75rem', textAlign: 'right', fontWeight: p.stock <= 0 ? 'bold' : 'normal', color: p.stock <= 0 ? '#ea580c' : '#334155' }}>{p.stock}</td>
                        <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center', color: '#475569' }}>{p.quantitySold}</td>
                        <td style={{ padding: '0.85rem 0.75rem', textAlign: 'right', color: '#475569' }}>{p.neededStock}</td>
                        <td style={{ padding: '0.85rem 0.75rem', textAlign: 'right', fontWeight: 'bold', color: needsBuy ? '#ea580c' : '#16a34a' }}>
                          {needsBuy ? `+${p.suggestedRestock}` : '0'}
                        </td>
                        <td style={{ padding: '0.85rem 0.75rem', textAlign: 'right', fontWeight: 'bold', color: needsBuy ? '#c2410c' : '#64748b' }}>
                          {needsBuy ? formatter.format(p.replenishmentCost) : formatter.format(0)}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} style={{ padding: '3rem 0', textAlign: 'center', color: '#94a3b8' }}>
                      No se encontraron sugerencias de producción para el filtro actual.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination controls */}
          {filteredData.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', padding: '1rem 0 0 0', marginTop: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#64748b' }}>
                <span>Mostrar</span>
                <select 
                  value={pageSize} 
                  onChange={e => { setPageSize(parseInt(e.target.value)); setCurrentPage(1); }}
                  style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                  <option value={500}>500</option>
                </select>
                <span>productos por página de un total de <strong>{filteredData.length}</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', backgroundColor: 'white', border: '1px solid #cbd5e1', padding: '0.4rem 0.75rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 'bold', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1, transition: 'all 0.15s' }}
                >
                  <ChevronLeft size={16} /> Anterior
                </button>
                <span style={{ fontSize: '0.85rem', padding: '0 0.75rem', color: '#475569', fontWeight: 'bold' }}>
                  Página {currentPage} de {totalPages}
                </span>
                <button 
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', backgroundColor: 'white', border: '1px solid #cbd5e1', padding: '0.4rem 0.75rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 'bold', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.5 : 1, transition: 'all 0.15s' }}
                >
                  Siguiente <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
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
