'use client';

import { useState, useEffect } from 'react';
import { requestTransfer, dispatchDirectTransfer } from '@/app/actions/transfer';
import { useRouter } from 'next/navigation';
import { Truck, ArrowRight, Trash2, Search, Plus, Minus, FileText, CheckCircle2 } from 'lucide-react';
import { useOfflineSync } from '@/app/components/OfflineSyncProvider';

export default function TransferClient({ originBranchId, originBranchName, otherBranches: initialOtherBranches, inventory: initialInventory, ventasConfig = {}, isDirectDispatch = false }: any) {
  const router = useRouter();
  const { isOnline, pushOfflineTransfer } = useOfflineSync();
  const [targetBranchId, setTargetBranchId] = useState('');
  const [reason, setReason] = useState(isDirectDispatch ? 'Traspaso Directo' : 'Reabastecimiento');
  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState('ALL');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  
  const [inventory, setInventory] = useState(initialInventory || []);
  const [otherBranches, setOtherBranches] = useState(initialOtherBranches || []);
  const [transferItems, setTransferItems] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [isMounted, setIsMounted] = useState(false);

  // States for transfers en espera
  const [onHoldTransfers, setOnHoldTransfers] = useState<any[]>([]);

  // Variant Modal
  const [selectedProductForVariant, setSelectedProductForVariant] = useState<any | null>(null);

  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`caanma_on_hold_transfers_out_${originBranchId}`);
      if (stored) {
        try {
          setOnHoldTransfers(JSON.parse(stored));
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, [originBranchId]);

  useEffect(() => {
    if (!isOnline) {
      import('@/lib/offlineDB').then(({ db }) => {
        db.products.toArray().then(res => setInventory(res.length ? res : initialInventory));
        db.branches.toArray().then(res => {
          if (res.length) {
            setOtherBranches(res.filter(b => b.id !== originBranchId && b.id !== 'GLOBAL'));
          } else {
            setOtherBranches(initialOtherBranches);
          }
        });
      });
    } else {
      setInventory(initialInventory);
      setOtherBranches(initialOtherBranches);
    }
  }, [isOnline, initialInventory, initialOtherBranches, originBranchId]);

  const handlePutOnHold = () => {
    if (transferItems.length === 0) {
      alert('No hay artículos agregados al traspaso.');
      return;
    }
    const name = prompt('Asigna un nombre o identificador para este traspaso en espera (opcional):', `Traspaso #${onHoldTransfers.length + 1}`);
    if (name === null) return; // user cancelled

    const newTransfer = {
      id: Date.now().toString(),
      name: name.trim() || `Traspaso #${onHoldTransfers.length + 1}`,
      transferItems,
      targetBranchId,
      reason,
      timestamp: new Date().toLocaleString(),
    };

    const updated = [newTransfer, ...onHoldTransfers];
    setOnHoldTransfers(updated);
    localStorage.setItem(`caanma_on_hold_transfers_out_${originBranchId}`, JSON.stringify(updated));

    // Clear current fields
    setTransferItems([]);
    setTargetBranchId('');
    setReason(isDirectDispatch ? 'Traspaso Directo' : 'Reabastecimiento');
    alert('Traspaso guardado en espera.');
  };

  const handleRestoreTransfer = (transfer: any) => {
    if (transferItems.length > 0) {
      const confirmMerge = confirm('Tienes artículos en el traspaso actual. ¿Deseas reemplazar el traspaso actual con el seleccionado en espera?');
      if (!confirmMerge) return;
    }

    setTransferItems(transfer.transferItems);
    setTargetBranchId(transfer.targetBranchId || '');
    setReason(transfer.reason || (isDirectDispatch ? 'Traspaso Directo' : 'Reabastecimiento'));

    // Remove from list
    const updated = onHoldTransfers.filter(t => t.id !== transfer.id);
    setOnHoldTransfers(updated);
    localStorage.setItem(`caanma_on_hold_transfers_out_${originBranchId}`, JSON.stringify(updated));
  };

  const handleDeleteOnHold = (transferId: string) => {
    if (!confirm('¿Estás seguro de eliminar este traspaso en espera?')) return;
    const updated = onHoldTransfers.filter(t => t.id !== transferId);
    setOnHoldTransfers(updated);
    localStorage.setItem(`caanma_on_hold_transfers_out_${originBranchId}`, JSON.stringify(updated));
  };

  const removeAccents = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const displayedProducts = inventory.filter((p: any) => {
    // Stock Filter
    if (stockFilter === 'WITH_STOCK' && p.stock <= 0) return false;
    if (stockFilter === 'WITHOUT_STOCK' && p.stock > 0) return false;

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
    const maxStock = variant ? variant.stock : product.stock;
    const sku = variant?.sku || product.sku;

    const existing = transferItems.find(i => i.listId === listId);
    if (existing) {
      if (!isDirectDispatch && !ventasConfig.venderSinStock && existing.quantity >= maxStock) {
          alert('Cantidad excede el stock disponible.');
          return;
      }
      setTransferItems(transferItems.map(i => i.listId === listId ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      if (!isDirectDispatch && !ventasConfig.venderSinStock && maxStock <= 0) {
          alert('Este producto no tiene stock y los traspasos sin stock están desactivados.');
          return;
      }
      setTransferItems([...transferItems, {
        listId,
        productId: product.id,
        variantId: variant ? variant.id : null,
        name,
        sku,
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
         if (!isDirectDispatch && !ventasConfig.venderSinStock && parsed > i.maxStock) {
           return { ...i, quantity: i.maxStock };
         }
         return { ...i, quantity: parsed };
      }
      return i;
    }));
  };

  const handleSubmit = async () => {
    if (!targetBranchId || transferItems.length === 0) return;
    setIsProcessing(true);
    try {
      const itemsPayload = transferItems.map(i => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity }));
      
      if (!isOnline) {
         await pushOfflineTransfer({
            fromBranchId: isDirectDispatch ? originBranchId : targetBranchId,
            toBranchId: isDirectDispatch ? targetBranchId : originBranchId,
            reason,
            items: itemsPayload,
            isDirectDispatch
         });
      } else {
         if (isDirectDispatch) {
            await dispatchDirectTransfer({ toBranchId: targetBranchId, reason, items: itemsPayload });
         } else {
            await requestTransfer({ fromBranchId: targetBranchId, reason, items: itemsPayload });
         }
      }

      if (confirm('Operación realizada correctamente. ¿Deseas imprimir etiquetas para los productos seleccionados?')) {
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
            <Truck size={28} color="#a78bfa" /> {isDirectDispatch ? 'Traspaso Directo (Salida)' : 'Traspaso de Inventario (Solicitud)'}
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            {isDirectDispatch 
              ? 'Envía artículos directamente a otra sucursal descontando stock de forma inmediata.' 
              : 'Solicita artículos a otra sucursal para reabastecer tu inventario.'}
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
          
          {/* Branch configuration visuals */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#64748b', marginBottom: '0.5rem' }}>Sucursal de Origen</label>
              <div style={{ padding: '0.65rem 0.75rem', backgroundColor: '#f1f5f9', borderRadius: '8px', border: '1px solid #cbd5e1', color: '#475569', fontWeight: '600', fontSize: '0.9rem', minHeight: '40px', display: 'flex', alignItems: 'center' }}>
                {isDirectDispatch ? originBranchName : 'Sucursal de Destino'}
              </div>
            </div>
            
            <div style={{ alignSelf: 'flex-end', paddingBottom: '0.5rem', color: '#a78bfa' }}>
              <ArrowRight size={24} />
            </div>

            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#64748b', marginBottom: '0.5rem' }}>Sucursal de Destino <span style={{ color: 'red' }}>*</span></label>
              <select value={targetBranchId} onChange={e => setTargetBranchId(e.target.value)} style={{ width: '100%', padding: '0.65rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 'bold', fontSize: '0.9rem', height: '42px', outline: 'none' }}>
                <option value="">-- Seleccionar Destino --</option>
                {otherBranches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#64748b', marginBottom: '0.5rem' }}>Motivo / Justificación</label>
            <input type="text" value={reason} onChange={e => setReason(e.target.value)} style={{ width: '100%', padding: '0.65rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', height: '42px', outline: 'none' }} placeholder="Ej. Reabastecimiento, Devolución..." />
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
                  {displayedProducts.length === 0 ? (
                    <div style={{ padding: '1.25rem', color: '#64748b', textAlign: 'center', fontSize: '0.95rem' }}>
                      No se encontraron productos coincidentes
                    </div>
                  ) : (
                    displayedProducts.slice(0, 15).map((p: any) => (
                      <div
                        key={p.id}
                        onClick={() => {
                          if (ventasConfig.venderSinStock || p.stock > 0 || !isDirectDispatch) {
                            handleProductClick(p);
                            setSearchTerm('');
                            setShowSearchDropdown(false);
                          } else {
                            alert('Producto sin stock disponible para traspaso.');
                          }
                        }}
                        style={{
                          padding: '0.75rem 1.25rem',
                          borderBottom: '1px solid #f1f5f9',
                          cursor: (ventasConfig.venderSinStock || p.stock > 0 || !isDirectDispatch) ? 'pointer' : 'not-allowed',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          transition: 'background-color 0.15s',
                          opacity: (ventasConfig.venderSinStock || p.stock > 0 || !isDirectDispatch) ? 1 : 0.5
                        }}
                        onMouseEnter={e => {
                          if (ventasConfig.venderSinStock || p.stock > 0 || !isDirectDispatch) {
                            e.currentTarget.style.backgroundColor = '#f8fafc';
                          }
                        }}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '0.95rem', color: '#1e293b' }}>{p.name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
                            SKU: {p.sku || 'S/N'} | Categoría: {p.category || 'General'}
                          </div>
                        </div>
                        <div style={{ fontWeight: 'bold', color: p.stock > 0 ? '#16a34a' : '#dc2626', fontSize: '0.95rem' }}>
                          Existencia: {p.stock} pza(s)
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
          
          <select 
            value={stockFilter} 
            onChange={e => setStockFilter(e.target.value)} 
            style={{ padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', color: '#334155', backgroundColor: 'white', minWidth: '160px', fontSize: '0.95rem', outline: 'none', height: '46px' }}
          >
            <option value="ALL">Todas las existencias</option>
            <option value="WITH_STOCK">Con Stock</option>
            <option value="WITHOUT_STOCK">Agotados</option>
          </select>
        </div>
      </div>

      {/* HORIZONTAL BROWSER TABS FOR TRANSFERS ON HOLD */}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1.5rem', paddingBottom: '0.5rem' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#64748b', marginRight: '0.5rem' }}>Traspasos en Espera:</span>
        {onHoldTransfers.length === 0 ? (
          <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>No hay traspasos pendientes</span>
        ) : (
          onHoldTransfers.map((transfer) => (
            <div key={transfer.id} style={{ display: 'flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
              <button
                type="button"
                onClick={() => handleRestoreTransfer(transfer)}
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
                title={`Cargar ${transfer.name}`}
              >
                {transfer.name}
              </button>
              <button
                type="button"
                onClick={() => handleDeleteOnHold(transfer.id)}
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
        
        {/* LEFT COLUMN: LIST OF TRANSFER ITEMS (70% width) */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#1e293b', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            Artículos en este Paquete ({transferItems.length})
          </h3>

          {transferItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 2rem', color: '#94a3b8', border: '2px dashed #e2e8f0', borderRadius: '12px' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚚</div>
              <div style={{ fontWeight: 'bold', fontSize: '1.05rem', color: '#64748b' }}>No hay artículos en el traspaso</div>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                Busca productos en la barra superior para agregarlos al envío.
              </p>
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
                        max={isDirectDispatch ? item.maxStock : undefined}
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
                    {isDirectDispatch && (
                      <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.25rem', textAlign: 'center' }}>
                        De {item.maxStock} disponibles
                      </div>
                    )}
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
          
          {/* Summary/Instructions Info */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={16} color="#64748b" /> Detalles del Envío
            </h4>
            <div style={{ fontSize: '0.825rem', color: '#64748b', lineHeight: '1.4' }}>
              Los traspasos requieren validación de stock físico en origen. Asegúrate de verificar que las cantidades empacadas correspondan al reporte de traspaso impreso.
            </div>
          </div>

          {/* Action Execution card */}
          <div className="card" style={{ padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            
            <button 
              type="button"
              onClick={handleSubmit}
              disabled={isProcessing || !targetBranchId || transferItems.length === 0}
              style={{
                width: '100%',
                padding: '1.1rem',
                borderRadius: '10px',
                backgroundColor: '#a78bfa', // Premium lavender
                color: 'white',
                border: 'none',
                fontSize: '1.1rem',
                fontWeight: '800',
                cursor: (isProcessing || !targetBranchId || transferItems.length === 0) ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 14px rgba(167, 139, 250, 0.35)',
                transition: 'background-color 0.2s, transform 0.1s',
                opacity: (isProcessing || !targetBranchId || transferItems.length === 0) ? 0.6 : 1,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '0.5rem'
              }}
              onMouseEnter={e => {
                if (!isProcessing && targetBranchId && transferItems.length > 0) e.currentTarget.style.backgroundColor = '#8b5cf6';
              }}
              onMouseLeave={e => {
                if (!isProcessing && targetBranchId && transferItems.length > 0) e.currentTarget.style.backgroundColor = '#a78bfa';
              }}
            >
              {isProcessing ? (
                'Enviando...'
              ) : (
                <>
                  <CheckCircle2 size={20} />
                  {isDirectDispatch ? 'Confirmar Traspaso' : 'Crear Solicitud'}
                </>
              )}
            </button>
          </div>
        </div>

      </div>

      {/* Variant Selection Modal */}
      {selectedProductForVariant && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', width: '450px', maxWidth: '90%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.25rem', color: '#1e293b' }}>
               Seleccionar Variante a Traspasar
            </h2>
            <div style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              {selectedProductForVariant.name}
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '50vh', overflowY: 'auto' }}>
              {selectedProductForVariant.variants.map((v: any) => {
                const canSelect = ventasConfig.venderSinStock || v.stock > 0 || !isDirectDispatch;
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
                    <div style={{ fontSize: '0.85rem', fontWeight: '600', color: v.stock > 0 ? '#16a34a' : '#dc2626' }}>
                      {v.stock} disp.
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
