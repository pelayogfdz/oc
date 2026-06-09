'use client';

import { useState } from 'react';
import { 
  Save, ExternalLink, QrCode, ShoppingBag, Store, MessageCircle, 
  PaintBucket, CheckCircle2, Key, Copy, Code2, Check, AlertCircle 
} from 'lucide-react';
import { updateAdvancedJSONConfig } from '@/app/actions/settings';

export default function CatalogoClient({ initialConfig }: { initialConfig: any }) {
  const [active, setActive] = useState(initialConfig?.active ?? true);
  const [whatsapp, setWhatsapp] = useState(initialConfig?.whatsapp || '');
  const [themeColor, setThemeColor] = useState(initialConfig?.themeColor || '#0ea5e9'); // default cyan CAANMA
  const [allowDelivery, setAllowDelivery] = useState(initialConfig?.allowDelivery ?? true);
  const [allowPickup, setAllowPickup] = useState(initialConfig?.allowPickup ?? true);
  
  // Custom API configuration state
  const [apiActive, setApiActive] = useState(initialConfig?.apiActive ?? false);
  const [apiToken, setApiToken] = useState(initialConfig?.apiToken || '');
  
  const [isPending, setIsPending] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [copiedText, setCopiedText] = useState('');

  // Mock domain for UI
  const storeUrl = `https://caanma.com/tienda/mi-sucursal`;
  
  // Base URL for API endpoints
  const apiBaseUrl = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}` : 'https://caanma.com';

  async function handleSave() {
    setIsPending(true);
    try {
      await updateAdvancedJSONConfig('catalogo_b2c', { 
        active, whatsapp, themeColor, allowDelivery, allowPickup,
        apiActive, apiToken 
      });
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsPending(false);
    }
  }

  function generateToken() {
    if (apiToken && !confirm('¿Estás seguro de generar un nuevo Token? El token anterior dejará de funcionar inmediatamente para tus integraciones externas.')) {
      return;
    }
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = 'caanma_tok_';
    for (let i = 0; i < 32; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setApiToken(token);
  }

  function handleCopy(text: string, type: string) {
    navigator.clipboard.writeText(text);
    setCopiedText(type);
    setTimeout(() => setCopiedText(''), 2000);
  }

  return (
    <div style={{ maxWidth: '950px', paddingBottom: '3rem' }}>
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
            <CheckCircle2 size={18} /> Configuración de Tienda y API actualizada
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
            <button 
              type="button"
              onClick={() => handleCopy(storeUrl, 'link')}
              className="btn-secondary" 
              style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
               {copiedText === 'link' ? <Check size={18} color="#16a34a" /> : <Copy size={18} />}
               {copiedText === 'link' ? 'Copiado' : 'Copiar Enlace'}
            </button>
            <button className="btn-primary" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' }}>
               <QrCode size={18} /> Descargar QR para Mostrador
            </button>
         </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
         
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
                  <div style={{ display: 'flex', alignItems: 'center', justifyBranch: 'space-between', justifyContent: 'space-between', marginBottom: '1rem' }}>
                     <div>
                        <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                           <Store size={18} /> Recoger en Tienda (Pickup)
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--pulpos-text-muted)' }}>Permite a los clientes pasar a recoger su pedido.</div>
                     </div>
                     <input type="checkbox" checked={allowPickup} onChange={e => setAllowPickup(e.target.checked)} style={{ width: '20px', height: '20px' }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyBranch: 'space-between', justifyContent: 'space-between' }}>
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

         {/* SECCIÓN NUEVA: Integración Personalizada por API */}
         <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', border: '1px solid var(--pulpos-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
               <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Code2 size={22} color="var(--pulpos-primary)" /> Integración Personalizada por API
               </h2>
               <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: apiActive ? '#166534' : 'var(--pulpos-text-muted)' }}>
                     {apiActive ? 'API Activa' : 'API Inactiva'}
                  </span>
                  <label style={{ position: 'relative', display: 'inline-block', width: '40px', height: '24px' }}>
                     <input type="checkbox" checked={apiActive} onChange={e => setApiActive(e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
                     <span style={{ 
                       position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, 
                       backgroundColor: apiActive ? '#10b981' : '#cbd5e1', 
                       transition: '.4s', borderRadius: '34px'
                     }}>
                       <span style={{
                         position: 'absolute', content: '""', height: '18px', width: '18px', left: '3px', bottom: '3px',
                         backgroundColor: 'white', transition: '.4s', borderRadius: '50%',
                         transform: apiActive ? 'translateX(16px)' : 'translateX(0)'
                       }}></span>
                     </span>
                  </label>
               </div>
            </div>
            
            <p style={{ color: 'var(--pulpos-text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
               Conecta tu propio sitio web personalizado, e-commerce externo (WooCommerce, Shopify) o sistemas ERP utilizando nuestra API pública. Te permite consultar inventarios y precios en tiempo real, así como descargar e importar ventas automáticamente.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
               <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                    <Key size={18} color="#f59e0b" /> Token de Autorización API
                  </label>
                  <p style={{ fontSize: '0.85rem', color: 'var(--pulpos-text-muted)', marginBottom: '0.75rem' }}>
                     Usa este token en tus peticiones HTTP en el encabezado <code>Authorization: Bearer &lt;Token&gt;</code>.
                  </p>
                  
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                     <input 
                       type="text" 
                       readOnly 
                       value={apiToken || 'No se ha generado ningún Token de API.'}
                       placeholder="Haz clic en Generar para crear un token de seguridad..."
                       style={{ flex: 1, padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--pulpos-border)', fontFamily: 'monospace', backgroundColor: '#f8fafc', color: apiToken ? '#334155' : '#94a3b8', fontSize: '0.9rem' }}
                     />
                     {apiToken && (
                        <button 
                          type="button"
                          onClick={() => handleCopy(apiToken, 'token')}
                          className="btn-secondary" 
                          style={{ padding: '0.75rem 1rem' }}
                        >
                           {copiedText === 'token' ? <Check size={16} color="#16a34a" /> : <Copy size={16} />}
                        </button>
                     )}
                     <button 
                       type="button" 
                       onClick={generateToken} 
                       className="btn-secondary" 
                       style={{ padding: '0.75rem 1.5rem', fontWeight: 'bold', borderColor: 'var(--pulpos-primary)', color: 'var(--pulpos-primary)' }}
                     >
                        {apiToken ? 'Generar Nuevo' : 'Generar Token'}
                     </button>
                  </div>
               </div>

               {apiActive && apiToken && (
                  <div style={{ borderTop: '1px solid var(--pulpos-border)', paddingTop: '1.5rem', marginTop: '0.5rem' }}>
                     <h4 style={{ fontWeight: 'bold', fontSize: '0.95rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        📖 Documentación Interactiva de la API
                     </h4>
                     
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', fontSize: '0.875rem' }}>
                        
                        {/* Endpoint 1 */}
                        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                           <div style={{ backgroundColor: '#f8fafc', padding: '0.75rem 1rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                              <span style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '0.2rem 0.6rem', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.75rem' }}>GET</span>
                              <strong style={{ fontFamily: 'monospace', color: '#0f172a' }}>/api/integrations/products</strong>
                              <span style={{ color: 'var(--pulpos-text-muted)', fontSize: '0.8rem', marginLeft: 'auto' }}>Consultar Inventario y Precios</span>
                           </div>
                           <div style={{ padding: '1rem', backgroundColor: '#fafafa' }}>
                              <p style={{ margin: '0 0 0.75rem 0', color: '#475569' }}>Devuelve el listado de productos activos de esta sucursal, con stock físico y precios.</p>
                              <div style={{ position: 'relative' }}>
                                 <pre style={{ backgroundColor: '#0f172a', color: '#f8fafc', padding: '1rem', borderRadius: '6px', overflowX: 'auto', margin: 0, fontSize: '0.8rem', fontFamily: 'monospace' }}>
{`curl -X GET "${apiBaseUrl}/api/integrations/products" \\
  -H "Authorization: Bearer ${apiToken}"`}
                                 </pre>
                                 <button type="button" onClick={() => handleCopy(`curl -X GET "${apiBaseUrl}/api/integrations/products" -H "Authorization: Bearer ${apiToken}"`, 'curl1')} style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '4px', padding: '0.25rem', cursor: 'pointer', color: 'white' }}>
                                    {copiedText === 'curl1' ? <Check size={14} color="#4ade80" /> : <Copy size={14} />}
                                 </button>
                              </div>
                           </div>
                        </div>

                        {/* Endpoint 2 */}
                        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                           <div style={{ backgroundColor: '#f8fafc', padding: '0.75rem 1rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                              <span style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '0.2rem 0.6rem', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.75rem' }}>GET</span>
                              <strong style={{ fontFamily: 'monospace', color: '#0f172a' }}>/api/integrations/sales</strong>
                              <span style={{ color: 'var(--pulpos-text-muted)', fontSize: '0.8rem', marginLeft: 'auto' }}>Descargar Historial de Ventas</span>
                           </div>
                           <div style={{ padding: '1rem', backgroundColor: '#fafafa' }}>
                              <p style={{ margin: '0 0 0.75rem 0', color: '#475569' }}>Descarga ventas registradas en esta sucursal. Parámetros opcionales: <code>limit</code> (ej: 50) y <code>since</code> (fecha ISO).</p>
                              <div style={{ position: 'relative' }}>
                                 <pre style={{ backgroundColor: '#0f172a', color: '#f8fafc', padding: '1rem', borderRadius: '6px', overflowX: 'auto', margin: 0, fontSize: '0.8rem', fontFamily: 'monospace' }}>
{`curl -X GET "${apiBaseUrl}/api/integrations/sales?limit=50" \\
  -H "Authorization: Bearer ${apiToken}"`}
                                 </pre>
                                 <button type="button" onClick={() => handleCopy(`curl -X GET "${apiBaseUrl}/api/integrations/sales?limit=50" -H "Authorization: Bearer ${apiToken}"`, 'curl2')} style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '4px', padding: '0.25rem', cursor: 'pointer', color: 'white' }}>
                                    {copiedText === 'curl2' ? <Check size={14} color="#4ade80" /> : <Copy size={14} />}
                                 </button>
                              </div>
                           </div>
                        </div>

                        {/* Endpoint 3 */}
                        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                           <div style={{ backgroundColor: '#f8fafc', padding: '0.75rem 1rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                              <span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '0.2rem 0.6rem', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.75rem' }}>POST</span>
                              <strong style={{ fontFamily: 'monospace', color: '#0f172a' }}>/api/integrations/sales</strong>
                              <span style={{ color: 'var(--pulpos-text-muted)', fontSize: '0.8rem', marginLeft: 'auto' }}>Importar Venta Externa</span>
                           </div>
                           <div style={{ padding: '1rem', backgroundColor: '#fafafa' }}>
                              <p style={{ margin: '0 0 0.75rem 0', color: '#475569' }}>Crea y descuenta stock automáticamente de una venta externa (WooCommerce, Shopify) mapeada por SKU de producto.</p>
                              
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                                 <div style={{ position: 'relative' }}>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', marginBottom: '0.25rem' }}>Petición HTTP:</div>
                                    <pre style={{ backgroundColor: '#0f172a', color: '#f8fafc', padding: '0.75rem', borderRadius: '6px', overflowX: 'auto', margin: 0, fontSize: '0.75rem', fontFamily: 'monospace', height: '170px' }}>
{`curl -X POST "${apiBaseUrl}/api/integrations/sales" \\
  -H "Authorization: Bearer ${apiToken}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "paymentMethod": "CARD",
    "notes": "Pedido #12345 de WooCommerce",
    "customer": {
      "name": "Juan Pérez",
      "email": "juan@example.com",
      "phone": "5512345678"
    },
    "items": [
      { "sku": "BMBM50", "quantity": 1, "price": 450.00 }
    ]
  }'`}
                                    </pre>
                                    <button type="button" onClick={() => handleCopy(`curl -X POST "${apiBaseUrl}/api/integrations/sales" -H "Authorization: Bearer ${apiToken}" -H "Content-Type: application/json" -d '{\n  "paymentMethod": "CARD",\n  "notes": "Pedido #12345 de WooCommerce",\n  "customer": {\n    "name": "Juan Pérez",\n    "email": "juan@example.com",\n    "phone": "5512345678"\n  },\n  "items": [\n    { "sku": "BMBM50", "quantity": 1, "price": 450.00 }\n  ]\n}'`, 'curl3')} style={{ position: 'absolute', top: '1.75rem', right: '0.5rem', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '4px', padding: '0.25rem', cursor: 'pointer', color: 'white' }}>
                                       {copiedText === 'curl3' ? <Check size={14} color="#4ade80" /> : <Copy size={14} />}
                                    </button>
                                 </div>
                                 <div>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', marginBottom: '0.25rem' }}>Estructura del JSON:</div>
                                    <ul style={{ margin: 0, paddingLeft: '1.2rem', color: '#475569', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                       <li><code>paymentMethod</code>: "CASH", "CARD", "TRANSFER" o "CREDIT" (por defecto "CARD").</li>
                                       <li><code>notes</code>: Descripción u observaciones de auditoría.</li>
                                       <li><code>customer</code> (opcional): Datos de cliente para enlace automático.</li>
                                       <li><code>items</code> (requerido): Arreglo de artículos con <code>sku</code>, <code>quantity</code> (entero), y <code>price</code> (float).</li>
                                    </ul>
                                 </div>
                              </div>
                           </div>
                        </div>

                     </div>
                  </div>
               )}
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
                <button onClick={handleSave} disabled={isPending} className="btn-primary" style={{ width: '100%', padding: '1rem', display: 'flex', alignItems: 'center', justifyBranch: 'space-between', justifyContent: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
                   <Save size={20} /> {isPending ? 'Guardando Ajustes...' : 'Guardar Configuración B2C'}
                </button>
            </div>
         </div>
         
      </div>

    </div>
  );
}
