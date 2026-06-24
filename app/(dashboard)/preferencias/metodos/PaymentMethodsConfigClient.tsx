'use client';

import { useState } from 'react';
import { Save, Banknote, CreditCard, Send, ShieldAlert, CheckCircle2, QrCode, Plus, Trash2, Edit2, X, Check, Wallet } from 'lucide-react';
import { updateAdvancedJSONConfig } from '@/app/actions/settings';

const STANDARD_METHODS = [
  { id: 'CASH', name: 'EFECTIVO', icon: <Banknote size={24} color="#16a34a" /> },
  { id: 'CARD', name: 'TARJETA DE DÉBITO / CRÉDITO', icon: <CreditCard size={24} color="#0284c7" /> },
  { id: 'TRANSFER', name: 'TRANSFERENCIA BANCARIA (SPEI)', icon: <Send size={24} color="#8b5cf6" /> },
  { id: 'CREDIT', name: 'CRÉDITO A CLIENTE / FIADO', icon: <ShieldAlert size={24} color="#d946ef" /> },
  { id: 'VALES', name: 'VALES DE DESPENSA', icon: <QrCode size={24} color="#f59e0b" /> },
];

const standardMethodNames: Record<string, string> = {
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  TRANSFER: 'Transferencia',
  CREDIT: 'Crédito a Cliente',
  VALES: 'Vales de despensa'
};

