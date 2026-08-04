'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Eye, Printer, RotateCcw, Calendar, User, MapPin, Tag, Receipt, Send, Share2, Loader2, CheckCircle, Mail, Download, X, AlertTriangle, Filter, Truck } from 'lucide-react';
import { sendSaleByEmail } from '@/app/actions/sale';
import { createDeliveryOrder } from '@/app/actions/logistica';
import { formatCurrency } from '@/lib/utils';
import { exportToExcel } from '@/lib/exportExcel';

const getPaymentMethodLabel = (method: string) => {
  const mapping: Record<string, string> = {
    'CASH': 'Efectivo',
    'CARD': 'Tarjeta',
    'TRANSFER': 'Transferencia',
    'SPEI': 'SPEI',
    'MIXED': 'Mixto',
    'CREDIT': 'Crédito',
    'VALES': 'Vales',
    'DEPOSIT': 'Depósito',
    'OTHER': 'Otro',
    'CHECK': 'Cheque',
    'CHEQUE': 'Cheque'
  };
  return mapping[method] || method || 'Efectivo';
};

const formatDateCompact = (dateStr: string, timezone: string) => {
  try {
    const date = new Date(dateStr);
    const options: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    };
    return new Intl.DateTimeFormat('es-MX', options).format(date);
  } catch (e) {
    return dateStr;
  }
};

