'use client';

import { useState, useMemo } from 'react';
import { Save, Filter, Search, Percent, Zap } from 'lucide-react';
import { bulkUpdatePrices } from '@/app/actions/bulkPrice';

// Utility: round to nearest whole peso (no cents)
const roundPeso = (n: number) => Math.round(n);

type PriceList = 'price' | 'wholesalePrice' | 'specialPrice';

const PRICE_LISTS: { key: PriceList; label: string; newKey: '_newPrice' | '_newWholesale' | '_newSpecial' }[] = [
  { key: 'price', label: 'Precio Público', newKey: '_newPrice' },
  { key: 'wholesalePrice', label: 'Precio Mayoreo', newKey: '_newWholesale' },
  { key: 'specialPrice', label: 'Precio Especial', newKey: '_newSpecial' },
];

export default function PreciosMasivosClient({ initProducts, brands, categories, branchId }: { initProducts: any[], brands: string[], categories: string[], branchId: string }) {
  const [products, setProducts] = useState(initProducts.map(p => ({
    ...p,
    _newPrice: p.price,
    _newWholesale: p.wholesalePrice ?? '',
    _newSpecial: p.specialPrice ?? '',
    _modified: false
  })));

  const [brandFilter, setBrandFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // Active price list tab
  const [activePriceList, setActivePriceList] = useState<PriceList>('price');
  const activeList = PRICE_LISTS.find(l => l.key === activePriceList)!;

  // Global margin applicator
  const [globalMargin, setGlobalMargin] = useState<string>('');

  const displayedProducts = useMemo(() => {
    return products.filter(p => {
      if (brandFilter && p.brand !== brandFilter) return false;
      if (categoryFilter && p.category !== categoryFilter) return false;
      if (searchTerm && !p.name.toLowerCase().includes(searchTerm.toLowerCase()) && !(p.sku || '').toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });
  }, [products, brandFilter, categoryFilter, searchTerm]);

  // Apply global margin to filtered products for the active price list
  const applyGlobalMargin = () => {
    const margin = parseFloat(globalMargin);
    if (isNaN(margin) || margin <= -100) { alert('Ingresa un margen válido (ejemplo: 30 para 30%).'); return; }
    const factor = 1 + (margin / 100);
    const filteredIds = new Set(displayedProducts.map(p => p.id));

    setProducts(prev => prev.map(p => {
      if (!filteredIds.has(p.id) || p.cost <= 0) return p;
      const newPriceRaw = p.cost * factor;
      const newPriceRounded = roundPeso(newPriceRaw);

      const updatedField = activeList.newKey;
      const originalVal = p[activeList.key] ?? '';
      const isModified = newPriceRounded !== (originalVal === '' ? 0 : Number(originalVal));

      return { ...p, [updatedField]: newPriceRounded, _modified: isModified };
    }));
  };

  const handleChange = (id: string, field: '_newPrice' | '_newWholesale' | '_newSpecial', value: string) => {
    const val = value === '' ? '' : parseFloat(value);
    if (val !== '' && isNaN(val as number)) return;

    setProducts(prev => prev.map(p => {
      if (p.id !== id) return p;
      const next = { ...p, [field]: val };
      const isModified = next._newPrice !== p.price ||
                         next._newWholesale !== (p.wholesalePrice ?? '') ||
                         next._newSpecial !== (p.specialPrice ?? '');
      return { ...next, _modified: isModified };
    }));
  };

  const handleSave = async () => {
    const modified = products.filter(p => p._modified);
    if (modified.length === 0) { alert("No hay cambios que guardar."); return; }

    setIsSaving(true);
    try {
      const updates = modified.map(p => ({
        id: p.id,
        price: roundPeso(Number(p._newPrice) || 0),
        wholesalePrice: p._newWholesale === '' ? undefined : roundPeso(Number(p._newWholesale)),
        specialPrice: p._newSpecial === '' ? undefined : roundPeso(Number(p._newSpecial)),
      }));
      await bulkUpdatePrices(updates);
      alert('¡Precios actualizados con éxito!');
      setProducts(prev => prev.map(p => {
        if (!p._modified) return p;
        return {
          ...p,
          price: p._newPrice,
          wholesalePrice: p._newWholesale === '' ? null : p._newWholesale,
          specialPrice: p._newSpecial === '' ? null : p._newSpecial,
          _modified: false
        };
      }));
    } catch (e) {
      console.error(e);
      alert('Error al guardar los precios.');
    } finally {
      setIsSaving(false);
    }
  };

  const modifiedCount = products.filter(p => p._modified).length;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '3rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Actualización Masiva de Precios</h1>
          <p style={{ color: 'var(--pulpos-text-muted)', fontSize: '0.9rem' }}>Selecciona la lista, aplica un margen global y ajusta individualmente.</p>
        </div>
        <button onClick={handleSave} disabled={isSaving || modifiedCount === 0} className="btn-primary" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', opacity: (isSaving || modifiedCount === 0) ? 0.5 : 1 }}>
          <Save size={18} />
          {isSaving ? 'Guardando...' : `Guardar Cambios (${modifiedCount})`}
        </button>
      </div>

      {/* Price List Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: '1.5rem', borderBottom: '2px solid var(--pulpos-border)' }}>
        {PRICE_LISTS.map(list => (
          <button
            key={list.key}
            onClick={() => setActivePriceList(list.key)}
            style={{
              padding: '0.6rem 1.25rem',
              border: 'none',
              borderBottom: activePriceList === list.key ? '2px solid var(--pulpos-primary)' : '2px solid transparent',
              marginBottom: '-2px',
              background: 'none',
              cursor: 'pointer',
              fontWeight: activePriceList === list.key ? 'bold' : 'normal',
              color: activePriceList === list.key ? 'var(--pulpos-primary)' : 'var(--pulpos-text-muted)',
              fontSize: '0.9rem',
              transition: 'all 0.15s'
            }}
          >
            {list.label}
          </button>
        ))}
      </div>

      {/* Filters + Global Margin */}
      <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
        {/* Global Margin Row */}
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'end', marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.4rem', color: '#16a34a' }}>
              <Percent size={14} style={{ display: 'inline', marginRight: '4px' }} />
              Margen Global (%) — aplica a productos de la selección actual
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                type="number"
                step="0.5"
                placeholder="Ej: 30"
                value={globalMargin}
                onChange={e => setGlobalMargin(e.target.value)}
                style={{ width: '100px', padding: '0.5rem', borderRadius: '4px', border: '1px solid #86efac', fontSize: '1rem' }}
              />
              <span style={{ color: 'var(--pulpos-text-muted)', fontSize: '0.85rem' }}>% sobre costo → afecta <strong>{activeList.label}</strong></span>
            </div>
          </div>
          <button onClick={applyGlobalMargin} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', padding: '0.6rem 1.25rem', background: '#16a34a', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.875rem' }}>
            <Zap size={16} /> Aplicar Margen
          </button>
          <span style={{ fontSize: '0.75rem', color: '#16a34a', maxWidth: '180px', lineHeight: 1.4 }}>
            Los precios se redondean automáticamente al peso más cercano (sin centavos).
          </span>
        </div>

        {/* Filter Row */}
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'end', flexWrap: 'wrap' }}>
          <div style={{ flex: 2, minWidth: '180px' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.4rem', fontWeight: 'bold' }}><Search size={14} style={{ display: 'inline', marginRight: '4px' }}/> Buscar</label>
            <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="SKU o Nombre..." style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }} />
          </div>
          <div style={{ flex: 1, minWidth: '130px' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.4rem', fontWeight: 'bold' }}><Filter size={14} style={{ display: 'inline', marginRight: '4px' }}/> Marca</label>
            <select value={brandFilter} onChange={e => setBrandFilter(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }}>
              <option value="">(Todas)</option>
              {brands.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: '130px' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.4rem', fontWeight: 'bold' }}><Filter size={14} style={{ display: 'inline', marginRight: '4px' }}/> Categoría</label>
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }}>
              <option value="">(Todas)</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
          <thead style={{ backgroundColor: '#f8fafc' }}>
            <tr>
              <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--pulpos-border)' }}>SKU</th>
              <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Producto</th>
              <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Costo</th>
              <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--pulpos-border)', color: 'var(--pulpos-primary)' }}>
                {activeList.label} <span style={{ fontWeight: 'normal', fontSize: '0.75rem' }}>(activa)</span>
              </th>
              {PRICE_LISTS.filter(l => l.key !== activePriceList).map(l => (
                <th key={l.key} style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--pulpos-border)', color: 'var(--pulpos-text-muted)', fontWeight: 'normal', fontSize: '0.8rem' }}>
                  {l.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayedProducts.map(p => {
              const activeNewKey = activeList.newKey;
              const activeVal = p[activeNewKey];
              const margen = p.cost > 0 && activeVal !== '' ? ((Number(activeVal) - p.cost) / p.cost) * 100 : 0;
              const isActiveModified = p._modified && activeVal !== (p[activeList.key] ?? '');
              const otherLists = PRICE_LISTS.filter(l => l.key !== activePriceList);

              return (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--pulpos-border)', backgroundColor: p._modified ? '#fefce8' : 'transparent' }}>
                  <td style={{ padding: '0.5rem 1rem', color: 'var(--pulpos-text-muted)' }}>{p.sku || '--'}</td>
                  <td style={{ padding: '0.5rem 1rem', fontWeight: '500' }}>
                    <div style={{ maxWidth: '220px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={p.name}>{p.name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--pulpos-text-muted)' }}>{p.brand || 'S/M'} | {p.category || 'S/C'}</div>
                  </td>
                  <td style={{ padding: '0.5rem 1rem', color: 'var(--pulpos-text-muted)' }}>${p.cost.toFixed(2)}</td>

                  {/* Active price list — editable + margin */}
                  <td style={{ padding: '0.5rem 1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ color: 'var(--pulpos-text-muted)' }}>$</span>
                      <input
                        type="number"
                        step="1"
                        value={activeVal}
                        onChange={e => handleChange(p.id, activeNewKey, e.target.value)}
                        style={{
                          width: '80px',
                          padding: '0.25rem',
                          borderRadius: '4px',
                          border: isActiveModified ? '2px solid #eab308' : '1px solid var(--pulpos-border)',
                          backgroundColor: isActiveModified ? '#fefce8' : 'white',
                          fontWeight: isActiveModified ? 'bold' : 'normal',
                          fontSize: '0.9rem'
                        }}
                      />
                      <small style={{ color: margen < 0 ? '#ef4444' : margen > 0 ? '#16a34a' : 'var(--pulpos-text-muted)' }}>
                        {activeVal !== '' ? `${margen.toFixed(1)}%` : '—'}
                      </small>
                    </div>
                  </td>

                  {/* Other price lists — info only */}
                  {otherLists.map(l => {
                    const val = p[l.newKey];
                    return (
                      <td key={l.key} style={{ padding: '0.5rem 1rem', color: 'var(--pulpos-text-muted)', fontSize: '0.8rem' }}>
                        {val !== '' && val != null ? `$${Number(val).toFixed(0)}` : <span style={{ opacity: 0.4 }}>N/A</span>}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {displayedProducts.length === 0 && (
              <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--pulpos-text-muted)' }}>No hay productos que coincidan.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
