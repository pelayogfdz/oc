'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Save, ShoppingBag } from 'lucide-react';
import { createPurchase } from '@/app/actions/purchase';
import { useOfflineSync } from '@/app/components/OfflineSyncProvider';

export default function CrearCompraForm({ suppliers, products }: { suppliers: any[], products: any[] }) {
  const router = useRouter();
  const { isOnline, pushOfflinePurchase } = useOfflineSync();
  const [supplierId, setSupplierId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [freightCost, setFreightCost] = useState(0);
  const [items, setItems] = useState<{ productId: string, name: string, quantity: number, cost: number }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      setItems([...items, { productId: p.id, name: p.name, quantity: 1, cost: p.cost }]);
    }
  };

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

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderTop: '1px solid var(--pulpos-border)', paddingTop: '1.5rem' }}>
        <select className="input" style={{ flexGrow: 1 }} onChange={(e) => { handleAddItem(e.target.value); e.target.value=''; }}>
          <option value="">+ Escribe o escoge un producto de esta sucursal...</option>
          {availableProducts.map((p: any) => <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock})</option>)}
        </select>
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
                <td style={{ padding: '0.75rem', fontWeight: 500 }}>{item.name}</td>
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
