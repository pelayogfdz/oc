'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Save, ShoppingBag, Image as ImageIcon, Search } from 'lucide-react';
import { createPurchase } from '@/app/actions/purchase';
import { useOfflineSync } from '@/app/components/OfflineSyncProvider';

export default function CrearCompraForm({ suppliers, products }: { suppliers: any[], products: any[] }) {
  const router = useRouter();
  const { isOnline, pushOfflinePurchase } = useOfflineSync();
  const [supplierId, setSupplierId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [freightCost, setFreightCost] = useState(0);
  const [items, setItems] = useState<{ productId: string, name: string, quantity: number, cost: number, imageUrl?: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [availableProducts, setAvailableProducts] = useState(products || []);
  const [availableSuppliers, setAvailableSuppliers] = useState(suppliers || []);

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

  const total = items.reduce((sum, item) => sum + (item.quantity * item.cost), 0);

  const handleAddItem = (productId: string) => {
    if(!productId) return;
    const p = availableProducts.find(prod => prod.id === productId);
    if(p) {
      if(items.some(i => i.productId === productId)) return;
      setItems([...items, { productId: p.id, name: p.name, quantity: 1, cost: p.cost, imageUrl: p.imageUrl }]);
      setSearchTerm('');
    }
  };

  const filteredProducts = availableProducts.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase())));


  const handleUpdateItem = (index: number, field: string, value: number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
         // Server action signature: createPurchase(items, total, paymentMethod, supplierId, freightCost)
        await createPurchase(items, total, paymentMethod, supplierId || null, freightCost);
      }
      router.push('/productos/compras');
    } catch (err: any) {
      alert('Error al registrar compra: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card" style={{ padding: '2rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.9rem' }}>Proveedor (Opcional)</label>
          <select className="input" value={supplierId} onChange={(e) => setSupplierId(e.target.value)} style={{ width: '100%' }}>
            <option value="">-- Público en General / Sin Proveedor --</option>
            {availableSuppliers.map(s => <option key={s.id} value={s.id}>{s.name} {s.creditLimit ? `(Crédito Autorizado: $${s.creditLimit})` : ''}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.9rem' }}>Forma de Pago</label>
          <select className="input" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} style={{ width: '100%' }}>
            <option value="CASH">Efectivo</option>
            <option value="TRANSFER">Transferencia</option>
            <option value="CARD">Tarjeta (Débito/Crédito)</option>
            <option value="CREDIT">Crédito CxP (Pendiente de Pago)</option>
          </select>
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.9rem' }}>Costo de Fletes / Envíos</label>
          <div style={{ display: 'flex', alignItems: 'center' }}>
             <span style={{ padding: '0.5rem 0.75rem', backgroundColor: 'var(--pulpos-bg)', border: '1px solid var(--pulpos-border)', borderRight: 'none', borderRadius: '4px 0 0 4px', color: 'var(--pulpos-text-muted)' }}>$</span>
             <input type="number" step="0.01" min="0" className="input" value={freightCost} onChange={(e) => setFreightCost(parseFloat(e.target.value) || 0)} style={{ width: '100%', borderRadius: '0 4px 4px 0' }} />
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--pulpos-text-muted)', marginTop: '0.25rem' }}>El flete se prorrateará en el costo final de los productos.</p>
        </div>
      </div>

      <div style={{ marginBottom: '1.5rem', borderTop: '1px solid var(--pulpos-border)', paddingTop: '1.5rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Buscador de Productos</label>
        <div style={{ position: 'relative' }}>
          <Search size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--pulpos-text-muted)' }} />
          <input 
            type="text" 
            placeholder="🔍 Buscar por nombre o SKU para agregar..." 
            className="input" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', paddingLeft: '40px', padding: '1rem 1rem 1rem 40px', fontSize: '1.1rem', borderRadius: '8px' }} 
          />
        </div>
        
        {searchTerm && (
           <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', maxHeight: '300px', overflowY: 'auto' }}>
             {filteredProducts.slice(0, 10).map((p: any) => (
               <button 
                 key={p.id} 
                 type="button"
                 onClick={() => handleAddItem(p.id)}
                 style={{ display: 'flex', flexDirection: 'column', border: '1px solid var(--pulpos-border)', borderRadius: '8px', overflow: 'hidden', backgroundColor: 'white', cursor: 'pointer', textAlign: 'left', transition: 'box-shadow 0.2s', ':hover': { boxShadow: '0 4px 6px rgba(0,0,0,0.1)' } } as any}
               >
                 <div style={{ height: '100px', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                   {p.imageUrl ? <img src={p.imageUrl} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <ImageIcon color="#cbd5e1" size={32} />}
                 </div>
                 <div style={{ padding: '0.75rem' }}>
                   <div style={{ fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '0.25rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.name}</div>
                   <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--pulpos-text-muted)' }}>
                     <span>Stock: {p.stock}</span>
                     <span>${parseFloat(p.cost || 0).toFixed(2)}</span>
                   </div>
                 </div>
               </button>
             ))}
             {filteredProducts.length === 0 && <div style={{ padding: '1rem', color: 'var(--pulpos-text-muted)' }}>No se encontraron productos.</div>}
           </div>
        )}
      </div>

      {items.length > 0 ? (
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginBottom: '2rem' }}>
          <thead style={{ backgroundColor: 'var(--pulpos-bg)' }}>
            <tr>
              <th style={{ padding: '0.75rem', borderBottom: '1px solid var(--pulpos-border)' }}>Producto</th>
              <th style={{ padding: '0.75rem', borderBottom: '1px solid var(--pulpos-border)' }}>Costo Entrante Unitario</th>
              <th style={{ padding: '0.75rem', borderBottom: '1px solid var(--pulpos-border)' }}>Cantidad</th>
              <th style={{ padding: '0.75rem', borderBottom: '1px solid var(--pulpos-border)', textAlign: 'right' }}>Subtotal</th>
              <th style={{ padding: '0.75rem', borderBottom: '1px solid var(--pulpos-border)', textAlign: 'center' }}></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={item.productId} style={{ borderBottom: '1px solid var(--pulpos-border)' }}>
                <td style={{ padding: '0.75rem', fontWeight: 500 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '40px', height: '40px', backgroundColor: '#f1f5f9', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                       {item.imageUrl ? <img src={item.imageUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <ImageIcon size={16} color="#94a3b8" />}
                    </div>
                    {item.name}
                  </div>
                </td>
                <td style={{ padding: '0.75rem' }}>
                  <input type="number" step="0.01" className="input" value={item.cost} onChange={(e) => handleUpdateItem(idx, 'cost', parseFloat(e.target.value) || 0)} style={{ width: '100px' }} />
                </td>
                <td style={{ padding: '0.75rem' }}>
                  <input type="number" step="1" min="1" className="input" value={item.quantity} onChange={(e) => handleUpdateItem(idx, 'quantity', parseInt(e.target.value) || 1)} style={{ width: '80px' }} />
                </td>
                <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 'bold' }}>
                  ${(item.quantity * item.cost).toFixed(2)}
                </td>
                <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                  <button type="button" onClick={() => setItems(items.filter((_, i) => i !== idx))} style={{ color: '#ef4444', backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}>
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3} style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold' }}>Subtotal Artículos:</td>
              <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold' }}>${total.toFixed(2)}</td>
              <td></td>
            </tr>
            {freightCost > 0 && (
              <tr>
                <td colSpan={3} style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold', color: 'var(--pulpos-text-muted)' }}>Fletes y Envío (+):</td>
                <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold', color: 'var(--pulpos-text-muted)' }}>${freightCost.toFixed(2)}</td>
                <td></td>
              </tr>
            )}
            <tr>
               <td colSpan={3} style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold', fontSize: '1.1rem' }}>Total General:</td>
               <td style={{ padding: '1rem', textAlign: 'right', fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--pulpos-primary)' }}>${(total + freightCost).toFixed(2)}</td>
               <td></td>
            </tr>
          </tfoot>
        </table>
      ) : (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--pulpos-text-muted)', border: '1px dashed var(--pulpos-border)', borderRadius: '8px', marginBottom: '2rem' }}>
          No se han agregado productos. Búscalos en la barra superior.
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid var(--pulpos-border)' }}>
        <button type="submit" disabled={isSubmitting || items.length === 0} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--pulpos-primary)', borderColor: 'var(--pulpos-primary)', color: 'white', padding: '0.75rem 2rem', fontSize: '1.1rem' }}>
          <Save size={20} /> {isSubmitting ? 'Registrando...' : 'Ingresar Compra'}
        </button>
      </div>
    </form>
  )
}
