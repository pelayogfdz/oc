'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, ShoppingBag, Search, Filter, Plus, Minus, FileText, CheckCircle2 } from 'lucide-react';
import { createPurchase } from '@/app/actions/purchase';
import { useOfflineSync } from '@/app/components/OfflineSyncProvider';

export default function CrearCompraForm({ suppliers, products, branchId }: { suppliers: any[], products: any[], branchId: string }) {
  const router = useRouter();
  const { isOnline, pushOfflinePurchase } = useOfflineSync();
  const [supplierId, setSupplierId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [freightCost, setFreightCost] = useState(0);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<{ productId: string, name: string, quantity: number, cost: number, imageUrl?: string, batchNumber?: string, expirationDate?: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [isMounted, setIsMounted] = useState(false);

  // States for purchase on hold
  const [onHoldPurchases, setOnHoldPurchases] = useState<any[]>([]);

  // Search dropdown states
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const [availableProducts, setAvailableProducts] = useState(products || []);
  const [availableSuppliers, setAvailableSuppliers] = useState(suppliers || []);

  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`caanma_on_hold_purchases_${branchId}`);
      if (stored) {
        try {
          setOnHoldPurchases(JSON.parse(stored));
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
      alert('La compra actual no tiene artículos.');
      return;
    }
    const name = prompt('Asigna un nombre o identificador para esta compra en espera (opcional):', `Compra #${onHoldPurchases.length + 1}`);
    if (name === null) return; // user cancelled

    const newPurchase = {
      id: Date.now().toString(),
      name: name.trim() || `Compra #${onHoldPurchases.length + 1}`,
      items,
      supplierId,
      paymentMethod,
      freightCost,
      notes,
      total,
      timestamp: new Date().toLocaleString(),
    };

    const updated = [newPurchase, ...onHoldPurchases];
    setOnHoldPurchases(updated);
    localStorage.setItem(`caanma_on_hold_purchases_${branchId}`, JSON.stringify(updated));

    // Clear current fields
    setItems([]);
    setSupplierId('');
    setPaymentMethod('CASH');
    setFreightCost(0);
    setNotes('');
    alert('Compra guardada en espera.');
  };

  const handleRestorePurchase = (purchase: any) => {
    if (items.length > 0) {
      const confirmMerge = confirm('Tienes artículos en la compra actual. ¿Deseas reemplazar la compra actual con la seleccionada en espera?');
      if (!confirmMerge) return;
    }

    setItems(purchase.items);
    setSupplierId(purchase.supplierId || '');
    setPaymentMethod(purchase.paymentMethod || 'CASH');
    setFreightCost(purchase.freightCost || 0);
    setNotes(purchase.notes || '');

    // Remove from list
    const updated = onHoldPurchases.filter(p => p.id !== purchase.id);
    setOnHoldPurchases(updated);
    localStorage.setItem(`caanma_on_hold_purchases_${branchId}`, JSON.stringify(updated));
  };

  const handleDeleteOnHold = (purchaseId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta compra en espera?')) return;
    const updated = onHoldPurchases.filter(p => p.id !== purchaseId);
    setOnHoldPurchases(updated);
    localStorage.setItem(`caanma_on_hold_purchases_${branchId}`, JSON.stringify(updated));
  };

  const total = items.reduce((sum, item) => sum + (item.quantity * item.cost), 0);

  const handleAddItem = (product: any) => {
    if (!product || !product.id) return;
    if (items.some(i => i.productId === product.id)) return;
    setItems([...items, { productId: product.id, name: product.name, quantity: 1, cost: product.cost, imageUrl: product.imageUrl }]);
  };

  const handleUpdateItem = (index: number, field: string, value: any) => {
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

      if (confirm('Compra registrada con éxito. ¿Deseas imprimir etiquetas para los productos ingresados?')) {
        const ids = items.map(i => i.productId).join(',');
        const qtys = items.map(i => i.quantity).join(',');
        window.open(`/productos/etiquetas?ids=${ids}&qtys=${qtys}`, '_blank', 'width=400,height=600');
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
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '1rem 0' }}>
      
      {/* HEADER SECTION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}>
            <ShoppingBag size={28} color="#a78bfa" /> Registro de Compras
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Ingresa productos al inventario registrando costos, lotes y caducidades.
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#64748b', marginBottom: '0.5rem' }}>Proveedor (Opcional)</label>
            <select className="input" value={supplierId} onChange={(e) => setSupplierId(e.target.value)} style={{ width: '100%', fontSize: '0.9rem', height: '42px', borderRadius: '8px' }}>
              <option value="">-- Público en General / Sin Proveedor --</option>
              {availableSuppliers.map(s => <option key={s.id} value={s.id}>{s.name} {s.creditLimit ? `(Crédito: $${s.creditLimit})` : ''}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#64748b', marginBottom: '0.5rem' }}>Forma de Pago</label>
            <select className="input" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} style={{ width: '100%', fontSize: '0.9rem', height: '42px', borderRadius: '8px' }}>
              <option value="CASH">Efectivo</option>
              <option value="TRANSFER">Transferencia</option>
              <option value="CARD">Tarjeta (Débito/Crédito)</option>
              <option value="CREDIT">Crédito CxP (Pendiente de Pago)</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#64748b', marginBottom: '0.5rem' }}>Costo de Flete / Envíos</label>
            <div style={{ display: 'flex', alignItems: 'center', height: '42px' }}>
               <span style={{ padding: '0.55rem 0.75rem', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRight: 'none', borderRadius: '8px 0 0 8px', color: '#64748b', fontSize: '0.9rem' }}>$</span>
               <input type="number" step="0.01" min="0" className="input" value={freightCost || ''} onChange={(e) => setFreightCost(parseFloat(e.target.value) || 0)} style={{ width: '100%', borderRadius: '0 8px 8px 0', fontSize: '0.9rem', height: '42px' }} placeholder="0.00" />
            </div>
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
                            SKU: {p.sku || 'S/N'} | Categoría: {p.category || 'General'}
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
          
          <button 
            type="button"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '0.5rem', 
              backgroundColor: showAdvancedFilters ? '#f1f5f9' : 'white', 
              border: '1px solid #cbd5e1', 
              padding: '0.75rem 1.25rem', 
              borderRadius: '8px', 
              fontWeight: '600', 
              cursor: 'pointer',
              fontSize: '0.95rem',
              height: '46px',
              transition: 'background-color 0.2s'
            }}>
            <Filter size={16} /> {showAdvancedFilters ? 'Ocultar Filtros' : 'Filtrar'}
          </button>
        </div>

        {/* ADVANCED FILTERS PANEL */}
        {showAdvancedFilters && (
          <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', marginTop: '1rem', border: '1px solid #e2e8f0', display: 'flex', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#64748b' }}>Categoría de Búsqueda</label>
              <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} style={{ padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', minWidth: '160px' }}>
                <option value="ALL">Todas las Categorías</option>
                {Array.from(new Set(availableProducts.map(p => p.category).filter(Boolean))).map((cat: any) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* HORIZONTAL BROWSER TABS FOR PURCHASES ON HOLD */}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1.5rem', paddingBottom: '0.5rem' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#64748b', marginRight: '0.5rem' }}>Borradores en Espera:</span>
        {onHoldPurchases.length === 0 ? (
          <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>No hay compras pendientes</span>
        ) : (
          onHoldPurchases.map((purchase) => (
            <div key={purchase.id} style={{ display: 'flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
              <button
                type="button"
                onClick={() => handleRestorePurchase(purchase)}
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
                title={`Cargar ${purchase.name}`}
              >
                {purchase.name}
              </button>
              <button
                type="button"
                onClick={() => handleDeleteOnHold(purchase.id)}
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
        
        {/* LEFT COLUMN: SHOPPING CART LIST (70% width) */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#1e293b', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Lista de Artículos a Ingresar ({items.length})
          </h3>

          {items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 2rem', color: '#94a3b8', border: '2px dashed #e2e8f0', borderRadius: '12px' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🛒</div>
              <div style={{ fontWeight: 'bold', fontSize: '1.05rem', color: '#64748b' }}>No hay artículos agregados</div>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                Utiliza el buscador de la parte superior para añadir productos a esta compra.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {items.map((item, idx) => (
                <div key={item.productId} style={{ display: 'grid', gridTemplateColumns: '40px 1fr auto auto auto', gap: '1rem', alignItems: 'center', padding: '1rem', border: '1px solid #f1f5f9', borderRadius: '10px', backgroundColor: '#f8fafc' }}>
                  
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
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.1rem' }}>
                      PRODUCT ID: {item.productId.substring(0, 8)}
                    </div>
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

                  {/* Dynamic inputs: Cost, Batch (Lote) & Expiration (Caducidad) */}
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {/* Cost field */}
                    <div style={{ position: 'relative', width: '90px' }}>
                      <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.85rem', color: '#64748b' }}>$</span>
                      <input 
                        type="number" 
                        step="0.01" 
                        min="0"
                        value={item.cost} 
                        onChange={(e) => handleUpdateItem(idx, 'cost', parseFloat(e.target.value) || 0)} 
                        style={{ width: '100%', height: '32px', padding: '0 0.5rem 0 1.25rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', outline: 'none', textAlign: 'right' }} 
                        title="Costo Unitario de Compra"
                      />
                    </div>
                    {/* Batch field */}
                    <input 
                      type="text" 
                      placeholder="Lote" 
                      value={item.batchNumber || ''} 
                      onChange={(e) => handleUpdateItem(idx, 'batchNumber', e.target.value)} 
                      style={{ width: '80px', height: '32px', padding: '0 0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.8rem', outline: 'none' }} 
                      title="Número de Lote"
                    />
                    {/* Expiration date */}
                    <input 
                      type="date" 
                      value={item.expirationDate || ''} 
                      onChange={(e) => handleUpdateItem(idx, 'expirationDate', e.target.value)} 
                      style={{ width: '115px', height: '32px', padding: '0 0.25rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.8rem', outline: 'none' }} 
                      title="Fecha de Caducidad"
                    />
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

        {/* RIGHT COLUMN: SUMMARY & SUBMIT (30% width) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Notes area */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={16} color="#64748b" /> Observaciones de la Compra
            </h4>
            <textarea
              className="input"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Escribe comentarios, número de factura o referencias aquí..."
              style={{ width: '100%', height: '80px', fontSize: '0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0.5rem', resize: 'none', outline: 'none' }}
            />
          </div>

          {/* Pricing Summary card */}
          <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            
            <div style={{ textAlign: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Compra</div>
              <div style={{ fontSize: '2.4rem', fontWeight: '800', color: '#1e293b', marginTop: '0.5rem' }}>
                ${(total + freightCost).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: '#64748b' }}>Importe Artículos:</span>
                <span style={{ color: '#334155', fontWeight: '600' }}>${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: '#64748b' }}>Fletes y Envíos (+):</span>
                <span style={{ color: '#334155', fontWeight: '600' }}>${freightCost.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
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
                  Ingresar Compra
                </>
              )}
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
