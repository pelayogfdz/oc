'use client';

import { useState, useEffect } from 'react';
import { Search, Plus, Minus, Trash, CheckCircle, PackageCheck } from 'lucide-react';
import { createPurchase } from '@/app/actions/purchase';
import { searchProducts } from '@/app/actions/product';

export default function PurchaseClient({ products: initialProducts, suppliers, branchId }: { products: any[], suppliers: any[], branchId: string }) {
  const [cart, setCart] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [displayedProducts, setDisplayedProducts] = useState<any[]>(initialProducts);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('CASH');

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

  const total = cart.reduce((acc, item) => acc + (item.cost * item.quantity), 0);

  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1, currentCost: product.cost }];
    });
  };

  const updateQuantity = (id: string, newQ: number) => {
    if (newQ < 1) return;
    setCart(prev => prev.map(item => item.id === id ? { ...item, quantity: newQ } : item));
  };
  
  const updateCost = (id: string, newCost: number) => {
    if (newCost < 0) return;
    setCart(prev => prev.map(item => item.id === id ? { ...item, cost: newCost } : item));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const handleCheckout = async () => {
    try {
      const items = cart.map(i => ({ productId: i.id, quantity: i.quantity, cost: i.cost }));
      await createPurchase(items, total, paymentMethod, selectedSupplierId || null);
      alert('¡Compra registrada y stock actualizado con éxito!');
      setCart([]);
      setShowCheckout(false);
    } catch (err) {
      console.error(err);
      alert('Hubo un error al procesar la compra.');
    }
  };

  return (
    <div style={{ display: 'flex', gap: '1.5rem', height: '100%', alignItems: 'stretch' }}>
      {/* Left: Products Grid */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '1rem', backgroundColor: 'var(--pulpos-bg)', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--pulpos-text-muted)' }} size={20} />
            <input 
              type="text" 
              placeholder="Buscar producto a ingresar por nombre o SKU..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '0.8rem 1rem 0.8rem 3rem', borderRadius: '8px', border: '1px solid var(--pulpos-border)', fontSize: '1rem' }}
            />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '0.5rem', opacity: isSearching ? 0.5 : 1, transition: 'opacity 0.2s' }}>
            {displayedProducts.map(p => (
              <div 
                key={p.id} 
                onClick={() => addToCart(p)}
                style={{ 
                  backgroundColor: 'white', 
                  borderRadius: '4px', 
                  padding: '0.75rem 1rem', 
                  cursor: 'pointer',
                  border: '1px solid var(--pulpos-border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'background-color 0.2s',
                  ':hover': { backgroundColor: '#f8fafc' }
                } as any}
              >
                <div>
                  <div style={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: '600' }}>
                    {p.name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--pulpos-text-muted)', marginTop: '0.1rem' }}>
                    SKU: {p.sku || '--'} | <span style={{ color: p.stock <= 0 ? 'red' : 'green' }}>Stock actual: {p.stock}</span>
                  </div>
                </div>
                <div style={{ fontWeight: 'bold', color: 'var(--pulpos-primary)', fontSize: '1rem' }}>
                  ${p.cost.toFixed(2)}
                </div>
              </div>
            ))}
            {displayedProducts.length === 0 && !isSearching && (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--pulpos-text-muted)' }}>
                No se encontraron productos en la base de datos.
              </div>
            )}
            {isSearching && (
               <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--pulpos-text-muted)' }}>
                 Buscando en Base de Datos...
               </div>
            )}
          </div>
        </div>
      </div>

      {/* Right: Cart */}
      <div style={{ width: '400px', backgroundColor: 'white', borderRadius: '12px', border: '1px solid var(--pulpos-border)', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        {/* Cart Header */}
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)', backgroundColor: '#f8fafc' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>Nueva Orden (Compras)</h2>
            <button onClick={() => setCart([])} style={{ background: 'none', border: 'none', color: 'var(--pulpos-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem' }}>
              <Trash size={16} /> Limpiar
            </button>
          </div>
        </div>

        {/* Customer / Config */}
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--pulpos-text-muted)', marginBottom: '0.25rem' }}>Proveedor asignado</label>
            <select value={selectedSupplierId} onChange={e => setSelectedSupplierId(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }}>
              <option value="">(Sin Proveedor / Compra Express)</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Cart Items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {cart.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--pulpos-text-muted)', margin: 'auto' }}>
              <PackageCheck size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
              <p>Agrega productos del catálogo para comprarlos</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '0.25rem' }}>{item.name}</div>
                  
                  {/* Cost Override */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--pulpos-text-muted)' }}>Costo Ud:</span>
                    <input 
                      type="number" 
                      step="0.01"
                      value={item.cost}
                      onChange={e => updateCost(item.id, parseFloat(e.target.value) || 0)}
                      style={{ width: '80px', padding: '0.25rem', border: '1px solid var(--pulpos-border)', borderRadius: '4px', fontSize: '0.8rem' }}
                    />
                  </div>

                  {/* Quantity Controls */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--pulpos-border)', borderRadius: '6px', overflow: 'hidden' }}>
                      <button onClick={() => updateQuantity(item.id, item.quantity - 1)} style={{ padding: '0.25rem 0.5rem', border: 'none', background: '#f8fafc', cursor: 'pointer' }}><Minus size={14} /></button>
                      <span style={{ padding: '0 0.75rem', fontWeight: 'bold', fontSize: '0.9rem' }}>{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, item.quantity + 1)} style={{ padding: '0.25rem 0.5rem', border: 'none', background: '#f8fafc', cursor: 'pointer' }}><Plus size={14} /></button>
                    </div>
                    <div style={{ fontWeight: 'bold', color: 'var(--pulpos-primary)', marginLeft: 'auto' }}>
                      ${(item.cost * item.quantity).toFixed(2)}
                    </div>
                  </div>
                </div>
                <button onClick={() => removeFromCart(item.id)} style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', padding: '0' }}>
                  <Trash size={18} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Cart Footer */}
        <div style={{ padding: '1.5rem', backgroundColor: '#f8fafc', borderTop: '1px solid var(--pulpos-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontSize: '1.25rem', fontWeight: 'bold' }}>
            <span>Total Compra</span>
            <span style={{ color: 'var(--pulpos-primary)', fontSize: '1.5rem' }}>${total.toFixed(2)}</span>
          </div>
          
          <button 
            onClick={() => setShowCheckout(true)}
            disabled={cart.length === 0}
            className="btn-primary" 
            style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', opacity: cart.length === 0 ? 0.5 : 1 }}
          >
            <CheckCircle size={20} />
            Continuar Orden
          </button>
        </div>
      </div>

      {/* Checkout Modal */}
      {showCheckout && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card" style={{ width: '400px', padding: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', fontWeight: 'bold' }}>Confirmar Compra</h2>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Forma de Pago a Proveedor</label>
              <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }}>
                <option value="CASH">Efectivo (Retira de Caja Fuerte)</option>
                <option value="TRANSFER">Transferencia / SPEI</option>
                <option value="CARD">Tarjeta Débito/Crédito</option>
                <option value="CREDIT">A Crédito (Cuentas por Pagar)</option>
              </select>
            </div>

            <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold' }}>
              <span>Total a Pagar</span>
              <span style={{ fontSize: '1.5rem', color: 'var(--pulpos-primary)' }}>${total.toFixed(2)}</span>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={() => setShowCheckout(false)} style={{ flex: 1, padding: '0.75rem', border: '1px solid var(--pulpos-border)', borderRadius: '6px', background: 'white', cursor: 'pointer', fontWeight: 'bold' }}>
                Cancelar
              </button>
              <button onClick={handleCheckout} className="btn-primary" style={{ flex: 1, padding: '0.75rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                Aprobar e Ingresar Stock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
