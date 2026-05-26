'use client';

import { useState, useEffect, useRef } from 'react';
import { Package, Truck, Clock, CheckCircle2, AlertTriangle, MapPin, Search, X, Navigation, Eye, ArrowUp, ArrowDown } from 'lucide-react';
import Link from 'next/link';
import { updateDeliveryOrder, updateRouteSequence } from '@/app/actions/logistica';

type DeliveryOrder = any;

export default function LogisticaClient({ initialOrders, branch, drivers }: { initialOrders: DeliveryOrder[], branch: any, drivers: any[] }) {
  const [orders, setOrders] = useState<DeliveryOrder[]>(initialOrders);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals state
  const [editingOrder, setEditingOrder] = useState<DeliveryOrder | null>(null);
  const [editStatus, setEditStatus] = useState('');
  const [editDriver, setEditDriver] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Evidence view modal
  const [evidenceOrder, setEvidenceOrder] = useState<DeliveryOrder | null>(null);

  // Route map modal state
  const [showMapModal, setShowMapModal] = useState(false);
  const [mapDriverFilter, setMapDriverFilter] = useState<string>('ALL');
  const [locatingOrderId, setLocatingOrderId] = useState<string | null>(null);
  const [isSavingSequence, setIsSavingSequence] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polylineRef = useRef<any>(null);
  const [mapsLoaded, setMapsLoaded] = useState(false);

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
        setOrders(orders.map(o => o.id === editingOrder.id ? { 
          ...o, 
          status: editStatus, 
          driverId: editDriver || null, 
          driver: drivers.find(d => d.id === editDriver) || null 
        } : o));
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

  // Dynamically load Google Maps script
  useEffect(() => {
    if (showMapModal && !mapsLoaded) {
      const existingScript = document.getElementById('google-maps-script');
      if (existingScript) {
        setMapsLoaded(true);
        return;
      }

      const script = document.createElement('script');
      // Load standard Google Maps JavaScript API. Falling back to development mode if key is missing/invalid
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || ''}`;
      script.id = 'google-maps-script';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        setMapsLoaded(true);
      };
      script.onerror = () => {
        console.error("Failed to load Google Maps script. Checking map container display.");
      };
      document.body.appendChild(script);
    }
  }, [showMapModal, mapsLoaded]);

  // Init and Update Google Map
  useEffect(() => {
    if (showMapModal && mapsLoaded && mapContainerRef.current && (window as any).google) {
      const google = (window as any).google;

      // 1. Initialize Map
      const mapOptions = {
        center: { lat: 20.5888, lng: -100.3899 }, // Default to Queretaro Centro
        zoom: 12,
        mapId: "DEMO_MAP_ID", // Optional map styles
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }]
          }
        ]
      };

      if (!googleMapRef.current) {
        googleMapRef.current = new google.maps.Map(mapContainerRef.current, mapOptions);

        // Add Click listener to place coordinate picker
        googleMapRef.current.addListener('click', async (e: any) => {
          if (locatingOrderId) {
            const clickedLat = e.latLng.lat();
            const clickedLng = e.latLng.lng();
            
            // Confirm coords assignment
            if (confirm(`¿Asignar esta ubicación geográfica a la entrega del cliente?`)) {
              try {
                const res = await updateDeliveryOrder(locatingOrderId, {
                  lat: clickedLat,
                  lng: clickedLng
                });

                if (res.success) {
                  // Update order state
                  setOrders(prev => prev.map(o => o.id === locatingOrderId ? { ...o, lat: clickedLat, lng: clickedLng } : o));
                  setLocatingOrderId(null);
                } else {
                  alert(res.error);
                }
              } catch (err) {
                alert("Error al actualizar la coordenada.");
              }
            }
          }
        });
      }

      const mapInstance = googleMapRef.current;

      // 2. Clear Existing Markers
      markersRef.current.forEach(m => m.setMap(null));
      markersRef.current = [];

      // 3. Filter orders to display as markers
      // Show pending or in_progress, filter by driver
      const activeOrders = orders.filter(o => 
        (o.status === 'PENDING' || o.status === 'IN_PROGRESS' || o.status === 'POSTPONED') &&
        (mapDriverFilter === 'ALL' || o.driverId === mapDriverFilter)
      );

      // Sort by routeOrder
      const sortedActive = [...activeOrders].sort((a, b) => a.routeOrder - b.routeOrder);

      const bounds = new google.maps.LatLngBounds();
      let hasCoordinates = false;

      const pathCoordinates: any[] = [];

      // 4. Place Markers
      sortedActive.forEach((order, index) => {
        if (order.lat && order.lng) {
          hasCoordinates = true;
          const pos = { lat: order.lat, lng: order.lng };
          bounds.extend(pos);
          pathCoordinates.push(pos);

          // Marker Label
          const labelText = (mapDriverFilter !== 'ALL') ? `${index + 1}` : '';
          const markerColor = order.status === 'IN_PROGRESS' ? '#3b82f6' : order.status === 'POSTPONED' ? '#f97316' : '#94a3b8';

          const marker = new google.maps.Marker({
            position: pos,
            map: mapInstance,
            title: order.sale?.customer?.name || "Pedido",
            label: labelText ? {
              text: labelText,
              color: 'white',
              fontWeight: 'bold'
            } : undefined,
            icon: {
              path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
              scale: 8,
              fillColor: markerColor,
              fillOpacity: 0.9,
              strokeColor: 'white',
              strokeWeight: 2,
            }
          });

          // InfoWindow on Marker Click
          const infoContent = `
            <div style="padding: 5px; color: #0f172a; font-family: sans-serif;">
              <strong style="font-size: 14px;">${order.sale?.customer?.name || 'Cliente de Mostrador'}</strong>
              <div style="font-size: 12px; color: #475569; margin: 4px 0;">${order.street || ''} ${order.exteriorNumber || ''}, ${order.neighborhood || ''}</div>
              <div style="font-size: 11px; margin-top: 5px;">
                <span style="padding: 2px 6px; border-radius: 4px; font-weight: bold; background-color: ${order.status === 'IN_PROGRESS' ? '#dbeafe' : '#f1f5f9'}; color: ${order.status === 'IN_PROGRESS' ? '#1e40af' : '#475569'};">
                  ${order.status === 'IN_PROGRESS' ? 'En Ruta' : 'Pendiente'}
                </span>
                ${order.driver?.name ? `<span style="margin-left: 8px; color: #64748b;">👤 ${order.driver.name}</span>` : ''}
              </div>
            </div>
          `;

          const infoWindow = new google.maps.InfoWindow({
            content: infoContent
          });

          marker.addListener('click', () => {
            infoWindow.open(mapInstance, marker);
          });

          markersRef.current.push(marker);
        }
      });

      // 5. Draw Polyline Route if single driver selected
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }

      if (mapDriverFilter !== 'ALL' && pathCoordinates.length > 1) {
        polylineRef.current = new google.maps.Polyline({
          path: pathCoordinates,
          geodesic: true,
          strokeColor: '#4f46e5',
          strokeOpacity: 0.8,
          strokeWeight: 4,
          map: mapInstance
        });
      }

      // 6. Autofit Bounds
      if (hasCoordinates) {
        mapInstance.fitBounds(bounds);
        // Prevent excessive zoom for single marker
        const listener = google.maps.event.addListener(mapInstance, 'bounds_changed', () => {
          if (mapInstance.getZoom() > 15) {
            mapInstance.setZoom(14);
          }
          google.maps.event.removeListener(listener);
        });
      }
    }
  }, [showMapModal, mapsLoaded, orders, mapDriverFilter, locatingOrderId]);

  // Adjust sequencing for orders assigned to selected driver
  const handleShiftRoute = async (orderId: string, direction: 'UP' | 'DOWN') => {
    const driverOrders = orders
      .filter(o => o.driverId === mapDriverFilter && (o.status === 'PENDING' || o.status === 'IN_PROGRESS' || o.status === 'POSTPONED'))
      .sort((a, b) => a.routeOrder - b.routeOrder);

    const index = driverOrders.findIndex(o => o.id === orderId);
    if (index === -1) return;

    if (direction === 'UP' && index === 0) return;
    if (direction === 'DOWN' && index === driverOrders.length - 1) return;

    const swapWithIndex = direction === 'UP' ? index - 1 : index + 1;
    const temp = driverOrders[index];
    driverOrders[index] = driverOrders[swapWithIndex];
    driverOrders[swapWithIndex] = temp;

    // Map new routeOrder indexes
    const updatedSequences = driverOrders.map((o, idx) => ({
      id: o.id,
      routeOrder: idx + 1
    }));

    // Optimistic UI updates
    setOrders(prev => prev.map(o => {
      const match = updatedSequences.find(us => us.id === o.id);
      return match ? { ...o, routeOrder: match.routeOrder } : o;
    }));

    setIsSavingSequence(true);
    try {
      const res = await updateRouteSequence(updatedSequences);
      if (!res.success) {
        alert("No se pudo persistir el orden en base de datos.");
      }
    } catch (err) {
      alert("Error al actualizar la base de datos.");
    } finally {
      setIsSavingSequence(false);
    }
  };

  return (
    <div>
      {/* Header View */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>Logística y Entregas</h1>
          <p style={{ color: 'var(--pulpos-text-muted)' }}>Gestión de rutas y despachos de pedidos</p>
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            onClick={() => setShowMapModal(true)} 
            className="btn-secondary" 
            style={{ 
              padding: '0.75rem 1rem', 
              backgroundColor: '#4f46e5', 
              color: 'white', 
              border: 'none', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              fontWeight: '600'
            }}
          >
            <MapPin size={18} />
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
                      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                        <button onClick={() => handleEditClick(order)} className="btn-secondary" style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}>
                          Actualizar
                        </button>
                        
                        {order.status === 'DELIVERED' && (order.clientSignature || order.evidencePhoto) ? (
                          <button 
                            onClick={() => setEvidenceOrder(order)} 
                            className="btn-secondary" 
                            style={{ 
                              padding: '0.35rem 0.6rem', 
                              fontSize: '0.8rem', 
                              backgroundColor: '#dcfce7', 
                              color: '#166534', 
                              border: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}
                          >
                            <Eye size={12} />
                            Evidencia
                          </button>
                        ) : null}

                        <Link 
                          href={`/logistica/etiqueta/${order.id}`} 
                          target="_blank"
                          className="btn-secondary" 
                          style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem', textDecoration: 'none' }} 
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

      {/* Edit Status & Driver Modal */}
      {editingOrder && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="card" style={{ padding: '2rem', width: '100%', maxWidth: '400px', borderRadius: '16px' }}>
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

      {/* Visualizer Evidence Modal */}
      {evidenceOrder && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="card" style={{ padding: '2rem', width: '100%', maxWidth: '550px', borderRadius: '16px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#166534' }}>
                  <CheckCircle2 size={22} /> Evidencia de Entrega
                </h2>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Venta #{evidenceOrder.saleId.slice(0, 8)}</span>
              </div>
              <button onClick={() => setEvidenceOrder(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={22} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.875rem', color: '#334155' }}>
                <div>
                  <span style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Cliente:</span>
                  <strong>{evidenceOrder.sale?.customer?.name || "Cliente de Mostrador"}</strong>
                </div>
                <div>
                  <span style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Chofer:</span>
                  <strong>{evidenceOrder.driver?.name || "Chofer no registrado"}</strong>
                </div>
              </div>

              {/* Photo Evidence */}
              {evidenceOrder.evidencePhoto ? (
                <div>
                  <span style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Foto de Evidencia:</span>
                  <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0', backgroundColor: '#f1f5f9', display: 'flex', justifyContent: 'center' }}>
                    <img 
                      src={evidenceOrder.evidencePhoto} 
                      alt="Foto Evidencia de Entrega" 
                      style={{ maxWidth: '100%', maxHeight: '250px', objectFit: 'contain' }} 
                    />
                  </div>
                </div>
              ) : (
                <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                  Sin registro fotográfico
                </div>
              )}

              {/* Signature Evidence */}
              {evidenceOrder.clientSignature ? (
                <div>
                  <span style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Firma del Cliente:</span>
                  <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0', backgroundColor: '#fafafa', display: 'flex', justifyContent: 'center' }}>
                    <img 
                      src={evidenceOrder.clientSignature} 
                      alt="Firma del Cliente" 
                      style={{ maxWidth: '100%', maxHeight: '150px', objectFit: 'contain', backgroundColor: 'transparent' }} 
                    />
                  </div>
                </div>
              ) : (
                <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                  Sin registro de firma
                </div>
              )}

              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#64748b' }}>
                <span>Entregado el:</span>
                <strong>{new Date(evidenceOrder.updatedAt).toLocaleString()}</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Google Map Sequencer Modal */}
      {showMapModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 999, padding: '1.5rem' }}>
          <div className="card" style={{ width: '100%', height: '90vh', maxWidth: '1100px', borderRadius: '20px', padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <MapPin size={22} color="#4f46e5" /> Planificador y Secuenciador de Rutas
                </h2>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Asigna y ordena secuencialmente las entregas de los choferes</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.85rem', color: '#475569', fontWeight: '500' }}>Filtrar Chofer:</span>
                  <select 
                    value={mapDriverFilter} 
                    onChange={e => {
                      setMapDriverFilter(e.target.value);
                      setLocatingOrderId(null); // Clear manual picker mode on filter change
                    }}
                    className="form-control"
                    style={{ padding: '0.35rem 1.5rem 0.35rem 0.75rem', fontSize: '0.85rem', width: 'auto', display: 'inline-block', marginBottom: 0 }}
                  >
                    <option value="ALL">-- Ver Todos --</option>
                    {drivers.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                
                <button onClick={() => {
                  setShowMapModal(false);
                  setLocatingOrderId(null);
                }} style={{ background: '#f1f5f9', border: 'none', cursor: 'pointer', color: '#475569', padding: '0.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Split Screen Panel */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
              {/* Sidebar: Delivery orders and ordering sequence */}
              <div style={{ width: '360px', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', backgroundColor: 'white' }}>
                <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '0.875rem' }}>
                  {mapDriverFilter === 'ALL' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b' }}>
                      <AlertTriangle size={16} color="#eab308" />
                      <span>Selecciona un chofer para planear su orden de ruta en el mapa</span>
                    </div>
                  ) : (
                    <div style={{ fontWeight: '500', color: '#4f46e5' }}>
                      Ruta activa del Chofer
                    </div>
                  )}
                </div>

                {/* List container */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {(() => {
                    const activeList = orders.filter(o => 
                      (o.status === 'PENDING' || o.status === 'IN_PROGRESS' || o.status === 'POSTPONED') &&
                      (mapDriverFilter === 'ALL' || o.driverId === mapDriverFilter)
                    ).sort((a, b) => a.routeOrder - b.routeOrder);

                    if (activeList.length === 0) {
                      return (
                        <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: '0.875rem' }}>
                          No hay pedidos activos asignados.
                        </div>
                      );
                    }

                    return activeList.map((order, index) => {
                      const hasLoc = order.lat && order.lng;
                      const isLocating = locatingOrderId === order.id;

                      return (
                        <div 
                          key={order.id} 
                          style={{ 
                            padding: '0.85rem', 
                            borderRadius: '12px', 
                            border: `1px solid ${isLocating ? '#3b82f6' : hasLoc ? '#e2e8f0' : '#fee2e2'}`, 
                            backgroundColor: isLocating ? '#eff6ff' : hasLoc ? 'white' : '#fff5f5',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.4rem',
                            transition: 'all 0.2s',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              {mapDriverFilter !== 'ALL' && (
                                <span style={{ 
                                  backgroundColor: '#4f46e5', 
                                  color: 'white', 
                                  fontSize: '0.72rem', 
                                  fontWeight: 'bold', 
                                  width: '18px',
                                  height: '18px',
                                  borderRadius: '50%',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}>
                                  {index + 1}
                                </span>
                              )}
                              <strong style={{ fontSize: '0.9rem', color: '#1e293b' }}>{order.sale?.customer?.name || "Venta Mostrador"}</strong>
                            </div>
                            
                            {/* Sequence sorters */}
                            {mapDriverFilter !== 'ALL' && (
                              <div style={{ display: 'flex', gap: '0.15rem' }}>
                                <button 
                                  onClick={() => handleShiftRoute(order.id, 'UP')} 
                                  disabled={index === 0 || isSavingSequence}
                                  title="Mover arriba"
                                  style={{ border: 'none', background: '#f1f5f9', cursor: 'pointer', padding: '0.2rem', borderRadius: '4px', opacity: index === 0 ? 0.3 : 1 }}
                                >
                                  <ArrowUp size={12} />
                                </button>
                                <button 
                                  onClick={() => handleShiftRoute(order.id, 'DOWN')} 
                                  disabled={index === activeList.length - 1 || isSavingSequence}
                                  title="Mover abajo"
                                  style={{ border: 'none', background: '#f1f5f9', cursor: 'pointer', padding: '0.2rem', borderRadius: '4px', opacity: index === activeList.length - 1 ? 0.3 : 1 }}
                                >
                                  <ArrowDown size={12} />
                                </button>
                              </div>
                            )}
                          </div>

                          <div style={{ fontSize: '0.78rem', color: '#64748b', lineHeight: '1.2' }}>
                            {order.street} {order.exteriorNumber}, Col. {order.neighborhood}
                          </div>

                          {/* Coords state and action */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.4rem' }}>
                            {hasLoc ? (
                              <span style={{ fontSize: '0.72rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }} /> Ubicado en GPS
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.72rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                <AlertTriangle size={10} /> Sin coordenadas
                              </span>
                            )}

                            <button
                              onClick={() => {
                                if (isLocating) {
                                  setLocatingOrderId(null);
                                } else {
                                  setLocatingOrderId(order.id);
                                }
                              }}
                              style={{ 
                                border: 'none', 
                                backgroundColor: isLocating ? '#ef4444' : '#4f46e5', 
                                color: 'white', 
                                padding: '0.25rem 0.5rem', 
                                borderRadius: '6px', 
                                fontSize: '0.7rem', 
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem'
                              }}
                            >
                              <MapPin size={10} />
                              {isLocating ? 'Cancelar' : 'Ubicar en Mapa'}
                            </button>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>

                {locatingOrderId && (
                  <div style={{ padding: '0.75rem', backgroundColor: '#eff6ff', borderTop: '1px solid #3b82f6', color: '#1e40af', fontSize: '0.78rem', textAlign: 'center', fontWeight: '500' }}>
                    📍 Modo de Ubicación: haz clic en cualquier parte del mapa de la derecha para fijar la dirección.
                  </div>
                )}
              </div>

              {/* Map rendering Container */}
              <div style={{ flex: 1, position: 'relative', backgroundColor: '#e2e8f0' }}>
                <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
                {!mapsLoaded && (
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#cbd5e1', zIndex: 10 }}>
                    <div style={{ textAlign: 'center', color: '#475569' }}>
                      <Truck size={32} className="animate-bounce" style={{ margin: '0 auto 0.5rem' }} />
                      <strong>Cargando Google Maps...</strong>
                      <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.25rem 0 0 0' }}>Estableciendo conexión satelital segura</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
