'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Save, Wand2, Search, Filter, Plus, Minus, FileText, CheckCircle2, AlertTriangle, ShoppingBag, Camera, ArrowDownUp, X } from 'lucide-react';
import { createPurchaseOrder } from '@/app/actions/pedidos';
import { useOfflineSync } from '@/app/components/OfflineSyncProvider';
import BarcodeScannerModal from '@/app/components/BarcodeScannerModal';

export default function CrearPedidoForm({ suppliers, products, pendingRequests, branchId }: { suppliers: any[], products: any[], pendingRequests?: any[], branchId: string }) {
  const router = useRouter();
  const { isOnline, pushOfflinePurchase } = useOfflineSync();
  
  // Tab management states
  const [tabs, setTabs] = useState<any[]>([
    { id: '1', name: 'Pedido #1', items: [], supplierId: '', notes: '' }
  ]);
  const [activeTabId, setActiveTabId] = useState('1');

  // Resolve active tab data reactively
  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0] || { id: '1', name: 'Pedido #1', items: [], supplierId: '', notes: '' };
  const items = activeTab.items || [];
  const supplierId = activeTab.supplierId || '';
  const notes = activeTab.notes || '';

  // Wrappers to keep existing code working without modification
  const setItems = (val: any) => {
    setTabs(prev => prev.map(t => t.id === activeTabId ? {
      ...t,
      items: typeof val === 'function' ? val(t.items || []) : val
    } : t));
  };

  const setSupplierId = (val: any) => {
    setTabs(prev => prev.map(t => {
      if (t.id === activeTabId) {
        const nextSupplierId = typeof val === 'function' ? val(t.supplierId || '') : val;
        // Find supplier name to update tab name
        const supplierObj = availableSuppliers.find(s => s.id === nextSupplierId);
        let name = t.name;
        if (supplierObj) {
          name = `Pedido - ${supplierObj.name.split(' / ')[0]}`;
        } else if (!nextSupplierId) {
          // Reset to default name if no supplier
          const idx = prev.findIndex(x => x.id === t.id) + 1;
          name = `Pedido #${idx}`;
        }
        return {
          ...t,
          supplierId: nextSupplierId,
          name: name
        };
      }
      return t;
    }));
  };

  const setNotes = (val: any) => {
    setTabs(prev => prev.map(t => t.id === activeTabId ? {
      ...t,
      notes: typeof val === 'function' ? val(t.notes || '') : val
    } : t));
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [isMounted, setIsMounted] = useState(false);

  // States for order on hold
  const [onHoldOrders, setOnHoldOrders] = useState<any[]>([]);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [filterCategory, setFilterCategory] = useState('ALL');

  const [availableProducts, setAvailableProducts] = useState(products || []);
  const [availableSuppliers, setAvailableSuppliers] = useState(suppliers || []);

  // Switch Tab
  const switchTab = (targetTabId: string) => {
    setActiveTabId(targetTabId);
  };

  // Add Tab
  const addTab = () => {
    const nextNumber = tabs.length + 1;
    const newId = Math.random().toString(36).substr(2, 9);
    const newTab = {
      id: newId,
      name: `Pedido #${nextNumber}`,
      items: [],
      supplierId: '',
      notes: ''
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newId);
  };

  // Close Tab
  const closeTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length === 1) return;
    
    if (!confirm('¿Estás seguro de cerrar esta pestaña? Se perderán los cambios de este borrador.')) return;
    
    const tabIndex = tabs.findIndex(t => t.id === tabId);
    const remainingTabs = tabs.filter(t => t.id !== tabId);
    
    setTabs(remainingTabs);
    
    if (activeTabId === tabId) {
      const newActiveTab = remainingTabs[Math.max(0, tabIndex - 1)];
      setActiveTabId(newActiveTab.id);
    }
  };

  // Load active tabs and onHoldOrders from localStorage
  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== 'undefined') {
      const storedTabs = localStorage.getItem(`caanma_active_purchase_tabs_${branchId}`);
      const storedActiveId = localStorage.getItem(`caanma_active_purchase_tab_id_${branchId}`);
      if (storedTabs) {
        try {
          const parsedTabs = JSON.parse(storedTabs);
          if (parsedTabs && parsedTabs.length > 0) {
            setTabs(parsedTabs);
            if (storedActiveId) setActiveTabId(storedActiveId);
          }
        } catch (e) {
          console.error(e);
        }
      }
      
      const storedHold = localStorage.getItem(`caanma_on_hold_orders_${branchId}`);
      if (storedHold) {
        try {
          setOnHoldOrders(JSON.parse(storedHold));
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, [branchId]);

  // Persist active tabs to localStorage
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem(`caanma_active_purchase_tabs_${branchId}`, JSON.stringify(tabs));
      localStorage.setItem(`caanma_active_purchase_tab_id_${branchId}`, activeTabId);
    }
  }, [tabs, activeTabId, isMounted, branchId]);

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

  const total = items.reduce((sum: number, item: any) => sum + (item.quantity * item.cost), 0);

  const handleAddItem = (product: any) => {
    if (!product || !product.id) return;
    if (items.some((i: any) => i.productId === product.id)) return;
    setItems([...items, { 
      productId: product.id, 
      name: product.name, 
      sku: product.sku,
      barcode: product.barcode,
      quantity: 1, 
      cost: product.cost, 
      imageUrl: product.imageUrl 
    }]);
  };

  const handleUpdateItem = (index: number, field: string, value: number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const generateSuggested = () => {
    const suggested: { productId: string, name: string, sku: string, barcode?: string, quantity: number, cost: number, imageUrl?: string }[] = [];
    availableProducts.forEach(p => {
      if (p.stock <= p.minStock) {
        const required = Math.max(1, p.minStock - p.stock);
        suggested.push({
          productId: p.id,
          name: p.name,
          sku: p.sku,
          barcode: p.barcode,
          quantity: required,
          cost: p.cost,
          imageUrl: p.imageUrl
        });
      }
    });

    const toAdd = suggested.filter(s => !items.some((i: any) => i.productId === s.productId));
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
      
      // Remove active tab after successful purchase order creation
      const remainingTabs = tabs.filter(t => t.id !== activeTabId);
      if (remainingTabs.length === 0) {
        // Create a new blank tab if none are left
        const newTab = { id: Math.random().toString(36).substr(2, 9), name: 'Pedido #1', items: [], supplierId: '', notes: '' };
        setTabs([newTab]);
        setActiveTabId(newTab.id);
        localStorage.setItem(`caanma_active_purchase_tabs_${branchId}`, JSON.stringify([newTab]));
        localStorage.setItem(`caanma_active_purchase_tab_id_${branchId}`, newTab.id);
      } else {
        setTabs(remainingTabs);
        // Switch to the first available tab
        setActiveTabId(remainingTabs[0].id);
        localStorage.setItem(`caanma_active_purchase_tabs_${branchId}`, JSON.stringify(remainingTabs));
        localStorage.setItem(`caanma_active_purchase_tab_id_${branchId}`, remainingTabs[0].id);
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
      <style>{`
        .purchase-tabs-container {
          display: flex;
          align-items: center;
          gap: 6px;
          border-bottom: 2px solid #e2e8f0;
          padding-bottom: 0px;
          overflow-x: auto;
          scrollbar-width: none;
        }
        .purchase-tabs-container::-webkit-scrollbar {
          display: none;
        }
        .purchase-tab {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0.6rem 1rem;
          border: 1px solid #cbd5e1;
          border-bottom: none;
          border-radius: 8px 8px 0 0;
          background-color: #f8fafc;
          color: #64748b;
          font-size: 0.85rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
          bottom: -2px;
          height: 38px;
          white-space: nowrap;
        }
        .purchase-tab-active {
          background-color: white;
          color: #8b5cf6;
          border-color: #cbd5e1;
          border-bottom: 2.5px solid white;
          box-shadow: 0 -2px 10px rgba(0,0,0,0.02);
          z-index: 1;
        }
        .purchase-tab-add {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background-color: #f1f5f9;
          border: 1px solid #cbd5e1;
          color: #475569;
          cursor: pointer;
          transition: all 0.2s;
          margin-left: 6px;
          flex-shrink: 0;
        }
        .purchase-tab-add:hover {
          background-color: #e2e8f0;
          color: #1e293b;
          transform: scale(1.05);
        }
        .purchase-tab-close {
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          width: 16px;
          height: 16px;
          color: #94a3b8;
          background: transparent;
          border: none;
          cursor: pointer;
          transition: all 0.15s;
          padding: 0;
        }
        .purchase-tab-close:hover {
          background-color: #fee2e2;
          color: #ef4444;
        }
      `}</style>
      
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

      {showScanner && (
        <BarcodeScannerModal 
          onScan={(decodedText) => {
            setSearchTerm(decodedText);
            setShowScanner(false);
            setIsSearchModalOpen(true);
          }} 
          onClose={() => setShowScanner(false)} 
        />
      )}

      {/* TOP ROW: Filters, Search bar trigger & Supplier configurations */}
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
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowScanner(true);
                }}
                style={{
                  position: 'absolute',
                  right: '12px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#8b5cf6',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <span style={{ border: '1px solid #a78bfa', borderRadius: '4px', padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Camera size={14} color="#8b5cf6" />
                </span>
              </button>
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

          {/* Autocompletar Faltantes Button */}
          <button 
            type="button" 
            onClick={generateSuggested} 
            style={{ 
              display: 'flex', alignItems: 'center', gap: '0.5rem', 
              padding: '0.5rem 1rem', borderRadius: '8px', 
              border: '1px solid #8b5cf6', 
              backgroundColor: '#f3e8ff', color: '#8b5cf6', 
              fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem',
              height: '40px',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#e9d5ff'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#f3e8ff'}
          >
            <Wand2 size={16} /> Autocompletar Faltantes
          </button>
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
            {availableSuppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

      </div>



      {/* MAIN TWO-COLUMN BODY LAYOUT */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* LEFT COLUMN: PENDING REQUESTS & ORDER ITEMS (70% width) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* TABS ROW */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '6px 8px 6px 8px', overflow: 'hidden' }}>
            <div className="purchase-tabs-container" style={{ borderBottom: 'none', marginBottom: 0, width: '100%' }}>
              {tabs.map((tab, idx) => {
                const isActive = tab.id === activeTabId;
                return (
                  <div 
                    key={tab.id}
                    onClick={() => switchTab(tab.id)}
                    className={`purchase-tab ${isActive ? 'purchase-tab-active' : ''}`}
                  >
                    <span>{tab.name}</span>
                    {tabs.length > 1 && (
                      <button 
                        type="button" 
                        onClick={(e) => closeTab(tab.id, e)}
                        className="purchase-tab-close"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                );
              })}
              <button 
                type="button"
                onClick={addTab}
                className="purchase-tab-add"
                title="Nueva Pestaña"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
          
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
                  const isAdded = items.some((i: any) => i.requestId === req.id);
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
                              setItems([...items, { 
                                productId: req.product.id, 
                                name: req.product.name, 
                                sku: req.product.sku,
                                barcode: req.product.barcode,
                                quantity: req.quantity, 
                                cost: req.product.cost, 
                                requestId: req.id, 
                                imageUrl: req.product.imageUrl 
                              }]);
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
          <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', minHeight: '450px', border: '1px solid #cbd5e1' }}>
            {items.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: '#94a3b8', padding: '4rem 1rem' }}>
                <ShoppingBag size={64} color="#cbd5e1" style={{ marginBottom: '1rem' }} />
                <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#64748b' }}>El ticket está vacío</div>
                <div style={{ fontSize: '0.9rem', marginTop: '0.5rem', color: '#94a3b8' }}>Escribe en el buscador de arriba para agregar artículos.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {items.map((item: any, idx: number) => (
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

                    {/* Name, SKU and Barcode */}
                    <div style={{ minWidth: '150px', flex: 1 }}>
                      <div style={{ fontWeight: 'bold', fontSize: '0.95rem', color: '#1e293b', wordBreak: 'break-word' }} title={item.name}>
                        {item.name}
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.2rem' }}>
                        {item.sku && (
                          <span style={{ fontSize: '0.75rem', color: '#64748b', backgroundColor: '#f1f5f9', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                            SKU: {item.sku}
                          </span>
                        )}
                        {item.barcode && item.barcode !== 'N/A' && (
                          <span style={{ fontSize: '0.75rem', color: '#64748b', backgroundColor: '#f1f5f9', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                            Código: {item.barcode}
                          </span>
                        )}
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
                        onClick={() => setItems(items.filter((_: any, i: number) => i !== idx))} 
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
              Pedido Activo
            </div>
            {onHoldOrders.map((order) => (
              <div key={order.id} style={{ display: 'flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden', backgroundColor: 'white' }}>
                <button
                  type="button"
                  onClick={() => handleRestoreOrder(order)}
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
                  {order.name}
                </button>
                <button 
                  type="button" 
                  onClick={() => handleDeleteOnHold(order.id)}
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
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = '#f3e8ff';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = 'white';
              }}
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
              Pausar Pedido
            </button>
          </div>

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
              <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TOTAL PEDIDO</div>
              <div style={{ fontSize: '2.8rem', fontWeight: '900', color: '#1e293b', marginTop: '0.25rem' }}>
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
                backgroundColor: '#a78bfa',
                color: 'white',
                border: 'none',
                fontSize: '1.2rem',
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
                  Crear Pedido
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
                  const inCart = items.some((i: any) => i.productId === p.id);
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
                          SKU: {p.sku || 'N/A'} | Stock: <span style={{ color: p.stock > 0 ? '#16a34a' : '#dc2626', fontWeight: 'bold' }}>{p.stock}</span>
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
