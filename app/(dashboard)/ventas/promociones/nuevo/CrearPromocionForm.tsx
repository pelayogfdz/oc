'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createPromotion } from '@/app/actions/promotion';
import { searchProducts } from '@/app/actions/product';
import { Calendar, Tag, CheckSquare, Square, ShoppingBag, Folder, Award, Settings } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  sku: string;
  brand: string | null;
  category: string | null;
}

interface BranchOption {
  id: string;
  name: string;
}

interface PriceListOption {
  id: string;
  name: string;
  branchId: string;
}

interface CrearPromocionFormProps {
  products: Product[];
  branchId: string;
  categories: string[];
  brands: string[];
  activeBranches: BranchOption[];
  priceLists: PriceListOption[];
}

export default function CrearPromocionForm({ products, branchId, categories, brands, activeBranches, priceLists }: CrearPromocionFormProps) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [type, setType] = useState('PERCENTAGE'); // PERCENTAGE, FIXED_AMOUNT, BOGO
  const [value, setValue] = useState<number>(0);
  
  // BOGO configuration
  const [payQty, setPayQty] = useState<number>(2);
  const [receiveQty, setReceiveQty] = useState<number>(3);

  // Validity
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Target segments
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);

  const [selectedBranches, setSelectedBranches] = useState<string[]>(
    branchId === 'GLOBAL' ? activeBranches.map(b => b.id) : [branchId]
  );
  const [selectedPriceLists, setSelectedPriceLists] = useState<string[]>(['price']);

  const uniquePriceListNames = Array.from(new Set(priceLists.map(pl => pl.name)));

  // Search filter for products
  const [productSearch, setProductSearch] = useState('');
  const [productList, setProductList] = useState<Product[]>(products);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchProducts(productSearch, branchId);
        const formatted = results.map(p => ({
          id: p.id,
          name: p.name,
          sku: p.sku || '',
          brand: p.brand,
          category: p.category
        }));
        
        setProductList(prev => {
          const selected = prev.filter(p => selectedProducts.includes(p.id));
          const newItems = formatted.filter(p => !selected.some(x => x.id === p.id));
          return [...selected, ...newItems];
        });
      } catch (err) {
        console.error("Error searching products:", err);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [productSearch, branchId, selectedProducts]);

  const filteredProducts = productList.filter(p => {
    const isSelected = selectedProducts.includes(p.id);
    if (isSelected) return true;
    const matchesSearch = p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(productSearch.toLowerCase()));
    return matchesSearch;
  });

  const handleToggleProduct = (id: string) => {
    setSelectedProducts(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleToggleCategory = (cat: string) => {
    setSelectedCategories(prev => 
      prev.includes(cat) ? prev.filter(x => x !== cat) : [...prev, cat]
    );
  };

  const handleToggleBrand = (brand: string) => {
    setSelectedBrands(prev => 
      prev.includes(brand) ? prev.filter(x => x !== brand) : [...prev, brand]
    );
  };

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Por favor, ingresa el nombre de la promoción.');
      return;
    }

    if (selectedBranches.length === 0) {
      alert('Por favor, selecciona al menos una sucursal.');
      return;
    }

    if (selectedPriceLists.length === 0) {
      alert('Por favor, selecciona al menos una lista de precios.');
      return;
    }

    setLoading(true);
    try {
      const metadata = {
        startDate: startDate ? new Date(startDate + 'T00:00:00') : null,
        endDate: endDate ? new Date(endDate + 'T23:59:59') : null,
        targetProducts: selectedProducts,
        targetCategories: selectedCategories,
        targetBrands: selectedBrands,
        targetBranches: selectedBranches,
        targetPriceLists: selectedPriceLists,
        payQty: type === 'BOGO' ? Number(payQty) : null,
        receiveQty: type === 'BOGO' ? Number(receiveQty) : null,
      };

      const finalValue = type === 'BOGO' ? 0 : Number(value);
      await createPromotion(name, type, finalValue, JSON.stringify(metadata));
      
      router.push('/ventas/promociones');
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Error al crear la promoción.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Basic Configuration Card */}
      <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: '0 0 0.5rem 0', color: 'var(--caanma-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Settings size={20} /> Datos Básicos de la Promoción
        </h3>

        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#334155' }}>Nombre de la Promoción *</label>
          <input
            type="text"
            required
            placeholder="Ej. Buen Fin - Zapatos, Promoción 3x2 en Tintas"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--caanma-border)', fontSize: '1.05rem', outline: 'none' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#334155' }}>Tipo de Promoción</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--caanma-border)', backgroundColor: 'white', outline: 'none', height: '45px' }}
            >
              <option value="PERCENTAGE">Porcentaje (%)</option>
              <option value="FIXED_AMOUNT">Monto Fijo de Descuento ($)</option>
              <option value="BOGO">Paga tanto y recibe tantos (3x2, 2x1, etc.)</option>
            </select>
          </div>

          <div>
            {type === 'BOGO' ? (
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#334155' }}>Paga Qty *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={payQty}
                    onChange={(e) => setPayQty(parseInt(e.target.value) || 1)}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--caanma-border)', outline: 'none' }}
                  />
                </div>
                <div style={{ alignSelf: 'flex-end', paddingBottom: '0.75rem', fontWeight: 'bold', fontSize: '1.25rem' }}>x</div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#334155' }}>Recibe Qty *</label>
                  <input
                    type="number"
                    min="2"
                    required
                    value={receiveQty}
                    onChange={(e) => setReceiveQty(parseInt(e.target.value) || 2)}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--caanma-border)', outline: 'none' }}
                  />
                </div>
              </div>
            ) : (
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#334155' }}>
                  {type === 'PERCENTAGE' ? 'Porcentaje de Descuento (%) *' : 'Monto de Descuento ($) *'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="Ej. 10"
                  value={value}
                  onChange={(e) => setValue(parseFloat(e.target.value) || 0)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--caanma-border)', outline: 'none' }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Branch Selection Section */}
        <div style={{ borderTop: '1px solid var(--caanma-border)', paddingTop: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 'bold', color: '#334155' }}>Sucursales que Aplica *</label>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', border: '1px solid var(--caanma-border)', padding: '1rem', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
            {activeBranches.map(b => (
              <label key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', userSelect: 'none', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
                <input
                  type="checkbox"
                  checked={selectedBranches.includes(b.id)}
                  onChange={() => {
                    setSelectedBranches(prev =>
                      prev.includes(b.id) ? prev.filter(id => id !== b.id) : [...prev, b.id]
                    );
                  }}
                  style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                />
                <span style={{ fontSize: '0.95rem', color: '#1e293b', fontWeight: selectedBranches.includes(b.id) ? '600' : 'normal' }}>{b.name}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Price List Selection Section */}
        <div style={{ borderTop: '1px solid var(--caanma-border)', paddingTop: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 'bold', color: '#334155' }}>Lista de Precios a la que Aplica *</label>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', border: '1px solid var(--caanma-border)', padding: '1rem', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', userSelect: 'none', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
              <input
                type="checkbox"
                checked={selectedPriceLists.includes('price')}
                onChange={() => {
                  setSelectedPriceLists(prev =>
                    prev.includes('price') ? prev.filter(x => x !== 'price') : [...prev, 'price']
                  );
                }}
                style={{ cursor: 'pointer', width: '16px', height: '16px' }}
              />
              <span style={{ fontSize: '0.95rem', color: '#1e293b', fontWeight: selectedPriceLists.includes('price') ? '600' : 'normal' }}>Precio Público</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', userSelect: 'none', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
              <input
                type="checkbox"
                checked={selectedPriceLists.includes('wholesalePrice')}
                onChange={() => {
                  setSelectedPriceLists(prev =>
                    prev.includes('wholesalePrice') ? prev.filter(x => x !== 'wholesalePrice') : [...prev, 'wholesalePrice']
                  );
                }}
                style={{ cursor: 'pointer', width: '16px', height: '16px' }}
              />
              <span style={{ fontSize: '0.95rem', color: '#1e293b', fontWeight: selectedPriceLists.includes('wholesalePrice') ? '600' : 'normal' }}>Precio Mayoreo</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', userSelect: 'none', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
              <input
                type="checkbox"
                checked={selectedPriceLists.includes('specialPrice')}
                onChange={() => {
                  setSelectedPriceLists(prev =>
                    prev.includes('specialPrice') ? prev.filter(x => x !== 'specialPrice') : [...prev, 'specialPrice']
                  );
                }}
                style={{ cursor: 'pointer', width: '16px', height: '16px' }}
              />
              <span style={{ fontSize: '0.95rem', color: '#1e293b', fontWeight: selectedPriceLists.includes('specialPrice') ? '600' : 'normal' }}>Precio Especial</span>
            </label>
            {uniquePriceListNames.map(name => {
              const val = `dynamicName:${name}`;
              const isChecked = selectedPriceLists.includes(val);
              return (
                <label key={name} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', userSelect: 'none', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {
                      setSelectedPriceLists(prev =>
                        prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]
                      );
                    }}
                    style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                  />
                  <span style={{ fontSize: '0.95rem', color: '#1e293b', fontWeight: isChecked ? '600' : 'normal' }}>{name}</span>
                </label>
              );
            })}
          </div>
        </div>
      </div>

      {/* Date Validity Card */}
      <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: '0 0 0.5rem 0', color: '#ec4899', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Calendar size={20} /> Vigencia de la Promoción
        </h3>
        <p style={{ margin: 0, color: 'var(--caanma-text-muted)', fontSize: '0.9rem' }}>
          Configura un rango de fechas. Fuera de estas fechas la promoción no se aplicará automáticamente en caja. Dejar vacío si no expira.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#334155' }}>Fecha de Inicio</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--caanma-border)', outline: 'none' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#334155' }}>Fecha de Fin</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--caanma-border)', outline: 'none' }}
            />
          </div>
        </div>
      </div>

      {/* Target Segment Selection Card */}
      <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: '0 0 0.5rem 0', color: '#0ea5e9', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Tag size={20} /> Artículos, Categorías o Marcas que Aplican
        </h3>
        <div style={{ fontSize: '0.9rem', color: '#64748b', backgroundColor: '#f0f9ff', padding: '1rem', borderRadius: '8px', border: '1px solid #bae6fd', lineHeight: 1.5 }}>
          <strong>💡 Nota Importante:</strong> Si no seleccionas ningún artículo, categoría ni marca, la promoción se considerará <strong>General</strong> y aplicará a <strong>todos</strong> los artículos del catálogo.
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem', marginTop: '1rem' }}>
          {/* Products Selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderRight: '1px solid #f1f5f9', paddingRight: '1.5rem' }}>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e293b' }}>
              <ShoppingBag size={18} /> Artículos ({selectedProducts.length} seleccionados) {searching && <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: '#ec4899', marginLeft: 'auto', animation: 'pulse 1.5s infinite' }}>Buscando...</span>}
            </h4>
            <input
              type="text"
              placeholder="Buscar artículo por nombre o SKU..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--caanma-border)', fontSize: '0.9rem', outline: 'none' }}
            />

            <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.5rem' }}>
              {filteredProducts.length === 0 ? (
                <div style={{ padding: '1rem', color: '#94a3b8', fontSize: '0.9rem', textAlign: 'center' }}>No se encontraron artículos.</div>
              ) : (
                filteredProducts.map(p => {
                  const isChecked = selectedProducts.includes(p.id);
                  return (
                    <div 
                      key={p.id} 
                      onClick={() => handleToggleProduct(p.id)}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.75rem', 
                        padding: '0.5rem 0.75rem', 
                        borderRadius: '6px', 
                        cursor: 'pointer',
                        backgroundColor: isChecked ? '#f0fdf4' : 'transparent',
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background-color 0.2s'
                      }}
                    >
                      {isChecked ? <CheckSquare size={18} color="#22c55e" /> : <Square size={18} color="#94a3b8" />}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: isChecked ? 'bold' : '500', color: '#334155' }}>{p.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          SKU: {p.sku} {p.category ? `| Cat: ${p.category}` : ''} {p.brand ? `| Marca: ${p.brand}` : ''}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Categories and Brands */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Categories */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e293b' }}>
                <Folder size={18} /> Categorías ({selectedCategories.length} sel)
              </h4>
              <div style={{ maxHeight: '160px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {categories.length === 0 ? (
                  <div style={{ padding: '0.5rem', color: '#94a3b8', fontSize: '0.85rem' }}>No hay categorías.</div>
                ) : (
                  categories.map(cat => {
                    const isChecked = selectedCategories.includes(cat);
                    return (
                      <label 
                        key={cat} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '0.5rem', 
                          fontSize: '0.875rem', 
                          cursor: 'pointer',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          backgroundColor: isChecked ? '#eff6ff' : 'transparent'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleCategory(cat)}
                          style={{ cursor: 'pointer' }}
                        />
                        <span style={{ fontWeight: isChecked ? 'bold' : 'normal', color: '#475569' }}>{cat}</span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            {/* Brands */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e293b' }}>
                <Award size={18} /> Marcas ({selectedBrands.length} sel)
              </h4>
              <div style={{ maxHeight: '160px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {brands.length === 0 ? (
                  <div style={{ padding: '0.5rem', color: '#94a3b8', fontSize: '0.85rem' }}>No hay marcas registradas.</div>
                ) : (
                  brands.map(brand => {
                    const isChecked = selectedBrands.includes(brand);
                    return (
                      <label 
                        key={brand} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '0.5rem', 
                          fontSize: '0.875rem', 
                          cursor: 'pointer',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          backgroundColor: isChecked ? '#eff6ff' : 'transparent'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleBrand(brand)}
                          style={{ cursor: 'pointer' }}
                        />
                        <span style={{ fontWeight: isChecked ? 'bold' : 'normal', color: '#475569' }}>{brand}</span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem', marginBottom: '2rem' }}>
        <button 
          className="btn-primary" 
          type="submit" 
          disabled={loading}
          style={{ 
            padding: '1rem 3rem', 
            fontSize: '1.15rem', 
            backgroundColor: '#db2777', 
            borderColor: '#db2777', 
            borderRadius: '8px', 
            fontWeight: 'bold',
            opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? 'Activando...' : 'Activar Regla de Promoción'}
        </button>
      </div>
    </form>
  );
}
