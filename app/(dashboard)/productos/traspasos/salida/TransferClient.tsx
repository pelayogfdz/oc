'use client';

import { useState, useEffect } from 'react';
import { requestTransfer, dispatchDirectTransfer } from '@/app/actions/transfer';
import { useRouter } from 'next/navigation';
import { Truck, ArrowRight, Trash2, Search, Image as ImageIcon } from 'lucide-react';
import { useOfflineSync } from '@/app/components/OfflineSyncProvider';
import ProductTableUI from '@/app/components/ProductTableUI';

export default function TransferClient({ originBranchId, originBranchName, otherBranches: initialOtherBranches, inventory: initialInventory, ventasConfig = {}, isDirectDispatch = false }: any) {
  const router = useRouter();
  const { isOnline, pushOfflineTransfer } = useOfflineSync();
  const [targetBranchId, setTargetBranchId] = useState('');
  const [reason, setReason] = useState(isDirectDispatch ? 'Traspaso Directo' : 'Reabastecimiento');
  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState('ALL');
  
  const [inventory, setInventory] = useState(initialInventory || []);
  const [otherBranches, setOtherBranches] = useState(initialOtherBranches || []);

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

  const [transferItems, setTransferItems] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Variant Modal
  const [selectedProductForVariant, setSelectedProductForVariant] = useState<any | null>(null);

  const removeAccents = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const displayedProducts = inventory.filter((p: any) => {
    // Stock Filter
    if (stockFilter === 'WITH_STOCK' && p.stock <= 0) return false;
    if (stockFilter === 'WITHOUT_STOCK' && p.stock > 0) return false;

    if (!searchTerm.trim()) return true;
    const searchTerms = removeAccents(searchTerm.toLowerCase().trim()).split(/\s+/);
    const searchableString = removeAccents(`${p.name || ''} ${p.description || ''} ${p.sku || ''} ${p.barcode || ''}`.toLowerCase());
    
    // Todas las palabras deben coincidir (sin importar orden ni acentos)
    return searchTerms.every(term => searchableString.includes(term));
  }).slice(0, 50); // Muestra 50 por si acaso hay muchos resultados

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
    <div style={{ display: 'flex', gap: '2rem', height: 'calc(100vh - 200px)' }}>
      {/* Left: Product Selector */}
      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>Buscador de Inventario</h2>
        
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '300px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input 
              type="text" 
              placeholder="Buscar por nombre, SKU o código de barras..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
            />
          </div>
          <select 
            value={stockFilter} 
            onChange={e => setStockFilter(e.target.value)} 
            style={{ padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', color: '#334155', backgroundColor: 'white', minWidth: '150px', fontSize: '0.95rem', outline: 'none' }}
          >
            <option value="ALL">Todas las existencias</option>
            <option value="WITH_STOCK">Con Stock</option>
            <option value="WITHOUT_STOCK">Agotados</option>
          </select>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
           <ProductTableUI 
             products={displayedProducts}
             showCheckboxes={false}
             onRowClick={(prod) => {
               if (ventasConfig.venderSinStock || prod.stock > 0) {
                 handleProductClick(prod);
               }
             }}
           />
        </div>
      </div>

      {/* Right: Wizard Form & Cart */}
      <div style={{ width: '450px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
           <div>
             {isDirectDispatch ? (
                <>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', color: 'var(--pulpos-text-muted)', marginBottom: '0.5rem' }}>Sale de (Mi Sucursal)</label>
                  <div style={{ padding: '0.75rem', backgroundColor: '#f1f5f9', borderRadius: '4px', border: '1px solid var(--pulpos-border)', color: '#475569', fontWeight: '500' }}>{originBranchName}</div>
                </>
             ) : (
                <>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', color: 'var(--pulpos-text-muted)', marginBottom: '0.5rem' }}>Solicitar A (Surte) <span style={{color:'red'}}>*</span></label>
                  <select value={targetBranchId} onChange={e => setTargetBranchId(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)', fontWeight: 'bold' }}>
                    <option value="">-- Seleccionar --</option>
                    {otherBranches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </>
             )}
           </div>
           
           <div>
             {isDirectDispatch ? (
                <>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', color: 'var(--pulpos-text-muted)', marginBottom: '0.5rem' }}>Enviar A (Destino) <span style={{color:'red'}}>*</span></label>
                  <select value={targetBranchId} onChange={e => setTargetBranchId(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)', fontWeight: 'bold' }}>
                    <option value="">-- Seleccionar --</option>
                    {otherBranches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </>
             ) : (
                <>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', color: 'var(--pulpos-text-muted)', marginBottom: '0.5rem' }}>Recibe (Mi Sucursal)</label>
                  <div style={{ padding: '0.75rem', backgroundColor: '#f1f5f9', borderRadius: '4px', border: '1px solid var(--pulpos-border)', color: '#475569', fontWeight: '500' }}>{originBranchName}</div>
                </>
             )}
           </div>
           <div>
             <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', color: 'var(--pulpos-text-muted)', marginBottom: '0.5rem' }}>Motivo</label>
             <input type="text" value={reason} onChange={e => setReason(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }} />
           </div>
        </div>

        <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Truck size={20} /> Artículos a Traspasar
          </h2>
          
          <div style={{ flex: 1, overflowY: 'auto' }}>
          {transferItems.length === 0 && (
             <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--pulpos-text-muted)', border: '2px dashed var(--pulpos-border)', borderRadius: '8px' }}>
               No has agregado productos.<br/>Búscalos en el panel izquierdo y agrégalos al paquete.
             </div>
          )}

          {transferItems.length > 0 && (
             <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
               <thead>
                 <tr style={{ borderBottom: '1px solid var(--pulpos-border)' }}>
                   <th style={{ padding: '0.5rem' }}>Producto</th>
                   <th style={{ padding: '0.5rem', width: '100px' }}>Cant.</th>
                   <th style={{ padding: '0.5rem', width: '30px' }}></th>
                 </tr>
               </thead>
               <tbody>
                 {transferItems.map(item => (
                   <tr key={item.listId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                     <td data-label="Producto" style={{ padding: '0.75rem 0.5rem', fontWeight: '500' }}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                         {item.imageUrl && (
                           <div style={{ width: '32px', height: '32px', backgroundColor: '#f1f5f9', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                             <img src={item.imageUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                           </div>
                         )}
                         <div>
                            <div>{item.name}</div>
                            <div style={{ color: 'var(--pulpos-text-muted)', fontSize: '0.75rem' }}>{item.sku || '--'}</div>
                         </div>
                       </div>
                     </td>
                     <td data-label="Cant." style={{ padding: '0.75rem 0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <input 
                            type="number" 
                            min="1" 
                            max={isDirectDispatch ? item.maxStock : undefined}
                            value={item.quantity} 
                            onChange={e => updateQuantity(item.listId, Number(e.target.value))}
                            style={{ width: '60px', padding: '0.25rem', border: '1px solid var(--pulpos-border)', borderRadius: '4px', textAlign: 'center' }}
                          />
                        </div>
                        {isDirectDispatch && <div style={{ fontSize: '0.75rem', color: 'var(--pulpos-text-muted)', marginTop: '0.2rem' }}>de {item.maxStock} disp.</div>}
                     </td>
                     <td data-label="Acciones" style={{ padding: '0.75rem 0.5rem' }}>
                       <button onClick={() => removeItem(item.listId)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={18}/></button>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
          )}
          </div>

          <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px dashed #cbd5e1', display: 'flex', justifyContent: 'center' }}>
             <button 
                className="btn-primary" 
                onClick={handleSubmit} 
                disabled={isProcessing || !targetBranchId || transferItems.length === 0}
                style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', opacity: (!targetBranchId || transferItems.length === 0 || isProcessing) ? 0.5 : 1 }}
             >
               {isProcessing ? 'Enviando...' : (isDirectDispatch ? 'Confirmar Traspaso' : 'Crear Solicitud de Traspaso')}
             </button>
          </div>
        </div>

      </div>

       {/* Variant Selection Modal */}
       {selectedProductForVariant && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', width: '450px', maxWidth: '90%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
               Seleccionar Variante a Traspasar
            </h2>
            <div style={{ color: 'var(--pulpos-text-muted)', marginBottom: '1.5rem' }}>
              {selectedProductForVariant.name}
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '50vh', overflowY: 'auto' }}>
              {selectedProductForVariant.variants.map((v: any) => (
                <button
                  key={v.id}
                  onClick={() => {
                    handleAdd(selectedProductForVariant, v);
                    setSelectedProductForVariant(null);
                  }}
                  disabled={!ventasConfig.venderSinStock && v.stock <= 0}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '1rem',
                    border: '1px solid var(--pulpos-border)',
                    borderRadius: '4px',
                    backgroundColor: 'white',
                    cursor: (ventasConfig.venderSinStock || v.stock > 0) ? 'pointer' : 'not-allowed',
                    textAlign: 'left',
                    opacity: (ventasConfig.venderSinStock || v.stock > 0) ? 1 : 0.5
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 'bold', color: '#1e293b' }}>{v.attribute}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--pulpos-text-muted)' }}>SKU: {v.sku || '--'}</div>
                  </div>
                  <div style={{ fontSize: '0.875rem', fontWeight: '600', color: v.stock > 0 ? '#16a34a' : '#dc2626' }}>
                    {v.stock} disp.
                  </div>
                </button>
              ))}
            </div>

            <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
              <button onClick={() => setSelectedProductForVariant(null)} style={{ padding: '0.75rem 1.5rem', border: '1px solid var(--pulpos-border)', borderRadius: '4px', cursor: 'pointer', background: 'white', fontWeight: 'bold' }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
