'use client';

import { useState, useEffect } from 'react';
import { Star, Settings, Award, CheckCircle2, History, AlertCircle, Save, Wallet } from 'lucide-react';
import { saveLoyaltySettings, getGoogleWalletSettings, saveGoogleWalletSettings } from '@/app/actions/loyalty';
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
  const [activeTab, setActiveTab] = useState<'config' | 'history' | 'wallet'>('config');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Google Wallet Settings states
  const [walletSettings, setWalletSettings] = useState({
    enabled: false,
    issuerId: '',
    classId: '',
    clientEmail: '',
    privateKey: ''
  });
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletSuccess, setWalletSuccess] = useState(false);
  const [walletError, setWalletError] = useState('');

  // Load Google Wallet settings
  useEffect(() => {
    async function loadSettings() {
      const res = await getGoogleWalletSettings(branch.id);
      if (res.success && res.settings) {
        setWalletSettings(res.settings);
      }
    }
    loadSettings();
  }, [branch.id]);

  const handleWalletChange = (field: string, value: any) => {
    setWalletSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  async function onSaveWallet(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setWalletLoading(true);
    setWalletSuccess(false);
    setWalletError('');

    const res = await saveGoogleWalletSettings(branch.id, walletSettings);
    setWalletLoading(false);

    if (res.success) {
      setWalletSuccess(true);
      setTimeout(() => setWalletSuccess(false), 3000);
    } else {
      setWalletError(res.error || 'Ocurrió un error al guardar los ajustes.');
    }
  }

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid var(--caanma-border)', paddingBottom: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Award size={28} color="var(--caanma-primary)" /> Fidelización y Puntos de Lealtad
          </h2>
          <p style={{ color: 'var(--caanma-text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Configura las reglas para premiar a tus clientes con puntos por cada compra realizada en la sucursal <strong>{branch.name}</strong>.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--caanma-border)' }}>
        <button
          onClick={() => setActiveTab('config')}
          style={{
            padding: '0.75rem 1rem',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'config' ? '2px solid var(--caanma-primary)' : '2px solid transparent',
            color: activeTab === 'config' ? 'var(--caanma-primary)' : 'var(--caanma-text-muted)',
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
            borderBottom: activeTab === 'history' ? '2px solid var(--caanma-primary)' : '2px solid transparent',
            color: activeTab === 'history' ? 'var(--caanma-primary)' : 'var(--caanma-text-muted)',
            fontWeight: activeTab === 'history' ? 'bold' : 'normal',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <History size={18} /> Log de Puntos Recientes
        </button>
        <button
          onClick={() => setActiveTab('wallet')}
          style={{
            padding: '0.75rem 1rem',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'wallet' ? '2px solid var(--caanma-primary)' : '2px solid transparent',
            color: activeTab === 'wallet' ? 'var(--caanma-primary)' : 'var(--caanma-text-muted)',
            fontWeight: activeTab === 'wallet' ? 'bold' : 'normal',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Wallet size={18} /> Google Wallet
        </button>
      </div>


      {/* TAB 1: CONFIGURATION */}
      {activeTab === 'config' && (
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Main Card */}
          <div style={{ backgroundColor: 'white', border: '1px solid var(--caanma-border)', borderRadius: '12px', padding: '2rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
            
            {/* Engine Active Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--caanma-border)', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
              <div>
                <h4 style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Estado del Motor de Puntos</h4>
                <p style={{ color: 'var(--caanma-text-muted)', fontSize: '0.85rem' }}>Si el motor está inactivo, las compras de los clientes no acumularán puntos de lealtad.</p>
              </div>
              <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', gap: '0.5rem' }}>
                <input 
                  type="checkbox" 
                  name="isActive" 
                  defaultChecked={initialSettings?.isActive !== false}
                  style={{ width: '1.5rem', height: '1.5rem', cursor: 'pointer', accentColor: 'var(--caanma-primary)' }}
                />
                <span style={{ fontWeight: 'bold' }}>Motor Activo</span>
              </label>
            </div>

            {/* Calculations and rules */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Puntos a Otorgar (General)</label>
                <input 
                  type="number" 
                  name="pointsPerAmount" 
                  value={pts} 
                  min="0.1" 
                  step="any"
                  onChange={e => setPts(parseFloat(e.target.value) || 0)}
                  required 
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--caanma-border)', backgroundColor: '#f8fafc' }} 
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--caanma-text-muted)', display: 'block', marginTop: '0.25rem' }}>Número de puntos base.</span>
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
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--caanma-border)', backgroundColor: '#f8fafc' }} 
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--caanma-text-muted)', display: 'block', marginTop: '0.25rem' }}>Monto de compra necesario.</span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Vigencia de Puntos (Días)</label>
                <input 
                  type="number" 
                  name="validityDays" 
                  defaultValue={initialSettings?.validityDays || 365} 
                  min="1" 
                  required 
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--caanma-border)', backgroundColor: '#f8fafc' }} 
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--caanma-text-muted)', display: 'block', marginTop: '0.25rem' }}>Días antes de vencer.</span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', color: 'var(--caanma-primary)', marginBottom: '0.5rem' }}>Valor de cada Punto ($)</label>
                <input 
                  type="number" 
                  name="pointValueInPesos" 
                  defaultValue={initialSettings?.pointValueInPesos || 1.0} 
                  min="0.01" 
                  step="any"
                  required 
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--caanma-primary)', backgroundColor: '#fdfeff' }} 
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--caanma-text-muted)', display: 'block', marginTop: '0.25rem' }}>Valor de 1 punto en pesos al pagar.</span>
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

            {/* Payment Methods and Points Multipliers */}
            <div style={{ borderTop: '1px solid var(--caanma-border)', paddingTop: '1.5rem' }}>
              <h5 style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '0.5rem' }}>Métodos de Pago y Reglas de Acumulación</h5>
              <p style={{ color: 'var(--caanma-text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Activa cada método de pago y define cuántos puntos otorga de manera independiente.</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
                {[
                  { id: 'CASH', label: '💵 Efectivo', field: 'pointsCash', desc: 'Puntos por pagar con billetes o monedas.' },
                  { id: 'CARD', label: '💳 Tarjeta', field: 'pointsCard', desc: 'Puntos por pagar con terminal bancaria.' },
                  { id: 'TRANSFER', label: '🏛️ Transferencia Bancaria', field: 'pointsTransfer', desc: 'Puntos por SPEI o depósitos bancarios.' },
                  { id: 'CREDIT', label: '🛍️ Venta a Crédito (CxC)', field: 'pointsCredit', desc: 'Puntos al liquidar o comprar a crédito.' },
                  { id: 'MIXTO', label: '⚡ Pago Mixto', field: 'pointsMixto', desc: 'Puntos por pagos mixtos divididos.' }
                ].map(method => {
                  const initialVal = initialSettings?.[method.field] !== undefined ? initialSettings[method.field] : (method.id === 'CREDIT' ? 0.0 : 1.0);
                  return (
                    <div key={method.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--caanma-border)', backgroundColor: '#f8fafc', transition: 'all 0.2s', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          name={`method_${method.id}`}
                          defaultChecked={paymentMethodsList.includes(method.id)}
                          style={{ width: '1.2rem', height: '1.2rem', accentColor: 'var(--caanma-primary)', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#1e293b' }}>{method.label}</span>
                      </label>
                      
                      <p style={{ color: 'var(--caanma-text-muted)', fontSize: '0.75rem', margin: '0' }}>{method.desc}</p>
                      
                      <div style={{ marginTop: '0.25rem' }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#475569', marginBottom: '0.25rem' }}>Puntos a otorgar:</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <input 
                            type="number" 
                            name={method.field}
                            defaultValue={initialVal}
                            min="0"
                            step="any"
                            style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--caanma-border)', backgroundColor: 'white', fontSize: '0.875rem' }}
                          />
                          <span style={{ fontSize: '0.75rem', color: 'var(--caanma-text-muted)', fontWeight: '500', whiteSpace: 'nowrap' }}>pts / paso</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
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
        <div style={{ backgroundColor: 'white', border: '1px solid var(--caanma-border)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--caanma-border)' }}>
            <h4 style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Log del Ecosistema de Puntos</h4>
            <p style={{ color: 'var(--caanma-text-muted)', fontSize: '0.85rem' }}>Últimas 20 transacciones de acumulación, canje o expiración en el sistema.</p>
          </div>
          
          <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--caanma-border)' }}>
                <th style={{ padding: '1rem', color: 'var(--caanma-text-muted)', fontWeight: 'bold', fontSize: '0.875rem' }}>Fecha</th>
                <th style={{ padding: '1rem', color: 'var(--caanma-text-muted)', fontWeight: 'bold', fontSize: '0.875rem' }}>Cliente</th>
                <th style={{ padding: '1rem', color: 'var(--caanma-text-muted)', fontWeight: 'bold', fontSize: '0.875rem' }}>Tipo</th>
                <th style={{ padding: '1rem', color: 'var(--caanma-text-muted)', fontWeight: 'bold', fontSize: '0.875rem' }}>Detalle</th>
                <th style={{ padding: '1rem', color: 'var(--caanma-text-muted)', fontWeight: 'bold', fontSize: '0.875rem', textAlign: 'right' }}>Puntos</th>
              </tr>
            </thead>
            <tbody>
              {recentTransactions.map((tx, idx) => {
                const isEarned = tx.type === 'EARNED';
                return (
                  <tr key={tx.id || idx} style={{ borderBottom: '1px solid var(--caanma-border)' }}>
                    <td data-label="Fecha" style={{ padding: '1rem', fontSize: '0.85rem' }}>{new Date(tx.createdAt).toLocaleString()}</td>
                    <td data-label="Cliente" style={{ padding: '1rem' }}>
                      <span style={{ fontWeight: 'bold', display: 'block' }}>{tx.customer?.name}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--caanma-text-muted)' }}>{tx.customer?.phone || tx.customer?.email}</span>
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
                    <td data-label="Detalle" style={{ padding: '1rem', fontSize: '0.875rem', color: 'var(--caanma-text-muted)' }}>{tx.reason}</td>
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

      {/* TAB 3: GOOGLE WALLET */}
      {activeTab === 'wallet' && (
        <form onSubmit={onSaveWallet} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div style={{ backgroundColor: 'white', border: '1px solid var(--caanma-border)', borderRadius: '12px', padding: '2rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--caanma-border)', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
              <div>
                <h4 style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Sincronización con Google Wallet</h4>
                <p style={{ color: 'var(--caanma-text-muted)', fontSize: '0.85rem' }}>Permite a tus clientes guardar su tarjeta de puntos y saldo en la app Google Wallet.</p>
              </div>
              <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', gap: '0.5rem' }}>
                <input 
                  type="checkbox" 
                  checked={walletSettings.enabled}
                  onChange={e => handleWalletChange('enabled', e.target.checked)}
                  style={{ width: '1.5rem', height: '1.5rem', cursor: 'pointer', accentColor: 'var(--caanma-primary)' }}
                />
                <span style={{ fontWeight: 'bold' }}>Integración Activa</span>
              </label>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Issuer ID (ID de Emisor)</label>
                  <input 
                    type="text" 
                    value={walletSettings.issuerId} 
                    onChange={e => handleWalletChange('issuerId', e.target.value)}
                    placeholder="Ej. 3388000000022288888"
                    required={walletSettings.enabled}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--caanma-border)', backgroundColor: '#f8fafc' }} 
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--caanma-text-muted)', display: 'block', marginTop: '0.25rem' }}>ID numérico provisto en tu consola de Google Pay & Wallet.</span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Class ID (ID de Clase de Lealtad)</label>
                  <input 
                    type="text" 
                    value={walletSettings.classId} 
                    onChange={e => handleWalletChange('classId', e.target.value)}
                    placeholder="Ej. loyalty_points_class"
                    required={walletSettings.enabled}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--caanma-border)', backgroundColor: '#f8fafc' }} 
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--caanma-text-muted)', display: 'block', marginTop: '0.25rem' }}>Identificador único de la clase creada en la consola.</span>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Service Account Email (Email de Cuenta de Servicio)</label>
                <input 
                  type="email" 
                  value={walletSettings.clientEmail} 
                  onChange={e => handleWalletChange('clientEmail', e.target.value)}
                  placeholder="Ej. wallet-service@mi-proyecto.iam.gserviceaccount.com"
                  required={walletSettings.enabled}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--caanma-border)', backgroundColor: '#f8fafc' }} 
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--caanma-text-muted)', display: 'block', marginTop: '0.25rem' }}>Correo electrónico de la cuenta de servicio autorizada para firmar los pases.</span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Private Key (Llave Privada en formato PEM)</label>
                <textarea 
                  value={walletSettings.privateKey} 
                  onChange={e => handleWalletChange('privateKey', e.target.value)}
                  placeholder="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQ...\n-----END PRIVATE KEY-----"
                  required={walletSettings.enabled}
                  rows={6}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--caanma-border)', backgroundColor: '#f8fafc', fontFamily: 'monospace', fontSize: '0.8rem' }} 
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--caanma-text-muted)', display: 'block', marginTop: '0.25rem' }}>El bloque completo de tu llave privada RSA. Se aceptan saltos de línea literales y escapados (\n).</span>
              </div>
            </div>

          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', alignItems: 'center' }}>
            {walletError && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#ef4444', fontWeight: 'bold', fontSize: '0.9rem' }}>
                <AlertCircle size={18} /> {walletError}
              </div>
            )}
            {walletSuccess && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#16a34a', fontWeight: 'bold', fontSize: '0.9rem' }}>
                <CheckCircle2 size={18} /> ¡Ajustes de Google Wallet guardados!
              </div>
            )}
            <button 
              type="submit" 
              disabled={walletLoading} 
              className="btn-primary" 
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 2rem', fontSize: '1rem' }}
            >
              <Save size={18} /> {walletLoading ? 'Guardando...' : 'Guardar Google Wallet'}
            </button>
          </div>
        </form>
      )}

    </div>
  );
}

