'use client';

import { useState, useEffect } from 'react';
import { requestTransfer, getBranchStocksForTransfer } from '@/app/actions/transfer';
import { searchProducts } from '@/app/actions/product';
import { useRouter } from 'next/navigation';
import { Truck, ArrowRight, Trash2, Search, Plus, Minus, FileText, CheckCircle2, ShoppingBag, Camera, ArrowDownUp } from 'lucide-react';
import BarcodeScannerModal from '@/app/components/BarcodeScannerModal';

export default function TransferClient({ originBranchId, originBranchName, otherBranches, inventory, ventasConfig = {} }: any) {
  const router = useRouter();
  const [fromBranchId, setFromBranchId] = useState('');
  const [reason, setReason] = useState('Reabastecimiento');
  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState('ALL');
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [products, setProducts] = useState<any[]>(inventory);
  const [isSearching, setIsSearching] = useState(false);
  
  const [transferItems, setTransferItems] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [isMounted, setIsMounted] = useState(false);

  // States for transfers en espera
  const [onHoldTransfers, setOnHoldTransfers] = useState<any[]>([]);

  // Variant Modal
  const [selectedProductForVariant, setSelectedProductForVariant] = useState<any | null>(null);

  // Stock from source branch states
  const [sourceStocks, setSourceStocks] = useState<any>(null);
  const [isLoadingStocks, setIsLoadingStocks] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`caanma_on_hold_transfers_req_${originBranchId}`);
      if (stored) {
        try {
          setOnHoldTransfers(JSON.parse(stored));
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, [originBranchId]);

  // Debounced search for products on-demand
  useEffect(() => {
    if (!searchTerm.trim()) {
      setProducts(inventory);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchProducts(searchTerm, originBranchId);
        setProducts(results || []);
      } catch (error) {
        console.error("Error searching products:", error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, originBranchId, inventory]);

  // Load stocks when fromBranchId changes
  useEffect(() => {
    if (!fromBranchId) {
      setSourceStocks(null);
      setTransferItems([]);
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

  // Reactively sync existing items maxStock and quantity based on new origin branch stocks
  useEffect(() => {
    if (!sourceStocks) return;

    setTransferItems(prevItems => {
      let changed = false;
      const updated = prevItems.map(item => {
        let newMaxStock = 0;
        const pSku = item.productSku || inventory.find((p: any) => p.id === item.productId)?.sku;
        if (item.variantId) {
          const vAttr = item.variantAttribute || inventory.find((p: any) => p.id === item.productId)?.variants?.find((v: any) => v.id === item.variantId)?.attribute;
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
  }, [sourceStocks, inventory, ventasConfig.venderSinStock]);

  const handlePutOnHold = () => {
    if (transferItems.length === 0) {
      alert('No hay artículos agregados al traspaso.');
      return;
    }
    const name = prompt('Asigna un nombre o identificador para esta solicitud de traspaso en espera (opcional):', `Solicitud #${onHoldTransfers.length + 1}`);
    if (name === null) return; // user cancelled

    const newTransfer = {
      id: Date.now().toString(),
      name: name.trim() || `Solicitud #${onHoldTransfers.length + 1}`,
      transferItems,
      fromBranchId,
      reason,
      timestamp: new Date().toLocaleString(),
    };

    const updated = [newTransfer, ...onHoldTransfers];
    setOnHoldTransfers(updated);
    localStorage.setItem(`caanma_on_hold_transfers_req_${originBranchId}`, JSON.stringify(updated));

    // Clear current fields
    setTransferItems([]);
    setFromBranchId('');
    setReason('Reabastecimiento');
    alert('Solicitud de traspaso guardada en espera.');
  };

  const handleRestoreTransfer = (transfer: any) => {
    if (transferItems.length > 0) {
      const confirmMerge = confirm('Tienes artículos en la solicitud de traspaso actual. ¿Deseas reemplazar el traspaso actual con el seleccionado en espera?');
      if (!confirmMerge) return;
    }

    setTransferItems(transfer.transferItems);
    setFromBranchId(transfer.fromBranchId || '');
    setReason(transfer.reason || 'Reabastecimiento');

    // Remove from list
    const updated = onHoldTransfers.filter(t => t.id !== transfer.id);
    setOnHoldTransfers(updated);
    localStorage.setItem(`caanma_on_hold_transfers_req_${originBranchId}`, JSON.stringify(updated));
  };

  const handleDeleteOnHold = (transferId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta solicitud de traspaso en espera?')) return;
    const updated = onHoldTransfers.filter(t => t.id !== transferId);
    setOnHoldTransfers(updated);
    localStorage.setItem(`caanma_on_hold_transfers_req_${originBranchId}`, JSON.stringify(updated));
  };

  const removeAccents = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const displayedProducts = products.filter((p: any) => {
    // Stock Filter in origin branch
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
      setSelectedProductForVariant(product);
    } else {
      handleAdd(product, null);
    }
  };

  const handleAdd = (product: any, variant: any | null) => {
    const listId = variant ? `v_${variant.id}` : product.id;
    const name = variant ? `${product.name} (${variant.attribute})` : product.name;
    
    // Resolve maxStock using sourceStocks!
    const key = variant ? `${product.sku}_${variant.attribute}` : product.sku;
    const sourceStock = variant 
      ? (sourceStocks?.variantStocks[key] ?? 0)
      : (sourceStocks?.productStocks[key] ?? 0);
    const maxStock = sourceStock;
    
    const sku = variant?.sku || product.sku;

    const existing = transferItems.find(i => i.listId === listId);
    if (existing) {
      if (!ventasConfig.venderSinStock && existing.quantity >= maxStock) {
          alert('Cantidad excede el stock disponible en origen.');
          return;
      }
      setTransferItems(transferItems.map(i => i.listId === listId ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      if (!ventasConfig.venderSinStock && maxStock <= 0) {
          alert('Este producto no tiene stock disponible en origen y los traspasos sin stock están desactivados.');
          return;
      }
      setTransferItems([...transferItems, {
        listId,
        productId: product.id,
        variantId: variant ? variant.id : null,
        name,
        sku,
        productSku: product.sku,
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
  
  const updateQuantity = (listId: string, qty: number) => {
    const parsed = parseInt(qty as any, 10);
    if (isNaN(parsed) || parsed < 1) return;
    setTransferItems(transferItems.map(i => {
      if (i.listId === listId) {
         if (!ventasConfig.venderSinStock && parsed > i.maxStock) {
           return { ...i, quantity: i.maxStock };
         }
         return { ...i, quantity: parsed };
      }
      return i;
    }));
  };

  const handleSubmit = async () => {
    if (!fromBranchId || transferItems.length === 0) return;
    setIsProcessing(true);
    try {
      const res = await requestTransfer({
        fromBranchId,
        reason,
        items: transferItems.map(i => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity }))
      });

      if (res && !res.success) {
        throw new Error(res.error || "Error al solicitar traspaso");
      }

      if (confirm('Solicitud de traspaso enviada correctamente. ¿Deseas imprimir etiquetas para los productos solicitados?')) {
        const ids = transferItems.map(i => i.productId).join(',');
        window.open(`/productos/etiquetas?ids=${ids}`, '_blank', 'width=400,height=600');
      }

      router.push('/productos/traspasos');
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
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}>
            <Truck size={28} color="#a78bfa" /> Solicitar Traspaso de Inventario
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Solicita artículos a otra sucursal para reabastecer tu inventario.
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

      {/* TOP ROW: Filters, Search bar trigger & Branch configurations */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1.5rem', padding: '1rem 0', marginBottom: '1.5rem', width: '100%', flexWrap: 'wrap', borderBottom: '1px solid #e2e8f0' }}>
        
        {/* Left Side: Search Trigger & Stock Filter */}
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap', flex: 1, minWidth: '300px' }}>
          
          {/* SEARCH INPUT TRIGGER (opens popup) */}
          <div style={{ display: 'flex', flexDirection: 'column', width: '280px' }}>
            <div 
              onClick={() => {
                if (!fromBranchId) {
                  alert('Por favor, selecciona primero la sucursal de origen en "Solicitar A".');
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
              Buscar por nombre, SKU o código de barras...
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!fromBranchId) {
                    alert('Por favor, selecciona primero la sucursal de origen en "Solicitar A".');
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

          {/* Stock Filter */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b' }}>Filtrar por Stock</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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
                <option value="ALL">Todas las existencias</option>
                <option value="WITH_STOCK">Con Stock</option>
                <option value="WITHOUT_STOCK">Agotados</option>
              </select>
              <button 
                type="button" 
                onClick={() => setStockFilter('ALL')} 
                style={{ 
                  color: '#3b82f6', 
                  background: 'none', 
                  border: 'none', 
                  cursor: 'pointer', 
                  textDecoration: 'underline', 
                  fontSize: '0.85rem', 
                  fontWeight: '500' 
                }}
              >
                Limpiar Filtros
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Source Branch Selector aligned with sidebar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: '380px', justifyContent: 'flex-end' }}>
          <span style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#475569' }}>Solicitar A</span>
          <select 
            value={fromBranchId} 
            onChange={e => setFromBranchId(e.target.value)} 
            style={{ width: '280px', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', fontWeight: 'bold', outline: 'none', height: '40px' }}
          >
            <option value="">-- Seleccionar Sucursal --</option>
            {otherBranches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>

      </div>



      {/* MAIN TWO-COLUMN BODY LAYOUT */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* LEFT COLUMN: LIST OF TRANSFER ITEMS (70% width) */}
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', minHeight: '450px', border: '1px solid #cbd5e1' }}>
          {transferItems.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: '#94a3b8', padding: '4rem 1rem' }}>
              <ShoppingBag size={64} color="#cbd5e1" style={{ marginBottom: '1rem' }} />
              <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#64748b' }}>El ticket está vacío</div>
              <div style={{ fontSize: '0.9rem', marginTop: '0.5rem', color: '#94a3b8' }}>Escribe en el buscador de arriba para agregar artículos.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {transferItems.map((item) => (
                <div key={item.listId} style={{ display: 'grid', gridTemplateColumns: '40px 1fr auto auto', gap: '1.25rem', alignItems: 'center', padding: '1rem', border: '1px solid #f1f5f9', borderRadius: '10px', backgroundColor: '#f8fafc' }}>
                  
                  {/* Initials avatar badge */}
                  <div style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6', fontWeight: 'bold', fontSize: '0.8rem', overflow: 'hidden', position: 'relative' }}>
                    <span>{item.name.substring(0, 2).toUpperCase()}</span>
                    {isMounted && item.imageUrl && !imageErrors[item.listId] && (
                      <img 
                        src={item.imageUrl.replace(/#/g, '%23')} 
                        alt="" 
                        onError={() => setImageErrors(prev => ({ ...prev, [item.listId]: true }))}
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
                      SKU: {item.sku || 'S/N'}
                    </div>
                  </div>

                  {/* Quantity selector */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.listId, Math.max(1, item.quantity - 1))}
                        style={{ border: '1px solid #cbd5e1', background: 'white', borderRadius: '6px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background-color 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}
                      >
                        <Minus size={14} color="#64748b" />
                      </button>
                      <input 
                        type="number" 
                        min="1" 
                        max={item.maxStock}
                        value={item.quantity}
                        onChange={e => updateQuantity(item.listId, Number(e.target.value))}
                        style={{ width: '50px', height: '32px', textAlign: 'center', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem', outline: 'none' }}
                      />
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.listId, item.quantity + 1)}
                        style={{ border: '1px solid #cbd5e1', background: 'white', borderRadius: '6px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background-color 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}
                      >
                        <Plus size={14} color="#64748b" />
                      </button>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.25rem', textAlign: 'center' }}>
                      De {item.maxStock} disponibles
                    </div>
                  </div>

                  {/* Actions / Remove */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', minWidth: '60px' }}>
                    <button 
                      type="button"
                      onClick={() => removeItem(item.listId)} 
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

        {/* RIGHT COLUMN: ACTION & SUMMARY SIDEBAR (30% width) */}
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
              Solicitud Activa
            </div>
            {onHoldTransfers.map((transfer) => (
              <div key={transfer.id} style={{ display: 'flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden', backgroundColor: 'white' }}>
                <button
                  type="button"
                  onClick={() => handleRestoreTransfer(transfer)}
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
                  {transfer.name}
                </button>
                <button 
                  type="button" 
                  onClick={() => handleDeleteOnHold(transfer.id)}
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
              Pausar Solicitud
            </button>
          </div>

          {/* Branch configuration visuals */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#64748b', marginBottom: '0.5rem' }}>Recibe (Mi Sucursal)</label>
            <div style={{ padding: '0.65rem 0.75rem', backgroundColor: '#f1f5f9', borderRadius: '8px', border: '1px solid #cbd5e1', color: '#475569', fontWeight: '600', fontSize: '0.9rem', minHeight: '40px', display: 'flex', alignItems: 'center' }}>
              {originBranchName}
            </div>
          </div>

          {/* Motivo / Justificación */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#64748b', marginBottom: '0.5rem' }}>Motivo / Justificación</label>
            <input type="text" value={reason} onChange={e => setReason(e.target.value)} style={{ width: '100%', padding: '0.65rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', height: '40px', outline: 'none' }} placeholder="Ej. Reabastecimiento, Devolución..." />
          </div>

          {/* Summary/Instructions Info */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={16} color="#64748b" /> Detalles de la Solicitud
            </h4>
            <div style={{ fontSize: '0.825rem', color: '#64748b', lineHeight: '1.4' }}>
              Esta solicitud enviará una notificación a la sucursal seleccionada. Los administradores de dicha sucursal deberán aprobar y despachar la mercancía para completar el traspaso.
            </div>
          </div>

          {/* Action Execution card */}
          <div className="card" style={{ padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
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
                backgroundColor: '#a78bfa',
                color: 'white',
                border: 'none',
                fontSize: '1.2rem',
                fontWeight: '800',
                cursor: (isProcessing || !fromBranchId || transferItems.length === 0) ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 14px rgba(167, 139, 250, 0.4)',
                transition: 'background-color 0.2s, transform 0.1s',
                opacity: (isProcessing || !fromBranchId || transferItems.length === 0) ? 0.6 : 1,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '0.5rem'
              }}
              onMouseEnter={e => {
                if (!isProcessing && fromBranchId && transferItems.length > 0) e.currentTarget.style.backgroundColor = '#8b5cf6';
              }}
              onMouseLeave={e => {
                if (!isProcessing && fromBranchId && transferItems.length > 0) e.currentTarget.style.backgroundColor = '#a78bfa';
              }}
            >
              {isProcessing ? (
                'Enviando...'
              ) : (
                <>
                  <CheckCircle2 size={20} />
                  Crear Solicitud de Traspaso
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
                  <div className="animate-spin" style={{ width: '32px', height: '32px', border: '3px solid #f3e8ff', borderTopColor: '#8b5cf6', borderRadius: '50%' }} />
                  <span style={{ fontSize: '0.95rem', fontWeight: '500', color: '#64748b' }}>Buscando productos...</span>
                </div>
              ) : displayedProducts.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No se encontraron productos coincidentes</div>
              ) : (
                displayedProducts.slice(0, 30).map((p: any) => {
                  const inCart = transferItems.some(i => i.productId === p.id);
                  const sourceStock = sourceStocks ? (sourceStocks.productStocks[p.sku] ?? 0) : 0;
                  const isSelectable = ventasConfig.venderSinStock || sourceStock > 0;
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
                          SKU: {p.sku || 'N/A'} | Stock en origen: <span style={{ color: sourceStock > 0 ? '#16a34a' : '#dc2626', fontWeight: 'bold' }}>{sourceStock}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
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
                const canSelect = ventasConfig.venderSinStock || sourceVStock > 0;
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
                        e.currentTarget.style.borderColor = '#8b5cf6';
                        e.currentTarget.style.backgroundColor = '#f3e8ff';
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
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.1rem' }}>SKU: {v.sku || 'N/A'}</div>
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