export default function VentasHistoryClient({
  initialSales,
  branches,
  users,
  currentBranch,
  timezone
}: {
  initialSales: any[];
  branches: any[];
  users: any[];
  currentBranch: any;
  timezone: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const isInitialMount = useRef(true);

  const [sales, setSales] = useState<any[]>(initialSales);
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterBranch, setFilterBranch] = useState(currentBranch.id === 'GLOBAL' ? '' : currentBranch.id);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [filterCfdi, setFilterCfdi] = useState('');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('');
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);

  // Sync date filter with URL search parameters
  useEffect(() => {
    if (isInitialMount.current) {
      const params = new URLSearchParams(window.location.search);
      const initialStartDate = params.get('startDate') || '';
      const initialEndDate = params.get('endDate') || '';
      if (initialStartDate) {
        setFilterStartDate(initialStartDate);
      }
      if (initialEndDate) {
        setFilterEndDate(initialEndDate);
      }
      isInitialMount.current = false;
      return;
    }

    const params = new URLSearchParams(window.location.search);
    if (filterStartDate) {
      params.set('startDate', filterStartDate);
    } else {
      params.delete('startDate');
    }

    if (filterEndDate) {
      params.set('endDate', filterEndDate);
    } else {
      params.delete('endDate');
    }

    router.push(`${pathname}?${params.toString()}`);
  }, [filterStartDate, filterEndDate, router, pathname]);

  // WhatsApp Share States
  const [isWhatsappOpen, setIsWhatsappOpen] = useState(false);
  const [activeSale, setActiveSale] = useState<any>(null);
  const [phone, setPhone] = useState('');
  const [prospects, setProspects] = useState<any[]>([]);
  const [selectedProspectId, setSelectedProspectId] = useState<string>('');
  const [isLoadingProspects, setIsLoadingProspects] = useState(false);
  const [isSendingWhatsapp, setIsSendingWhatsapp] = useState(false);
  const [whatsappSuccess, setWhatsappSuccess] = useState(false);
  const [whatsappError, setWhatsappError] = useState<string | null>(null);

  // Email Share States
  const [isEmailOpen, setIsEmailOpen] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  // Delivery routing modal states
  const [selectedSaleForRoute, setSelectedSaleForRoute] = useState<any | null>(null);
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
    setSales(initialSales);
  }, [initialSales]);

  const handleOpenRouteModal = (sale: any) => {
    setSelectedSaleForRoute(sale);
    setRouteStreet(sale.customer?.street || '');
    setRouteExtNum(sale.customer?.exteriorNumber || '');
    setRouteIntNum(sale.customer?.interiorNumber || '');
    setRouteColonia(sale.customer?.neighborhood || '');
    setRouteCity(sale.customer?.city || 'Querétaro');
    setRouteState(sale.customer?.state || 'Querétaro');
    setRouteZip(sale.customer?.zipCode || '');
    setRouteLat(null);
    setRouteMaxTime('');
    setRouteLng(null);
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
    if (!selectedSaleForRoute) return;

    setIsCreatingRoute(true);
    try {
      const res = await createDeliveryOrder({
        saleId: selectedSaleForRoute.id,
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
        alert("Entrega programada exitosamente. Se ha agregado al módulo de Logística.");
        
        // Update local state to reflect the deliveryOrder assignment
        setSales(prev => prev.map(s => s.id === selectedSaleForRoute.id ? {
          ...s,
          deliveryOrder: { id: res.order!.id, status: 'PENDING' }
        } : s));
        
        setSelectedSaleForRoute(null);
      } else {
        alert("Error al programar entrega: " + res.error);
      }
    } catch (err: any) {
      alert("Excepción: " + err.message);
    } finally {
      setIsCreatingRoute(false);
    }
  };

  // Dynamic script loader for Google Maps in routing modal
  useEffect(() => {
    if (selectedSaleForRoute && !mapsLoaded) {
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
  }, [selectedSaleForRoute, mapsLoaded]);

  // Google Maps initialization inside routing modal
  useEffect(() => {
    if (selectedSaleForRoute && mapsLoaded && mapContainerRef.current && (window as any).google) {
      const google = (window as any).google;
      
      const defaultCenter = routeLat && routeLng 
        ? { lat: routeLat, lng: routeLng }
        : { lat: 20.5888, lng: -100.3899 }; // Queretaro

      const mapOptions = {
        center: defaultCenter,
        zoom: routeLat && routeLng ? 16 : 12,
        mapId: "DEMO_MAP_ID_VENTAS",
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
  }, [selectedSaleForRoute, mapsLoaded]);

  // Load prospects for WhatsApp Option B
  useEffect(() => {
    if (isWhatsappOpen && activeSale) {
      setPhone(activeSale.customer?.phone || '');
      setIsLoadingProspects(true);
      fetch(`/api/prospects?t=${Date.now()}`)
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error('Failed to load prospects');
        })
        .then((data) => {
          if (data.prospects) {
            setProspects(data.prospects);
            const matched = data.prospects.find(
              (p: any) =>
                (activeSale.customer?.phone && p.phone === activeSale.customer.phone) ||
                (activeSale.customer?.name && p.name?.toLowerCase().includes(activeSale.customer.name.toLowerCase()))
            );
            if (matched) {
              setSelectedProspectId(matched.id);
            } else if (data.prospects.length > 0) {
              setSelectedProspectId(data.prospects[0].id);
            }
          }
        })
        .catch((err) => console.error('Error fetching prospects:', err))
        .finally(() => setIsLoadingProspects(false));
    }
  }, [isWhatsappOpen, activeSale]);

  const getWhatsappMessage = (sale: any) => {
    if (!sale) return '';
    const formattedTotal = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(sale.total);
    const link = `${window.location.origin}/ventas/detalle/${sale.id}/imprimir`;
    const displayFolio = sale.folio || sale.id.slice(0, 8).toUpperCase();
    return `¡Hola ${sale.customer?.name || 'Cliente'}! Le comparto el comprobante de su compra en CAANMA.\n\n` +
      `*Folio de Venta:* #${displayFolio}\n` +
      `*Total:* ${formattedTotal}\n\n` +
      `Puede ver e imprimir su nota de venta en el siguiente enlace:\n${link}\n\n` +
      `¡Muchas gracias por su preferencia! Excelente día.`;
  };

  const handleOpenWhatsappModal = (sale: any) => {
    setActiveSale(sale);
    setPhone(sale.customer?.phone || '');
    setIsWhatsappOpen(true);
  };

  const handleOpenEmailModal = (sale: any) => {
    setActiveSale(sale);
    setEmailInput(sale.customer?.email || '');
    setIsEmailOpen(true);
  };

  const handleOpenWhatsAppWeb = () => {
    if (!activeSale) return;
    const cleanPhone = phone.replace(/\D/g, '');
    const finalPhone = cleanPhone.startsWith('52') ? cleanPhone : `52${cleanPhone}`;
    const text = encodeURIComponent(getWhatsappMessage(activeSale));
    window.open(`https://api.whatsapp.com/send?phone=${finalPhone}&text=${text}`, '_blank');
    setIsWhatsappOpen(false);
  };

  const handleSendViaCaanma = async () => {
    if (!selectedProspectId || !activeSale) return;
    const selectedProspect = prospects.find((p) => p.id === selectedProspectId);
    if (!selectedProspect) return;

    setIsSendingWhatsapp(true);
    setWhatsappError(null);

    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: selectedProspect.phone,
          message: getWhatsappMessage(activeSale),
          prospectId: selectedProspect.id,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setWhatsappSuccess(true);
        setTimeout(() => {
          setIsWhatsappOpen(false);
          setWhatsappSuccess(false);
        }, 1500);
      } else {
        throw new Error(data.error || 'Error al enviar mensaje');
      }
    } catch (err: any) {
      console.error(err);
      setWhatsappError(err.message || 'Error de red o de microservicio de WhatsApp desconectado.');
    } finally {
      setIsSendingWhatsapp(false);
    }
  };

  const handleSendEmail = async () => {
    if (!emailInput || !activeSale) return;
    setIsSendingEmail(true);
    setEmailError(null);
    try {
      const result = await sendSaleByEmail(activeSale.id, emailInput);
      if (result.success) {
        setEmailSuccess(true);
        setTimeout(() => {
          setIsEmailOpen(false);
          setEmailSuccess(false);
        }, 1500);
      } else {
        throw new Error(result.error || 'Error al enviar correo.');
      }
    } catch (e: any) {
      console.error(e);
      setEmailError(e.message || 'Error de red o SMTP no configurado.');
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Extract unique statuses present in sales
  const statuses = useMemo(() => {
    const sSet = new Set<string>();
    sales.forEach(s => {
      if (s.status) sSet.add(s.status);
    });
    sSet.add('COMPLETED');
    sSet.add('CANCELLED');
    return Array.from(sSet);
  }, [sales]);

  // Extract unique sellers present in sales
  const salesUsers = useMemo(() => {
    const userMap = new Map<string, string>();
    sales.forEach(s => {
      if (s.userId && s.user?.name) {
        userMap.set(s.userId, s.user.name);
      }
    });
    return Array.from(userMap.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [sales]);

  // Extract unique branches present in sales
  const salesBranches = useMemo(() => {
    const branchMap = new Map<string, string>();
    sales.forEach(s => {
      if (s.branchId && s.branch?.name) {
        branchMap.set(s.branchId, s.branch.name);
      }
    });
    return Array.from(branchMap.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [sales]);

  // Extract unique payment methods present in sales
  const salesPaymentMethods = useMemo(() => {
    const pmSet = new Set<string>();
    sales.forEach(s => {
      if (s.paymentMethod) pmSet.add(s.paymentMethod);
    });
    return Array.from(pmSet).sort((a, b) => 
      getPaymentMethodLabel(a).localeCompare(getPaymentMethodLabel(b))
    );
  }, [sales]);

  // Filter logic
  const filteredSales = useMemo(() => {
    return sales.filter(sale => {
      // Date filter (range)
      if (filterStartDate) {
        const saleDateStr = new Date(sale.createdAt).toLocaleDateString('sv-SE', { timeZone: timezone });
        if (saleDateStr < filterStartDate) return false;
      }
      if (filterEndDate) {
        const saleDateStr = new Date(sale.createdAt).toLocaleDateString('sv-SE', { timeZone: timezone });
        if (saleDateStr > filterEndDate) return false;
      }
      
      // User filter
      if (filterUser && sale.userId !== filterUser) {
        return false;
      }

      // Branch filter
      if (filterBranch && sale.branchId !== filterBranch) {
        return false;
      }

      // Status filter
      if (filterStatus && sale.status !== filterStatus) {
        return false;
      }

      // Client filter
      if (filterClient) {
        const clientName = sale.customer?.name || '';
        if (!clientName.toLowerCase().includes(filterClient.toLowerCase())) {
          return false;
        }
      }

      // CFDI filter
      if (filterCfdi) {
        const folioCfdi = sale.invoiceId || '';
        if (!folioCfdi.toLowerCase().includes(filterCfdi.toLowerCase())) {
          return false;
        }
      }

      // Payment Method filter
      if (filterPaymentMethod && sale.paymentMethod !== filterPaymentMethod) {
        return false;
      }

      return true;
    });
  }, [sales, filterStartDate, filterEndDate, filterUser, filterBranch, filterStatus, filterClient, filterCfdi, filterPaymentMethod, timezone]);

  const hasActiveFilters = filterStartDate || filterEndDate || filterUser || (currentBranch.id === 'GLOBAL' && filterBranch) || filterStatus || filterClient || filterCfdi || filterPaymentMethod;

  const handleClearFilters = () => {
    setFilterStartDate('');
    setFilterEndDate('');
    setFilterUser('');
    setFilterBranch(currentBranch.id === 'GLOBAL' ? '' : currentBranch.id);
    setFilterStatus('');
    setFilterClient('');
    setFilterCfdi('');
    setFilterPaymentMethod('');
  };

  const downloadExcel = () => {
    const headers = [
      "ID Venta",
      "Fecha / Hora",
      "Cliente",
      "Folio CFDI",
      "Sucursal",
      "Vendedor",
      "Método de Pago",
      "Total",
      "Estado"
    ];
    const rows = filteredSales.map(sale => {
      return [
        sale.folio || sale.id.slice(0, 8).toUpperCase(),
        formatDateCompact(sale.createdAt, timezone),
        sale.customer ? sale.customer.name : 'Público en General',
        sale.invoiceFolio || sale.invoiceId || '-',
        sale.branch ? sale.branch.name : '-',
        sale.user ? sale.user.name : '-',
        getPaymentMethodLabel(sale.paymentMethod),
        sale.total,
        sale.status === 'COMPLETED' ? 'Completado' : sale.status === 'CANCELLED' ? 'Cancelado' : sale.status
      ];
    });
    exportToExcel(headers, rows, 'Historial_de_Ventas');
  };

  return (
    <div>
      <div className="page-header-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 className="page-header-title" style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>Historial de Ventas</h1>
          <p className="page-header-subtitle" style={{ color: 'var(--caanma-text-muted)', margin: 0 }}>Módulo de ventas y cortes de caja</p>
        </div>
        <div className="page-header-actions" style={{ display: 'flex', gap: '0.75rem' }}>
          <button 
            onClick={downloadExcel}
            className="btn-secondary"
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              padding: '0.75rem 1.5rem', 
              borderRadius: '8px', 
              fontWeight: 'bold', 
              cursor: 'pointer', 
              border: '1px solid var(--caanma-border)', 
              backgroundColor: 'white', 
              color: '#334155', 
              transition: 'all 0.2s' 
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor='#f8fafc'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor='white'}
          >
            <Download size={18} /> Exportar Excel
          </button>
          <Link href="/ventas/nueva" className="btn-primary" style={{ padding: '0.75rem 1.5rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            + Nueva Venta / TPV
          </Link>
        </div>
      </div>

      {/* Mobile Filters Toggle Button */}
      <button
        onClick={() => setShowFiltersMobile(!showFiltersMobile)}
        className="mobile-filters-toggle-btn"
        style={{
          width: '100%',
          padding: '0.75rem',
          borderRadius: '8px',
          backgroundColor: '#f1f5f9',
          border: '1px solid #cbd5e1',
          color: '#334155',
          fontWeight: '600',
          display: 'none', // Shown on mobile via CSS
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          marginBottom: '1rem',
          cursor: 'pointer',
          outline: 'none'
        }}
      >
        <Filter size={16} />
        {showFiltersMobile ? 'Ocultar Filtros' : 'Mostrar Filtros'}
      </button>

      {/* Filters Section */}
      <div 
        className={`filters-section-grid ${showFiltersMobile ? 'mobile-show' : ''}`}
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
          gap: '1rem', 
          marginBottom: '1.5rem', 
          padding: '1.25rem', 
          backgroundColor: '#f8fafc', 
          borderRadius: '12px', 
          border: '1px solid var(--caanma-border)' 
        }}
      >
        {/* Date Filter: Start */}
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', fontWeight: '600', color: 'var(--caanma-text-muted)', marginBottom: '0.5rem' }}>
            <Calendar size={14} /> Fecha Inicio
          </label>
          <input 
            type="date" 
            value={filterStartDate} 
            onChange={(e) => setFilterStartDate(e.target.value)} 
            style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid var(--caanma-border)', outline: 'none', backgroundColor: 'white', fontSize: '0.9rem' }} 
          />
        </div>

        {/* Date Filter: End */}
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', fontWeight: '600', color: 'var(--caanma-text-muted)', marginBottom: '0.5rem' }}>
            <Calendar size={14} /> Fecha Fin
          </label>
          <input 
            type="date" 
            value={filterEndDate} 
            onChange={(e) => setFilterEndDate(e.target.value)} 
            style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid var(--caanma-border)', outline: 'none', backgroundColor: 'white', fontSize: '0.9rem' }} 
          />
        </div>

        {/* Client Filter */}
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', fontWeight: '600', color: 'var(--caanma-text-muted)', marginBottom: '0.5rem' }}>
            <User size={14} /> Cliente
          </label>
          <input 
            type="text" 
            placeholder="Buscar por cliente" 
            value={filterClient} 
            onChange={(e) => setFilterClient(e.target.value)} 
            style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid var(--caanma-border)', outline: 'none', backgroundColor: 'white', fontSize: '0.9rem' }} 
          />
        </div>

        {/* CFDI Filter */}
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', fontWeight: '600', color: 'var(--caanma-text-muted)', marginBottom: '0.5rem' }}>
            <Receipt size={14} /> Folio CFDI
          </label>
          <input 
            type="text" 
            placeholder="Buscar folio CFDI" 
            value={filterCfdi} 
            onChange={(e) => setFilterCfdi(e.target.value)} 
            style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid var(--caanma-border)', outline: 'none', backgroundColor: 'white', fontSize: '0.9rem' }} 
          />
        </div>

        {/* Seller Filter */}
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', fontWeight: '600', color: 'var(--caanma-text-muted)', marginBottom: '0.5rem' }}>
            <User size={14} /> Vendedor
          </label>
          <select 
            value={filterUser} 
            onChange={(e) => setFilterUser(e.target.value)} 
            style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid var(--caanma-border)', outline: 'none', backgroundColor: 'white', fontSize: '0.9rem' }}
          >
            <option value="">Todos los vendedores</option>
            {salesUsers.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>

        {/* Branch Filter */}
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', fontWeight: '600', color: 'var(--caanma-text-muted)', marginBottom: '0.5rem' }}>
            <MapPin size={14} /> Sucursal
          </label>
          <select 
            value={filterBranch} 
            onChange={(e) => setFilterBranch(e.target.value)} 
            disabled={currentBranch.id !== 'GLOBAL'}
            style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid var(--caanma-border)', outline: 'none', backgroundColor: currentBranch.id !== 'GLOBAL' ? '#f1f5f9' : 'white', fontSize: '0.9rem' }}
          >
            {currentBranch.id === 'GLOBAL' ? (
              <>
                <option value="">Todas las sucursales</option>
                {salesBranches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </>
            ) : (
              <option value={currentBranch.id}>{currentBranch.name}</option>
            )}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', fontWeight: '600', color: 'var(--caanma-text-muted)', marginBottom: '0.5rem' }}>
            <Tag size={14} /> Estado
          </label>
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)} 
            style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid var(--caanma-border)', outline: 'none', backgroundColor: 'white', fontSize: '0.9rem' }}
          >
            <option value="">Todos los estados</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status === 'COMPLETED' ? 'Completado' : status === 'CANCELLED' ? 'Cancelado' : status}
              </option>
            ))}
          </select>
        </div>

        {/* Payment Method Filter */}
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', fontWeight: '600', color: 'var(--caanma-text-muted)', marginBottom: '0.5rem' }}>
            <Receipt size={14} /> Método de Pago
          </label>
          <select 
            value={filterPaymentMethod} 
            onChange={(e) => setFilterPaymentMethod(e.target.value)} 
            style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid var(--caanma-border)', outline: 'none', backgroundColor: 'white', fontSize: '0.9rem' }}
          >
            <option value="">Todos los métodos</option>
            {salesPaymentMethods.map((pm) => (
              <option key={pm} value={pm}>{getPaymentMethodLabel(pm)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
          <button 
            type="button" 
            onClick={handleClearFilters}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.5rem 1rem', fontSize: '0.85rem', color: '#dc2626', backgroundColor: '#fee2e2', border: '1px solid #fecaca', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }}
          >
            <RotateCcw size={14} /> Limpiar Filtros
          </button>
        </div>
      )}

      <div className="card" style={{ padding: '0', overflow: 'visible', width: '100%', maxWidth: '100%', height: 'auto' }}>
        <div className="table-responsive">
          <style dangerouslySetInnerHTML={{__html: `
            @media (min-width: 769px) {
              .desktop-compact-table {
                min-width: 950px !important;
              }
              .desktop-compact-table td {
                white-space: nowrap !important;
                padding: 0.3rem 0.45rem !important;
              }
              .desktop-compact-inline {
                display: inline-block !important;
              }
              .desktop-compact-flex {
                display: inline-flex !important;
              }
            }
          `}} />
          <table className="responsive-table desktop-compact-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
            <tr style={{ borderBottom: '1px solid var(--caanma-border)', backgroundColor: '#f9fafb' }}>
              <th style={{ padding: '0.4rem 0.5rem', color: 'var(--caanma-text-muted)', fontWeight: '500', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>ID Venta</th>
              <th style={{ padding: '0.4rem 0.5rem', color: 'var(--caanma-text-muted)', fontWeight: '500', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>Fecha / Hora</th>
              <th style={{ padding: '0.4rem 0.5rem', color: 'var(--caanma-text-muted)', fontWeight: '500', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>Cliente</th>
              <th style={{ padding: '0.4rem 0.5rem', color: 'var(--caanma-text-muted)', fontWeight: '500', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>Folio CFDI</th>
              <th style={{ padding: '0.4rem 0.5rem', color: 'var(--caanma-text-muted)', fontWeight: '500', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>Sucursal / Vendedor</th>
              <th style={{ padding: '0.4rem 0.5rem', color: 'var(--caanma-text-muted)', fontWeight: '500', textAlign: 'right', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>Artículos</th>
              <th style={{ padding: '0.4rem 0.5rem', color: 'var(--caanma-text-muted)', fontWeight: '500', textAlign: 'right', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>Total</th>
              <th style={{ padding: '0.4rem 0.5rem', color: 'var(--caanma-text-muted)', fontWeight: '500', textAlign: 'center', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>Estado</th>
              <th style={{ padding: '0.4rem 0.5rem', color: 'var(--caanma-text-muted)', fontWeight: '500', textAlign: 'center', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredSales.map(sale => {
              const qtySum = sale.items.reduce((sum: number, item: any) => sum + item.quantity, 0);
              return (
                <tr key={sale.id} style={{ borderBottom: '1px solid var(--caanma-border)' }}>
                  <td data-label="ID Venta" style={{ padding: '0.3rem 0.45rem', fontFamily: 'monospace', fontWeight: 'bold', fontSize: '0.82rem' }}>
                    <span>{sale.folio || sale.id.slice(0, 8).toUpperCase()}</span>
                  </td>
                  <td data-label="Fecha / Hora" style={{ padding: '0.3rem 0.45rem', fontSize: '0.82rem', color: '#475569' }}>
                    <span>{formatDateCompact(sale.createdAt, timezone)}</span>
                  </td>
                  <td data-label="Cliente" style={{ padding: '0.3rem 0.45rem' }}>
                    <div 
                      title={sale.customer ? sale.customer.name : 'Público General'} 
                      className="desktop-compact-inline"
                      style={{ fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '130px', fontSize: '0.82rem' }}
                    >
                      {sale.customer ? sale.customer.name : 'Público General'}
                    </div>
                  </td>
                  <td data-label="Folio CFDI" style={{ padding: '0.3rem 0.45rem' }}>
                    {sale.invoiceId ? (
                      <a 
                        href={`/api/facturacion/download?invoiceId=${sale.invoiceId}&format=pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="desktop-compact-inline"
                        style={{ 
                          fontFamily: 'monospace', 
                          fontSize: '0.78rem', 
                          fontWeight: 'bold', 
                          color: '#1d4ed8', 
                          backgroundColor: '#eff6ff', 
                          border: '1px solid #bfdbfe',
                          padding: '0.15rem 0.35rem', 
                          borderRadius: '4px',
                          textDecoration: 'none'
                        }} 
                        title="Ver PDF de la Factura (CFDI)"
                      >
                        {sale.invoiceFolio || sale.invoiceId.substring(0, 8).toUpperCase()}
                      </a>
                    ) : (
                      <span style={{ color: 'var(--caanma-text-muted)', fontSize: '0.82rem' }}>-</span>
                    )}
                  </td>
                  <td data-label="Sucursal / Vendedor" style={{ padding: '0.3rem 0.45rem' }}>
                    <div className="desktop-compact-flex" style={{ flexDirection: 'column', alignItems: 'flex-end', minWidth: 0 }}>
                      <div 
                        title={sale.branch?.name || currentBranch.name} 
                        style={{ fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '110px', fontSize: '0.82rem' }}
                      >
                        {sale.branch?.name || currentBranch.name}
                      </div>
                      <div 
                        title={`Vendió: ${sale.user.name}`} 
                        style={{ fontSize: '0.72rem', color: 'var(--caanma-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '110px' }}
                      >
                        Vendió: {sale.user.name}
                      </div>
                    </div>
                  </td>
                  <td data-label="Artículos" style={{ padding: '0.3rem 0.45rem', textAlign: 'right', color: 'var(--caanma-text-muted)', fontSize: '0.82rem' }}>
                    <span>{new Intl.NumberFormat('es-MX').format(qtySum)} Pzas</span>
                  </td>
                  <td data-label="Total" style={{ padding: '0.3rem 0.45rem', textAlign: 'right', fontWeight: 'bold', fontSize: '0.82rem' }}>
                    <div className="desktop-compact-flex" style={{ flexDirection: 'column', alignItems: 'flex-end', minWidth: 0 }}>
                      <div style={{ whiteSpace: 'nowrap' }}>{formatCurrency(sale.total)}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--caanma-text-muted)', fontWeight: 'normal', marginTop: '0.1rem', whiteSpace: 'nowrap' }}>
                        {getPaymentMethodLabel(sale.paymentMethod)}
                      </div>
                    </div>
                  </td>
                  <td data-label="Estado" style={{ padding: '0.3rem 0.45rem', textAlign: 'center' }}>
                    <span style={{ 
                      padding: '0.15rem 0.35rem', 
                      borderRadius: '12px', 
                      fontSize: '0.7rem',
                      fontWeight: 'bold',
                      backgroundColor: sale.status === 'COMPLETED' ? '#dcfce7' : sale.status === 'CANCELLED' ? '#fee2e2' : '#f1f5f9',
                      color: sale.status === 'COMPLETED' ? '#166534' : sale.status === 'CANCELLED' ? '#991b1b' : '#334155'
                    }}>
                      {sale.status === 'COMPLETED' ? 'Completado' : sale.status === 'CANCELLED' ? 'Cancelado' : sale.status}
                    </span>
                  </td>
                  <td data-label="Acciones" style={{ padding: '0.3rem 0.45rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '0.2rem', justifyContent: 'center', flexWrap: 'nowrap', alignItems: 'center' }}>
                      {/* Detalle */}
                      <Link
                        href={`/ventas/detalle/${sale.id}`}
                        title="Ver Detalle"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '26px',
                          height: '26px',
                          backgroundColor: '#f1f5f9',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          color: '#334155',
                          textDecoration: 'none',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#e2e8f0';
                          e.currentTarget.style.borderColor = '#94a3b8';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#f1f5f9';
                          e.currentTarget.style.borderColor = '#cbd5e1';
                        }}
                      >
                        <Eye size={13} />
                      </Link>

                      {/* Imprimir A4 */}
                      <a
                        href={`/ventas/detalle/${sale.id}/imprimir`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Imprimir Nota (A4)"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '26px',
                          height: '26px',
                          backgroundColor: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          color: '#475569',
                          textDecoration: 'none',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#f1f5f9';
                          e.currentTarget.style.borderColor = '#cbd5e1';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#f8fafc';
                          e.currentTarget.style.borderColor = '#e2e8f0';
                        }}
                      >
                        <Printer size={13} />
                      </a>

                      {/* Ticket */}
                      <a
                        href={`/ventas/detalle/${sale.id}/imprimir-ticket`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Imprimir Ticket Térmico"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '26px',
                          height: '26px',
                          backgroundColor: '#f1f5f9',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          color: '#334155',
                          textDecoration: 'none',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#e2e8f0';
                          e.currentTarget.style.borderColor = '#94a3b8';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#f1f5f9';
                          e.currentTarget.style.borderColor = '#cbd5e1';
                        }}
                      >
                        <Receipt size={13} />
                      </a>

                      {/* WhatsApp */}
                      <button
                        onClick={() => handleOpenWhatsappModal(sale)}
                        title="Compartir por WhatsApp"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '26px',
                          height: '26px',
                          backgroundColor: '#e6f4ea',
                          border: '1px solid #c2e7cc',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          color: '#137333',
                          transition: 'all 0.15s ease',
                          padding: 0
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#d2e3d6';
                          e.currentTarget.style.borderColor = '#99d2aa';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#e6f4ea';
                          e.currentTarget.style.borderColor = '#c2e7cc';
                        }}
                      >
                        <Share2 size={13} />
                      </button>

                      {/* Enviar por mail */}
                      <button
                        onClick={() => handleOpenEmailModal(sale)}
                        title="Enviar por Correo Electrónico"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '26px',
                          height: '26px',
                          backgroundColor: '#eff6ff',
                          border: '1px solid #bfdbfe',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          color: '#1d4ed8',
                          transition: 'all 0.15s ease',
                          padding: 0
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#dbeafe';
                          e.currentTarget.style.borderColor = '#93c5fd';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#eff6ff';
                          e.currentTarget.style.borderColor = '#bfdbfe';
                        }}
                      >
                        <Mail size={13} />
                      </button>

                      {/* Programar Entrega / Ruta */}
                      {sale.status !== 'CANCELLED' && (
                        sale.deliveryOrder ? (
                          <Link
                            href="/logistica"
                            title={`Ver Entrega (${sale.deliveryOrder.status})`}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '26px',
                              height: '26px',
                              backgroundColor: '#e0f2fe',
                              border: '1px solid #bae6fd',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              color: '#0369a1',
                              transition: 'all 0.15s ease',
                              textDecoration: 'none'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#bae6fd';
                              e.currentTarget.style.borderColor = '#7dd3fc';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#e0f2fe';
                              e.currentTarget.style.borderColor = '#bae6fd';
                            }}
                          >
                            <Truck size={13} />
                          </Link>
                        ) : (
                          <button
                            onClick={() => handleOpenRouteModal(sale)}
                            title="Programar Entrega a Domicilio"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '26px',
                              height: '26px',
                              backgroundColor: '#faf5ff',
                              border: '1px solid #e9d5ff',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              color: '#7e22ce',
                              transition: 'all 0.15s ease',
                              padding: 0
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#f3e8ff';
                              e.currentTarget.style.borderColor = '#d8b4fe';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#faf5ff';
                              e.currentTarget.style.borderColor = '#e9d5ff';
                            }}
                          >
                            <Truck size={13} />
                          </button>
                        )
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
            {filteredSales.length === 0 && (
              <tr>
                <td colSpan={9} style={{ padding: '3rem', textAlign: 'center', color: 'var(--caanma-text-muted)' }}>
                  No se encontraron ventas con los filtros seleccionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>

      {/* Modern Share Modal */}
      {isWhatsappOpen && activeSale && (
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
          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes scaleIn {
              from { transform: scale(0.95); opacity: 0; }
              to { transform: scale(1); opacity: 1; }
            }
          `}</style>
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '520px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              animation: 'scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid #f1f5f9',
                background: 'linear-gradient(135deg, #128c7e 0%, #075e54 100%)',
                color: 'white',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  💬 Compartir Venta #{activeSale.folio || activeSale.id.slice(0, 8).toUpperCase()}
                </h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', opacity: 0.9 }}>
                  Elige la forma preferida de enviarle el comprobante a tu cliente.
                </p>
              </div>
              <button
                onClick={() => setIsWhatsappOpen(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  color: 'white',
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

            {/* Modal Body */}
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Option 1: WhatsApp Web / Direct Link */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem', backgroundColor: '#f8fafc' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#1e293b', fontWeight: '700' }}>
                  Opción A: Abrir en WhatsApp Web / App
                </h4>
                <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.775rem', color: '#64748b', lineHeight: '1.4' }}>
                  Ideal para enviar desde tu propio teléfono o tu cuenta de WhatsApp Web de forma instantánea.
                </p>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="tel"
                    placeholder="Número de Teléfono (ej. 4421234567)"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '0.5rem 0.75rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.875rem',
                      outline: 'none',
                    }}
                  />
                  <button
                    onClick={handleOpenWhatsAppWeb}
                    disabled={!phone}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: '#25d366',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: '700',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#128c7e')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#25d366')}
                  >
                    Abrir Chat <Send size={14} />
                  </button>
                </div>
              </div>

              {/* Option 2: Send from CAANMA Inbox */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem', backgroundColor: '#f8fafc' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#1e293b', fontWeight: '700' }}>
                  Opción B: Enviar desde la Bandeja de CAANMA
                </h4>
                <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.775rem', color: '#64748b', lineHeight: '1.4' }}>
                  Envía el link directamente usando la sesión de WhatsApp vinculada en la plataforma.
                </p>

                {isLoadingProspects ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.85rem' }}>
                    <Loader2 size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} /> Cargando chats de la bandeja...
                  </div>
                ) : prospects.length === 0 ? (
                  <div style={{ fontSize: '0.85rem', color: '#ef4444', fontWeight: '500' }}>
                    ⚠️ No hay chats activos en la bandeja de WhatsApp para vincular. Por favor usa la Opción A.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <select
                      value={selectedProspectId}
                      onChange={(e) => setSelectedProspectId(e.target.value)}
                      style={{
                        padding: '0.5rem',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.875rem',
                        outline: 'none',
                        backgroundColor: 'white',
                      }}
                    >
                      {prospects.map((p: any) => (
                        <option key={p.id} value={p.id}>
                          {p.name || 'Chat sin Nombre'} ({p.phone})
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={handleSendViaCaanma}
                      disabled={isSendingWhatsapp || !selectedProspectId || whatsappSuccess}
                      style={{
                        padding: '0.6rem 1rem',
                        backgroundColor: '#075e54',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: '700',
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#053e37')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#075e54')}
                    >
                      {isSendingWhatsapp ? (
                        <>
                          <Loader2 size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                          Enviando...
                        </>
                      ) : whatsappSuccess ? (
                        <>
                          <CheckCircle size={16} color="#4ade80" /> ¡Enviado con Éxito!
                        </>
                      ) : (
                        <>
                          Enviar Directo desde CAANMA <Send size={14} />
                        </>
                      )}
                    </button>
                  </div>
                )}

                {whatsappError && (
                  <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '6px', fontSize: '0.775rem', color: '#b91c1c' }}>
                    {whatsappError}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Email Share Modal */}
      {isEmailOpen && activeSale && (
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
              borderRadius: '16px',
              width: '100%',
              maxWidth: '480px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              animation: 'scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid #f1f5f9',
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                color: 'white',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  ✉️ Enviar Venta por Correo
                </h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', opacity: 0.9 }}>
                  Envía el comprobante de venta digital a tu cliente.
                </p>
              </div>
              <button
                onClick={() => setIsEmailOpen(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  color: 'white',
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

            {/* Modal Body */}
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#475569' }}>Correo Destinatario</label>
                <input
                  type="email"
                  placeholder="ejemplo@correo.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  style={{
                    padding: '0.625rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
              </div>

              {emailError && (
                <div style={{ padding: '0.5rem 0.75rem', backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '6px', fontSize: '0.775rem', color: '#b91c1c' }}>
                  {emailError}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  onClick={() => setIsEmailOpen(false)}
                  style={{
                    padding: '0.5rem 1rem',
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
                  onClick={handleSendEmail}
                  disabled={isSendingEmail || !emailInput || emailSuccess}
                  style={{
                    padding: '0.5rem 1.25rem',
                    backgroundColor: '#1d4ed8',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1e40af')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1d4ed8')}
                >
                  {isSendingEmail ? (
                    <>
                      <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                      Enviando...
                    </>
                  ) : emailSuccess ? (
                    <>
                      <CheckCircle size={14} color="#4ade80" /> ¡Enviado!
                    </>
                  ) : (
                    <>
                      Enviar <Send size={12} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Interactive Delivery Routing Modal */}
      {selectedSaleForRoute && (
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
                  <Truck size={20} /> Programar Entrega a Domicilio
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#f3e8ff' }}>
                  Folio de Venta: {selectedSaleForRoute.folio || selectedSaleForRoute.id.slice(0, 8)}
                </span>
              </div>
              <button
                onClick={() => setSelectedSaleForRoute(null)}
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
                    <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#475569' }}>Calle / Av.</label>
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
                    onClick={() => setSelectedSaleForRoute(null)}
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
