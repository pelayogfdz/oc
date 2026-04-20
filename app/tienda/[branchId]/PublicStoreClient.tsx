'use client';

import { useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import { ShoppingCart, Search, Plus, Minus, Send, MapPin, Store } from 'lucide-react';

type CartItem = { product: any; quantity: number };

export default function PublicStoreClient({ branchName, config, products }: { branchName: string, config: any, products: any[] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [deliveryMode, setDeliveryMode] = useState<'pickup' | 'delivery'>('pickup');
  const [customerName, setCustomerName] = useState('');

  const cartTotal = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const toggleCart = (product: any, delta: number) => {
    setCart(prev => {
      const idx = prev.findIndex(item => item.product.id === product.id);
      if (idx === -1) {
        if (delta > 0) return [...prev, { product, quantity: 1 }];
        return prev;
      }
      const newQty = prev[idx].quantity + delta;
      if (newQty <= 0) {
        return prev.filter((_, i) => i !== idx);
      }
      const clone = [...prev];
      clone[idx].quantity = newQty;
      return clone;
    });
  };

  const getQty = (productId: string) => {
    return cart.find(c => c.product.id === productId)?.quantity || 0;
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;
    if (!config.whatsapp) {
       alert("Esta tienda no tiene configurado un número de WhatsApp.");
       return;
    }

    let text = `*NUEVO PEDIDO: ${branchName}*\n\n`;
    text += `Cliente: ${customerName || 'No especificado'}\n`;
    text += `Modo: ${deliveryMode === 'delivery' ? '🚗 Envío a Domicilio' : '🏪 Recoger en Tienda'}\n\n`;
    text += `*Artículos:*\n`;
    cart.forEach(item => {
       text += `- ${item.quantity}x ${item.product.name} (${formatCurrency(item.product.price)})\n`;
    });
    text += `\n*Total a pagar: ${formatCurrency(cartTotal)}*`;

    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/${config.whatsapp}?text=${encoded}`, '_blank');
  };

  return (
    <div style={{ fontFamily: 'var(--font-geist-sans)', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      
      {/* Header */}
      <div style={{ backgroundColor: config.themeColor, color: 'white', padding: '1rem', position: 'sticky', top: 0, zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontWeight: 'bold', fontSize: '1.25rem' }}>{branchName}</h1>
        <button onClick={() => setShowCart(!showCart)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'rgba(255,255,255,0.2)', padding: '0.5rem 1rem', borderRadius: '50px', fontWeight: 'bold' }}>
           <ShoppingCart size={18} /> {cart.length}
        </button>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
        
        <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'center' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '500px' }}>
            <Search size={20} color="gray" style={{ position: 'absolute', top: '50%', left: '1rem', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              placeholder="Buscar productos..."
              value={searchTerm}
               onChange={e => setSearchTerm(e.target.value)}
              style={{ padding: '1rem 1rem 1rem 3rem', width: '100%', borderRadius: '50px', border: '1px solid #e2e8f0', fontSize: '1rem', outline: 'none' }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem' }}>
          {filteredProducts.map(product => {
            const qty = getQty(product.id);
            return (
              <div key={product.id} style={{ backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
                <div style={{ height: '180px', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                   {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                   ) : (
                      <ShoppingCart size={40} color="#cbd5e1" />
                   )}
                </div>
                <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <h3 style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>{product.name}</h3>
                  <div style={{ color: 'gray', fontSize: '0.85rem', flex: 1, marginBottom: '1rem' }}>{product.description || 'Sin descripción'}</div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: '900', fontSize: '1.2rem', color: config.themeColor }}>{formatCurrency(product.price)}</div>
                    
                    {qty === 0 ? (
                      <button onClick={() => toggleCart(product, 1)} style={{ backgroundColor: config.themeColor, color: 'white', border: 'none', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                         <Plus size={18} />
                      </button>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                         <button onClick={() => toggleCart(product, -1)} style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid #e2e8f0', backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                           <Minus size={16} />
                         </button>
                         <span style={{ fontWeight: 'bold', width: '20px', textAlign: 'center' }}>{qty}</span>
                         <button onClick={() => toggleCart(product, 1)} style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid #e2e8f0', backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                           <Plus size={16} />
                         </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Slideout Cart */}
      {showCart && (
        <>
          <div onClick={() => setShowCart(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 40 }} />
          <div style={{ position: 'fixed', top: 0, bottom: 0, right: 0, width: '400px', maxWidth: '100%', backgroundColor: 'white', zIndex: 50, display: 'flex', flexDirection: 'column', boxShadow: '-5px 0 25px rgba(0,0,0,0.1)' }}>
             <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontWeight: 'bold', fontSize: '1.25rem' }}>Tu Pedido</h2>
                <button onClick={() => setShowCart(false)} style={{ border: 'none', background: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
             </div>
             
             <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
                {cart.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'gray', marginTop: '3rem' }}>Tu carrito está vacío</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                     {cart.map(item => (
                       <div key={item.product.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
                          <div>
                            <div style={{ fontWeight: 'bold' }}>{item.product.name}</div>
                            <div style={{ color: 'gray', fontSize: '0.85rem' }}>{formatCurrency(item.product.price)} x {item.quantity}</div>
                          </div>
                          <div style={{ fontWeight: 'bold' }}>{formatCurrency(item.product.price * item.quantity)}</div>
                       </div>
                     ))}
                  </div>
                )}

                {cart.length > 0 && (
                  <div style={{ marginTop: '2rem' }}>
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'gray', marginBottom: '0.25rem', display: 'block' }}>Tu Nombre</label>
                        <input type="text" placeholder="¿Cómo te llamas?" value={customerName} onChange={e => setCustomerName(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                    </div>
                    
                    <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'gray', marginBottom: '0.5rem', display: 'block' }}>Método de entrega</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                       {config.allowPickup && (
                         <button onClick={() => setDeliveryMode('pickup')} style={{ flex: 1, padding: '1rem', borderRadius: '8px', border: `2px solid ${deliveryMode === 'pickup' ? config.themeColor : '#e2e8f0'}`, backgroundColor: deliveryMode === 'pickup' ? '#f0fdf4' : 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                           <Store size={20} color={deliveryMode === 'pickup' ? config.themeColor : 'gray'} />
                           <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: deliveryMode === 'pickup' ? 'black' : 'gray' }}>Recoger</span>
                         </button>
                       )}
                       {config.allowDelivery && (
                         <button onClick={() => setDeliveryMode('delivery')} style={{ flex: 1, padding: '1rem', borderRadius: '8px', border: `2px solid ${deliveryMode === 'delivery' ? config.themeColor : '#e2e8f0'}`, backgroundColor: deliveryMode === 'delivery' ? '#f0fdf4' : 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                           <MapPin size={20} color={deliveryMode === 'delivery' ? config.themeColor : 'gray'} />
                           <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: deliveryMode === 'delivery' ? 'black' : 'gray' }}>A Domicilio</span>
                         </button>
                       )}
                    </div>
                  </div>
                )}
             </div>

             <div style={{ padding: '1.5rem', borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.25rem', marginBottom: '1rem' }}>
                   <span>Total</span>
                   <span>{formatCurrency(cartTotal)}</span>
                </div>
                <button 
                  onClick={handleCheckout}
                  disabled={cart.length === 0} 
                  style={{ width: '100%', padding: '1rem', backgroundColor: cart.length > 0 ? config.themeColor : '#cbd5e1', color: 'white', border: 'none', borderRadius: '50px', fontWeight: 'bold', fontSize: '1.1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', cursor: cart.length > 0 ? 'pointer' : 'not-allowed' }}>
                  <Send size={18} /> Enviar Pedido por WhatsApp
                </button>
             </div>
          </div>
        </>
      )}

    </div>
  );
}
