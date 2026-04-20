'use client';

import { useState } from 'react';
import { Save, Smartphone, Zap, Tv, Info, CheckCircle2 } from 'lucide-react';
import { updateAdvancedJSONConfig } from '@/app/actions/settings';
import { formatCurrency } from '@/lib/utils';

export default function RecargasConfigClient({ initialConfig }: { initialConfig: any }) {
  const [apiKey, setApiKey] = useState(initialConfig?.apiKey || '');
  const [markup, setMarkup] = useState(initialConfig?.markup || '0');
  const [active, setActive] = useState(initialConfig?.active ?? true);
  const [isPending, setIsPending] = useState(false);
  const [showToast, setShowToast] = useState(false);

  // Mock data for UI demonstration as in Pulpos
  const balance = 12500.50; // Saldo Bolsa Total

  const providers = [
    { name: 'Telcel', icon: <Smartphone size={24} color="#0284c7" />, commission: '6.5%' },
    { name: 'AT&T', icon: <Smartphone size={24} color="#0284c7" />, commission: '7.0%' },
    { name: 'Movistar', icon: <Smartphone size={24} color="#0284c7" />, commission: '7.0%' },
    { name: 'CFE', icon: <Zap size={24} color="#16a34a" />, commission: '$5.00 MXN' },
    { name: 'Telmex', icon: <Tv size={24} color="#d946ef" />, commission: '$4.00 MXN' },
    { name: 'Netflix', icon: <Tv size={24} color="#d946ef" />, commission: '4.0%' },
  ];

  async function handleSave() {
    setIsPending(true);
    try {
      await updateAdvancedJSONConfig('recargas', { apiKey, markup, active });
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div style={{ maxWidth: '900px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>Recargas y Servicios</h1>
          <p style={{ color: 'var(--pulpos-text-muted)' }}>Vende recargas telefónicas y cobra servicios para atraer más tráfico.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: active ? '#f0fdf4' : '#f1f5f9', padding: '0.5rem 1rem', borderRadius: '50px', border: `1px solid ${active ? '#bbf7d0' : '#e2e8f0'}` }}>
           <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: active ? '#166534' : 'var(--pulpos-text-muted)' }}>
              {active ? 'Módulo Activo' : 'Módulo Inactivo'}
           </span>
           <label style={{ position: 'relative', display: 'inline-block', width: '40px', height: '24px' }}>
              <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
              <span style={{ 
                position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, 
                backgroundColor: active ? 'var(--pulpos-primary)' : '#cbd5e1', 
                transition: '.4s', borderRadius: '34px'
              }}>
                <span style={{
                  position: 'absolute', content: '""', height: '18px', width: '18px', left: '3px', bottom: '3px',
                  backgroundColor: 'white', transition: '.4s', borderRadius: '50%',
                  transform: active ? 'translateX(16px)' : 'translateX(0)'
                }}></span>
              </span>
           </label>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'revert', gap: '2rem', marginBottom: '2rem' }}>
         <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '2rem', border: '1px solid var(--pulpos-border)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--pulpos-text-muted)', marginBottom: '0.5rem' }}>Saldo de Bolsa</h3>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#16a34a', marginBottom: '1rem' }}>
              {formatCurrency(balance)}
            </div>
            <button className="btn-primary" style={{ alignSelf: 'flex-start', padding: '0.5rem 1.5rem', borderRadius: '6px' }}>
              Comprar más saldo
            </button>
         </div>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '2rem', border: '1px solid var(--pulpos-border)', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>Comisiones por Proveedor</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
           {providers.map((p, i) => (
             <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', border: '1px solid var(--pulpos-border)', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
               <div style={{ backgroundColor: 'white', padding: '0.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                 {p.icon}
               </div>
               <div>
                  <div style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>{p.name}</div>
                  <div style={{ color: '#16a34a', fontSize: '0.85rem', fontWeight: '600' }}>Tú ganas: {p.commission}</div>
               </div>
             </div>
           ))}
        </div>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '2rem', border: '1px solid var(--pulpos-border)' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>Configuración del Punto de Venta</h2>
        
        {showToast && (
          <div style={{ padding: '1rem', backgroundColor: '#dcfce7', color: '#166534', borderRadius: '6px', marginBottom: '1.5rem', fontWeight: 'bold', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle2 size={18} /> Módulo de recargas actualizado
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem', maxWidth: '500px' }}>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
              Token de Integración VIP <Info size={14} color="var(--pulpos-text-muted)" />
            </label>
            <input 
              type="text" 
              value={apiKey} 
              onChange={e => setApiKey(e.target.value)} 
              placeholder="Ej: wp_xxx_5923ns"
              style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--pulpos-border)' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
              Sobrecargo a clientes ($ MXN)
            </label>
            <p style={{ fontSize: '0.8rem', color: 'var(--pulpos-text-muted)', marginBottom: '0.5rem' }}>
              Esta tarifa se sumará al total. Ej: Si cobras $3 de sobrecargo al pagar el recibo de luz.
            </p>
            <input 
              type="number" 
              value={markup} 
              onChange={e => setMarkup(e.target.value)} 
              placeholder="0"
              style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--pulpos-border)' }}
            />
          </div>

          <button onClick={handleSave} disabled={isPending} className="btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem', marginTop: '1rem' }}>
             <Save size={18} /> {isPending ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}
