'use client';

import { useState } from 'react';
import { Save, Banknote, CreditCard, Send, ShieldAlert, CheckCircle2, QrCode } from 'lucide-react';
import { updateAdvancedJSONConfig } from '@/app/actions/settings';

const STANDARD_METHODS = [
  { id: 'CASH', name: 'EFECTIVO', icon: <Banknote size={24} color="#16a34a" /> },
  { id: 'CARD', name: 'TARJETA DE DÉBITO / CRÉDITO', icon: <CreditCard size={24} color="#0284c7" /> },
  { id: 'TRANSFER', name: 'TRANSFERENCIA BANCARIA (SPEI)', icon: <Send size={24} color="#8b5cf6" /> },
  { id: 'CREDIT', name: 'CRÉDITO A CLIENTE / FIADO', icon: <ShieldAlert size={24} color="#d946ef" /> },
  { id: 'VALES', name: 'VALES DE DESPENSA', icon: <QrCode size={24} color="#f59e0b" /> },
];

export default function PaymentMethodsConfigClient({ initialConfig }: { initialConfig: any }) {
  // If no config format exists, default to Cash, Card, Transfer enabled
  const [enabledIds, setEnabledIds] = useState<string[]>(
    initialConfig?.enabledIds ?? ['CASH', 'CARD', 'TRANSFER']
  );
  
  const [isPending, setIsPending] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const toggleMethod = (id: string) => {
    setEnabledIds(prev => 
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  async function handleSave() {
    setIsPending(true);
    try {
      await updateAdvancedJSONConfig('metodos', { enabledIds });
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div style={{ maxWidth: '800px' }}>
       <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>Métodos de Pago</h1>
          <p style={{ color: 'var(--pulpos-text-muted)' }}>Maneja cómo tus clientes efectúan sus pagos en sucursal.</p>
       </div>

       {showToast && (
          <div style={{ padding: '1rem', backgroundColor: '#dcfce7', color: '#166534', borderRadius: '6px', marginBottom: '1.5rem', fontWeight: 'bold', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle2 size={18} /> Métodos de pago guardados exitosamente
          </div>
       )}

       <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginBottom: '2rem' }}>
          {STANDARD_METHODS.map(method => {
            const isActive = enabledIds.includes(method.id);
            return (
              <div key={method.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem', backgroundColor: 'white', border: `1px solid ${isActive ? 'var(--pulpos-primary)' : 'var(--pulpos-border)'}`, borderRadius: '12px', boxShadow: isActive ? '0 0 0 1px var(--pulpos-primary)' : 'none', transition: 'all 0.2s' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: isActive ? '#f0f9ff' : '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0' }}>
                       {method.icon}
                    </div>
                    <div>
                       <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: isActive ? 'var(--pulpos-text)' : 'var(--pulpos-text-muted)' }}>
                         {method.name}
                       </div>
                       <div style={{ fontSize: '0.85rem', color: 'var(--pulpos-text-muted)' }}>
                         {isActive ? 'Activo en Punto de Venta' : 'Inactivo'}
                       </div>
                    </div>
                 </div>
                 
                 {/* Toggle Switch */}
                 <label style={{ position: 'relative', display: 'inline-block', width: '50px', height: '30px' }}>
                    <input type="checkbox" checked={isActive} onChange={() => toggleMethod(method.id)} style={{ opacity: 0, width: 0, height: 0 }} />
                    <span style={{ 
                      position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, 
                      backgroundColor: isActive ? 'var(--pulpos-primary)' : '#cbd5e1', 
                      transition: '.4s', borderRadius: '34px'
                    }}>
                      <span style={{
                        position: 'absolute', content: '""', height: '22px', width: '22px', left: '4px', bottom: '4px',
                        backgroundColor: 'white', transition: '.4s', borderRadius: '50%',
                        transform: isActive ? 'translateX(20px)' : 'translateX(0)'
                      }}></span>
                    </span>
                 </label>
              </div>
            )
          })}
       </div>

       <div style={{ borderTop: '1px solid var(--pulpos-border)', paddingTop: '1.5rem' }}>
          <button onClick={handleSave} disabled={isPending} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 2rem', fontSize: '1rem' }}>
             <Save size={20} /> {isPending ? 'Guardando...' : 'Guardar Configuración'}
          </button>
       </div>
    </div>
  );
}
