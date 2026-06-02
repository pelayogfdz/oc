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
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
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

      {/* TOP ROW: Search trigger & Supplier configurations */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1.5rem', padding: '1rem 0', marginBottom: '1.5rem', width: '100%', flexWrap: 'wrap', borderBottom: '1px solid #e2e8f0' }}>
        
        {/* Left Side: Search Trigger & Search filters */}
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap', flex: 1, minWidth: '300px' }}>
          
          {/* SEARCH INPUT TRIGGER (opens popup) */}
          <div style={{ display: 'flex', flexDirection: 'column', width: '280px' }}>
            <div 
              onClick={() => setIsSearchModalOpen(true)}
              style={{ 
                display: 'flex',
                alignItems: 'center',
                padding: '0.65rem 1rem', 
                borderRadius: '8px', 
                border: '1px solid #cbd5e1', 
                backgroundColor: 'white', 
                fontSize: '0.95rem',
                cursor: 'pointer',
                color: '#94a3b8',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                userSelect: 'none',
                position: 'relative',
                height: '40px'
              }}
            >
              <Search size={18} color="#94a3b8" style={{ marginRight: '8px' }} />
              Buscar por nombre, SKU o código de barras...
            </div>
          </div>

          {/* Category selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b' }}>Categoría</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <select 
                value={filterCategory} 
                onChange={e => setFilterCategory(e.target.value)} 
                style={{ 
                  border: 'none', 
                  background: 'transparent', 
                  outline: 'none', 
                  fontSize: '0.95rem', 
                  fontWeight: 'bold', 
                  color: '#1e293b', 
                  cursor: 'pointer',
                  height: '40px',
                  paddingRight: '0.5rem'
                }}
              >
                <option value="ALL">Todas</option>
                {Array.from(new Set(availableProducts.map(p => p.category).filter(Boolean))).map((cat: any) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Right Side: Supplier info aligned with the sidebar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: '380px', justifyContent: 'flex-end' }}>
          <span style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#475569' }}>Proveedor</span>
          <select 
            value={supplierId} 
            onChange={(e) => setSupplierId(e.target.value)} 
            style={{ width: '280px', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none', height: '40px' }}
          >
            <option value="">-- Público en General / Sin Proveedor --</option>
            {availableSuppliers.map(s => <option key={s.id} value={s.id}>{s.name} {s.creditLimit ? `(Crédito: $${s.creditLimit})` : ''}</option>)}
          </select>
        </div>

      </div>

      {/* BOTTOM MAIN BODY: 2 Columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* LEFT COLUMN: Cart items (70% width) */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          
          <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', minHeight: '450px', border: '1px solid #cbd5e1' }}>
            {items.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: '#94a3b8', padding: '4rem 1rem' }}>
                <ShoppingBag size={64} color="#cbd5e1" style={{ marginBottom: '1rem' }} />
                <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#64748b' }}>La compra está vacía</div>
                <div style={{ fontSize: '0.9rem', marginTop: '0.5rem', color: '#94a3b8' }}>Escribe en el buscador de arriba para agregar artículos.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {items.map((item, idx) => (
                  <div 
                    key={`${item.productId}-${idx}`} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between', 
                      padding: '1rem', 
                      backgroundColor: '#f8fafc', 
                      borderRadius: '8px', 
                      border: '1px solid #e2e8f0',
                      gap: '1rem',
                      flexWrap: 'wrap'
                    }}
                  >
                    {/* Name and SKU */}
                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '0.95rem' }}>{item.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.15rem' }}>SKU: {item.sku || 'S/N'}</div>
                    </div>

                    {/* Numeric configurations */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                      {/* Quantity field */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Cant.</span>
                        <input 
                          type="number" 
                          min="1" 
                          value={item.quantity} 
                          onChange={(e) => handleUpdateItem(idx, 'quantity', parseInt(e.target.value) || 1)} 
                          style={{ width: '65px', height: '32px', padding: '0 0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', outline: 'none', textAlign: 'center' }} 
                        />
                      </div>
                      
                      {/* Cost field */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Costo Unit.</span>
                        <div style={{ position: 'relative', width: '90px' }}>
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

                      {/* Batch field */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Lote</span>
                        <input 
                          type="text" 
                          placeholder="Lote" 
                          value={item.batchNumber || ''} 
                          onChange={(e) => handleUpdateItem(idx, 'batchNumber', e.target.value)} 
                          style={{ width: '80px', height: '32px', padding: '0 0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.8rem', outline: 'none' }} 
                        />
                      </div>

                      {/* Expiration date */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Caducidad</span>
                        <input 
                          type="date" 
                          value={item.expirationDate || ''} 
                          onChange={(e) => handleUpdateItem(idx, 'expirationDate', e.target.value)} 
                          style={{ width: '115px', height: '32px', padding: '0 0.25rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.8rem', outline: 'none' }} 
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

        {/* RIGHT COLUMN: Total and actions (30% width) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Forma de Pago selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', width: '100%', paddingBottom: '0.25rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b' }}>Forma de Pago</label>
            <div style={{ position: 'relative', width: '100%' }}>
              <select 
                value={paymentMethod} 
                onChange={(e) => setPaymentMethod(e.target.value)} 
                style={{ 
                  width: '100%', 
                  border: 'none', 
                  background: 'transparent', 
                  outline: 'none', 
                  fontWeight: '600', 
                  color: '#1e293b', 
                  fontSize: '0.95rem', 
                  cursor: 'pointer',
                  padding: '0.25rem 0'
                }}
              >
                <option value="CASH">Efectivo</option>
                <option value="TRANSFER">Transferencia</option>
                <option value="CARD">Tarjeta (Débito/Crédito)</option>
                <option value="CREDIT">Crédito CxP (Pendiente de Pago)</option>
              </select>
            </div>
          </div>

          {/* Costo de Flete input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', width: '100%', paddingBottom: '0.25rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b' }}>Costo de Flete / Envíos</label>
            <div style={{ display: 'flex', alignItems: 'center', height: '40px', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: 'white', padding: '0 0.5rem' }}>
               <span style={{ color: '#64748b', fontSize: '0.9rem', marginRight: '0.25rem' }}>$</span>
               <input 
                 type="number" 
                 step="0.01" 
                 min="0" 
                 value={freightCost || ''} 
                 onChange={(e) => setFreightCost(parseFloat(e.target.value) || 0)} 
                 style={{ width: '100%', border: 'none', outline: 'none', fontSize: '0.95rem', fontWeight: '600', color: '#1e293b' }} 
                 placeholder="0.00" 
               />
            </div>
          </div>

          {/* TABS (On-Hold drafts visual tabs & Pause button) */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{
              padding: '0.5rem 1rem',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              backgroundColor: 'white',
              color: '#334155',
              fontSize: '0.9rem',
              fontWeight: '600',
              userSelect: 'none'
            }}>
              Compra Activa
            </div>
            {onHoldPurchases.map((purchase) => (
              <div key={purchase.id} style={{ display: 'flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden', backgroundColor: 'white' }}>
                <button
                  type="button"
                  onClick={() => handleRestorePurchase(purchase)}
                  style={{
                    padding: '0.5rem 0.8rem',
                    border: 'none',
                    backgroundColor: 'white',
                    color: '#475569',
                    fontSize: '0.9rem',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  {purchase.name}
                </button>
                <button 
                  type="button" 
                  onClick={() => handleDeleteOnHold(purchase.id)}
                  style={{ border: 'none', borderLeft: '1px solid #cbd5e1', padding: '0.5rem', backgroundColor: '#fee2e2', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}

            <button 
              type="button"
              onClick={handlePutOnHold}
              style={{
                padding: '0.5rem 1.2rem',
                border: '1px dashed #8b5cf6',
                borderRadius: '8px',
                backgroundColor: 'white',
                color: '#8b5cf6',
                fontSize: '0.9rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.35rem',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f3e8ff'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}
            >
              <span style={{ 
                backgroundColor: '#8b5cf6', 
                color: 'white', 
                borderRadius: '4px', 
                width: '16px', 
                height: '16px', 
                display: 'inline-flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                fontSize: '0.65rem',
                fontWeight: 'bold',
                lineHeight: 1
              }}>
                ⏸
              </span>
              Pausar Compra
            </button>
          </div>

          {/* Notes area */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b' }}>Observaciones de la Compra</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Comentarios, número de factura..."
              style={{ width: '100%', height: '80px', fontSize: '0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0.5rem', resize: 'none', outline: 'none' }}
            />
          </div>

          {/* Pricing Summary card */}
          <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
            
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Compra</div>
              <div style={{ fontSize: '2.4rem', fontWeight: '900', color: '#1e293b', marginTop: '0.25rem' }}>
                ${(total + freightCost).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span style={{ color: '#64748b' }}>Importe Artículos:</span>
                <span style={{ color: '#334155', fontWeight: '600' }}>${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
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
                backgroundColor: '#a78bfa',
                color: 'white',
                border: 'none',
                fontSize: '1.15rem',
                fontWeight: '800',
                cursor: (isSubmitting || items.length === 0) ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 14px rgba(167, 139, 250, 0.4)',
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

      {/* PRODUCT SEARCH MODAL */}
      {isSearchModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div 
            onClick={() => {
              setIsSearchModalOpen(false);
              setSearchTerm('');
            }}
            style={{ position: 'absolute', inset: 0 }}
          />
          <div className="card" style={{ position: 'relative', width: '700px', maxWidth: '95%', maxHeight: '85vh', display: 'flex', flexDirection: 'column', padding: '1.5rem', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', zIndex: 10000 }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: 0, color: '#1e293b' }}>Buscar Artículos</h3>
              <button 
                type="button" 
                onClick={() => {
                  setIsSearchModalOpen(false);
                  setSearchTerm('');
                }} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '1.25rem', fontWeight: 'bold' }}
              >
                ✕
              </button>
            </div>

            <div style={{ position: 'relative', marginBottom: '1rem' }}>
              <Search size={20} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="text" 
                autoFocus
                placeholder="Escribe el nombre, SKU o código de barras del producto..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1.05rem', outline: 'none' }}
              />
            </div>

            {/* Results list */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', minHeight: '300px' }}>
              {filteredProducts.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No se encontraron productos coincidentes</div>
              ) : (
                filteredProducts.slice(0, 30).map((p: any) => {
                  const inCart = items.some(i => i.id === p.id);
                  return (
                    <div 
                      key={p.id}
                      onClick={() => {
                        handleAddItem(p);
                        setSearchTerm('');
                        setIsSearchModalOpen(false);
                      }}
                      style={{
                        padding: '0.75rem 1rem',
                        borderBottom: '1px solid #f1f5f9',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderRadius: '6px',
                        transition: 'background-color 0.15s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '0.95rem', color: '#1e293b' }}>{p.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.15rem' }}>
                          SKU: {p.sku || 'N/A'} | Categoría: {p.category || 'General'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ fontWeight: 'bold', color: '#8b5cf6', fontSize: '1rem' }}>
                          Costo: ${p.cost ? p.cost.toFixed(2) : '0.00'}
                        </div>
                        {inCart && (
                          <span style={{ fontSize: '0.75rem', backgroundColor: '#e9d5ff', color: '#6b21a8', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 'bold' }}>Agregado</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
