'use client';

import { useState } from 'react';
import { Star, Settings, Award, CheckCircle2, History, AlertCircle, Save } from 'lucide-react';
import { saveLoyaltySettings } from '@/app/actions/loyalty';
import { formatCurrency } from '@/lib/utils';

export default function PuntosConfigClient({ 
  branch, 
  initialSettings, 
  recentTransactions 
}: { 
  branch: any; 
  initialSettings: any; 
  recentTransactions: any[] 
}) {
  const [activeTab, setActiveTab] = useState<'config' | 'history'>('config');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Local state for interactive preview
  const [pts, setPts] = useState(initialSettings?.pointsPerAmount || 1);
  const [amount, setAmount] = useState(initialSettings?.amountStep || 100);

  const paymentMethodsList = initialSettings?.paymentMethods?.split(',') || ['CASH', 'CARD', 'TRANSFER'];

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    setError('');

    const formData = new FormData(e.currentTarget);
    const res = await saveLoyaltySettings(branch.id, formData);
    setLoading(false);

    if (res.success) {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } else {
      setError(res.error || 'Ocurrió un error al guardar los ajustes.');
    }
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', fontFamily: 'var(--font-geist-sans)' }}>
      {/* Title Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid var(--pulpos-border)', paddingBottom: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Award size={28} color="var(--pulpos-primary)" /> Fidelización y Puntos de Lealtad
          </h2>
          <p style={{ color: 'var(--pulpos-text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Configura las reglas para premiar a tus clientes con puntos por cada compra realizada en la sucursal <strong>{branch.name}</strong>.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--pulpos-border)' }}>
        <button
          onClick={() => setActiveTab('config')}
          style={{
            padding: '0.75rem 1rem',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'config' ? '2px solid var(--pulpos-primary)' : '2px solid transparent',
            color: activeTab === 'config' ? 'var(--pulpos-primary)' : 'var(--pulpos-text-muted)',
            fontWeight: activeTab === 'config' ? 'bold' : 'normal',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Settings size={18} /> Ajustes del Motor
        </button>
        <button
          onClick={() => setActiveTab('history')}
          style={{
            padding: '0.75rem 1rem',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'history' ? '2px solid var(--pulpos-primary)' : '2px solid transparent',
            color: activeTab === 'history' ? 'var(--pulpos-primary)' : 'var(--pulpos-text-muted)',
            fontWeight: activeTab === 'history' ? 'bold' : 'normal',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <History size={18} /> Log de Puntos Recientes
        </button>
      </div>

      {/* TAB 1: CONFIGURATION */}
      {activeTab === 'config' && (
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Main Card */}
          <div style={{ backgroundColor: 'white', border: '1px solid var(--pulpos-border)', borderRadius: '12px', padding: '2rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
            
            {/* Engine Active Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--pulpos-border)', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
              <div>
                <h4 style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Estado del Motor de Puntos</h4>
                <p style={{ color: 'var(--pulpos-text-muted)', fontSize: '0.85rem' }}>Si el motor está inactivo, las compras de los clientes no acumularán puntos de lealtad.</p>
              </div>
              <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', gap: '0.5rem' }}>
                <input 
                  type="checkbox" 
                  name="isActive" 
                  defaultChecked={initialSettings?.isActive !== false}
                  style={{ width: '1.5rem', height: '1.5rem', cursor: 'pointer', accentColor: 'var(--pulpos-primary)' }}
                />
                <span style={{ fontWeight: 'bold' }}>Motor Activo</span>
              </label>
            </div>

            {/* Calculations and rules */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Puntos a Otorgar</label>
                <input 
                  type="number" 
                  name="pointsPerAmount" 
                  value={pts} 
                  min="0.1" 
                  step="any"
                  onChange={e => setPts(parseFloat(e.target.value) || 0)}
                  required 
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--pulpos-border)', backgroundColor: '#f8fafc' }} 
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--pulpos-text-muted)', display: 'block', marginTop: '0.25rem' }}>Número de puntos que gana el cliente.</span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Por cada monto ($)</label>
                <input 
                  type="number" 
                  name="amountStep" 
                  value={amount} 
                  min="1" 
                  step="any"
                  onChange={e => setAmount(parseFloat(e.target.value) || 0)}
                  required 
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--pulpos-border)', backgroundColor: '#f8fafc' }} 
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--pulpos-text-muted)', display: 'block', marginTop: '0.25rem' }}>Monto de compra necesario para ganar los puntos.</span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Vigencia de los Puntos (Días)</label>
                <input 
                  type="number" 
                  name="validityDays" 
                  defaultValue={initialSettings?.validityDays || 365} 
                  min="1" 
                  required 
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--pulpos-border)', backgroundColor: '#f8fafc' }} 
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--pulpos-text-muted)', display: 'block', marginTop: '0.25rem' }}>Días que tienen los puntos antes de vencer.</span>
              </div>
            </div>

            {/* Formula Simulator Banner */}
            <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2.5rem' }}>
              <Star color="#16a34a" size={24} fill="#16a34a" />
              <div style={{ fontSize: '0.9rem', color: '#166534' }}>
                <strong>Regla de Fidelización:</strong> El cliente recibirá <strong>{pts} Puntos</strong> por cada <strong>{formatCurrency(amount)}</strong> gastados. 
                (Ejemplo: Una compra de $1,000 pesos acumulará <strong>{Math.floor(1000 / (amount || 1)) * pts} Puntos</strong>).
              </div>
            </div>

            {/* Payment Methods Checkboxes */}
            <div style={{ borderTop: '1px solid var(--pulpos-border)', paddingTop: '1.5rem' }}>
              <h5 style={{ fontWeight: 'bold', fontSize: '1rem', marginBottom: '0.5rem' }}>Métodos de Pago Habilitados</h5>
              <p style={{ color: 'var(--pulpos-text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>Selecciona los métodos de pago válidos con los que el cliente puede ganar puntos.</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                {[
                  { id: 'CASH', label: '💵 Efectivo' },
                  { id: 'CARD', label: '💳 Tarjeta' },
                  { id: 'TRANSFER', label: '🏛️ Transferencia Bancaria' },
                  { id: 'CREDIT', label: '🛍️ Venta a Crédito (CxC)' },
                  { id: 'MIXTO', label: '⚡ Pago Mixto' }
                ].map(method => (
                  <label key={method.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--pulpos-border)', backgroundColor: '#f8fafc', transition: 'all 0.2s' }}>
                    <input 
                      type="checkbox" 
                      name={`method_${method.id}`}
                      defaultChecked={paymentMethodsList.includes(method.id)}
                      style={{ width: '1.2rem', height: '1.2rem', accentColor: 'var(--pulpos-primary)', cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>{method.label}</span>
                  </label>
                ))}
              </div>
            </div>

          </div>

          {/* Form Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', alignItems: 'center' }}>
            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#ef4444', fontWeight: 'bold', fontSize: '0.9rem' }}>
                <AlertCircle size={18} /> {error}
              </div>
            )}
            {success && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#16a34a', fontWeight: 'bold', fontSize: '0.9rem' }}>
                <CheckCircle2 size={18} /> ¡Ajustes guardados correctamente!
              </div>
            )}
            <button 
              type="submit" 
              disabled={loading} 
              className="btn-primary" 
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 2rem', fontSize: '1rem' }}
            >
              <Save size={18} /> {loading ? 'Guardando...' : 'Guardar Configuración'}
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: TRANSACTION HISTORY */}
      {activeTab === 'history' && (
        <div style={{ backgroundColor: 'white', border: '1px solid var(--pulpos-border)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--pulpos-border)' }}>
            <h4 style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Log del Ecosistema de Puntos</h4>
            <p style={{ color: 'var(--pulpos-text-muted)', fontSize: '0.85rem' }}>Últimas 20 transacciones de acumulación, canje o expiración en el sistema.</p>
          </div>
          
          <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--pulpos-border)' }}>
                <th style={{ padding: '1rem', color: 'var(--pulpos-text-muted)', fontWeight: 'bold', fontSize: '0.875rem' }}>Fecha</th>
                <th style={{ padding: '1rem', color: 'var(--pulpos-text-muted)', fontWeight: 'bold', fontSize: '0.875rem' }}>Cliente</th>
                <th style={{ padding: '1rem', color: 'var(--pulpos-text-muted)', fontWeight: 'bold', fontSize: '0.875rem' }}>Tipo</th>
                <th style={{ padding: '1rem', color: 'var(--pulpos-text-muted)', fontWeight: 'bold', fontSize: '0.875rem' }}>Detalle</th>
                <th style={{ padding: '1rem', color: 'var(--pulpos-text-muted)', fontWeight: 'bold', fontSize: '0.875rem', textAlign: 'right' }}>Puntos</th>
              </tr>
            </thead>
            <tbody>
              {recentTransactions.map((tx, idx) => {
                const isEarned = tx.type === 'EARNED';
                return (
                  <tr key={tx.id || idx} style={{ borderBottom: '1px solid var(--pulpos-border)' }}>
                    <td data-label="Fecha" style={{ padding: '1rem', fontSize: '0.85rem' }}>{new Date(tx.createdAt).toLocaleString()}</td>
                    <td data-label="Cliente" style={{ padding: '1rem' }}>
                      <span style={{ fontWeight: 'bold', display: 'block' }}>{tx.customer?.name}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--pulpos-text-muted)' }}>{tx.customer?.phone || tx.customer?.email}</span>
                    </td>
                    <td data-label="Tipo" style={{ padding: '1rem' }}>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        backgroundColor: isEarned ? '#dcfce7' : '#fee2e2',
                        color: isEarned ? '#15803d' : '#b91c1c'
                      }}>
                        {isEarned ? 'ACUMULADO ✓' : 'CANJEADO ⚡'}
                      </span>
                    </td>
                    <td data-label="Detalle" style={{ padding: '1rem', fontSize: '0.875rem', color: 'var(--pulpos-text-muted)' }}>{tx.reason}</td>
                    <td data-label="Puntos" style={{ padding: '1rem', fontWeight: 'bold', color: isEarned ? '#16a34a' : '#ef4444', textAlign: 'right', fontSize: '1.1rem' }}>
                      {isEarned ? `+${tx.points}` : `-${tx.points}`}
                    </td>
                  </tr>
                );
              })}
              {recentTransactions.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                    No se han registrado transacciones de puntos todavía.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}
