'use client';
import { useState } from 'react';
import { createTransfer } from '@/app/actions/transfer';
import { useRouter } from 'next/navigation';
import { Truck, ArrowRight, Trash2, Search } from 'lucide-react';

export default function TransferClient({ originBranchId, originBranchName, otherBranches, inventory, ventasConfig = {} }: any) {
  const router = useRouter();
  const [toBranchId, setToBranchId] = useState('');
  const [reason, setReason] = useState('Reabastecimiento');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [transferItems, setTransferItems] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Variant Modal
  const [selectedProductForVariant, setSelectedProductForVariant] = useState<any | null>(null);

  const displayedProducts = inventory.filter((p: any) => {
    const search = searchTerm.toLowerCase();
    return (p.name || '').toLowerCase().includes(search) || 
           (p.sku && p.sku.toLowerCase().includes(search)) ||
           (p.barcode && p.barcode.toLowerCase().includes(search));
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
      if (!ventasConfig.venderSinStock && existing.quantity >= maxStock) {
          alert('Cantidad excede el stock disponible.');
          return;
      }
      setTransferItems(transferItems.map(i => i.listId === listId ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      if (!ventasConfig.venderSinStock && maxStock <= 0) {
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
        quantity: 1
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
    if (!toBranchId || transferItems.length === 0) return;
    setIsProcessing(true);
    try {
      await createTransfer({
        toBranchId,
        reason,
        items: transferItems.map(i => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity }))
      });
      alert('Traspaso en tránsito enviado correctamente.');
      router.push('/productos/traspasos');
    } catch (e: any) {
      alert("Error: " + e.message);
      setIsProcessing(false);
    }
  };

  return (
    <div style={{ display: 'flex', gap: '2rem' }}>
      {/* Left: Wizard Form & Cart */}
      <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        <div className="card" style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
           <div style={{ flex: 1 }}>
             <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', color: 'var(--pulpos-text-muted)', marginBottom: '0.5rem' }}>Origen</label>
             <div style={{ padding: '0.75rem', backgroundColor: '#f1f5f9', borderRadius: '4px', border: '1px solid var(--pulpos-border)', color: '#475569', fontWeight: '500' }}>
               {originBranchName}
             </div>
           </div>
           <div><ArrowRight color="#94a3b8" /></div>
           <div style={{ flex: 1 }}>
             <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', color: 'var(--pulpos-text-muted)', marginBottom: '0.5rem' }}>Destino <span style={{color:'red'}}>*</span></label>
             <select value={toBranchId} onChange={e => setToBranchId(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)', fontWeight: 'bold' }}>
               <option value="">-- Seleccionar Sucursal --</option>
               {otherBranches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
             </select>
           </div>
           <div style={{ flex: 1 }}>
             <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', color: 'var(--pulpos-text-muted)', marginBottom: '0.5rem' }}>Motivo</label>
             <input type="text" value={reason} onChange={e => setReason(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }} />
           </div>
        </div>

        <div className="card" style={{ flex: 1 }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Truck size={20} /> Artículos a Traspasar
          </h2>
          
          {transferItems.length === 0 && (
             <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--pulpos-text-muted)', border: '2px dashed var(--pulpos-border)', borderRadius: '8px' }}>
               No has agregado productos.<br/>Búscalos en el panel derecho y agrégalos al paquete.
             </div>
          )}

          {transferItems.length > 0 && (
             <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
               <thead>
                 <tr style={{ borderBottom: '1px solid var(--pulpos-border)' }}>
                   <th style={{ padding: '0.5rem' }}>Producto</th>
                   <th style={{ padding: '0.5rem' }}>SKU</th>
                   <th style={{ padding: '0.5rem', width: '100px' }}>Cant.</th>
                   <th style={{ padding: '0.5rem', width: '50px' }}></th>
                 </tr>
               </thead>
               <tbody>
                 {transferItems.map(item => (
                   <tr key={item.listId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                     <td style={{ padding: '0.75rem 0.5rem', fontWeight: '500' }}>{item.name}</td>
                     <td style={{ padding: '0.75rem 0.5rem', color: 'var(--pulpos-text-muted)', fontSize: '0.875rem' }}>{item.sku || '--'}</td>
                     <td style={{ padding: '0.75rem 0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <input 
                            type="number" 
                            min="1" 
                            max={item.maxStock}
                            value={item.quantity} 
                            onChange={e => updateQuantity(item.listId, Number(e.target.value))}
                            style={{ width: '60px', padding: '0.25rem', border: '1px solid var(--pulpos-border)', borderRadius: '4px', textAlign: 'center' }}
                          />
                          <span style={{ fontSize: '0.75rem', color: 'var(--pulpos-text-muted)' }}>/ {item.maxStock}</span>
                        </div>
                     </td>
                     <td style={{ padding: '0.75rem 0.5rem' }}>
                       <button onClick={() => removeItem(item.listId)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={18}/></button>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
          )}

          <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
             <button 
                className="btn-primary" 
                onClick={handleSubmit} 
                disabled={isProcessing || !toBranchId || transferItems.length === 0}
                style={{ padding: '1rem 2rem', fontSize: '1.1rem', opacity: (!toBranchId || transferItems.length === 0 || isProcessing) ? 0.5 : 1 }}
             >
               {isProcessing ? 'Enviando Traspaso...' : 'Iniciar Traspaso (En Tránsito)'}
             </button>
          </div>
        </div>

      </div>

      {/* Right: Product Selector */}
      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>Buscador de Inventario</h2>
        <div style={{ position: 'relative', marginBottom: '1rem' }}>
          <Search size={18} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--pulpos-text-muted)' }} />
          <input 
            type="text" 
            placeholder="Buscar por nombre o SKU..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '0.5rem 0.5rem 0.5rem 2.5rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }}
          />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {displayedProducts.map((prod: any) => (
             <button 
               key={prod.id} 
               onClick={() => handleProductClick(prod)}
               disabled={!ventasConfig.venderSinStock && prod.stock <= 0}
               style={{ 
                 display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                 padding: '0.75rem', border: '1px solid var(--pulpos-border)', borderRadius: '4px', 
                 backgroundColor: '#fafafa', cursor: (ventasConfig.venderSinStock || prod.stock > 0) ? 'pointer' : 'not-allowed',
                 textAlign: 'left', opacity: (ventasConfig.venderSinStock || prod.stock > 0) ? 1 : 0.5
               }}
             >
               <div>
                  <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#1e293b' }}>
                    {prod.name}
                    {prod.variants?.length > 0 && <span style={{fontSize: '0.75rem', backgroundColor: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', marginLeft: '0.5rem'}}>{prod.variants.length} var.</span>}
                  </div>
                  <div style={{ color: 'var(--pulpos-text-muted)', fontSize: '0.75rem' }}>SKU: {prod.sku || '--'}</div>
               </div>
               <div style={{ fontWeight: 'bold', color: prod.stock > 0 ? '#16a34a' : '#ef4444' }}>
                 {prod.stock} disp.
               </div>
             </button>
          ))}
          {displayedProducts.length === 0 && (
             <div style={{ textAlign: 'center', color: 'var(--pulpos-text-muted)', marginTop: '2rem' }}>No se encontraron productos.</div>
          )}
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
