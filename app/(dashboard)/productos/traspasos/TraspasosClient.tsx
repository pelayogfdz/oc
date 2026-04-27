'use client';

import { useState } from 'react';
import { Truck, Search, LayoutGrid, List, FileText, ArrowRight, MoreVertical } from 'lucide-react';
import Link from 'next/link';

export default function TraspasosClient({ initialTransfers, currentBranchId }: { initialTransfers: any[], currentBranchId: string }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  const filteredTransfers = initialTransfers.filter(transfer => {
    const term = searchTerm.toLowerCase();
    const idMatch = transfer.id.toLowerCase().includes(term);
    const branchNameMatch = (transfer.branch?.name || '').toLowerCase().includes(term);
    const toBranchNameMatch = (transfer.toBranch?.name || '').toLowerCase().includes(term);
    return idMatch || branchNameMatch || toBranchNameMatch;
  });

  return (
    <div style={{ fontFamily: 'var(--font-geist-sans)' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', maxWidth: '600px', position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', color: 'var(--pulpos-text-muted)' }} />
          <input 
            type="text" 
            placeholder="🔍 Buscar traspaso por ID o sucursal..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ padding: '0.8rem 1.5rem 0.8rem 2.5rem', width: '100%', borderRadius: '999px', border: '1px solid var(--pulpos-border)', backgroundColor: 'white', fontSize: '1rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', backgroundColor: '#f1f5f9', padding: '0.25rem', borderRadius: '8px' }}>
          <button 
            onClick={() => setViewMode('grid')}
            style={{ padding: '0.5rem', borderRadius: '6px', border: 'none', cursor: 'pointer', backgroundColor: viewMode === 'grid' ? 'white' : 'transparent', color: viewMode === 'grid' ? 'var(--pulpos-primary)' : 'var(--pulpos-text-muted)', boxShadow: viewMode === 'grid' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
          >
            <LayoutGrid size={20} />
          </button>
          <button 
            onClick={() => setViewMode('list')}
            style={{ padding: '0.5rem', borderRadius: '6px', border: 'none', cursor: 'pointer', backgroundColor: viewMode === 'list' ? 'white' : 'transparent', color: viewMode === 'list' ? 'var(--pulpos-primary)' : 'var(--pulpos-text-muted)', boxShadow: viewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
          >
            <List size={20} />
          </button>
        </div>
      </div>

      {filteredTransfers.length === 0 ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--pulpos-text-muted)', backgroundColor: 'white', borderRadius: '12px', border: '1px dashed var(--pulpos-border)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <FileText size={64} color="#e2e8f0" />
            <p style={{ fontSize: '1.2rem', fontWeight: '500' }}>No se encontraron traspasos de inventario.</p>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {filteredTransfers.map(item => {
            const isIncoming = item.toBranchId === currentBranchId;

            return (
              <div key={item.id} style={{ 
                backgroundColor: 'white', 
                borderRadius: '16px', 
                border: '1px solid var(--pulpos-border)', 
                overflow: 'hidden',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                transition: 'transform 0.2s, box-shadow 0.2s',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column'
              }}
              onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.1)'; }}
              onMouseOut={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.05)'; }}
              >
                <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--pulpos-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                     <div style={{ fontSize: '0.85rem', color: 'var(--pulpos-text-muted)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                       <Truck size={14} /> #{item.id.substring(0,8).toUpperCase()}
                     </div>
                     <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '4px', backgroundColor: isIncoming ? '#e0e7ff' : '#f1f5f9', color: isIncoming ? '#4338ca' : '#475569', fontWeight: 'bold' }}>
                          {isIncoming ? 'ENTRANTE' : 'SALIENTE'}
                        </span>
                        <span style={{ 
                          fontSize: '0.7rem', 
                          padding: '0.2rem 0.5rem', 
                          borderRadius: '4px', 
                          backgroundColor: item.status === 'COMPLETED' ? '#dcfce7' : item.status === 'IN_TRANSIT' ? '#fef9c3' : '#f1f5f9', 
                          color: item.status === 'COMPLETED' ? '#166534' : item.status === 'IN_TRANSIT' ? '#854d0e' : '#475569', 
                          fontWeight: 'bold' 
                        }}>
                          {item.status === 'COMPLETED' ? 'COMPLETADO' : item.status === 'IN_TRANSIT' ? 'EN TRÁNSITO' : item.status}
                        </span>
                     </div>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <button 
                      onClick={() => setOpenDropdownId(openDropdownId === item.id ? null : item.id)}
                      style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--pulpos-text-muted)' }}
                    >
                      <MoreVertical size={20} />
                    </button>
                    {openDropdownId === item.id && (
                      <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: '0.5rem', backgroundColor: 'white', border: '1px solid var(--pulpos-border)', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 20, width: '150px', overflow: 'hidden' }}>
                        <Link href={`/productos/traspasos/${item.id}`} style={{ display: 'block', padding: '0.75rem 1rem', textDecoration: 'none', color: 'var(--pulpos-text)', fontSize: '0.9rem', borderBottom: '1px solid var(--pulpos-border)' }}>Ver Detalle</Link>
                        <Link href={`/productos/traspasos/${item.id}/imprimir`} target="_blank" style={{ display: 'block', padding: '0.75rem 1rem', textDecoration: 'none', color: 'var(--pulpos-primary)', fontSize: '0.9rem' }}>Imprimir</Link>
                      </div>
                    )}
                  </div>
                </div>
                
                <div style={{ padding: '1.25rem', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                     <div style={{ textAlign: 'center', flex: 1 }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--pulpos-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Origen</div>
                        <div style={{ fontWeight: 'bold', color: '#0f172a', fontSize: '0.9rem' }}>{item.branch?.name || 'Central'}</div>
                     </div>
                     <ArrowRight size={16} color="var(--pulpos-text-muted)" style={{ margin: '0 0.5rem' }} />
                     <div style={{ textAlign: 'center', flex: 1 }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--pulpos-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Destino</div>
                        <div style={{ fontWeight: 'bold', color: '#0f172a', fontSize: '0.9rem' }}>{item.toBranch?.name || 'N/A'}</div>
                     </div>
                  </div>

                  <div style={{ fontSize: '0.85rem', color: 'var(--pulpos-text-muted)' }}>
                    <div style={{ marginBottom: '0.2rem' }}>Creado: {new Date(item.createdAt).toLocaleString()}</div>
                    {item.createdBy && <div>Enviado por: <strong>{item.createdBy.name}</strong></div>}
                    {item.receivedBy && <div>Recibido por: <strong>{item.receivedBy.name}</strong></div>}
                  </div>
                </div>
                
                <div style={{ padding: '1rem 1.25rem', backgroundColor: '#f8fafc', borderTop: '1px solid var(--pulpos-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Link href={`/productos/traspasos/${item.id}`} style={{ color: 'var(--pulpos-primary)', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 'bold' }}>
                    Ver Detalle &rarr;
                  </Link>
                  {isIncoming && item.status === 'IN_TRANSIT' && (
                     <button onClick={async () => { const t = await import('@/app/actions/transfer'); await t.receiveTransfer(item.id); window.location.reload(); }} style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '0.4rem 1rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}>
                       Recibir
                     </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: '#f8fafc' }}>
              <tr>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Traspaso ID</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Ruta (Origen → Destino)</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Información</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Estado</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)', textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransfers.map(item => {
                const isIncoming = item.toBranchId === currentBranchId;
                
                return (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--pulpos-border)' }}>
                  <td data-label="Traspaso ID" style={{ padding: '1rem', fontWeight: '500' }}>
                    <div style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>#{item.id.substring(0,8).toUpperCase()}</div>
                    <span style={{ fontSize: '10px', padding: '2px 4px', borderRadius: '4px', display: 'inline-block', backgroundColor: isIncoming ? '#e0e7ff' : '#f1f5f9', color: isIncoming ? '#4338ca' : '#475569', marginTop: '4px' }}>
                       {isIncoming ? 'ENTRANTE' : 'SALIENTE'}
                    </span>
                  </td>
                  <td data-label="Ruta (Origen → Destino)" style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: 'bold', color: '#0f172a' }}>{item.branch?.name || 'Central'}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                      <ArrowRight size={12} /> {item.toBranch?.name || 'N/A'}
                    </div>
                  </td>
                  <td data-label="Información" style={{ padding: '1rem', color: 'var(--pulpos-text-muted)', fontSize: '0.9rem' }}>
                    <div style={{ marginBottom: '0.2rem' }}>{new Date(item.createdAt).toLocaleString()}</div>
                    {item.createdBy && <div><span style={{fontWeight: 500}}>Enviado por:</span> {item.createdBy.name}</div>}
                    {item.receivedBy && <div><span style={{fontWeight: 500}}>Recibido por:</span> {item.receivedBy.name}</div>}
                  </td>
                  <td data-label="Estado" style={{ padding: '1rem' }}>
                    <span style={{ 
                      backgroundColor: item.status === 'COMPLETED' ? '#dcfce7' : item.status === 'IN_TRANSIT' ? '#fef9c3' : '#f1f5f9', 
                      color: item.status === 'COMPLETED' ? '#166534' : item.status === 'IN_TRANSIT' ? '#854d0e' : '#475569', 
                      padding: '0.2rem 0.5rem', 
                      borderRadius: '4px', 
                      fontSize: '0.75rem', 
                      fontWeight: 'bold' 
                    }}>
                      {item.status === 'COMPLETED' ? 'COMPLETADO' : item.status === 'IN_TRANSIT' ? 'EN TRÁNSITO' : item.status}
                    </span>
                  </td>
                    <td data-label="Acciones" style={{ padding: '1rem', display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      <Link href={`/productos/traspasos/${item.id}/imprimir`} target="_blank" style={{ backgroundColor: 'white', color: 'var(--pulpos-primary)', border: '1px solid var(--pulpos-primary)', padding: '0.4rem 0.75rem', borderRadius: '4px', cursor: 'pointer', fontWeight: '500', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}>
                         Imprimir
                      </Link>
                      <Link href={`/productos/traspasos/${item.id}`} style={{ backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '0.4rem 0.75rem', borderRadius: '4px', cursor: 'pointer', fontWeight: '500', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}>
                         Ver Detalle
                      </Link>
                      {isIncoming && item.status === 'IN_TRANSIT' && (
                         <button onClick={async () => { const t = await import('@/app/actions/transfer'); await t.receiveTransfer(item.id); window.location.reload(); }} style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '0.4rem 0.75rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}>
                           Recibir
                         </button>
                      )}
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
