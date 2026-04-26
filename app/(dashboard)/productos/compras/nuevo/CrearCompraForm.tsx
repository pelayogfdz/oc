'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Save, ShoppingBag, Image as ImageIcon, Search, Filter } from 'lucide-react';
import { createPurchase } from '@/app/actions/purchase';
import { useOfflineSync } from '@/app/components/OfflineSyncProvider';
import ProductTableUI from '@/app/components/ProductTableUI';

export default function CrearCompraForm({ suppliers, products }: { suppliers: any[], products: any[] }) {
  const router = useRouter();
  const { isOnline, pushOfflinePurchase } = useOfflineSync();
  const [supplierId, setSupplierId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [freightCost, setFreightCost] = useState(0);
  const [items, setItems] = useState<{ productId: string, name: string, quantity: number, cost: number, imageUrl?: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [availableProducts, setAvailableProducts] = useState(products || []);
  const [availableSuppliers, setAvailableSuppliers] = useState(suppliers || []);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filterCategory, setFilterCategory] = useState('ALL');

  useEffect(() => {
    if (!isOnline) {
      import('@/lib/offlineDB').then(({ db }) => {
        db.products.toArray().then(res => setAvailableProducts(res.length ? res : products));
        db.suppliers.toArray().then(res => setAvailableSuppliers(res.length ? res : suppliers));
      });
    } else {
      setAvailableProducts(products);
      setAvailableSuppliers(suppliers);
    }
  }, [isOnline, products, suppliers]);

  const total = items.reduce((sum, item) => sum + (item.quantity * item.cost), 0);

  const handleAddItem = (product: any) => {
    if(!product || !product.id) return;
    if(items.some(i => i.productId === product.id)) return;
    setItems([...items, { productId: product.id, name: product.name, quantity: 1, cost: product.cost, imageUrl: product.imageUrl }]);
  };

  const handleUpdateItem = (index: number, field: string, value: number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = async () => {
    if (items.length === 0) return alert('Debes agregar al menos un artículo.');
    if (paymentMethod === 'CREDIT' && !supplierId) return alert('Debes seleccionar un proveedor para compras a crédito.');

    setIsSubmitting(true);
    try {
      if (!isOnline) {
        await pushOfflinePurchase({
          isDirectPurchase: true,
          supplierId: supplierId || null,
          paymentMethod,
          freightCost,
          items,
          total
        });
        alert('Compra guardada en modo Offline. Se sincronizará al recuperar conexión.');
      } else {
        await createPurchase(items, total, paymentMethod, supplierId || null, freightCost);
      }
      router.push('/productos/compras');
    } catch (err: any) {
      alert('Error al registrar compra: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter products based on search term and category
  const filteredProducts = availableProducts.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (p.barcode && p.barcode.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = filterCategory === 'ALL' || p.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div style={{ display: 'flex', gap: '2rem', height: 'calc(100vh - 200px)' }}>
      {/* Left: Products */}
      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        {/* Toolbar */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center' }}>
          <div style={{ position: 'relative', flexGrow: 1, maxWidth: '500px' }}>
            <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              placeholder="Buscar por nombre, SKU o código de barras" 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ 
                padding: '0.6rem 1rem 0.6rem 2.5rem', 
                width: '100%', 
                borderRadius: '8px', 
                border: '1px solid #e2e8f0', 
                backgroundColor: 'white', 
                fontSize: '0.95rem',
                outline: 'none'
              }}
              autoFocus
            />
          </div>
          
          <button 
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '0.5rem', 
              backgroundColor: showAdvancedFilters ? '#f1f5f9' : 'white', 
              border: '1px solid #e2e8f0', 
              padding: '0.6rem 1rem', 
              borderRadius: '8px', 
              fontWeight: '500', 
              cursor: 'pointer',
              fontSize: '0.95rem'
            }}>
            <Filter size={16} /> Filtrar
          </button>
        </div>

        {/* Advanced Filters Panel */}
        {showAdvancedFilters && (
          <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#64748b' }}>Categoría</label>
              <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #e2e8f0', minWidth: '150px' }}>
                <option value="ALL">Todas</option>
                {Array.from(new Set(availableProducts.map(p => p.category).filter(Boolean))).map((cat: any) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto' }}>
          <ProductTableUI 
            products={filteredProducts}
            showCheckboxes={false}
            onRowClick={handleAddItem}
            priceExtractor={(p) => p.cost}
          />
        </div>
      </div>

      {/* Right: Cart & Form */}
      <div className="card" style={{ width: '400px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ShoppingBag size={20} color="var(--pulpos-primary)" /> Ingresar Compra
        </h2>

        {/* Form Inputs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.9rem' }}>Proveedor (Opcional)</label>
            <select className="input" value={supplierId} onChange={(e) => setSupplierId(e.target.value)} style={{ width: '100%', fontSize: '0.9rem' }}>
              <option value="">-- Público en General / Sin Proveedor --</option>
              {availableSuppliers.map(s => <option key={s.id} value={s.id}>{s.name} {s.creditLimit ? `(Crédito Autorizado: $${s.creditLimit})` : ''}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.9rem' }}>Forma de Pago</label>
            <select className="input" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} style={{ width: '100%', fontSize: '0.9rem' }}>
              <option value="CASH">Efectivo</option>
              <option value="TRANSFER">Transferencia</option>
              <option value="CARD">Tarjeta (Débito/Crédito)</option>
              <option value="CREDIT">Crédito CxP (Pendiente de Pago)</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.9rem' }}>Costo de Fletes / Envíos</label>
            <div style={{ display: 'flex', alignItems: 'center' }}>
               <span style={{ padding: '0.4rem 0.6rem', backgroundColor: 'var(--pulpos-bg)', border: '1px solid var(--pulpos-border)', borderRight: 'none', borderRadius: '4px 0 0 4px', color: 'var(--pulpos-text-muted)' }}>$</span>
               <input type="number" step="0.01" min="0" className="input" value={freightCost} onChange={(e) => setFreightCost(parseFloat(e.target.value) || 0)} style={{ width: '100%', borderRadius: '0 4px 4px 0', fontSize: '0.9rem' }} />
            </div>
          </div>
        </div>

        {/* Cart Items */}
        <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1rem', paddingRight: '0.5rem' }}>
          {items.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#94a3b8', marginTop: '3rem', fontSize: '0.95rem' }}>
              No hay artículos en la compra.
              <br/>Haz clic en un producto para agregarlo.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {items.map((item, idx) => (
                <div key={item.productId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '1rem', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ flex: 1, paddingRight: '1rem' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '0.95rem', color: '#1e293b', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ width: '24px', height: '24px', backgroundColor: '#f1f5f9', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                         {item.imageUrl ? <img src={item.imageUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <ImageIcon size={12} color="#94a3b8" />}
                      </div>
                      {item.name}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input 
                        type="number" 
                        step="1" 
                        min="1" 
                        className="input" 
                        value={item.quantity} 
                        onChange={(e) => handleUpdateItem(idx, 'quantity', parseInt(e.target.value) || 1)} 
                        style={{ width: '60px', padding: '0.25rem 0.5rem', fontSize: '0.9rem' }} 
                      />
                      <span style={{ fontSize: '0.9rem', color: '#64748b' }}>x</span>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.9rem', color: '#64748b' }}>$</span>
                        <input 
                          type="number" 
                          step="0.01" 
                          className="input" 
                          value={item.cost} 
                          onChange={(e) => handleUpdateItem(idx, 'cost', parseFloat(e.target.value) || 0)} 
                          style={{ width: '80px', padding: '0.25rem 0.5rem 0.25rem 1.5rem', fontSize: '0.9rem' }} 
                        />
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 'bold', color: 'var(--pulpos-primary)', fontSize: '1.05rem' }}>
                      ${(item.quantity * item.cost).toLocaleString('es-MX', {minimumFractionDigits:2})}
                    </span>
                    <button onClick={() => setItems(items.filter((_, i) => i !== idx))} style={{ color: '#ef4444', backgroundColor: '#fef2f2', border: 'none', borderRadius: '4px', padding: '0.25rem', cursor: 'pointer' }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Totals & Submit */}
        <div style={{ marginTop: 'auto', paddingTop: '1.5rem', borderTop: '1px dashed #cbd5e1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.9rem', color: '#64748b' }}>Subtotal:</span>
            <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#1e293b' }}>
              ${total.toLocaleString('es-MX', {minimumFractionDigits: 2})}
            </span>
          </div>
          {freightCost > 0 && (
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
               <span style={{ fontSize: '0.9rem', color: '#64748b' }}>Fletes (+):</span>
               <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#1e293b' }}>
                 ${freightCost.toLocaleString('es-MX', {minimumFractionDigits: 2})}
               </span>
             </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingTop: '0.5rem', borderTop: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#64748b' }}>TOTAL:</span>
            <span style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#1e293b' }}>
              ${(total + freightCost).toLocaleString('es-MX', {minimumFractionDigits: 2})}
            </span>
          </div>

          <button 
            onClick={handleSubmit}
            disabled={isSubmitting || items.length === 0} 
            className="btn-primary" 
            style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
          >
            {isSubmitting ? 'Guardando...' : 'Ingresar Compra'}
          </button>
        </div>
      </div>
    </div>
  )
}
