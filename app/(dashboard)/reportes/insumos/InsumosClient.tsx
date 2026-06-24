'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { TrendingUp, Package, ArrowDownToLine, Loader2, Calendar, Search, DollarSign, ArrowUpDown, ChevronLeft, ChevronRight, Filter, ShoppingCart, Printer } from 'lucide-react';
import { getInsumosReportData } from '@/app/actions/reportes';

interface InsumoProduct {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  lastSupplier?: string;
  lastSupplierId?: string | null;
  category: string;
  stock: number;
  cost: number;
  price: number;
  quantitySold: number; // Represents cumulative quantity required based on sales of products containing it
  dailyAvg: number;
  imageUrl?: string | null;
}

export default function InsumosClient({ 
  initialData, 
  initialBranchId, 
  availableFilters 
}: { 
  initialData: InsumoProduct[]; 
  initialBranchId: string; 
  availableFilters: any; 
}) {
  const router = useRouter();
  const [data, setData] = useState<InsumoProduct[]>(initialData);
  const [branchId, setBranchId] = useState(initialBranchId);
  const [category, setCategory] = useState('ALL');
  const [brand, setBrand] = useState('ALL');
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

  const handleAddToOrder = () => {
    const itemsToRestock = filteredData.filter(p => p.suggestedRestock > 0);
    if (itemsToRestock.length === 0) {
      alert("No hay insumos con faltante en la consulta actual para agregar al pedido.");
      return;
    }

    if (!confirm(`Se generarán borradores de pedidos para ${itemsToRestock.length} insumos con faltantes. ¿Deseas continuar?`)) {
      return;
    }

    // Group items by supplierId
    const groups: Record<string, { supplierName: string, items: any[] }> = {};
    itemsToRestock.forEach(p => {
      const supplierId = p.lastSupplierId || ""; // "" represents Public/No Supplier
      const supplierName = p.lastSupplier || "Público en General / Sin Proveedor";
      
      if (!groups[supplierId]) {
        groups[supplierId] = { supplierName, items: [] };
      }
      
      groups[supplierId].items.push({
        productId: p.id,
        name: p.name,
        quantity: p.suggestedRestock,
        cost: p.cost,
        imageUrl: p.imageUrl
      });
    });

    const activeBranchId = branchId === 'ALL' ? 'GLOBAL' : branchId;
    const localStorageKey = `caanma_active_purchase_tabs_${activeBranchId}`;
    const localStorageActiveIdKey = `caanma_active_purchase_tab_id_${activeBranchId}`;

    let existingTabs: any[] = [];
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(localStorageKey);
      if (stored) {
        try {
          existingTabs = JSON.parse(stored) || [];
        } catch (e) {
          console.error(e);
        }
      }
    }

    if (existingTabs.length === 1 && existingTabs[0].items.length === 0 && existingTabs[0].supplierId === '') {
      existingTabs = [];
    }

    let lastActiveTabId = "";

    Object.keys(groups).forEach(supplierId => {
      const { supplierName, items: newItems } = groups[supplierId];
      const existingTabIdx = existingTabs.findIndex(t => t.supplierId === supplierId);
      
      if (existingTabIdx !== -1) {
        const currentItems = [...existingTabs[existingTabIdx].items];
        newItems.forEach(newItem => {
          const matchIdx = currentItems.findIndex(ci => ci.productId === newItem.productId);
          if (matchIdx !== -1) {
            currentItems[matchIdx].quantity = Math.max(currentItems[matchIdx].quantity, newItem.quantity);
          } else {
            currentItems.push(newItem);
          }
        });
        existingTabs[existingTabIdx].items = currentItems;
        lastActiveTabId = existingTabs[existingTabIdx].id;
      } else {
        const newTabId = Math.random().toString(36).substr(2, 9);
        const newTab = {
          id: newTabId,
          name: `Pedido Insumos - ${supplierName.split(' / ')[0]}`,
          supplierId: supplierId,
          notes: `Generado automáticamente desde Reporte de Insumos (${new Date().toLocaleDateString()})`,
          items: newItems
        };
        existingTabs.push(newTab);
        lastActiveTabId = newTabId;
      }
    });

    if (typeof window !== 'undefined') {
      localStorage.setItem(localStorageKey, JSON.stringify(existingTabs));
      if (lastActiveTabId) {
        localStorage.setItem(localStorageActiveIdKey, lastActiveTabId);
      }
    }

    alert(`¡Se agregaron los faltantes correctamente a los pedidos por proveedor! Redirigiendo a la pantalla de compras/pedidos...`);
    router.push('/productos/pedidos/nuevo');
  };

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
    triggerUpdate(start, end, branchId, category, brand);
  };

  const triggerUpdate = async (start: Date, end: Date, bId: string, cat: string, brnd: string) => {
    setIsLoading(true);
    try {
      const res = await getInsumosReportData(start, end, bId, cat, brnd);
      setData(res || []);
      setCurrentPage(1);
    } catch (error) {
      console.error("Error updating insumos report:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyFilters = () => {
    const start = new Date(startDateStr + 'T00:00:00');
    const end = new Date(endDateStr + 'T23:59:59');
    triggerUpdate(start, end, branchId, category, brand);
  };

  const formatter = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

  // Calculate dynamic values based on coverageDays
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

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  const filteredData = useMemo(() => {
    let result = processedData.filter(p => {
      const term = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
        p.name.toLowerCase().includes(term) ||
        (p.sku && p.sku.toLowerCase().includes(term)) ||
        (p.barcode && p.barcode.toLowerCase().includes(term)) ||
        (p.lastSupplier && p.lastSupplier.toLowerCase().includes(term));

      const matchesRestock = !onlyNeedsRestock || p.suggestedRestock > 0;

      return matchesSearch && matchesRestock;
    });

    result.sort((a: any, b: any) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];

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

  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredData.slice(startIndex, startIndex + pageSize);
  }, [filteredData, currentPage, pageSize]);

  const downloadCSV = () => {
    const headers = [
      "SKU", 
      "Código de Barras",
      "Materia Prima / Insumo", 
      "Último Proveedor",
      "Costo Unitario", 
      "Existencias", 
      "Consumido (venta prod.)", 
      `Días Cobertura (${coverageDays})`, 
      "Sugerido a Comprar", 
      "Costo de Resurtido"
    ];

    const rows = filteredData.map(p => [
      p.sku || "N/A",
      p.barcode || "N/A",
      p.name,
      p.lastSupplier || "Sin Proveedor",
      p.cost.toFixed(2),
      p.stock,
      p.quantitySold.toFixed(2),
      p.neededStock,
      p.suggestedRestock,
      p.replenishmentCost.toFixed(2)
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.map(val => `"${val.toString().replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Reporte_Insumos_${startDateStr}_a_${endDateStr}_cobertura_${coverageDays}d.csv`);
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
            🛠️ Reporte de Resurtido de Insumos
          </h1>
          <p style={{ color: 'var(--caanma-text-muted)' }}>
            Sugerencia de compra de materias primas e insumos de fabricación basada en ventas de productos finales.
          </p>
        </div>
        <div className="no-print" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button 
            onClick={() => window.print()}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              backgroundColor: '#6d28d9', 
              color: 'white', 
              border: 'none', 
              padding: '0.65rem 1.25rem', 
              borderRadius: '8px', 
              fontWeight: 'bold', 
              cursor: 'pointer', 
              transition: 'background-color 0.2s',
              boxShadow: '0 4px 6px -1px rgba(109, 40, 217, 0.2)'
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor='#5b21b6'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor='#6d28d9'}
          >
            <Printer size={18} /> Imprimir / PDF
          </button>
          <button 
            onClick={handleAddToOrder}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              backgroundColor: '#8b5cf6', 
              color: 'white', 
              border: 'none', 
              padding: '0.65rem 1.25rem', 
              borderRadius: '8px', 
              fontWeight: 'bold', 
              cursor: 'pointer', 
              transition: 'background-color 0.2s',
              boxShadow: '0 4px 6px -1px rgba(139, 92, 246, 0.2)'
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor='#7c3aed'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor='#8b5cf6'}
          >
            <ShoppingCart size={18} /> Agregar a pedido
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
      <div className="no-print" style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '2rem' }}>
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
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.4rem' }}>Categoría de Insumo</label>
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

          <button 
            onClick={handleApplyFilters}
            disabled={isLoading}
            style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '0.65rem', borderRadius: '6px', fontWeight: 'bold', fontSize: '0.875rem', cursor: 'pointer', transition: 'background-color 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor='#1d4ed8'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor='#2563eb'}
          >
            {isLoading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : 'Consultar'}
          </button>
        </div>
      </div>

      {isLoading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: '#2563eb', fontWeight: 'bold', fontSize: '0.9rem' }} className="no-print">
          <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
          Calculando proyección de insumos...
        </div>
      )}

      <div style={{ opacity: isLoading ? 0.5 : 1, transition: 'opacity 0.2s' }}>
        {/* KPI Panel Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{ padding: '0.5rem', backgroundColor: '#eff6ff', borderRadius: '8px' }}><Package size={20} color="#3b82f6" /></div>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#64748b' }}>Insumos Analizados</h3>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#1e293b' }}>{stats.totalSKUs}</div>
          </div>

          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{ padding: '0.5rem', backgroundColor: '#fee2e2', borderRadius: '8px' }}><Package size={20} color="#ef4444" /></div>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#64748b' }}>Insumos con Faltante</h3>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#ef4444' }}>{stats.skusToRestock}</div>
          </div>

          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{ padding: '0.5rem', backgroundColor: '#f0fdf4', borderRadius: '8px' }}><ShoppingCart size={20} color="#16a34a" /></div>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#64748b' }}>Sugerido a Comprar</h3>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#16a34a' }}>{stats.totalUnitsToRestock} uds</div>
          </div>

          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{ padding: '0.5rem', backgroundColor: '#f5f3ff', borderRadius: '8px' }}><DollarSign size={20} color="#7c3aed" /></div>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#64748b' }}>Inversión Requerida</h3>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#7c3aed' }}>{formatter.format(stats.totalCostToRestock)}</div>
          </div>
        </div>

        {/* Detailed Table Card */}
        <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>Sugerencias de Reabastecimiento de Insumos</h2>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.2rem 0 0 0' }} className="no-print">
                Define cuántos días de ventas deseas cubrir con tu stock disponible. Las sugerencias se recalcularán automáticamente en tiempo real.
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }} className="no-print">
              {/* Coverage Days Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#475569' }}>Días a cubrir:</span>
                <input 
                  type="number" 
                  min="1" 
                  max="365"
                  value={coverageDays}
                  onChange={e => setCoverageDays(Math.max(1, parseInt(e.target.value) || 0))}
                  style={{ width: '70px', padding: '0.45rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', textAlign: 'center', fontWeight: 'bold' }}
                />
              </div>

              {/* Only Needs Restock Filter */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: '#475569', cursor: 'pointer', userSelect: 'none' }}>
                <input 
                  type="checkbox" 
                  checked={onlyNeedsRestock}
                  onChange={e => setOnlyNeedsRestock(e.target.checked)}
                  style={{ width: '16px', height: '16px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                />
                <span>Solo insumos con faltantes</span>
              </label>

              {/* Search Bar */}
              <div style={{ position: 'relative', width: '240px' }}>
                <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  type="text" 
                  placeholder="Buscar insumo, SKU, proveedor..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  style={{ width: '100%', padding: '0.45rem 0.75rem 0.45rem 2.2rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                />
              </div>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #f1f5f9', color: '#475569', fontSize: '0.8rem', fontWeight: 'bold' }}>
                  <th style={{ padding: '1rem 0.75rem', cursor: 'pointer' }} onClick={() => handleSort('sku')}>
                    SKU <ArrowUpDown size={12} style={{ display: 'inline', marginLeft: '2px' }} />
                  </th>
                  <th style={{ padding: '1rem 0.75rem', cursor: 'pointer' }} onClick={() => handleSort('barcode')}>
                    Cod. Barras <ArrowUpDown size={12} style={{ display: 'inline', marginLeft: '2px' }} />
                  </th>
                  <th style={{ padding: '1rem 0.75rem', cursor: 'pointer' }} onClick={() => handleSort('name')}>
                    Insumo / Materia Prima <ArrowUpDown size={12} style={{ display: 'inline', marginLeft: '2px' }} />
                  </th>
                  <th style={{ padding: '1rem 0.75rem', cursor: 'pointer' }} onClick={() => handleSort('lastSupplier')}>
                    Último Proveedor <ArrowUpDown size={12} style={{ display: 'inline', marginLeft: '2px' }} />
                  </th>
                  <th style={{ padding: '1rem 0.75rem', textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('cost')}>
                    Costo U. <ArrowUpDown size={12} style={{ display: 'inline', marginLeft: '2px' }} />
                  </th>
                  <th style={{ padding: '1rem 0.75rem', textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('stock')}>
                    Stock <ArrowUpDown size={12} style={{ display: 'inline', marginLeft: '2px' }} />
                  </th>
                  <th style={{ padding: '1rem 0.75rem', textAlign: 'center', cursor: 'pointer' }} onClick={() => handleSort('quantitySold')}>
                    Consumido <ArrowUpDown size={12} style={{ display: 'inline', marginLeft: '2px' }} />
                  </th>
                  <th style={{ padding: '1rem 0.75rem', textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('neededStock')}>
                    Requerido <ArrowUpDown size={12} style={{ display: 'inline', marginLeft: '2px' }} />
                  </th>
                  <th style={{ padding: '1rem 0.75rem', textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('suggestedRestock')}>
                    Sugerido <ArrowUpDown size={12} style={{ display: 'inline', marginLeft: '2px' }} />
                  </th>
                  <th style={{ padding: '1rem 0.75rem', textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('replenishmentCost')}>
                    Costo Compra <ArrowUpDown size={12} style={{ display: 'inline', marginLeft: '2px' }} />
                  </th>
                </tr>
              </thead>
              <tbody style={{ fontSize: '0.875rem', color: '#334155' }}>
                {paginatedData.length > 0 ? (
                  paginatedData.map((p) => {
                    const needsBuy = p.suggestedRestock > 0;
                    return (
                      <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s', backgroundColor: needsBuy ? '#fef2f2' : 'transparent' }} onMouseOver={e => e.currentTarget.style.backgroundColor=needsBuy ? '#fee2e2' : '#f8fafc'} onMouseOut={e => e.currentTarget.style.backgroundColor=needsBuy ? '#fef2f2' : 'transparent'}>
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
                        <td style={{ padding: '0.85rem 0.75rem', color: '#64748b' }}>{p.lastSupplier || "Sin Proveedor"}</td>
                        <td style={{ padding: '0.85rem 0.75rem', textAlign: 'right', color: '#64748b' }}>{formatter.format(p.cost)}</td>
                        <td style={{ padding: '0.85rem 0.75rem', textAlign: 'right', fontWeight: p.stock <= 0 ? 'bold' : 'normal', color: p.stock <= 0 ? '#ef4444' : '#334155' }}>{p.stock}</td>
                        <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center', color: '#475569' }}>{p.quantitySold.toFixed(2)}</td>
                        <td style={{ padding: '0.85rem 0.75rem', textAlign: 'right', color: '#475569' }}>{p.neededStock}</td>
                        <td style={{ padding: '0.85rem 0.75rem', textAlign: 'right', fontWeight: 'bold', color: needsBuy ? '#ef4444' : '#16a34a' }}>
                          {needsBuy ? `+${p.suggestedRestock}` : '0'}
                        </td>
                        <td style={{ padding: '0.85rem 0.75rem', textAlign: 'right', fontWeight: 'bold', color: needsBuy ? '#b91c1c' : '#64748b' }}>
                          {needsBuy ? formatter.format(p.replenishmentCost) : formatter.format(0)}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={10} style={{ padding: '3rem 0', textAlign: 'center', color: '#94a3b8' }}>
                      No se encontraron sugerencias de insumos para el filtro actual.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }} className="no-print">
              <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
                Mostrando {Math.min(filteredData.length, (currentPage - 1) * pageSize + 1)} a {Math.min(filteredData.length, currentPage * pageSize)} de {filteredData.length} insumos
              </span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.45rem 0.85rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: currentPage === 1 ? '#f8fafc' : 'white', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontSize: '0.85rem', fontWeight: '500', color: currentPage === 1 ? '#94a3b8' : '#334155' }}
                >
                  <ChevronLeft size={16} /> Anterior
                </button>
                <button 
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.45rem 0.85rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: currentPage === totalPages ? '#f8fafc' : 'white', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', fontSize: '0.85rem', fontWeight: '500', color: currentPage === totalPages ? '#94a3b8' : '#334155' }}
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
