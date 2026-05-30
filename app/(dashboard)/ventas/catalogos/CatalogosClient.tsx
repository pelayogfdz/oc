'use client';

import { useState, useEffect } from 'react';
import { 
  BookOpen, Sparkles, Search, Check, FolderHeart, 
  ArrowRight, Tag, Eye, FileUp, Filter, RefreshCw
} from 'lucide-react';
import { searchCatalogProducts } from '@/app/actions/catalog';

interface CatalogosClientProps {
  initialBrands: string[];
  initialCategories: string[];
}

export default function CatalogosClient({ initialBrands, initialCategories }: CatalogosClientProps) {
  const [activeTab, setActiveTab] = useState<'brands' | 'special' | 'promotions'>('brands');
  
  // Tab 1: Brands / Categories
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [limitBrands, setLimitBrands] = useState<number>(100);

  // Tab 2: Special Selection
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchBrand, setSearchBrand] = useState<string>('TODAS');
  const [searchCategory, setSearchCategory] = useState<string>('TODAS');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [foundProducts, setFoundProducts] = useState<any[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  // Tab 3: Promotions
  const [limitPromotions, setLimitPromotions] = useState<number>(100);

  // Load initial search in Tab 2
  useEffect(() => {
    handleSearch();
  }, [searchBrand, searchCategory]);

  const handleSearch = async () => {
    setIsSearching(true);
    try {
      const res = await searchCatalogProducts({
        query: searchQuery,
        brand: searchBrand,
        category: searchCategory,
        limit: 48
      });
      if (res.success) {
        setFoundProducts(res.products || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  const toggleBrandSelection = (brand: string) => {
    setSelectedBrands(prev => 
      prev.includes(brand) ? prev.filter(b => b !== brand) : [...prev, brand]
    );
  };

  const toggleCategorySelection = (cat: string) => {
    setSelectedCategories(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const toggleProductSelection = (productId: string) => {
    setSelectedProductIds(prev => 
      prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]
    );
  };

  const clearSelection = () => {
    setSelectedProductIds([]);
  };

  const handleGenerateBrandsCatalog = () => {
    const brandsQuery = selectedBrands.join(',');
    const catsQuery = selectedCategories.join(',');
    window.open(`/ventas/catalogos/imprimir?type=brands&brands=${encodeURIComponent(brandsQuery)}&categories=${encodeURIComponent(catsQuery)}&limit=${limitBrands}`, '_blank');
  };

  const handleGenerateSpecialCatalog = () => {
    if (selectedProductIds.length === 0) return;
    const idsQuery = selectedProductIds.join(',');
    window.open(`/ventas/catalogos/imprimir?type=special&ids=${encodeURIComponent(idsQuery)}`, '_blank');
  };

  const handleGeneratePromotionsCatalog = () => {
    window.open(`/ventas/catalogos/imprimir?type=promotions&limit=${limitPromotions}`, '_blank');
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '6rem' }}>
      
      {/* Header Cards with HSL gradients */}
      <div style={{
        background: 'linear-gradient(135deg, #6d28d9 0%, #db2777 100%)',
        padding: '2.5rem',
        borderRadius: '16px',
        color: 'white',
        boxShadow: '0 10px 25px -5px rgba(109, 40, 217, 0.3)',
        marginBottom: '2rem',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'relative', zIndex: 2 }}>
          <h2 style={{ fontSize: '2rem', fontWeight: '800', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <BookOpen size={32} /> Creador de Catálogos Creativos
          </h2>
          <p style={{ margin: 0, opacity: 0.9, fontSize: '1.05rem', maxWidth: '700px' }}>
            Genera al instante hermosos catálogos editoriales listos para exportar a PDF o imprimir, con imágenes en alta resolución, organizados por marcas comerciales o promociones en oferta.
          </p>
        </div>
        
        {/* Background Sparkles */}
        <div style={{ position: 'absolute', top: '10%', right: '5%', opacity: 0.15 }}>
          <Sparkles size={120} />
        </div>
      </div>

      {/* Modern Tabs */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        backgroundColor: '#f1f5f9',
        padding: '0.35rem',
        borderRadius: '12px',
        marginBottom: '2rem',
        border: '1px solid #e2e8f0'
      }}>
        <button 
          onClick={() => setActiveTab('brands')}
          style={{
            flex: 1,
            padding: '1rem',
            borderRadius: '8px',
            border: 'none',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            fontSize: '0.95rem',
            backgroundColor: activeTab === 'brands' ? 'white' : 'transparent',
            color: activeTab === 'brands' ? '#6d28d9' : '#64748b',
            boxShadow: activeTab === 'brands' ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
            transition: 'all 0.2s'
          }}
        >
          <FolderHeart size={18} /> Catálogo por Marcas
        </button>
        <button 
          onClick={() => setActiveTab('special')}
          style={{
            flex: 1,
            padding: '1rem',
            borderRadius: '8px',
            border: 'none',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            fontSize: '0.95rem',
            backgroundColor: activeTab === 'special' ? 'white' : 'transparent',
            color: activeTab === 'special' ? '#6d28d9' : '#64748b',
            boxShadow: activeTab === 'special' ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
            transition: 'all 0.2s'
          }}
        >
          <Sparkles size={18} /> Selección Especial
        </button>
        <button 
          onClick={() => setActiveTab('promotions')}
          style={{
            flex: 1,
            padding: '1rem',
            borderRadius: '8px',
            border: 'none',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            fontSize: '0.95rem',
            backgroundColor: activeTab === 'promotions' ? 'white' : 'transparent',
            color: activeTab === 'promotions' ? '#6d28d9' : '#64748b',
            boxShadow: activeTab === 'promotions' ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
            transition: 'all 0.2s'
          }}
        >
          <Tag size={18} /> Catálogo de Promociones
        </button>
      </div>

      {/* Tab Panels */}
      <div className="card" style={{ padding: '2rem', minHeight: '300px' }}>
        
        {/* PANEL 1: BY BRANDS */}
        {activeTab === 'brands' && (
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              📁 Configurar Catálogo por Marcas y Categorías
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.95rem', marginBottom: '2rem' }}>
              Selecciona las marcas y categorías que deseas incluir. El catálogo PDF agrupará automáticamente tus productos de manera creativa con portadas de sección y un diseño editorial profesional.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2.5rem' }}>
              {/* Brands Selectors */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>
                    Marcas Disponibles ({initialBrands.length})
                  </span>
                  <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.75rem' }}>
                    <button 
                      type="button" 
                      onClick={() => setSelectedBrands(initialBrands)}
                      style={{ background: 'none', border: 'none', color: '#7c3aed', cursor: 'pointer', padding: 0, fontWeight: 'bold' }}
                    >
                      Todos
                    </button>
                    <span style={{ color: '#cbd5e1' }}>|</span>
                    <button 
                      type="button" 
                      onClick={() => setSelectedBrands([])}
                      style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0 }}
                    >
                      Ninguno
                    </button>
                  </div>
                </div>
                <div style={{
                  maxHeight: '220px',
                  overflowY: 'auto',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem',
                  backgroundColor: '#f8fafc'
                }}>
                  {initialBrands.map(brand => {
                    const isSelected = selectedBrands.includes(brand);
                    return (
                      <div 
                        key={brand} 
                        onClick={() => toggleBrandSelection(brand)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '0.5rem 0.75rem',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          backgroundColor: isSelected ? '#f5f3ff' : 'white',
                          border: isSelected ? '1px solid #a78bfa' : '1px solid #e2e8f0',
                          transition: 'all 0.15s'
                        }}
                      >
                        <div style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '4px',
                          border: isSelected ? 'none' : '1px solid #cbd5e1',
                          backgroundColor: isSelected ? '#7c3aed' : 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white'
                        }}>
                          {isSelected && <Check size={12} strokeWidth={3} />}
                        </div>
                        <span style={{ fontSize: '0.85rem', fontWeight: isSelected ? '600' : 'normal', color: isSelected ? '#5b21b6' : '#334155' }}>
                          {brand}
                        </span>
                      </div>
                    );
                  })}
                  {initialBrands.length === 0 && (
                    <span style={{ fontSize: '0.85rem', color: '#94a3b8', textAlign: 'center', padding: '1.5rem' }}>
                      No se encontraron marcas de productos activos.
                    </span>
                  )}
                </div>
              </div>

              {/* Categories Selectors */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>
                    Categorías Disponibles ({initialCategories.length})
                  </span>
                  <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.75rem' }}>
                    <button 
                      type="button" 
                      onClick={() => setSelectedCategories(initialCategories)}
                      style={{ background: 'none', border: 'none', color: '#7c3aed', cursor: 'pointer', padding: 0, fontWeight: 'bold' }}
                    >
                      Todas
                    </button>
                    <span style={{ color: '#cbd5e1' }}>|</span>
                    <button 
                      type="button" 
                      onClick={() => setSelectedCategories([])}
                      style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0 }}
                    >
                      Ninguna
                    </button>
                  </div>
                </div>
                <div style={{
                  maxHeight: '220px',
                  overflowY: 'auto',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem',
                  backgroundColor: '#f8fafc'
                }}>
                  {initialCategories.map(cat => {
                    const isSelected = selectedCategories.includes(cat);
                    return (
                      <div 
                        key={cat} 
                        onClick={() => toggleCategorySelection(cat)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '0.5rem 0.75rem',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          backgroundColor: isSelected ? '#f5f3ff' : 'white',
                          border: isSelected ? '1px solid #a78bfa' : '1px solid #e2e8f0',
                          transition: 'all 0.15s'
                        }}
                      >
                        <div style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '4px',
                          border: isSelected ? 'none' : '1px solid #cbd5e1',
                          backgroundColor: isSelected ? '#7c3aed' : 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white'
                        }}>
                          {isSelected && <Check size={12} strokeWidth={3} />}
                        </div>
                        <span style={{ fontSize: '0.85rem', fontWeight: isSelected ? '600' : 'normal', color: isSelected ? '#5b21b6' : '#334155' }}>
                          {cat}
                        </span>
                      </div>
                    );
                  })}
                  {initialCategories.length === 0 && (
                    <span style={{ fontSize: '0.85rem', color: '#94a3b8', textAlign: 'center', padding: '1.5rem' }}>
                      No se encontraron categorías.
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Print Settings Row */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1.25rem',
              backgroundColor: '#f8fafc',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              marginBottom: '2rem'
            }}>
              <div>
                <span style={{ fontSize: '0.95rem', fontWeight: 'bold', display: 'block', color: '#1e293b' }}>
                  Límite de Artículos a Mostrar
                </span>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Máximo de productos a exportar para asegurar la velocidad y calidad del PDF.
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input 
                  type="number" 
                  value={limitBrands}
                  onChange={(e) => setLimitBrands(Math.max(5, Math.min(500, parseInt(e.target.value) || 100)))}
                  style={{
                    width: '90px',
                    padding: '0.5rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    fontSize: '1rem'
                  }}
                />
                <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 'bold' }}>artículos</span>
              </div>
            </div>

            <button 
              onClick={handleGenerateBrandsCatalog}
              style={{
                background: 'linear-gradient(135deg, #7c3aed 0%, #db2777 100%)',
                color: 'white',
                border: 'none',
                padding: '1rem 2.5rem',
                borderRadius: '8px',
                fontWeight: 'bold',
                fontSize: '1.05rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                boxShadow: '0 4px 15px rgba(124, 58, 237, 0.25)',
                marginLeft: 'auto',
                transition: 'all 0.2s'
              }}
            >
              <Eye size={20} /> Generar Catálogo por Marcas (PDF)
            </button>
          </div>
        )}

        {/* PANEL 2: SPECIAL SELECTION */}
        {activeTab === 'special' && (
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              ✨ Catálogo de Selección Especial
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
              Busca y selecciona artículos manualmente para armar una propuesta a la medida de tu cliente. Puedes navegar entre marcas y categorías libremente; los artículos seleccionados se conservarán.
            </p>

            {/* Search Filter Bar */}
            <div style={{
              display: 'flex',
              gap: '1rem',
              marginBottom: '2rem',
              flexWrap: 'wrap'
            }}>
              {/* Search text */}
              <div style={{ flex: 2, minWidth: '250px', position: 'relative' }}>
                <Search size={18} color="#64748b" style={{ position: 'absolute', left: '12px', top: '14px' }} />
                <input 
                  type="text" 
                  placeholder="Buscar por nombre, SKU o código..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem 0.75rem 2.5rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.95rem'
                  }}
                />
              </div>

              {/* Brand Filter */}
              <div style={{ flex: 1, minWidth: '150px' }}>
                <select 
                  value={searchBrand}
                  onChange={(e) => setSearchBrand(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.95rem',
                    backgroundColor: 'white'
                  }}
                >
                  <option value="TODAS">Marca: Todas</option>
                  {initialBrands.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              {/* Category Filter */}
              <div style={{ flex: 1, minWidth: '150px' }}>
                <select 
                  value={searchCategory}
                  onChange={(e) => setSearchCategory(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.95rem',
                    backgroundColor: 'white'
                  }}
                >
                  <option value="TODAS">Categoría: Todas</option>
                  {initialCategories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <button 
                onClick={handleSearch}
                disabled={isSearching}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#7c3aed',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  opacity: isSearching ? 0.7 : 1
                }}
              >
                {isSearching ? <RefreshCw className="animate-spin" size={18} /> : <Filter size={18} />} Buscar
              </button>
            </div>

            {/* Results Header and Bulk Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', backgroundColor: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 'bold' }}>
                Resultados Encontrados ({foundProducts.length})
              </span>
              {foundProducts.length > 0 && (
                <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.8rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      const allIds = foundProducts.map(p => p.id);
                      setSelectedProductIds(prev => {
                        const newSelection = [...prev];
                        allIds.forEach(id => {
                          if (!newSelection.includes(id)) newSelection.push(id);
                        });
                        return newSelection;
                      });
                    }}
                    style={{ background: 'none', border: 'none', color: '#7c3aed', cursor: 'pointer', fontWeight: 'bold', padding: 0 }}
                  >
                    ☑️ Seleccionar Todos
                  </button>
                  <span style={{ color: '#cbd5e1' }}>|</span>
                  <button
                    type="button"
                    onClick={() => {
                      const allIds = foundProducts.map(p => p.id);
                      setSelectedProductIds(prev => prev.filter(id => !allIds.includes(id)));
                    }}
                    style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0 }}
                  >
                    ☒ Deseleccionar
                  </button>
                </div>
              )}
            </div>

            {/* Results Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: '1rem',
              maxHeight: '450px',
              overflowY: 'auto',
              padding: '0.25rem',
              marginBottom: '2rem'
            }}>
              {foundProducts.map(p => {
                const isSelected = selectedProductIds.includes(p.id);
                return (
                  <div 
                    key={p.id}
                    onClick={() => toggleProductSelection(p.id)}
                    style={{
                      border: isSelected ? '2px solid #7c3aed' : '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '1rem',
                      cursor: 'pointer',
                      backgroundColor: isSelected ? '#f5f3ff' : 'white',
                      transition: 'all 0.15s',
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      minHeight: '160px',
                      boxShadow: isSelected ? '0 4px 12px rgba(124,58,237,0.1)' : '0 2px 4px rgba(0,0,0,0.02)'
                    }}
                  >
                    {/* Checkbox badge */}
                    <div style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      border: isSelected ? 'none' : '2px solid #cbd5e1',
                      backgroundColor: isSelected ? '#7c3aed' : 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      zIndex: 2
                    }}>
                      {isSelected && <Check size={12} strokeWidth={4} />}
                    </div>

                    <div>
                      {/* Brand Tag */}
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 'bold',
                        color: isSelected ? '#6d28d9' : '#94a3b8',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        {p.brand || 'SIN MARCA'}
                      </span>
                      {/* Name */}
                      <h4 style={{
                        fontSize: '0.85rem',
                        fontWeight: '700',
                        margin: '0.25rem 0',
                        color: '#1e293b',
                        lineHeight: '1.3',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }} title={p.name}>
                        {p.name}
                      </h4>
                      {/* SKU */}
                      <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>
                        SKU: {p.sku}
                      </span>
                    </div>

                    <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        Stock: {p.stock} pzas
                      </span>
                      <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#0f172a' }}>
                        ${p.price.toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })}

              {foundProducts.length === 0 && !isSearching && (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem 0', color: '#94a3b8' }}>
                  <Search size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                  Ningún producto coincide con la búsqueda. Intenta otros filtros.
                </div>
              )}
            </div>

            {/* Selection Status Bar */}
            {selectedProductIds.length > 0 && (
              <div style={{
                position: 'fixed',
                bottom: '2rem',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: '#0f172a',
                color: 'white',
                padding: '1rem 2rem',
                borderRadius: '50px',
                display: 'flex',
                alignItems: 'center',
                gap: '2rem',
                boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                zIndex: 100,
                border: '1px solid #334155',
                animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
              }}>
                <style dangerouslySetInnerHTML={{__html: `
                  @keyframes slideUp {
                    from { transform: translate(-50%, 100px); opacity: 0; }
                    to { transform: translate(-50%, 0); opacity: 1; }
                  }
                `}} />
                <div>
                  <span style={{ fontSize: '0.95rem', fontWeight: 'bold', display: 'block' }}>
                    💼 Creador Especial Activo
                  </span>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                    {selectedProductIds.length} artículos agregados al catálogo
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button 
                    onClick={clearSelection}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '0.85rem',
                      padding: '0.5rem 1rem'
                    }}
                  >
                    Limpiar Todo
                  </button>
                  <button 
                    onClick={handleGenerateSpecialCatalog}
                    style={{
                      background: 'linear-gradient(135deg, #7c3aed 0%, #db2777 100%)',
                      color: 'white',
                      border: 'none',
                      padding: '0.6rem 1.5rem',
                      borderRadius: '50px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.85rem'
                    }}
                  >
                    Generar Catálogo ({selectedProductIds.length}) <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PANEL 3: PROMOTIONS */}
        {activeTab === 'promotions' && (
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              🏷️ Catálogo de Artículos de Promoción y Ofertas
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.95rem', marginBottom: '2rem' }}>
              Este catálogo recopila y destaca de manera automática todos los productos de tu inventario que tienen un **Precio Especial (specialPrice)** activo.
              El diseño de este catálogo es de alto impacto, con sellos promocionales llamativos en color rojo y oro, y con los precios anteriores tachados.
            </p>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1.25rem',
              backgroundColor: '#fffbeb',
              borderRadius: '12px',
              border: '1px solid #fef3c7',
              marginBottom: '2.5rem'
            }}>
              <div>
                <span style={{ fontSize: '0.95rem', fontWeight: 'bold', display: 'block', color: '#b45309' }}>
                  ⚡ Configuración de Límite de Ofertas
                </span>
                <span style={{ fontSize: '0.8rem', color: '#d97706' }}>
                  Límite de productos en promoción a incluir para asegurar una impresión rápida en PDF.
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input 
                  type="number" 
                  value={limitPromotions}
                  onChange={(e) => setLimitPromotions(Math.max(5, Math.min(500, parseInt(e.target.value) || 100)))}
                  style={{
                    width: '90px',
                    padding: '0.5rem',
                    borderRadius: '6px',
                    border: '1px solid #fcd34d',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    fontSize: '1rem',
                    backgroundColor: 'white'
                  }}
                />
                <span style={{ fontSize: '0.85rem', color: '#b45309', fontWeight: 'bold' }}>artículos</span>
              </div>
            </div>

            <button 
              onClick={handleGeneratePromotionsCatalog}
              style={{
                background: 'linear-gradient(135deg, #ea580c 0%, #db2777 100%)',
                color: 'white',
                border: 'none',
                padding: '1rem 2.5rem',
                borderRadius: '8px',
                fontWeight: 'bold',
                fontSize: '1.05rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                boxShadow: '0 4px 15px rgba(234, 88, 12, 0.25)',
                marginLeft: 'auto',
                transition: 'all 0.2s'
              }}
            >
              <Eye size={20} /> Generar Catálogo de Ofertas (PDF)
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
