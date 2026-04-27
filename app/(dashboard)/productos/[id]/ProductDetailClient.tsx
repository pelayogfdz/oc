'use client';

import { useState, useTransition } from 'react';
import { adjustInventory } from '@/app/actions/inventory';
import { createVariant, deleteVariant } from '@/app/actions/variant';
import { Truck } from 'lucide-react';

// ProductDetailClient handles the tab navigation state
export function ProductDetailClient({ 
  product, 
  movements, 
  sales,
  variants,
  siblingProducts,
  mediaContent,
  children
}: { 
  product: any, 
  movements: any[], 
  sales: any[],
  variants?: any[],
  siblingProducts?: any[],
  mediaContent?: React.ReactNode,
  children: React.ReactNode
}) {
  const [activeTab, setActiveTab] = useState('details');
  const [showAdjustForm, setShowAdjustForm] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleAdjustmentSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.append('productId', product.id);
    
    startTransition(async () => {
      try {
        await adjustInventory(formData);
        setShowAdjustForm(false);
      } catch(err) {
        alert(String(err));
      }
    });
  };

  return (
    <>
      <div style={{ display: 'flex', gap: '2rem', borderBottom: '1px solid var(--pulpos-border)', marginBottom: '1.5rem' }}>
        <button 
          onClick={() => setActiveTab('details')}
          style={{ 
            padding: '0.75rem 0', 
            background: 'none', 
            border: 'none', 
            borderBottom: activeTab === 'details' ? '2px solid var(--pulpos-primary)' : '2px solid transparent',
            color: activeTab === 'details' ? 'var(--pulpos-primary)' : 'var(--pulpos-text)',
            fontWeight: activeTab === 'details' ? 'bold' : 'normal',
            cursor: 'pointer',
            fontSize: '1rem'
          }}
        >
          Editar Detalles
        </button>
        <button 
          onClick={() => setActiveTab('kardex')}
          style={{ 
            padding: '0.75rem 0', 
            background: 'none', 
            border: 'none', 
            borderBottom: activeTab === 'kardex' ? '2px solid var(--pulpos-primary)' : '2px solid transparent',
            color: activeTab === 'kardex' ? 'var(--pulpos-primary)' : 'var(--pulpos-text)',
            fontWeight: activeTab === 'kardex' ? 'bold' : 'normal',
            cursor: 'pointer',
            fontSize: '1rem'
          }}
        >
          Movimientos (Kardex)
        </button>
        <button 
          onClick={() => setActiveTab('media')}
          style={{ 
            padding: '0.75rem 0', 
            background: 'none', 
            border: 'none', 
            borderBottom: activeTab === 'media' ? '2px solid var(--pulpos-primary)' : '2px solid transparent',
            color: activeTab === 'media' ? 'var(--pulpos-primary)' : 'var(--pulpos-text)',
            fontWeight: activeTab === 'media' ? 'bold' : 'normal',
            cursor: 'pointer',
            fontSize: '1rem'
          }}
        >
          Multimedia y Videos
        </button>
        <button 
          onClick={() => setActiveTab('sales')}
          style={{ 
            padding: '0.75rem 0', 
            background: 'none', 
            border: 'none', 
            borderBottom: activeTab === 'sales' ? '2px solid var(--pulpos-primary)' : '2px solid transparent',
            color: activeTab === 'sales' ? 'var(--pulpos-primary)' : 'var(--pulpos-text)',
            fontWeight: activeTab === 'sales' ? 'bold' : 'normal',
            cursor: 'pointer',
            fontSize: '1rem'
          }}
        >
          Historial de Ventas
        </button>
        <button 
          onClick={() => setActiveTab('variants')}
          style={{ 
            padding: '0.75rem 0', 
            background: 'none', 
            border: 'none', 
            borderBottom: activeTab === 'variants' ? '2px solid var(--pulpos-primary)' : '2px solid transparent',
            color: activeTab === 'variants' ? 'var(--pulpos-primary)' : 'var(--pulpos-text)',
            fontWeight: activeTab === 'variants' ? 'bold' : 'normal',
            cursor: 'pointer',
            fontSize: '1rem'
          }}
        >
          Variantes (Tallas)
        </button>
        <button 
          onClick={() => setActiveTab('omnichannel')}
          style={{ 
            padding: '0.75rem 0', 
            background: 'none', 
            border: 'none', 
            borderBottom: activeTab === 'omnichannel' ? '2px solid var(--pulpos-primary)' : '2px solid transparent',
            color: activeTab === 'omnichannel' ? 'var(--pulpos-primary)' : 'var(--pulpos-text)',
            fontWeight: activeTab === 'omnichannel' ? 'bold' : 'normal',
            cursor: 'pointer',
            fontSize: '1rem'
          }}
        >
          Existencias por Sucursal
        </button>
      </div>

      {activeTab === 'details' && (
        <div>{children}</div>
      )}

      {activeTab === 'media' && mediaContent && (
        <div>{mediaContent}</div>
      )}

      {activeTab === 'kardex' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem' }}>Movimientos Recientes</h2>
            <button onClick={() => setShowAdjustForm(!showAdjustForm)} className="btn-primary" style={{ padding: '0.5rem 1rem' }}>
              {showAdjustForm ? 'Cancelar Ajuste' : '+ Nuevo Ajuste'}
            </button>
          </div>
          
          {showAdjustForm && (
            <form onSubmit={handleAdjustmentSubmit} style={{ padding: '1.5rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid var(--pulpos-border)', marginBottom: '1.5rem', display: 'grid', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr) minmax(0,2fr)', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Tipo</label>
                  <select name="type" required style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }}>
                    <option value="IN">Entrada (+)</option>
                    <option value="OUT">Salida (-)</option>
                    <option value="ADJUSTMENT">Ajuste / Merma (-)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Cantidad</label>
                  <input type="number" name="quantity" required min="1" style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Motivo</label>
                  <input type="text" name="reason" required placeholder="Ej. Inventario físico..." style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" disabled={isPending} className="btn-primary" style={{ padding: '0.75rem 2rem' }}>
                  {isPending ? 'Guardando...' : 'Aplicar Ajuste'}
                </button>
              </div>
            </form>
          )}

          <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--pulpos-border)', backgroundColor: '#f9fafb' }}>
                <th style={{ padding: '1rem', color: 'var(--pulpos-text-muted)', fontWeight: '500' }}>Fecha</th>
                <th style={{ padding: '1rem', color: 'var(--pulpos-text-muted)', fontWeight: '500' }}>Tipo</th>
                <th style={{ padding: '1rem', color: 'var(--pulpos-text-muted)', fontWeight: '500' }}>Motivo</th>
                <th style={{ padding: '1rem', color: 'var(--pulpos-text-muted)', fontWeight: '500', textAlign: 'right' }}>Cantidad</th>
              </tr>
            </thead>
            <tbody>
              {movements.map(mov => (
                <tr key={mov.id} style={{ borderBottom: '1px solid var(--pulpos-border)' }}>
                  <td data-label="Fecha" style={{ padding: '1rem' }}>{new Date(mov.createdAt).toLocaleString()}</td>
                  <td data-label="Tipo" style={{ padding: '1rem' }}>
                    <span style={{ 
                      padding: '0.25rem 0.5rem', 
                      borderRadius: '12px', 
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      backgroundColor: mov.type === 'IN' ? '#dcfce7' : mov.type === 'OUT' ? '#fee2e2' : '#f1f5f9',
                      color: mov.type === 'IN' ? '#166534' : mov.type === 'OUT' ? '#991b1b' : '#334155'
                    }}>
                      {mov.type}
                    </span>
                  </td>
                  <td data-label="Motivo" style={{ padding: '1rem' }}>{mov.reason}</td>
                  <td data-label="Cantidad" style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold', color: mov.quantity > 0 ? '#16a34a' : '#dc2626' }}>
                    {mov.quantity > 0 ? '+' : ''}{mov.quantity}
                  </td>
                </tr>
              ))}
              {movements.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: 'var(--pulpos-text-muted)' }}>
                    No hay movimientos registrados para este artículo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'sales' && (
        <div className="card">
          <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--pulpos-border)', backgroundColor: '#f9fafb' }}>
                <th style={{ padding: '1rem', color: 'var(--pulpos-text-muted)', fontWeight: '500' }}>Venta N° (ID)</th>
                <th style={{ padding: '1rem', color: 'var(--pulpos-text-muted)', fontWeight: '500', textAlign: 'center' }}>Unidades Vendidas</th>
                <th style={{ padding: '1rem', color: 'var(--pulpos-text-muted)', fontWeight: '500', textAlign: 'right' }}>Subtotal Generado</th>
              </tr>
            </thead>
            <tbody>
              {sales.map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid var(--pulpos-border)' }}>
                  <td data-label="Venta N° (ID)" style={{ padding: '1rem', fontFamily: 'monospace' }}>{s.saleId.slice(0, 8)}...</td>
                  <td data-label="Unidades Vendidas" style={{ padding: '1rem', textAlign: 'center', fontWeight: 'bold' }}>{s.quantity}</td>
                  <td data-label="Subtotal Generado" style={{ padding: '1rem', textAlign: 'right' }}>${(s.quantity * s.price).toFixed(2)}</td>
                </tr>
              ))}
              {sales.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ padding: '2rem', textAlign: 'center', color: 'var(--pulpos-text-muted)' }}>
                    Este producto no tiene ventas históricas registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'variants' && (
        <div className="card" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', fontWeight: 'bold' }}>Multi-Variantes del Producto</h2>
          <p style={{ color: 'var(--pulpos-text-muted)', marginBottom: '2rem', fontSize: '0.875rem' }}>Agrega tallas, colores o características especiales sin crear un producto nuevo.</p>
          
          <form action={createVariant} style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
             <input type="hidden" name="productId" value={product.id} />
             <input type="text" name="attribute" placeholder="Ej. Talla M - Color Rojo" required style={{ flex: 1, padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }} />
             <input type="text" name="sku" placeholder="SKU Variante (Opcional)" style={{ width: '200px', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }} />
             <button type="submit" className="btn-primary" style={{ padding: '0 2rem' }}>+ Agregar</button>
          </form>

          <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
             <thead>
               <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid var(--pulpos-border)' }}>
                 <th style={{ padding: '1rem', color: 'var(--pulpos-text-muted)' }}>Atributo</th>
                 <th style={{ padding: '1rem', color: 'var(--pulpos-text-muted)' }}>SKU Propio</th>
                 <th style={{ padding: '1rem', color: 'var(--pulpos-text-muted)', textAlign: 'center' }}>Acciones</th>
               </tr>
             </thead>
             <tbody>
               {variants?.map(v => (
                 <tr key={v.id} style={{ borderBottom: '1px solid var(--pulpos-border)' }}>
                   <td data-label="Atributo" style={{ padding: '1rem', fontWeight: 'bold' }}>{v.attribute}</td>
                   <td data-label="SKU Propio" style={{ padding: '1rem' }}>{v.sku || '-'}</td>
                   <td data-label="Acciones" style={{ padding: '1rem', textAlign: 'center' }}>
                     <form action={deleteVariant} style={{ display: 'inline' }}>
                        <input type="hidden" name="variantId" value={v.id} />
                        <input type="hidden" name="productId" value={product.id} />
                        <button type="submit" style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold' }}>Eliminar</button>
                     </form>
                   </td>
                 </tr>
               ))}
               {!variants || variants.length === 0 && (
                 <tr>
                   <td colSpan={3} style={{ padding: '2rem', textAlign: 'center', color: 'var(--pulpos-text-muted)' }}>No hay variantes registradas.</td>
                 </tr>
               )}
             </tbody>
          </table>
        </div>
      )}

      {activeTab === 'omnichannel' && siblingProducts && (
        <div className="card" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', fontWeight: 'bold' }}>Inventario Transversal (Red de Sucursales)</h2>
          <p style={{ color: 'var(--pulpos-text-muted)', marginBottom: '2rem', fontSize: '0.875rem' }}>Visualiza la existencia de este mismo artículo (por SKU) a lo largo de toda tu empresa matriz para facilitar traspasos o redireccionar ventas.</p>
          
          <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
             <thead>
               <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid var(--pulpos-border)' }}>
                 <th style={{ padding: '1rem', color: 'var(--pulpos-text-muted)', width: '60%' }}>Sucursal / Almacén</th>
                 <th style={{ padding: '1rem', color: 'var(--pulpos-text-muted)', textAlign: 'right' }}>Estado del Producto</th>
                 <th style={{ padding: '1rem', color: 'var(--pulpos-text-muted)', textAlign: 'center' }}>Stock Disponible</th>
               </tr>
             </thead>
             <tbody>
               {siblingProducts.map(sp => (
                 <tr key={sp.id} style={{ borderBottom: '1px solid var(--pulpos-border)', backgroundColor: sp.id === product.id ? '#f0fdf4' : 'transparent' }}>
                   <td data-label="Sucursal / Almacén" style={{ padding: '1rem' }}>
                     <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                       {sp.branch?.name || 'Desconocida'}
                       {sp.id === product.id && <span style={{ fontSize: '0.65rem', backgroundColor: '#22c55e', color: 'white', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>ACTUAL</span>}
                     </div>
                     <div style={{ fontSize: '0.75rem', color: 'var(--pulpos-text-muted)' }}>{sp.branch?.location || '-'}</div>
                   </td>
                   <td data-label="Estado del Producto" style={{ padding: '1rem', textAlign: 'right' }}>
                     {sp.isActive ? (
                       <span style={{ fontSize: '0.75rem', fontWeight: 'bold', padding: '0.25rem 0.5rem', backgroundColor: '#dcfce7', color: '#166534', borderRadius: '12px' }}>Activo</span>
                     ) : (
                       <span style={{ fontSize: '0.75rem', fontWeight: 'bold', padding: '0.25rem 0.5rem', backgroundColor: '#f1f5f9', color: '#475569', borderRadius: '12px' }}>Inactivo</span>
                     )}
                   </td>
                   <td data-label="Stock Disponible" style={{ padding: '1rem', textAlign: 'center', fontWeight: 'bold', fontSize: '1.1rem', color: sp.stock > 0 ? '#1e293b' : '#ef4444' }}>
                     {sp.stock} <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--pulpos-text-muted)' }}>{sp.unit}</span>
                   </td>
                 </tr>
               ))}
             </tbody>
          </table>
          <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid var(--pulpos-border)', marginTop: '2rem' }}>
            <h3 style={{ fontWeight: 'bold', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Truck size={18} color="var(--pulpos-primary)" />
              Sugerencia de Abastecimiento
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--pulpos-text-muted)' }}>
              Para nivelar inventarios, visita el módulo de <a href={`/productos/traspasos`} style={{ color: 'var(--pulpos-primary)', fontWeight: 'bold' }}>Traspasos</a> e ingresa el SKU {product.sku}.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
