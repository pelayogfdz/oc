'use client';

import { useState } from 'react';
import { updateSystemMPCredentials, addTenantGiftCredits, updateSystemPricing, updateTenantCustomPricing, editTenant, toggleTenantStatus, deleteTenant } from '@/app/actions/admin';
import { Save, Building2, Users, Coins, CreditCard, ShieldAlert, CheckCircle2, DollarSign, Settings, Edit, Power, PowerOff, Trash2 } from 'lucide-react';

export default function AdminClient({ initialData }: { initialData: any }) {
  const { tenants, settings } = initialData;
  const [accessToken, setAccessToken] = useState(settings?.mpAccessToken || '');
  const [publicKey, setPublicKey] = useState(settings?.mpPublicKey || '');
  const [isSavingMP, setIsSavingMP] = useState(false);

  const [basePrice, setBasePrice] = useState<number>(settings?.basePrice || 0);
  const [userPrice, setUserPrice] = useState<number>(settings?.userPrice || 0);
  const [isSavingPricing, setIsSavingPricing] = useState(false);

  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const [creditsAmount, setCreditsAmount] = useState<number>(0);
  const [isSavingCredits, setIsSavingCredits] = useState(false);

  const [pricingTenant, setPricingTenant] = useState<any>(null);
  const [customBasePrice, setCustomBasePrice] = useState<number | ''>('');
  const [customUserPrice, setCustomUserPrice] = useState<number | ''>('');
  const [isSavingTenantPricing, setIsSavingTenantPricing] = useState(false);

  const [editingTenant, setEditingTenant] = useState<any>(null);
  const [tenantName, setTenantName] = useState('');
  const [isSavingTenant, setIsSavingTenant] = useState(false);

  const handleSaveMP = async () => {
    setIsSavingMP(true);
    try {
      await updateSystemMPCredentials({ mpAccessToken: accessToken, mpPublicKey: publicKey });
      alert('Credenciales de Mercado Pago guardadas exitosamente.');
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setIsSavingMP(false);
    }
  };

  const handleSavePricing = async () => {
    setIsSavingPricing(true);
    try {
      await updateSystemPricing({ basePrice, userPrice });
      alert('Precios globales guardados exitosamente.');
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setIsSavingPricing(false);
    }
  };

  const handleAddCredits = async () => {
    if (!selectedTenant || creditsAmount <= 0) return;
    setIsSavingCredits(true);
    try {
      await addTenantGiftCredits(selectedTenant.id, creditsAmount);
      alert(`Se añadieron ${creditsAmount} créditos a ${selectedTenant.name}.`);
      setSelectedTenant(null);
      setCreditsAmount(0);
      window.location.reload();
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setIsSavingCredits(false);
    }
  };

  const handleSaveTenantPricing = async () => {
    if (!pricingTenant) return;
    setIsSavingTenantPricing(true);
    try {
      await updateTenantCustomPricing(pricingTenant.id, {
        customBasePrice: customBasePrice === '' ? null : Number(customBasePrice),
        customUserPrice: customUserPrice === '' ? null : Number(customUserPrice)
      });
      alert(`Precios actualizados para ${pricingTenant.name}.`);
      setPricingTenant(null);
      window.location.reload();
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setIsSavingTenantPricing(false);
    }
  };

  const openPricingModal = (t: any) => {
    setPricingTenant(t);
    setCustomBasePrice(t.customBasePrice !== null ? t.customBasePrice : '');
    setCustomUserPrice(t.customUserPrice !== null ? t.customUserPrice : '');
  };

  const handleEditTenant = async () => {
    if (!editingTenant || !tenantName.trim()) return;
    setIsSavingTenant(true);
    try {
      await editTenant(editingTenant.id, tenantName);
      alert('Organización actualizada.');
      setEditingTenant(null);
      window.location.reload();
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setIsSavingTenant(false);
    }
  };

  const handleToggleTenant = async (t: any) => {
    if (!confirm(`¿Estás seguro de que deseas ${t.isActive ? 'desactivar' : 'activar'} la organización ${t.name}?`)) return;
    try {
      await toggleTenantStatus(t.id, !t.isActive);
      window.location.reload();
    } catch (e: any) {
      alert('Error: ' + e.message);
    }
  };

  const handleDeleteTenant = async (t: any) => {
    const confirmation = prompt(`¡ADVERTENCIA!\nEsta acción eliminará de forma PERMANENTE a la organización "${t.name}" y todos sus datos asociados (usuarios, productos, ventas, etc.).\n\nSi estás absolutamente seguro, escribe ELIMINAR para confirmar.`);
    if (confirmation !== 'ELIMINAR') {
      if (confirmation !== null) alert('Eliminación cancelada. La palabra clave no coincide.');
      return;
    }
    
    try {
      await deleteTenant(t.id);
      window.location.reload();
    } catch (e: any) {
      alert('Error al eliminar: ' + e.message);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <ShieldAlert size={32} color="#dc2626" />
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>Panel de Super Admin</h1>
          <p style={{ color: 'var(--pulpos-text-muted)' }}>Gestión global del sistema CAANMA PRO</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
        
        {/* Mercado Pago Settings */}
        <section style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--pulpos-border)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CreditCard size={20} color="#2563eb" /> 
            Configuración de Mercado Pago
          </h2>
          <p style={{ color: 'var(--pulpos-text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Ingresa las credenciales maestras donde recibirás los pagos de suscripción de todas las organizaciones.
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Access Token (Producción)</label>
              <input 
                type="password" 
                value={accessToken}
                onChange={e => setAccessToken(e.target.value)}
                placeholder="APP_USR-..." 
                style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Public Key (Producción)</label>
              <input 
                type="text" 
                value={publicKey}
                onChange={e => setPublicKey(e.target.value)}
                placeholder="APP_USR-..." 
                style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </div>
            
            <button 
              onClick={handleSaveMP}
              disabled={isSavingMP}
              style={{ padding: '0.75rem 1.5rem', backgroundColor: '#2563eb', color: 'white', borderRadius: '6px', fontWeight: 'bold', border: 'none', cursor: isSavingMP ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', width: 'fit-content', marginTop: '0.5rem' }}
            >
              <Save size={18} /> {isSavingMP ? 'Guardando...' : 'Guardar Credenciales'}
            </button>
          </div>
        </section>

        {/* Global Pricing Settings */}
        <section style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--pulpos-border)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <DollarSign size={20} color="#16a34a" /> 
            Precios Globales (Por defecto)
          </h2>
          <p style={{ color: 'var(--pulpos-text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Define el costo base de plataforma y el costo adicional por usuario para el cobro mensual automatizado.
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Costo Base Mensual (MXN)</label>
              <input 
                type="number" 
                value={basePrice}
                onChange={e => setBasePrice(Number(e.target.value))}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                min="0"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Costo extra por Usuario (MXN)</label>
              <input 
                type="number" 
                value={userPrice}
                onChange={e => setUserPrice(Number(e.target.value))}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                min="0"
              />
            </div>
            
            <button 
              onClick={handleSavePricing}
              disabled={isSavingPricing}
              style={{ padding: '0.75rem 1.5rem', backgroundColor: '#16a34a', color: 'white', borderRadius: '6px', fontWeight: 'bold', border: 'none', cursor: isSavingPricing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', width: 'fit-content', marginTop: '0.5rem' }}
            >
              <Save size={18} /> {isSavingPricing ? 'Guardando...' : 'Guardar Precios'}
            </button>
          </div>
        </section>
      </div>

      {/* Organizations Table */}
      <section style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--pulpos-border)' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Building2 size={20} color="#16a34a" /> 
          Organizaciones Registradas
        </h2>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--pulpos-border)', textAlign: 'left', color: 'var(--pulpos-text-muted)' }}>
                <th style={{ padding: '0.75rem' }}>Organización</th>
                <th style={{ padding: '0.75rem' }}>Usuarios</th>
                <th style={{ padding: '0.75rem' }}>Cálculo Mensual</th>
                <th style={{ padding: '0.75rem' }}>Estado Facturación</th>
                <th style={{ padding: '0.75rem' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t: any) => {
                const effectiveBase = t.customBasePrice !== null ? t.customBasePrice : (settings?.basePrice || 0);
                const effectiveUserPrice = t.customUserPrice !== null ? t.customUserPrice : (settings?.userPrice || 0);
                const total = effectiveBase + (t._count?.users || 0) * effectiveUserPrice;
                
                return (
                <tr key={t.id} style={{ borderBottom: '1px solid var(--pulpos-border)' }}>
                  <td style={{ padding: '1rem 0.75rem', fontWeight: '500' }}>
                    {t.name}
                    {t.subscriptionStatus === 'PAST_DUE' && (
                      <span style={{ marginLeft: '0.5rem', backgroundColor: '#fee2e2', color: '#b91c1c', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>VENCIDO</span>
                    )}
                  </td>
                  <td style={{ padding: '1rem 0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Users size={16} color="#64748b" /> {t._count.users}
                    </div>
                  </td>
                  <td style={{ padding: '1rem 0.75rem' }}>
                    <div>
                      <strong style={{ fontSize: '1.1rem' }}>${total.toFixed(2)}</strong>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        Base: ${effectiveBase} | Usr: ${effectiveUserPrice}
                        {(t.customBasePrice !== null || t.customUserPrice !== null) && (
                          <span style={{ color: '#d97706', marginLeft: '4px' }}>(Personalizado)</span>
                        )}
                      </div>
                      {t.giftCredits > 0 && (
                        <div style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 'bold' }}>
                          -${t.giftCredits.toFixed(2)} en Créditos
                        </div>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '1rem 0.75rem' }}>
                    {t.mpCardId ? (
                      <span style={{ color: '#16a34a', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <CheckCircle2 size={16} /> Tarjeta Registrada
                      </span>
                    ) : (
                      <span style={{ color: '#ef4444', fontWeight: 'bold' }}>Sin método de pago</span>
                    )}
                  </td>
                  <td style={{ padding: '1rem 0.75rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button 
                        onClick={() => { setEditingTenant(t); setTenantName(t.name); }}
                        style={{ padding: '0.5rem 0.75rem', backgroundColor: '#f1f5f9', color: '#475569', borderRadius: '4px', fontWeight: 'bold', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                        title="Editar Nombre"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={() => handleToggleTenant(t)}
                        style={{ padding: '0.5rem 0.75rem', backgroundColor: t.isActive ? '#fef08a' : '#dcfce3', color: t.isActive ? '#a16207' : '#16a34a', borderRadius: '4px', fontWeight: 'bold', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                        title={t.isActive ? "Desactivar (Pausar)" : "Activar"}
                      >
                        {t.isActive ? <PowerOff size={16} /> : <Power size={16} />}
                      </button>
                      <button 
                        onClick={() => handleDeleteTenant(t)}
                        style={{ padding: '0.5rem 0.75rem', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: '4px', fontWeight: 'bold', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                        title="Eliminar Permanentemente"
                      >
                        <Trash2 size={16} />
                      </button>
                      <button 
                        onClick={() => openPricingModal(t)}
                        style={{ padding: '0.5rem 0.75rem', backgroundColor: '#e0f2fe', color: '#0369a1', borderRadius: '4px', fontWeight: 'bold', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                      >
                        <Settings size={16} /> Precios
                      </button>
                      <button 
                        onClick={() => setSelectedTenant(t)}
                        style={{ padding: '0.5rem 0.75rem', backgroundColor: '#f3e8ff', color: '#7e22ce', borderRadius: '4px', fontWeight: 'bold', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                      >
                        <Coins size={16} /> Créditos
                      </button>
                    </div>
                  </td>
                </tr>
              )})}
              {tenants.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No hay organizaciones registradas.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal for Gift Credits */}
      {selectedTenant && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', width: '90%', maxWidth: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>Asignar Créditos</h3>
            <p style={{ color: 'var(--pulpos-text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              Los créditos ingresados se descontarán de la próxima factura de <strong>{selectedTenant.name}</strong>.
            </p>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Monto en MXN</label>
              <input 
                type="number" 
                value={creditsAmount}
                onChange={e => setCreditsAmount(Number(e.target.value))}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '1.1rem' }}
                min="0"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button 
                onClick={() => setSelectedTenant(null)}
                style={{ padding: '0.75rem 1.5rem', backgroundColor: 'transparent', color: '#64748b', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button 
                onClick={handleAddCredits}
                disabled={isSavingCredits}
                style={{ padding: '0.75rem 1.5rem', backgroundColor: '#7e22ce', color: 'white', borderRadius: '6px', fontWeight: 'bold', border: 'none', cursor: isSavingCredits ? 'not-allowed' : 'pointer' }}
              >
                {isSavingCredits ? 'Asignando...' : 'Asignar Créditos'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Custom Pricing */}
      {pricingTenant && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', width: '90%', maxWidth: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>Precios Especiales</h3>
            <p style={{ color: 'var(--pulpos-text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              Define precios personalizados para <strong>{pricingTenant.name}</strong>. Déjalos en blanco para usar el precio global.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Costo Base Personalizado</label>
                <input 
                  type="number" 
                  value={customBasePrice}
                  onChange={e => setCustomBasePrice(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder={`Global: $${settings.basePrice}`}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '1.1rem' }}
                  min="0"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Costo por Usuario Personalizado</label>
                <input 
                  type="number" 
                  value={customUserPrice}
                  onChange={e => setCustomUserPrice(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder={`Global: $${settings.userPrice}`}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '1.1rem' }}
                  min="0"
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button 
                onClick={() => setPricingTenant(null)}
                style={{ padding: '0.75rem 1.5rem', backgroundColor: 'transparent', color: '#64748b', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveTenantPricing}
                disabled={isSavingTenantPricing}
                style={{ padding: '0.75rem 1.5rem', backgroundColor: '#0369a1', color: 'white', borderRadius: '6px', fontWeight: 'bold', border: 'none', cursor: isSavingTenantPricing ? 'not-allowed' : 'pointer' }}
              >
                {isSavingTenantPricing ? 'Guardando...' : 'Guardar Precios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Editing Tenant */}
      {editingTenant && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', width: '90%', maxWidth: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>Editar Organización</h3>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Nombre de la Organización</label>
              <input 
                type="text" 
                value={tenantName}
                onChange={e => setTenantName(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '1.1rem' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button 
                onClick={() => setEditingTenant(null)}
                style={{ padding: '0.75rem 1.5rem', backgroundColor: 'transparent', color: '#64748b', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button 
                onClick={handleEditTenant}
                disabled={isSavingTenant}
                style={{ padding: '0.75rem 1.5rem', backgroundColor: '#475569', color: 'white', borderRadius: '6px', fontWeight: 'bold', border: 'none', cursor: isSavingTenant ? 'not-allowed' : 'pointer' }}
              >
                {isSavingTenant ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
