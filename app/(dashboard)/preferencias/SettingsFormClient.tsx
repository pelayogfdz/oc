'use client';

import { useState } from 'react';
import { Save } from 'lucide-react';
import { updateAdvancedJSONConfig } from '@/app/actions/settings';

export type FieldConfig = {
  name: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'password';
  placeholder?: string;
  options?: { label: string, value: string }[];
  description?: string;
};

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
  fields: FieldConfig[]
}) {
  const [formDataState, setFormDataState] = useState<Record<string, any>>(initialConfig || {});
  const [isPending, setIsPending] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const handleChange = (name: string, value: any) => {
    setFormDataState(prev => ({ ...prev, [name]: value }));
  };

  async function handleAction(e: React.FormEvent) {
    e.preventDefault();
    setIsPending(true);
    try {
      await updateAdvancedJSONConfig(moduleKey, formDataState);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (err: any) {
      alert("Error al guardar: " + err.message);
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

      <form onSubmit={handleAction} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '600px' }}>
        
        {fields.map(f => {
          const value = formDataState[f.name];

          return (
            <div key={f.name} style={{ display: 'flex', flexDirection: f.type === 'boolean' ? 'row' : 'column', justifyContent: f.type === 'boolean' ? 'space-between' : 'flex-start', alignItems: f.type === 'boolean' ? 'center' : 'flex-start', paddingBottom: '1rem', borderBottom: '1px solid #f3f4f6' }}>
              <div style={{ flex: 1, paddingRight: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: f.type === 'boolean' ? '0' : '0.5rem', color: '#1f2937' }}>
                  {f.label}
                </label>
                {f.description && (
                  <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: '0.2rem 0 0 0' }}>{f.description}</p>
                )}
              </div>

              <div style={{ width: f.type === 'boolean' ? 'auto' : '100%', marginTop: f.type === 'boolean' ? '0' : '0.5rem' }}>
                {f.type === 'boolean' ? (
                  <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px' }}>
                    <input 
                      type="checkbox" 
                      style={{ opacity: 0, width: 0, height: 0 }} 
                      checked={!!value}
                      onChange={(e) => handleChange(f.name, e.target.checked)}
                    />
                    <span style={{ 
                      position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, 
                      backgroundColor: value ? '#3b82f6' : '#ccc', 
                      transition: '.4s', borderRadius: '34px',
                      display: 'flex', alignItems: 'center', padding: '2px'
                    }}>
                      <span style={{ 
                        height: '20px', width: '20px', backgroundColor: 'white', 
                        borderRadius: '50%', transition: '.4s', 
                        transform: value ? 'translateX(20px)' : 'translateX(0)' 
                      }}></span>
                    </span>
                  </label>
                ) : f.type === 'select' ? (
                  <select 
                    value={value || ''} 
                    onChange={(e) => handleChange(f.name, e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--pulpos-border)', outline: 'none', backgroundColor: 'white', cursor: 'pointer' }}
                  >
                    <option value="" disabled>Seleccionar opción...</option>
                    {f.options?.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                ) : (
                  <input 
                    type={f.type} 
                    placeholder={f.placeholder || ''} 
                    value={value || ''} 
                    onChange={(e) => handleChange(f.name, f.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--pulpos-border)', outline: 'none' }} 
                  />
                )}
              </div>
            </div>
          );
        })}

        <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn-primary" type="submit" disabled={isPending} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: isPending ? 0.7 : 1 }}>
            <Save size={18} /> {isPending ? 'Guardando Datos...' : 'Guardar Cambios'}
          </button>
        </div>
      </form>
    </div>
  );
}
