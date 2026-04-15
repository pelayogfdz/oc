'use client';

import { useState, useMemo } from 'react';
import { Save, Filter, Search } from 'lucide-react';
import { bulkUpdatePrices } from '@/app/actions/bulkPrice';

export default function PreciosMasivosClient({ initProducts, brands, categories, branchId }: { initProducts: any[], brands: string[], categories: string[], branchId: string }) {
  const [products, setProducts] = useState(initProducts.map(p => ({ 
    ...p, 
    _newPrice: p.price, 
    _newWholesale: p.wholesalePrice || '', 
    _newSpecial: p.specialPrice || '', 
    _modified: false 
  })));
  const [brandFilter, setBrandFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  const displayedProducts = useMemo(() => {
    return products.filter(p => {
      if (brandFilter && p.brand !== brandFilter) return false;
      if (categoryFilter && p.category !== categoryFilter) return false;
      if (searchTerm && !p.name.toLowerCase().includes(searchTerm.toLowerCase()) && !(p.sku || '').toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });
  }, [products, brandFilter, categoryFilter, searchTerm]);

  const handleChange = (id: string, field: '_newPrice' | '_newWholesale' | '_newSpecial', value: string) => {
    const val = value === '' ? '' : parseFloat(value);
    if (val !== '' && isNaN(val)) return;
    
    setProducts(prev => prev.map(p => {
      if (p.id === id) {
        const next = { ...p, [field]: val };
        const isModified = next._newPrice !== p.price || 
                           next._newWholesale !== (p.wholesalePrice || '') || 
                           next._newSpecial !== (p.specialPrice || '');
        return { ...next, _modified: isModified };
      }
      return p;
    }));
  };

  const handleSave = async () => {
    const modified = products.filter(p => p._modified);
    if (modified.length === 0) {
      alert("No hay cambios que guardar.");
      return;
    }

    setIsSaving(true);
    try {
      const updates = modified.map(p => ({ 
        id: p.id, 
        price: Number(p._newPrice) || 0,
        wholesalePrice: p._newWholesale === '' ? undefined : Number(p._newWholesale),
        specialPrice: p._newSpecial === '' ? undefined : Number(p._newSpecial),
      }));
      await bulkUpdatePrices(updates);
      alert('¡Precios actualizados con éxito!');
      setProducts(prev => prev.map(p => {
        if (p._modified) {
          return {
             ...p, 
             price: p._newPrice, 
             wholesalePrice: p._newWholesale === '' ? null : p._newWholesale,
             specialPrice: p._newSpecial === '' ? null : p._newSpecial,
             _modified: false
          };
        }
        return p;
      }));
    } catch (e) {
      console.error(e);
      alert('Error al guardar los precios.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '3rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Actualización Masiva de Precios</h1>
          <p style={{ color: 'var(--pulpos-text-muted)', fontSize: '0.9rem' }}>Modifica precios de lista por marca, categoría o generales.</p>
        </div>
        <button onClick={handleSave} disabled={isSaving || products.filter(p=>p._modified).length === 0} className="btn-primary" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', opacity: (isSaving || products.filter(p=>p._modified).length === 0) ? 0.5 : 1 }}>
          <Save size={18} />
          {isSaving ? 'Guardando...' : `Guardar Cambios (${products.filter(p=>p._modified).length})`}
        </button>
      </div>

      <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'end' }}>
        <div style={{ flex: 2 }}>
          <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 'bold' }}><Search size={14} style={{ display: 'inline', marginRight: '4px' }}/> Buscar Producto</label>
          <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="SKU o Nombre..." style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 'bold' }}><Filter size={14} style={{ display: 'inline', marginRight: '4px' }}/> Marca</label>
          <select value={brandFilter} onChange={e => setBrandFilter(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }}>
            <option value="">(Todas)</option>
            {brands.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 'bold' }}><Filter size={14} style={{ display: 'inline', marginRight: '4px' }}/> Categoría</label>
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }}>
            <option value="">(Todas)</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
          <thead style={{ backgroundColor: '#f8fafc' }}>
            <tr>
              <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--pulpos-border)' }}>SKU</th>
              <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Producto</th>
              <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Costo</th>
              <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--pulpos-border)' }}>P. Público (Margen)</th>
              <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--pulpos-border)' }}>P. Mayoreo (Margen)</th>
              <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--pulpos-border)' }}>P. Especial (Margen)</th>
            </tr>
          </thead>
          <tbody>
            {displayedProducts.map(p => {
              const margenPublico = p.cost > 0 && p._newPrice ? ((Number(p._newPrice) - p.cost) / p.cost) * 100 : 0;
              const margenMayoreo = p.cost > 0 && p._newWholesale ? ((Number(p._newWholesale) - p.cost) / p.cost) * 100 : 0;
              const margenEspecial = p.cost > 0 && p._newSpecial ? ((Number(p._newSpecial) - p.cost) / p.cost) * 100 : 0;

              return (
              <tr key={p.id} style={{ borderBottom: '1px solid var(--pulpos-border)', backgroundColor: p._modified ? '#fefce8' : 'transparent' }}>
                <td style={{ padding: '0.5rem 1rem', color: 'var(--pulpos-text-muted)' }}>{p.sku || '--'}</td>
                <td style={{ padding: '0.5rem 1rem', fontWeight: '500' }}>
                  <div style={{ maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={p.name}>{p.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--pulpos-text-muted)' }}>{p.brand || 'S/M'} | {p.category || 'S/C'}</div>
                </td>
                <td style={{ padding: '0.5rem 1rem', color: 'var(--pulpos-text-muted)' }}>${p.cost.toFixed(2)}</td>
                
                {/* PRECIO PUBLICO */}
                <td style={{ padding: '0.5rem 1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ color: 'var(--pulpos-text-muted)' }}>$</span>
                    <input 
                      type="number" step="0.01" value={p._newPrice} onChange={e => handleChange(p.id, '_newPrice', e.target.value)}
                      style={{ width: '80px', padding: '0.25rem', borderRadius: '4px', border: p._modified && p._newPrice !== p.price ? '1px solid #eab308' : '1px solid var(--pulpos-border)', backgroundColor: p._modified && p._newPrice !== p.price ? '#fefce8' : 'white', fontWeight: p._modified && p._newPrice !== p.price ? 'bold' : 'normal' }} 
                    />
                    <small style={{ color: margenPublico < 0 ? '#ef4444' : 'var(--pulpos-text-muted)' }}>({margenPublico.toFixed(1)}%)</small>
                  </div>
                </td>

                {/* PRECIO MAYOREO */}
                <td style={{ padding: '0.5rem 1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ color: 'var(--pulpos-text-muted)' }}>$</span>
                    <input 
                      type="number" step="0.01" value={p._newWholesale} onChange={e => handleChange(p.id, '_newWholesale', e.target.value)} placeholder="N/A"
                      style={{ width: '80px', padding: '0.25rem', borderRadius: '4px', border: p._modified && p._newWholesale !== (p.wholesalePrice||'') ? '1px solid #eab308' : '1px solid var(--pulpos-border)', backgroundColor: p._modified && p._newWholesale !== (p.wholesalePrice||'') ? '#fefce8' : 'white', fontWeight: p._modified && p._newWholesale !== (p.wholesalePrice||'') ? 'bold' : 'normal' }} 
                    />
                    {p._newWholesale !== '' && <small style={{ color: margenMayoreo < 0 ? '#ef4444' : 'var(--pulpos-text-muted)' }}>({margenMayoreo.toFixed(1)}%)</small>}
                  </div>
                </td>

                {/* PRECIO ESPECIAL */}
                <td style={{ padding: '0.5rem 1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ color: 'var(--pulpos-text-muted)' }}>$</span>
                    <input 
                      type="number" step="0.01" value={p._newSpecial} onChange={e => handleChange(p.id, '_newSpecial', e.target.value)} placeholder="N/A"
                      style={{ width: '80px', padding: '0.25rem', borderRadius: '4px', border: p._modified && p._newSpecial !== (p.specialPrice||'') ? '1px solid #eab308' : '1px solid var(--pulpos-border)', backgroundColor: p._modified && p._newSpecial !== (p.specialPrice||'') ? '#fefce8' : 'white', fontWeight: p._modified && p._newSpecial !== (p.specialPrice||'') ? 'bold' : 'normal' }} 
                    />
                    {p._newSpecial !== '' && <small style={{ color: margenEspecial < 0 ? '#ef4444' : 'var(--pulpos-text-muted)' }}>({margenEspecial.toFixed(1)}%)</small>}
                  </div>
                </td>

              </tr>
            )})}
            {displayedProducts.length === 0 && (
              <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--pulpos-text-muted)' }}>No hay productos que coincidan.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
