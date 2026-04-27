'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plus, Trash2, Package, ShoppingCart, Send } from 'lucide-react';
import { createPurchaseRequests } from '@/app/actions/purchaseRequest';
import { searchProducts } from '@/app/actions/product';

type CatalogProduct = { id: string; name: string; sku: string | null; stock: number };

type RequestItem = {
  tempId: string;
  productId?: string;
  preProductName?: string;
  name: string;
  quantity: number;
  isPreProduct: boolean;
};

export default function NuevaSolicitudClient({ branchId }: { branchId: string }) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [items, setItems] = useState<RequestItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filteredProducts, setFilteredProducts] = useState<CatalogProduct[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchTerm.trim().length > 1) {
        setIsSearching(true);
        try {
          const results = await searchProducts(searchTerm, branchId);
          // Remove duplicates by name just in case they are cloned items without variants
          const uniqueResults = results.filter((v: any, i: number, a: any[]) => a.findIndex(t => (t.name === v.name)) === i);
          setFilteredProducts(uniqueResults.slice(0, 8));
        } catch (e) {
          console.error(e);
        } finally {
          setIsSearching(false);
        }
      } else {
        setFilteredProducts([]);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, branchId]);

  const handleAddCatalogProduct = (product: CatalogProduct) => {
    // Check if already in list
    const existing = items.find(i => i.productId === product.id);
    if (existing) {
      setItems(items.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setItems([...items, {
        tempId: Date.now().toString(),
        productId: product.id,
        name: product.name,
        quantity: 1,
        isPreProduct: false
      }]);
    }
    setSearchTerm('');
  };

  const handleAddPreProduct = () => {
    if (!searchTerm.trim()) return;
    
    setItems([...items, {
      tempId: Date.now().toString(),
      preProductName: searchTerm.trim(),
      name: searchTerm.trim(),
      quantity: 1,
      isPreProduct: true
    }]);
    setSearchTerm('');
  };

  const updateQuantity = (tempId: string, delta: number) => {
    setItems(items.map(i => {
      if (i.tempId === tempId) {
        const newQ = i.quantity + delta;
        return { ...i, quantity: newQ > 0 ? newQ : 1 };
      }
      return i;
    }));
  };

  const setExactQuantity = (tempId: string, val: string) => {
    const num = parseInt(val);
    if (isNaN(num) || num < 1) return;
    setItems(items.map(i => i.tempId === tempId ? { ...i, quantity: num } : i));
  };

  const removeItem = (tempId: string) => {
    setItems(items.filter(i => i.tempId !== tempId));
  };

  const handleSubmit = async () => {
    if (items.length === 0) return;
    setIsSubmitting(true);
    try {
      const payload = items.map(i => ({
        productId: i.productId,
        preProductName: i.preProductName,
        quantity: i.quantity
      }));
      
      await createPurchaseRequests(payload);
      router.push('/productos/solicitudes');
      
    } catch (e: any) {
      alert(e.message);
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '1.5rem', alignItems: 'start', fontFamily: 'var(--font-geist-sans)' }}>
      {/* Columna Izquierda: Buscador */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Search size={20} color="var(--pulpos-primary)" />
          Buscar o Crear Producto
        </h2>
        
        <div style={{ position: 'relative' }}>
          <input 
            type="text" 
            placeholder="Escribe el nombre o SKU del producto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '0.75rem 1rem', fontSize: '1rem', borderRadius: '8px', border: '1px solid var(--pulpos-border)' }}
          />
          
          {searchTerm.trim().length > 1 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'white', border: '1px solid var(--pulpos-border)', borderRadius: '8px', marginTop: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', zIndex: 10, overflow: 'hidden' }}>
              
              {/* Resultados del catálogo */}
              {filteredProducts.map(p => (
                <div 
                  key={p.id}
                  onClick={() => handleAddCatalogProduct(p)}
                  style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{p.name}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>SKU: {p.sku || 'N/A'} | Stock: {p.stock}</div>
                  </div>
                  <Plus size={18} color="var(--pulpos-primary)" />
                </div>
              ))}

              {/* Opción para añadir como Pre-producto */}
              <div 
                onClick={handleAddPreProduct}
                style={{ padding: '0.75rem 1rem', backgroundColor: '#eff6ff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--pulpos-primary)', fontWeight: 'bold' }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#dbeafe'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#eff6ff'}
              >
                <Plus size={18} />
                Añadir "{searchTerm}" como nuevo producto (Pre-producto)
              </div>

            </div>
          )}
        </div>
        
        <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', color: '#475569', fontSize: '0.9rem' }}>
          <p style={{ margin: 0, fontWeight: 'bold', marginBottom: '0.5rem' }}>Instrucciones:</p>
          <ul style={{ margin: 0, paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <li>Si el producto ya existe en la tienda, búscalo y selecciónalo.</li>
            <li>Si el producto <strong>no existe</strong>, escribe su nombre completo y haz clic en "Añadir como nuevo producto". El departamento de compras se encargará de registrarlo al comprarlo.</li>
          </ul>
        </div>
      </div>

      {/* Columna Derecha: Resumen de la Solicitud */}
      <div className="card" style={{ padding: '1.5rem', position: 'sticky', top: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShoppingCart size={20} color="var(--pulpos-primary)" />
            Lista de Solicitud
          </div>
          <span style={{ fontSize: '0.85rem', backgroundColor: '#f1f5f9', padding: '0.2rem 0.6rem', borderRadius: '12px' }}>
            {items.length} {items.length === 1 ? 'artículo' : 'artículos'}
          </span>
        </h2>

        {items.length === 0 ? (
          <div style={{ padding: '2rem 0', textAlign: 'center', color: '#94a3b8' }}>
            <Package size={48} style={{ opacity: 0.2, margin: '0 auto 1rem' }} />
            <p style={{ margin: 0 }}>La lista está vacía.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '50vh', overflowY: 'auto', paddingRight: '0.5rem' }}>
            {items.map(item => (
              <div key={item.tempId} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1rem', backgroundColor: '#f8fafc', border: '1px solid var(--pulpos-border)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>
                    {item.name}
                  </div>
                  <button onClick={() => removeItem(item.tempId)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.2rem' }}>
                    <Trash2 size={16} />
                  </button>
                </div>
                
                {item.isPreProduct && (
                  <span style={{ fontSize: '0.7rem', backgroundColor: '#e2e8f0', color: '#475569', padding: '0.1rem 0.4rem', borderRadius: '4px', alignSelf: 'flex-start', fontWeight: 'bold' }}>
                    FUERA DE CATÁLOGO
                  </span>
                )}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                  <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Cantidad:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'white', border: '1px solid var(--pulpos-border)', borderRadius: '6px', padding: '0.2rem' }}>
                    <button 
                      onClick={() => updateQuantity(item.tempId, -1)}
                      style={{ border: 'none', background: '#f1f5f9', borderRadius: '4px', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    >-</button>
                    <input 
                      type="number" 
                      value={item.quantity}
                      onChange={(e) => setExactQuantity(item.tempId, e.target.value)}
                      style={{ width: '40px', textAlign: 'center', border: 'none', outline: 'none', fontWeight: 'bold', fontSize: '0.9rem' }}
                    />
                    <button 
                      onClick={() => updateQuantity(item.tempId, 1)}
                      style={{ border: 'none', background: '#f1f5f9', borderRadius: '4px', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    >+</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <button 
          className="btn-primary" 
          onClick={handleSubmit}
          disabled={items.length === 0 || isSubmitting}
          style={{ width: '100%', marginTop: '1.5rem', padding: '0.8rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', opacity: (items.length === 0 || isSubmitting) ? 0.5 : 1 }}
        >
          {isSubmitting ? 'Enviando...' : <><Send size={18} /> Enviar Solicitud</>}
        </button>
      </div>
    </div>
  );
}
