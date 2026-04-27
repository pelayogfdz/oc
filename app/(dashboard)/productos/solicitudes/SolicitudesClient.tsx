'use client';

import { useState } from 'react';
import { Search, Package, Calendar, User, Store, Trash2, CheckCircle2, Clock } from 'lucide-react';
import { deletePurchaseRequest } from '@/app/actions/purchaseRequest';

export default function SolicitudesClient({ initialRequests }: { initialRequests: any[] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'ORDERED'>('PENDING');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const filteredRequests = initialRequests.filter(req => {
    if (filterStatus !== 'ALL' && req.status !== filterStatus) return false;
    
    const term = searchTerm.toLowerCase();
    const productName = req.product?.name || req.preProductName || '';
    const userName = req.requestedBy?.name || '';
    
    return productName.toLowerCase().includes(term) || userName.toLowerCase().includes(term);
  });

  const handleDelete = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar esta solicitud?')) return;
    setIsDeleting(id);
    try {
      await deletePurchaseRequest(id);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div className="card" style={{ padding: 0, overflowX: 'auto', fontFamily: 'var(--font-geist-sans)' }}>
      {/* Toolbar */}
      <div style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', borderBottom: '1px solid var(--pulpos-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', maxWidth: '400px', position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', color: 'var(--pulpos-text-muted)' }} />
          <input 
            type="text" 
            placeholder="🔍 Buscar producto o usuario..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ padding: '0.6rem 1.5rem 0.6rem 2.5rem', width: '100%', borderRadius: '8px', border: '1px solid var(--pulpos-border)' }}
          />
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem', backgroundColor: '#f1f5f9', padding: '0.25rem', borderRadius: '8px' }}>
          <button 
            onClick={() => setFilterStatus('ALL')}
            style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', cursor: 'pointer', backgroundColor: filterStatus === 'ALL' ? 'white' : 'transparent', color: filterStatus === 'ALL' ? 'var(--pulpos-primary)' : 'var(--pulpos-text-muted)', fontWeight: filterStatus === 'ALL' ? 'bold' : 'normal', boxShadow: filterStatus === 'ALL' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
          >
            Todas
          </button>
          <button 
            onClick={() => setFilterStatus('PENDING')}
            style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', cursor: 'pointer', backgroundColor: filterStatus === 'PENDING' ? 'white' : 'transparent', color: filterStatus === 'PENDING' ? '#d97706' : 'var(--pulpos-text-muted)', fontWeight: filterStatus === 'PENDING' ? 'bold' : 'normal', boxShadow: filterStatus === 'PENDING' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
          >
            Pendientes
          </button>
          <button 
            onClick={() => setFilterStatus('ORDERED')}
            style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', cursor: 'pointer', backgroundColor: filterStatus === 'ORDERED' ? 'white' : 'transparent', color: filterStatus === 'ORDERED' ? '#16a34a' : 'var(--pulpos-text-muted)', fontWeight: filterStatus === 'ORDERED' ? 'bold' : 'normal', boxShadow: filterStatus === 'ORDERED' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
          >
            Pedidas
          </button>
        </div>
      </div>

      <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead style={{ backgroundColor: '#f8fafc' }}>
          <tr>
            <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Fecha</th>
            <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Producto / Solicitado</th>
            <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Cant.</th>
            <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Solicitante</th>
            <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Estado</th>
            <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {filteredRequests.map(req => (
            <tr key={req.id} style={{ borderBottom: '1px solid var(--pulpos-border)' }}>
              <td style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b' }}>
                  <Calendar size={16} /> {new Date(req.createdAt).toLocaleDateString()}
                </div>
              </td>
              <td style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}>
                  <Package size={18} color="var(--pulpos-primary)" />
                  {req.product ? (
                    req.product.name
                  ) : (
                    <span>{req.preProductName} <span style={{ fontSize: '0.75rem', fontWeight: 'normal', backgroundColor: '#f1f5f9', padding: '0.15rem 0.4rem', borderRadius: '4px', marginLeft: '0.5rem' }}>FUERA DE CATÁLOGO</span></span>
                  )}
                </div>
              </td>
              <td style={{ padding: '1rem', fontWeight: 'bold', fontSize: '1.1rem' }}>
                {req.quantity}
              </td>
              <td style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#475569' }}>
                  <User size={16} /> {req.requestedBy?.name}
                </div>
              </td>
              <td style={{ padding: '1rem' }}>
                {req.status === 'PENDING' ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.5rem', backgroundColor: '#fef3c7', color: '#d97706', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                    <Clock size={12} /> PENDIENTE
                  </span>
                ) : req.status === 'ORDERED' ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.5rem', backgroundColor: '#dcfce7', color: '#16a34a', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                    <CheckCircle2 size={12} /> PEDIDO (COMPRAS)
                  </span>
                ) : (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.5rem', backgroundColor: '#f1f5f9', color: '#64748b', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                    {req.status}
                  </span>
                )}
              </td>
              <td style={{ padding: '1rem' }}>
                {req.status === 'PENDING' && (
                  <button 
                    onClick={() => handleDelete(req.id)}
                    disabled={isDeleting === req.id}
                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', opacity: isDeleting === req.id ? 0.5 : 1 }}
                    title="Eliminar solicitud"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </td>
            </tr>
          ))}
          {filteredRequests.length === 0 && (
            <tr>
              <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--pulpos-text-muted)' }}>
                No hay solicitudes que coincidan con los filtros.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
