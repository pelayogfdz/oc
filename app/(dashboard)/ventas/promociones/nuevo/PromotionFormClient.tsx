'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { searchProducts } from '@/app/actions/product';
import { crudAction } from '@/app/actions/crud';
import { useRouter } from 'next/navigation';
import { PlusCircle, X, Search } from 'lucide-react';

export default function PromotionFormClient({ branchId }: { branchId: string }) {
  const router = useRouter();
  const [type, setType] = useState('PERCENTAGE');
  const [targetType, setTargetType] = useState<'ALL' | 'BRAND' | 'CATEGORY' | 'PRODUCTS'>('ALL');
  
  // Specific targets
  const [targetBrand, setTargetBrand] = useState('');
  const [targetCategory, setTargetCategory] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<any[]>([]);
  
  // Product Search
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (targetType !== 'PRODUCTS' || !searchTerm.trim()) {
      setSearchResults([]);
      return;
    }
    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchProducts(searchTerm, branchId);
        setSearchResults(results);
      } catch (e) {
        console.error(e);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, targetType, branchId]);

  const handleAddProduct = (prod: any) => {
    if (!selectedProducts.find(p => p.id === prod.id)) {
      setSelectedProducts([...selectedProducts, prod]);
    }
    setSearchTerm('');
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const metadata = {
      targetType,
      applyToBrands: targetType === 'BRAND' ? [targetBrand] : [],
      applyToCategories: targetType === 'CATEGORY' ? [targetCategory] : [],
      applyToProducts: targetType === 'PRODUCTS' ? selectedProducts.map(p => p.id) : [],
    };
    
    formData.append('metadata', JSON.stringify(metadata));
    
    try {
      await crudAction('promotion', formData);
      router.push('/ventas/promociones');
    } catch (e) {
      alert("Error al guardar la promoción");
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem', gap: '1rem' }}>
        <Link href="/ventas/promociones" style={{ textDecoration: 'none', color: 'var(--pulpos-text-muted)', fontSize: '1.25rem' }}>← Catálogo Promo</Link>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>Crear Regla de Promoción</h1>
      </div>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="card" style={{ padding: '2rem' }}>
           <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Nombre Comercial de la Oferta *</label>
              <input type="text" name="name" required placeholder="Ej. Buen Fin - Zapatos" style={{ width: '100%', padding: '1rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)', fontSize: '1.1rem' }} />
           </div>
           
           <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
             <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Tipo de Descuento</label>
                <select name="type" value={type} onChange={e => setType(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)', backgroundColor: 'white' }}>
                   <option value="PERCENTAGE">Porcentaje (%)</option>
                   <option value="FIXED_AMOUNT">Monto Fijo ($)</option>
                   <option value="BOGO">2x1 (Lleva más, paga menos)</option>
                </select>
             </div>
             <div>
                {type === 'BOGO' ? (
                  <>
                     <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'transparent' }}>Metadata escondido</label>
                     <input type="hidden" name="value" value="0" />
                     <div style={{ padding: '0.75rem', backgroundColor: '#e0e7ff', color: '#4338ca', borderRadius: '4px', fontWeight: 'bold', border: '1px solid #c7d2fe' }}>
                       Aplica regla NxM pos-cálculo
                     </div>
                  </>
                ) : (
                  <>
                     <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Valor / Descuento</label>
                     <input type="number" step="0.01" name="value" required placeholder="Ej. 15.00" style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }} />
                  </>
                )}
             </div>
           </div>
           
           {/* ALCANCE / TARGETING */}
           <div style={{ padding: '1.5rem', backgroundColor: '#f8fafc', border: '1px solid var(--pulpos-border)', borderRadius: '8px', marginBottom: '1.5rem' }}>
             <p style={{ margin: '0 0 1rem 0', fontWeight: 'bold', color: '#1e293b' }}>Alcance de la Promoción</p>
             <div style={{ marginBottom: '1rem' }}>
               <select value={targetType} onChange={e => setTargetType(e.target.value as any)} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)', backgroundColor: 'white' }}>
                 <option value="ALL">Para toda la tienda (Global)</option>
                 <option value="CATEGORY">Específico por Categoría</option>
                 <option value="BRAND">Específico por Marca</option>
                 <option value="PRODUCTS">Específico por Productos</option>
               </select>
             </div>

             {targetType === 'CATEGORY' && (
               <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Escribe el nombre de la Categoría exacta:</label>
                  <input type="text" value={targetCategory} onChange={e => setTargetCategory(e.target.value)} required placeholder="Ej. Laptops" style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }} />
               </div>
             )}

             {targetType === 'BRAND' && (
               <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Escribe el nombre de la Marca exacta:</label>
                  <input type="text" value={targetBrand} onChange={e => setTargetBrand(e.target.value)} required placeholder="Ej. HP" style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }} />
               </div>
             )}

             {targetType === 'PRODUCTS' && (
               <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Buscar y agregar productos:</label>
                  <div style={{ display: 'flex', gap: '0.5rem', position: 'relative' }}>
                    <Search size={20} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
                    <input 
                      type="text" 
                      value={searchTerm} 
                      onChange={e => setSearchTerm(e.target.value)} 
                      placeholder="Buscar por Nombre, SKU o Código..." 
                      style={{ width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.5rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }} 
                    />
                  </div>
                  {searchResults.length > 0 && (
                    <div style={{ position: 'absolute', marginTop: '4px', background: 'white', border: '1px solid var(--pulpos-border)', borderRadius: '4px', width: '100%', maxHeight: '200px', overflowY: 'auto', zIndex: 10, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                      {searchResults.map(prod => (
                        <div key={prod.id} onClick={() => handleAddProduct(prod)} style={{ padding: '0.75rem', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }} className="hover:bg-slate-50">
                          <div style={{ fontWeight: 500 }}>{prod.name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>SKU: {prod.sku || '--'} | Precio: ${prod.price}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedProducts.length > 0 && (
                    <div style={{ marginTop: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {selectedProducts.map(prod => (
                        <div key={prod.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#e2e8f0', padding: '0.25rem 0.75rem', borderRadius: '100px', fontSize: '0.875rem' }}>
                          <span>{prod.name}</span>
                          <button type="button" onClick={() => setSelectedProducts(selectedProducts.filter(p => p.id !== prod.id))} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: '#64748b' }}>
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
               </div>
             )}
           </div>

           <div style={{ padding: '1.5rem', backgroundColor: '#fdf2f8', border: '1px solid #fbcfe8', borderRadius: '8px' }}>
             <p style={{ margin: '0 0 1rem 0', fontWeight: 'bold', color: '#be185d' }}>Vigencia (Opcional)</p>
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div><label style={{ fontSize: '0.85rem' }}>Inicia</label><input type="date" style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #fbcfe8' }} /></div>
                <div><label style={{ fontSize: '0.85rem' }}>Termina</label><input type="date" style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #fbcfe8' }} /></div>
             </div>
           </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
           <button className="btn-primary" type="submit" style={{ padding: '1rem 3rem', fontSize: '1.25rem', backgroundColor: '#ec4899', borderColor: '#ec4899', borderRadius: '8px' }}>Activar Promoción</button>
        </div>
      </form>
    </div>
  );
}
