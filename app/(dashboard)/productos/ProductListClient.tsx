'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { Filter, MapPin, ArrowDownUp, Search, MoreVertical, Camera, Plus, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { searchProducts, deleteProduct } from '@/app/actions/product';
import ProductTableUI from '@/app/components/ProductTableUI';
import BarcodeScannerModal from '@/app/components/BarcodeScannerModal';
import ImportButton from './ImportButton';
import ExportButton from './ExportButton';

import { useOfflineSync } from '@/app/components/OfflineSyncProvider';

export default function ProductListClient({ initialProducts, branchId, categories }: { initialProducts: any[], branchId: string, categories: string[] }) {
  const { isOnline } = useOfflineSync();
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
  const [filterImage, setFilterImage] = useState('ALL');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const [isInitialized, setIsInitialized] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Load state from sessionStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const persistedSearch = sessionStorage.getItem('products_searchTerm');
      const persistedCategory = sessionStorage.getItem('products_filterCategory');
      const persistedStatus = sessionStorage.getItem('products_filterStatus');
      const persistedStock = sessionStorage.getItem('products_filterStock');
      const persistedImage = sessionStorage.getItem('products_filterImage');
      const persistedPage = sessionStorage.getItem('products_currentPage');
      const persistedPageSize = sessionStorage.getItem('products_pageSize');

      if (persistedSearch !== null) setSearchTerm(persistedSearch);
      if (persistedCategory !== null) setFilterCategory(persistedCategory);
      if (persistedStatus !== null) setFilterStatus(persistedStatus);
      if (persistedStock !== null) setFilterStock(persistedStock);
      if (persistedImage !== null) setFilterImage(persistedImage);
      if (persistedPageSize !== null) setPageSize(Number(persistedPageSize));
      if (persistedPage !== null) setCurrentPage(Number(persistedPage));
      
      setIsInitialized(true);
    }
  }, []);

  // Save state to sessionStorage when changes occur
  useEffect(() => {
    if (isInitialized && typeof window !== 'undefined') {
      sessionStorage.setItem('products_searchTerm', searchTerm);
      sessionStorage.setItem('products_filterCategory', filterCategory);
      sessionStorage.setItem('products_filterStatus', filterStatus);
      sessionStorage.setItem('products_filterStock', filterStock);
      sessionStorage.setItem('products_filterImage', filterImage);
      sessionStorage.setItem('products_currentPage', String(currentPage));
      sessionStorage.setItem('products_pageSize', String(pageSize));
    }
  }, [searchTerm, filterCategory, filterStatus, filterStock, filterImage, currentPage, pageSize, isInitialized]);

  useEffect(() => {
    setDisplayedProducts(initialProducts);
  }, [initialProducts]);

  // Load products from IndexedDB if offline on mount or connection changes
  useEffect(() => {
    const loadOfflineProducts = async () => {
      if (typeof window !== 'undefined' && !isOnline) {
        try {
          const { db } = await import('@/lib/offlineDB');
          const localProducts = await db.products.toArray();
          setDisplayedProducts(localProducts);
        } catch (err) {
          console.error('[Offline] Failed to load local products:', err);
        }
      }
    };
    loadOfflineProducts();
  }, [isOnline]);

  useEffect(() => {
    if (!isInitialized) return;

    // Prevent searching on mount when searchTerm is empty (initialProducts is already loaded)
    if (searchTerm === '' && !hasSearched) {
      if (!isOnline) {
        import('@/lib/offlineDB').then(async ({ db }) => {
          const localProducts = await db.products.toArray();
          setDisplayedProducts(localProducts);
        });
      }
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        if (isOnline) {
          const results = await searchProducts(searchTerm, branchId);
          setDisplayedProducts(results);
        } else {
          // Offline search! Filter Dexie database
          const { db } = await import('@/lib/offlineDB');
          const term = searchTerm.toLowerCase().trim();
          const results = await db.products.filter(p => {
            const nameMatch = p.name.toLowerCase().includes(term);
            const skuMatch = typeof p.sku === 'string' && p.sku.toLowerCase().includes(term);
            const barcodeMatch = typeof p.barcode === 'string' && p.barcode.toLowerCase().includes(term);
            return nameMatch || skuMatch || barcodeMatch;
          }).toArray();
          setDisplayedProducts(results);
        }
        setHasSearched(true);
      } catch (e) {
        console.error(e);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, branchId, isInitialized, hasSearched, isOnline]);

  const filteredProducts = useMemo(() => displayedProducts.filter(p => {
    if (filterCategory !== 'ALL' && p.category !== filterCategory) return false;
    
    // Status Filter
    if (filterStatus === 'ACTIVE' && p.status === 'INACTIVE') return false;
    if (filterStatus === 'INACTIVE' && p.status !== 'INACTIVE') return false;

    // Stock Filter
    if (filterStock !== 'ALL' && p.isService) return false;
    if (filterStock === 'IN_STOCK' && p.stock <= 0) return false;
    if (filterStock === 'OUT_OF_STOCK' && p.stock > 0) return false;
    if (filterStock === 'LOW_STOCK' && p.stock > (p.minStock || 0)) return false;

    // Image Filter
    if (filterImage === 'WITH_IMAGE' && (!p.imageUrl || p.imageUrl.trim() === '')) return false;
    if (filterImage === 'WITHOUT_IMAGE' && (p.imageUrl && p.imageUrl.trim() !== '')) return false;

    return true;
  }), [displayedProducts, filterCategory, filterStatus, filterStock, filterImage]);

  // Reset page when filters change (only AFTER initialization is complete)
  useEffect(() => {
    if (isInitialized) {
      setCurrentPage(1);
    }
  }, [searchTerm, filterCategory, filterStatus, filterStock, filterImage, isInitialized]);

  const totalPages = Math.ceil(filteredProducts.length / pageSize) || 1;
  const startRange = filteredProducts.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRange = Math.min(currentPage * pageSize, filteredProducts.length);

  const paginatedProducts = useMemo(() => {
    const skip = (currentPage - 1) * pageSize;
    return filteredProducts.slice(skip, skip + pageSize);
  }, [filteredProducts, currentPage, pageSize]);

  const handleToggleSelectAll = useCallback(() => {
    const currentPageIds = paginatedProducts.map(p => p.id);
    const allCurrentPageSelected = currentPageIds.every(id => selectedIds.includes(id));
    if (allCurrentPageSelected) {
      setSelectedIds(prev => prev.filter(id => !currentPageIds.includes(id)));
    } else {
      setSelectedIds(prev => {
        const next = [...prev];
        currentPageIds.forEach(id => {
          if (!next.includes(id)) next.push(id);
        });
        return next;
      });
    }
  }, [selectedIds, paginatedProducts]);

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
            if (!isOnline) {
              alert('No es posible eliminar productos en modo offline. Por favor, conéctate a internet para realizar esta acción.');
              return;
            }
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
      {/* Header section identical to Caanma */}
      <div className="page-header-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 className="page-header-title" style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>Productos e Inventario</h1>
        <div className="page-header-actions" style={{ display: 'flex', gap: '0.75rem' }}>
          <ImportButton />
          <ExportButton selectedIds={selectedIds} />
          <Link href="/productos/nuevo" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', padding: '0.5rem 1.5rem' }}>
            <Plus size={18} /> Nuevo Producto
          </Link>
        </div>
      </div>
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
                color: 'var(--caanma-primary)',
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
              {categories.map((cat: string) => (
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#64748b' }}>Filtrar por Imagen</label>
            <select value={filterImage} onChange={e => setFilterImage(e.target.value)} style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #e2e8f0', minWidth: '150px' }}>
              <option value="ALL">Con y sin imagen</option>
              <option value="WITH_IMAGE">Con imagen</option>
              <option value="WITHOUT_IMAGE">Sin imagen</option>
            </select>
          </div>
          <div style={{ flexGrow: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-end' }}>
             <button onClick={() => { setSearchTerm(''); setFilterCategory('ALL'); setFilterStatus('ACTIVE'); setFilterStock('ALL'); setFilterImage('ALL'); }} style={{ color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.9rem', fontWeight: '500' }}>
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
          products={paginatedProducts}
          showCheckboxes={true}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          onToggleSelectAll={handleToggleSelectAll}
          renderCustomActions={renderCustomActions}
        />

        {/* Premium Pagination Footer */}
        <div style={{ 
          marginTop: '1.5rem', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: '1rem',
          backgroundColor: '#f8fafc',
          padding: '0.75rem 1.25rem',
          borderRadius: '12px',
          border: '1px solid #e2e8f0'
        }}>
          {/* Left Side: Range Info */}
          <div style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: '500' }}>
            {filteredProducts.length === 0 ? (
              <span>Sin productos</span>
            ) : (
              <span>
                Mostrando <strong style={{ color: '#1e293b' }}>{startRange}</strong> a <strong style={{ color: '#1e293b' }}>{endRange}</strong> de <strong style={{ color: '#1e293b' }}>{filteredProducts.length}</strong> productos
              </span>
            )}
          </div>

          {/* Right Side: Page Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Page Size Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '500' }}>Mostrar:</span>
              <select 
                value={pageSize} 
                onChange={e => {
                  const val = e.target.value === 'ALL' ? filteredProducts.length : Number(e.target.value);
                  setPageSize(val);
                  setCurrentPage(1);
                }} 
                style={{ 
                  padding: '0.35rem 0.5rem', 
                  borderRadius: '6px', 
                  border: '1px solid #cbd5e1', 
                  fontSize: '0.85rem',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  fontWeight: '500',
                  color: '#334155'
                }}
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={150}>150</option>
                <option value={200}>200</option>
                <option value="ALL">Todos</option>
              </select>
            </div>

            {/* Navigation Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              {/* Go to First Page */}
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: 'white',
                  color: '#64748b',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  opacity: currentPage === 1 ? 0.4 : 1,
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => { if (currentPage !== 1) e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'white'; }}
                title="Primera Página"
              >
                <ChevronsLeft size={16} />
              </button>

              {/* Go to Previous Page */}
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: 'white',
                  color: '#64748b',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  opacity: currentPage === 1 ? 0.4 : 1,
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => { if (currentPage !== 1) e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'white'; }}
                title="Página Anterior"
              >
                <ChevronLeft size={16} />
              </button>

              {/* Page Number Indicator */}
              <span style={{ 
                fontSize: '0.9rem', 
                color: '#334155', 
                fontWeight: '600',
                padding: '0 0.5rem',
                minWidth: '95px',
                textAlign: 'center'
              }}>
                Pág. {currentPage} de {totalPages}
              </span>

              {/* Go to Next Page */}
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: 'white',
                  color: '#64748b',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  opacity: currentPage === totalPages ? 0.4 : 1,
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => { if (currentPage !== totalPages) e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'white'; }}
                title="Página Siguiente"
              >
                <ChevronRight size={16} />
              </button>

              {/* Go to Last Page */}
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: 'white',
                  color: '#64748b',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  opacity: currentPage === totalPages ? 0.4 : 1,
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => { if (currentPage !== totalPages) e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'white'; }}
                title="Última Página"
              >
                <ChevronsRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
