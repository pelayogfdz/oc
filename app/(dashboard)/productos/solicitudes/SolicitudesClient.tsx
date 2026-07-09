'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Package, Calendar, User, Trash2, CheckCircle2, Clock, ShoppingBag } from 'lucide-react';
import { 
  deletePurchaseRequest, 
  updatePurchaseRequestStatus, 
  batchUpdatePurchaseRequestStatus, 
  batchDeletePurchaseRequests 
} from '@/app/actions/purchaseRequest';

export default function SolicitudesClient({ initialRequests }: { initialRequests: any[] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'ORDERED' | 'DISPATCHED' | 'RECEIVED'>('PENDING');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Clear selection when filters change
  useEffect(() => {
    setSelectedIds([]);
  }, [filterStatus, searchTerm]);

  const filteredRequests = initialRequests.filter(req => {
    if (filterStatus !== 'ALL' && req.status !== filterStatus) return false;
    
    const term = searchTerm.toLowerCase();
    const productName = req.product?.name || req.preProductName || '';
    const userName = req.requestedBy?.name || '';
    const branchName = req.branch?.name || '';
    
    return productName.toLowerCase().includes(term) || userName.toLowerCase().includes(term) || branchName.toLowerCase().includes(term);
  });

  const handleDelete = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar esta solicitud?')) return;
    setIsDeleting(id);
    try {
      await deletePurchaseRequest(id);
      setSelectedIds(prev => prev.filter(x => x !== id));
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsDeleting(null);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    setIsUpdatingStatus(id);
    try {
      await updatePurchaseRequestStatus(id, newStatus);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsUpdatingStatus(null);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleToggleAll = () => {
    if (selectedIds.length === filteredRequests.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredRequests.map(r => r.id));
    }
  };

  return (
    <div className="card" style={{ padding: 0, overflowX: 'auto', fontFamily: 'var(--font-geist-sans)' }}>
      {/* Toolbar */}
      <div style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', borderBottom: '1px solid var(--caanma-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', maxWidth: '400px', position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', color: 'var(--caanma-text-muted)' }} />
          <input 
            type="text" 
            placeholder="🔍 Buscar producto, usuario o sucursal..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ padding: '0.6rem 1.5rem 0.6rem 2.5rem', width: '100%', borderRadius: '8px', border: '1px solid var(--caanma-border)' }}
          />
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem', backgroundColor: '#f1f5f9', padding: '0.25rem', borderRadius: '8px' }}>
          <button 
            type="button"
            onClick={() => setFilterStatus('ALL')}
            style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', cursor: 'pointer', backgroundColor: filterStatus === 'ALL' ? 'white' : 'transparent', color: filterStatus === 'ALL' ? 'var(--caanma-primary)' : 'var(--caanma-text-muted)', fontWeight: filterStatus === 'ALL' ? 'bold' : 'normal', boxShadow: filterStatus === 'ALL' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
          >
            Todas
          </button>
          <button 
            type="button"
            onClick={() => setFilterStatus('PENDING')}
            style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', cursor: 'pointer', backgroundColor: filterStatus === 'PENDING' ? 'white' : 'transparent', color: filterStatus === 'PENDING' ? '#d97706' : 'var(--caanma-text-muted)', fontWeight: filterStatus === 'PENDING' ? 'bold' : 'normal', boxShadow: filterStatus === 'PENDING' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
          >
            Pendientes
          </button>
          <button 
            type="button"
            onClick={() => setFilterStatus('ORDERED')}
            style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', cursor: 'pointer', backgroundColor: filterStatus === 'ORDERED' ? 'white' : 'transparent', color: filterStatus === 'ORDERED' ? '#16a34a' : 'var(--caanma-text-muted)', fontWeight: filterStatus === 'ORDERED' ? 'bold' : 'normal', boxShadow: filterStatus === 'ORDERED' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
          >
            Pedidas
          </button>
          <button 
            type="button"
            onClick={() => setFilterStatus('DISPATCHED')}
            style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', cursor: 'pointer', backgroundColor: filterStatus === 'DISPATCHED' ? 'white' : 'transparent', color: filterStatus === 'DISPATCHED' ? '#0369a1' : 'var(--caanma-text-muted)', fontWeight: filterStatus === 'DISPATCHED' ? 'bold' : 'normal', boxShadow: filterStatus === 'DISPATCHED' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
          >
            Despachadas
          </button>
          <button 
            type="button"
            onClick={() => setFilterStatus('RECEIVED')}
            style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', cursor: 'pointer', backgroundColor: filterStatus === 'RECEIVED' ? 'white' : 'transparent', color: filterStatus === 'RECEIVED' ? '#166534' : 'var(--caanma-text-muted)', fontWeight: filterStatus === 'RECEIVED' ? 'bold' : 'normal', boxShadow: filterStatus === 'RECEIVED' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
          >
            Recibidas
          </button>
        </div>
      </div>

      {/* Batch Actions Toolbar */}
      {selectedIds.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#f0f9ff',
          borderBottom: '1px solid #bae6fd',
          padding: '1rem 1.5rem',
          gap: '1rem',
          flexWrap: 'wrap'
        }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#0369a1' }}>
            {selectedIds.length} {selectedIds.length === 1 ? 'solicitud seleccionada' : 'solicitudes seleccionadas'}
          </span>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Link
              href={`/productos/pedidos/nuevo?requestIds=${selectedIds.join(',')}`}
              className="btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.4rem 0.8rem',
                fontSize: '0.8rem',
                fontWeight: 'bold',
                backgroundColor: '#0284c7',
                borderColor: '#0284c7',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '6px'
              }}
            >
              <ShoppingBag size={14} /> Cargar a Pedido
            </Link>
            <button
              type="button"
              onClick={async () => {
                if (!confirm('¿Marcar las solicitudes seleccionadas como Solicitadas a Proveedor?')) return;
                try {
                  await batchUpdatePurchaseRequestStatus(selectedIds, 'ORDERED');
                  setSelectedIds([]);
                } catch (e: any) {
                  alert(e.message);
                }
              }}
              style={{
                padding: '0.4rem 0.8rem',
                fontSize: '0.8rem',
                fontWeight: 'bold',
                backgroundColor: '#dcfce7',
                border: '1px solid #bbf7d0',
                color: '#15803d',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Marcar como Solicitado
            </button>
            <button
              type="button"
              onClick={async () => {
                if (!confirm('¿Marcar las solicitudes seleccionadas como Despachadas?')) return;
                try {
                  await batchUpdatePurchaseRequestStatus(selectedIds, 'DISPATCHED');
                  setSelectedIds([]);
                } catch (e: any) {
                  alert(e.message);
                }
              }}
              style={{
                padding: '0.4rem 0.8rem',
                fontSize: '0.8rem',
                fontWeight: 'bold',
                backgroundColor: '#e0f2fe',
                border: '1px solid #bae6fd',
                color: '#0369a1',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Marcar como Despachado
            </button>
            <button
              type="button"
              onClick={async () => {
                if (!confirm('¿Marcar las solicitudes seleccionadas como Recibidas?')) return;
                try {
                  await batchUpdatePurchaseRequestStatus(selectedIds, 'RECEIVED');
                  setSelectedIds([]);
                } catch (e: any) {
                  alert(e.message);
                }
              }}
              style={{
                padding: '0.4rem 0.8rem',
                fontSize: '0.8rem',
                fontWeight: 'bold',
                backgroundColor: '#e1f5fe',
                border: '1px solid #b3e5fc',
                color: '#0288d1',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Marcar como Recibido
            </button>
            <button
              type="button"
              onClick={async () => {
                if (!confirm('¿Seguro que deseas eliminar las solicitudes seleccionadas?')) return;
                try {
                  await batchDeletePurchaseRequests(selectedIds);
                  setSelectedIds([]);
                } catch (e: any) {
                  alert(e.message);
                }
              }}
              style={{
                padding: '0.4rem 0.8rem',
                fontSize: '0.8rem',
                fontWeight: 'bold',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#991b1b',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Eliminar
            </button>
          </div>
        </div>
      )}

      <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead style={{ backgroundColor: '#f8fafc' }}>
          <tr>
            <th style={{ padding: '1rem', width: '40px', borderBottom: '1px solid var(--caanma-border)' }}>
              <input 
                type="checkbox"
                checked={filteredRequests.length > 0 && selectedIds.length === filteredRequests.length}
                onChange={handleToggleAll}
                style={{ cursor: 'pointer', width: '16px', height: '16px' }}
              />
            </th>
            <th style={{ padding: '1rem', borderBottom: '1px solid var(--caanma-border)' }}>Fecha</th>
            <th style={{ padding: '1rem', borderBottom: '1px solid var(--caanma-border)' }}>Producto / Solicitado</th>
            <th style={{ padding: '1rem', borderBottom: '1px solid var(--caanma-border)' }}>Cant.</th>
            <th style={{ padding: '1rem', borderBottom: '1px solid var(--caanma-border)' }}>Solicitante</th>
            <th style={{ padding: '1rem', borderBottom: '1px solid var(--caanma-border)' }}>Estado</th>
            <th style={{ padding: '1rem', borderBottom: '1px solid var(--caanma-border)' }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {filteredRequests.map(req => {
            const isSelected = selectedIds.includes(req.id);
            return (
              <tr key={req.id} style={{ borderBottom: '1px solid var(--caanma-border)', backgroundColor: isSelected ? '#f8fafc' : 'transparent' }}>
                <td style={{ padding: '1rem' }}>
                  <input 
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggleSelect(req.id)}
                    style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                  />
                </td>
                <td style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b' }}>
                    <Calendar size={16} /> {new Date(req.createdAt).toLocaleDateString()}
                  </div>
                </td>
                <td style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}>
                    <Package size={18} color="var(--caanma-primary)" />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {req.product ? (
                        <>
                          <span>{req.product.name}</span>
                          <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--caanma-text-muted)', marginTop: '0.15rem' }}>
                            SKU: {req.product.sku || '-'} | Código: {req.product.barcode || '-'}
                          </span>
                        </>
                      ) : (
                        <span>{req.preProductName} <span style={{ fontSize: '0.75rem', fontWeight: 'normal', backgroundColor: '#f1f5f9', padding: '0.15rem 0.4rem', borderRadius: '4px', marginLeft: '0.5rem' }}>FUERA DE CATÁLOGO</span></span>
                      )}
                      {req.branch && (
                        <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--caanma-text-muted)', marginTop: '0.15rem' }}>
                          Sucursal: {req.branch.name}
                        </span>
                      )}
                    </div>
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
                  <select
                    value={req.status}
                    disabled={isUpdatingStatus === req.id}
                    onChange={(e) => handleStatusChange(req.id, e.target.value)}
                    style={{
                      padding: '0.35rem 0.6rem',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      border: '1px solid transparent',
                      cursor: 'pointer',
                      outline: 'none',
                      backgroundColor: req.status === 'PENDING' ? '#fef3c7' : req.status === 'ORDERED' ? '#dcfce7' : req.status === 'DISPATCHED' ? '#e0f9ff' : '#f1f5f9',
                      color: req.status === 'PENDING' ? '#d97706' : req.status === 'ORDERED' ? '#16a34a' : req.status === 'DISPATCHED' ? '#0369a1' : '#64748b'
                    }}
                  >
                    <option value="PENDING">🕒 PENDIENTE</option>
                    <option value="ORDERED">🚚 SOLICITADO</option>
                    <option value="DISPATCHED">📦 DESPACHADO</option>
                    <option value="RECEIVED">✅ RECIBIDO</option>
                  </select>
                </td>
                <td style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {req.status !== 'RECEIVED' && req.product && (
                      <Link
                        href={`/productos/pedidos/nuevo?requestId=${req.id}`}
                        className="btn-secondary"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          padding: '0.35rem 0.6rem',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          backgroundColor: '#e0f2fe',
                          color: '#0369a1',
                          borderRadius: '6px',
                          textDecoration: 'none',
                          border: 'none',
                          cursor: 'pointer'
                        }}
                        title="Cargar a Pedido con Proveedor"
                      >
                        <ShoppingBag size={14} /> Cargar a Pedido
                      </Link>
                    )}
                    <button 
                      type="button"
                      onClick={() => handleDelete(req.id)}
                      disabled={isDeleting === req.id}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', opacity: isDeleting === req.id ? 0.5 : 1 }}
                      title="Eliminar solicitud"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
          {filteredRequests.length === 0 && (
            <tr>
              <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--caanma-text-muted)' }}>
                No hay solicitudes que coincidan con los filtros.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
