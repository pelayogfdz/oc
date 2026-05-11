'use client';

import { useState } from 'react';
import { Package, Truck, Clock, CheckCircle2, AlertTriangle, MapPin, Search, X } from 'lucide-react';
import Link from 'next/link';
import { updateDeliveryOrder } from '@/app/actions/logistica';

type DeliveryOrder = any;

export default function LogisticaClient({ initialOrders, branch, drivers }: { initialOrders: DeliveryOrder[], branch: any, drivers: any[] }) {
  const [orders, setOrders] = useState<DeliveryOrder[]>(initialOrders);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal state
  const [editingOrder, setEditingOrder] = useState<DeliveryOrder | null>(null);
  const [editStatus, setEditStatus] = useState('');
  const [editDriver, setEditDriver] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const pendingCount = orders.filter(o => o.status === 'PENDING').length;
  const inProgressCount = orders.filter(o => o.status === 'IN_PROGRESS').length;
  const deliveredCount = orders.filter(o => o.status === 'DELIVERED').length;
  const postponedCount = orders.filter(o => o.status === 'POSTPONED').length;

  const filteredOrders = orders.filter(o => 
    o.sale?.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    o.saleId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.neighborhood?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'PENDING': return { bg: '#f1f5f9', text: '#475569', label: 'Pendiente' };
      case 'IN_PROGRESS': return { bg: '#dbeafe', text: '#1e40af', label: 'En Ruta' };
      case 'DELIVERED': return { bg: '#dcfce7', text: '#166534', label: 'Entregado' };
      case 'POSTPONED': return { bg: '#ffedd5', text: '#c2410c', label: 'Pospuesto' };
      default: return { bg: '#f1f5f9', text: '#475569', label: status };
    }
  };

  const handleEditClick = (order: DeliveryOrder) => {
    setEditingOrder(order);
    setEditStatus(order.status);
    setEditDriver(order.driverId || '');
  };

  const handleUpdate = async () => {
    if (!editingOrder) return;
    setIsUpdating(true);
    try {
      const res = await updateDeliveryOrder(editingOrder.id, {
        status: editStatus,
        driverId: editDriver
      });
      if (res.success) {
        setOrders(orders.map(o => o.id === editingOrder.id ? { ...o, status: editStatus, driverId: editDriver, driver: drivers.find(d => d.id === editDriver) || null } : o));
        setEditingOrder(null);
      } else {
        alert(res.error);
      }
    } catch (e: any) {
      alert("Error al actualizar");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>Logística y Entregas</h1>
          <p style={{ color: 'var(--pulpos-text-muted)' }}>Gestión de rutas y despachos de pedidos</p>
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn-secondary" style={{ padding: '0.75rem 1rem' }}>
            <MapPin size={18} style={{ marginRight: '0.5rem', display: 'inline' }} />
            Ver Mapa de Rutas
          </button>
        </div>
      </div>

      {/* Indicadores Diarios */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #64748b' }}>
          <div style={{ padding: '1rem', backgroundColor: '#f1f5f9', borderRadius: '50%' }}>
            <Package size={24} color="#475569" />
          </div>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', lineHeight: '1' }}>{pendingCount}</div>
            <div style={{ color: 'var(--pulpos-text-muted)', fontSize: '0.875rem' }}>Pendientes</div>
          </div>
        </div>

        <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #3b82f6' }}>
          <div style={{ padding: '1rem', backgroundColor: '#dbeafe', borderRadius: '50%' }}>
            <Truck size={24} color="#2563eb" />
          </div>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', lineHeight: '1' }}>{inProgressCount}</div>
            <div style={{ color: 'var(--pulpos-text-muted)', fontSize: '0.875rem' }}>En Ruta</div>
          </div>
        </div>

        <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #10b981' }}>
          <div style={{ padding: '1rem', backgroundColor: '#dcfce7', borderRadius: '50%' }}>
            <CheckCircle2 size={24} color="#16a34a" />
          </div>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', lineHeight: '1' }}>{deliveredCount}</div>
            <div style={{ color: 'var(--pulpos-text-muted)', fontSize: '0.875rem' }}>Completados</div>
          </div>
        </div>

        <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #f97316' }}>
          <div style={{ padding: '1rem', backgroundColor: '#ffedd5', borderRadius: '50%' }}>
            <Clock size={24} color="#ea580c" />
          </div>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', lineHeight: '1' }}>{postponedCount}</div>
            <div style={{ color: 'var(--pulpos-text-muted)', fontSize: '0.875rem' }}>Pospuestos</div>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Pedidos a Entregar</h2>
          <div className="form-group" style={{ marginBottom: 0, position: 'relative', width: '100%', maxWidth: '300px' }}>
            <Search size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input 
              type="text" 
              placeholder="Buscar por cliente o colonia..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="form-control"
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--pulpos-border)', backgroundColor: '#f9fafb' }}>
                <th style={{ padding: '1rem', color: 'var(--pulpos-text-muted)', fontWeight: '500' }}>Venta / Fecha</th>
                <th style={{ padding: '1rem', color: 'var(--pulpos-text-muted)', fontWeight: '500' }}>Cliente</th>
                <th style={{ padding: '1rem', color: 'var(--pulpos-text-muted)', fontWeight: '500' }}>Dirección</th>
                <th style={{ padding: '1rem', color: 'var(--pulpos-text-muted)', fontWeight: '500' }}>Chofer Asignado</th>
                <th style={{ padding: '1rem', color: 'var(--pulpos-text-muted)', fontWeight: '500', textAlign: 'center' }}>Estado</th>
                <th style={{ padding: '1rem', color: 'var(--pulpos-text-muted)', fontWeight: '500', textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length > 0 ? filteredOrders.map(order => {
                const statusTheme = getStatusColor(order.status);
                return (
                  <tr key={order.id} style={{ borderBottom: '1px solid var(--pulpos-border)' }}>
                    <td data-label="Venta" style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: '500', fontFamily: 'monospace' }}>{order.saleId?.slice(0,8)}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--pulpos-text-muted)' }}>{new Date(order.createdAt).toLocaleDateString()}</div>
                    </td>
                    <td data-label="Cliente" style={{ padding: '1rem', fontWeight: '500' }}>
                      {order.sale?.customer?.name || 'Venta de Mostrador'}
                    </td>
                    <td data-label="Dirección" style={{ padding: '1rem' }}>
                      {order.street ? (
                        <>
                          <div>{order.street} {order.exteriorNumber}</div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--pulpos-text-muted)' }}>{order.neighborhood}, {order.city}</div>
                        </>
                      ) : (
                        <span style={{ color: '#ef4444', fontSize: '0.85rem' }}><AlertTriangle size={14} style={{display:'inline'}}/> Sin dirección</span>
                      )}
                    </td>
                    <td data-label="Chofer" style={{ padding: '1rem', color: 'var(--pulpos-text-muted)' }}>
                      {order.driver?.name || 'Sin asignar'}
                    </td>
                    <td data-label="Estado" style={{ padding: '1rem', textAlign: 'center' }}>
                      <span style={{ 
                        padding: '0.25rem 0.75rem', 
                        borderRadius: '12px', 
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        backgroundColor: statusTheme.bg,
                        color: statusTheme.text
                      }}>
                        {statusTheme.label}
                      </span>
                    </td>
                    <td data-label="Acciones" style={{ padding: '1rem', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <button onClick={() => handleEditClick(order)} className="btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}>
                          Actualizar
                        </button>
                        <Link 
                          href={`/logistica/etiqueta/${order.id}`} 
                          target="_blank"
                          className="btn-secondary" 
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem', textDecoration: 'none' }} 
                          title="Generar Etiqueta"
                        >
                          Etiqueta
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--pulpos-text-muted)' }}>
                    No hay entregas registradas que coincidan con la búsqueda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingOrder && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="card" style={{ padding: '2rem', width: '100%', maxWidth: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Actualizar Entrega</h2>
              <button onClick={() => setEditingOrder(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>
            
            <div className="form-group">
              <label>Estado del Pedido</label>
              <select value={editStatus} onChange={e => setEditStatus(e.target.value)} className="form-control">
                <option value="PENDING">Pendiente</option>
                <option value="IN_PROGRESS">En Ruta</option>
                <option value="DELIVERED">Entregado</option>
                <option value="POSTPONED">Pospuesto</option>
              </select>
            </div>

            <div className="form-group">
              <label>Chofer Asignado</label>
              <select value={editDriver} onChange={e => setEditDriver(e.target.value)} className="form-control">
                <option value="">-- Sin asignar --</option>
                {drivers.map(d => (
                  <option key={d.id} value={d.id}>{d.name} ({d.role})</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
              <button onClick={() => setEditingOrder(null)} className="btn-secondary" disabled={isUpdating}>Cancelar</button>
              <button onClick={handleUpdate} className="btn-primary" disabled={isUpdating}>
                {isUpdating ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
