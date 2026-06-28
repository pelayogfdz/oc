'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, ShoppingBag, Search, Filter, Plus, Minus, FileText, CheckCircle2, Clock } from 'lucide-react';
import { createPurchase } from '@/app/actions/purchase';
import { useOfflineSync } from '@/app/components/OfflineSyncProvider';

export default function CrearCompraForm({ suppliers, products, branchId }: { suppliers: any[], products: any[], branchId: string }) {
  const router = useRouter();
  const { isOnline, pushOfflinePurchase } = useOfflineSync();
  const [supplierId, setSupplierId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [freightCost, setFreightCost] = useState(0);
  const [supplierFolio, setSupplierFolio] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<{ 
    productId: string, 
    name: string, 
    quantity: number, 
    cost: number, 
    imageUrl?: string, 
    batchNumber?: string, 
    expirationDate?: string,
    sku?: string,
    hasTraceability?: boolean,
    pedimento?: string,
    pedimentoDate?: string,
    crePermitSupplier?: string,
    crePermitCarrier?: string,
    density?: number,
    temperature?: number,
    octane?: number,
    volume20c?: number,
    certNumber?: string
  }[]>([]);
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
        db.products.where('branchId').equals(branchId).toArray().then(res => setAvailableProducts(res.length ? res : products));
        db.suppliers.toArray().then(res => setAvailableSuppliers(res.length ? res : suppliers));
      });
    } else {
      setAvailableProducts(products);
      setAvailableSuppliers(suppliers);
    }
  }, [isOnline, products, suppliers, branchId]);

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
    setItems([...items, { 
      productId: product.id, 
      name: product.name, 
      quantity: 1, 
      cost: product.cost, 
      imageUrl: product.imageUrl,
      hasTraceability: product.hasTraceability || false,
      sku: product.sku || '',
      pedimento: '',
      pedimentoDate: '',
      crePermitSupplier: '',
      crePermitCarrier: '',
      density: undefined,
      temperature: undefined,
      octane: undefined,
      volume20c: undefined,
      certNumber: ''
    }]);
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
          total,
          supplierFolio: supplierFolio || null
        });
        alert('Compra guardada en modo Offline. Se sincronizará al recuperar conexión.');
      } else {
        const res = await createPurchase(items, total, paymentMethod, supplierId || null, freightCost, undefined, supplierFolio || null);
        if (res && !res.success) {
          throw new Error(res.error);
        }
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
      <style>{`
        .compra-action-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0.75rem;
          width: 100%;
        }
        .compra-action-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 1.5rem 1rem;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          background-color: white;
          cursor: pointer;
          transition: all 0.2s;
          width: 100%;
          gap: 0.75rem;
          text-align: center;
        }
        .compra-action-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 12px rgba(0,0,0,0.05);
          border-color: #cbd5e1;
        }
        .compra-action-icon-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }
        .compra-action-label {
          font-size: 0.85rem;
          font-weight: 600;
          color: #1e293b;
        }
        .compra-checkout-btn {
          width: 100%;
          padding: 1rem 1.5rem;
          background-color: #a78bfa;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 1.1rem;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 10px rgba(167, 139, 250, 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }
        .compra-checkout-btn:hover:not(:disabled) {
          background-color: #8b5cf6;
          box-shadow: 0 6px 14px rgba(167, 139, 250, 0.35);
        }
        .compra-checkout-btn:disabled {
          background-color: #cbd5e1;
          color: #94a3b8;
          cursor: not-allowed;
          box-shadow: none;
        }
      `}</style>
      
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

      {/* TOP HEADER ROW: Search trigger & Supplier selector */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 340px', 
        gap: '1.5rem', 
        marginBottom: '1.5rem', 
        alignItems: 'end',
        width: '100%',
        borderBottom: '1px solid #e2e8f0',
        paddingBottom: '1.25rem'
      }}>
        {/* Left Side: Product Search & category selector */}
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'end', flex: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1 }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Buscar productos</label>
            <div 
              onClick={() => setIsSearchModalOpen(true)}
              style={{ 
                display: 'flex',
                alignItems: 'center',
                padding: '0.65rem 1rem', 
                borderRadius: '8px', 
                border: '2px solid #a78bfa', 
                backgroundColor: 'white', 
                fontSize: '0.95rem',
                cursor: 'pointer',
                color: '#94a3b8',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                userSelect: 'none',
                height: '42px'
              }}
            >
              <Search size={18} color="#94a3b8" style={{ marginRight: '8px' }} />
              {searchTerm || "Buscar por nombre, SKU o código de barras..."}
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', width: '150px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Categoría</label>
            <select 
              value={filterCategory} 
              onChange={e => setFilterCategory(e.target.value)} 
              style={{ 
                width: '100%',
                padding: '0 0.5rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1', 
                outline: 'none', 
                fontSize: '0.9rem', 
                fontWeight: 'bold', 
                color: '#1e293b', 
                cursor: 'pointer',
                height: '42px',
                backgroundColor: 'white'
              }}
            >
              <option value="ALL">Todas</option>
              {Array.from(new Set(availableProducts.map(p => p.category).filter(Boolean))).map((cat: any) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Right Side: Supplier */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Proveedor</label>
          <select 
            value={supplierId} 
            onChange={(e) => setSupplierId(e.target.value)} 
            style={{ 
              width: '100%', 
              padding: '0.5rem 0.75rem', 
              borderRadius: '8px', 
              border: '1px solid #cbd5e1', 
              fontSize: '0.9rem', 
              outline: 'none', 
              height: '42px',
              backgroundColor: 'white',
              fontWeight: '600',
              color: '#1e293b'
            }}
          >
            <option value="">-- Público en General / Sin Proveedor --</option>
            {availableSuppliers.map(s => <option key={s.id} value={s.id}>{s.name} {s.creditLimit ? `(Crédito: $${s.creditLimit})` : ''}</option>)}
          </select>
        </div>
      </div>

      {/* BOTTOM MAIN BODY: 2 Columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* LEFT COLUMN: Cart items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', minHeight: '300px' }}>
            {items.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: '#94a3b8', padding: '5rem 1rem', border: '1px dashed #cbd5e1', borderRadius: '12px', backgroundColor: 'white' }}>
                <ShoppingBag size={56} color="#cbd5e1" style={{ marginBottom: '1rem' }} />
                <div style={{ fontSize: '1.15rem', fontWeight: '800', color: '#64748b' }}>La compra está vacía</div>
                <div style={{ fontSize: '0.85rem', marginTop: '0.25rem', color: '#94a3b8' }}>Busca artículos arriba para agregar al registro.</div>
              </div>
            ) : (
              items.map((item, idx) => (
                <div 
                  key={`${item.productId}-${idx}`} 
                  style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '0.75rem', 
                    backgroundColor: 'white', 
                    borderRadius: '12px', 
                    border: '1px solid #cbd5e1',
                    padding: '1rem'
                  }}
                >
                  {/* Main Product Row */}
                  <div style={{
                    display: 'grid', 
                    gridTemplateColumns: '52px 1.5fr 70px 100px 90px 120px 90px 40px', 
                    alignItems: 'center', 
                    gap: '0.75rem'
                  }}>
                    {/* Image or Initials */}
                    <div style={{
                      width: '52px',
                      height: '52px',
                      borderRadius: '10px',
                      backgroundColor: '#f1f5f9',
                      color: '#64748b',
                      fontWeight: 'bold',
                      fontSize: '0.95rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden'
                    }}>
                      {item.imageUrl ? (
                        <img 
                          src={item.imageUrl} 
                          alt={item.name} 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const parent = e.currentTarget.parentElement;
                            if (parent) {
                              parent.innerHTML = `<span>${item.name.substring(0, 2).toUpperCase()}</span>`;
                            }
                          }}
                        />
                      ) : (
                        <span>{item.name.substring(0, 2).toUpperCase()}</span>
                      )}
                    </div>

                    {/* Name and SKU */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '0.9rem', lineHeight: '1.2' }}>{item.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>SKU: {item.sku || 'S/N'}</div>
                    </div>

                    {/* Quantity field */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Cant.</span>
                      <input 
                        type="number" 
                        min="1" 
                        value={item.quantity} 
                        onChange={(e) => handleUpdateItem(idx, 'quantity', parseInt(e.target.value) || 1)} 
                        style={{ width: '100%', height: '36px', textAlign: 'center', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem', outline: 'none', backgroundColor: 'white' }} 
                      />
                    </div>
                    
                    {/* Cost field */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Costo Unit.</span>
                      <div style={{ position: 'relative', width: '100%' }}>
                        <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.85rem', color: '#64748b' }}>$</span>
                        <input 
                          type="number" 
                          step="0.01" 
                          min="0"
                          value={item.cost} 
                          onChange={(e) => handleUpdateItem(idx, 'cost', parseFloat(e.target.value) || 0)} 
                          style={{ width: '100%', height: '36px', padding: '0 0.5rem 0 1.15rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', outline: 'none', textAlign: 'right', backgroundColor: 'white' }} 
                        />
                      </div>
                    </div>

                    {/* Batch field */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Lote</span>
                      <input 
                        type="text" 
                        placeholder="Lote" 
                        value={item.batchNumber || ''} 
                        onChange={(e) => handleUpdateItem(idx, 'batchNumber', e.target.value)} 
                        style={{ width: '100%', height: '36px', padding: '0 0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.8rem', outline: 'none', backgroundColor: 'white' }} 
                      />
                    </div>

                    {/* Expiration date */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Caducidad</span>
                      <input 
                        type="date" 
                        value={item.expirationDate || ''} 
                        onChange={(e) => handleUpdateItem(idx, 'expirationDate', e.target.value)} 
                        style={{ width: '100%', height: '36px', padding: '0 0.25rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.8rem', outline: 'none', backgroundColor: 'white' }} 
                      />
                    </div>

                    {/* Subtotal */}
                    <div style={{ textAlign: 'right', paddingRight: '0.5rem' }}>
                      <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', textTransform: 'uppercase', fontWeight: 'bold' }}>Subtotal</span>
                      <span style={{ fontWeight: '800', color: '#1e293b', fontSize: '0.95rem' }}>
                        ${(item.quantity * item.cost).toFixed(2)}
                      </span>
                    </div>

                    {/* Delete button */}
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <button 
                        type="button"
                        onClick={() => setItems(items.filter((_, i) => i !== idx))} 
                        style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title="Eliminar artículo"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Traceability Fields (Show only if fuel traceability is active) */}
                  {item.hasTraceability && (
                    <div style={{ 
                      marginTop: '0.5rem', 
                      paddingTop: '0.75rem', 
                      borderTop: '1px dashed #e2e8f0', 
                      backgroundColor: '#f8fafc', 
                      borderRadius: '8px', 
                      padding: '0.75rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem'
                    }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#0284c7', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        ⛽ Datos de Trazabilidad de Combustible
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.2rem' }}>No. Pedimento</label>
                          <input 
                            type="text" 
                            placeholder="Ej. 26-..." 
                            value={item.pedimento || ''} 
                            onChange={(e) => handleUpdateItem(idx, 'pedimento', e.target.value)} 
                            style={{ width: '100%', height: '32px', padding: '0 0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.8rem', outline: 'none' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.2rem' }}>Fecha Pedimento</label>
                          <input 
                            type="date" 
                            value={item.pedimentoDate || ''} 
                            onChange={(e) => handleUpdateItem(idx, 'pedimentoDate', e.target.value)} 
                            style={{ width: '100%', height: '32px', padding: '0 0.25rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.8rem', outline: 'none' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.2rem' }}>Permiso CRE Proveedor</label>
                          <input 
                            type="text" 
                            placeholder="PL/..." 
                            value={item.crePermitSupplier || ''} 
                            onChange={(e) => handleUpdateItem(idx, 'crePermitSupplier', e.target.value)} 
                            style={{ width: '100%', height: '32px', padding: '0 0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.8rem', outline: 'none' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.2rem' }}>Permiso CRE Transportista</label>
                          <input 
                            type="text" 
                            placeholder="PL/..." 
                            value={item.crePermitCarrier || ''} 
                            onChange={(e) => handleUpdateItem(idx, 'crePermitCarrier', e.target.value)} 
                            style={{ width: '100%', height: '32px', padding: '0 0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.8rem', outline: 'none' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.2rem' }}>Densidad (kg/m³)</label>
                          <input 
                            type="number" 
                            step="0.01" 
                            placeholder="Ej. 745.2" 
                            value={item.density !== undefined ? item.density : ''} 
                            onChange={(e) => handleUpdateItem(idx, 'density', e.target.value ? parseFloat(e.target.value) : undefined)} 
                            style={{ width: '100%', height: '32px', padding: '0 0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.8rem', outline: 'none' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.2rem' }}>Temperatura (°C)</label>
                          <input 
                            type="number" 
                            step="0.1" 
                            placeholder="Ej. 15.5" 
                            value={item.temperature !== undefined ? item.temperature : ''} 
                            onChange={(e) => handleUpdateItem(idx, 'temperature', e.target.value ? parseFloat(e.target.value) : undefined)} 
                            style={{ width: '100%', height: '32px', padding: '0 0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.8rem', outline: 'none' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.2rem' }}>Octanaje</label>
                          <input 
                            type="number" 
                            step="0.1" 
                            placeholder="Ej. 87 / 91" 
                            value={item.octane !== undefined ? item.octane : ''} 
                            onChange={(e) => handleUpdateItem(idx, 'octane', e.target.value ? parseFloat(e.target.value) : undefined)} 
                            style={{ width: '100%', height: '32px', padding: '0 0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.8rem', outline: 'none' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.2rem' }}>Volumen 20°C (Lts)</label>
                          <input 
                            type="number" 
                            step="0.1" 
                            placeholder="Volumen" 
                            value={item.volume20c !== undefined ? item.volume20c : ''} 
                            onChange={(e) => handleUpdateItem(idx, 'volume20c', e.target.value ? parseFloat(e.target.value) : undefined)} 
                            style={{ width: '100%', height: '32px', padding: '0 0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.8rem', outline: 'none' }}
                          />
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                          <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.2rem' }}>No. Certificado de Calidad</label>
                          <input 
                            type="text" 
                            placeholder="No. Certificado" 
                            value={item.certNumber || ''} 
                            onChange={(e) => handleUpdateItem(idx, 'certNumber', e.target.value)} 
                            style={{ width: '100%', height: '32px', padding: '0 0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.8rem', outline: 'none' }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* BOTTOM SUMMARY ROW & REGISTER CTA */}
          <div style={{ marginTop: '1.25rem', padding: '1.25rem 0 0 0', borderTop: '1px solid #cbd5e1' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', fontSize: '0.95rem', color: '#475569', fontWeight: '600' }}>
              <span>Subtotal ({items.reduce((s, i) => s + i.quantity, 0)} artículos)</span>
              <span style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a' }}>
                ${(total + freightCost).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <button 
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || items.length === 0} 
              className="compra-checkout-btn"
            >
              {isSubmitting ? (
                'Procesando...'
              ) : (
                `Ingresar Compra $${(total + freightCost).toFixed(2)}`
              )}
            </button>
          </div>

        </div>

        {/* RIGHT COLUMN: Sidebar (Payment settings, Observations & Quick Actions) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Payment Method selector */}
          <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '12px', border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Forma de Pago</label>
            <select 
              value={paymentMethod} 
              onChange={(e) => setPaymentMethod(e.target.value)} 
              style={{ 
                width: '100%', 
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontWeight: '600', 
                color: '#1e293b', 
                fontSize: '0.9rem', 
                cursor: 'pointer',
                height: '40px',
                outline: 'none',
                backgroundColor: 'white'
              }}
            >
              <option value="CASH">Efectivo</option>
              <option value="TRANSFER">Transferencia</option>
              <option value="CARD">Tarjeta (Débito/Crédito)</option>
              <option value="CREDIT">Crédito CxP (Pendiente de Pago)</option>
            </select>
          </div>

          {/* Folio Proveedor input */}
          <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '12px', border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Folio del Proveedor</label>
            <input 
              type="text" 
              value={supplierFolio} 
              onChange={(e) => setSupplierFolio(e.target.value)} 
              placeholder="Ej. FAC-12345" 
              style={{ 
                width: '100%', 
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontWeight: '600', 
                color: '#1e293b', 
                fontSize: '0.9rem', 
                height: '40px',
                outline: 'none',
                backgroundColor: 'white'
              }}
            />
          </div>

          {/* Costo de Flete input */}
          <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '12px', border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Costo de Flete / Envíos</label>
            <div style={{ display: 'flex', alignItems: 'center', height: '40px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: 'white', padding: '0 0.5rem' }}>
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

          {/* Action Cards Panel */}
          <div className="compra-action-grid">
            
            {/* Card 1: Crear Producto Rápido */}
            <button 
              type="button"
              onClick={() => alert('Para añadir productos, puedes usar el buscador principal al tope de la pantalla.')}
              className="compra-action-card"
            >
              <div className="compra-action-icon-wrapper" style={{ backgroundColor: '#ccfbf1', color: '#0d9488' }}>
                <Plus size={20} />
              </div>
              <span className="compra-action-label">Crear Producto Rápido</span>
            </button>

            {/* Card 2: Pausar Compra */}
            <button 
              type="button"
              onClick={handlePutOnHold}
              className="compra-action-card"
              disabled={items.length === 0}
            >
              <div className="compra-action-icon-wrapper" style={{ backgroundColor: '#f3e8ff', color: '#8b5cf6' }}>
                <Clock size={20} />
              </div>
              <span className="compra-action-label">Pausar Compra</span>
            </button>

            {/* List of On Hold purchases drafts */}
            {onHoldPurchases.length > 0 && (
              <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', borderTop: '1px solid #cbd5e1', paddingTop: '1rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Compras en Espera</span>
                {onHoldPurchases.map((purchase) => (
                  <div key={purchase.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden', backgroundColor: 'white', width: '100%' }}>
                    <button
                      type="button"
                      onClick={() => handleRestorePurchase(purchase)}
                      style={{
                        flex: 1,
                        padding: '0.5rem 0.75rem',
                        border: 'none',
                        backgroundColor: 'white',
                        color: '#475569',
                        fontSize: '0.85rem',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        textAlign: 'left',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {purchase.name} (${purchase.total.toFixed(2)})
                    </button>
                    <button 
                      type="button" 
                      onClick={() => handleDeleteOnHold(purchase.id)}
                      style={{ border: 'none', borderLeft: '1px solid #cbd5e1', padding: '0.5rem 0.75rem', backgroundColor: '#fee2e2', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}

          </div>

          {/* Observations Area */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Observaciones de la Compra</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Comentarios, número de factura..."
              style={{ width: '100%', height: '80px', fontSize: '0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0.5rem', resize: 'none', outline: 'none', backgroundColor: 'white' }}
            />
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
                  const inCart = items.some(i => i.productId === p.id);
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
