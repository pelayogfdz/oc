'use client';
import { useState } from 'react';
import { requestTransfer } from '@/app/actions/transfer';
import { useRouter } from 'next/navigation';
import { Truck, ArrowRight, Trash2, Search } from 'lucide-react';
import ProductTableUI from '@/app/components/ProductTableUI';

export default function TransferClient({ originBranchId, originBranchName, otherBranches, inventory, ventasConfig = {} }: any) {
  const router = useRouter();
  const [fromBranchId, setFromBranchId] = useState('');
  const [reason, setReason] = useState('Reabastecimiento');
  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState('ALL');
  
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
    if (!fromBranchId || transferItems.length === 0) return;
    setIsProcessing(true);
    try {
      await requestTransfer({
        fromBranchId,
        reason,
        items: transferItems.map(i => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity }))
      });

      if (confirm('Solicitud de traspaso enviada correctamente. ¿Deseas imprimir etiquetas para los productos solicitados?')) {
        const ids = transferItems.map(i => i.productId).join(',');
        window.open(\`/productos/etiquetas?ids=\${ids}\`, '_blank', 'width=400,height=600');
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
        
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--pulpos-text-muted)' }} />
            <input 
              type="text" 
              placeholder="Buscar por nombre o SKU..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '0.5rem 0.5rem 0.5rem 2.5rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }}
            />
          </div>
          <select 
            value={stockFilter} 
            onChange={e => setStockFilter(e.target.value)} 
            style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)', color: 'var(--pulpos-text)', backgroundColor: 'white', minWidth: '130px', fontSize: '0.875rem' }}
          >
            <option value="ALL">Todo</option>
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
             <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', color: 'var(--pulpos-text-muted)', marginBottom: '0.5rem' }}>Solicitar A (Surte) <span style={{color:'red'}}>*</span></label>
             <select value={fromBranchId} onChange={e => setFromBranchId(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)', fontWeight: 'bold' }}>
               <option value="">-- Seleccionar Sucursal --</option>
               {otherBranches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
             </select>
           </div>
           
           <div>
             <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', color: 'var(--pulpos-text-muted)', marginBottom: '0.5rem' }}>Recibe (Mi Sucursal)</label>
             <div style={{ padding: '0.75rem', backgroundColor: '#f1f5f9', borderRadius: '4px', border: '1px solid var(--pulpos-border)', color: '#475569', fontWeight: '500' }}>
               {originBranchName}
             </div>
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
             <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
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
                     <td style={{ padding: '0.75rem 0.5rem', fontWeight: '500' }}>
                        <div>{item.name}</div>
                        <div style={{ color: 'var(--pulpos-text-muted)', fontSize: '0.75rem' }}>{item.sku || '--'}</div>
                     </td>
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
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--pulpos-text-muted)', marginTop: '0.2rem' }}>de {item.maxStock} disp.</div>
                     </td>
                     <td style={{ padding: '0.75rem 0.5rem' }}>
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
                disabled={isProcessing || !fromBranchId || transferItems.length === 0}
                style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', opacity: (!fromBranchId || transferItems.length === 0 || isProcessing) ? 0.5 : 1 }}
             >
               {isProcessing ? 'Enviando...' : 'Crear Solicitud de Traspaso'}
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
