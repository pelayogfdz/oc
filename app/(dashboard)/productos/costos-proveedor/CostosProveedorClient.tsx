'use client';

import { useState, useMemo } from 'react';
import { Save, Filter, Search, CheckCircle } from 'lucide-react';
import { bulkUpdateCosts } from '@/app/actions/bulkCost';

export default function CostosProveedorClient({ initProducts, brands, branchId }: { initProducts: any[], brands: string[], branchId: string }) {
  const [products, setProducts] = useState(initProducts.map(p => ({ ...p, _newCost: p.cost, _modified: false })));
  const [brandFilter, setBrandFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [forceAverageCost, setForceAverageCost] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const displayedProducts = useMemo(() => {
    return products.filter(p => {
      if (brandFilter && p.brand !== brandFilter) return false;
      if (searchTerm && !p.name.toLowerCase().includes(searchTerm.toLowerCase()) && !(p.sku || '').toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });
  }, [products, brandFilter, searchTerm]);

  const handleCostChange = (id: string, newCost: string) => {
    const val = parseFloat(newCost);
    if (isNaN(val)) return;
    
    setProducts(prev => prev.map(p => {
      if (p.id === id) {
        return { ...p, _newCost: val, _modified: val !== p.cost };
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
      const updates = modified.map(p => ({ id: p.id, cost: p._newCost }));
      await bulkUpdateCosts(updates, forceAverageCost);
      alert('¡Costos actualizados con éxito!');
      // Reset modified states
      setProducts(prev => prev.map(p => ({ ...p, cost: p._modified ? p._newCost : p.cost, _modified: false })));
    } catch (e) {
      console.error(e);
      alert('Error al guardar los costos.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Listas de Precios de Proveedor</h1>
          <p style={{ color: 'var(--pulpos-text-muted)', fontSize: '0.9rem' }}>Actualiza rápidamente el costo de reposición de tus marcas.</p>
        </div>
        <button onClick={handleSave} disabled={isSaving || products.filter(p=>p._modified).length === 0} className="btn-primary" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', opacity: (isSaving || products.filter(p=>p._modified).length === 0) ? 0.5 : 1 }}>
          <Save size={18} />
          {isSaving ? 'Guardando...' : `Guardar Cambios (${products.filter(p=>p._modified).length})`}
        </button>
      </div>

      <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'end' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 'bold' }}><Search size={14} style={{ display: 'inline', marginRight: '4px' }}/> Buscar Producto</label>
          <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="SKU o Nombre..." style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 'bold' }}><Filter size={14} style={{ display: 'inline', marginRight: '4px' }}/> Filtrar por Marca</label>
          <select value={brandFilter} onChange={e => setBrandFilter(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }}>
            <option value="">(Todas las marcas)</option>
            {brands.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer', padding: '0.5rem', border: '1px solid var(--pulpos-border)', borderRadius: '4px', backgroundColor: forceAverageCost ? '#eff6ff' : 'transparent' }}>
            <input type="checkbox" checked={forceAverageCost} onChange={e => setForceAverageCost(e.target.checked)} />
            Forzar también Costo Promedio
          </label>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
          <thead style={{ backgroundColor: '#f8fafc' }}>
            <tr>
              <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>SKU</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Producto</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Marca</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Costo Prom. Actual</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Nuevo Costo (Reposición)</th>
            </tr>
          </thead>
          <tbody>
            {displayedProducts.map(p => (
              <tr key={p.id} style={{ borderBottom: '1px solid var(--pulpos-border)', backgroundColor: p._modified ? '#fefce8' : 'transparent' }}>
                <td style={{ padding: '0.75rem 1rem', color: 'var(--pulpos-text-muted)' }}>{p.sku || '--'}</td>
                <td style={{ padding: '0.75rem 1rem', fontWeight: '500' }}>{p.name}</td>
                <td style={{ padding: '0.75rem 1rem', color: 'var(--pulpos-text-muted)' }}>{p.brand || '--'}</td>
                <td style={{ padding: '0.75rem 1rem' }}>${(p.averageCost || 0).toFixed(2)}</td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ color: 'var(--pulpos-text-muted)' }}>$</span>
                    <input 
                      type="number" 
                      step="0.01" 
                      value={p._newCost} 
                      onChange={e => handleCostChange(p.id, e.target.value)}
                      style={{ 
                        width: '100px', 
                        padding: '0.25rem', 
                        borderRadius: '4px', 
                        border: p._modified ? '1px solid #eab308' : '1px solid var(--pulpos-border)',
                        backgroundColor: p._modified ? '#fefce8' : 'white',
                        fontWeight: p._modified ? 'bold' : 'normal'
                      }} 
                    />
                  </div>
                </td>
              </tr>
            ))}
            {displayedProducts.length === 0 && (
              <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--pulpos-text-muted)' }}>No hay productos que coincidan con los filtros.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
