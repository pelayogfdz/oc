'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { saveMeliProductPricing, publishProductToMeli, linkMeliItemToProduct, searchCaanmaProducts, syncMeliCatalogAction, updateMeliItemStatus } from '@/app/actions/integration';
import { Save, Edit2, X, Check, Loader2, ExternalLink, Search, Globe, RefreshCw, Play, Pause, Archive, Trash2 } from 'lucide-react';

interface MeliCatalogTableProps {
  initialMaps: any[];
}

export default function MeliCatalogTable({ initialMaps }: MeliCatalogTableProps) {
  const [maps, setMaps] = useState(initialMaps);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Selection state
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [publishing, setPublishing] = useState(false);
  const [publishProgress, setPublishProgress] = useState<string | null>(null);

  // Link selection state for unlinked ML items
  const [rowLinkProductId, setRowLinkProductId] = useState<Record<string, string>>({});
  const [rowSearchVal, setRowSearchVal] = useState<Record<string, string>>({});
  const [rowSearchResults, setRowSearchResults] = useState<Record<string, any[]>>({});
  const [rowSearching, setRowSearching] = useState<Record<string, boolean>>({});
  const [selectedRowProduct, setSelectedRowProduct] = useState<Record<string, any>>({});

  const searchTimeouts = useRef<Record<string, NodeJS.Timeout>>({});

  useEffect(() => {
    return () => {
      Object.values(searchTimeouts.current).forEach(clearTimeout);
    };
  }, []);

  const handleSearchRowProduct = async (itemId: string, query: string) => {
    setRowSearchVal(prev => ({ ...prev, [itemId]: query }));
    
    if (searchTimeouts.current[itemId]) {
      clearTimeout(searchTimeouts.current[itemId]);
    }

    if (!query || query.trim().length < 2) {
      setRowSearchResults(prev => ({ ...prev, [itemId]: [] }));
      setRowSearching(prev => ({ ...prev, [itemId]: false }));
      return;
    }

    setRowSearching(prev => ({ ...prev, [itemId]: true }));

    searchTimeouts.current[itemId] = setTimeout(async () => {
      try {
        const results = await searchCaanmaProducts(query);
        setRowSearchResults(prev => ({ ...prev, [itemId]: results }));
      } catch (err) {
        console.error('Error searching products:', err);
      } finally {
        setRowSearching(prev => ({ ...prev, [itemId]: false }));
      }
    }, 300);
  };

  // Column filter state
  const [filters, setFilters] = useState({
    name: '',
    sku: '',
    status: 'ALL', // ALL, linked, unlinked, active, paused, meli_unlinked
    fixed: 'ALL', // ALL, yes, no
    cost: '',
    localPrice: '',
    stock: '',
    priceMeli: '',
    comision: '',
    envio: '',
    retencion: '',
    margenD: '',
    margenP: '',
  });

  // Sorting state
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const renderSortIndicator = (key: string) => {
    if (sortKey !== key) return <span style={{ color: '#cbd5e1', marginLeft: '0.25rem', fontSize: '0.65rem' }}>↕</span>;
    return sortOrder === 'asc' 
      ? <span style={{ color: 'var(--caanma-primary)', marginLeft: '0.25rem', fontSize: '0.65rem' }}>▲</span>
      : <span style={{ color: 'var(--caanma-primary)', marginLeft: '0.25rem', fontSize: '0.65rem' }}>▼</span>;
  };

  // Form state for inline editing
  const [formData, setFormData] = useState({
    precioMeli: 0,
    comisionMeli: 0,
    envioMeli: 0,
    retencionMeli: 0,
    margenDinero: 0,
    margenPorcentaje: 0,
    isFixedPrice: false,
  });

  const [savingId, setSavingId] = useState<string | null>(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [syncing, setSyncing] = useState(false);

  const handleStatusChange = async (mapId: string, action: 'active' | 'paused' | 'closed' | 'delete') => {
    let confirmMsg = '';
    if (action === 'closed') {
      confirmMsg = '¿Estás seguro de que deseas finalizar esta publicación en Mercado Libre? Las publicaciones finalizadas no se pueden volver a activar.';
    } else if (action === 'delete') {
      confirmMsg = '¿Estás seguro de que deseas ELIMINAR esta publicación de Mercado Libre y Caanma? Esta acción no se puede deshacer.';
    }

    if (confirmMsg && !window.confirm(confirmMsg)) {
      return;
    }

    setStatusUpdatingId(mapId);
    setMessage(null);
    const res = await updateMeliItemStatus(mapId, action);
    setStatusUpdatingId(null);

    if (res.success) {
      if (action === 'delete') {
        setMaps(prev => prev.filter(m => m.id !== mapId));
        setMessage({ type: 'success', text: 'Publicación eliminada de Mercado Libre y Caanma con éxito.' });
      } else {
        setMaps(prev => prev.map(m => m.id === mapId ? { ...m, syncStatus: res.newStatus || action } : m));
        const statusLabel = action === 'active' ? 'Activada' : action === 'paused' ? 'Pausada' : 'Finalizada';
        setMessage({ type: 'success', text: `Publicación marcada como '${statusLabel}' en Mercado Libre con éxito.` });
      }
    } else {
      setMessage({ type: 'error', text: res.error || 'Error al cambiar el estado en Mercado Libre.' });
    }
    setTimeout(() => setMessage(null), 5000);
  };

  const handleSync = async () => {
    setSyncing(true);
    setMessage(null);
    try {
      const res = await syncMeliCatalogAction();
      if (res.success) {
        setMessage({ type: 'success', text: res.message || 'Sincronización completada exitosamente.' });
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setMessage({ type: 'error', text: res.error || 'Error durante la sincronización.' });
      }
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message || String(e) });
    } finally {
      setSyncing(false);
    }
  };

  // Filtered maps memoized
  const filteredMaps = useMemo(() => {
    let result = maps.filter(map => {
      const p = map.product;
      const dPrecio = map.precioMeli !== null && map.precioMeli !== undefined ? map.precioMeli : p.price;
      const dComision = map.comisionMeli || 0;
      const dEnvio = map.envioMeli || 0;
      const dRetencion = map.retencionMeli || 0;
      const dMargenD = map.margenDinero !== null && map.margenDinero !== undefined ? map.margenDinero : (dPrecio - p.cost - dComision - dEnvio - dRetencion);
      const dMargenP = map.margenPorcentaje !== null && map.margenPorcentaje !== undefined ? map.margenPorcentaje : (dPrecio > 0 ? (dMargenD / dPrecio) * 100 : 0);

      // 1. Name Filter
      const nameMatch = map.product.name.toLowerCase().includes(filters.name.toLowerCase());
      
      // 2. SKU Filter
      const skuMatch = (map.product.sku || '').toLowerCase().includes(filters.sku.toLowerCase());
      
      // 3. Status Filter
      let statusMatch = true;
      if (filters.status === 'linked') {
        statusMatch = map.syncStatus !== 'unlinked' && map.syncStatus !== 'meli_unlinked';
      } else if (filters.status === 'unlinked') {
        statusMatch = map.syncStatus === 'unlinked';
      } else if (filters.status === 'meli_unlinked') {
        statusMatch = map.syncStatus === 'meli_unlinked';
      } else if (filters.status === 'active') {
        statusMatch = map.syncStatus === 'active';
      } else if (filters.status === 'paused') {
        statusMatch = map.syncStatus === 'paused';
      }

      // 4. Fixed Price Filter
      let fixedMatch = true;
      if (filters.fixed === 'yes') {
        fixedMatch = map.isFixedPrice === true;
      } else if (filters.fixed === 'no') {
        fixedMatch = map.isFixedPrice === false && map.syncStatus !== 'unlinked' && map.syncStatus !== 'meli_unlinked';
      }

      // Helper for numeric matching
      const matchNumericFilter = (value: number, filterStr: string) => {
        if (!filterStr) return true;
        const trimmed = filterStr.trim();
        if (trimmed.startsWith('>=')) {
          const num = parseFloat(trimmed.substring(2));
          return isNaN(num) ? true : value >= num;
        }
        if (trimmed.startsWith('<=')) {
          const num = parseFloat(trimmed.substring(2));
          return isNaN(num) ? true : value <= num;
        }
        if (trimmed.startsWith('>')) {
          const num = parseFloat(trimmed.substring(1));
          return isNaN(num) ? true : value > num;
        }
        if (trimmed.startsWith('<')) {
          const num = parseFloat(trimmed.substring(1));
          return isNaN(num) ? true : value < num;
        }
        const num = parseFloat(trimmed);
        return isNaN(num) ? true : Math.abs(value - num) < 0.01 || String(value).includes(trimmed);
      };

      // Numeric Filters matches
      const costMatch = map.syncStatus === 'meli_unlinked' ? true : matchNumericFilter(p.cost, filters.cost);
      const localPriceMatch = map.syncStatus === 'meli_unlinked' ? true : matchNumericFilter(p.price, filters.localPrice);
      const stockMatch = matchNumericFilter(p.stock, filters.stock);
      const priceMeliMatch = map.syncStatus === 'unlinked' ? true : matchNumericFilter(dPrecio, filters.priceMeli);
      const comisionMatch = map.syncStatus === 'unlinked' ? true : matchNumericFilter(dComision, filters.comision);
      const envioMatch = map.syncStatus === 'unlinked' ? true : matchNumericFilter(dEnvio, filters.envio);
      const retencionMatch = map.syncStatus === 'unlinked' ? true : matchNumericFilter(dRetencion, filters.retencion);
      const margenDMatch = map.syncStatus === 'unlinked' ? true : matchNumericFilter(dMargenD, filters.margenD);
      const margenPMatch = map.syncStatus === 'unlinked' ? true : matchNumericFilter(dMargenP, filters.margenP);

      return nameMatch && skuMatch && statusMatch && fixedMatch && costMatch && localPriceMatch && stockMatch && priceMeliMatch && comisionMatch && envioMatch && retencionMatch && margenDMatch && margenPMatch;
    });

    if (sortKey) {
      result = [...result].sort((a, b) => {
        let valA: any = '';
        let valB: any = '';

        if (sortKey === 'name') {
          valA = a.product.name.toLowerCase();
          valB = b.product.name.toLowerCase();
        } else if (sortKey === 'sku') {
          valA = (a.product.sku || '').toLowerCase();
          valB = (b.product.sku || '').toLowerCase();
        } else if (sortKey === 'cost') {
          valA = a.product.cost || 0;
          valB = b.product.cost || 0;
        } else if (sortKey === 'localPrice') {
          valA = a.product.price || 0;
          valB = b.product.price || 0;
        } else if (sortKey === 'stock') {
          valA = a.product.stock || 0;
          valB = b.product.stock || 0;
        } else if (sortKey === 'priceMeli') {
          valA = a.precioMeli !== null && a.precioMeli !== undefined ? a.precioMeli : a.product.price;
          valB = b.precioMeli !== null && b.precioMeli !== undefined ? b.precioMeli : b.product.price;
        } else if (sortKey === 'comision') {
          valA = a.comisionMeli || 0;
          valB = b.comisionMeli || 0;
        } else if (sortKey === 'envio') {
          valA = a.envioMeli || 0;
          valB = b.envioMeli || 0;
        } else if (sortKey === 'retencion') {
          valA = a.retencionMeli || 0;
          valB = b.retencionMeli || 0;
        } else if (sortKey === 'margenD') {
          const priceA = a.precioMeli !== null && a.precioMeli !== undefined ? a.precioMeli : a.product.price;
          const comisionA = a.comisionMeli || 0;
          const envioA = a.envioMeli || 0;
          const retencionA = a.retencionMeli || 0;
          valA = a.margenDinero !== null && a.margenDinero !== undefined ? a.margenDinero : (priceA - a.product.cost - comisionA - envioA - retencionA);

          const priceB = b.precioMeli !== null && b.precioMeli !== undefined ? b.precioMeli : b.product.price;
          const comisionB = b.comisionMeli || 0;
          const envioB = b.envioMeli || 0;
          const retencionB = b.retencionMeli || 0;
          valB = b.margenDinero !== null && b.margenDinero !== undefined ? b.margenDinero : (priceB - b.product.cost - comisionB - envioB - retencionB);
        } else if (sortKey === 'margenP') {
          const priceA = a.precioMeli !== null && a.precioMeli !== undefined ? a.precioMeli : a.product.price;
          const comisionA = a.comisionMeli || 0;
          const envioA = a.envioMeli || 0;
          const retencionA = a.retencionMeli || 0;
          const mDA = a.margenDinero !== null && a.margenDinero !== undefined ? a.margenDinero : (priceA - a.product.cost - comisionA - envioA - retencionA);
          valA = a.margenPorcentaje !== null && a.margenPorcentaje !== undefined ? a.margenPorcentaje : (priceA > 0 ? (mDA / priceA) * 100 : 0);

          const priceB = b.precioMeli !== null && b.precioMeli !== undefined ? b.precioMeli : b.product.price;
          const comisionB = b.comisionMeli || 0;
          const envioB = b.envioMeli || 0;
          const retencionB = b.retencionMeli || 0;
          const mDB = b.margenDinero !== null && b.margenDinero !== undefined ? b.margenDinero : (priceB - b.product.cost - comisionB - envioB - retencionB);
          valB = b.margenPorcentaje !== null && b.margenPorcentaje !== undefined ? b.margenPorcentaje : (priceB > 0 ? (mDB / priceB) * 100 : 0);
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [maps, filters, sortKey, sortOrder]);

  // Handle header checkbox change
  const handleSelectAll = (checked: boolean) => {
    const nextSelected: Record<string, boolean> = {};
    if (checked) {
      filteredMaps.forEach(map => {
        if (map.syncStatus === 'unlinked') {
          nextSelected[map.productId] = true;
        }
      });
    }
    setSelectedIds(nextSelected);
  };

  // Check if all unlinked items are selected
  const allUnlinkedSelected = useMemo(() => {
    const unlinkedFiltered = filteredMaps.filter(m => m.syncStatus === 'unlinked');
    if (unlinkedFiltered.length === 0) return false;
    return unlinkedFiltered.every(m => selectedIds[m.productId]);
  }, [filteredMaps, selectedIds]);

  const toggleSelect = (productId: string) => {
    setSelectedIds(prev => ({
      ...prev,
      [productId]: !prev[productId]
    }));
  };

  const selectedCount = useMemo(() => {
    return Object.values(selectedIds).filter(Boolean).length;
  }, [selectedIds]);

  // Bulk Publish Action
  const handleBulkPublish = async () => {
    const productIdsToPublish = Object.keys(selectedIds).filter(id => selectedIds[id]);
    if (productIdsToPublish.length === 0) return;

    setPublishing(true);
    setMessage(null);
    let successCount = 0;
    let failCount = 0;
    let lastError = '';

    for (let i = 0; i < productIdsToPublish.length; i++) {
      const pid = productIdsToPublish[i];
      const productObj = maps.find(m => m.productId === pid)?.product;
      setPublishProgress(`Publicando ${i + 1}/${productIdsToPublish.length}: ${productObj?.name || ''}...`);

      const res = await publishProductToMeli(pid);
      if (res.success) {
        successCount++;
        // Update item in local list state
        setMaps(prev => prev.map(m => m.productId === pid ? {
          ...m,
          id: res.externalId,
          externalId: res.externalId,
          syncStatus: 'active',
          precioMeli: productObj?.price || 100,
          margenDinero: (productObj?.price || 100) - (productObj?.cost || 0),
          margenPorcentaje: productObj?.price ? (((productObj.price - productObj.cost) / productObj.price) * 100) : 0,
        } : m));
      } else {
        failCount++;
        lastError = res.error || 'Error desconocido';
      }
    }

    setPublishing(false);
    setPublishProgress(null);
    setSelectedIds({});

    if (failCount === 0) {
      setMessage({ type: 'success', text: `¡Publicados ${successCount} productos en Mercado Libre exitosamente!` });
    } else {
      setMessage({ 
        type: 'error', 
        text: `Publicación completada. Éxito: ${successCount}, Error: ${failCount}. Último error: ${lastError}` 
      });
    }
    setTimeout(() => setMessage(null), 5000);
  };

  const startEditing = (map: any) => {
    setEditingId(map.id);
    
    const cost = map.product.cost;
    const precio = map.precioMeli !== null ? map.precioMeli : map.product.price;
    const comision = map.comisionMeli || 0;
    const envio = map.envioMeli || 0;
    const retencion = map.retencionMeli || 0;
    
    const margenD = map.margenDinero !== null ? map.margenDinero : (precio - cost - comision - envio - retencion);
    const margenP = map.margenPorcentaje !== null ? map.margenPorcentaje : (precio > 0 ? (margenD / precio) * 100 : 0);

    setFormData({
      precioMeli: Number(precio.toFixed(2)),
      comisionMeli: Number(comision.toFixed(2)),
      envioMeli: Number(envio.toFixed(2)),
      retencionMeli: Number(retencion.toFixed(2)),
      margenDinero: Number(margenD.toFixed(2)),
      margenPorcentaje: Number(margenP.toFixed(2)),
      isFixedPrice: !!map.isFixedPrice,
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
  };

  const handleFieldChange = (field: string, value: number | boolean, cost: number) => {
    setFormData(prev => {
      const next = { ...prev, [field]: value };

      const costNum = Number(cost);
      const precio = Number(next.precioMeli) || 0;
      const comision = Number(next.comisionMeli) || 0;
      const envio = Number(next.envioMeli) || 0;
      const retencion = Number(next.retencionMeli) || 0;

      if (field === 'precioMeli' || field === 'comisionMeli' || field === 'envioMeli' || field === 'retencionMeli') {
        const newMargenD = precio - costNum - comision - envio - retencion;
        const newMargenP = precio > 0 ? (newMargenD / precio) * 100 : 0;
        
        next.margenDinero = Number(newMargenD.toFixed(2));
        next.margenPorcentaje = Number(newMargenP.toFixed(2));
        if (field === 'precioMeli') {
          next.isFixedPrice = true;
        }
      } else if (field === 'margenPorcentaje') {
        const divisor = 1 - (value as number / 100);
        if (divisor > 0) {
          const newPrecio = (costNum + envio + comision + retencion) / divisor;
          const newMargenD = newPrecio - costNum - comision - envio - retencion;
          
          next.precioMeli = Number(newPrecio.toFixed(2));
          next.margenDinero = Number(newMargenD.toFixed(2));
        }
        next.isFixedPrice = true;
      } else if (field === 'margenDinero') {
        const newPrecio = costNum + envio + comision + retencion + (value as number);
        const newMargenP = newPrecio > 0 ? ((value as number) / newPrecio) * 100 : 0;

        next.precioMeli = Number(newPrecio.toFixed(2));
        next.margenPorcentaje = Number(newMargenP.toFixed(2));
        next.isFixedPrice = true;
      }

      return next;
    });
  };

  const handleSave = async (mapId: string) => {
    setSavingId(mapId);
    setMessage(null);

    const res = await saveMeliProductPricing(mapId, formData);
    setSavingId(null);

    if (res.success) {
      setMaps(prev => prev.map(m => m.id === mapId ? {
        ...m,
        precioMeli: formData.precioMeli,
        comisionMeli: formData.comisionMeli,
        envioMeli: formData.envioMeli,
        retencionMeli: formData.retencionMeli,
        margenDinero: formData.margenDinero,
        margenPorcentaje: formData.margenPorcentaje,
        isFixedPrice: formData.isFixedPrice,
        lastSync: new Date(),
      } : m));

      setEditingId(null);
      if (res.warning) {
        setMessage({ type: 'error', text: res.warning });
      } else {
        setMessage({ type: 'success', text: 'Precios y márgenes actualizados correctamente.' });
        setTimeout(() => setMessage(null), 3000);
      }
    } else {
      setMessage({ type: 'error', text: res.error || 'Ocurrió un error al guardar los cambios.' });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'unlinked':
        return <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', backgroundColor: '#f1f5f9', color: '#64748b' }}>No Vinculado</span>;
      case 'meli_unlinked':
        return <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', backgroundColor: '#e0f2fe', color: '#0369a1' }}>ML Sin Vincular</span>;
      case 'active':
        return <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', backgroundColor: '#dcfce7', color: '#15803d' }}>Activo</span>;
      case 'paused':
        return <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', backgroundColor: '#fef3c7', color: '#d97706' }}>Pausado</span>;
      case 'closed':
        return <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', backgroundColor: '#fee2e2', color: '#b91c1c' }}>Cerrado</span>;
      default:
        return <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', backgroundColor: '#e2e8f0', color: '#334155', textTransform: 'uppercase' }}>{status}</span>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header Actions & Bulk Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid var(--caanma-border)', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Globe size={20} className="text-primary" />
            <span style={{ fontWeight: '500', color: 'var(--caanma-text)' }}>
              Productos filtrados: <strong>{filteredMaps.length}</strong> de {maps.length}
            </span>
          </div>
          
          <button
            onClick={handleSync}
            disabled={syncing}
            className="btn-secondary"
            style={{ 
              padding: '0.4rem 1rem', 
              fontSize: '0.85rem', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              cursor: syncing ? 'not-allowed' : 'pointer'
            }}
          >
            {syncing ? (
              <>
                <Loader2 size={16} className="animate-spin text-primary" />
                <span>Sincronizando...</span>
              </>
            ) : (
              <>
                <RefreshCw size={16} />
                <span>Forzar Sincronización Manual Ahora</span>
              </>
            )}
          </button>
          
          <button
            onClick={() => setFilters({
              name: '',
              sku: '',
              status: 'ALL',
              fixed: 'ALL',
              cost: '',
              localPrice: '',
              stock: '',
              priceMeli: '',
              comision: '',
              envio: '',
              retencion: '',
              margenD: '',
              margenP: '',
            })}
            className="btn-secondary"
            style={{ 
              padding: '0.4rem 1.25rem', 
              fontSize: '0.85rem', 
              cursor: 'pointer',
              borderColor: '#cbd5e1',
              backgroundColor: 'white',
              color: '#475569',
              fontWeight: '500'
            }}
          >
            Limpiar Filtros
          </button>
        </div>
        
        {selectedCount > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--caanma-primary)' }}>
              {selectedCount} seleccionados para publicar
            </span>
            <button 
              onClick={handleBulkPublish}
              disabled={publishing}
              className="btn-primary"
              style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}
            >
              {publishing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Publicando...
                </>
              ) : (
                '🚀 Publicar Seleccionados'
              )}
            </button>
          </div>
        )}
      </div>

      {publishProgress && (
        <div style={{ padding: '0.75rem', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Loader2 size={16} className="animate-spin" />
          {publishProgress}
        </div>
      )}

      {message && (
        <div style={{ 
          padding: '1rem', 
          borderRadius: '6px', 
          fontWeight: '500',
          fontSize: '0.9rem',
          backgroundColor: message.type === 'success' ? '#dcfce7' : '#fee2e2', 
          color: message.type === 'success' ? '#15803d' : '#b91c1c',
          border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fca5a5'}`
        }}>
          {message.text}
        </div>
      )}

      {/* Main Catalog Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--caanma-border)', color: 'var(--caanma-text-muted)', fontWeight: 'bold' }}>
              <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center', width: '40px' }}>
                <input 
                  type="checkbox"
                  checked={allUnlinkedSelected}
                  onChange={e => handleSelectAll(e.target.checked)}
                  style={{ width: '15px', height: '15px', cursor: 'pointer' }}
                  title="Seleccionar todos los productos no vinculados"
                />
              </th>
              <th onClick={() => handleSort('name')} style={{ padding: '0.75rem 0.5rem', minWidth: '150px', cursor: 'pointer', userSelect: 'none' }}>
                Producto Local {renderSortIndicator('name')}
              </th>
              <th onClick={() => handleSort('sku')} style={{ padding: '0.75rem 0.5rem', cursor: 'pointer', userSelect: 'none' }}>
                SKU {renderSortIndicator('sku')}
              </th>
              <th onClick={() => handleSort('cost')} style={{ padding: '0.75rem 0.5rem', cursor: 'pointer', userSelect: 'none' }}>
                Costo {renderSortIndicator('cost')}
              </th>
              <th onClick={() => handleSort('localPrice')} style={{ padding: '0.75rem 0.5rem', color: '#64748b', cursor: 'pointer', userSelect: 'none' }}>
                Precio Local {renderSortIndicator('localPrice')}
              </th>
              <th onClick={() => handleSort('stock')} style={{ padding: '0.75rem 0.5rem', color: '#475569', fontWeight: 'bold', cursor: 'pointer', userSelect: 'none' }}>
                Stock Caanma {renderSortIndicator('stock')}
              </th>
              <th onClick={() => handleSort('priceMeli')} style={{ padding: '0.75rem 0.5rem', color: 'var(--caanma-primary)', minWidth: '100px', cursor: 'pointer', userSelect: 'none' }}>
                Precio Venta ML {renderSortIndicator('priceMeli')}
              </th>
              <th onClick={() => handleSort('comision')} style={{ padding: '0.75rem 0.5rem', color: '#b91c1c', minWidth: '90px', cursor: 'pointer', userSelect: 'none' }}>
                Comisión Real {renderSortIndicator('comision')}
              </th>
              <th onClick={() => handleSort('envio')} style={{ padding: '0.75rem 0.5rem', color: '#3b82f6', minWidth: '90px', cursor: 'pointer', userSelect: 'none' }}>
                Costo Envío {renderSortIndicator('envio')}
              </th>
              <th onClick={() => handleSort('retencion')} style={{ padding: '0.75rem 0.5rem', color: '#8b5cf6', minWidth: '90px', cursor: 'pointer', userSelect: 'none' }}>
                Retención Imp. {renderSortIndicator('retencion')}
              </th>
              <th onClick={() => handleSort('margenD')} style={{ padding: '0.75rem 0.5rem', color: '#16a34a', minWidth: '90px', cursor: 'pointer', userSelect: 'none' }}>
                Margen ($) {renderSortIndicator('margenD')}
              </th>
              <th onClick={() => handleSort('margenP')} style={{ padding: '0.75rem 0.5rem', color: '#16a34a', minWidth: '90px', cursor: 'pointer', userSelect: 'none' }}>
                Margen (%) {renderSortIndicator('margenP')}
              </th>
              <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>Fijo?</th>
              <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>Estatus ML</th>
              <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center', minWidth: '240px' }}>Acciones</th>
            </tr>
            <tr style={{ borderBottom: '1px solid var(--caanma-border)', backgroundColor: '#f8fafc' }}>
              <th></th>
              <th style={{ padding: '0.4rem 0.25rem' }}>
                <input 
                  type="text" 
                  placeholder="Filtrar..."
                  value={filters.name}
                  onChange={e => setFilters(prev => ({ ...prev, name: e.target.value }))}
                  style={{ width: '100%', padding: '0.25rem 0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.75rem', fontWeight: 'normal', backgroundColor: 'white' }}
                />
              </th>
              <th style={{ padding: '0.4rem 0.25rem' }}>
                <input 
                  type="text" 
                  placeholder="Filtrar..."
                  value={filters.sku}
                  onChange={e => setFilters(prev => ({ ...prev, sku: e.target.value }))}
                  style={{ width: '100%', padding: '0.25rem 0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.75rem', fontWeight: 'normal', backgroundColor: 'white' }}
                />
              </th>
              <th style={{ padding: '0.4rem 0.25rem' }}>
                <input 
                  type="text" 
                  placeholder="Filtrar..."
                  value={filters.cost}
                  onChange={e => setFilters(prev => ({ ...prev, cost: e.target.value }))}
                  style={{ width: '100%', padding: '0.25rem 0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.75rem', fontWeight: 'normal', backgroundColor: 'white' }}
                />
              </th>
              <th style={{ padding: '0.4rem 0.25rem' }}>
                <input 
                  type="text" 
                  placeholder="Filtrar..."
                  value={filters.localPrice}
                  onChange={e => setFilters(prev => ({ ...prev, localPrice: e.target.value }))}
                  style={{ width: '100%', padding: '0.25rem 0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.75rem', fontWeight: 'normal', backgroundColor: 'white' }}
                />
              </th>
              <th style={{ padding: '0.4rem 0.25rem' }}>
                <input 
                  type="text" 
                  placeholder="Filtrar..."
                  value={filters.stock}
                  onChange={e => setFilters(prev => ({ ...prev, stock: e.target.value }))}
                  style={{ width: '100%', padding: '0.25rem 0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.75rem', fontWeight: 'normal', backgroundColor: 'white' }}
                />
              </th>
              <th style={{ padding: '0.4rem 0.25rem' }}>
                <input 
                  type="text" 
                  placeholder="Filtrar..."
                  value={filters.priceMeli}
                  onChange={e => setFilters(prev => ({ ...prev, priceMeli: e.target.value }))}
                  style={{ width: '100%', padding: '0.25rem 0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.75rem', fontWeight: 'normal', backgroundColor: 'white' }}
                />
              </th>
              <th style={{ padding: '0.4rem 0.25rem' }}>
                <input 
                  type="text" 
                  placeholder="Filtrar..."
                  value={filters.comision}
                  onChange={e => setFilters(prev => ({ ...prev, comision: e.target.value }))}
                  style={{ width: '100%', padding: '0.25rem 0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.75rem', fontWeight: 'normal', backgroundColor: 'white' }}
                />
              </th>
              <th style={{ padding: '0.4rem 0.25rem' }}>
                <input 
                  type="text" 
                  placeholder="Filtrar..."
                  value={filters.envio}
                  onChange={e => setFilters(prev => ({ ...prev, envio: e.target.value }))}
                  style={{ width: '100%', padding: '0.25rem 0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.75rem', fontWeight: 'normal', backgroundColor: 'white' }}
                />
              </th>
              <th style={{ padding: '0.4rem 0.25rem' }}>
                <input 
                  type="text" 
                  placeholder="Filtrar..."
                  value={filters.retencion}
                  onChange={e => setFilters(prev => ({ ...prev, retencion: e.target.value }))}
                  style={{ width: '100%', padding: '0.25rem 0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.75rem', fontWeight: 'normal', backgroundColor: 'white' }}
                />
              </th>
              <th style={{ padding: '0.4rem 0.25rem' }}>
                <input 
                  type="text" 
                  placeholder="Filtrar..."
                  value={filters.margenD}
                  onChange={e => setFilters(prev => ({ ...prev, margenD: e.target.value }))}
                  style={{ width: '100%', padding: '0.25rem 0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.75rem', fontWeight: 'normal', backgroundColor: 'white' }}
                />
              </th>
              <th style={{ padding: '0.4rem 0.25rem' }}>
                <input 
                  type="text" 
                  placeholder="Filtrar..."
                  value={filters.margenP}
                  onChange={e => setFilters(prev => ({ ...prev, margenP: e.target.value }))}
                  style={{ width: '100%', padding: '0.25rem 0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.75rem', fontWeight: 'normal', backgroundColor: 'white' }}
                />
              </th>
              <th style={{ padding: '0.4rem 0.25rem', textAlign: 'center' }}>
                <select 
                  value={filters.fixed}
                  onChange={e => setFilters(prev => ({ ...prev, fixed: e.target.value }))}
                  style={{ width: '100%', padding: '0.25rem 0.2rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.75rem', fontWeight: 'normal', backgroundColor: 'white' }}
                >
                  <option value="ALL">-</option>
                  <option value="yes">SÍ</option>
                  <option value="no">NO</option>
                </select>
              </th>
              <th style={{ padding: '0.4rem 0.25rem', textAlign: 'center' }}>
                <select 
                  value={filters.status}
                  onChange={e => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  style={{ width: '100%', padding: '0.25rem 0.2rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.75rem', fontWeight: 'normal', backgroundColor: 'white' }}
                >
                  <option value="ALL">-</option>
                  <option value="linked">Vinculados</option>
                  <option value="unlinked">No vinculados</option>
                  <option value="meli_unlinked">Sin vincular</option>
                  <option value="active">Activos</option>
                  <option value="paused">Pausados</option>
                </select>
              </th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredMaps.length === 0 ? (
              <tr>
                <td colSpan={15} style={{ textAlign: 'center', padding: '3rem', color: 'var(--caanma-text-muted)', fontWeight: '500' }}>
                  No se encontraron productos que coincidan con los filtros seleccionados.
                </td>
              </tr>
            ) : (
              filteredMaps.map((map) => {
                const p = map.product;
                const isEditing = editingId === map.id;
                const isSaving = savingId === map.id;
                const isUnlinked = map.syncStatus === 'unlinked';
                const isMeliUnlinked = map.syncStatus === 'meli_unlinked';

                // Display values
                const dPrecio = map.precioMeli !== null && map.precioMeli !== undefined ? map.precioMeli : p.price;
                const dComision = map.comisionMeli || 0;
                const dEnvio = map.envioMeli || 0;
                const dRetencion = map.retencionMeli || 0;
                const dMargenD = map.margenDinero !== null && map.margenDinero !== undefined ? map.margenDinero : (dPrecio - p.cost - dComision - dEnvio - dRetencion);
                const dMargenP = map.margenPorcentaje !== null && map.margenPorcentaje !== undefined ? map.margenPorcentaje : (dPrecio > 0 ? (dMargenD / dPrecio) * 100 : 0);

                // Stock resolution for unlinked ML items when linked product is chosen
                const linkedProductObj = selectedRowProduct[map.externalId];
                const displayStock = linkedProductObj ? linkedProductObj.stock : p.stock;

                return (
                  <tr key={map.id} style={{ 
                    borderBottom: '1px solid var(--caanma-border)', 
                    backgroundColor: isEditing ? '#f8fafc' : 'transparent',
                    transition: 'background-color 0.2s'
                  }}>
                    {/* Checkbox (only for Caanma unlinked products) */}
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                      {isUnlinked ? (
                        <input 
                          type="checkbox"
                          checked={!!selectedIds[p.id]}
                          onChange={() => toggleSelect(p.id)}
                          style={{ width: '15px', height: '15px', cursor: 'pointer' }}
                        />
                      ) : (
                        <span style={{ color: '#cbd5e1' }}>-</span>
                      )}
                    </td>

                    {/* Name */}
                    <td style={{ padding: '0.75rem 0.5rem', fontWeight: '500' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span>{p.name}</span>
                        {map.externalId && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--caanma-text-muted)' }}>
                            ID: <a href={`https://articulo.mercadolibre.com.mx/${map.externalId.replace('MLM', 'MLM-')}`} target="_blank" rel="noreferrer" style={{ color: 'var(--caanma-primary)', textDecoration: 'none' }}>{map.externalId} <ExternalLink size={10} style={{ display: 'inline' }} /></a>
                          </span>
                        )}
                      </div>
                    </td>

                    {/* SKU */}
                    <td style={{ padding: '0.75rem 0.5rem', color: 'var(--caanma-text-muted)' }}>
                      {isMeliUnlinked ? (
                        <span style={{ fontWeight: '500', color: '#0369a1' }}>{p.sku}</span>
                      ) : (
                        p.sku || <span style={{ color: '#ef4444', fontStyle: 'italic', fontSize: '0.75rem' }}>Falta SKU</span>
                      )}
                    </td>

                    {/* Cost */}
                    <td style={{ padding: '0.75rem 0.5rem' }}>{isMeliUnlinked ? '-' : `$${p.cost.toFixed(2)}`}</td>

                    {/* Price Local */}
                    <td style={{ padding: '0.75rem 0.5rem', color: '#64748b' }}>{isMeliUnlinked ? '-' : `$${p.price.toFixed(2)}`}</td>

                    {/* Stock Caanma */}
                    <td style={{ padding: '0.75rem 0.5rem', fontWeight: '500', color: '#475569' }}>
                      {isMeliUnlinked ? (
                        linkedProductObj ? (
                          <span style={{ color: '#16a34a', fontWeight: 'bold' }}>{displayStock} pzs</span>
                        ) : (
                          <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No asignado</span>
                        )
                      ) : (
                        `${p.stock} pzs`
                      )}
                    </td>

                    {/* Dynamic rendering depending on whether it is an unlinked ML item or Caanma item */}
                    {isMeliUnlinked ? (
                      <td colSpan={7} style={{ padding: '0.5rem 0.25rem', position: 'relative' }}>
                        {linkedProductObj ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#e0f2fe', padding: '0.35rem 0.5rem', borderRadius: '4px', border: '1px solid #bae6fd' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#0369a1', flex: 1 }}>
                              Vinculando a: <strong style={{ color: '#0284c7' }}>{linkedProductObj.sku ? `[${linkedProductObj.sku}] ` : ''}</strong> {linkedProductObj.name}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedRowProduct(prev => {
                                  const next = { ...prev };
                                  delete next[map.externalId];
                                  return next;
                                });
                                setRowLinkProductId(prev => {
                                  const next = { ...prev };
                                  delete next[map.externalId];
                                  return next;
                                });
                              }}
                              style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', backgroundColor: 'white', fontWeight: 'bold' }}
                            >
                              Cambiar
                            </button>
                          </div>
                        ) : (
                          <div style={{ position: 'relative' }}>
                            <input
                              type="text"
                              placeholder="Escribe 2+ letras para buscar por nombre o SKU de Caanma..."
                              value={rowSearchVal[map.externalId] || ''}
                              onChange={e => handleSearchRowProduct(map.externalId, e.target.value)}
                              style={{ width: '100%', padding: '0.4rem 0.5rem 0.4rem 1.75rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem', backgroundColor: 'white' }}
                            />
                            <Search size={12} style={{ position: 'absolute', left: '0.5rem', top: '0.65rem', color: '#94a3b8' }} />
                            {rowSearching[map.externalId] && (
                              <Loader2 size={12} className="animate-spin" style={{ position: 'absolute', right: '0.5rem', top: '0.65rem', color: '#94a3b8' }} />
                            )}
                            
                            {/* Search results list popup */}
                            {rowSearchResults[map.externalId] && rowSearchResults[map.externalId].length > 0 && (
                              <div style={{ position: 'absolute', left: 0, right: 0, top: '100%', zIndex: 100, backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '4px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', maxHeight: '180px', overflowY: 'auto', marginTop: '2px' }}>
                                {rowSearchResults[map.externalId].map((cp: any) => (
                                  <div
                                    key={cp.id}
                                    onClick={() => {
                                      setSelectedRowProduct(prev => ({ ...prev, [map.externalId]: cp }));
                                      setRowLinkProductId(prev => ({ ...prev, [map.externalId]: cp.id }));
                                      setRowSearchResults(prev => ({ ...prev, [map.externalId]: [] })); // Clear list
                                      setRowSearchVal(prev => ({ ...prev, [map.externalId]: '' })); // Clear input
                                    }}
                                    style={{ padding: '0.5rem', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', fontSize: '0.8rem' }}
                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                  >
                                    <div style={{ fontWeight: 'bold', color: '#1e293b' }}>{cp.sku ? `[SKU: ${cp.sku}] ` : ''}{cp.name}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Stock sumado: {cp.stock} pzs</div>
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {rowSearchVal[map.externalId]?.trim().length >= 2 && !rowSearching[map.externalId] && (!rowSearchResults[map.externalId] || rowSearchResults[map.externalId].length === 0) && (
                              <div style={{ position: 'absolute', left: 0, right: 0, top: '100%', zIndex: 100, backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '0.5rem', fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                                No se encontraron coincidencias.
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    ) : (
                      <>
                        {/* Precio Venta ML */}
                        <td style={{ padding: '0.5rem 0.25rem' }}>
                          {isEditing ? (
                            <input 
                              type="number" 
                              step="0.01"
                              value={formData.precioMeli}
                              onChange={e => handleFieldChange('precioMeli', parseFloat(e.target.value) || 0, p.cost)}
                              style={{ width: '85px', padding: '0.35rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}
                            />
                          ) : (
                            <span style={{ fontWeight: 'bold', color: isUnlinked ? '#94a3b8' : 'var(--caanma-primary)' }}>
                              {isUnlinked ? '-' : `$${dPrecio.toFixed(2)}`}
                            </span>
                          )}
                        </td>

                        {/* Comisión Real */}
                        <td style={{ padding: '0.5rem 0.25rem' }}>
                          {isEditing ? (
                            <input 
                              type="number" 
                              step="0.01"
                              value={formData.comisionMeli}
                              onChange={e => handleFieldChange('comisionMeli', parseFloat(e.target.value) || 0, p.cost)}
                              style={{ width: '75px', padding: '0.35rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                            />
                          ) : (
                            <span>{isUnlinked ? '-' : `$${dComision.toFixed(2)}`}</span>
                          )}
                        </td>

                        {/* Costo Envío */}
                        <td style={{ padding: '0.5rem 0.25rem' }}>
                          {isEditing ? (
                            <input 
                              type="number" 
                              step="0.01"
                              value={formData.envioMeli}
                              onChange={e => handleFieldChange('envioMeli', parseFloat(e.target.value) || 0, p.cost)}
                              style={{ width: '75px', padding: '0.35rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                            />
                          ) : (
                            <span>{isUnlinked ? '-' : `$${dEnvio.toFixed(2)}`}</span>
                          )}
                        </td>

                        {/* Retención Imp. */}
                        <td style={{ padding: '0.5rem 0.25rem' }}>
                          {isEditing ? (
                            <input 
                              type="number" 
                              step="0.01"
                              value={formData.retencionMeli}
                              onChange={e => handleFieldChange('retencionMeli', parseFloat(e.target.value) || 0, p.cost)}
                              style={{ width: '75px', padding: '0.35rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                            />
                          ) : (
                            <span>{isUnlinked ? '-' : `$${dRetencion.toFixed(2)}`}</span>
                          )}
                        </td>

                        {/* Margen ($) */}
                        <td style={{ padding: '0.5rem 0.25rem' }}>
                          {isEditing ? (
                            <input 
                              type="number" 
                              step="0.01"
                              value={formData.margenDinero}
                              onChange={e => handleFieldChange('margenDinero', parseFloat(e.target.value) || 0, p.cost)}
                              style={{ width: '75px', padding: '0.35rem', borderRadius: '4px', border: '1px solid #cbd5e1', color: '#16a34a', fontWeight: '500' }}
                            />
                          ) : (
                            <span style={{ color: isUnlinked ? '#94a3b8' : (dMargenD >= 0 ? '#16a34a' : '#ef4444'), fontWeight: '500' }}>
                              {isUnlinked ? '-' : `$${dMargenD.toFixed(2)}`}
                            </span>
                          )}
                        </td>

                        {/* Margen (%) */}
                        <td style={{ padding: '0.5rem 0.25rem' }}>
                          {isEditing ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <input 
                                type="number" 
                                step="0.1"
                                value={formData.margenPorcentaje}
                                onChange={e => handleFieldChange('margenPorcentaje', parseFloat(e.target.value) || 0, p.cost)}
                                style={{ width: '65px', padding: '0.35rem', borderRadius: '4px', border: '1px solid #cbd5e1', color: '#16a34a', fontWeight: '500' }}
                              />
                              <span>%</span>
                            </div>
                          ) : (
                            <span style={{ color: isUnlinked ? '#94a3b8' : (dMargenP >= 0 ? '#16a34a' : '#ef4444'), fontWeight: '500' }}>
                              {isUnlinked ? '-' : `${dMargenP.toFixed(1)}%`}
                            </span>
                          )}
                        </td>

                        {/* Fijo? */}
                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                          {isUnlinked ? (
                            <span style={{ color: '#cbd5e1' }}>-</span>
                          ) : isEditing ? (
                            <input 
                              type="checkbox"
                              checked={formData.isFixedPrice}
                              onChange={e => setFormData(prev => ({ ...prev, isFixedPrice: e.target.checked }))}
                              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                            />
                          ) : (
                            <span style={{ 
                              display: 'inline-block', 
                              padding: '0.1rem 0.35rem', 
                              borderRadius: '4px', 
                              fontSize: '0.7rem', 
                              fontWeight: 'bold',
                              backgroundColor: map.isFixedPrice ? '#fef3c7' : '#f1f5f9',
                              color: map.isFixedPrice ? '#d97706' : '#64748b'
                            }}>
                              {map.isFixedPrice ? 'SÍ' : 'NO'}
                            </span>
                          )}
                        </td>
                      </>
                    )}

                    {/* Status badge */}
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                      {getStatusBadge(map.syncStatus)}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                      {isMeliUnlinked ? (
                        <button
                          onClick={async () => {
                            const targetPid = rowLinkProductId[map.externalId];
                            if (!targetPid) return;
                            setSavingId(map.externalId);
                            setMessage(null);
                            const res = await linkMeliItemToProduct(map.externalId, targetPid);
                            setSavingId(null);
                            if (res.success) {
                              const linkedProd = selectedRowProduct[map.externalId];
                              setMaps(prev => prev.map(m => m.externalId === map.externalId ? {
                                ...m,
                                productId: targetPid,
                                syncStatus: 'active',
                                product: {
                                  ...m.product,
                                  id: targetPid,
                                  name: linkedProd?.name || m.product.name,
                                  sku: linkedProd?.sku || m.product.sku,
                                  stock: linkedProd?.stock || 0
                                }
                              } : m));
                              setMessage({ type: 'success', text: `¡Publicación vinculada al producto '${linkedProd?.name || ''}' con éxito!` });
                            } else {
                              setMessage({ type: 'error', text: res.error || 'Error al vincular.' });
                            }
                            setTimeout(() => setMessage(null), 4000);
                          }}
                          disabled={savingId === map.externalId || !rowLinkProductId[map.externalId]}
                          className="btn-primary"
                          style={{ 
                            padding: '0.4rem 0.75rem', 
                            borderRadius: '4px', 
                            fontSize: '0.75rem', 
                            fontWeight: 'bold',
                            opacity: rowLinkProductId[map.externalId] ? 1 : 0.5,
                            cursor: rowLinkProductId[map.externalId] ? 'pointer' : 'not-allowed'
                          }}
                        >
                          {savingId === map.externalId ? <Loader2 size={12} className="animate-spin" /> : 'Vincular'}
                        </button>
                      ) : isUnlinked ? (
                        <button 
                          onClick={async () => {
                            setSavingId(p.id);
                            setMessage(null);
                            const res = await publishProductToMeli(p.id);
                            setSavingId(null);
                            if (res.success) {
                              setMaps(prev => prev.map(m => m.productId === p.id ? {
                                ...m,
                                id: res.externalId,
                                externalId: res.externalId,
                                syncStatus: 'active',
                                precioMeli: p.price,
                                margenDinero: p.price - p.cost,
                                margenPorcentaje: p.price > 0 ? (((p.price - p.cost) / p.price) * 100) : 0,
                              } : m));
                              setMessage({ type: 'success', text: `¡Producto '${p.name}' publicado en Mercado Libre con éxito!` });
                            } else {
                              setMessage({ type: 'error', text: res.error || 'Error al publicar en Mercado Libre.' });
                            }
                            setTimeout(() => setMessage(null), 4000);
                          }}
                          disabled={savingId === p.id || !p.sku}
                          className="btn-primary"
                          style={{ 
                            padding: '0.4rem 0.75rem', 
                            borderRadius: '4px', 
                            fontSize: '0.75rem', 
                            fontWeight: 'bold', 
                            opacity: p.sku ? 1 : 0.5, 
                            cursor: p.sku ? 'pointer' : 'not-allowed',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
                          title={!p.sku ? 'Configura un SKU para el producto antes de publicar' : 'Publicar este producto en Mercado Libre'}
                        >
                          {savingId === p.id ? <Loader2 size={12} className="animate-spin" /> : 'Publicar'}
                        </button>
                      ) : isEditing ? (
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                          <button 
                            onClick={() => handleSave(map.id)}
                            disabled={isSaving}
                            className="btn-primary"
                            style={{ padding: '0.4rem 0.6rem', borderRadius: '4px', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                          </button>
                          <button 
                            onClick={cancelEditing}
                            disabled={isSaving}
                            style={{ padding: '0.4rem 0.6rem', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: 'white', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', justifyContent: 'center', flexWrap: 'nowrap' }}>
                          <button 
                            onClick={() => startEditing(map)}
                            style={{ padding: '0.35rem 0.6rem', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: 'white', color: '#334155', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 'bold' }}
                            title="Editar precios y márgenes de la publicación"
                          >
                            <Edit2 size={12} /> Editar
                          </button>

                          {map.syncStatus === 'paused' ? (
                            <button
                              onClick={() => handleStatusChange(map.id, 'active')}
                              disabled={statusUpdatingId === map.id}
                              style={{ padding: '0.35rem 0.6rem', borderRadius: '4px', border: '1px solid #bbf7d0', backgroundColor: '#f0fdf4', color: '#16a34a', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 'bold' }}
                              title="Activar publicación en Mercado Libre"
                            >
                              {statusUpdatingId === map.id ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />} Activar
                            </button>
                          ) : map.syncStatus === 'active' ? (
                            <button
                              onClick={() => handleStatusChange(map.id, 'paused')}
                              disabled={statusUpdatingId === map.id}
                              style={{ padding: '0.35rem 0.6rem', borderRadius: '4px', border: '1px solid #fde68a', backgroundColor: '#fffbeb', color: '#d97706', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 'bold' }}
                              title="Pausar publicación en Mercado Libre"
                            >
                              {statusUpdatingId === map.id ? <Loader2 size={12} className="animate-spin" /> : <Pause size={12} />} Pausar
                            </button>
                          ) : null}

                          {map.syncStatus !== 'closed' && (
                            <button
                              onClick={() => handleStatusChange(map.id, 'closed')}
                              disabled={statusUpdatingId === map.id}
                              style={{ padding: '0.35rem 0.5rem', borderRadius: '4px', border: '1px solid #e2e8f0', backgroundColor: 'white', color: '#64748b', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.75rem' }}
                              title="Finalizar publicación en Mercado Libre"
                            >
                              <Archive size={12} /> Finalizar
                            </button>
                          )}

                          <button
                            onClick={() => handleStatusChange(map.id, 'delete')}
                            disabled={statusUpdatingId === map.id}
                            style={{ padding: '0.35rem 0.5rem', borderRadius: '4px', border: '1px solid #fecaca', backgroundColor: '#fef2f2', color: '#dc2626', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.75rem' }}
                            title="Eliminar publicación de Mercado Libre y Caanma"
                          >
                            <Trash2 size={12} /> Eliminar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
