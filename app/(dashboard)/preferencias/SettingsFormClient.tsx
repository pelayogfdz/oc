'use client';

import { useState } from 'react';
import { Save } from 'lucide-react';
import { updateAdvancedConfig } from '@/app/actions/settings';

export default function SettingsFormClient({ 
  moduleKey, 
  initialConfig, 
  title, 
  description, 
  fields 
}: { 
  moduleKey: string, 
  initialConfig: any, 
  title: string, 
  description: string, 
  fields: { name: string, label: string, type: string, placeholder?: string }[]
}) {
  const [isPending, setIsPending] = useState(false);
  const [showToast, setShowToast] = useState(false);

  async function handleAction(formData: FormData) {
    setIsPending(true);
    try {
      if (moduleKey === 'general') {
         // Specific logic for general if we pass it, but better we use advanced parser
      } else {
         await updateAdvancedConfig(moduleKey, formData);
      }
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
      <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>{title}</h2>
      <p style={{ color: 'var(--pulpos-text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--pulpos-border)', paddingBottom: '1rem' }}>
        {description}
      </p>

      {showToast && (
        <div style={{ padding: '1rem', backgroundColor: '#dcfce7', color: '#166534', borderRadius: '8px', marginBottom: '1.5rem', fontWeight: 'bold', border: '1px solid #bbf7d0' }}>
          ✅ Configuraciones Guardadas Correctamente
        </div>
      )}

      <form action={handleAction} style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem', maxWidth: '600px' }}>
        
        {fields.map(f => (
          <div key={f.name}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>{f.label}</label>
            <input 
              type={f.type} 
              name={f.name} 
              placeholder={f.placeholder || ''} 
              defaultValue={initialConfig[f.name] || ''} 
              style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--pulpos-border)' }} 
            />
          </div>
        ))}

        <div style={{ marginTop: '1rem' }}>
          <button className="btn-primary" type="submit" disabled={isPending} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: isPending ? 0.7 : 1 }}>
            <Save size={18} /> {isPending ? 'Guardando Datos...' : 'Guardar Cambios'}
          </button>
        </div>
      </form>
    </div>
  );
}
