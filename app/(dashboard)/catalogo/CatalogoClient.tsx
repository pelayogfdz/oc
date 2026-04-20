'use client';

import { useState } from 'react';
import { Save, ExternalLink, QrCode, ShoppingBag, Store, MessageCircle, PaintBucket, CheckCircle2 } from 'lucide-react';
import { updateAdvancedJSONConfig } from '@/app/actions/settings';

export default function CatalogoClient({ initialConfig }: { initialConfig: any }) {
  const [active, setActive] = useState(initialConfig?.active ?? true);
  const [whatsapp, setWhatsapp] = useState(initialConfig?.whatsapp || '');
  const [themeColor, setThemeColor] = useState(initialConfig?.themeColor || '#0ea5e9'); // default cyan CAANMA
  const [allowDelivery, setAllowDelivery] = useState(initialConfig?.allowDelivery ?? true);
  const [allowPickup, setAllowPickup] = useState(initialConfig?.allowPickup ?? true);
  
  const [isPending, setIsPending] = useState(false);
  const [showToast, setShowToast] = useState(false);

  // Mock domain for UI
  const storeUrl = `https://caanma.com/tienda/mi-sucursal`;

  async function handleSave() {
    setIsPending(true);
    try {
      await updateAdvancedJSONConfig('catalogo_b2c', { active, whatsapp, themeColor, allowDelivery, allowPickup });
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
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>Tu Catálogo en Línea (B2C)</h1>
          <p style={{ color: 'var(--pulpos-text-muted)' }}>Muestra tu inventario digitalmente para que tus clientes te hagan pedidos por WhatsApp.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: active ? '#f0fdf4' : '#f1f5f9', padding: '0.5rem 1rem', borderRadius: '50px', border: `1px solid ${active ? '#bbf7d0' : '#e2e8f0'}` }}>
           <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: active ? '#166534' : 'var(--pulpos-text-muted)' }}>
              {active ? 'Catálogo Público' : 'Catálogo Oculto'}
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

      {showToast && (
          <div style={{ padding: '1rem', backgroundColor: '#dcfce7', color: '#166534', borderRadius: '6px', marginBottom: '1.5rem', fontWeight: 'bold', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle2 size={18} /> Configuración de Tienda actualizada
          </div>
      )}

      {/* URL de la Tienda */}
      <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', border: '1px solid var(--pulpos-border)', marginBottom: '2rem' }}>
         <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShoppingBag size={20} color="var(--pulpos-primary)" /> Integración y Enlace
         </h2>
         <p style={{ color: 'var(--pulpos-text-muted)', marginBottom: '1rem' }}>Comparte tu enlace de ventas en tus redes sociales (Instagram, Facebook) para captar pedidos al instante.</p>
         
         <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '250px', padding: '1rem', backgroundColor: '#f8fafc', border: '1px solid var(--pulpos-border)', borderRadius: '8px', fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--pulpos-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
               <ExternalLink size={18} /> {storeUrl}
            </div>
            <button className="btn-secondary" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
               Copiar Enlace
            </button>
            <button className="btn-primary" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' }}>
               <QrCode size={18} /> Descargar QR para Mostrador
            </button>
         </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'revert', gap: '2rem' }}>
         
         {/* Configuracion de Pedidos */}
         <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', border: '1px solid var(--pulpos-border)' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Opciones de Recepción</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
               <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                    <MessageCircle size={18} color="#16a34a" /> Número de WhatsApp de Atención
                  </label>
                  <p style={{ fontSize: '0.85rem', color: 'var(--pulpos-text-muted)', marginBottom: '0.5rem' }}>A este número llegarán todos los carritos armados por tus clientes.</p>
                  <input 
                    type="tel" 
                    placeholder="Ej. 5512345678" 
                    value={whatsapp}
                    onChange={e => setWhatsapp(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--pulpos-border)' }}
                  />
               </div>

               <div style={{ borderTop: '1px solid var(--pulpos-border)', paddingTop: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                     <div>
                        <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                           <Store size={18} /> Recoger en Tienda (Pickup)
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--pulpos-text-muted)' }}>Permite a los clientes pasar a recoger su pedido.</div>
                     </div>
                     <input type="checkbox" checked={allowPickup} onChange={e => setAllowPickup(e.target.checked)} style={{ width: '20px', height: '20px' }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                     <div>
                        <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                           <ShoppingBag size={18} /> Envío a Domicilio
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--pulpos-text-muted)' }}>Permite solicitar envío a una dirección específica.</div>
                     </div>
                     <input type="checkbox" checked={allowDelivery} onChange={e => setAllowDelivery(e.target.checked)} style={{ width: '20px', height: '20px' }} />
                  </div>
               </div>
            </div>
         </div>

         {/* Personalización visual */}
         <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', border: '1px solid var(--pulpos-border)' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Apariencia del Catálogo</h2>
            
            <div>
               <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                 <PaintBucket size={18} color="var(--pulpos-primary)" /> Color Primario de la Tienda
               </label>
               <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '1rem' }}>
                  <input 
                    type="color" 
                    value={themeColor}
                    onChange={e => setThemeColor(e.target.value)}
                    style={{ width: '50px', height: '50px', padding: '0', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                  />
                  <div style={{ flex: 1, padding: '1rem', backgroundColor: themeColor, borderRadius: '8px', color: 'white', fontWeight: 'bold', textAlign: 'center', transition: 'background 0.3s' }}>
                     Botón de Ejemplo "Añadir al Carrito"
                  </div>
               </div>
            </div>

            <div style={{ marginTop: '2.5rem', borderTop: '1px solid var(--pulpos-border)', paddingTop: '1.5rem' }}>
                <button onClick={handleSave} disabled={isPending} className="btn-primary" style={{ width: '100%', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
                   <Save size={20} /> {isPending ? 'Guardando Ajustes...' : 'Guardar Configuración B2C'}
                </button>
            </div>
         </div>
         
      </div>

    </div>
  );
}
