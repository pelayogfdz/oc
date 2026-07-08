'use client';

import { useState, useEffect } from 'react';
import { updateTransfer, getBranchStocksForTransfer } from '@/app/actions/transfer';
import { searchProducts } from '@/app/actions/product';
import { useRouter } from 'next/navigation';
import { Truck, ArrowLeft, Trash2, Search, Plus, Minus, FileText, CheckCircle2, ShoppingBag, Camera, ArrowDownUp, Package } from 'lucide-react';
import BarcodeScannerModal from '@/app/components/BarcodeScannerModal';

export default function EditTransferClient({ transfer, otherBranches, inventory, ventasConfig = {}, currentBranchId }: any) {
  const router = useRouter();
  const [fromBranchId, setFromBranchId] = useState(transfer.branchId || '');
  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState('ALL');
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [products, setProducts] = useState<any[]>(inventory);
  const [isSearching, setIsSearching] = useState(false);
  
  // Pre-populate items in the transfer
  const [transferItems, setTransferItems] = useState<any[]>(() => {
    return transfer.items.map((item: any) => ({
      listId: item.variantId ? `v_${item.variantId}` : item.productId,
      productId: item.productId,
      variantId: item.variantId,
      name: item.variant ? `${item.product.name} (${item.variant.attribute})` : item.product.name,
      sku: item.variant?.sku || item.product.sku,
      productSku: item.product.sku,
      barcode: item.product.barcode || "",
      variantAttribute: item.variant ? item.variant.attribute : null,
      maxStock: 9999, // Will load from origin stocks
      quantity: item.quantity,
      imageUrl: item.product.imageUrl
    }));
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  // Stock from source branch states
  const [sourceStocks, setSourceStocks] = useState<any>(null);
  const [isLoadingStocks, setIsLoadingStocks] = useState(false);

  const isDispatched = transfer.status === 'DISPATCHED';

  // Debounced search for products on-demand
  useEffect(() => {
    if (!searchTerm.trim()) {
      setProducts(inventory);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        // Search using the transfer.toBranchId (destination catalog)
        const results = await searchProducts(searchTerm, transfer.toBranchId);
        setProducts(results || []);
      } catch (error) {
        console.error("Error searching products:", error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, transfer.toBranchId, inventory]);

  // Load stocks when fromBranchId changes
  useEffect(() => {
    if (!fromBranchId) {
      setSourceStocks(null);
      return;
    }

    setIsLoadingStocks(true);
    getBranchStocksForTransfer(fromBranchId)
      .then(res => {
        if (res && res.success) {
          setSourceStocks({
            productStocks: res.productStocks || {},
            variantStocks: res.variantStocks || {}
          });
        } else {
          alert(res?.error || 'Error al obtener existencias de la sucursal de origen.');
          setSourceStocks(null);
        }
      })
      .catch(err => {
        console.error(err);
        alert('Error de red al obtener existencias.');
        setSourceStocks(null);
      })
      .finally(() => {
        setIsLoadingStocks(false);
      });
  }, [fromBranchId]);

  // Sync existing items maxStock and quantity based on origin branch stocks
  useEffect(() => {
    if (!sourceStocks) return;

    setTransferItems(prevItems => {
      let changed = false;
      const updated = prevItems.map(item => {
        let newMaxStock = 9999;
        const pSku = item.productSku;
        if (item.variantId) {
          const vAttr = item.variantAttribute;
          if (pSku && vAttr) {
            const key = `${pSku}_${vAttr}`;
            newMaxStock = sourceStocks.variantStocks[key] ?? 0;
          }
        } else {
          if (pSku) {
            newMaxStock = sourceStocks.productStocks[pSku] ?? 0;
          }
        }

        if (item.maxStock !== newMaxStock) {
          changed = true;
          const newQty = (!ventasConfig.venderSinStock && item.quantity > newMaxStock) ? Math.max(1, newMaxStock) : item.quantity;
          return { ...item, maxStock: newMaxStock, quantity: newQty };
        }
        return item;
      });
      return changed ? updated : prevItems;
    });
  }, [sourceStocks, ventasConfig.venderSinStock]);

  const removeAccents = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const displayedProducts = products.filter((p: any) => {
    const sourceStock = sourceStocks ? (sourceStocks.productStocks[p.sku] ?? 0) : 0;
    if (stockFilter === 'WITH_STOCK' && sourceStock <= 0) return false;
    if (stockFilter === 'WITHOUT_STOCK' && sourceStock > 0) return false;

    if (!searchTerm.trim()) return true;
    const searchTerms = removeAccents(searchTerm.toLowerCase().trim()).split(/\s+/);
    const searchableString = removeAccents(`${p.name || ''} ${p.description || ''} ${p.sku || ''} ${p.barcode || ''}`.toLowerCase());
    
    return searchTerms.every(term => searchableString.includes(term));
  });

  const handleProductClick = (product: any) => {
    if (product.variants && product.variants.length > 0) {
      // Open variant selection modal
      // We will just let the user click
      setSelectedProductForVariant(product);
    } else {
      handleAdd(product, null);
    }
  };

  // Variant Modal State
  const [selectedProductForVariant, setSelectedProductForVariant] = useState<any | null>(null);

  const handleAdd = (product: any, variant: any | null) => {
    const listId = variant ? `v_${variant.id}` : product.id;
    const name = variant ? `${product.name} (${variant.attribute})` : product.name;
    
    // Resolve maxStock using sourceStocks
    const key = variant ? `${product.sku}_${variant.attribute}` : product.sku;
    const sourceStock = variant 
      ? (sourceStocks?.variantStocks[key] ?? 0)
      : (sourceStocks?.productStocks[key] ?? 0);
    const maxStock = sourceStock;
    const sku = variant?.sku || product.sku;

    const existing = transferItems.find(i => i.listId === listId);
    if (existing) {
      if (!ventasConfig.venderSinStock && isDispatched && existing.quantity >= maxStock) {
          alert('Cantidad excede el stock disponible en origen.');
          return;
      }
      setTransferItems(transferItems.map(i => i.listId === listId ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      if (!ventasConfig.venderSinStock && isDispatched && maxStock <= 0) {
          alert('Este producto no tiene stock disponible en origen.');
          return;
      }
      setTransferItems([...transferItems, {
        listId,
        productId: product.id,
        variantId: variant ? variant.id : null,
        name,
        sku,
        productSku: product.sku,
        barcode: product.barcode || "",
        variantAttribute: variant ? variant.attribute : null,
        maxStock,
        quantity: 1,
        imageUrl: product.imageUrl
      }]);
    }
  };

  const removeItem = (listId: string) => {
    setTransferItems(transferItems.filter(i => i.listId !== listId));
  };

  const updateQuantity = (listId: string, val: number) => {
    setTransferItems(transferItems.map(item => {
      if (item.listId !== listId) return item;
      let newQty = item.quantity + val;
      if (newQty < 1) newQty = 1;
      
      // Enforce stock limit only if it's already dispatched
      if (isDispatched && !ventasConfig.venderSinStock && newQty > item.maxStock) {
        alert(`No hay stock suficiente en la sucursal de origen (Disponible: ${item.maxStock})`);
        return item;
      }
      return { ...item, quantity: newQty };
    }));
  };

  const handleSubmit = async () => {
    if (!fromBranchId) {
      alert('Por favor, selecciona la sucursal de origen.');
      return;
    }
    if (transferItems.length === 0) {
      alert('Debes agregar al menos un artículo al traspaso.');
      return;
    }

    let msg = '¿Estás seguro de que deseas guardar los cambios en este traspaso?';
    if (isDispatched) {
      msg = '¡ATENCIÓN! Este traspaso ya fue surtido/enviado. Modificarlo reajustará automáticamente el stock físico en la sucursal origen y generará los movimientos de inventario correspondientes. ¿Proceder?';
    }

    if (!confirm(msg)) return;

    setIsProcessing(true);
    try {
      const res = await updateTransfer(transfer.id, {
        fromBranchId,
        items: transferItems.map(i => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity }))
      });

      if (res && !res.success) {
        throw new Error(res.error || "Error al actualizar traspaso");
      }

      alert('Traspaso actualizado correctamente.');
      router.push(`/productos/traspasos/${transfer.id}`);
      router.refresh();
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '1rem 0' }}>
      
      {/* HEADER SECTION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <button 
            onClick={() => router.back()} 
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#6366f1', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.95rem', padding: 0, marginBottom: '0.75rem' }}
          >
            <ArrowLeft size={16} /> Volver a Detalles
          </button>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}>
            <Truck size={28} color="#6366f1" /> Editar Traspaso #{transfer.id.substring(0,8).toUpperCase()}
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Modifica la sucursal de origen y los artículos solicitados. Estado actual: <strong style={{ color: '#4f46e5' }}>{transfer.status}</strong>
          </p>
        </div>
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

      {/* WARNING CALLOUT FOR DISPATCHED */}
      {isDispatched && (
        <div style={{ padding: '1.25rem', backgroundColor: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '8px', color: '#b45309', marginBottom: '1.5rem', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <strong>⚠️ AVISO DE TRASPASO EN CAMINO:</strong>
          <span>Este traspaso ya se encuentra en tránsito. Al guardar los cambios, el sistema restaurará automáticamente el stock de los artículos anteriores en la sucursal origen e intentará deducir el stock de los nuevos artículos que especifiques. No se permite cambiar la sucursal origen de traspasos en tránsito.</span>
        </div>
      )}

      {/* TOP ROW: Filters & Search bar trigger */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1.5rem', padding: '1rem 0', marginBottom: '1.5rem', width: '100%', flexWrap: 'wrap', borderBottom: '1px solid #e2e8f0' }}>
        
        {/* Left Side: Search Trigger */}
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap', flex: 1, minWidth: '300px' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', width: '280px' }}>
            <div 
              onClick={() => {
                if (!fromBranchId) {
                  alert('Por favor, selecciona primero la sucursal de origen.');
                  return;
                }
                setIsSearchModalOpen(true);
              }}
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
              Agregar artículos...
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!fromBranchId) {
                    alert('Por favor, selecciona primero la sucursal de origen.');
                    return;
                  }
                  setShowScanner(true);
                }}
                style={{
                  position: 'absolute',
                  right: '12px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#6366f1',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <span style={{ border: '1px solid #6366f1', borderRadius: '4px', padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Camera size={14} color="#6366f1" />
                </span>
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b' }}>Filtrar Existencias</span>
            <select 
              value={stockFilter} 
              onChange={e => setStockFilter(e.target.value)} 
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
              <option value="WITH_STOCK">Con Existencias en Origen</option>
              <option value="WITHOUT_STOCK">Sin Existencias en Origen</option>
            </select>
          </div>
        </div>

        {/* Right Side: Source Branch Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: '380px', justifyContent: 'flex-end' }}>
          <span style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#475569' }}>Solicitar A</span>
          <select 
            value={fromBranchId} 
            onChange={e => setFromBranchId(e.target.value)} 
            disabled={isDispatched}
            style={{ width: '280px', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', fontWeight: 'bold', outline: 'none', height: '40px', backgroundColor: isDispatched ? '#f1f5f9' : 'white', cursor: isDispatched ? 'not-allowed' : 'pointer' }}
          >
            <option value="">-- Seleccionar Sucursal --</option>
            {otherBranches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>

      </div>

      {/* TWO COLUMNS: Items selected & Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr', gap: '2rem', alignItems: 'start' }}>
        
        {/* Left Column: Cart list */}
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: 0 }}>Artículos a Traspasar</h3>
            <span style={{ fontSize: '0.85rem', backgroundColor: '#e0f2fe', color: '#0369a1', padding: '0.2rem 0.6rem', borderRadius: '12px', fontWeight: 'bold' }}>
              {transferItems.length} tipos de artículo
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', minHeight: '300px' }}>
            {transferItems.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', padding: '5rem 2rem', gap: '1rem' }}>
                <ShoppingBag size={48} color="#cbd5e1" />
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#64748b' }}>Traspaso vacío</div>
                  <div style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>Selecciona una sucursal de origen y busca productos para agregarlos.</div>
                </div>
              </div>
            ) : (
              transferItems.map((item, idx) => (
                <div 
                  key={item.listId} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    padding: '1.25rem 1.5rem', 
                    borderBottom: idx < transferItems.length - 1 ? '1px solid #f1f5f9' : 'none',
                    justifyContent: 'space-between',
                    gap: '1.5rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {item.imageUrl && !imageErrors[item.listId] ? (
                        <img 
                          src={item.imageUrl} 
                          alt={item.name} 
                          onError={() => setImageErrors({ ...imageErrors, [item.listId]: true })}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        />
                      ) : (
                        <Package size={20} color="#94a3b8" />
                      )}
                    </div>
                    <div>
                      <div style={{ fontWeight: 'bold', color: '#1e293b', fontSize: '0.95rem' }}>{item.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.15rem', fontFamily: 'monospace' }}>SKU: {item.sku || '-'} | Código: {item.barcode || '-'}</div>
                      {sourceStocks && (
                        <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', fontWeight: 'bold', color: item.maxStock > 0 ? '#16a34a' : '#dc2626' }}>
                          Stock origen: {item.maxStock} disp.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quantity Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <button 
                      type="button"
                      onClick={() => updateQuantity(item.listId, -1)}
                      style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid #cbd5e1', backgroundColor: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', transition: 'border-color 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = '#94a3b8'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = '#cbd5e1'}
                    >
                      <Minus size={14} />
                    </button>
                    
                    <span style={{ fontSize: '1.15rem', fontWeight: 'bold', width: '30px', textAlign: 'center', color: '#1e293b' }}>
                      {item.quantity}
                    </span>

                    <button 
                      type="button"
                      onClick={() => updateQuantity(item.listId, 1)}
                      style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid #cbd5e1', backgroundColor: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', transition: 'border-color 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = '#94a3b8'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = '#cbd5e1'}
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  {/* Delete Action */}
                  <button 
                    type="button"
                    onClick={() => removeItem(item.listId)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', transition: 'background-color 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fee2e2'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <Trash2 size={16} />
                  </button>

                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          <div className="card" style={{ padding: '1.25rem' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={16} color="#64748b" /> Detalles de Edición
            </h4>
            <div style={{ fontSize: '0.825rem', color: '#64748b', lineHeight: '1.4' }}>
              Al guardar los cambios, las cantidades y artículos solicitados serán actualizados de inmediato. Si el traspaso ya está surtido, los inventarios de origen se reajustarán automáticamente.
            </div>
          </div>

          <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Artículos</div>
              <div style={{ fontSize: '2.8rem', fontWeight: '900', color: '#1e293b', marginTop: '0.25rem' }}>
                {transferItems.reduce((acc, i) => acc + i.quantity, 0)}
              </div>
            </div>

            <button 
              type="button"
              onClick={handleSubmit}
              disabled={isProcessing || !fromBranchId || transferItems.length === 0}
              style={{
                width: '100%',
                padding: '1.1rem',
                borderRadius: '10px',
                backgroundColor: '#6366f1',
                color: 'white',
                border: 'none',
                fontSize: '1.1rem',
                fontWeight: '800',
                cursor: (isProcessing || !fromBranchId || transferItems.length === 0) ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
                transition: 'background-color 0.2s',
                opacity: (isProcessing || !fromBranchId || transferItems.length === 0) ? 0.6 : 1,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '0.5rem'
              }}
              onMouseEnter={e => {
                if (!isProcessing && fromBranchId && transferItems.length > 0) e.currentTarget.style.backgroundColor = '#4f46e5';
              }}
              onMouseLeave={e => {
                if (!isProcessing && fromBranchId && transferItems.length > 0) e.currentTarget.style.backgroundColor = '#6366f1';
              }}
            >
              {isProcessing ? (
                'Guardando...'
              ) : (
                <>
                  <CheckCircle2 size={20} />
                  Guardar Cambios
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
              {isSearching ? (
                <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#64748b', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                  <div className="animate-spin" style={{ width: '32px', height: '32px', border: '3px solid #f3e8ff', borderTopColor: '#6366f1', borderRadius: '50%' }} />
                  <span style={{ fontSize: '0.95rem', fontWeight: '500', color: '#64748b' }}>Buscando productos...</span>
                </div>
              ) : displayedProducts.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No se encontraron productos coincidentes</div>
              ) : (
                displayedProducts.slice(0, 30).map((p: any) => {
                  const inCart = transferItems.some(i => i.productId === p.id);
                  const sourceStock = sourceStocks ? (sourceStocks.productStocks[p.sku] ?? 0) : 0;
                  const isSelectable = ventasConfig.venderSinStock || !isDispatched || sourceStock > 0;
                  return (
                    <div 
                      key={p.id}
                      onClick={() => {
                        if (isSelectable) {
                          handleProductClick(p);
                          setSearchTerm('');
                          setIsSearchModalOpen(false);
                        } else {
                          alert('Producto sin stock disponible para traspaso.');
                        }
                      }}
                      style={{
                        padding: '0.75rem 1rem',
                        borderBottom: '1px solid #f1f5f9',
                        cursor: isSelectable ? 'pointer' : 'not-allowed',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderRadius: '6px',
                        transition: 'background-color 0.15s',
                        opacity: isSelectable ? 1 : 0.5
                      }}
                      onMouseEnter={e => {
                        if (isSelectable) e.currentTarget.style.backgroundColor = '#f8fafc';
                      }}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '0.95rem', color: '#1e293b' }}>{p.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.15rem' }}>
                          SKU: {p.sku || '-'} | Código: {p.barcode || '-'} | Stock en origen: <span style={{ color: sourceStock > 0 ? '#16a34a' : '#dc2626', fontWeight: 'bold' }}>{sourceStock}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        {inCart && (
                          <span style={{ fontSize: '0.75rem', backgroundColor: '#e0f2fe', color: '#0369a1', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 'bold' }}>Agregado</span>
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

      {/* Variant Selection Modal */}
      {selectedProductForVariant && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', width: '450px', maxWidth: '90%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.25rem', color: '#1e293b' }}>
               Seleccionar Variante a Solicitar
            </h2>
            <div style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              {selectedProductForVariant.name}
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '50vh', overflowY: 'auto' }}>
              {selectedProductForVariant.variants.map((v: any) => {
                const key = `${selectedProductForVariant.sku}_${v.attribute}`;
                const sourceVStock = sourceStocks ? (sourceStocks.variantStocks[key] ?? 0) : 0;
                const canSelect = ventasConfig.venderSinStock || !isDispatched || sourceVStock > 0;
                return (
                  <button
                    key={v.id}
                    onClick={() => {
                      handleAdd(selectedProductForVariant, v);
                      setSelectedProductForVariant(null);
                    }}
                    disabled={!canSelect}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.85rem 1rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      backgroundColor: 'white',
                      cursor: canSelect ? 'pointer' : 'not-allowed',
                      textAlign: 'left',
                      opacity: canSelect ? 1 : 0.5,
                      transition: 'border-color 0.2s, background-color 0.2s'
                    }}
                    onMouseEnter={e => {
                      if (canSelect) {
                        e.currentTarget.style.borderColor = '#6366f1';
                        e.currentTarget.style.backgroundColor = '#eff6ff';
                      }
                    }}
                    onMouseLeave={e => {
                      if (canSelect) {
                        e.currentTarget.style.borderColor = '#cbd5e1';
                        e.currentTarget.style.backgroundColor = 'white';
                      }
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 'bold', color: '#1e293b' }}>{v.attribute}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.1rem' }}>SKU: {v.sku || '-'} | Código: {selectedProductForVariant.barcode || '-'}</div>
                    </div>
                    <div style={{ fontSize: '0.85rem', fontWeight: '600', color: sourceVStock > 0 ? '#16a34a' : '#dc2626' }}>
                      {sourceVStock} disp. en origen
                    </div>
                  </button>
                );
              })}
            </div>

            <div style={{ marginTop: '1.5rem', textAlign: 'right', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
              <button 
                type="button"
                onClick={() => setSelectedProductForVariant(null)} 
                style={{ padding: '0.6rem 1.5rem', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', background: '#f1f5f9', color: '#475569', fontWeight: 'bold', fontSize: '0.9rem' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
