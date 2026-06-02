'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Save, Wand2, Search, Filter, Plus, Minus, FileText, CheckCircle2, AlertTriangle } from 'lucide-react';
import { createPurchaseOrder } from '@/app/actions/pedidos';
import { useOfflineSync } from '@/app/components/OfflineSyncProvider';

export default function CrearPedidoForm({ suppliers, products, pendingRequests, branchId }: { suppliers: any[], products: any[], pendingRequests?: any[], branchId: string }) {
  const router = useRouter();
  const { isOnline, pushOfflinePurchase } = useOfflineSync();
  const [supplierId, setSupplierId] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<{ productId: string, name: string, quantity: number, cost: number, requestId?: string, imageUrl?: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [isMounted, setIsMounted] = useState(false);

  // States for order on hold
  const [onHoldOrders, setOnHoldOrders] = useState<any[]>([]);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const [availableProducts, setAvailableProducts] = useState(products || []);
  const [availableSuppliers, setAvailableSuppliers] = useState(suppliers || []);

  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`caanma_on_hold_orders_${branchId}`);
      if (stored) {
        try {
          setOnHoldOrders(JSON.parse(stored));
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, [branchId]);

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

  const handlePutOnHold = () => {
    if (items.length === 0) {
      alert('El pedido actual no tiene artículos.');
      return;
    }
    const name = prompt('Asigna un nombre o identificador para este pedido en espera (opcional):', `Pedido #${onHoldOrders.length + 1}`);
    if (name === null) return; // user cancelled

    const newOrder = {
      id: Date.now().toString(),
      name: name.trim() || `Pedido #${onHoldOrders.length + 1}`,
      items,
      supplierId,
      notes,
      total,
      timestamp: new Date().toLocaleString(),
    };

    const updated = [newOrder, ...onHoldOrders];
    setOnHoldOrders(updated);
    localStorage.setItem(`caanma_on_hold_orders_${branchId}`, JSON.stringify(updated));

    // Clear current fields
    setItems([]);
    setSupplierId('');
    setNotes('');
    alert('Pedido guardado en espera.');
  };

  const handleRestoreOrder = (order: any) => {
    if (items.length > 0) {
      const confirmMerge = confirm('Tienes artículos en el pedido actual. ¿Deseas reemplazar el pedido actual con el seleccionado en espera?');
      if (!confirmMerge) return;
    }

    setItems(order.items);
    setSupplierId(order.supplierId || '');
    setNotes(order.notes || '');

    // Remove from list
    const updated = onHoldOrders.filter(o => o.id !== order.id);
    setOnHoldOrders(updated);
    localStorage.setItem(`caanma_on_hold_orders_${branchId}`, JSON.stringify(updated));
  };

  const handleDeleteOnHold = (orderId: string) => {
    if (!confirm('¿Estás seguro de eliminar este pedido en espera?')) return;
    const updated = onHoldOrders.filter(o => o.id !== orderId);
    setOnHoldOrders(updated);
    localStorage.setItem(`caanma_on_hold_orders_${branchId}`, JSON.stringify(updated));
  };

  const total = items.reduce((sum, item) => sum + (item.quantity * item.cost), 0);

  const handleAddItem = (product: any) => {
    if (!product || !product.id) return;
    if (items.some(i => i.productId === product.id)) return;
    setItems([...items, { productId: product.id, name: product.name, quantity: 1, cost: product.cost, imageUrl: product.imageUrl }]);
  };

  const handleUpdateItem = (index: number, field: string, value: number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const generateSuggested = () => {
    const suggested: { productId: string, name: string, quantity: number, cost: number, imageUrl?: string }[] = [];
    availableProducts.forEach(p => {
      if (p.stock <= p.minStock) {
        const required = Math.max(1, p.minStock - p.stock);
        suggested.push({
          productId: p.id,
          name: p.name,
          quantity: required,
          cost: p.cost,
          imageUrl: p.imageUrl
        });
      }
    });

    const toAdd = suggested.filter(s => !items.some(i => i.productId === s.productId));
    if (toAdd.length === 0) {
      alert('No se encontraron productos con stock menor o igual al mínimo para sugerir.');
      return;
    }
    setItems([...items, ...toAdd]);
    alert(`Se agregaron ${toAdd.length} productos sugeridos por bajo stock.`);
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

  const filteredProducts = availableProducts.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (p.barcode && p.barcode.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = filterCategory === 'ALL' || p.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '1rem 0' }}>
      
      {/* HEADER SECTION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}>
            <Save size={28} color="#a78bfa" /> Pedido a Proveedor
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Genera órdenes de compra o cotizaciones formales para enviar a tus proveedores.
          </p>
        </div>
        {!isOnline && (
          <div style={{ backgroundColor: '#ffedd5', color: '#c2410c', padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.85rem' }}>
            Modo Desconectado (Offline)
          </div>
        )}
      </div>

      {/* TOP CONFIGURATION ROW & SEARCH */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem', position: 'relative' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#64748b', marginBottom: '0.5rem' }}>Proveedor (Opcional)</label>
            <select className="input" value={supplierId} onChange={(e) => setSupplierId(e.target.value)} style={{ width: '100%', fontSize: '0.9rem', height: '42px', borderRadius: '8px' }}>
              <option value="">-- Público en General / Sin Proveedor --</option>
              {availableSuppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#64748b', marginBottom: '0.5rem' }}>Notas del Pedido</label>
            <input type="text" className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Tiempos de entrega, condiciones comerciales, referencias..." style={{ width: '100%', fontSize: '0.9rem', height: '42px', borderRadius: '8px' }} />
          </div>
        </div>

        {/* SEARCH INPUT BAR */}
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', position: 'relative' }}>
          <div style={{ position: 'relative', flexGrow: 1 }}>
            <Search size={20} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              placeholder="Buscar producto por nombre, SKU o código de barras para añadir..." 
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                setShowSearchDropdown(true);
              }}
              onFocus={() => setShowSearchDropdown(true)}
              style={{ 
                padding: '0.75rem 1rem 0.75rem 2.8rem', 
                width: '100%', 
                borderRadius: '8px', 
                border: '1px solid #cbd5e1', 
                backgroundColor: 'white', 
                fontSize: '1rem',
                outline: 'none',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)',
                transition: 'border-color 0.2s'
              }}
            />

            {/* FLOATING SEARCH DROPDOWN */}
            {showSearchDropdown && searchTerm.trim() !== '' && (
              <>
                <div 
                  onClick={() => setShowSearchDropdown(false)}
                  style={{ position: 'fixed', inset: 0, zIndex: 40, backgroundColor: 'transparent' }}
                />
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: 'white',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                  zIndex: 50,
                  maxHeight: '320px',
                  overflowY: 'auto',
                  marginTop: '0.5rem'
                }}>
                  {filteredProducts.length === 0 ? (
                    <div style={{ padding: '1.25rem', color: '#64748b', textAlign: 'center', fontSize: '0.95rem' }}>
                      No se encontraron productos coincidentes
                    </div>
                  ) : (
                    filteredProducts.slice(0, 15).map(p => (
                      <div
                        key={p.id}
                        onClick={() => {
                          handleAddItem(p);
                          setSearchTerm('');
                          setShowSearchDropdown(false);
                        }}
                        style={{
                          padding: '0.75rem 1.25rem',
                          borderBottom: '1px solid #f1f5f9',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          transition: 'background-color 0.15s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '0.95rem', color: '#1e293b' }}>{p.name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
                            SKU: {p.sku || 'S/N'} | Stock actual: {p.stock}
                          </div>
                        </div>
                        <div style={{ fontWeight: 'bold', color: '#8b5cf6', fontSize: '0.95rem' }}>
                          Costo: ${p.cost ? p.cost.toFixed(2) : '0.00'}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
          
          <select 
            value={filterCategory} 
            onChange={e => setFilterCategory(e.target.value)} 
            style={{ padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', color: '#334155', backgroundColor: 'white', minWidth: '160px', fontSize: '0.95rem', outline: 'none', height: '46px' }}
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
              padding: '0.75rem 1.25rem', borderRadius: '8px', 
              border: '1px solid #8b5cf6', 
              backgroundColor: '#f3e8ff', color: '#8b5cf6', 
              fontWeight: 'bold', cursor: 'pointer', fontSize: '0.95rem',
              height: '46px',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#e9d5ff'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#f3e8ff'}
          >
            <Wand2 size={16} /> Autocompletar Faltantes
          </button>
        </div>
      </div>

      {/* HORIZONTAL BROWSER TABS FOR ORDERS ON HOLD */}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1.5rem', paddingBottom: '0.5rem' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#64748b', marginRight: '0.5rem' }}>Pedidos en Espera:</span>
        {onHoldOrders.length === 0 ? (
          <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>No hay pedidos pendientes</span>
        ) : (
          onHoldOrders.map((order) => (
            <div key={order.id} style={{ display: 'flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
              <button
                type="button"
                onClick={() => handleRestoreOrder(order)}
                style={{
                  padding: '0.4rem 0.8rem',
                  border: 'none',
                  backgroundColor: 'white',
                  color: '#475569',
                  fontSize: '0.8rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}
                title={`Cargar ${order.name}`}
              >
                {order.name}
              </button>
              <button
                type="button"
                onClick={() => handleDeleteOnHold(order.id)}
                style={{
                  padding: '0.4rem 0.6rem',
                  border: 'none',
                  borderLeft: '1px solid #cbd5e1',
                  backgroundColor: '#fee2e2',
                  color: '#ef4444',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background-color 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fecaca'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#fee2e2'}
                title="Eliminar borrador"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))
        )}
        <button 
          type="button"
          onClick={handlePutOnHold}
          style={{
            padding: '0.4rem 0.8rem',
            border: '1px dashed #8b5cf6',
            borderRadius: '6px',
            backgroundColor: 'transparent',
            color: '#8b5cf6',
            fontSize: '0.8rem',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            marginLeft: 'auto',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f3e8ff'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          ⏸️ Guardar en Espera
        </button>
      </div>

      {/* MAIN TWO-COLUMN BODY LAYOUT */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* LEFT COLUMN: PENDING REQUESTS & ORDER ITEMS (70% width) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* PENDING BRANCH REQUESTS INTEGRATION */}
          {pendingRequests && pendingRequests.length > 0 && (
            <div className="card" style={{ padding: '1.25rem', backgroundColor: '#fffbeb', border: '1px solid #fde68a' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 'bold', color: '#b45309', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <AlertTriangle size={18} color="#d97706" /> Solicitudes de Traspaso Interno Pendientes
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#78350f', marginTop: '0.25rem', marginBottom: '1rem' }}>
                Otras sucursales han solicitado estos artículos. Puedes agregarlos directamente a este pedido a proveedor:
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
                {pendingRequests.map((req: any) => {
                  const isAdded = items.some(i => i.requestId === req.id);
                  return (
                    <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #fde68a' }}>
                      <div style={{ minWidth: 0, paddingRight: '0.5rem' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {req.product ? req.product.name : <span>{req.preProductName} <span style={{ fontSize: '0.7rem', color: '#ef4444' }}>(Pre-producto)</span></span>}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.1rem' }}>
                          Cantidad: {req.quantity} | Por: {req.requestedBy?.name || 'Sucursal'}
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => {
                          if (req.product) {
                            if (!isAdded) {
                              setItems([...items, { productId: req.product.id, name: req.product.name, quantity: req.quantity, cost: req.product.cost, requestId: req.id, imageUrl: req.product.imageUrl }]);
                            }
                          } else {
                            alert('Este es un "Pre-producto" que no existe en el catálogo. Por favor, asegúrate de crear el producto real en el catálogo o búscalo manualmente si ya existe, y luego agrégalo al pedido.');
                          }
                        }}
                        disabled={isAdded || !req.product}
                        style={{
                          padding: '0.4rem 0.75rem',
                          fontSize: '0.8rem',
                          fontWeight: 'bold',
                          borderRadius: '6px',
                          border: 'none',
                          backgroundColor: isAdded ? '#f1f5f9' : '#8b5cf6',
                          color: isAdded ? '#94a3b8' : 'white',
                          cursor: (isAdded || !req.product) ? 'not-allowed' : 'pointer',
                          transition: 'background-color 0.2s'
                        }}
                      >
                        {isAdded ? 'Agregado' : 'Añadir'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ORDER ITEMS CART */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#1e293b', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              Artículos en el Pedido ({items.length})
            </h3>

            {items.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem 2rem', color: '#94a3b8', border: '2px dashed #e2e8f0', borderRadius: '12px' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📦</div>
                <div style={{ fontWeight: 'bold', fontSize: '1.05rem', color: '#64748b' }}>No hay artículos en el pedido</div>
                <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                  Busca productos en la barra superior o usa el botón de Autocompletar Faltantes.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {items.map((item, idx) => (
                  <div key={item.productId} style={{ display: 'grid', gridTemplateColumns: '40px 1fr auto auto auto', gap: '1.25rem', alignItems: 'center', padding: '1rem', border: '1px solid #f1f5f9', borderRadius: '10px', backgroundColor: '#f8fafc' }}>
                    
                    {/* Initials avatar badge */}
                    <div style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6', fontWeight: 'bold', fontSize: '0.8rem', overflow: 'hidden', position: 'relative' }}>
                      <span>{item.name.substring(0, 2).toUpperCase()}</span>
                      {isMounted && item.imageUrl && !imageErrors[item.productId] && (
                        <img 
                          src={item.imageUrl.replace(/#/g, '%23')} 
                          alt="" 
                          onError={() => setImageErrors(prev => ({ ...prev, [item.productId]: true }))}
                          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} 
                        />
                      )}
                    </div>

                    {/* Name and SKU */}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 'bold', fontSize: '0.95rem', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.name}>
                        {item.name}
                      </div>
                      {item.requestId && (
                        <span style={{ display: 'inline-block', backgroundColor: '#fef3c7', color: '#d97706', fontSize: '0.7rem', fontWeight: 'bold', padding: '0.1rem 0.4rem', borderRadius: '4px', marginTop: '0.2rem' }}>
                          Solicitud Traspaso
                        </span>
                      )}
                    </div>

                    {/* Quantity with +/- selectors */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <button
                        type="button"
                        onClick={() => handleUpdateItem(idx, 'quantity', Math.max(1, item.quantity - 1))}
                        style={{ border: '1px solid #cbd5e1', background: 'white', borderRadius: '6px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background-color 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}
                      >
                        <Minus size={14} color="#64748b" />
                      </button>
                      <input 
                        type="number" 
                        min="1" 
                        value={item.quantity}
                        onChange={(e) => handleUpdateItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                        style={{ width: '50px', height: '32px', textAlign: 'center', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem', outline: 'none' }}
                      />
                      <button
                        type="button"
                        onClick={() => handleUpdateItem(idx, 'quantity', item.quantity + 1)}
                        style={{ border: '1px solid #cbd5e1', background: 'white', borderRadius: '6px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background-color 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}
                      >
                        <Plus size={14} color="#64748b" />
                      </button>
                    </div>

                    {/* Cost field */}
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <div style={{ position: 'relative', width: '100px' }}>
                        <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.85rem', color: '#64748b' }}>$</span>
                        <input 
                          type="number" 
                          step="0.01" 
                          min="0"
                          value={item.cost} 
                          onChange={(e) => handleUpdateItem(idx, 'cost', parseFloat(e.target.value) || 0)} 
                          style={{ width: '100%', height: '32px', padding: '0 0.5rem 0 1.25rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', outline: 'none', textAlign: 'right' }} 
                        />
                      </div>
                    </div>

                    {/* Subtotal & Delete action */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: '120px', justifyContent: 'flex-end' }}>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}>Subtotal</span>
                        <span style={{ fontWeight: 'bold', color: '#1e293b', fontSize: '0.95rem' }}>
                          ${(item.quantity * item.cost).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setItems(items.filter((_, i) => i !== idx))} 
                        style={{ color: '#ef4444', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background-color 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fee2e2'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = '#fef2f2'}
                        title="Eliminar artículo"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: SUMMARY & SUBMIT (30% width) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Notes area */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={16} color="#64748b" /> Comentarios Adicionales
            </h4>
            <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.5rem' }}>
              Estas notas se guardarán adjuntas al pedido para futuras auditorías o consultas.
            </div>
            <textarea
              className="input"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Instrucciones especiales para el proveedor, fecha límite esperada..."
              style={{ width: '100%', height: '100px', fontSize: '0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0.5rem', resize: 'none', outline: 'none' }}
            />
          </div>

          {/* Pricing Summary card */}
          <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Pedido</div>
              <div style={{ fontSize: '2.4rem', fontWeight: '800', color: '#1e293b', marginTop: '0.5rem' }}>
                ${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <button 
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || items.length === 0} 
              style={{
                width: '100%',
                padding: '1.1rem',
                borderRadius: '10px',
                backgroundColor: '#a78bfa', // Premium lavender
                color: 'white',
                border: 'none',
                fontSize: '1.1rem',
                fontWeight: '800',
                cursor: (isSubmitting || items.length === 0) ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 14px rgba(167, 139, 250, 0.35)',
                transition: 'background-color 0.2s, transform 0.1s',
                opacity: (isSubmitting || items.length === 0) ? 0.6 : 1,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '0.5rem'
              }}
              onMouseEnter={e => {
                if (!isSubmitting && items.length > 0) e.currentTarget.style.backgroundColor = '#8b5cf6';
              }}
              onMouseLeave={e => {
                if (!isSubmitting && items.length > 0) e.currentTarget.style.backgroundColor = '#a78bfa';
              }}
            >
              {isSubmitting ? (
                'Guardando...'
              ) : (
                <>
                  <CheckCircle2 size={20} />
                  Crear Pedido
                </>
              )}
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
