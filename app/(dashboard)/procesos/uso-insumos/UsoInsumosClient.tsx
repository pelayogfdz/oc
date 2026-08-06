'use client';

import { useState } from 'react';
import { Search, Plus, Minus, Trash2, Layers, Check, AlertCircle, ShoppingCart } from 'lucide-react';
import { registerSupplyUsage } from '@/app/actions/inventory';

interface ProductVariant {
  id: string;
  productId: string;
  attribute: string;
  sku: string | null;
  barcode: string | null;
  stock: number;
}

interface Product {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  category: string | null;
  isProductionInput: boolean;
  stock: number;
  unit: string;
  variants: ProductVariant[];
}

interface UsoInsumosClientProps {
  products: Product[];
  branchName: string;
}

interface CartItem {
  cartId: string; // unique ID for item in cart
  productId: string;
  variantId: string | null;
  name: string;
  sku: string;
  unit: string;
  stock: number;
  quantity: number;
}

export default function UsoInsumosClient({ products, branchName }: UsoInsumosClientProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [onlyInputs, setOnlyInputs] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [variantModalProduct, setVariantModalProduct] = useState<Product | null>(null);

  // Filter products based on search term and supply toggle
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (p.barcode && p.barcode.includes(searchTerm));
    
    const matchesInputFilter = !onlyInputs || p.isProductionInput;
    
    return matchesSearch && matchesInputFilter;
  });

  const addToCart = (product: Product, variant: ProductVariant | null = null) => {
    // If the product has variants and none was chosen, open selection modal
    if (!variant && product.variants && product.variants.length > 0) {
      setVariantModalProduct(product);
      return;
    }

    const cartId = variant ? `v_${variant.id}` : `p_${product.id}`;
    const name = variant ? `${product.name} (${variant.attribute})` : product.name;
    const sku = variant && variant.sku ? variant.sku : product.sku;
    const stock = variant ? variant.stock : product.stock;

    setCart(prev => {
      const existing = prev.find(item => item.cartId === cartId);
      if (existing) {
        // Limit to available stock if needed, or allow negative stock adjustment based on preference
        const nextQty = existing.quantity + 1;
        if (nextQty > stock) {
          alert(`No puedes seleccionar más de la existencia actual (${stock} ${product.unit}).`);
          return prev;
        }
        return prev.map(item => item.cartId === cartId ? { ...item, quantity: nextQty } : item);
      }

      if (stock <= 0) {
        alert('Este insumo no tiene existencia en inventario.');
        return prev;
      }

      return [
        ...prev,
        {
          cartId,
          productId: product.id,
          variantId: variant ? variant.id : null,
          name,
          sku,
          unit: product.unit,
          stock,
          quantity: 1
        }
      ];
    });

    if (variantModalProduct) {
      setVariantModalProduct(null);
    }
  };

  const updateQuantity = (cartId: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.cartId === cartId) {
          const nextQty = item.quantity + delta;
          if (nextQty <= 0) return item;
          if (nextQty > item.stock) {
            alert(`No puedes seleccionar más de la existencia actual (${item.stock} ${item.unit}).`);
            return item;
          }
          return { ...item, quantity: nextQty };
        }
        return item;
      });
    });
  };

  const removeFromCart = (cartId: string) => {
    setCart(prev => prev.filter(item => item.cartId !== cartId));
  };

  const clearCart = () => {
    if (confirm('¿Estás seguro de que deseas vaciar los insumos seleccionados?')) {
      setCart([]);
      setReason('');
    }
  };

  const handleSubmit = async () => {
    if (cart.length === 0) {
      alert('Debes seleccionar al menos un insumo de la lista.');
      return;
    }
    if (!reason.trim()) {
      alert('Por favor, indica la razón o el proceso en el que se usaron los insumos.');
      return;
    }

    setIsSubmitting(true);
    try {
      const itemsPayload = cart.map(item => ({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity
      }));

      await registerSupplyUsage(itemsPayload, reason.trim());
      alert('¡Uso de insumos registrado con éxito! El inventario ha sido actualizado.');
      setCart([]);
      setReason('');
    } catch (e: any) {
      alert('Error al registrar uso de insumos: ' + (e.message || String(e)));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1.25rem' }}>
      {/* Header Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--caanma-text)', margin: 0 }}>
            Uso de Insumos / Consumo Interno
          </h1>
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Sucursal activa: <strong style={{ color: 'var(--caanma-primary)' }}>{branchName}</strong>
          </span>
        </div>
        <div style={{ fontSize: '0.85rem', color: '#475569', backgroundColor: '#f1f5f9', padding: '0.5rem 1rem', borderRadius: '20px', fontWeight: '500' }}>
          Los productos agregados se restarán directamente del inventario.
        </div>
      </div>

      {/* POS Content Grid */}
      <div className="insumos-container">
        {/* Left Side: Product Selector */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.25rem', overflow: 'hidden', height: '100%' }}>
          {/* Controls Bar */}
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Search Input */}
            <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
              <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input 
                type="text"
                placeholder="Buscar insumos por nombre o SKU..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.5rem 0.5rem 2.25rem',
                  fontSize: '0.9rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  outline: 'none'
                }}
              />
            </div>
            {/* Inputs Filter Switch */}
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '500', color: '#475569', userSelect: 'none' }}>
              <input 
                type="checkbox"
                checked={onlyInputs}
                onChange={e => setOnlyInputs(e.target.checked)}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              Solo productos catalogados como Insumo
            </label>
          </div>

          {/* Grid Container */}
          <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.25rem' }}>
            {filteredProducts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
                <AlertCircle size={36} style={{ marginBottom: '0.5rem', color: '#94a3b8' }} />
                <p style={{ fontSize: '0.95rem', fontWeight: '500' }}>No se encontraron insumos.</p>
                <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.25rem' }}>Intenta cambiando el término de búsqueda o desmarcando "Solo productos catalogados como Insumo".</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                {filteredProducts.map(p => {
                  const hasVariants = p.variants && p.variants.length > 0;
                  const totalStock = hasVariants ? p.variants.reduce((sum, v) => sum + v.stock, 0) : p.stock;
                  const isOutOfStock = totalStock <= 0;

                  return (
                    <div 
                      key={p.id}
                      onClick={() => !isOutOfStock && addToCart(p)}
                      style={{
                        padding: '1rem',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                        backgroundColor: isOutOfStock ? '#f8fafc' : 'white',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        opacity: isOutOfStock ? 0.6 : 1,
                        position: 'relative'
                      }}
                      className="insumo-card"
                    >
                      <div>
                        {/* Tags */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <span style={{ fontSize: '0.675rem', padding: '0.125rem 0.35rem', borderRadius: '4px', backgroundColor: '#e2e8f0', color: '#475569', fontWeight: 'bold' }}>
                            {p.unit}
                          </span>
                          {p.isProductionInput && (
                            <span style={{ fontSize: '0.675rem', padding: '0.125rem 0.35rem', borderRadius: '4px', backgroundColor: '#dbeafe', color: '#1e40af', fontWeight: 'bold' }}>
                              Insumo
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <h3 style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#0f172a', margin: '0 0 0.25rem 0', lineClamp: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', height: '2.4rem' }}>
                          {p.name}
                        </h3>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '0.75rem' }}>
                          SKU: {p.sku}
                        </span>
                      </div>

                      {/* Footer & Stock Indicator */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '0.5rem' }}>
                        <div style={{ fontSize: '0.8rem', color: '#475569' }}>
                          Existencia: <strong style={{ color: isOutOfStock ? '#ef4444' : totalStock < 5 ? '#f59e0b' : '#10b981' }}>
                            {totalStock}
                          </strong>
                        </div>
                        {hasVariants ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: 'var(--caanma-primary)', fontWeight: 'bold' }}>
                            <Layers size={12} /> Ver var.
                          </span>
                        ) : (
                          !isOutOfStock && (
                            <span className="add-badge" style={{ fontSize: '0.7rem', color: 'white', backgroundColor: 'var(--caanma-primary)', padding: '0.15rem 0.4rem', borderRadius: '4px', fontWeight: 'bold' }}>
                              + Agregar
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Usage Basket & Checkout */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Basket Card */}
          <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '1.25rem', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--caanma-border)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--caanma-text)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShoppingCart size={18} /> Insumos Seleccionados ({cart.reduce((sum, item) => sum + item.quantity, 0)})
              </h2>
              {cart.length > 0 && (
                <button 
                  type="button" 
                  onClick={clearCart}
                  style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.8rem', cursor: 'pointer', fontWeight: '500' }}
                >
                  Vaciar
                </button>
              )}
            </div>

            {/* Selected Items List */}
            <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1.25rem' }}>
              {cart.length === 0 ? (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: '#94a3b8', padding: '2rem' }}>
                  <ShoppingCart size={40} style={{ marginBottom: '0.75rem', opacity: 0.5 }} />
                  <p style={{ fontSize: '0.9rem', fontWeight: '500', textAlign: 'center' }}>El carrito de insumos está vacío.</p>
                  <p style={{ fontSize: '0.8rem', textAlign: 'center', marginTop: '0.25rem' }}>Haz clic en un insumo del catálogo para agregarlo.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {cart.map(item => (
                    <div 
                      key={item.cartId}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.75rem',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        backgroundColor: '#f8fafc'
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0, marginRight: '1rem' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#0f172a', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.name}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          SKU: {item.sku} | Disp: {item.stock} {item.unit}
                        </span>
                      </div>

                      {/* Quantity Selector & Trash */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: 'white' }}>
                          <button 
                            type="button"
                            onClick={() => updateQuantity(item.cartId, -1)}
                            disabled={item.quantity <= 1}
                            style={{ border: 'none', background: 'none', padding: '0.25rem 0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', opacity: item.quantity <= 1 ? 0.3 : 1 }}
                          >
                            <Minus size={14} />
                          </button>
                          <span style={{ minWidth: '24px', textAlign: 'center', fontSize: '0.85rem', fontWeight: 'bold', padding: '0 0.25rem' }}>
                            {item.quantity}
                          </span>
                          <button 
                            type="button"
                            onClick={() => updateQuantity(item.cartId, 1)}
                            style={{ border: 'none', background: 'none', padding: '0.25rem 0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                        
                        <button 
                          type="button"
                          onClick={() => removeFromCart(item.cartId)}
                          style={{ border: 'none', background: 'none', color: '#ef4444', padding: '0.25rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Reason / Notes area */}
            <div style={{ borderTop: '1px solid var(--caanma-border)', paddingTop: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', color: 'var(--caanma-text)' }}>
                Motivo / Proceso de Uso <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <textarea 
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Ej. Uso para la elaboración de la masa del Pan de Dulce (Lote #04)..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  fontSize: '0.85rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  outline: 'none',
                  resize: 'none',
                  marginBottom: '1rem'
                }}
              />
              
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || cart.length === 0}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  backgroundColor: cart.length === 0 ? '#cbd5e1' : 'var(--caanma-primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 'bold',
                  fontSize: '0.95rem',
                  cursor: cart.length === 0 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 4px 6px -1px rgba(99, 102, 241, 0.2)',
                  transition: 'background 0.2s'
                }}
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin" style={{ width: '18px', height: '18px', marginRight: '0.25rem', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%' }} viewBox="0 0 24 24"></svg>
                    Procesando...
                  </>
                ) : (
                  <>
                    <Check size={18} /> Registrar Consumo de Insumos
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Variant Selection Modal */}
      {variantModalProduct && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '1.5rem', position: 'relative', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--caanma-border)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--caanma-text)', margin: 0 }}>
                Selecciona una Variante
              </h3>
              <button 
                type="button" 
                onClick={() => setVariantModalProduct(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748b' }}
              >
                &times;
              </button>
            </div>
            <div>
              <span style={{ fontSize: '0.85rem', color: '#64748b', display: 'block', marginBottom: '0.25rem' }}>Producto:</span>
              <strong style={{ fontSize: '1rem', color: '#0f172a' }}>{variantModalProduct.name}</strong>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto', paddingRight: '0.25rem' }}>
              {variantModalProduct.variants.map(variant => {
                const isVariantOutOfStock = variant.stock <= 0;
                return (
                  <div 
                    key={variant.id}
                    onClick={() => !isVariantOutOfStock && addToCart(variantModalProduct, variant)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.75rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      cursor: isVariantOutOfStock ? 'not-allowed' : 'pointer',
                      backgroundColor: isVariantOutOfStock ? '#f8fafc' : 'white',
                      transition: 'border-color 0.2s',
                      opacity: isVariantOutOfStock ? 0.6 : 1
                    }}
                    className="variant-select-item"
                  >
                    <div>
                      <strong style={{ fontSize: '0.9rem', color: '#0f172a', display: 'block' }}>{variant.attribute}</strong>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>SKU: {variant.sku || 'N/A'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '0.8rem', color: '#475569' }}>
                        Existencia: <strong style={{ color: isVariantOutOfStock ? '#ef4444' : variant.stock < 5 ? '#f59e0b' : '#10b981' }}>{variant.stock}</strong>
                      </span>
                      {!isVariantOutOfStock && (
                        <button 
                          type="button" 
                          style={{
                            padding: '0.25rem 0.5rem',
                            fontSize: '0.75rem',
                            backgroundColor: 'var(--caanma-primary)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                          }}
                        >
                          + Agregar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Inline styles for hover effects & animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        .insumo-card:hover {
          border-color: var(--caanma-primary) !important;
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.08);
          transform: translateY(-2px);
        }
        .variant-select-item:hover {
          border-color: var(--caanma-primary) !important;
          background-color: #f5f3ff !important;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      ` }} />
    </div>
  );
}