export default function PaymentMethodsConfigClient({ initialConfig }: { initialConfig: any }) {
  // If no config format exists, default to Cash, Card, Transfer enabled
  const [enabledIds, setEnabledIds] = useState<string[]>(
    initialConfig?.enabledIds ?? ['CASH', 'CARD', 'TRANSFER']
  );
  
  const [customMethods, setCustomMethods] = useState<{ id: string; name: string }[]>(
    initialConfig?.customMethods ?? []
  );
  
  const [newMethodName, setNewMethodName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const [isPending, setIsPending] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const toggleMethod = (id: string) => {
    setEnabledIds(prev => 
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const handleAddCustom = () => {
    if (!newMethodName.trim()) return;
    const slug = newMethodName.trim().toUpperCase().replace(/[^A-Z0-9]/g, '_');
    const newId = `CUSTOM_${slug}_${Date.now().toString().slice(-4)}`;
    
    const newMethod = {
      id: newId,
      name: newMethodName.trim()
    };
    
    setCustomMethods(prev => [...prev, newMethod]);
    setEnabledIds(prev => [...prev, newId]);
    setNewMethodName('');
  };

  const handleStartEdit = (id: string, name: string) => {
    setEditingId(id);
    setEditingName(name);
  };

  const handleSaveEdit = (id: string) => {
    if (!editingName.trim()) return;
    setCustomMethods(prev => prev.map(m => m.id === id ? { ...m, name: editingName.trim() } : m));
    setEditingId(null);
    setEditingName('');
  };

  const handleDeleteCustom = (id: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar este método de pago personalizado?')) {
      setCustomMethods(prev => prev.filter(m => m.id !== id));
      setEnabledIds(prev => prev.filter(mid => mid !== id));
    }
  };

  async function handleSave() {
    setIsPending(true);
    try {
      const activeStandardMethods = STANDARD_METHODS.filter(m => enabledIds.includes(m.id))
        .map(m => ({
          id: m.id,
          name: standardMethodNames[m.id] || m.name
        }));

      const activeCustomMethods = customMethods.filter(m => enabledIds.includes(m.id))
        .map(m => ({
          id: m.id,
          name: m.name
        }));

      const methods = [...activeStandardMethods, ...activeCustomMethods];

      await updateAdvancedJSONConfig('metodos', { 
        enabledIds, 
        customMethods, 
        methods 
      });
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
          <p style={{ color: 'var(--caanma-text-muted)' }}>Maneja cómo tus clientes efectúan sus pagos en sucursal.</p>
       </div>

       {showToast && (
          <div style={{ padding: '1rem', backgroundColor: '#dcfce7', color: '#166534', borderRadius: '6px', marginBottom: '1.5rem', fontWeight: 'bold', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle2 size={18} /> Métodos de pago guardados exitosamente
          </div>
       )}

       <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginBottom: '2.5rem' }}>
          {STANDARD_METHODS.map(method => {
            const isActive = enabledIds.includes(method.id);
            return (
              <div key={method.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem', backgroundColor: 'white', border: `1px solid ${isActive ? 'var(--caanma-primary)' : 'var(--caanma-border)'}`, borderRadius: '12px', boxShadow: isActive ? '0 0 0 1px var(--caanma-primary)' : 'none', transition: 'all 0.2s' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: isActive ? '#f0f9ff' : '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0' }}>
                       {method.icon}
                    </div>
                    <div>
                       <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: isActive ? 'var(--caanma-text)' : 'var(--caanma-text-muted)' }}>
                         {method.name}
                       </div>
                       <div style={{ fontSize: '0.85rem', color: 'var(--caanma-text-muted)' }}>
                         {isActive ? 'Activo en Punto de Venta' : 'Inactivo'}
                       </div>
                    </div>
                 </div>
                 
                 {/* Toggle Switch */}
                 <label style={{ position: 'relative', display: 'inline-block', width: '50px', height: '30px' }}>
                    <input type="checkbox" checked={isActive} onChange={() => toggleMethod(method.id)} style={{ opacity: 0, width: 0, height: 0 }} />
                    <span style={{ 
                      position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, 
                      backgroundColor: isActive ? 'var(--caanma-primary)' : '#cbd5e1', 
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

       {/* Custom Payment Methods Section */}
       <div style={{ borderTop: '1px solid var(--caanma-border)', paddingTop: '2.5rem', marginBottom: '2.5rem' }}>
          <div style={{ marginBottom: '1.5rem' }}>
             <h2 style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>Métodos de Pago Personalizados</h2>
             <p style={{ color: 'var(--caanma-text-muted)', fontSize: '0.9rem' }}>Agrega opciones de cobro adicionales para tus sucursales (ej. Mercado Pago, American Express).</p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px dashed var(--caanma-border)' }}>
             <input 
               type="text" 
               placeholder="Nombre del método de pago (ej. Mercado Pago)" 
               value={newMethodName} 
               onChange={(e) => setNewMethodName(e.target.value)}
               style={{ flex: 1, padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--caanma-border)', outline: 'none', fontSize: '0.95rem' }} 
               onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustom(); } }}
             />
             <button 
               type="button" 
               onClick={handleAddCustom} 
               className="btn-primary" 
               style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', fontSize: '0.95rem' }}
             >
                <Plus size={18} /> Agregar
             </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
             {customMethods.map(method => {
               const isActive = enabledIds.includes(method.id);
               const isEditing = editingId === method.id;

               return (
                 <div key={method.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem', backgroundColor: 'white', border: `1px solid ${isActive ? 'var(--caanma-primary)' : 'var(--caanma-border)'}`, borderRadius: '12px', boxShadow: isActive ? '0 0 0 1px var(--caanma-primary)' : 'none', transition: 'all 0.2s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flex: 1 }}>
                       <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: isActive ? '#f0f9ff' : '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0' }}>
                          <Wallet size={24} color="#8b5cf6" />
                       </div>
                       
                       {isEditing ? (
                         <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                            <input 
                              type="text" 
                              value={editingName} 
                              onChange={(e) => setEditingName(e.target.value)} 
                              style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--caanma-primary)', outline: 'none', fontSize: '1rem', flex: 1, maxWidth: '300px' }}
                              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSaveEdit(method.id); } }}
                              autoFocus
                            />
                            <button 
                              type="button" 
                              onClick={() => handleSaveEdit(method.id)} 
                              style={{ padding: '0.5rem', backgroundColor: '#dcfce7', border: 'none', borderRadius: '6px', color: '#166534', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                               <Check size={18} />
                            </button>
                            <button 
                              type="button" 
                              onClick={() => setEditingId(null)} 
                              style={{ padding: '0.5rem', backgroundColor: '#fee2e2', border: 'none', borderRadius: '6px', color: '#991b1b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                               <X size={18} />
                            </button>
                         </div>
                       ) : (
                         <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div>
                               <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: isActive ? 'var(--caanma-text)' : 'var(--caanma-text-muted)' }}>
                                 {method.name}
                               </div>
                               <div style={{ fontSize: '0.85rem', color: 'var(--caanma-text-muted)' }}>
                                 {isActive ? 'Activo en Punto de Venta' : 'Inactivo'}
                               </div>
                            </div>
                            
                            {/* Action buttons */}
                            <div style={{ display: 'flex', gap: '0.25rem', marginLeft: '0.5rem' }}>
                               <button 
                                 type="button" 
                                 onClick={() => handleStartEdit(method.id, method.name)} 
                                 style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                 title="Editar nombre"
                               >
                                  <Edit2 size={16} />
                               </button>
                               <button 
                                 type="button" 
                                 onClick={() => handleDeleteCustom(method.id)} 
                                 style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                 title="Eliminar método"
                               >
                                  <Trash2 size={16} />
                               </button>
                            </div>
                         </div>
                       )}
                    </div>
                    
                    {/* Toggle Switch */}
                    <label style={{ position: 'relative', display: 'inline-block', width: '50px', height: '30px', flexShrink: 0 }}>
                       <input type="checkbox" checked={isActive} onChange={() => toggleMethod(method.id)} style={{ opacity: 0, width: 0, height: 0 }} />
                       <span style={{ 
                         position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, 
                         backgroundColor: isActive ? 'var(--caanma-primary)' : '#cbd5e1', 
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
       </div>

       <div style={{ borderTop: '1px solid var(--caanma-border)', paddingTop: '1.5rem' }}>
          <button onClick={handleSave} disabled={isPending} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 2rem', fontSize: '1rem' }}>
             <Save size={20} /> {isPending ? 'Guardando...' : 'Guardar Configuración'}
          </button>
       </div>
    </div>
  );
}

