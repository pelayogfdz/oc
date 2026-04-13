'use client';
import { useState } from 'react';
import { createPromotion, togglePromotion, deletePromotion } from '@/app/actions/promotion';
import { Trash2 } from 'lucide-react';

export default function PromotionsClient({ initialPromos }: { initialPromos: any[] }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('PERCENTAGE');
  const [value, setValue] = useState<number | ''>('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || typeof value !== 'number') return;
    setIsProcessing(true);
    try {
      const fd = new FormData();
      fd.append('name', name);
      fd.append('type', type);
      fd.append('value', String(value));
      fd.append('active', 'on');
      await createPromotion(fd);
      setName('');
      setValue('');
    } catch (e: any) {
      alert("Error: " + e.message);
    }
    setIsProcessing(false);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
      <div className="card" style={{ alignSelf: 'start' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Crear Nueva Promoción</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>Nombre Ej: "Buen Fin 10%"</label>
            <input 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              required 
              style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>Tipo de Descuento</label>
            <select 
              value={type} 
              onChange={e => setType(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }}
            >
              <option value="PERCENTAGE">Descuento Global en %</option>
              <option value="FIXED_DISCOUNT">Descuento Directo en $ MXN</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>Valor a Descontar</label>
            <input 
              type="number" 
              step="0.01" 
              value={value} 
              onChange={e => setValue(e.target.value === '' ? '' : parseFloat(e.target.value))} 
              required 
              style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }}
            />
          </div>
          <button type="submit" disabled={isProcessing} className="btn-primary" style={{ padding: '0.75rem', fontWeight: 'bold' }}>
            {isProcessing ? 'Guardando...' : 'Guardar Promoción Global'}
          </button>
        </form>
      </div>

      <div className="card" style={{ padding: '0' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--pulpos-border)', backgroundColor: '#f9fafb' }}>
              <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--pulpos-text-muted)' }}>Nombre</th>
              <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--pulpos-text-muted)' }}>Mecánica</th>
              <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--pulpos-text-muted)', textAlign: 'center' }}>Estado</th>
              <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--pulpos-text-muted)', textAlign: 'right' }}>Eliminar</th>
            </tr>
          </thead>
          <tbody>
            {initialPromos.map(promo => (
              <tr key={promo.id} style={{ borderBottom: '1px solid var(--pulpos-border)' }}>
                <td style={{ padding: '1rem', fontWeight: 'bold' }}>{promo.name}</td>
                <td style={{ padding: '1rem' }}>
                  <span style={{ color: 'var(--pulpos-primary)', fontWeight: 'bold' }}>
                    {promo.type === 'PERCENTAGE' ? `Descuento ${promo.value}%` : `Descuento $${promo.value}`}
                  </span>
                </td>
                <td style={{ padding: '1rem', textAlign: 'center' }}>
                  <button 
                    onClick={() => togglePromotion(promo.id, !promo.active)}
                    style={{ 
                      padding: '0.25rem 0.75rem', 
                      borderRadius: '12px', 
                      fontWeight: 'bold', 
                      fontSize: '0.75rem',
                      border: promo.active ? '1px solid #166534' : '1px solid #854d0e',
                      backgroundColor: promo.active ? '#dcfce7' : '#fef9c3',
                      color: promo.active ? '#166534' : '#854d0e',
                      cursor: 'pointer'
                    }}
                  >
                    {promo.active ? 'ACTIVA' : 'INACTIVA'}
                  </button>
                </td>
                <td style={{ padding: '1rem', textAlign: 'right' }}>
                  <button onClick={() => deletePromotion(promo.id)} style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}>
                     <Trash2 size={20} />
                  </button>
                </td>
              </tr>
            ))}
            {initialPromos.length === 0 && (
               <tr>
                 <td colSpan={4} style={{ padding: '3rem', textAlign: 'center', color: 'var(--pulpos-text-muted)' }}>No hay promociones registradas.</td>
               </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
