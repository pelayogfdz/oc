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
              <th style={{ padding: '1rem', fontWeight: 'bold', color: '#64748b', fontSize: '0.85rem' }}>ID Doc</th>
              <th style={{ padding: '1rem', fontWeight: 'bold', color: '#64748b', fontSize: '0.85rem' }}>Motivo</th>
              <th style={{ padding: '1rem', fontWeight: 'bold', color: '#64748b', fontSize: '0.85rem' }}>Cant. Movimientos</th>
              <th style={{ padding: '1rem', fontWeight: 'bold', color: '#64748b', fontSize: '0.85rem' }}>Hecho Por</th>
            </tr>
          </thead>
          <tbody>
            {data.map((doc: any) => {
              return (
                <tr 
                  key={doc.id} 
                  onClick={() => setSelectedItem(doc)}
                  style={{ borderBottom: '1px solid var(--pulpos-border)', cursor: 'pointer', transition: 'background-color 0.2s' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <td style={{ padding: '1rem', fontSize: '0.9rem', color: '#475569' }}>
                    {new Date(doc.createdAt).toLocaleString()}
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.9rem', color: '#0f172a', fontWeight: '500' }}>
                    {doc.id.substring(0, 8)}...
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.9rem', color: '#334155' }}>
                    {doc.reason}
                  </td>
                  <td style={{ padding: '1rem', fontWeight: 'bold' }}>
                    <span style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '0.25rem', 
                      padding: '0.25rem 0.5rem', 
                      borderRadius: '12px', 
                      backgroundColor: '#e0f2fe', 
                      color: '#075985', 
                      fontSize: '0.85rem' 
                    }}>
                      {doc.movements?.length || 0} ítems ajustados
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                     <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#0f172a' }}>
                        {doc.user?.name || 'Sistema'}
                     </div>
                     <div style={{ fontSize: '0.75rem', color: 'var(--pulpos-text-muted)' }}>
                        {doc.user?.email || 'N/A'}
                     </div>
                  </td>
                </tr>
              )
            })}
            
            {data.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: '4rem', textAlign: 'center', color: 'var(--pulpos-text-muted)' }}>
                  <FileText size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                  La bitácora de ajustes agrupados está vacía o cargando ajustes huérfanos.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedItem && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold' }}>Detalle de Ajuste Agrupado</h3>
              <button onClick={() => setSelectedItem(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--pulpos-text-muted)' }} className="no-print">
                <X size={20} />
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--pulpos-text-muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>Folio de Ajuste</label>
                  <div style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#0f172a' }}>
                    {selectedItem.id}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--pulpos-text-muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>Fecha de Ajuste</label>
                  <div style={{ fontSize: '1rem', color: '#334155' }}>{new Date(selectedItem.createdAt).toLocaleString()}</div>
                </div>
              </div>

              <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid var(--pulpos-border)' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--pulpos-text-muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>Motivo Global</label>
                <div style={{ fontSize: '0.95rem', color: '#334155', marginTop: '0.25rem' }}>{selectedItem.reason}</div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--pulpos-text-muted)', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Artículos Modificados</label>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', border: '1px solid var(--pulpos-border)', borderRadius: '8px' }}>
                  <thead style={{ backgroundColor: '#f1f5f9' }}>
                    <tr>
                      <th style={{ padding: '0.5rem', borderBottom: '1px solid var(--pulpos-border)', fontSize: '0.85rem' }}>SKU</th>
                      <th style={{ padding: '0.5rem', borderBottom: '1px solid var(--pulpos-border)', fontSize: '0.85rem' }}>Producto</th>
                      <th style={{ padding: '0.5rem', borderBottom: '1px solid var(--pulpos-border)', fontSize: '0.85rem' }}>Motivo Ítem</th>
                      <th style={{ padding: '0.5rem', borderBottom: '1px solid var(--pulpos-border)', fontSize: '0.85rem' }}>Impacto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedItem.movements || []).map((mov: any) => {
                       const isPositive = mov.quantity > 0;
                       return (
                         <tr key={mov.id} style={{ borderBottom: '1px solid var(--pulpos-border)' }}>
                            <td style={{ padding: '0.5rem', fontSize: '0.85rem', color: '#475569' }}>{mov.product?.sku || '--'}</td>
                            <td style={{ padding: '0.5rem', fontSize: '0.85rem', fontWeight: '500' }}>{mov.product?.name || 'Error'}</td>
                            <td style={{ padding: '0.5rem', fontSize: '0.85rem', color: 'var(--pulpos-text-muted)' }}>{mov.reason}</td>
                            <td style={{ padding: '0.5rem', fontWeight: 'bold', color: isPositive ? '#166534' : '#991b1b', fontSize: '0.85rem' }}>
                              {isPositive ? '+' : ''}{mov.quantity}
                            </td>
                         </tr>
                       )
                    })}
                  </tbody>
                </table>
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

            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }} className="no-print">
              <button className="btn-secondary" onClick={() => {
                   const printContents = document.getElementById('printableArea')?.innerHTML;
                   const originalContents = document.body.innerHTML;
                   document.body.innerHTML = document.querySelector('.modal-printable')?.innerHTML || '<div style="padding: 2rem;">' + document.body.innerHTML + '</div>';
                   window.print();
                   window.location.reload();
                 }}
                 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #7dd3fc' }}
              >
                <FileText size={18} /> Imprimir Comprobante
              </button>
              
              <button className="btn-primary" onClick={() => setSelectedItem(null)}>
                Cerrar
              </button>
            </div>
            
            {/* Oculto, sólo para imprimir si hace falta inyectar algo extra */}
            <div className="modal-printable" style={{ display: 'none' }}>
                <div style={{ padding: '2rem', fontFamily: 'monospace' }}>
                   <h2>COMPROBANTE DE AJUSTE</h2>
                   <p>Folio: {selectedItem.id}</p>
                   <p>Fecha: {new Date(selectedItem.createdAt).toLocaleString()}</p>
                   <p>Motivo: {selectedItem.reason}</p>
                   <p>Usuario: {selectedItem.user?.name || 'Sistema'}</p>
                   <br/>
                   <table style={{width: '100%', textAlign: 'left', borderCollapse: 'collapse'}}>
                     <thead>
                       <tr>
                         <th style={{borderBottom: '1px solid black'}}>SKU</th>
                         <th style={{borderBottom: '1px solid black'}}>Producto</th>
                         <th style={{borderBottom: '1px solid black'}}>Motivo</th>
                         <th style={{borderBottom: '1px solid black'}}>Dif.</th>
                       </tr>
                     </thead>
                     <tbody>
                       {(selectedItem.movements || []).map((mov: any) => (
                           <tr key={mov.id}>
                               <td>{mov.product?.sku}</td>
                               <td>{mov.product?.name}</td>
                               <td>{mov.reason}</td>
                               <td>{mov.quantity > 0 ? '+'+mov.quantity : mov.quantity}</td>
                           </tr>
                       ))}
                     </tbody>
                   </table>
                </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
