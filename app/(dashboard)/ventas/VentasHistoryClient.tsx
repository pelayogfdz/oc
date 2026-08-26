'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Eye, Printer, RotateCcw, Calendar, User, MapPin, Tag, Receipt, Send, Share2, Loader2, CheckCircle, Mail, Download, X, AlertTriangle, Filter, Truck } from 'lucide-react';
import { sendSaleByEmail, getSalesForExport } from '@/app/actions/sale';
import { createDeliveryOrder } from '@/app/actions/logistica';
import { formatCurrency } from '@/lib/utils';
import { exportToExcel } from '@/lib/exportExcel';
import { checkDocumentSatStatus } from '@/app/actions/facturacion';
import { useOfflineSync } from '@/app/components/OfflineSyncProvider';

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

const printSaleOffline = (sale: any, isTicket: boolean) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const itemsTotal = sale.items.reduce((sum: number, item: any) => sum + ((item.quantity || 0) * (item.price || 0)), 0);
  const discount = Math.max(0, itemsTotal - (sale.total || 0));

  const itemsHtml = sale.items.map((item: any) => {
    const desc = item.productName || item.product?.name || 'Producto';
    const variantStr = item.variantAttribute || (item.variant && item.variant.attribute) ? `<div style="font-size: 0.85em; color: #555;">Var: ${item.variantAttribute || item.variant.attribute}</div>` : '';
    const sku = item.productSku || (item.product && item.product.sku) || '';
    const code = item.productBarcode || (item.product && item.product.barcode) || '';
    const skuCodeStr = (sku || code) ? `<div style="font-size: 0.8em; color: #888;">SKU: ${sku || '-'} | Código: ${code || '-'}</div>` : '';
    
    if (isTicket) {
      return `
        <tr>
          <td style="padding: 4px 0;">
            <div>${desc}</div>
            ${variantStr}
            <div style="font-size: 0.9em;">${item.quantity} x ${item.price ? item.price.toFixed(2) : '0.00'}</div>
          </td>
          <td style="text-align: right; padding: 4px 0; vertical-align: bottom;">
            ${((item.quantity || 0) * (item.price || 0)).toFixed(2)}
          </td>
        </tr>
      `;
    } else {
      return `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 12px 8px;">
            <div style="font-weight: bold; color: #1e293b;">${desc}</div>
            ${variantStr}
            ${skuCodeStr}
          </td>
          <td style="padding: 12px 8px; text-align: center; font-weight: bold;">${item.quantity}</td>
          <td style="padding: 12px 8px; text-align: right;">${item.price ? item.price.toFixed(2) : '0.00'}</td>
          <td style="padding: 12px 8px; text-align: right; font-weight: bold;">${((item.quantity || 0) * (item.price || 0)).toFixed(2)}</td>
        </tr>
      `;
    }
  }).join('');

  const htmlContent = isTicket ? `
    <html>
      <head>
        <title>Imprimir Ticket</title>
        <style>
          body {
            font-family: 'Courier New', Courier, monospace;
            font-size: 12px;
            line-height: 1.4;
            width: 280px;
            margin: 0;
            padding: 10px;
            color: black;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          hr { border: none; border-top: 1px dashed black; margin: 10px 0; }
          table { width: 100%; border-collapse: collapse; }
          th { text-align: left; }
        </style>
      </head>
      <body>
        <div class="center bold" style="font-size: 16px;">OFFICE CITY</div>
        <div class="center">Folio: ${sale.folio}</div>
        <div class="center">Fecha: ${new Date(sale.createdAt).toLocaleString()}</div>
        <div class="center">Vendedor: ${sale.user?.name || sale.userName || 'Usuario'}</div>
        <hr/>
        <div><strong>Cliente:</strong> ${sale.customer?.name || sale.customerName || 'Público en General'}</div>
        <hr/>
        <table>
          <thead>
            <tr>
              <th>Artículo</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        <hr/>
        <table style="font-weight: bold; font-size: 13px;">
          <tr style="font-weight: normal; font-size: 11px;">
            <td>Subtotal:</td>
            <td style="text-align: right;">${itemsTotal.toFixed(2)}</td>
          </tr>
          ${discount > 0.01 ? `
          <tr style="font-weight: normal; font-size: 11px; color: red;">
            <td>Descuento:</td>
            <td style="text-align: right;">-${discount.toFixed(2)}</td>
          </tr>
          ` : ''}
          <tr>
            <td>TOTAL:</td>
            <td style="text-align: right;">${sale.total.toFixed(2)}</td>
          </tr>
        </table>
        <hr/>
        <div class="center bold">¡GRACIAS POR SU COMPRA!</div>
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          };
        </script>
      </body>
    </html>
  ` : `
    <html>
      <head>
        <title>Nota de Venta</title>
        <style>
          body {
            font-family: system-ui, -apple-system, sans-serif;
            color: #1e293b;
            margin: 0;
            padding: 40px;
            line-height: 1.5;
          }
          .header { display: flex; justify-content: space-between; margin-bottom: 40px; border-bottom: 2px solid #cbd5e1; padding-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background-color: #f8fafc; color: #475569; padding: 12px 8px; border-bottom: 2px solid #cbd5e1; text-align: left; }
          td { border-bottom: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 style="margin: 0; color: #7c3aed; font-size: 28px;">Nota de Venta</h1>
            <p style="margin: 5px 0 0 0; color: #64748b; font-weight: bold;">Folio: ${sale.folio}</p>
            <p style="margin: 3px 0 0 0; color: #64748b;">Fecha: ${new Date(sale.createdAt).toLocaleString()}</p>
          </div>
          <div style="text-align: right;">
            <h2 style="margin: 0; color: #1e293b; font-size: 20px;">OFFICE CITY</h2>
            <p style="margin: 5px 0 0 0; font-size: 14px; color: #475569;">Cliente: ${sale.customer?.name || sale.customerName || 'Público en General'}</p>
            <p style="margin: 3px 0 0 0; font-size: 14px; color: #475569;">Atendido por: ${sale.user?.name || sale.userName || 'Usuario'}</p>
          </div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Descripción del Artículo</th>
              <th style="text-align: center;">Cant.</th>
              <th style="text-align: right;">Precio Unit.</th>
              <th style="text-align: right;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        
        <div style="display: flex; justify-content: flex-end; margin-top: 30px;">
          <div style="width: 250px; font-size: 16px;">
            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
              <span style="color: #64748b;">Subtotal:</span>
              <span>${itemsTotal.toFixed(2)}</span>
            </div>
            ${discount > 0.01 ? `
            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; color: #dc2626;">
              <span>Descuento:</span>
              <span>-${discount.toFixed(2)}</span>
            </div>
            ` : ''}
            <div style="display: flex; justify-content: space-between; padding: 12px 0; font-weight: bold; font-size: 20px; color: #0ea5e9;">
              <span>Pago Total:</span>
              <span>${sale.total.toFixed(2)}</span>
            </div>
          </div>
        </div>
        
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
};

export default function VentasHistoryClient({
  initialSales,
  branches,
  users,
  currentBranch,
  timezone,
  totalCount = 0,
  currentPage = 1,
  totalPages = 1,
  pageSize = 50,
  queryParams = {}
}: {
  initialSales: any[];
  branches: any[];
  users: any[];
  currentBranch: any;
  timezone: string;
  totalCount?: number;
  currentPage?: number;
  totalPages?: number;
  pageSize?: number;
  queryParams?: any;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const { isOnline } = useOfflineSync();
  const [selectedSaleForOfflineDetail, setSelectedSaleForOfflineDetail] = useState<any | null>(null);
  const [selectedSaleWithProducts, setSelectedSaleWithProducts] = useState<any | null>(null);
  const [isOfflineCancelling, setIsOfflineCancelling] = useState(false);

  const [sales, setSales] = useState<any[]>(initialSales);

  useEffect(() => {
    if (!isOnline) {
      import('@/lib/offlineDB').then(({ db }) => {
        db.sales.orderBy('createdAt').reverse().toArray().then(localSales => {
          if (localSales && localSales.length > 0) {
            const mapped = localSales.map(ls => ({
              id: ls.id,
              folio: ls.folio,
              createdAt: ls.createdAt,
              userId: ls.userId,
              branchId: ls.branchId,
              total: ls.total,
              status: ls.status,
              paymentMethod: ls.paymentMethod,
              invoiceId: ls.invoiceId,
              invoiceFolio: ls.invoiceFolio,
              cancellationStatus: ls.cancellationStatus,
              notes: ls.notes || '',
              customer: ls.customerId ? {
                id: ls.customerId,
                name: ls.customerName || 'Cliente'
              } : null,
              user: {
                id: ls.userId,
                name: ls.userName || 'Usuario'
              },
              branch: {
                id: ls.branchId,
                name: ls.branchName || 'Sucursal'
              },
              items: ls.items.map(item => ({
                id: item.id,
                productId: item.productId,
                quantity: item.quantity,
                price: item.price,
                productName: item.productName,
                productSku: item.productSku,
                productBarcode: item.productBarcode,
                variantAttribute: item.variantAttribute
              }))
            }));
            setSales(mapped);
          }
        });
      });
    } else {
      setSales(initialSales);
    }
  }, [isOnline, initialSales]);

  useEffect(() => {
    if (selectedSaleForOfflineDetail) {
      const resolveSaleProducts = async () => {
        const { db } = await import('@/lib/offlineDB');
        const resolvedItems = [];
        for (const item of selectedSaleForOfflineDetail.items) {
          if (item.productName || (item.product && item.product.name)) {
            resolvedItems.push({
              ...item,
              productName: item.productName || item.product.name,
              productSku: item.productSku || item.product.sku || null,
              productBarcode: item.productBarcode || item.product.barcode || null,
              variantAttribute: item.variantAttribute || (item.variant && item.variant.attribute) || null
            });
            continue;
          }
          const localProd = await db.products.get(item.productId);
          let resolvedVariant = null;
          if (item.variantId && localProd && localProd.variants) {
            resolvedVariant = localProd.variants.find((v: any) => v.id === item.variantId);
          }
          resolvedItems.push({
            ...item,
            productName: localProd ? localProd.name : 'Producto',
            productSku: localProd ? localProd.sku : null,
            productBarcode: localProd ? localProd.barcode : null,
            variantAttribute: resolvedVariant ? resolvedVariant.attribute : null
          });
        }
        setSelectedSaleWithProducts({
          ...selectedSaleForOfflineDetail,
          items: resolvedItems
        });
      };
      resolveSaleProducts();
    } else {
      setSelectedSaleWithProducts(null);
    }
  }, [selectedSaleForOfflineDetail]);

  const handleOfflineCancel = async (sale: any) => {
    if (!confirm('¿ESTÁS SEGURO DE CANCELAR ESTA VENTA OFFLINE? El cambio se registrará en local y se sincronizará cuando recuperes conexión.')) return;
    
    setIsOfflineCancelling(true);
    try {
      const { db } = await import('@/lib/offlineDB');
      const isOfflineCreated = sale.id.startsWith('OFFLINE-') || sale.isOffline;
      
      if (isOfflineCreated) {
        await db.pendingSales.delete(sale.id);
        setOfflineSales(prev => prev.filter(s => s.id !== sale.id));
        alert('Venta offline descartada/cancelada exitosamente.');
      } else {
        await db.pendingSales.add({
          id: sale.id,
          type: 'CANCEL',
          items: [],
          total: sale.total,
          paymentMethod: sale.paymentMethod,
          timestamp: new Date().toISOString(),
          synced: false,
          retryCount: 0,
          failed: false
        } as any);
        
        await db.sales.update(sale.id, { status: 'CANCELLED' });
        
        setSales(prev => prev.map(s => s.id === sale.id ? { ...s, status: 'CANCELLED' } : s));
        alert('Cancelación registrada localmente. Se aplicará en el servidor al sincronizar.');
      }
      
      setSelectedSaleForOfflineDetail(null);
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setIsOfflineCancelling(false);
    }
  };
  const [offlineSales, setOfflineSales] = useState<any[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [filterStartDate, setFilterStartDate] = useState(queryParams.startDate || '');
  const [filterEndDate, setFilterEndDate] = useState(queryParams.endDate || '');
  const [filterUser, setFilterUser] = useState(queryParams.userId || '');
  const [filterBranch, setFilterBranch] = useState(queryParams.branchId || (currentBranch.id === 'GLOBAL' ? '' : currentBranch.id));
  const [filterStatus, setFilterStatus] = useState(queryParams.status || '');
  const [filterClient, setFilterClient] = useState(queryParams.client || '');
  const [filterCfdi, setFilterCfdi] = useState(queryParams.cfdi || '');
  const [filterFolio, setFilterFolio] = useState(queryParams.folio || '');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState(queryParams.paymentMethod || '');
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);

  useEffect(() => {
    let isMounted = true;
    import('@/lib/offlineDB').then(({ db }) => {
      db.pendingSales.toArray().then(pendingList => {
        if (!isMounted) return;
        const formattedOffline = pendingList.map(p => ({
          id: p.id,
          folio: `OFFLINE-${p.id.slice(0, 6)}`,
          createdAt: p.timestamp,
          total: p.total,
          status: 'OFFLINE_PENDING',
          paymentMethod: p.paymentMethod || 'CASH',
          isOffline: true,
          customer: { name: 'Público General' },
          user: { name: 'Usuario Local' },
          branch: { name: currentBranch?.name || 'Sucursal Local' },
          items: p.items || []
        }));
        setOfflineSales(formattedOffline);
      }).catch(err => console.warn('Error loading pending offline sales', err));
    });
    return () => { isMounted = false; };
  }, [currentBranch]);

  const allCombinedSales = useMemo(() => {
    return [...offlineSales, ...sales];
  }, [offlineSales, sales]);

  const updateUrlParams = (updates: Record<string, string>) => {
    Object.entries(updates).forEach(([key, val]) => {
      if (key === 'startDate') setFilterStartDate(val);
      if (key === 'endDate') setFilterEndDate(val);
      if (key === 'userId') setFilterUser(val);
      if (key === 'branchId') setFilterBranch(val);
      if (key === 'status') setFilterStatus(val);
      if (key === 'client') setFilterClient(val);
      if (key === 'cfdi') setFilterCfdi(val);
      if (key === 'paymentMethod') setFilterPaymentMethod(val);
      if (key === 'folio') setFilterFolio(val);
    });

    if (!isOnline) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    Object.entries(updates).forEach(([key, val]) => {
      if (val && val !== 'ALL') {
        params.set(key, val);
      } else {
        params.delete(key);
      }
    });
    router.push(`${pathname}?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    updateUrlParams({ page: String(newPage) });
  };

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

  const [checkingSatSaleId, setCheckingSatSaleId] = useState<string | null>(null);

  const handleCheckSatStatus = async (saleId: string) => {
    setCheckingSatSaleId(saleId);
    try {
      const res = await checkDocumentSatStatus(saleId, 'sale');
      if (res.success && res.status && res.cancellationStatus) {
        alert(`Estado SAT: ${res.status.toUpperCase()}\r\nEstado de Cancelación: ${res.cancellationStatus.toUpperCase()}\r\n\r\n${res.message}`);
        if (res.status === 'canceled') {
          setSales(prev => prev.filter(s => s.id !== saleId));
        } else {
          setSales(prev => prev.map(s => s.id === saleId ? { ...s, cancellationStatus: res.cancellationStatus } : s));
        }
      } else {
        alert("Error al verificar: " + (res.error || "Respuesta incompleta de Facturapi"));
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setCheckingSatSaleId(null);
    }
  };

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
    return `¡Hola ${sale.customer?.name || 'Cliente'}! Le comparto el comprobante de su compra en CAANMA.\r\n\r\n` +
      `*Folio de Venta:* #${displayFolio}\r\n` +
      `*Total:* ${formattedTotal}\r\n\r\n` +
      `Puede ver e imprimir su nota de venta en el siguiente enlace:\r\n${link}\r\n\r\n` +
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

  // Server-paginated sales array merged with pending offline sales
  const filteredSales = useMemo(() => {
    if (isOnline) {
      return allCombinedSales;
    }
    return allCombinedSales.filter(sale => {
      if (filterBranch && sale.branchId !== filterBranch) return false;
      if (filterUser && sale.userId !== filterUser) return false;
      if (filterStatus && sale.status !== filterStatus) return false;
      if (filterPaymentMethod && sale.paymentMethod !== filterPaymentMethod) return false;
      if (filterClient.trim()) {
        const clientName = sale.customer?.name || '';
        if (!clientName.toLowerCase().includes(filterClient.trim().toLowerCase())) return false;
      }
      if (filterCfdi.trim()) {
        const rawTerm = filterCfdi.trim().toLowerCase();
        const cleanTerm = rawTerm.replace(/^#/, '').trim();
        const noSpaceTerm = cleanTerm.replace(/\s+/g, '');
        const digitsOnly = cleanTerm.replace(/\D/g, '');

        const folioStr = (sale.folio || '').toLowerCase();
        const folioNoSpace = folioStr.replace(/\s+/g, '');
        const invFolio = (sale.invoiceFolio || '').toLowerCase();
        const invId = (sale.invoiceId || '').toLowerCase();
        const saleId = (sale.id || '').toLowerCase();

        const matches = 
          folioStr.includes(cleanTerm) ||
          folioNoSpace.includes(noSpaceTerm) ||
          (digitsOnly.length >= 2 && folioStr.includes(digitsOnly)) ||
          invFolio.includes(cleanTerm) ||
          invId.includes(cleanTerm) ||
          saleId.includes(cleanTerm);

        if (!matches) {
          return false;
        }
      }
      if (filterFolio.trim()) {
        const rawTerm = filterFolio.trim().toLowerCase();
        const cleanTerm = rawTerm.replace(/^#/, '').trim();
        const noSpaceTerm = cleanTerm.replace(/\s+/g, '');
        const digitsOnly = cleanTerm.replace(/\D/g, '');

        const folioStr = (sale.folio || '').toLowerCase();
        const folioNoSpace = folioStr.replace(/\s+/g, '');
        const saleId = (sale.id || '').toLowerCase();

        const matches = 
          folioStr.includes(cleanTerm) ||
          folioNoSpace.includes(noSpaceTerm) ||
          (digitsOnly.length >= 2 && folioStr.includes(digitsOnly)) ||
          saleId.includes(cleanTerm);

        if (!matches) return false;
      }
      if (filterStartDate) {
        const start = new Date(filterStartDate);
        start.setHours(0, 0, 0, 0);
        if (new Date(sale.createdAt) < start) return false;
      }
      if (filterEndDate) {
        const end = new Date(filterEndDate);
        end.setHours(23, 59, 59, 999);
        if (new Date(sale.createdAt) > end) return false;
      }
      return true;
    });
  }, [allCombinedSales, isOnline, filterBranch, filterUser, filterStatus, filterPaymentMethod, filterClient, filterCfdi, filterStartDate, filterEndDate, filterFolio]);

  const hasActiveFilters = Boolean(filterStartDate || filterEndDate || filterUser || (currentBranch.id === 'GLOBAL' && filterBranch) || filterStatus || filterClient || filterCfdi || filterPaymentMethod || filterFolio);

  const handleClearFilters = () => {
    setFilterStartDate('');
    setFilterEndDate('');
    setFilterUser('');
    setFilterBranch(currentBranch.id === 'GLOBAL' ? '' : currentBranch.id);
    setFilterStatus('');
    setFilterClient('');
    setFilterCfdi('');
    setFilterPaymentMethod('');
    setFilterFolio('');
    if (isOnline) {
      router.push(pathname);
    }
  };

  const downloadExcel = async () => {
    setIsExporting(true);
    try {
      const res = await getSalesForExport({
        startDate: filterStartDate,
        endDate: filterEndDate,
        userId: filterUser,
        branchId: filterBranch,
        status: filterStatus,
        paymentMethod: filterPaymentMethod,
        client: filterClient,
        cfdi: filterCfdi,
        folio: filterFolio
      });

      if (!res.success || !res.sales) {
        alert("Error al exportar: " + (res.error || "Ocurrió un error inesperado."));
        return;
      }

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
      const rows = res.sales.map(sale => {
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
    } catch (e: any) {
      alert("Error al exportar: " + e.message);
    } finally {
      setIsExporting(false);
    }
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
            disabled={isExporting}
            className="btn-secondary"
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              padding: '0.75rem 1.5rem', 
              borderRadius: '8px', 
              fontWeight: 'bold', 
              cursor: isExporting ? 'not-allowed' : 'pointer', 
              border: '1px solid var(--caanma-border)', 
              backgroundColor: 'white', 
              color: '#334155', 
              transition: 'all 0.2s',
              opacity: isExporting ? 0.7 : 1
            }}
            onMouseEnter={e => { if (!isExporting) e.currentTarget.style.backgroundColor='#f8fafc'; }}
            onMouseLeave={e => { if (!isExporting) e.currentTarget.style.backgroundColor='white'; }}
          >
            {isExporting ? (
              <>
                <Loader2 className="animate-spin" size={18} /> Exportando...
              </>
            ) : (
              <>
                <Download size={18} /> Exportar Excel
              </>
            )}
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
            onChange={(e) => {
              setFilterStartDate(e.target.value);
              updateUrlParams({ startDate: e.target.value, page: '1' });
            }} 
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
            onChange={(e) => {
              setFilterEndDate(e.target.value);
              updateUrlParams({ endDate: e.target.value, page: '1' });
            }} 
            style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid var(--caanma-border)', outline: 'none', backgroundColor: 'white', fontSize: '0.9rem' }} 
          />
        </div>

        {/* Folio/ID Venta Filter */}
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', fontWeight: '600', color: 'var(--caanma-text-muted)', marginBottom: '0.5rem' }}>
            <Tag size={14} /> Folio / Ticket
          </label>
          <input 
            type="text" 
            placeholder="Buscar ticket (#EL-2156) o ID" 
            value={filterFolio} 
            onChange={(e) => setFilterFolio(e.target.value)} 
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                updateUrlParams({ folio: filterFolio, page: '1' });
              }
            }}
            onBlur={() => updateUrlParams({ folio: filterFolio, page: '1' })}
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
            placeholder="Buscar cliente y presionar Enter" 
            value={filterClient} 
            onChange={(e) => setFilterClient(e.target.value)} 
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                updateUrlParams({ client: filterClient, page: '1' });
              }
            }}
            onBlur={() => updateUrlParams({ client: filterClient, page: '1' })}
            style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid var(--caanma-border)', outline: 'none', backgroundColor: 'white', fontSize: '0.9rem' }} 
          />
        </div>

        {/* CFDI Filter */}
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', fontWeight: '600', color: 'var(--caanma-text-muted)', marginBottom: '0.5rem' }}>
            <Receipt size={14} /> Factura CFDI
          </label>
          <input 
            type="text" 
            placeholder="Buscar folio fiscal (#) o UUID" 
            value={filterCfdi} 
            onChange={(e) => setFilterCfdi(e.target.value)} 
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                updateUrlParams({ cfdi: filterCfdi, page: '1' });
              }
            }}
            onBlur={() => updateUrlParams({ cfdi: filterCfdi, page: '1' })}
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
            onChange={(e) => {
              setFilterUser(e.target.value);
              updateUrlParams({ userId: e.target.value, page: '1' });
            }} 
            style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid var(--caanma-border)', outline: 'none', backgroundColor: 'white', fontSize: '0.9rem' }}
          >
            <option value="">Todos los vendedores</option>
            {users.map((u) => (
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
            onChange={(e) => {
              setFilterBranch(e.target.value);
              updateUrlParams({ branchId: e.target.value, page: '1' });
            }} 
            disabled={currentBranch.id !== 'GLOBAL'}
            style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid var(--caanma-border)', outline: 'none', backgroundColor: currentBranch.id !== 'GLOBAL' ? '#f1f5f9' : 'white', fontSize: '0.9rem' }}
          >
            {currentBranch.id === 'GLOBAL' ? (
              <>
                <option value="">Todas las sucursales</option>
                {branches.map((b) => (
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
            onChange={(e) => {
              setFilterStatus(e.target.value);
              updateUrlParams({ status: e.target.value, page: '1' });
            }} 
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
            onChange={(e) => {
              setFilterPaymentMethod(e.target.value);
              updateUrlParams({ paymentMethod: e.target.value, page: '1' });
            }} 
            style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid var(--caanma-border)', outline: 'none', backgroundColor: 'white', fontSize: '0.9rem' }}
          >
            <option value="">Todos los métodos</option>
            {salesPaymentMethods.map((pm) => (
              <option key={pm} value={pm}>{getPaymentMethodLabel(pm)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Clear Filters & Top Pagination Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          {hasActiveFilters && (
            <button 
              type="button" 
              onClick={handleClearFilters}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.5rem 1rem', fontSize: '0.85rem', color: '#dc2626', backgroundColor: '#fee2e2', border: '1px solid #fecaca', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }}
            >
              <RotateCcw size={14} /> Limpiar Filtros
            </button>
          )}
        </div>

        {/* Pagination Bar (Top) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', backgroundColor: '#f8fafc', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '500' }}>
            Mostrando <strong>{totalCount > 0 ? (currentPage - 1) * pageSize + 1 : 0}</strong>-<strong>{Math.min(currentPage * pageSize, totalCount)}</strong> de <strong>{totalCount.toLocaleString()}</strong>
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <button
              disabled={currentPage <= 1}
              onClick={() => handlePageChange(currentPage - 1)}
              style={{ padding: '0.3rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: currentPage <= 1 ? '#f1f5f9' : 'white', color: currentPage <= 1 ? '#94a3b8' : '#334155', cursor: currentPage <= 1 ? 'not-allowed' : 'pointer', fontWeight: '600', fontSize: '0.8rem' }}
            >
              &laquo;
            </button>
            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#334155', padding: '0 0.25rem' }}>
              {currentPage} / {totalPages}
            </span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
              style={{ padding: '0.3rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: currentPage >= totalPages ? '#f1f5f9' : 'white', color: currentPage >= totalPages ? '#94a3b8' : '#334155', cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer', fontWeight: '600', fontSize: '0.8rem' }}
            >
              &raquo;
            </button>
          </div>
        </div>
      </div>

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
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                      {sale.invoiceId ? (
                        <>
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
                          {sale.status === 'COMPLETED' && (
                            <button
                              onClick={() => handleCheckSatStatus(sale.id)}
                              disabled={checkingSatSaleId === sale.id}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '22px',
                                height: '22px',
                                backgroundColor: '#f1f5f9',
                                border: '1px solid #cbd5e1',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                padding: 0,
                                color: '#475569',
                                transition: 'all 0.15s ease'
                              }}
                              title="Verificar estatus en el SAT"
                            >
                              {checkingSatSaleId === sale.id ? (
                                <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} />
                              ) : (
                                <RotateCcw size={11} />
                              )}
                            </button>
                          )}
                        </>
                      ) : (
                        <span style={{ color: 'var(--caanma-text-muted)', fontSize: '0.82rem' }}>-</span>
                      )}
                    </div>
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ 
                        padding: '0.15rem 0.35rem', 
                        borderRadius: '12px', 
                        fontSize: '0.7rem',
                        fontWeight: 'bold',
                        backgroundColor: sale.isOffline ? '#fef3c7' : sale.status === 'COMPLETED' ? '#dcfce7' : sale.status === 'CANCELLED' ? '#fee2e2' : '#f1f5f9',
                        color: sale.isOffline ? '#92400e' : sale.status === 'COMPLETED' ? '#166534' : sale.status === 'CANCELLED' ? '#991b1b' : '#334155',
                        border: sale.isOffline ? '1px solid #fde68a' : 'none'
                      }}>
                        {sale.isOffline ? '⚡ Offline (En cola)' : sale.status === 'COMPLETED' ? 'Completado' : sale.status === 'CANCELLED' ? 'Cancelado' : sale.status}
                      </span>
                      {sale.cancellationStatus === 'pending' && (
                        <span style={{ 
                          padding: '0.1rem 0.3rem', 
                          borderRadius: '8px', 
                          fontSize: '0.62rem',
                          fontWeight: 'bold',
                          backgroundColor: '#fff7ed',
                          color: '#c2410c',
                          border: '1px solid #ffedd5',
                          whiteSpace: 'nowrap'
                        }}>
                          Cancelación en proceso
                        </span>
                      )}
                    </div>
                  </td>
                  <td data-label="Acciones" style={{ padding: '0.3rem 0.45rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '0.2rem', justifyContent: 'center', flexWrap: 'nowrap', alignItems: 'center' }}>
                      {/* Detalle */}
                      <Link
                        href={`/ventas/detalle/${sale.id}`}
                        onClick={(e) => {
                          if (!isOnline) {
                            e.preventDefault();
                            const fullSale = allCombinedSales.find(s => s.id === sale.id);
                            if (fullSale) {
                              setSelectedSaleForOfflineDetail(fullSale);
                            }
                          }
                        }}
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
                        onClick={(e) => {
                          if (!isOnline) {
                            e.preventDefault();
                            const fullSale = allCombinedSales.find(s => s.id === sale.id);
                            if (fullSale) {
                              printSaleOffline(fullSale, false);
                            }
                          }
                        }}
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
                        onClick={(e) => {
                          if (!isOnline) {
                            e.preventDefault();
                            const fullSale = allCombinedSales.find(s => s.id === sale.id);
                            if (fullSale) {
                              printSaleOffline(fullSale, true);
                            }
                          }
                        }}
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

      {/* Pagination Bar (Bottom) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', borderRadius: '0 0 12px 12px' }}>
        <div style={{ fontSize: '0.875rem', color: '#475569', fontWeight: '500' }}>
          Mostrando <strong style={{ color: '#0f172a' }}>{totalCount > 0 ? (currentPage - 1) * pageSize + 1 : 0}</strong> a <strong style={{ color: '#0f172a' }}>{Math.min(currentPage * pageSize, totalCount)}</strong> de <strong style={{ color: '#0f172a' }}>{totalCount.toLocaleString()}</strong> ventas
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            disabled={currentPage <= 1}
            onClick={() => handlePageChange(currentPage - 1)}
            style={{ padding: '0.45rem 0.85rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: currentPage <= 1 ? '#f1f5f9' : 'white', color: currentPage <= 1 ? '#94a3b8' : '#334155', cursor: currentPage <= 1 ? 'not-allowed' : 'pointer', fontWeight: '600', fontSize: '0.85rem' }}
          >
            &laquo; Anterior
          </button>
          <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569', padding: '0 0.5rem' }}>
            Página {currentPage} de {totalPages}
          </span>
          <button
            disabled={currentPage >= totalPages}
            onClick={() => handlePageChange(currentPage + 1)}
            style={{ padding: '0.45rem 0.85rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: currentPage >= totalPages ? '#f1f5f9' : 'white', color: currentPage >= totalPages ? '#94a3b8' : '#334155', cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer', fontWeight: '600', fontSize: '0.85rem' }}
          >
            Siguiente &raquo;
          </button>
        </div>
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

      {/* Offline Sale Detail Modal */}
      {selectedSaleWithProducts && (
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
              maxWidth: '750px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              animation: 'scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid #f1f5f9',
                background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)',
                color: 'white',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold' }}>
                  Detalle de Venta {selectedSaleWithProducts.isOffline ? 'Offline' : ''}
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', opacity: 0.85 }}>
                  Folio: {selectedSaleWithProducts.folio || selectedSaleWithProducts.id}
                </p>
              </div>
              <button
                onClick={() => setSelectedSaleForOfflineDetail(null)}
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

            {/* Body */}
            <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, color: 'black' }}>
              
              {/* Info Block */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', gap: '2rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase' }}>Cliente:</h4>
                  <p style={{ margin: 0, fontWeight: 'bold', fontSize: '1.05rem' }}>
                    {selectedSaleWithProducts.customer?.name || selectedSaleWithProducts.customerName || 'Público en General'}
                  </p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#475569' }}>
                    Método de Pago: <span style={{ color: '#0ea5e9', fontWeight: 'bold' }}>{getPaymentMethodLabel(selectedSaleWithProducts.paymentMethod)}</span>
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase' }}>Emitido por:</h4>
                  <p style={{ margin: 0, fontWeight: 'bold', fontSize: '1.05rem' }}>
                    {selectedSaleWithProducts.branch?.name || selectedSaleWithProducts.branchName || 'Sucursal'}
                  </p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                    Fecha: {new Date(selectedSaleWithProducts.createdAt).toLocaleString()}
                  </p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#475569' }}>
                    Estado: <span style={{ 
                      fontWeight: 'bold', 
                      color: selectedSaleWithProducts.status === 'COMPLETED' ? '#166534' : selectedSaleWithProducts.status === 'CANCELLED' ? '#991b1b' : '#b45309' 
                    }}>
                      {selectedSaleWithProducts.status === 'COMPLETED' ? 'Venta Concluida' : selectedSaleWithProducts.status === 'CANCELLED' ? 'Cancelada' : selectedSaleWithProducts.status}
                    </span>
                  </p>
                </div>
              </div>

              {/* Items Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginBottom: '1.5rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #cbd5e1', backgroundColor: '#f8fafc' }}>
                    <th style={{ padding: '0.5rem 0.75rem', color: '#475569', fontWeight: '500', fontSize: '0.85rem' }}>Artículo</th>
                    <th style={{ padding: '0.5rem 0.75rem', color: '#475569', textAlign: 'center', fontWeight: '500', fontSize: '0.85rem' }}>Cant.</th>
                    <th style={{ padding: '0.5rem 0.75rem', color: '#475569', textAlign: 'right', fontWeight: '500', fontSize: '0.85rem' }}>Precio Unit.</th>
                    <th style={{ padding: '0.5rem 0.75rem', color: '#475569', textAlign: 'right', fontWeight: '500', fontSize: '0.85rem' }}>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedSaleWithProducts.items.map((item: any, idx: number) => {
                    const desc = item.productName || item.product?.name || 'Producto';
                    const sku = item.productSku || (item.product && item.product.sku) || '';
                    const code = item.productBarcode || (item.product && item.product.barcode) || '';
                    const variantStr = item.variantAttribute || (item.variant && item.variant.attribute) ? ` (Var: ${item.variantAttribute || item.variant.attribute})` : '';
                    
                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}>
                          <div style={{ fontWeight: 'bold' }}>{desc}{variantStr}</div>
                          {(sku || code) && (
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                              SKU: {sku || '-'} | Código: {code || '-'}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center', fontWeight: 'bold', fontSize: '0.85rem' }}>
                          {item.quantity}
                        </td>
                        <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', fontSize: '0.85rem' }}>
                          ${item.price ? item.price.toLocaleString('es-MX', { minimumFractionDigits: 2 }) : '0.00'}
                        </td>
                        <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', fontWeight: 'bold', fontSize: '0.85rem' }}>
                          ${((item.quantity || 0) * (item.price || 0)).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
                  {(() => {
                    const modalItemsTotal = selectedSaleWithProducts.items.reduce((sum: number, item: any) => sum + ((item.quantity || 0) * (item.price || 0)), 0);
                    const unallocatedModal = selectedSaleWithProducts.total > (modalItemsTotal + 0.01) ? (selectedSaleWithProducts.total - modalItemsTotal) : 0;
                    if (unallocatedModal > 0.009) {
                      return (
                        <tr style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#fffbeb' }}>
                          <td style={{ padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}>
                            <div style={{ fontWeight: 'bold', color: '#b45309' }}>📦 Ajuste por Artículo(s) Eliminado(s) del Catálogo</div>
                            <div style={{ fontSize: '0.75rem', color: '#d97706' }}>Diferencia por producto(s) retirado(s) para cuadrar con el cobro.</div>
                          </td>
                          <td style={{ padding: '0.45rem 0.75rem', textAlign: 'center', fontWeight: 'bold', fontSize: '0.85rem', color: '#b45309' }}>1</td>
                          <td style={{ padding: '0.45rem 0.75rem', textAlign: 'right', fontSize: '0.85rem', color: '#b45309' }}>${unallocatedModal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                          <td style={{ padding: '0.45rem 0.75rem', textAlign: 'right', fontWeight: 'bold', fontSize: '0.85rem', color: '#b45309' }}>${unallocatedModal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      );
                    }
                    return null;
                  })()}
                </tbody>
              </table>

              {/* Totals */}
              {(() => {
                const modalItemsTotal = selectedSaleWithProducts.items.reduce((sum: number, item: any) => sum + ((item.quantity || 0) * (item.price || 0)), 0);
                const unallocatedModal = selectedSaleWithProducts.total > (modalItemsTotal + 0.01) ? (selectedSaleWithProducts.total - modalItemsTotal) : 0;
                const modalSubtotal = modalItemsTotal + unallocatedModal;
                const modalDiscount = Math.max(0, modalSubtotal - selectedSaleWithProducts.total);
                return (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                    <div style={{ width: '220px', fontSize: '0.95rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0' }}>
                        <span style={{ color: '#64748b' }}>Subtotal:</span>
                        <span>${modalSubtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                      </div>
                      {modalDiscount > 0.01 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', color: '#dc2626' }}>
                          <span>Descuento:</span>
                          <span>-${modalDiscount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', fontWeight: 'bold', fontSize: '1.25rem', color: '#7c3aed' }}>
                        <span>Pago Total:</span>
                        <span>${selectedSaleWithProducts.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {selectedSaleWithProducts.notes && (
                <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.85rem' }}>
                  <strong>Notas del Ticket:</strong>
                  <p style={{ margin: '4px 0 0 0', color: '#334155' }}>{selectedSaleWithProducts.notes}</p>
                </div>
              )}

            </div>

            {/* Footer Buttons */}
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
              <div>
                {selectedSaleWithProducts.status !== 'CANCELLED' && (
                  <button
                    onClick={() => handleOfflineCancel(selectedSaleWithProducts)}
                    disabled={isOfflineCancelling}
                    className="btn-danger"
                    style={{
                      padding: '0.625rem 1.25rem',
                      borderRadius: '8px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      border: 'none',
                      fontSize: '0.85rem'
                    }}
                  >
                    {isOfflineCancelling ? 'Cancelando...' : 'Cancelar Venta'}
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => printSaleOffline(selectedSaleWithProducts, false)}
                  style={{
                    padding: '0.625rem 1.25rem',
                    border: '1px solid var(--caanma-border)',
                    borderRadius: '8px',
                    backgroundColor: 'white',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    color: '#334155',
                    fontSize: '0.85rem'
                  }}
                >
                  Imprimir Nota (A4)
                </button>
                <button
                  onClick={() => printSaleOffline(selectedSaleWithProducts, true)}
                  style={{
                    padding: '0.625rem 1.25rem',
                    border: '1px solid var(--caanma-border)',
                    borderRadius: '8px',
                    backgroundColor: 'white',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    color: '#334155',
                    fontSize: '0.85rem'
                  }}
                >
                  Imprimir Ticket
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
