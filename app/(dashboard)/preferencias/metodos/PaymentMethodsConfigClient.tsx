'use client';

import { useState } from 'react';
import { Save, Plus, Trash2 } from 'lucide-react';
import { updateAdvancedJSONConfig } from '@/app/actions/settings';

export default function PaymentMethodsConfigClient({ initialConfig }: { initialConfig: any }) {
  const [methods, setMethods] = useState<{ id: string, name: string }[]>(
    Array.isArray(initialConfig?.methods) && initialConfig.methods.length > 0 
      ? initialConfig.methods 
      : [
          { id: 'CASH', name: 'Efectivo' }, 
          { id: 'CARD', name: 'Tarjeta' },
          { id: 'TRANSFER', name: 'Transferencia' }
        ]
  );
  
  const [isPending, setIsPending] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const handleAdd = () => {
    setMethods([...methods, { id: 'METHOD_' + Date.now(), name: '' }]);
  };

  const handleRemove = (index: number) => {
    const newMethods = [...methods];
    newMethods.splice(index, 1);
    setMethods(newMethods);
  };

  const handleChange = (index: number, val: string) => {
    const newMethods = [...methods];
    newMethods[index].name = val;
    setMethods(newMethods);
  };

  async function handleSave() {
    setIsPending(true);
    try {
      await updateAdvancedJSONConfig('metodos', { methods: methods.filter(m => m.name.trim() !== '') });
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '2rem', border: '1px solid var(--pulpos-border)' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Métodos de Pago</h2>
      <p style={{ color: 'var(--pulpos-text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--pulpos-border)', paddingBottom: '1rem' }}>
        Agrega, edita o quita los métodos de pago que los cajeros podrán seleccionar al momento de cobrar una venta.
        <br/><b>Nota:</b> "Crédito" se agrega automáticamente si el cliente seleccionado tiene límite de crédito disponible.
      </p>

      {showToast && (
        <div style={{ padding: '1rem', backgroundColor: '#dcfce7', color: '#166534', borderRadius: '8px', marginBottom: '1.5rem', fontWeight: 'bold', border: '1px solid #bbf7d0' }}>
          ✅ Métodos de pago actualizados
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '500px' }}>
        {methods.map((method, idx) => (
          <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input 
              type="text" 
              value={method.name} 
              onChange={e => handleChange(idx, e.target.value)} 
              placeholder="Ej: Efectivo, Terminal Banamex..."
              style={{ flex: 1, padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--pulpos-border)' }}
            />
            <button onClick={() => handleRemove(idx)} style={{ color: 'red', padding: '0.5rem', background: 'none', border: 'none', cursor: 'pointer' }}>
              <Trash2 size={20} />
            </button>
          </div>
        ))}

        <button onClick={handleAdd} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center', marginTop: '0.5rem', backgroundColor: 'transparent' }}>
          <Plus size={18} /> Agregar Método de Pago
        </button>

        <div style={{ marginTop: '2rem', borderTop: '1px solid var(--pulpos-border)', paddingTop: '1.5rem' }}>
          <button onClick={handleSave} className="btn-primary" disabled={isPending} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', justifyContent: 'center', opacity: isPending ? 0.7 : 1 }}>
            <Save size={18} /> {isPending ? 'Guardando...' : 'Guardar Métodos'}
          </button>
        </div>
      </div>
    </div>
  );
}
