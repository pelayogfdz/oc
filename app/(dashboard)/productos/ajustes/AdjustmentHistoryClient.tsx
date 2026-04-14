'use client';

import { useState } from 'react';
import { Package, ArrowUpRight, ArrowDownRight, FileText, X } from 'lucide-react';

export default function AdjustmentHistoryClient({ data }: { data: any[] }) {
  const [selectedItem, setSelectedItem] = useState<any>(null);

  return (
    <>
      <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid var(--pulpos-border)', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--pulpos-border)' }}>
            <tr>
              <th style={{ padding: '1rem', fontWeight: 'bold', color: '#64748b', fontSize: '0.85rem' }}>Fecha</th>
              <th style={{ padding: '1rem', fontWeight: 'bold', color: '#64748b', fontSize: '0.85rem' }}>Producto</th>
              <th style={{ padding: '1rem', fontWeight: 'bold', color: '#64748b', fontSize: '0.85rem' }}>Impacto</th>
              <th style={{ padding: '1rem', fontWeight: 'bold', color: '#64748b', fontSize: '0.85rem' }}>Motivo</th>
              <th style={{ padding: '1rem', fontWeight: 'bold', color: '#64748b', fontSize: '0.85rem' }}>Hecho Por</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item: any) => {
              const isPositive = item.quantity > 0;
              return (
                <tr 
                  key={item.id} 
                  onClick={() => setSelectedItem(item)}
                  style={{ borderBottom: '1px solid var(--pulpos-border)', cursor: 'pointer', transition: 'background-color 0.2s' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <td style={{ padding: '1rem', fontSize: '0.9rem', color: '#475569' }}>
                    {new Date(item.createdAt).toLocaleString()}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: '32px', height: '32px', backgroundColor: '#f1f5f9', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                         <Package size={16} color="#94a3b8" />
                      </div>
                      <div>
                        <div style={{ fontWeight: 'bold', color: '#0f172a' }}>{item.product?.name || 'Stock'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--pulpos-text-muted)' }}>SKU: {item.product?.sku}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '1rem', fontWeight: 'bold' }}>
                    <span style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '0.25rem', 
                      padding: '0.25rem 0.5rem', 
                      borderRadius: '12px', 
                      backgroundColor: isPositive ? '#dcfce7' : '#fee2e2', 
                      color: isPositive ? '#166534' : '#991b1b', 
                      fontSize: '0.85rem' 
                    }}>
                      {isPositive ? <ArrowUpRight size={14}/> : <ArrowDownRight size={14}/>}
                      {isPositive ? '+' : ''}{item.quantity}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.9rem', color: '#334155' }}>
                    {item.reason}
                  </td>
                  <td style={{ padding: '1rem' }}>
                     <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#0f172a' }}>
                        {item.user?.name || 'Sistema'}
                     </div>
                     <div style={{ fontSize: '0.75rem', color: 'var(--pulpos-text-muted)' }}>
                        {item.user?.email || 'N/A'}
                     </div>
                  </td>
                </tr>
              )
            })}
            
            {data.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: '4rem', textAlign: 'center', color: 'var(--pulpos-text-muted)' }}>
                  <FileText size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                  La bitácora de ajustes manuales está vacía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedItem && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '500px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold' }}>Detalle de Ajuste</h3>
              <button onClick={() => setSelectedItem(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--pulpos-text-muted)' }}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--pulpos-text-muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>Producto</label>
                <div style={{ fontSize: '1rem', fontWeight: '500', color: '#0f172a' }}>{selectedItem.product?.name} ({selectedItem.product?.sku})</div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--pulpos-text-muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>Impacto en Stock</label>
                  <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: selectedItem.quantity > 0 ? '#166534' : '#991b1b' }}>
                    {selectedItem.quantity > 0 ? '+' : ''}{selectedItem.quantity} unidades
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--pulpos-text-muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>Fecha de Ajuste</label>
                  <div style={{ fontSize: '1rem', color: '#334155' }}>{new Date(selectedItem.createdAt).toLocaleString()}</div>
                </div>
              </div>

              <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid var(--pulpos-border)' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--pulpos-text-muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>Motivo</label>
                <div style={{ fontSize: '0.95rem', color: '#334155', marginTop: '0.25rem' }}>{selectedItem.reason}</div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--pulpos-text-muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>Usuario Responsable</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <div style={{ width: '32px', height: '32px', backgroundColor: '#e2e8f0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontWeight: 'bold', fontSize: '0.85rem' }}>
                    {selectedItem.user?.name?.charAt(0) || 'S'}
                  </div>
                  <div>
                    <div style={{ fontWeight: '500', color: '#0f172a' }}>{selectedItem.user?.name || 'Sistema'}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--pulpos-text-muted)' }}>{selectedItem.user?.email || 'N/A'}</div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setSelectedItem(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
