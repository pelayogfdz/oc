'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Save, Wand2 } from 'lucide-react';
import { createPurchaseOrder } from '@/app/actions/pedidos';

export default function CrearPedidoForm({ suppliers, products }: { suppliers: any[], products: any[] }) {
  const router = useRouter();
  const [supplierId, setSupplierId] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<{ productId: string, name: string, quantity: number, cost: number }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const total = items.reduce((sum, item) => sum + (item.quantity * item.cost), 0);

  const handleAddItem = (productId: string) => {
    if(!productId) return;
    const p = products.find(prod => prod.id === productId);
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

  const generateSuggested = () => {
    const suggested: { productId: string, name: string, quantity: number, cost: number }[] = [];
    products.forEach(p => {
      // Sugeridos de compra según faltantes
      if (p.stock <= p.minStock) {
        const required = Math.max(1, p.minStock - p.stock);
        suggested.push({
          productId: p.id,
          name: p.name,
          quantity: required,
          cost: p.cost
        });
      }
    });

    // Merge suggested without duplicating existing
    const toAdd = suggested.filter(s => !items.some(i => i.productId === s.productId));
    setItems([...items, ...toAdd]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return alert('Debes agregar al menos un artículo.');
    setIsSubmitting(true);
    try {
      await createPurchaseOrder(supplierId || null, notes, items, total);
      router.push('/productos/pedidos');
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card" style={{ padding: '2rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'revert', gap: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.9rem' }}>Proveedor (Opcional)</label>
              <select className="input" value={supplierId} onChange={(e) => setSupplierId(e.target.value)} style={{ width: '100%' }}>
                <option value="">-- Seleccionar --</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.9rem' }}>Notas del Pedido</label>
              <input type="text" className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Tiempos de entrega, comentarios..." style={{ width: '100%' }} />
            </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderTop: '1px solid var(--pulpos-border)', paddingTop: '1.5rem' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Artículos a Solicitar</h2>
        <div style={{ display: 'flex', gap: '1rem' }}>
           <button type="button" onClick={generateSuggested} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '4px', border: '1px solid var(--pulpos-primary)', backgroundColor: 'var(--pulpos-bg)', color: 'var(--pulpos-primary)', fontWeight: 'bold', cursor: 'pointer' }}>
             <Wand2 size={16} /> Generar Sugerido (Faltantes)
           </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
        <select className="input" style={{ flexGrow: 1 }} onChange={(e) => { handleAddItem(e.target.value); e.target.value=''; }}>
          <option value="">+ Buscar un producto de la sucursal para agregar manualmente...</option>
          {products.map(p => <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock})</option>)}
        </select>
      </div>

      {items.length > 0 ? (
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginBottom: '2rem' }}>
          <thead style={{ backgroundColor: 'var(--pulpos-bg)' }}>
            <tr>
              <th style={{ padding: '0.75rem', borderBottom: '1px solid var(--pulpos-border)' }}>Producto</th>
              <th style={{ padding: '0.75rem', borderBottom: '1px solid var(--pulpos-border)' }}>Costo Unit. Estimado</th>
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
              <td colSpan={3} style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold' }}>Total Estimado:</td>
              <td style={{ padding: '1rem', textAlign: 'right', fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--pulpos-primary)' }}>${total.toFixed(2)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      ) : (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--pulpos-text-muted)', border: '1px dashed var(--pulpos-border)', borderRadius: '8px', marginBottom: '2rem' }}>
          No hay artículos en este pedido. Selecciona uno o usa el botón "Generar Sugerido".
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid var(--pulpos-border)' }}>
        <button type="submit" disabled={isSubmitting || items.length === 0} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--pulpos-primary)', borderColor: 'var(--pulpos-primary)', color: 'white', padding: '0.75rem 2rem', fontSize: '1.1rem' }}>
          <Save size={20} /> {isSubmitting ? 'Guardando...' : 'Crear Pedido a Proveedor'}
        </button>
      </div>
    </form>
  )
}
