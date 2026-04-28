'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Save, Wand2, Search, Filter, MapPin, ArrowDownUp } from 'lucide-react';
import { createPurchaseOrder } from '@/app/actions/pedidos';
import { useOfflineSync } from '@/app/components/OfflineSyncProvider';
import ProductTableUI from '@/app/components/ProductTableUI';

export default function CrearPedidoForm({ suppliers, products, pendingRequests }: { suppliers: any[], products: any[], pendingRequests?: any[] }) {
  const router = useRouter();
  const { isOnline, pushOfflinePurchase } = useOfflineSync();
  const [supplierId, setSupplierId] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<{ productId: string, name: string, quantity: number, cost: number, requestId?: string }[]>([]);
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
    setItems([...items, { productId: product.id, name: product.name, quantity: 1, cost: product.cost }]);
  };

  const handleUpdateItem = (index: number, field: string, value: number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const generateSuggested = () => {
    const suggested: { productId: string, name: string, quantity: number, cost: number }[] = [];
    availableProducts.forEach(p => {
      // Sugeridos de compra según faltantes
      if (p.stock <= p.minStock) {
        const required = Math.max(1, p.minStock - p.stock);
        suggested.push({
          productId: p.id,
          name: p.name,
          quantity: required,
          cost: p.cost
        });
      }
    });

    // Merge suggested without duplicating existing
    const toAdd = suggested.filter(s => !items.some(i => i.productId === s.productId));
    setItems([...items, ...toAdd]);
  };

  const handleSubmit = async () => {
    if (items.length === 0) return alert('Debes agregar al menos un artículo.');
    setIsSubmitting(true);
    try {
      if (!isOnline) {
        await pushOfflinePurchase({
          supplierId: supplierId || null,
          notes,
          items,
          total
        });
        alert('Pedido guardado en modo Offline. Se sincronizará al recuperar conexión.');
      } else {
        await createPurchaseOrder(supplierId || null, notes, items, total);
      }
      router.push('/productos/pedidos');
    } catch (err: any) {
      alert('Error: ' + err.message);
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
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '300px' }}>
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
              autoFocus
            />
          </div>
          
          <select 
            value={filterCategory} 
            onChange={e => setFilterCategory(e.target.value)} 
            style={{ padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', color: '#334155', backgroundColor: 'white', minWidth: '150px', fontSize: '0.95rem', outline: 'none' }}
          >
            <option value="ALL">Todas las Categorías</option>
            {Array.from(new Set(availableProducts.map(p => p.category).filter(Boolean))).map((cat: any) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <button 
            type="button" 
            onClick={generateSuggested} 
            style={{ 
              display: 'flex', alignItems: 'center', gap: '0.5rem', 
              padding: '0.75rem 1rem', borderRadius: '8px', 
              border: '1px solid var(--pulpos-primary)', 
              backgroundColor: 'var(--pulpos-bg)', color: 'var(--pulpos-primary)', 
              fontWeight: 'bold', cursor: 'pointer', fontSize: '0.95rem' 
            }}>
            <Wand2 size={16} /> Autocompletar Faltantes
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {/* Solicitudes Pendientes */}
          {pendingRequests && pendingRequests.length > 0 && (
            <div style={{ padding: '1rem', marginBottom: '1rem', backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 'bold', color: '#b45309', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Filter size={16} /> Solicitudes Pendientes
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {pendingRequests.map((req: any) => {
                  const isAdded = items.some(i => i.requestId === req.id);
                  return (
                    <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', backgroundColor: 'white', borderRadius: '6px', border: '1px solid #fde68a' }}>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
                          {req.product ? req.product.name : <span>{req.preProductName} <span style={{fontSize:'0.7rem', color:'#ef4444'}}>(Pre-producto)</span></span>}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                          Cant: {req.quantity} | Por: {req.requestedBy?.name}
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          if (req.product) {
                            if (!isAdded) {
                              setItems([...items, { productId: req.product.id, name: req.product.name, quantity: req.quantity, cost: req.product.cost, requestId: req.id }]);
                            }
                          } else {
                            alert('Este es un "Pre-producto" que no existe en el catálogo. Por favor, asegúrate de crear el producto real en el catálogo o búscalo manualmente si ya existe, y luego agrégalo al pedido.');
                          }
                        }}
                        disabled={isAdded || !req.product}
                        className="btn-primary"
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', opacity: (isAdded || !req.product) ? 0.5 : 1 }}
                      >
                        {isAdded ? 'Agregado' : 'Añadir al pedido'}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

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
          <Save size={20} color="var(--pulpos-primary)" /> Pedido a Proveedor
        </h2>

        {/* Form Inputs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.9rem' }}>Proveedor (Opcional)</label>
            <select className="input" value={supplierId} onChange={(e) => setSupplierId(e.target.value)} style={{ width: '100%', fontSize: '0.9rem' }}>
              <option value="">-- Público en General / Sin Proveedor --</option>
              {availableSuppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.9rem' }}>Notas del Pedido</label>
            <input type="text" className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Tiempos de entrega, comentarios..." style={{ width: '100%', fontSize: '0.9rem' }} />
          </div>
        </div>

        {/* Cart Items */}
        <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1rem', paddingRight: '0.5rem' }}>
          {items.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#94a3b8', marginTop: '3rem', fontSize: '0.95rem' }}>
              No hay artículos en el pedido.
              <br/>Haz clic en un producto para agregarlo.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {items.map((item, idx) => (
                <div key={item.productId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '1rem', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ flex: 1, paddingRight: '1rem' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '0.95rem', color: '#1e293b', marginBottom: '0.25rem' }}>{item.name}</div>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#64748b' }}>TOTAL:</span>
            <span style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#1e293b' }}>
              ${total.toLocaleString('es-MX', {minimumFractionDigits: 2})}
            </span>
          </div>

          <button 
            onClick={handleSubmit}
            disabled={isSubmitting || items.length === 0} 
            className="btn-primary" 
            style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
          >
            {isSubmitting ? 'Guardando...' : 'Crear Pedido'}
          </button>
        </div>
      </div>
    </div>
  )
}

