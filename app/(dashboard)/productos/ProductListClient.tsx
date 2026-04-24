'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Image as ImageIcon, MoreVertical, Filter, LayoutGrid, List } from 'lucide-react';
import { searchProducts, deleteProduct } from '@/app/actions/product';
import { formatCurrency } from '@/lib/utils';

export default function ProductListClient({ initialProducts, branchId }: { initialProducts: any[], branchId: string }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState('Todos');
  const [displayedProducts, setDisplayedProducts] = useState<any[]>(initialProducts);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Advanced Filters
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filterType, setFilterType] = useState('ALL');
  const [filterSat, setFilterSat] = useState('ALL');
  const [filterBarcode, setFilterBarcode] = useState('ALL');
  const [filterCategory, setFilterCategory] = useState('ALL');

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

  const filteredProducts = displayedProducts.filter(p => {
    if (activeTab === 'Activos' && !p.isActive) return false;
    if (activeTab === 'Inactivos' && p.isActive) return false;
    if (activeTab === 'Bajo stock' && p.stock > p.minStock) return false;
    
    const t = p.type || 'STANDARD';
    if (filterType !== 'ALL' && t !== filterType) return false;
    if (filterSat === 'MISSING_SAT' && (p.satKey && p.satUnit)) return false;
    if (filterSat === 'HAS_SAT' && (!p.satKey || !p.satUnit)) return false;
    if (filterBarcode === 'MISSING' && p.barcode) return false;
    if (filterCategory !== 'ALL' && p.category !== filterCategory) return false;
    
    return true;
  });

  return (
    <div style={{ fontFamily: 'var(--font-geist-sans)' }}>
      {/* Tabs and Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--pulpos-border)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '2rem' }}>
          {['Todos', 'Activos', 'Inactivos', 'Bajo stock'].map((tab) => (
            <button key={tab} 
              onClick={() => setActiveTab(tab)}
              style={{ 
              padding: '0.5rem 0', 
              border: 'none',
              background: 'none',
              borderBottom: activeTab === tab ? '2px solid var(--pulpos-primary)' : '2px solid transparent',
              color: activeTab === tab ? 'var(--pulpos-primary)' : 'var(--pulpos-text-muted)',
              fontWeight: activeTab === tab ? 'bold' : '500',
              fontSize: '1rem',
              cursor: 'pointer'
            }}>
              {tab}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', backgroundColor: '#f1f5f9', padding: '0.25rem', borderRadius: '8px' }}>
          <button 
            onClick={() => setViewMode('grid')}
            style={{ padding: '0.5rem', borderRadius: '6px', border: 'none', cursor: 'pointer', backgroundColor: viewMode === 'grid' ? 'white' : 'transparent', color: viewMode === 'grid' ? 'var(--pulpos-primary)' : 'var(--pulpos-text-muted)', boxShadow: viewMode === 'grid' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
          >
            <LayoutGrid size={20} />
          </button>
          <button 
            onClick={() => setViewMode('list')}
            style={{ padding: '0.5rem', borderRadius: '6px', border: 'none', cursor: 'pointer', backgroundColor: viewMode === 'list' ? 'white' : 'transparent', color: viewMode === 'list' ? 'var(--pulpos-primary)' : 'var(--pulpos-text-muted)', boxShadow: viewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
          >
            <List size={20} />
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', maxWidth: '600px', position: 'relative' }}>
            <input 
              type="text" 
              placeholder="🔍 Busca productos rápidamente por nombre, SKU o código de barras..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ padding: '0.8rem 1.5rem', width: '100%', borderRadius: '999px', border: '1px solid var(--pulpos-border)', backgroundColor: 'white', fontSize: '1rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
            />
          </div>
          <button 
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: showAdvancedFilters ? '#eff6ff' : 'white', color: showAdvancedFilters ? 'var(--pulpos-primary)' : 'inherit', border: '1px solid', borderColor: showAdvancedFilters ? 'var(--pulpos-primary)' : 'var(--pulpos-border)', padding: '0.8rem 1.25rem', borderRadius: '999px', fontWeight: '500', cursor: 'pointer' }}>
            <Filter size={18} /> Filtros avanzados
          </button>
        </div>

        {/* Advanced Filters Panel */}
        {showAdvancedFilters && (
          <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '12px', display: 'flex', gap: '1.5rem', flexWrap: 'wrap', border: '1px solid #e2e8f0' }}>
            {/* Same filter inputs as before, just better styling */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--pulpos-text-muted)' }}>Tipo de Producto</label>
              <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--pulpos-border)', minWidth: '150px' }}>
                <option value="ALL">Cualquiera</option>
                <option value="STANDARD">Producto (Standard)</option>
                <option value="SERVICE">Servicio (Sin control)</option>
                <option value="KIT">Receta / Kit</option>
              </select>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--pulpos-text-muted)' }}>Métricas SAT</label>
              <select value={filterSat} onChange={e => setFilterSat(e.target.value)} style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--pulpos-border)', minWidth: '220px' }}>
                <option value="ALL">Mostrar Todos</option>
                <option value="MISSING_SAT">Faltan Datos SAT</option>
                <option value="HAS_SAT">Configurados para CFDI</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--pulpos-text-muted)' }}>Código de Barras</label>
              <select value={filterBarcode} onChange={e => setFilterBarcode(e.target.value)} style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--pulpos-border)', minWidth: '180px' }}>
                <option value="ALL">Mostrar Todos</option>
                <option value="MISSING">Sin Código de Barras</option>
              </select>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--pulpos-text-muted)' }}>Categoría</label>
              <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--pulpos-border)', minWidth: '150px' }}>
                <option value="ALL">Todas</option>
                {Array.from(new Set(initialProducts.map(p => p.category).filter(Boolean))).map((cat: any) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div style={{ flexGrow: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-end' }}>
               <button onClick={() => { setFilterType('ALL'); setFilterSat('ALL'); setFilterBarcode('ALL'); setFilterCategory('ALL'); }} style={{ color: 'var(--pulpos-text-muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.9rem', fontWeight: '500' }}>
                 Limpiar Filtros
               </button>
            </div>
          </div>
        )}
      </div>

      <div style={{ opacity: isSearching ? 0.5 : 1, transition: 'opacity 0.2s' }}>
        {filteredProducts.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--pulpos-text-muted)', backgroundColor: 'white', borderRadius: '12px', border: '1px dashed var(--pulpos-border)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <ImageIcon size={64} color="#e2e8f0" />
              <p style={{ fontSize: '1.2rem', fontWeight: '500' }}>{isSearching ? 'Buscando en catálogo...' : 'No se encontraron productos.'}</p>
            </div>
          </div>
        ) : viewMode === 'grid' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.5rem' }}>
            {filteredProducts.map(prod => (
              <div key={prod.id} style={{ 
                backgroundColor: 'white', 
                borderRadius: '16px', 
                border: '1px solid var(--pulpos-border)', 
                overflow: 'hidden',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                transition: 'transform 0.2s, box-shadow 0.2s',
                position: 'relative'
              }}
              onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.1)'; }}
              onMouseOut={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.05)'; }}
              >
                {!prod.isActive && (
                  <div style={{ position: 'absolute', top: '10px', left: '10px', backgroundColor: 'rgba(255,255,255,0.9)', padding: '0.25rem 0.5rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', zIndex: 10 }}>
                    Inactivo
                  </div>
                )}
                <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 10 }}>
                  <button 
                    onClick={() => setOpenDropdownId(openDropdownId === prod.id ? null : prod.id)}
                    style={{ border: 'none', background: 'rgba(255,255,255,0.9)', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--pulpos-text)', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                  >
                    <MoreVertical size={16} />
                  </button>
                  {openDropdownId === prod.id && (
                    <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: '0.5rem', backgroundColor: 'white', border: '1px solid var(--pulpos-border)', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 20, width: '150px', overflow: 'hidden' }}>
                      <Link href={`/productos/nuevo?cloneId=${prod.id}`} style={{ display: 'block', padding: '0.75rem 1rem', textDecoration: 'none', color: 'var(--pulpos-text)', fontSize: '0.9rem' } as any}>Clonar</Link>
                      <Link href={`/productos/${prod.id}`} style={{ display: 'block', padding: '0.75rem 1rem', textDecoration: 'none', color: 'var(--pulpos-text)', fontSize: '0.9rem' }}>Editar</Link>
                      <button onClick={async () => {
                        if(confirm('¿Eliminar producto definitivamente?')) {
                          try {
                            await deleteProduct(prod.id);
                            setDisplayedProducts(displayedProducts.filter(p => p.id !== prod.id));
                          } catch (e: any) { alert("Error eliminando: " + e.message); }
                        }
                      }} style={{ width: '100%', display: 'block', padding: '0.75rem 1rem', border: 'none', background: 'none', color: '#ef4444', textAlign: 'left', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}>
                        Eliminar
                      </button>
                    </div>
                  )}
                </div>

                <Link href={`/productos/${prod.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ width: '100%', height: '180px', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid var(--pulpos-border)' }}>
                    {prod.imageUrl ? (
                      <img src={prod.imageUrl} alt={prod.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <ImageIcon size={48} color="#cbd5e1" />
                    )}
                  </div>
                  
                  <div style={{ padding: '1rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--pulpos-text-muted)', marginBottom: '0.25rem', fontFamily: 'monospace' }}>{prod.sku}</div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '0.5rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{prod.name}</h3>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <span style={{ fontSize: '1.25rem', fontWeight: '900', color: 'var(--pulpos-primary)' }}>{formatCurrency(prod.price)}</span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--pulpos-text-muted)' }}>Costo: {formatCurrency(prod.cost)}</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--pulpos-text-muted)' }}>{prod.category || 'General'}</span>
                      <span style={{ 
                        fontWeight: 'bold', 
                        color: prod.stock <= prod.minStock ? '#dc2626' : '#16a34a',
                        backgroundColor: prod.stock <= prod.minStock ? '#fee2e2' : '#dcfce7',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '6px'
                      }}>
                        {prod.stock} {prod.unit}
                      </span>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
               <thead>
                <tr style={{ borderBottom: '1px solid var(--pulpos-border)', backgroundColor: '#f9fafb' }}>
                  <th style={{ padding: '1rem', width: '60px' }}></th>
                  <th style={{ padding: '1rem', fontWeight: 'bold', color: 'var(--pulpos-text-muted)' }}>SKU</th>
                  <th style={{ padding: '1rem', fontWeight: 'bold', color: 'var(--pulpos-text-muted)' }}>Producto</th>
                  <th style={{ padding: '1rem', fontWeight: 'bold', color: 'var(--pulpos-text-muted)', textAlign: 'right' }}>Costo</th>
                  <th style={{ padding: '1rem', fontWeight: 'bold', color: 'var(--pulpos-text-muted)', textAlign: 'right' }}>Precio</th>
                  <th style={{ padding: '1rem', fontWeight: 'bold', color: 'var(--pulpos-text-muted)', textAlign: 'center' }}>Stock</th>
                  <th style={{ padding: '1rem', width: '50px' }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map(prod => (
                  <tr key={prod.id} style={{ borderBottom: '1px solid var(--pulpos-border)' }}>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ width: '48px', height: '48px', backgroundColor: '#f1f5f9', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', overflow: 'hidden' }}>
                        {prod.imageUrl ? <img src={prod.imageUrl} alt={prod.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <ImageIcon size={24} />}
                      </div>
                    </td>
                    <td style={{ padding: '1rem', fontWeight: '500', fontFamily: 'monospace', color: 'var(--pulpos-text-muted)' }}>{prod.sku}</td>
                    <td style={{ padding: '1rem' }}>
                      <Link href={`/productos/${prod.id}`} style={{ textDecoration: 'none', color: 'var(--pulpos-text)', fontWeight: 'bold', fontSize: '1.05rem' }}>
                        {prod.name}
                      </Link>
                      <div style={{ fontSize: '0.8rem', color: 'var(--pulpos-text-muted)', marginTop: '0.25rem' }}>{prod.category}</div>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right', color: 'var(--pulpos-text-muted)' }}>{formatCurrency(prod.cost)}</td>
                    <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--pulpos-primary)' }}>{formatCurrency(prod.price)}</td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <span style={{ 
                        fontWeight: 'bold', 
                        color: prod.stock <= prod.minStock ? '#dc2626' : '#16a34a',
                        backgroundColor: prod.stock <= prod.minStock ? '#fee2e2' : '#dcfce7',
                        padding: '0.35rem 0.75rem',
                        borderRadius: '8px',
                        fontSize: '0.9rem'
                      }}>
                        {prod.stock} {prod.unit}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center', position: 'relative' }}>
                      <button 
                        onClick={() => setOpenDropdownId(openDropdownId === prod.id ? null : prod.id)}
                        style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--pulpos-text-muted)' }}
                      >
                        <MoreVertical size={20} />
                      </button>
                      {openDropdownId === prod.id && (
                        <div style={{ position: 'absolute', right: '100%', top: '50%', transform: 'translateY(-50%)', backgroundColor: 'white', border: '1px solid var(--pulpos-border)', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 10, width: '150px', overflow: 'hidden' }}>
                          <Link href={`/productos/nuevo?cloneId=${prod.id}`} style={{ display: 'block', padding: '0.75rem 1rem', textDecoration: 'none', color: 'var(--pulpos-text)', textAlign: 'left' } as any}>Clonar</Link>
                          <Link href={`/productos/${prod.id}`} style={{ display: 'block', padding: '0.75rem 1rem', textDecoration: 'none', color: 'var(--pulpos-text)', textAlign: 'left' }}>Editar</Link>
                          <button onClick={async () => {
                            if(confirm('¿Eliminar producto definitivamente?')) {
                              try {
                                await deleteProduct(prod.id);
                                setDisplayedProducts(displayedProducts.filter(p => p.id !== prod.id));
                              } catch (e: any) { alert("Error eliminando: " + e.message); }
                            }
                          }} style={{ width: '100%', display: 'block', padding: '0.75rem 1rem', border: 'none', background: 'none', color: '#ef4444', textAlign: 'left', cursor: 'pointer', fontWeight: 'bold' }}>
                            Eliminar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
