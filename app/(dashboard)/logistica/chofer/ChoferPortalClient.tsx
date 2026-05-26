'use client';

import { useState } from 'react';
import { Truck, MapPin, Navigation, Package, CheckSquare, Clock, Phone, FileText } from 'lucide-react';
import { updateDeliveryOrder } from '@/app/actions/logistica';
import Link from 'next/link';

export default function ChoferPortalClient({ initialOrders, currentUser }: { initialOrders: any[]; currentUser: any }) {
  const [orders, setOrders] = useState<any[]>(initialOrders);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const pendingOrders = orders.filter(o => o.status === 'PENDING');
  const inProgressOrders = orders.filter(o => o.status === 'IN_PROGRESS');
  const postponedOrders = orders.filter(o => o.status === 'POSTPONED');

  const startRoute = async (orderId: string) => {
    setUpdatingId(orderId);
    try {
      const res = await updateDeliveryOrder(orderId, { status: 'IN_PROGRESS' });
      if (res.success) {
        setOrders(prev => 
          prev.map(o => o.id === orderId ? { ...o, status: 'IN_PROGRESS' } : o)
        );
      } else {
        alert(res.error || "No se pudo actualizar el estado del pedido.");
      }
    } catch (err) {
      alert("Error al conectar con el servidor.");
    } finally {
      setUpdatingId(null);
    }
  };

  const getNavigationUrl = (order: any) => {
    if (order.lat && order.lng) {
      return `https://www.google.com/maps/dir/?api=1&destination=${order.lat},${order.lng}`;
    }
    const query = `${order.street || ''} ${order.exteriorNumber || ''}, ${order.neighborhood || ''}, ${order.city || ''}, ${order.state || ''}`;
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`;
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Header */}
      <div style={{ 
        background: 'linear-gradient(135deg, #4f46e5, #3b82f6)', 
        borderRadius: '16px', 
        padding: '1.5rem', 
        color: 'white', 
        marginBottom: '2rem',
        boxShadow: '0 4px 20px rgba(59, 130, 246, 0.2)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <Truck size={28} />
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>Mi Ruta de Entregas</h1>
        </div>
        <p style={{ margin: 0, opacity: 0.9, fontSize: '0.95rem' }}>Chofer: <strong>{currentUser.name}</strong></p>
        
        {/* Quick Stats */}
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '1rem' }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{orders.length}</div>
            <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Asignados</div>
          </div>
          <div style={{ width: '1px', backgroundColor: 'rgba(255,255,255,0.2)' }} />
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#60a5fa' }}>{inProgressOrders.length}</div>
            <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>En Ruta</div>
          </div>
          <div style={{ width: '1px', backgroundColor: 'rgba(255,255,255,0.2)' }} />
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#93c5fd' }}>{pendingOrders.length}</div>
            <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Pendientes</div>
          </div>
        </div>
      </div>

      <h2 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <CheckSquare size={20} color="#4f46e5" /> Entregas Pendientes ({orders.length})
      </h2>

      {orders.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: '#64748b', borderRadius: '12px' }}>
          <Truck size={48} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
          <p style={{ margin: 0, fontWeight: '500' }}>¡No tienes entregas pendientes programadas!</p>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>Buen trabajo. Disfruta el descanso.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {orders.map((order, idx) => {
            const statusLabel = order.status === 'IN_PROGRESS' ? 'En Ruta' : order.status === 'POSTPONED' ? 'Pospuesto' : 'Pendiente';
            const statusColor = order.status === 'IN_PROGRESS' ? '#3b82f6' : order.status === 'POSTPONED' ? '#f97316' : '#64748b';
            const statusBg = order.status === 'IN_PROGRESS' ? '#eff6ff' : order.status === 'POSTPONED' ? '#fff7ed' : '#f1f5f9';

            return (
              <div 
                key={order.id} 
                className="card animate-fade-in" 
                style={{ 
                  borderRadius: '16px', 
                  padding: '1.5rem', 
                  borderLeft: `6px solid ${statusColor}`,
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)'
                }}
              >
                {/* Order Index & Status */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <span style={{ 
                    backgroundColor: '#4f46e5', 
                    color: 'white', 
                    fontSize: '0.8rem', 
                    fontWeight: 'bold', 
                    padding: '0.25rem 0.75rem', 
                    borderRadius: '12px' 
                  }}>
                    Parada #{idx + 1}
                  </span>
                  
                  <span style={{ 
                    backgroundColor: statusBg, 
                    color: statusColor, 
                    fontSize: '0.75rem', 
                    fontWeight: 'bold', 
                    padding: '0.25rem 0.6rem', 
                    borderRadius: '8px'
                  }}>
                    {statusLabel}
                  </span>
                </div>

                {/* Customer Details */}
                <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: '0 0 0.5rem 0' }}>
                  {order.sale?.customer?.name || 'Cliente de Mostrador'}
                </h3>

                {order.sale?.customer?.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: '#4f46e5', marginBottom: '0.75rem' }}>
                    <Phone size={14} />
                    <a href={`tel:${order.sale.customer.phone}`} style={{ color: 'inherit', textDecoration: 'none', fontWeight: '500' }}>
                      {order.sale.customer.phone}
                    </a>
                  </div>
                )}

                {/* Address details */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', color: '#334155', marginBottom: '1rem', fontSize: '0.95rem' }}>
                  <MapPin size={18} style={{ color: '#ef4444', flexShrink: 0, marginTop: '0.15rem' }} />
                  <div>
                    {order.street ? (
                      <>
                        <strong style={{ display: 'block', color: '#0f172a' }}>{order.street} {order.exteriorNumber} {order.interiorNumber ? `Int. ${order.interiorNumber}` : ''}</strong>
                        <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Col. {order.neighborhood}, {order.city}, {order.state}</span>
                      </>
                    ) : (
                      <span style={{ color: '#ef4444' }}>Sin dirección registrada en esta venta.</span>
                    )}
                  </div>
                </div>

                {/* Items & Packages */}
                {order.sale?.items && (
                  <div style={{ 
                    backgroundColor: '#f8fafc', 
                    padding: '0.75rem 1rem', 
                    borderRadius: '10px', 
                    marginBottom: '1rem',
                    fontSize: '0.875rem'
                  }}>
                    <div style={{ fontWeight: '600', color: '#475569', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Package size={14} /> Productos a entregar:
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#334155' }}>
                      {order.sale.items.map((item: any) => (
                        <li key={item.id} style={{ marginBottom: '0.2rem' }}>
                          <strong>{item.quantity}x</strong> {item.product?.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Notes */}
                {order.notes && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.85rem', color: '#ea580c', backgroundColor: '#fff7ed', padding: '0.5rem 0.75rem', borderRadius: '8px', marginBottom: '1.25rem' }}>
                    <FileText size={16} style={{ flexShrink: 0, marginTop: '0.05rem' }} />
                    <div><strong>Notas:</strong> {order.notes}</div>
                  </div>
                )}

                {/* Action Buttons */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '0.75rem', marginTop: '1rem' }}>
                  {order.status === 'PENDING' ? (
                    <button 
                      onClick={() => startRoute(order.id)}
                      disabled={updatingId !== null}
                      style={{ 
                        padding: '0.65rem', 
                        borderRadius: '8px', 
                        backgroundColor: '#dbeafe', 
                        color: '#1e40af', 
                        border: 'none', 
                        fontWeight: 'bold', 
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.25rem',
                        opacity: updatingId !== null ? 0.7 : 1
                      }}
                    >
                      <Clock size={16} />
                      {updatingId === order.id ? 'Cargando...' : 'Iniciar Ruta'}
                    </button>
                  ) : (
                    <a 
                      href={getNavigationUrl(order)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ 
                        padding: '0.65rem', 
                        borderRadius: '8px', 
                        backgroundColor: '#f1f5f9', 
                        color: '#334155', 
                        border: '1px solid #cbd5e1',
                        fontWeight: 'bold', 
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.35rem',
                        textDecoration: 'none'
                      }}
                    >
                      <Navigation size={16} color="#ef4444" />
                      Navegar GPS
                    </a>
                  )}

                  <Link 
                    href={`/delivery/${order.id}`}
                    style={{ 
                      padding: '0.65rem', 
                      borderRadius: '8px', 
                      backgroundColor: '#3b82f6', 
                      color: 'white', 
                      border: 'none', 
                      fontWeight: 'bold', 
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem',
                      textDecoration: 'none',
                      boxShadow: '0 2px 4px rgba(59, 130, 246, 0.15)'
                    }}
                  >
                    <CheckSquare size={16} />
                    Entregar
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
