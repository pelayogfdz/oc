'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, Filter, Printer, Package, MapPin, Calendar, ArrowRight, RefreshCw, X } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  category: string | null;
  brand: string | null;
  location: string | null;
  expirationDate: string | null;
}

interface Props {
  initialProducts: Product[];
  categories: string[];
  brands: string[];
  branchName: string;
}

export default function ProductosUbicacionClient({ initialProducts, categories, brands, branchName }: Props) {
  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedBrand, setSelectedBrand] = useState('ALL');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [expirationFilter, setExpirationFilter] = useState('ALL'); // ALL, EXPIRED, 30_DAYS, 90_DAYS
  const [locationStatus, setLocationStatus] = useState('ALL'); // ALL, WITH_LOCATION, WITHOUT_LOCATION
  
  // Sort State
  const [sortBy, setSortBy] = useState('location'); // location, name, stock, price
  
  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});

  // Reset Filters
  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('ALL');
    setSelectedBrand('ALL');
    setMinPrice('');
    setMaxPrice('');
    setExpirationFilter('ALL');
    setLocationStatus('ALL');
    setSortBy('location');
  };

  // Filter & Sort Logic
  const filteredProducts = useMemo(() => {
    return initialProducts
      .filter((p) => {
        // Text search
        const term = searchTerm.toLowerCase().trim();
        if (term) {
          const matchName = p.name.toLowerCase().includes(term);
          const matchSku = p.sku.toLowerCase().includes(term);
          const matchBarcode = p.barcode?.toLowerCase().includes(term) || false;
          const matchLocation = p.location?.toLowerCase().includes(term) || false;
          if (!matchName && !matchSku && !matchBarcode && !matchLocation) return false;
        }

        // Category Filter
        if (selectedCategory !== 'ALL' && p.category !== selectedCategory) return false;

        // Brand Filter
        if (selectedBrand !== 'ALL' && p.brand !== selectedBrand) return false;

        // Price filters
        if (minPrice && p.price < parseFloat(minPrice)) return false;
        if (maxPrice && p.price > parseFloat(maxPrice)) return false;

        // Location status filter
        if (locationStatus === 'WITH_LOCATION' && !p.location) return false;
        if (locationStatus === 'WITHOUT_LOCATION' && p.location) return false;

        // Expiration Filter
        if (expirationFilter !== 'ALL') {
          if (!p.expirationDate) return false;
          const expDate = new Date(p.expirationDate);
          const today = new Date();
          const timeDiff = expDate.getTime() - today.getTime();
          const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

          if (expirationFilter === 'EXPIRED' && daysDiff > 0) return false;
          if (expirationFilter === '30_DAYS' && (daysDiff <= 0 || daysDiff > 30)) return false;
          if (expirationFilter === '90_DAYS' && (daysDiff <= 0 || daysDiff > 90)) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'location') {
          const locA = a.location || 'ZZZZZZZZ';
          const locB = b.location || 'ZZZZZZZZ';
          return locA.localeCompare(locB);
        }
        if (sortBy === 'name') {
          return a.name.localeCompare(b.name);
        }
        if (sortBy === 'stock') {
          return b.stock - a.stock;
        }
        if (sortBy === 'price') {
          return b.price - a.price;
        }
        return 0;
      });
  }, [initialProducts, searchTerm, selectedCategory, selectedBrand, minPrice, maxPrice, locationStatus, expirationFilter, sortBy]);

  // Bulk Selection Handlers
  const selectedCount = Object.keys(selectedIds).filter(id => selectedIds[id]).length;
  const allSelected = filteredProducts.length > 0 && filteredProducts.every(p => selectedIds[p.id]);

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedIds({});
    } else {
      const next: Record<string, boolean> = {};
      filteredProducts.forEach(p => next[p.id] = true);
      setSelectedIds(next);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Metrics
  const metrics = useMemo(() => {
    let totalStock = 0;
    let totalCostVal = 0;
    let totalSellVal = 0;
    let withLocationCount = 0;

    filteredProducts.forEach(p => {
      totalStock += p.stock;
      totalCostVal += p.stock * p.cost;
      totalSellVal += p.stock * p.price;
      if (p.location) withLocationCount++;
    });

    return {
      totalStock,
      totalCostVal,
      totalSellVal,
      withLocationCount,
      withoutLocationCount: filteredProducts.length - withLocationCount
    };
  }, [filteredProducts]);

  return (
    <div style={{ padding: '0.5rem', fontFamily: 'var(--font-geist-sans)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--caanma-text-muted)', fontSize: '0.9rem' }}>
            <Link href="/reportes" style={{ color: 'var(--caanma-primary)', textDecoration: 'none' }}>Reportes</Link>
            <ArrowRight size={14} />
            <span>Ubicación de Productos</span>
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', marginTop: '0.25rem' }}>Reporte de Productos por Ubicación</h1>
          <p style={{ color: 'var(--caanma-text-muted)', fontSize: '0.9rem' }}>Sucursal activa: <strong style={{ color: '#0f172a' }}>{branchName}</strong></p>
        </div>
        
        {/* Bulk label print trigger */}
        {selectedCount > 0 && (
          <a
            href={`/imprimir-etiquetas?ids=${Object.keys(selectedIds).filter(id => selectedIds[id]).join(',')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              textDecoration: 'none',
              padding: '0.625rem 1.25rem',
              borderRadius: '8px',
              backgroundColor: '#6b21a8', // Purple bulk labels print color
              boxShadow: '0 4px 6px -1px rgba(107, 33, 168, 0.2)'
            }}
          >
            <Printer size={18} /> Imprimir {selectedCount} {selectedCount === 1 ? 'Etiqueta' : 'Etiquetas'} Brother
          </a>
        )}
      </div>

      {/* Quick metrics cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ backgroundColor: 'white', padding: '1rem 1.25rem', borderRadius: '10px', border: '1px solid var(--caanma-border)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ backgroundColor: '#f0fdf4', padding: '0.5rem', borderRadius: '8px', color: '#16a34a' }}>
            <MapPin size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--caanma-text-muted)', fontWeight: 'bold' }}>CON UBICACIÓN</div>
            <div style={{ fontSize: '1.35rem', fontWeight: '900', color: '#16a34a' }}>{metrics.withLocationCount} <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: 'var(--caanma-text-muted)' }}>arts.</span></div>
          </div>
        </div>

        <div style={{ backgroundColor: 'white', padding: '1rem 1.25rem', borderRadius: '10px', border: '1px solid var(--caanma-border)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ backgroundColor: '#fef2f2', padding: '0.5rem', borderRadius: '8px', color: '#ef4444' }}>
            <MapPin size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--caanma-text-muted)', fontWeight: 'bold' }}>SIN UBICACIÓN</div>
            <div style={{ fontSize: '1.35rem', fontWeight: '900', color: '#ef4444' }}>{metrics.withoutLocationCount} <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: 'var(--caanma-text-muted)' }}>arts.</span></div>
          </div>
        </div>

        <div style={{ backgroundColor: 'white', padding: '1rem 1.25rem', borderRadius: '10px', border: '1px solid var(--caanma-border)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ backgroundColor: '#eff6ff', padding: '0.5rem', borderRadius: '8px', color: '#3b82f6' }}>
            <Package size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--caanma-text-muted)', fontWeight: 'bold' }}>STOCK TOTAL</div>
            <div style={{ fontSize: '1.35rem', fontWeight: '900', color: '#3b82f6' }}>{metrics.totalStock} <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: 'var(--caanma-text-muted)' }}>unidades</span></div>
          </div>
        </div>

        <div style={{ backgroundColor: 'white', padding: '1rem 1.25rem', borderRadius: '10px', border: '1px solid var(--caanma-border)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ backgroundColor: '#faf5ff', padding: '0.5rem', borderRadius: '8px', color: '#8b5cf6' }}>
            <Package size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--caanma-text-muted)', fontWeight: 'bold' }}>VALORACIÓN COSTO / VENTA</div>
            <div style={{ fontSize: '1.15rem', fontWeight: '900', color: '#8b5cf6' }}>
              ${metrics.totalCostVal.toLocaleString('es-MX', {maximumFractionDigits: 0})} / <span style={{ color: '#6366f1' }}>${metrics.totalSellVal.toLocaleString('es-MX', {maximumFractionDigits: 0})}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      <div style={{ backgroundColor: 'white', border: '1px solid var(--caanma-border)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e293b', fontWeight: '700', marginBottom: '1rem', fontSize: '0.95rem' }}>
          <Filter size={18} /> Filtros de Auditoría
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          {/* Text search */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#475569' }}>Buscador General</label>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Nombre, SKU, Código o Ubicación..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '0.5rem 0.5rem 0.5rem 2rem', borderRadius: '8px', border: '1px solid var(--caanma-border)', outline: 'none', fontSize: '0.85rem' }}
              />
            </div>
          </div>

          {/* Categoría */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#475569' }}>Categoría / Departamento</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--caanma-border)', outline: 'none', fontSize: '0.85rem', backgroundColor: 'white' }}
            >
              <option value="ALL">Todas las categorías</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Marca */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#475569' }}>Marca</label>
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--caanma-border)', outline: 'none', fontSize: '0.85rem', backgroundColor: 'white' }}
            >
              <option value="ALL">Todas las marcas</option>
              {brands.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          {/* Estado de Ubicación */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#475569' }}>Estado de Ubicación</label>
            <select
              value={locationStatus}
              onChange={(e) => setLocationStatus(e.target.value)}
              style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--caanma-border)', outline: 'none', fontSize: '0.85rem', backgroundColor: 'white' }}
            >
              <option value="ALL">Cualquier estado</option>
              <option value="WITH_LOCATION">Solo con Ubicación asignada</option>
              <option value="WITHOUT_LOCATION">Falta asignar Ubicación</option>
            </select>
          </div>

          {/* Estado de Caducidad */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#475569' }}>Caducidad</label>
            <select
              value={expirationFilter}
              onChange={(e) => setExpirationFilter(e.target.value)}
              style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--caanma-border)', outline: 'none', fontSize: '0.85rem', backgroundColor: 'white' }}
            >
              <option value="ALL">Todos los artículos</option>
              <option value="EXPIRED">❌ Ya caducados</option>
              <option value="30_DAYS">⚠️ Por caducar (próximos 30 días)</option>
              <option value="90_DAYS">⏰ Por caducar (próximos 90 días)</option>
            </select>
          </div>

          {/* Rango de Precios */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#475569' }}>Rango de Precio ($)</label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                type="number"
                placeholder="Mín"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--caanma-border)', outline: 'none', fontSize: '0.85rem' }}
              />
              <span style={{ color: '#94a3b8' }}>-</span>
              <input
                type="number"
                placeholder="Máx"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--caanma-border)', outline: 'none', fontSize: '0.85rem' }}
              />
            </div>
          </div>

          {/* Ordenar por */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#475569' }}>Ordenar Resultados por</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--caanma-border)', outline: 'none', fontSize: '0.85rem', backgroundColor: 'white', fontWeight: '600', color: 'var(--caanma-primary)' }}
            >
              <option value="location">📍 Ubicación (A-Z)</option>
              <option value="name">📦 Nombre del Producto (A-Z)</option>
              <option value="stock">📊 Inventario (Mayor a menor)</option>
              <option value="price">💰 Precio (Mayor a menor)</option>
            </select>
          </div>

          {/* Limpiar Filtros */}
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button
              onClick={handleClearFilters}
              style={{
                width: '100%',
                padding: '0.5rem 1rem',
                backgroundColor: 'white',
                border: '1px solid var(--caanma-border)',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: '600',
                color: '#475569',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.35rem',
                height: '36px'
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}
            >
              <RefreshCw size={14} /> Limpiar Filtros
            </button>
          </div>
        </div>
      </div>

      {/* Main Datagrid */}
      <div className="card" style={{ padding: 0, overflowX: 'auto', border: '1px solid var(--caanma-border)', borderRadius: '12px' }}>
        <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--caanma-border)', backgroundColor: '#f8fafc' }}>
              <th style={{ width: '40px', padding: '0.75rem 1rem', textAlign: 'left' }}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={handleSelectAll}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
              </th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 'bold' }}>📍 Ubicación</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 'bold' }}>Producto</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 'bold' }}>Categoría / Marca</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 'bold' }}>Inventario</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 'bold' }}>Costo / Precio</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 'bold' }}>🗓️ Caducidad</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 'bold' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((prod) => {
              const isLowStock = prod.stock <= prod.minStock && prod.stock > 0;
              const isOutOfStock = prod.stock <= 0;
              
              // Expiration calculation
              let expLabel = null;
              let isExpired = false;
              let isExpiringSoon = false;
              if (prod.expirationDate) {
                const expDate = new Date(prod.expirationDate);
                const today = new Date();
                const timeDiff = expDate.getTime() - today.getTime();
                const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
                isExpired = daysDiff <= 0;
                isExpiringSoon = daysDiff > 0 && daysDiff <= 30;

                expLabel = isExpired 
                  ? 'Caducado' 
                  : isExpiringSoon 
                    ? `Caduca en ${daysDiff} d.`
                    : expDate.toLocaleDateString('es-MX', { timeZone: 'UTC' });
              }

              return (
                <tr key={prod.id} style={{ borderBottom: '1px solid var(--caanma-border)' }}>
                  {/* Checkbox */}
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <input
                      type="checkbox"
                      checked={!!selectedIds[prod.id]}
                      onChange={() => handleToggleSelect(prod.id)}
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                  </td>

                  {/* Location */}
                  <td style={{ padding: '0.75rem 1rem' }}>
                    {prod.location ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', fontWeight: 'bold', padding: '0.25rem 0.5rem', backgroundColor: '#e0f2fe', color: '#0369a1', borderRadius: '6px', textTransform: 'uppercase' }}>
                        📍 {prod.location}
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>
                        Sin Ubicación
                      </span>
                    )}
                  </td>

                  {/* Product details */}
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <Link href={`/productos/${prod.id}`} style={{ textDecoration: 'none', color: '#0f172a', fontWeight: '600', fontSize: '0.875rem' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--caanma-primary)'} onMouseLeave={e => e.currentTarget.style.color = '#0f172a'}>
                      {prod.name}
                    </Link>
                    <div style={{ fontSize: '0.75rem', color: 'var(--caanma-text-muted)', marginTop: '0.1rem' }}>
                      SKU: <strong style={{ color: '#475569' }}>{prod.sku}</strong> {prod.barcode && `| EAN: ${prod.barcode}`}
                    </div>
                  </td>

                  {/* Brand & Category */}
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.825rem' }}>
                    <div style={{ color: '#334155' }}>{prod.category || '-'}</div>
                    <div style={{ color: 'var(--caanma-text-muted)', fontSize: '0.75rem' }}>{prod.brand || '-'}</div>
                  </td>

                  {/* Stock */}
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.875rem' }}>
                    <div style={{ fontWeight: 'bold', color: isOutOfStock ? '#ef4444' : isLowStock ? '#d97706' : 'inherit' }}>
                      {prod.stock} pzas
                    </div>
                    {isLowStock && <div style={{ fontSize: '0.7rem', color: '#d97706', fontWeight: '600' }}>Stock Mín: {prod.minStock}</div>}
                    {isOutOfStock && <div style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: '600' }}>Agotado</div>}
                  </td>

                  {/* Price/Cost */}
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.875rem' }}>
                    <div style={{ fontWeight: 'bold', color: 'var(--caanma-primary)' }}>
                      ${prod.price.toFixed(2)}
                    </div>
                    <div style={{ fontSize: '0.725rem', color: 'var(--caanma-text-muted)' }}>
                      Costo: ${prod.cost.toFixed(2)}
                    </div>
                  </td>

                  {/* Expiration */}
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontSize: '0.8rem' }}>
                    {expLabel ? (
                      <span style={{ 
                        display: 'inline-block', 
                        padding: '0.25rem 0.5rem', 
                        borderRadius: '6px', 
                        fontWeight: 'bold',
                        backgroundColor: isExpired ? '#fef2f2' : isExpiringSoon ? '#fffbeb' : '#f0fdf4',
                        color: isExpired ? '#ef4444' : isExpiringSoon ? '#b45309' : '#15803d'
                      }}>
                        {expLabel}
                      </span>
                    ) : (
                      <span style={{ color: '#cbd5e1' }}>-</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                    <a
                      href={`/imprimir-etiquetas?ids=${prod.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Imprimir Etiqueta"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '28px',
                        height: '28px',
                        backgroundColor: '#faf5ff',
                        border: '1px solid #e9d5ff',
                        borderRadius: '6px',
                        color: '#6b21a8',
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f3e8ff'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = '#faf5ff'}
                    >
                      <Printer size={14} />
                    </a>
                  </td>
                </tr>
              );
            })}
            {filteredProducts.length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding: '4rem', textAlign: 'center', color: 'var(--caanma-text-muted)' }}>
                  <Package size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                  No se encontraron productos que coincidan con la búsqueda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
