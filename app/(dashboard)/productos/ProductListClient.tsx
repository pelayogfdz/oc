'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { Filter, MapPin, ArrowDownUp, Search, MoreVertical, Camera } from 'lucide-react';
import { searchProducts, deleteProduct } from '@/app/actions/product';
import ProductTableUI from '@/app/components/ProductTableUI';
import BarcodeScannerModal from '@/app/components/BarcodeScannerModal';

export default function ProductListClient({ initialProducts, branchId }: { initialProducts: any[], branchId: string }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [displayedProducts, setDisplayedProducts] = useState<any[]>(initialProducts);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);

  // Advanced Filters
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ACTIVE');
  const [filterStock, setFilterStock] = useState('ALL');

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchProducts(searchTerm, branchId);
        setDisplayedProducts(results);
      } catch (e) {
        console.error(e);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, branchId]);

  const filteredProducts = useMemo(() => displayedProducts.filter(p => {
    if (filterCategory !== 'ALL' && p.category !== filterCategory) return false;
    
    // Status Filter
    if (filterStatus === 'ACTIVE' && p.status === 'INACTIVE') return false;
    if (filterStatus === 'INACTIVE' && p.status !== 'INACTIVE') return false;

    // Stock Filter
    if (filterStock === 'IN_STOCK' && p.stock <= 0) return false;
    if (filterStock === 'OUT_OF_STOCK' && p.stock > 0) return false;
    if (filterStock === 'LOW_STOCK' && p.stock > (p.minStock || 0)) return false;

    return true;
  }), [displayedProducts, filterCategory, filterStatus, filterStock]);

  const handleToggleSelectAll = useCallback(() => {
    if (selectedIds.length === filteredProducts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProducts.map(p => p.id));
    }
  }, [selectedIds, filteredProducts]);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(selId => selId !== id) : [...prev, id]);
  }, []);

  const renderCustomActions = useCallback((prod: any) => (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button 
        onClick={(e) => { e.stopPropagation(); setOpenDropdownId(openDropdownId === prod.id ? null : prod.id); }}
        style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', padding: '0.25rem' }}
      >
        <MoreVertical size={18} />
      </button>
      {openDropdownId === prod.id && (
        <div style={{ position: 'absolute', right: '100%', top: '50%', transform: 'translateY(-50%)', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', zIndex: 50, width: '150px', overflow: 'hidden' }}>
          <Link href={`/productos/nuevo?cloneId=${prod.id}`} style={{ display: 'block', padding: '0.75rem 1rem', textDecoration: 'none', color: '#1e293b', fontSize: '0.9rem', textAlign: 'left' } as any}>Clonar</Link>
          <Link href={`/productos/${prod.id}`} style={{ display: 'block', padding: '0.75rem 1rem', textDecoration: 'none', color: '#1e293b', fontSize: '0.9rem', textAlign: 'left' }}>Editar</Link>
          <button onClick={(e) => {
            e.stopPropagation();
            const url = `/productos/etiquetas?ids=${prod.id}`;
            window.open(url, '_blank', 'width=400,height=600');
            setOpenDropdownId(null);
          }} style={{ width: '100%', display: 'block', padding: '0.75rem 1rem', border: 'none', background: 'none', color: '#1e293b', textAlign: 'left', cursor: 'pointer', fontSize: '0.9rem' }}>
            Imprimir Etiqueta
          </button>
          <button onClick={async (e) => {
            e.stopPropagation();
            if(confirm('¿Eliminar producto definitivamente?')) {
              try {
                await deleteProduct(prod.id);
                setDisplayedProducts(prev => prev.filter(p => p.id !== prod.id));
              } catch (e: any) { alert("Error eliminando: " + e.message); }
            }
          }} style={{ width: '100%', display: 'block', padding: '0.75rem 1rem', border: 'none', background: 'none', color: '#ef4444', textAlign: 'left', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}>
            Eliminar
          </button>
        </div>
      )}
    </div>
  ), [openDropdownId]);

  return (
    <div style={{ fontFamily: 'var(--font-geist-sans)' }}>
      {showScanner && (
        <BarcodeScannerModal 
          onScan={(decodedText) => {
            setSearchTerm(decodedText);
            setShowScanner(false);
          }} 
          onClose={() => setShowScanner(false)} 
        />
      )}
      {/* Toolbar and Always-Visible Filters */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        
        {/* Main Search Bar */}
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flexGrow: 1, minWidth: '300px', maxWidth: '800px' }}>
            <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              placeholder="Buscar por nombre, SKU o código de barras..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ 
                padding: '0.75rem 1rem 0.75rem 2.5rem', 
                width: '100%', 
                borderRadius: '8px', 
                border: '1px solid #cbd5e1', 
                backgroundColor: 'white', 
                fontSize: '1rem',
                outline: 'none',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}
            />
            <button 
              onClick={() => setShowScanner(true)}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--pulpos-primary)',
                display: 'flex',
                alignItems: 'center',
                padding: '4px'
              }}
              title="Escanear Código de Barras"
            >
              <Camera size={20} />
            </button>
          </div>

          <button 
            style={{ 
              display: 'flex', alignItems: 'center', gap: '0.5rem', 
              backgroundColor: 'white', 
              border: '1px solid #cbd5e1', 
              padding: '0.75rem 1rem', 
              borderRadius: '8px', 
              fontWeight: '500', 
              cursor: 'pointer',
              fontSize: '0.95rem'
            }}>
            <MapPin size={18} /> Ubicación
          </button>

          <button 
            style={{ 
              display: 'flex', alignItems: 'center', gap: '0.5rem', 
              backgroundColor: 'white', 
              border: '1px solid #cbd5e1', 
              padding: '0.75rem 1rem', 
              borderRadius: '8px', 
              fontWeight: '500', 
              cursor: 'pointer',
              fontSize: '0.95rem'
            }}>
            <ArrowDownUp size={18} /> Ordenar
          </button>
        </div>

        {/* Filters Row */}
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-end', paddingTop: '0.5rem', borderTop: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#64748b' }}>Categoría</label>
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #e2e8f0', minWidth: '150px' }}>
              <option value="ALL">Todas</option>
              {Array.from(new Set(initialProducts.map(p => p.category).filter(Boolean))).map((cat: any) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#64748b' }}>Filtrar por Status</label>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #e2e8f0', minWidth: '150px' }}>
              <option value="ALL">Todos los Status</option>
              <option value="ACTIVE">Activos</option>
              <option value="INACTIVE">Inactivos / Eliminados</option>
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#64748b' }}>Filtrar por Stock</label>
            <select value={filterStock} onChange={e => setFilterStock(e.target.value)} style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #e2e8f0', minWidth: '150px' }}>
              <option value="ALL">Todas las existencias</option>
              <option value="IN_STOCK">Con Stock</option>
              <option value="LOW_STOCK">Bajo Stock</option>
              <option value="OUT_OF_STOCK">Agotados</option>
            </select>
          </div>
          <div style={{ flexGrow: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-end' }}>
             <button onClick={() => { setFilterCategory('ALL'); setFilterStatus('ACTIVE'); setFilterStock('ALL'); }} style={{ color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.9rem', fontWeight: '500' }}>
               Limpiar Filtros
             </button>
          </div>
        </div>
      </div>

      <div style={{ opacity: isSearching ? 0.5 : 1, transition: 'opacity 0.2s' }}>
        {selectedIds.length > 0 && (
          <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#1e3a8a', fontWeight: '500' }}>{selectedIds.length} productos seleccionados</span>
            <button 
              onClick={() => {
                const url = `/productos/etiquetas?ids=${selectedIds.join(',')}`;
                window.open(url, '_blank', 'width=400,height=600');
              }}
              style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              Imprimir Etiquetas Seleccionadas
            </button>
          </div>
        )}

        <ProductTableUI 
          products={filteredProducts}
          showCheckboxes={true}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          onToggleSelectAll={handleToggleSelectAll}
          renderCustomActions={renderCustomActions}
        />
      </div>
    </div>
  );
}
