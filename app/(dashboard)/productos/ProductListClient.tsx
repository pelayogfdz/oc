'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Image as ImageIcon, MoreVertical, Filter } from 'lucide-react';
import { searchProducts, deleteProduct } from '@/app/actions/product';

export default function ProductListClient({ initialProducts, branchId }: { initialProducts: any[], branchId: string }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState('Todos');
  const [displayedProducts, setDisplayedProducts] = useState<any[]>(initialProducts);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

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

  return (
    <div className="card" style={{ padding: '0' }}>
      {/* Tabs style */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--pulpos-border)', padding: '0 1rem' }}>
        {['Todos', 'Activos', 'Inactivos', 'Bajo stock'].map((tab) => (
          <div key={tab} 
            onClick={() => setActiveTab(tab)}
            style={{ 
            padding: '1rem', 
            borderBottom: activeTab === tab ? '2px solid var(--pulpos-primary)' : '2px solid transparent',
            color: activeTab === tab ? 'var(--pulpos-primary)' : 'var(--pulpos-text-muted)',
            fontWeight: activeTab === tab ? '600' : '500',
            cursor: 'pointer'
          }}>
            {tab}
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '400px', position: 'relative' }}>
            <input 
              type="text" 
              placeholder="🔍 Buscar por nombre, SKU o código de barras" 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ padding: '0.5rem 1rem', width: '100%', borderRadius: '4px', border: '1px solid var(--pulpos-border)', backgroundColor: '#f8fafc' }}
            />
          </div>
          <button 
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: showAdvancedFilters ? '#eff6ff' : 'white', color: showAdvancedFilters ? 'var(--pulpos-primary)' : 'inherit', border: '1px solid', borderColor: showAdvancedFilters ? 'var(--pulpos-primary)' : 'var(--pulpos-border)', padding: '0.5rem 1rem', borderRadius: '4px', fontWeight: '500', cursor: 'pointer' }}>
            <Filter size={16} /> Filtros avanzados
          </button>
        </div>

        {/* Advanced Filters Panel */}
        {showAdvancedFilters && (
          <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '6px', display: 'flex', gap: '1.5rem', flexWrap: 'wrap', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--pulpos-text-muted)' }}>Tipo de Producto</label>
              <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)', minWidth: '150px' }}>
                <option value="ALL">Cualquiera</option>
                <option value="STANDARD">Producto (Standard)</option>
                <option value="SERVICE">Servicio (Sin control de stock)</option>
                <option value="KIT">Receta / Kit</option>
              </select>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--pulpos-text-muted)' }}>Métricas SAT (Facturación)</label>
              <select value={filterSat} onChange={e => setFilterSat(e.target.value)} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)', minWidth: '220px' }}>
                <option value="ALL">Mostrar Todos</option>
                <option value="MISSING_SAT">Falta Clave SAT o Unidad SAT</option>
                <option value="HAS_SAT">Configurados para CFDI 4.0</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--pulpos-text-muted)' }}>Código de Barras</label>
              <select value={filterBarcode} onChange={e => setFilterBarcode(e.target.value)} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)', minWidth: '180px' }}>
                <option value="ALL">Mostrar Todos</option>
                <option value="MISSING">Sin Código de Barras</option>
              </select>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--pulpos-text-muted)' }}>Categoría</label>
              <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)', minWidth: '150px' }}>
                <option value="ALL">Todas</option>
                {Array.from(new Set(initialProducts.map(p => p.category).filter(Boolean))).map((cat: any) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div style={{ flexGrow: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-end' }}>
               <button onClick={() => { setFilterType('ALL'); setFilterSat('ALL'); setFilterBarcode('ALL'); setFilterCategory('ALL'); }} style={{ color: 'var(--pulpos-text-muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.85rem' }}>
                 Limpiar Filtros
               </button>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div style={{ opacity: isSearching ? 0.5 : 1, transition: 'opacity 0.2s', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--pulpos-border)', backgroundColor: '#f9fafb' }}>
              <th style={{ padding: '1rem', width: '40px' }}><input type="checkbox" /></th>
              <th style={{ padding: '1rem', width: '60px' }}></th> {/* Img */}
              <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--pulpos-text-muted)' }}>SKU</th>
              <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--pulpos-text-muted)' }}>Detalles del Producto</th>
              <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--pulpos-text-muted)', textAlign: 'right' }}>Costo</th>
              <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--pulpos-text-muted)', textAlign: 'right' }}>Precio</th>
              <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--pulpos-text-muted)', textAlign: 'center' }}>Stock</th>
              <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--pulpos-text-muted)', textAlign: 'center' }}>Estado</th>
              <th style={{ padding: '1rem', width: '50px' }}></th>
            </tr>
          </thead>
          <tbody>
            {displayedProducts.filter(p => {
              // 1. Tab Filtering
              if (activeTab === 'Activos' && !p.isActive) return false;
              if (activeTab === 'Inactivos' && p.isActive) return false;
              if (activeTab === 'Bajo stock' && p.stock > p.minStock) return false;
              
              // 2. Type Filtering
              // If type field is not formally on product, standard is default
              const t = p.type || 'STANDARD';
              if (filterType !== 'ALL' && t !== filterType) return false;
              
              // 3. SAT Filtering
              if (filterSat === 'MISSING_SAT' && (p.satKey && p.satUnit)) return false;
              if (filterSat === 'HAS_SAT' && (!p.satKey || !p.satUnit)) return false;
              
              // 4. Barcode Filtering
              if (filterBarcode === 'MISSING' && p.barcode) return false;
              
              // 5. Category Filtering
              if (filterCategory !== 'ALL' && p.category !== filterCategory) return false;
              
              return true;
            }).map(prod => (
              <tr key={prod.id} style={{ borderBottom: '1px solid var(--pulpos-border)' }}>
                <td style={{ padding: '1rem' }}><input type="checkbox" /></td>
                <td style={{ padding: '1rem' }}>
                  <div style={{ width: '40px', height: '40px', backgroundColor: '#f1f5f9', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                    {prod.imageUrl ? <img src={prod.imageUrl} alt={prod.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' }} /> : <ImageIcon size={20} />}
                  </div>
                </td>
                <td style={{ padding: '1rem', fontWeight: '500' }}>
                  <div style={{ fontSize: '0.875rem' }}>{prod.sku}</div>
                  {prod.barcode && <div style={{ fontSize: '0.75rem', color: 'var(--pulpos-text-muted)' }}>{prod.barcode}</div>}
                </td>
                <td style={{ padding: '1rem' }}>
                  <Link href={`/productos/${prod.id}`} style={{ textDecoration: 'none', color: 'var(--pulpos-primary)', fontWeight: 'bold' }}>
                    {prod.name}
                  </Link>
                  <div style={{ fontSize: '0.75rem', color: 'var(--pulpos-text-muted)', marginTop: '0.25rem', display: 'flex', gap: '0.5rem' }}>
                    <span>{prod.category || 'Sin categoría'}</span>
                    {prod.brand && <span>• {prod.brand}</span>}
                  </div>
                </td>
                <td style={{ padding: '1rem', textAlign: 'right', color: 'var(--pulpos-text-muted)' }}>${prod.cost.toFixed(2)}</td>
                <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold' }}>${prod.price.toFixed(2)}</td>
                <td style={{ padding: '1rem', textAlign: 'center' }}>
                  <div style={{ color: prod.stock <= prod.minStock ? '#dc2626' : 'inherit', fontWeight: '500' }}>
                    {prod.stock} <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--pulpos-text-muted)' }}>{prod.unit}</span>
                  </div>
                </td>
                <td style={{ padding: '1rem', textAlign: 'center' }}>
                   {prod.isActive ? (
                     <span style={{ fontSize: '0.75rem', fontWeight: 'bold', padding: '0.25rem 0.5rem', backgroundColor: '#dcfce7', color: '#166534', borderRadius: '12px' }}>Activo</span>
                   ) : (
                     <span style={{ fontSize: '0.75rem', fontWeight: 'bold', padding: '0.25rem 0.5rem', backgroundColor: '#f1f5f9', color: '#475569', borderRadius: '12px' }}>Inactivo</span>
                   )}
                </td>
                <td style={{ padding: '1rem', textAlign: 'center', position: 'relative' }}>
                  <button 
                    onClick={() => setOpenDropdownId(openDropdownId === prod.id ? null : prod.id)}
                    style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--pulpos-text-muted)' }}
                  >
                    <MoreVertical size={20} />
                  </button>
                  {openDropdownId === prod.id && (
                    <div style={{ position: 'absolute', right: '100%', top: '50%', transform: 'translateY(-50%)', backgroundColor: 'white', border: '1px solid var(--pulpos-border)', borderRadius: '6px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', zIndex: 10, width: '150px', overflow: 'hidden' }}>
                      <Link href={`/productos/nuevo?cloneId=${prod.id}`} style={{ display: 'block', padding: '0.75rem 1rem', textDecoration: 'none', color: 'var(--pulpos-text)', textAlign: 'left', ':hover': { backgroundColor: '#f8fafc' } } as any}>
                        Clonar
                      </Link>
                      <Link href={`/productos/${prod.id}`} style={{ display: 'block', padding: '0.75rem 1rem', textDecoration: 'none', color: 'var(--pulpos-text)', textAlign: 'left' }}>
                        Editar
                      </Link>
                      <button onClick={async () => {
                        if(confirm('¿Eliminar producto definitivamente?')) {
                          try {
                            await deleteProduct(prod.id);
                            setDisplayedProducts(displayedProducts.filter(p => p.id !== prod.id));
                          } catch (e: any) {
                            alert("Error eliminando: " + e.message);
                          }
                        }
                      }} style={{ width: '100%', display: 'block', padding: '0.75rem 1rem', border: 'none', background: 'none', color: '#ef4444', textAlign: 'left', cursor: 'pointer', fontWeight: 'bold' }}>
                        Eliminar
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {displayedProducts.length === 0 && !isSearching && (
              <tr>
                <td colSpan={9} style={{ padding: '4rem', textAlign: 'center', color: 'var(--pulpos-text-muted)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <ImageIcon size={48} color="#cbd5e1" />
                    <p style={{ fontSize: '1.1rem', fontWeight: '500' }}>No se encontraron productos en la Búsqueda.</p>
                  </div>
                </td>
              </tr>
            )}
            {isSearching && displayedProducts.length === 0 && (
              <tr>
                <td colSpan={9} style={{ padding: '4rem', textAlign: 'center', color: 'var(--pulpos-text-muted)' }}>
                  Buscando en servidor...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      <div style={{ padding: '1rem', backgroundColor: '#f9fafb', borderTop: '1px solid var(--pulpos-border)', color: 'var(--pulpos-text-muted)', fontSize: '0.875rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>Mostrando hasta 50 artículos (Búsqueda en Live Database)</div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button disabled style={{ border: 'none', background: 'none', cursor: 'not-allowed', color: 'var(--pulpos-text-disabled)' }}>Anterior</button>
          <button disabled style={{ border: 'none', background: 'none', cursor: 'not-allowed', color: 'var(--pulpos-text-disabled)', fontWeight: '600' }}>Siguiente</button>
        </div>
      </div>
    </div>
  );
}
