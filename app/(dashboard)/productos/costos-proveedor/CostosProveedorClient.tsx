'use client';

import { useState, useMemo, useRef } from 'react';
import { Save, Filter, Search, Upload, Download } from 'lucide-react';
import { bulkUpdateCosts } from '@/app/actions/bulkCost';

export default function CostosProveedorClient({ initProducts, brands, branchId }: { initProducts: any[], brands: string[], branchId: string }) {
  const [products, setProducts] = useState(initProducts.map(p => ({ ...p, _newCost: p.cost, _modified: false })));
  const [brandFilter, setBrandFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [forceAverageCost, setForceAverageCost] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      if (p.id !== id) return p;
      return { ...p, _newCost: val, _modified: val !== p.cost };
    }));
  };

  const handleSave = async () => {
    const modified = products.filter(p => p._modified);
    if (modified.length === 0) { alert("No hay cambios que guardar."); return; }
    setIsSaving(true);
    try {
      await bulkUpdateCosts(modified.map(p => ({ id: p.id, cost: p._newCost })), forceAverageCost);
      alert('¡Costos actualizados con éxito!');
      setProducts(prev => prev.map(p => ({ ...p, cost: p._modified ? p._newCost : p.cost, _modified: false })));
    } catch (e) {
      console.error(e);
      alert('Error al guardar los costos.');
    } finally {
      setIsSaving(false);
    }
  };

  /* ── EXPORT ── */
  const handleExport = () => {
    const rows = displayedProducts.map(p => [p.sku || '', p.name, p.brand || '', (p.averageCost || 0).toFixed(2), p._newCost.toFixed(2)]);
    const header = ['SKU', 'Nombre', 'Marca', 'Costo Promedio Actual', 'Nuevo Costo'];
    const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `costos-proveedor-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  /* ── IMPORT ── */
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      // Parse CSV rows (skip header)
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      const dataLines = lines.slice(1); // skip header row
      let updated = 0;
      const updatesMap: Record<string, number> = {};

      for (const line of dataLines) {
        // Basic CSV parse: split by comma, handle quoted fields
        const cols = line.match(/(".*?"|[^,]+)(?=,|$)/g)?.map(c => c.replace(/^"|"$/g, '').replace(/""/g, '"')) || [];
        if (cols.length < 5) continue;
        const sku = cols[0]?.trim();
        const newCostStr = cols[4]?.trim();
        const newCost = parseFloat(newCostStr);
        if (!sku || isNaN(newCost)) continue;
        updatesMap[sku] = newCost;
      }

      setProducts(prev => prev.map(p => {
        const importedCost = updatesMap[p.sku || ''];
        if (importedCost !== undefined && importedCost !== p.cost) {
          updated++;
          return { ...p, _newCost: importedCost, _modified: true };
        }
        return p;
      }));

      alert(`Importación completada. ${updated} producto(s) actualizados. Revisa y guarda los cambios.`);
    };
    reader.readAsText(file, 'UTF-8');
    // Reset input so the same file can be re-imported
    e.target.value = '';
  };

  const modifiedCount = products.filter(p => p._modified).length;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {/* Hidden file input for import */}
      <input ref={fileInputRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleImport} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Listas de Precios de Proveedor</h1>
          <p style={{ color: 'var(--pulpos-text-muted)', fontSize: '0.9rem' }}>Actualiza rápidamente el costo de reposición. Exporta, edita en Excel e importa.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button onClick={handleExport} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.6rem 1rem', border: '1px solid var(--pulpos-border)', borderRadius: '6px', background: 'white', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.875rem' }}>
            <Download size={16} /> Exportar CSV
          </button>
          <button onClick={() => fileInputRef.current?.click()} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.6rem 1rem', border: '1px solid var(--pulpos-border)', borderRadius: '6px', background: 'white', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.875rem' }}>
            <Upload size={16} /> Importar CSV
          </button>
          <button onClick={handleSave} disabled={isSaving || modifiedCount === 0} className="btn-primary" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', opacity: (isSaving || modifiedCount === 0) ? 0.5 : 1 }}>
            <Save size={18} />
            {isSaving ? 'Guardando...' : `Guardar (${modifiedCount})`}
          </button>
        </div>
      </div>

      {/* Instrucciones de importación */}
      <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1.5rem', fontSize: '0.8rem', color: '#1e40af' }}>
        <strong>💡 Flujo de importación:</strong> Exporta el CSV → edita la columna <em>"Nuevo Costo"</em> en Excel → importa el archivo. Los cambios se marcan en amarillo antes de guardar.
      </div>

      <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'end', flexWrap: 'wrap' }}>
        <div style={{ flex: 2, minWidth: '180px' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 'bold' }}><Search size={14} style={{ display: 'inline', marginRight: '4px' }}/> Buscar Producto</label>
          <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="SKU o Nombre..." style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }} />
        </div>
        <div style={{ flex: 1, minWidth: '140px' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 'bold' }}><Filter size={14} style={{ display: 'inline', marginRight: '4px' }}/> Filtrar por Marca</label>
          <select value={brandFilter} onChange={e => setBrandFilter(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }}>
            <option value="">(Todas las marcas)</option>
            {brands.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div style={{ flex: 1, minWidth: '180px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer', padding: '0.6rem', border: '1px solid var(--pulpos-border)', borderRadius: '4px', backgroundColor: forceAverageCost ? '#eff6ff' : 'transparent' }}>
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
                    {p._modified && <span style={{ fontSize: '0.75rem', color: '#ca8a04', fontWeight: 'bold' }}>✏️ cambio</span>}
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
