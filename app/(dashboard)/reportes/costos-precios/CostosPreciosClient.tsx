'use client';

import { useState, useMemo, useEffect } from 'react';
import { Search, Printer, Loader2, ArrowUpDown, ArrowUp, ArrowDown, TrendingUp, DollarSign, Package, Download } from 'lucide-react';
import ReportFilterBar, { ReportFilterState } from '@/components/ui/ReportFilterBar';
import { getCostAndPricesData } from '@/app/actions/reportes';
import { formatCurrency } from '@/lib/utils';
import { exportToExcel } from '@/lib/exportExcel';

export default function CostosPreciosClient({ 
  initialData, 
  initialBranchId 
}: { 
  initialData: any; 
  initialBranchId: string; 
}) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  
  // Filters & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState(initialBranchId);
  const [selectedBrandId, setSelectedBrandId] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [activePriceListKey, setActivePriceListKey] = useState('price');
  
  // Sorting states
  const [sortColumn, setSortColumn] = useState('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Cost and Price Range filters
  const [minCost, setMinCost] = useState('');
  const [maxCost, setMaxCost] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  // Load new data on branch filter change
  const handleFilterChange = async (filters: ReportFilterState) => {
    setSelectedBranchId(filters.branchId);
    setSelectedBrandId(filters.brandId || 'ALL');
  };

  // Pre-load / filter search on the server side with a debounce
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      setLoading(true);
      try {
        const newData = await getCostAndPricesData(selectedBranchId, selectedBrandId, searchTerm);
        setData(newData);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, selectedBranchId, selectedBrandId]);

  // Combine standard and custom price lists
  const PRICE_LISTS = useMemo(() => {
    const defaults = [
      { key: 'price', label: 'Precio Público' },
      { key: 'wholesalePrice', label: 'Precio Mayoreo' },
      { key: 'specialPrice', label: 'Precio Especial' }
    ];
    const custom = data.priceLists.map((pl: any) => ({
      key: pl.id,
      label: pl.name
    }));
    return [...defaults, ...custom];
  }, [data.priceLists]);

  const categories = useMemo<string[]>(() => {
    const list = data.products.map((p: any) => p.category).filter(Boolean) as string[];
    return ['ALL', ...Array.from(new Set(list))];
  }, [data.products]);

  // Resolve item price
  const getProductPrice = (product: any, key: string) => {
    if (key === 'price') return product.price;
    if (key === 'wholesalePrice') return product.wholesalePrice ?? product.price;
    if (key === 'specialPrice') return product.specialPrice ?? product.price;
    
    // Dynamic price list
    const customPrice = product.prices?.find((p: any) => p.priceListId === key);
    return customPrice ? customPrice.price : product.price;
  };

  // Resolve margin percentage
  const getProductMargin = (cost: number, price: number) => {
    if (price <= 0) return 0;
    return ((price - cost) / price) * 100;
  };

  // Filter and Sort products
  const processedProducts = useMemo(() => {
    let result = data.products.map((p: any) => {
      const price = getProductPrice(p, activePriceListKey);
      const margin = getProductMargin(p.cost, price);
      return {
        ...p,
        resolvedPrice: price,
        resolvedMargin: margin
      };
    });

    // Local Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter((p: any) => 
        p.name.toLowerCase().includes(term) || 
        p.sku.toLowerCase().includes(term) ||
        (p.barcode && p.barcode.toLowerCase().includes(term))
      );
    }

    // Local Category filter
    if (categoryFilter !== 'ALL') {
      result = result.filter((p: any) => p.category === categoryFilter);
    }

    // Cost Range Filters
    if (minCost !== '') {
      const min = parseFloat(minCost);
      if (!isNaN(min)) {
        result = result.filter((p: any) => p.cost >= min);
      }
    }
    if (maxCost !== '') {
      const max = parseFloat(maxCost);
      if (!isNaN(max)) {
        result = result.filter((p: any) => p.cost <= max);
      }
    }

    // Price Range Filters
    if (minPrice !== '') {
      const min = parseFloat(minPrice);
      if (!isNaN(min)) {
        result = result.filter((p: any) => p.resolvedPrice >= min);
      }
    }
    if (maxPrice !== '') {
      const max = parseFloat(maxPrice);
      if (!isNaN(max)) {
        result = result.filter((p: any) => p.resolvedPrice <= max);
      }
    }

    // Sorting
    result.sort((a: any, b: any) => {
      let valA: any, valB: any;
      if (sortColumn === 'sku') {
        valA = a.sku || '';
        valB = b.sku || '';
      } else if (sortColumn === 'name') {
        valA = a.name || '';
        valB = b.name || '';
      } else if (sortColumn === 'stock') {
        valA = a.stock || 0;
        valB = b.stock || 0;
      } else if (sortColumn === 'cost') {
        valA = a.cost || 0;
        valB = b.cost || 0;
      } else if (sortColumn === 'price') {
        valA = a.resolvedPrice || 0;
        valB = b.resolvedPrice || 0;
      } else if (sortColumn === 'margin') {
        valA = a.resolvedMargin || 0;
        valB = b.resolvedMargin || 0;
      } else {
        valA = a.name || '';
        valB = b.name || '';
      }

      if (typeof valA === 'string') {
        return sortDirection === 'asc' 
          ? valA.localeCompare(valB) 
          : valB.localeCompare(valA);
      } else {
        return sortDirection === 'asc' 
          ? valA - valB 
          : valB - valA;
      }
    });

    return result;
  }, [data.products, activePriceListKey, searchTerm, categoryFilter, sortColumn, sortDirection, minCost, maxCost, minPrice, maxPrice]);

  // KPIs Calculations
  const kpis = useMemo(() => {
    const totalSKUs = processedProducts.length;
    let sumCost = 0;
    let sumPrice = 0;
    let totalInvCost = 0;
    let totalInvValue = 0;

    processedProducts.forEach((p: any) => {
      sumCost += p.cost;
      sumPrice += p.resolvedPrice;
      totalInvCost += p.cost * p.stock;
      totalInvValue += p.resolvedPrice * p.stock;
    });

    const avgCost = totalSKUs > 0 ? sumCost / totalSKUs : 0;
    const avgPrice = totalSKUs > 0 ? sumPrice / totalSKUs : 0;
    const avgMargin = avgPrice > 0 ? ((avgPrice - avgCost) / avgPrice) * 100 : 0;

    return {
      totalSKUs,
      avgCost,
      avgPrice,
      avgMargin,
      totalInvCost,
      totalInvValue
    };
  }, [processedProducts]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc'); // Default to desc for quick ranking
    }
  };

  const renderSortIcon = (column: string) => {
    if (sortColumn !== column) {
      return <ArrowUpDown size={14} style={{ opacity: 0.4 }} />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp size={14} style={{ color: '#6d28d9' }} /> 
      : <ArrowDown size={14} style={{ color: '#6d28d9' }} />;
  };

  const downloadExcel = () => {
    const headers = ["SKU", "Producto", "Stock", "Costo U.", "Precio Venta", "Margen"];
    const rows = processedProducts.map((p: any) => [
      p.sku || 'N/A',
      p.name,
      p.stock,
      p.cost,
      p.resolvedPrice,
      p.resolvedMargin ? `${p.resolvedMargin.toFixed(1)}%` : '0.0%'
    ]);
    exportToExcel(headers, rows, 'Reporte_Costos_Y_Precios');
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', fontFamily: 'var(--font-geist-sans)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Reporte de Costos y Precios</h1>
          <p style={{ color: 'var(--caanma-text-muted)' }}>Compara costos contra precios de venta con márgenes de rentabilidad calculados en tiempo real.</p>
        </div>
        <div className="no-print" style={{ display: 'flex', gap: '0.75rem' }}>
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
              transition: 'background-color 0.2s' 
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor='#5b21b6'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor='#6d28d9'}
          >
            <Printer size={18} /> Imprimir / PDF
          </button>
          <button 
            onClick={downloadExcel}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              backgroundColor: '#0f172a', 
              color: 'white', 
              border: 'none', 
              padding: '0.65rem 1.25rem', 
              borderRadius: '8px', 
              fontWeight: 'bold', 
              cursor: 'pointer', 
              transition: 'background-color 0.2s' 
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor='#1e293b'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor='#0f172a'}
          >
            <Download size={18} /> Exportar Excel
          </button>
        </div>
      </div>

      {/* Global Filters */}
      <div className="no-print" style={{ marginBottom: '1.5rem' }}>
        <ReportFilterBar 
          onFilterChange={handleFilterChange} 
          disabled={loading} 
          showDateRange={false}
          showUser={false}
          initialBranchId={initialBranchId}
        />
      </div>

      {/* Loading state indicator */}
      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: 'var(--caanma-primary)', fontWeight: 'bold' }}>
          <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
          Calculando costos y precios...
        </div>
      )}

      {/* KPI Cards */}
      <div style={{ opacity: loading ? 0.5 : 1, transition: 'opacity 0.2s', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--caanma-border)', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--caanma-text-muted)' }}>
            <Package size={16} />
            <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>Artículos Filtrados</span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: '900', color: 'var(--caanma-text)' }}>{kpis.totalSKUs}</div>
        </div>

        <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--caanma-border)', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--caanma-text-muted)' }}>
            <DollarSign size={16} color="#ef4444" />
            <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>Costo Promedio</span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#ef4444' }}>{formatCurrency(kpis.avgCost)}</div>
        </div>

        <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--caanma-border)', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--caanma-text-muted)' }}>
            <DollarSign size={16} color="#16a34a" />
            <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>Precio Promedio</span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#16a34a' }}>{formatCurrency(kpis.avgPrice)}</div>
        </div>

        <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--caanma-border)', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--caanma-text-muted)' }}>
            <TrendingUp size={16} color="#0284c7" />
            <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>Margen Promedio</span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#0284c7' }}>{kpis.avgMargin.toFixed(1)}%</div>
        </div>

        <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--caanma-border)', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--caanma-text-muted)' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>Valuación (Costo / Venta)</span>
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--caanma-text)', marginTop: '0.25rem' }}>
            Costo: <span style={{ color: '#ef4444' }}>{formatCurrency(kpis.totalInvCost)}</span>
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--caanma-text)' }}>
            Venta: <span style={{ color: '#16a34a' }}>{formatCurrency(kpis.totalInvValue)}</span>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div style={{ opacity: loading ? 0.5 : 1, transition: 'opacity 0.2s', backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--caanma-border)' }}>
        {/* Table Filters Panel */}
        <div className="no-print" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', flex: 1 }}>
            {/* Search Box */}
            <div style={{ position: 'relative', width: '280px' }}>
              <Search style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={16} />
              <input 
                type="text" 
                placeholder="Buscar SKU o nombre..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '0.5rem 1rem 0.5rem 2.25rem', 
                  borderRadius: '6px', 
                  border: '1px solid #cbd5e1',
                  fontSize: '0.9rem',
                  outline: 'none'
                }} 
              />
            </div>

            {/* Category Dropdown */}
            <div>
              <select 
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                style={{ 
                  padding: '0.5rem 1rem', 
                  borderRadius: '6px', 
                  border: '1px solid #cbd5e1', 
                  fontSize: '0.9rem',
                  backgroundColor: 'white',
                  outline: 'none'
                }}
              >
                <option value="ALL">Todas las Categorías</option>
                {categories.filter(c => c !== 'ALL').map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Dedicated Sort Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <select 
                value={`${sortColumn}-${sortDirection}`}
                onChange={(e) => {
                  const [col, dir] = e.target.value.split('-');
                  setSortColumn(col);
                  setSortDirection(dir as 'asc' | 'desc');
                }}
                style={{ 
                  padding: '0.5rem 1rem', 
                  borderRadius: '6px', 
                  border: '1px solid #cbd5e1', 
                  fontSize: '0.9rem',
                  backgroundColor: 'white',
                  outline: 'none',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                <option value="name-asc">Ordenar: Nombre (A-Z)</option>
                <option value="name-desc">Ordenar: Nombre (Z-A)</option>
                <option value="cost-desc">Ordenar: Costo (Mayor a Menor) ⬇</option>
                <option value="cost-asc">Ordenar: Costo (Menor a Mayor) ⬆</option>
                <option value="price-desc">Ordenar: Precio (Mayor a Menor) ⬇</option>
                <option value="price-asc">Ordenar: Precio (Menor a Mayor) ⬆</option>
                <option value="margin-desc">Ordenar: Margen (Mayor a Menor) ⬇</option>
                <option value="margin-asc">Ordenar: Margen (Menor a Mayor) ⬆</option>
                <option value="stock-desc">Ordenar: Stock (Mayor a Menor) ⬇</option>
                <option value="stock-asc">Ordenar: Stock (Menor a Mayor) ⬆</option>
              </select>
            </div>
          </div>

          {/* Price List Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--caanma-text-muted)' }}>Lista a Mostrar:</span>
            <select 
              value={activePriceListKey}
              onChange={(e) => setActivePriceListKey(e.target.value)}
              style={{ 
                padding: '0.55rem 1.25rem', 
                borderRadius: '6px', 
                border: '1px solid var(--caanma-primary)', 
                fontSize: '0.9rem',
                backgroundColor: 'white',
                fontWeight: 'bold',
                color: 'var(--caanma-primary)',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              {PRICE_LISTS.map(list => (
                <option key={list.key} value={list.key}>{list.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Cost and Price Range Filters Row */}
        <div className="no-print" style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap', marginTop: '0.75rem', borderTop: '1px solid var(--caanma-border)', paddingTop: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--caanma-text-muted)' }}>Costo:</span>
            <input 
              type="number" 
              placeholder="Mín" 
              value={minCost}
              onChange={(e) => setMinCost(e.target.value)}
              style={{ width: '90px', padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
            />
            <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>-</span>
            <input 
              type="number" 
              placeholder="Máx" 
              value={maxCost}
              onChange={(e) => setMaxCost(e.target.value)}
              style={{ width: '90px', padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--caanma-text-muted)' }}>Precio Venta:</span>
            <input 
              type="number" 
              placeholder="Mín" 
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              style={{ width: '90px', padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
            />
            <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>-</span>
            <input 
              type="number" 
              placeholder="Máx" 
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              style={{ width: '90px', padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
            />
          </div>

          {/* Clean Filters Button */}
          {(searchTerm || categoryFilter !== 'ALL' || minCost || maxCost || minPrice || maxPrice || sortColumn !== 'name' || sortDirection !== 'asc') && (
            <button 
              onClick={() => {
                setSearchTerm('');
                setCategoryFilter('ALL');
                setMinCost('');
                setMaxCost('');
                setMinPrice('');
                setMaxPrice('');
                setSortColumn('name');
                setSortDirection('asc');
              }}
              style={{
                marginLeft: 'auto',
                backgroundColor: 'transparent',
                color: 'var(--caanma-primary)',
                border: '1px solid var(--caanma-primary)',
                padding: '0.4rem 1rem',
                borderRadius: '6px',
                fontSize: '0.85rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--caanma-primary)'; e.currentTarget.style.color = 'white'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--caanma-primary)'; }}
            >
              Limpiar Filtros
            </button>
          )}
        </div>

        {/* Data Table */}
        <div style={{ overflowX: 'auto', maxHeight: '600px' }}>
          <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 10 }}>
              <tr style={{ borderBottom: '2px solid var(--caanma-border)', color: 'var(--caanma-text-muted)', fontSize: '0.9rem' }}>
                
                <th style={{ padding: '0.75rem 0.5rem', cursor: 'pointer' }} onClick={() => handleSort('sku')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    SKU {renderSortIcon('sku')}
                  </div>
                </th>
                
                <th style={{ padding: '0.75rem 0.5rem', cursor: 'pointer' }} onClick={() => handleSort('name')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    Producto {renderSortIcon('name')}
                  </div>
                </th>
                
                <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center', cursor: 'pointer' }} onClick={() => handleSort('stock')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: 'center' }}>
                    Stock {renderSortIcon('stock')}
                  </div>
                </th>
                
                <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('cost')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: 'flex-end' }}>
                    Costo U. {renderSortIcon('cost')}
                  </div>
                </th>
                
                <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('price')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: 'flex-end' }}>
                    Precio Venta {renderSortIcon('price')}
                  </div>
                </th>
                
                <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center', cursor: 'pointer' }} onClick={() => handleSort('margin')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: 'center' }}>
                    Margen {renderSortIcon('margin')}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {processedProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--caanma-text-muted)', fontWeight: 'bold' }}>
                    No se encontraron productos coincidentes.
                  </td>
                </tr>
              ) : (
                processedProducts.map((p: any) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--caanma-border)' }}>
                    
                    <td data-label="SKU" style={{ padding: '0.85rem 0.5rem', fontSize: '0.85rem', color: 'var(--caanma-text-muted)', fontFamily: 'monospace' }}>
                      {p.sku || 'N/A'}
                    </td>
                    
                    <td data-label="Producto" style={{ padding: '0.85rem 0.5rem', fontWeight: '600' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {p.imageUrl && (
                          <div style={{ width: '32px', height: '32px', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--caanma-border)', flexShrink: 0 }}>
                            <img src={p.imageUrl} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                        )}
                        <div>
                          <div>{p.name}</div>
                          {p.category && (
                            <span style={{ fontSize: '0.7rem', color: 'var(--caanma-text-muted)', backgroundColor: '#f1f5f9', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
                              {p.category}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    
                    <td data-label="Stock" style={{ padding: '0.85rem 0.5rem', textAlign: 'center' }}>
                      <span style={{ 
                        padding: '0.2rem 0.5rem', 
                        borderRadius: '9999px', 
                        fontSize: '0.75rem', 
                        fontWeight: 'bold',
                        backgroundColor: p.stock < 5 ? '#fee2e2' : '#f1f5f9',
                        color: p.stock < 5 ? '#ef4444' : 'inherit'
                      }}>
                        {p.stock}
                      </span>
                    </td>
                    
                    <td data-label="Costo U." style={{ padding: '0.85rem 0.5rem', textAlign: 'right', color: 'var(--caanma-text-muted)', fontWeight: '500' }}>
                      {formatCurrency(p.cost)}
                    </td>
                    
                    <td data-label="Precio Venta" style={{ padding: '0.85rem 0.5rem', textAlign: 'right', fontWeight: 'bold', color: 'var(--caanma-text)' }}>
                      {formatCurrency(p.resolvedPrice)}
                    </td>
                    
                    <td data-label="Margen" style={{ padding: '0.85rem 0.5rem', textAlign: 'center' }}>
                      <span style={{ 
                        fontWeight: 'bold', 
                        color: p.resolvedMargin < 15 ? '#ef4444' : p.resolvedMargin > 40 ? '#16a34a' : '#f59e0b' 
                      }}>
                        {p.resolvedMargin.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
