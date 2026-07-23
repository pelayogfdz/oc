'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Truck, Search, LayoutGrid, List, FileText, ArrowRight, MoreVertical, SlidersHorizontal, X, Hash, MapPin, Loader2, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { createDeliveryOrder } from '@/app/actions/logistica';

export default function TraspasosClient({ 
  initialTransfers, 
  currentBranchId,
  branches = []
}: { 
  initialTransfers: any[], 
  currentBranchId: string,
  branches?: { id: string; name: string }[]
}) {
  const [transfers, setTransfers] = useState<any[]>(initialTransfers);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  // Filter States
  const [idFilter, setIdFilter] = useState('');
  const [fromBranchFilter, setFromBranchFilter] = useState('');
  const [toBranchFilter, setToBranchFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Delivery routing modal states
  const [selectedTransferForRoute, setSelectedTransferForRoute] = useState<any | null>(null);
  const [routeStreet, setRouteStreet] = useState('');
  const [routeExtNum, setRouteExtNum] = useState('');
  const [routeIntNum, setRouteIntNum] = useState('');
  const [routeColonia, setRouteColonia] = useState('');
  const [routeCity, setRouteCity] = useState('');
  const [routeState, setRouteState] = useState('');
  const [routeZip, setRouteZip] = useState('');
  const [routeLat, setRouteLat] = useState<number | null>(null);
  const [routeLng, setRouteLng] = useState<number | null>(null);
  const [routeMaxTime, setRouteMaxTime] = useState('');
  const [isCreatingRoute, setIsCreatingRoute] = useState(false);
  const [mapsLoaded, setMapsLoaded] = useState(false);

  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTransfers(initialTransfers);
  }, [initialTransfers]);

  const handleOpenRouteModal = (transfer: any) => {
    setSelectedTransferForRoute(transfer);
    
    // Fallback: If destination branch has a location string, pre-populate street field with it
    const destLocation = transfer.toBranch?.location || '';
    setRouteStreet(destLocation);
    setRouteExtNum('');
    setRouteIntNum('');
    setRouteColonia('');
    setRouteCity('Querétaro');
    setRouteState('Querétaro');
    setRouteZip('');
    setRouteLat(null);
    setRouteLng(null);
    setRouteMaxTime('');
  };

  const handleGeocode = () => {
    if (!(window as any).google) return;
    const address = `${routeStreet} ${routeExtNum || ''}, ${routeColonia || ''}, ${routeCity || ''}, ${routeState || ''}, ${routeZip || ''}`;
    const geocoder = new (window as any).google.maps.Geocoder();
    geocoder.geocode({ address }, (results: any, status: any) => {
      if (status === 'OK' && results[0]) {
        const loc = results[0].geometry.location;
        setRouteLat(loc.lat());
        setRouteLng(loc.lng());
        if (mapRef.current) {
          mapRef.current.setCenter(loc);
          mapRef.current.setZoom(16);
          if (markerRef.current) {
            markerRef.current.setPosition(loc);
          }
        }
      } else {
        alert('No se pudo encontrar la ubicación en el mapa. Por favor haz clic manualmente en el mapa.');
      }
    });
  };

  const handleCreateRouteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTransferForRoute) return;

    setIsCreatingRoute(true);
    try {
      const res = await createDeliveryOrder({
        transferId: selectedTransferForRoute.id,
        street: routeStreet,
        exteriorNumber: routeExtNum,
        interiorNumber: routeIntNum,
        neighborhood: routeColonia,
        city: routeCity,
        state: routeState,
        zipCode: routeZip,
        lat: routeLat || undefined,
        lng: routeLng || undefined,
        maxDeliveryTime: routeMaxTime || undefined
      });

      if (res.success && res.order) {
        alert("Entrega programada exitosamente para el Traspaso. Se ha agregado al módulo de Logística.");
        
        // Update local state to reflect the deliveryOrder assignment
        setTransfers(prev => prev.map(t => t.id === selectedTransferForRoute.id ? {
          ...t,
          deliveryOrder: { id: res.order!.id, status: 'PENDING' }
        } : t));
        
        setSelectedTransferForRoute(null);
      } else {
        alert("Error al programar entrega del traspaso: " + res.error);
      }
    } catch (err: any) {
      alert("Excepción: " + err.message);
    } finally {
      setIsCreatingRoute(false);
    }
  };

  // Dynamic script loader for Google Maps in routing modal
  useEffect(() => {
    if (selectedTransferForRoute && !mapsLoaded) {
      const existingScript = document.getElementById('google-maps-script');
      if (existingScript) {
        setMapsLoaded(true);
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || ''}`;
      script.id = 'google-maps-script';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        setMapsLoaded(true);
      };
      document.body.appendChild(script);
    }
  }, [selectedTransferForRoute, mapsLoaded]);

  // Google Maps initialization inside routing modal
  useEffect(() => {
    if (selectedTransferForRoute && mapsLoaded && mapContainerRef.current && (window as any).google) {
      const google = (window as any).google;
      
      const defaultCenter = routeLat && routeLng 
        ? { lat: routeLat, lng: routeLng }
        : { lat: 20.5888, lng: -100.3899 }; // Queretaro

      const mapOptions = {
        center: defaultCenter,
        zoom: routeLat && routeLng ? 16 : 12,
        mapId: "DEMO_MAP_ID_TRASPASOS",
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }]
          }
        ]
      };

      mapRef.current = new google.maps.Map(mapContainerRef.current, mapOptions);

      markerRef.current = new google.maps.Marker({
        position: defaultCenter,
        map: mapRef.current,
        draggable: true,
        title: "Punto de Entrega"
      });

      // Update lat/lng on marker drag end
      markerRef.current.addListener('dragend', () => {
        const pos = markerRef.current.getPosition();
        setRouteLat(pos.lat());
        setRouteLng(pos.lng());
      });

      // Update lat/lng and marker position on map click
      mapRef.current.addListener('click', (e: any) => {
        const clickedLat = e.latLng.lat();
        const clickedLng = e.latLng.lng();
        setRouteLat(clickedLat);
        setRouteLng(clickedLng);
        markerRef.current.setPosition(e.latLng);
      });
    }
  }, [selectedTransferForRoute, mapsLoaded]);

  const filteredTransfers = transfers.filter(transfer => {
    // Search Term (General search on ID, Folio or branch names)
    const term = searchTerm.toLowerCase().trim();
    const matchesGeneral = term === '' || 
      transfer.id.toLowerCase().includes(term) ||
      (transfer.folio || '').toLowerCase().includes(term) ||
      (transfer.branch?.name || '').toLowerCase().includes(term) ||
      (transfer.toBranch?.name || '').toLowerCase().includes(term);

    // ID / Folio Filter Match (specific)
    const matchesId = idFilter.trim() === '' || 
      transfer.id.toLowerCase().includes(idFilter.toLowerCase().trim()) ||
      (transfer.folio || '').toLowerCase().includes(idFilter.toLowerCase().trim());

    // Sending Branch Filter Match
    const matchesFromBranch = fromBranchFilter === '' || 
      transfer.branchId === fromBranchFilter;

    // Receiving Branch Filter Match
    const matchesToBranch = toBranchFilter === '' || 
      transfer.toBranchId === toBranchFilter;

    // Status Filter Match
    const matchesStatus = statusFilter === '' || 
      transfer.status === statusFilter;

    // Date Filter Match
    let matchesDate = true;
    if (dateFilter) {
      const transferDate = new Date(transfer.createdAt);
      const year = transferDate.getFullYear();
      const month = String(transferDate.getMonth() + 1).padStart(2, '0');
      const day = String(transferDate.getDate()).padStart(2, '0');
      const formattedTransferDate = `${year}-${month}-${day}`;
      matchesDate = formattedTransferDate === dateFilter;
    }

    return matchesGeneral && matchesId && matchesFromBranch && matchesToBranch && matchesStatus && matchesDate;
  });

  const clearFilters = () => {
    setIdFilter('');
    setFromBranchFilter('');
    setToBranchFilter('');
    setDateFilter('');
    setStatusFilter('');
    setSearchTerm('');
  };

  const hasActiveFilters = idFilter || fromBranchFilter || toBranchFilter || dateFilter || statusFilter || searchTerm;

  const renderStatusBadge = (status: string) => {
    let label = status;
    let bgColor = '#f1f5f9';
    let color = '#475569';

    switch (status) {
      case 'REQUESTED':
        label = 'SOLICITADO';
        bgColor = '#eff6ff';
        color = '#1d4ed8';
        break;
      case 'CREATED':
        label = 'PREPARANDO';
        bgColor = '#f3e8ff';
        color = '#6b21a8';
        break;
      case 'DISPATCHED':
        label = 'EN TRÁNSITO';
        bgColor = '#fef9c3';
        color = '#854d0e';
        break;
      case 'RECEIVED':
        label = 'RECIBIDO';
        bgColor = '#dcfce7';
        color = '#166534';
        break;
      case 'CANCELLED':
        label = 'CANCELADO';
        bgColor = '#fee2e2';
        color = '#991b1b';
        break;
    }

    return (
      <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '4px', backgroundColor: bgColor, color: color, fontWeight: 'bold' }}>
        {label}
      </span>
    );
  };

  return (
    <div style={{ fontFamily: 'var(--font-geist-sans)' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', maxWidth: '600px', position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', color: 'var(--caanma-text-muted)' }} />
          <input 
            type="text" 
            placeholder="🔍 Buscar traspaso por ID o sucursal..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ padding: '0.8rem 1.5rem 0.8rem 2.5rem', width: '100%', borderRadius: '999px', border: '1px solid var(--caanma-border)', backgroundColor: 'white', fontSize: '1rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', backgroundColor: '#f1f5f9', padding: '0.25rem', borderRadius: '8px' }}>
          <button 
            onClick={() => setViewMode('grid')}
            style={{ padding: '0.5rem', borderRadius: '6px', border: 'none', cursor: 'pointer', backgroundColor: viewMode === 'grid' ? 'white' : 'transparent', color: viewMode === 'grid' ? 'var(--caanma-primary)' : 'var(--caanma-text-muted)', boxShadow: viewMode === 'grid' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
          >
            <LayoutGrid size={20} />
          </button>
          <button 
            onClick={() => setViewMode('list')}
            style={{ padding: '0.5rem', borderRadius: '6px', border: 'none', cursor: 'pointer', backgroundColor: viewMode === 'list' ? 'white' : 'transparent', color: viewMode === 'list' ? 'var(--caanma-primary)' : 'var(--caanma-text-muted)', boxShadow: viewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
          >
            <List size={20} />
          </button>
        </div>
      </div>

      {/* Advanced Filters */}
      <div style={{ 
        backgroundColor: 'white', 
        border: '1px solid var(--caanma-border)', 
        borderRadius: '12px', 
        padding: '1.25rem', 
        marginBottom: '2rem', 
        boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.9rem', color: 'var(--caanma-text)' }}>
            <SlidersHorizontal size={16} color="var(--caanma-primary)" />
            <span>Filtros detallados</span>
          </div>
          {hasActiveFilters && (
            <button 
              onClick={clearFilters}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--caanma-primary)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.25rem 0.5rem',
                borderRadius: '4px',
                backgroundColor: '#f8fafc'
              }}
            >
              <X size={12} /> Limpiar filtros
            </button>
          )}
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
          gap: '1rem' 
        }}>
          {/* ID Filter */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>ID del Traspaso</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Hash size={14} style={{ position: 'absolute', left: '0.75rem', color: '#94a3b8' }} />
              <input 
                type="text" 
                placeholder="Filtrar por ID..."
                value={idFilter}
                onChange={e => setIdFilter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem 0.5rem 2rem',
                  borderRadius: '6px',
                  border: '1px solid var(--caanma-border)',
                  fontSize: '0.85rem',
                  outline: 'none',
                  backgroundColor: '#f8fafc'
                }}
              />
            </div>
          </div>

          {/* Sending Branch Filter */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Sucursal que envía</label>
            <select
              value={fromBranchFilter}
              onChange={e => setFromBranchFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid var(--caanma-border)',
                fontSize: '0.85rem',
                outline: 'none',
                backgroundColor: '#f8fafc',
                cursor: 'pointer'
              }}
            >
              <option value="">Todas</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          {/* Receiving Branch Filter */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Sucursal que recibe</label>
            <select
              value={toBranchFilter}
              onChange={e => setToBranchFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid var(--caanma-border)',
                fontSize: '0.85rem',
                outline: 'none',
                backgroundColor: '#f8fafc',
                cursor: 'pointer'
              }}
            >
              <option value="">Todas</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          {/* Date Filter */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Fecha de creación</label>
            <input 
              type="date" 
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '0.4rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid var(--caanma-border)',
                fontSize: '0.85rem',
                outline: 'none',
                backgroundColor: '#f8fafc',
                cursor: 'pointer'
              }}
            />
          </div>

          {/* Status Filter */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Estatus</label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid var(--caanma-border)',
                fontSize: '0.85rem',
                outline: 'none',
                backgroundColor: '#f8fafc',
                cursor: 'pointer'
              }}
            >
              <option value="">Todos</option>
              <option value="REQUESTED">Solicitado</option>
              <option value="CREATED">En preparación</option>
              <option value="DISPATCHED">En Tránsito</option>
              <option value="RECEIVED">Recibido</option>
              <option value="CANCELLED">Cancelado</option>
            </select>
          </div>
        </div>
      </div>

      {filteredTransfers.length === 0 ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--caanma-text-muted)', backgroundColor: 'white', borderRadius: '12px', border: '1px dashed var(--caanma-border)' }}>
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
                border: '1px solid var(--caanma-border)', 
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
                <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--caanma-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                     <div style={{ fontSize: '0.85rem', color: 'var(--caanma-text-muted)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                       <Truck size={14} /> #{item.folio || item.id.substring(0,8).toUpperCase()}
                     </div>
                     <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '4px', backgroundColor: isIncoming ? '#e0e7ff' : '#f1f5f9', color: isIncoming ? '#4338ca' : '#475569', fontWeight: 'bold' }}>
                          {isIncoming ? 'ENTRANTE' : 'SALIENTE'}
                        </span>
                        {renderStatusBadge(item.status)}
                     </div>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <button 
                      onClick={() => setOpenDropdownId(openDropdownId === item.id ? null : item.id)}
                      style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--caanma-text-muted)' }}
                    >
                      <MoreVertical size={20} />
                    </button>
                    {openDropdownId === item.id && (
                      <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: '0.5rem', backgroundColor: 'white', border: '1px solid var(--caanma-border)', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 20, width: '150px', overflow: 'hidden' }}>
                        <Link href={`/productos/traspasos/${item.id}`} style={{ display: 'block', padding: '0.75rem 1rem', textDecoration: 'none', color: 'var(--caanma-text)', fontSize: '0.9rem', borderBottom: '1px solid var(--caanma-border)' }}>Ver Detalle</Link>
                        <Link href={`/productos/traspasos/${item.id}/imprimir`} target="_blank" style={{ display: 'block', padding: '0.75rem 1rem', textDecoration: 'none', color: 'var(--caanma-primary)', fontSize: '0.9rem' }}>Imprimir</Link>
                      </div>
                    )}
                  </div>
                </div>
                
                <div style={{ padding: '1.25rem', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                     <div style={{ textAlign: 'center', flex: 1 }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--caanma-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Origen</div>
                        <div style={{ fontWeight: 'bold', color: '#0f172a', fontSize: '0.9rem' }}>{item.branch?.name || 'Central'}</div>
                     </div>
                     <ArrowRight size={16} color="var(--caanma-text-muted)" style={{ margin: '0 0.5rem' }} />
                     <div style={{ textAlign: 'center', flex: 1 }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--caanma-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Destino</div>
                        <div style={{ fontWeight: 'bold', color: '#0f172a', fontSize: '0.9rem' }}>{item.toBranch?.name || 'N/A'}</div>
                     </div>
                  </div>

                  <div style={{ fontSize: '0.85rem', color: 'var(--caanma-text-muted)' }}>
                    <div style={{ marginBottom: '0.2rem' }}>Creado: {new Date(item.createdAt).toLocaleString()}</div>
                    {item.createdBy && <div>Enviado por: <strong>{item.createdBy.name}</strong></div>}
                    {item.receivedBy && <div>Recibido por: <strong>{item.receivedBy.name}</strong></div>}
                  </div>
                </div>
                
                <div style={{ padding: '1rem 1.25rem', backgroundColor: '#f8fafc', borderTop: '1px solid var(--caanma-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <Link href={`/productos/traspasos/${item.id}`} style={{ color: 'var(--caanma-primary)', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 'bold' }}>
                      Ver Detalle &rarr;
                    </Link>
                    <Link href={`/productos/traspasos/${item.id}/imprimir`} target="_blank" style={{ color: '#0284c7', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 'bold' }}>
                      Imprimir
                    </Link>
                    {item.status !== 'CANCELLED' && (
                      item.deliveryOrder ? (
                        <Link href="/logistica" style={{ color: '#0369a1', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Truck size={14} /> Ver Entrega ({item.deliveryOrder.status === 'PENDING' ? 'Pendiente' : item.deliveryOrder.status === 'IN_PROGRESS' ? 'En Ruta' : item.deliveryOrder.status === 'DELIVERED' ? 'Recibido' : 'Pospuesto'})
                        </Link>
                      ) : (
                        <button onClick={() => handleOpenRouteModal(item)} style={{ background: 'none', border: 'none', padding: 0, color: '#7e22ce', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Truck size={14} /> Programar Entrega
                        </button>
                      )
                    )}
                  </div>
                  {isIncoming && item.status === 'DISPATCHED' && (
                     <button onClick={async () => {
                       const t = await import('@/app/actions/transfer');
                       const res = await t.receiveTransfer(item.id);
                       if (res && !res.success) {
                         alert("Error: " + res.error);
                       } else {
                         window.location.reload();
                       }
                     }} style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '0.4rem 1rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}>
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
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--caanma-border)' }}>Folio / ID</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--caanma-border)' }}>Ruta (Origen → Destino)</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--caanma-border)' }}>Información</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--caanma-border)' }}>Estado</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--caanma-border)', textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransfers.map(item => {
                const isIncoming = item.toBranchId === currentBranchId;
                
                return (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--caanma-border)' }}>
                  <td data-label="Folio / ID" style={{ padding: '1rem', fontWeight: '500' }}>
                    <div style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>#{item.folio || item.id.substring(0,8).toUpperCase()}</div>
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
                  <td data-label="Información" style={{ padding: '1rem', color: 'var(--caanma-text-muted)', fontSize: '0.9rem' }}>
                    <div style={{ marginBottom: '0.2rem' }}>{new Date(item.createdAt).toLocaleString()}</div>
                    {item.createdBy && <div><span style={{fontWeight: 500}}>Enviado por:</span> {item.createdBy.name}</div>}
                    {item.receivedBy && <div><span style={{fontWeight: 500}}>Recibido por:</span> {item.receivedBy.name}</div>}
                  </td>
                  <td data-label="Estado" style={{ padding: '1rem' }}>
                    {renderStatusBadge(item.status)}
                  </td>
                    <td data-label="Acciones" style={{ padding: '1rem', display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      <Link href={`/productos/traspasos/${item.id}/imprimir`} target="_blank" style={{ backgroundColor: 'white', color: 'var(--caanma-primary)', border: '1px solid var(--caanma-primary)', padding: '0.4rem 0.75rem', borderRadius: '4px', cursor: 'pointer', fontWeight: '500', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}>
                         Imprimir
                      </Link>
                      <Link href={`/productos/traspasos/${item.id}`} style={{ backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '0.4rem 0.75rem', borderRadius: '4px', cursor: 'pointer', fontWeight: '500', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}>
                         Ver Detalle
                      </Link>
                      {item.status !== 'CANCELLED' && (
                        item.deliveryOrder ? (
                          <Link href="/logistica" style={{ backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', padding: '0.4rem 0.75rem', borderRadius: '4px', cursor: 'pointer', fontWeight: '500', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}>
                            <Truck size={14} /> Ver Entrega ({item.deliveryOrder.status === 'PENDING' ? 'Pendiente' : item.deliveryOrder.status === 'IN_PROGRESS' ? 'En Ruta' : item.deliveryOrder.status === 'DELIVERED' ? 'Recibido' : 'Pospuesto'})
                          </Link>
                        ) : (
                          <button onClick={() => handleOpenRouteModal(item)} style={{ backgroundColor: '#faf5ff', color: '#7e22ce', border: '1px solid #e9d5ff', padding: '0.4rem 0.75rem', borderRadius: '4px', cursor: 'pointer', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}>
                            <Truck size={14} /> Programar Entrega
                          </button>
                        )
                      )}
                      {isIncoming && item.status === 'DISPATCHED' && (
                         <button onClick={async () => {
                           const t = await import('@/app/actions/transfer');
                           const res = await t.receiveTransfer(item.id);
                           if (res && !res.success) {
                             alert("Error: " + res.error);
                           } else {
                             window.location.reload();
                           }
                         }} style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '0.4rem 0.75rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}>
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

      {/* Interactive Delivery Routing Modal */}
      {selectedTransferForRoute && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(8px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '20px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              width: '100%',
              maxWidth: '1000px',
              overflow: 'hidden',
              animation: 'scaleIn 0.2s ease-out',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '90vh'
            }}
          >
            {/* Header */}
            <div
              style={{
                background: 'linear-gradient(135deg, #7e22ce, #9333ea)',
                padding: '1.25rem 1.5rem',
                color: 'white',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Truck size={20} /> Programar Entrega del Traspaso
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#f3e8ff' }}>
                  ID Traspaso: {selectedTransferForRoute.folio || selectedTransferForRoute.id.slice(0, 8).toUpperCase()}
                </span>
              </div>
              <button
                onClick={() => setSelectedTransferForRoute(null)}
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.25)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)')}
              >
                ✕
              </button>
            </div>

            {/* Split Content */}
            <div style={{ display: 'flex', flexWrap: 'wrap', overflowY: 'auto', flex: 1 }}>
              {/* Form Column */}
              <form 
                onSubmit={handleCreateRouteSubmit}
                style={{
                  flex: '1 1 450px',
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  borderRight: '1px solid #cbd5e1'
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#475569' }}>Calle / Av. (o Domicilio)</label>
                    <input
                      type="text"
                      required
                      value={routeStreet}
                      onChange={(e) => setRouteStreet(e.target.value)}
                      style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#475569' }}>Ext.</label>
                    <input
                      type="text"
                      required
                      value={routeExtNum}
                      onChange={(e) => setRouteExtNum(e.target.value)}
                      style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#475569' }}>Int.</label>
                    <input
                      type="text"
                      value={routeIntNum}
                      onChange={(e) => setRouteIntNum(e.target.value)}
                      style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#475569' }}>Colonia</label>
                    <input
                      type="text"
                      required
                      value={routeColonia}
                      onChange={(e) => setRouteColonia(e.target.value)}
                      style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#475569' }}>C.P.</label>
                    <input
                      type="text"
                      required
                      value={routeZip}
                      onChange={(e) => setRouteZip(e.target.value)}
                      style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#475569' }}>Ciudad</label>
                    <input
                      type="text"
                      required
                      value={routeCity}
                      onChange={(e) => setRouteCity(e.target.value)}
                      style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#475569' }}>Estado</label>
                    <input
                      type="text"
                      required
                      value={routeState}
                      onChange={(e) => setRouteState(e.target.value)}
                      style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#475569' }}>Hora Máxima de Entrega (Opcional)</label>
                    <input
                      type="time"
                      value={routeMaxTime}
                      onChange={(e) => setRouteMaxTime(e.target.value)}
                      style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', width: '100%' }}
                    />
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={handleGeocode}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      color: '#334155',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <MapPin size={16} /> Buscar Dirección en el Mapa
                  </button>

                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: '#64748b' }}>
                    <div>
                      Latitud: <strong style={{ color: '#0f172a' }}>{routeLat !== null ? routeLat.toFixed(6) : 'Sin fijar'}</strong>
                    </div>
                    <div>
                      Longitud: <strong style={{ color: '#0f172a' }}>{routeLng !== null ? routeLng.toFixed(6) : 'Sin fijar'}</strong>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: 'auto', paddingTop: '1rem' }}>
                  <button
                    type="button"
                    onClick={() => setSelectedTransferForRoute(null)}
                    style={{
                      padding: '0.625rem 1.25rem',
                      backgroundColor: 'white',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      color: '#475569',
                      cursor: 'pointer',
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingRoute}
                    style={{
                      padding: '0.625rem 1.5rem',
                      backgroundColor: '#7e22ce',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                    }}
                  >
                    {isCreatingRoute ? 'Programando...' : 'Programar Entrega'}
                  </button>
                </div>
              </form>

              {/* Map Column */}
              <div 
                style={{
                  flex: '1 1 450px',
                  minHeight: '350px',
                  position: 'relative',
                  backgroundColor: '#f1f5f9',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <div ref={mapContainerRef} style={{ width: '100%', flex: 1, minHeight: '300px' }} />
                {!mapsLoaded && (
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#cbd5e1', zIndex: 10 }}>
                    <div style={{ textAlign: 'center', color: '#475569' }}>
                      <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 0.5rem' }} />
                      <strong>Cargando Google Maps...</strong>
                    </div>
                  </div>
                )}
                <div style={{ padding: '0.5rem 1rem', backgroundColor: '#f8fafc', borderTop: '1px solid #cbd5e1', fontSize: '0.78rem', color: '#64748b', textAlign: 'center' }}>
                  📍 Arrastra el marcador o haz clic en cualquier parte del mapa para fijar la coordenada exacta para el chofer.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
