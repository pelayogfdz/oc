'use client';

import { useState } from 'react';
import { Save, Plus, Trash2, HelpCircle } from 'lucide-react';
import { updateAdvancedJSONConfig } from '@/app/actions/settings';

export type BankAccount = {
  bank: string;
  clabe: string;
};

export default function BancosClient({ initialConfig }: { initialConfig: any }) {
  const [accounts, setAccounts] = useState<BankAccount[]>(() => {
    if (initialConfig && Array.isArray(initialConfig.accounts)) {
      return initialConfig.accounts;
    }
    // Backward compatibility with single clabePrincipal/bancoPrincipal
    const legacyClabe = initialConfig?.clabePrincipal;
    const legacyBank = initialConfig?.bancoPrincipal;
    if (legacyClabe || legacyBank) {
      return [{ bank: legacyBank || 'Principal', clabe: legacyClabe || '' }];
    }
    return [];
  });

  const [newBank, setNewBank] = useState('');
  const [newClabe, setNewClabe] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [clabeError, setClabeError] = useState('');

  const validateClabe = (val: string) => {
    if (!val) return '';
    if (!/^\d+$/.test(val)) return 'La CLABE debe contener solo números';
    if (val.length !== 18) return `La CLABE debe tener exactamente 18 dígitos (llevas ${val.length})`;
    return '';
  };

  const handleClabeChange = (val: string) => {
    const cleanVal = val.replace(/\D/g, '').slice(0, 18);
    setNewClabe(cleanVal);
    setClabeError(validateClabe(cleanVal));
  };

  const handleAddAccount = () => {
    if (!newBank.trim()) {
      alert("Por favor escribe el nombre del Banco");
      return;
    }
    if (!newClabe || newClabe.length !== 18) {
      alert("Por favor escribe una CLABE válida de 18 dígitos");
      return;
    }

    setAccounts(prev => [...prev, { bank: newBank.trim(), clabe: newClabe }]);
    setNewBank('');
    setNewClabe('');
    setClabeError('');
  };

  const handleDeleteAccount = (index: number) => {
    if (confirm('¿Estás seguro de que deseas eliminar esta cuenta bancaria?')) {
      setAccounts(prev => prev.filter((_, i) => i !== index));
    }
  };

  async function handleSave() {
    setIsPending(true);
    try {
      // Save the accounts list and also keep clabePrincipal/bancoPrincipal updated for backwards compatibility
      const payload = {
        accounts,
        bancoPrincipal: accounts[0]?.bank || '',
        clabePrincipal: accounts[0]?.clabe || ''
      };
      await updateAdvancedJSONConfig('bancos', payload);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (err: any) {
      alert("Error al guardar: " + err.message);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '2rem', border: '1px solid var(--caanma-border)', maxWidth: '800px' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Conciliación Bancaria</h2>
      <p style={{ color: 'var(--caanma-text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--caanma-border)', paddingBottom: '1rem' }}>
        Asocia las cuentas bancarias corporativas para tu negocio.
      </p>

      {showToast && (
        <div style={{ padding: '1rem', backgroundColor: '#dcfce7', color: '#166534', borderRadius: '8px', marginBottom: '1.5rem', fontWeight: 'bold', border: '1px solid #bbf7d0' }}>
          ✅ Cuentas Bancarias Guardadas Correctamente
        </div>
      )}

      {/* Accounts List */}
      <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '1rem' }}>
        Cuentas Registradas ({accounts.length})
      </h3>

      {accounts.length === 0 ? (
        <div style={{ padding: '2rem', border: '2px dashed #e5e7eb', borderRadius: '8px', textAlign: 'center', color: '#9ca3af', marginBottom: '2rem' }}>
          No hay cuentas bancarias asociadas. Agrega una a continuación.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
          {accounts.map((acc, index) => (
            <div 
              key={index} 
              style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                padding: '1rem 1.5rem', 
                border: '1px solid #e5e7eb', 
                borderRadius: '8px', 
                backgroundColor: '#f9fafb',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}
            >
              <div>
                <span style={{ display: 'block', fontSize: '1rem', fontWeight: 'bold', color: '#111827' }}>
                  {acc.bank}
                </span>
                <span style={{ fontSize: '0.875rem', color: '#4b5563', fontFamily: 'monospace', letterSpacing: '1px' }}>
                  CLABE: {acc.clabe}
                </span>
              </div>
              <button 
                onClick={() => handleDeleteAccount(index)}
                style={{ 
                  backgroundColor: 'transparent', 
                  border: 'none', 
                  cursor: 'pointer', 
                  color: '#ef4444', 
                  padding: '0.5rem', 
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fee2e2'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                title="Eliminar Cuenta"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add New Account Form */}
      <div style={{ padding: '1.5rem', border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: '#fff', marginBottom: '2rem' }}>
        <h4 style={{ fontSize: '1rem', fontWeight: 'bold', color: '#374151', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={18} /> Agregar Nueva Cuenta
        </h4>
        
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 200px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#4b5563', marginBottom: '0.25rem' }}>
              Banco
            </label>
            <input 
              type="text" 
              placeholder="Ej. BBVA, Banorte, Santander..." 
              value={newBank} 
              onChange={(e) => setNewBank(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--caanma-border)', outline: 'none' }}
            />
          </div>

          <div style={{ flex: '2 1 300px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#4b5563', marginBottom: '0.25rem' }}>
              CLABE (18 dígitos)
            </label>
            <input 
              type="text" 
              placeholder="012345678901234567" 
              value={newClabe} 
              onChange={(e) => handleClabeChange(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: clabeError ? '1px solid #ef4444' : '1px solid var(--caanma-border)', outline: 'none', fontFamily: 'monospace' }}
            />
            {clabeError && (
              <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.25rem', display: 'block' }}>
                {clabeError}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', width: '100%', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button 
              type="button" 
              onClick={handleAddAccount}
              style={{ 
                backgroundColor: '#f3f4f6', 
                color: '#374151', 
                border: '1px solid #d1d5db', 
                borderRadius: '6px', 
                padding: '0.75rem 1.5rem', 
                fontWeight: 'bold', 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.9rem'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e5e7eb'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
            >
              <Plus size={16} /> Añadir a la Lista
            </button>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--caanma-border)', paddingTop: '1.5rem' }}>
        <button 
          className="btn-primary" 
          onClick={handleSave} 
          disabled={isPending} 
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: isPending ? 0.7 : 1 }}
        >
          <Save size={18} /> {isPending ? 'Guardando Cambios...' : 'Guardar Cambios'}
        </button>
      </div>
    </div>
  );
}
