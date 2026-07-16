'use client';

import React, { useState, useMemo } from 'react';
import { saveMeliProductPricing, publishProductToMeli } from '@/app/actions/integration';
import { Save, Edit2, X, Check, Loader2, ExternalLink, Search, Globe } from 'lucide-react';

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

  // Column filter state
  const [filters, setFilters] = useState({
    name: '',
    sku: '',
    status: 'ALL', // ALL, linked, unlinked, active, paused
    fixed: 'ALL', // ALL, yes, no
  });

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
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filtered maps memoized
  const filteredMaps = useMemo(() => {
    return maps.filter(map => {
      // 1. Name Filter
      const nameMatch = map.product.name.toLowerCase().includes(filters.name.toLowerCase());
      
      // 2. SKU Filter
      const skuMatch = (map.product.sku || '').toLowerCase().includes(filters.sku.toLowerCase());
      
      // 3. Status Filter
      let statusMatch = true;
      if (filters.status === 'linked') {
        statusMatch = map.syncStatus !== 'unlinked';
      } else if (filters.status === 'unlinked') {
        statusMatch = map.syncStatus === 'unlinked';
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
        fixedMatch = map.isFixedPrice === false && map.syncStatus !== 'unlinked';
      }

      return nameMatch && skuMatch && statusMatch && fixedMatch;
    });
  }, [maps, filters]);

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Globe size={20} className="text-primary" />
          <span style={{ fontWeight: '500', color: 'var(--caanma-text)' }}>
            Productos filtrados: <strong>{filteredMaps.length}</strong> de {maps.length}
          </span>
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

      {/* Grid containing filters on top (Alternative to table inputs) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', padding: '1rem', backgroundColor: '#f1f5f9', borderRadius: '8px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.25rem' }}>Buscar Producto</label>
          <div style={{ position: 'relative' }}>
            <input 
              type="text" 
              placeholder="Filtro de nombre..."
              value={filters.name}
              onChange={e => setFilters(prev => ({ ...prev, name: e.target.value }))}
              style={{ width: '100%', padding: '0.4rem 0.5rem 0.4rem 1.75rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
            />
            <Search size={12} style={{ position: 'absolute', left: '0.5rem', top: '0.6rem', color: '#94a3b8' }} />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.25rem' }}>Buscar SKU</label>
          <div style={{ position: 'relative' }}>
            <input 
              type="text" 
              placeholder="Filtro de SKU..."
              value={filters.sku}
              onChange={e => setFilters(prev => ({ ...prev, sku: e.target.value }))}
              style={{ width: '100%', padding: '0.4rem 0.5rem 0.4rem 1.75rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
            />
            <Search size={12} style={{ position: 'absolute', left: '0.5rem', top: '0.6rem', color: '#94a3b8' }} />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.25rem' }}>Estatus Mercado Libre</label>
          <select 
            value={filters.status}
            onChange={e => setFilters(prev => ({ ...prev, status: e.target.value }))}
            style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem', backgroundColor: 'white' }}
          >
            <option value="ALL">Todos los estatus</option>
            <option value="linked">Vinculados</option>
            <option value="unlinked">No vinculados</option>
            <option value="active">Activos en ML</option>
            <option value="paused">Pausados en ML</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.25rem' }}>Fijado de Precios</label>
          <select 
            value={filters.fixed}
            onChange={e => setFilters(prev => ({ ...prev, fixed: e.target.value }))}
            style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem', backgroundColor: 'white' }}
          >
            <option value="ALL">Todos los precios</option>
            <option value="yes">Precio Fijo (SÍ)</option>
            <option value="no">Recalcular (NO)</option>
          </select>
        </div>
      </div>

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
              <th style={{ padding: '0.75rem 0.5rem', minWidth: '150px' }}>Producto Local</th>
              <th style={{ padding: '0.75rem 0.5rem' }}>SKU</th>
              <th style={{ padding: '0.75rem 0.5rem' }}>Costo</th>
              <th style={{ padding: '0.75rem 0.5rem', color: '#64748b' }}>Precio Local</th>
              <th style={{ padding: '0.75rem 0.5rem', color: 'var(--caanma-primary)', minWidth: '100px' }}>Precio Venta ML</th>
              <th style={{ padding: '0.75rem 0.5rem', color: '#b91c1c', minWidth: '90px' }}>Comisión Real</th>
              <th style={{ padding: '0.75rem 0.5rem', color: '#3b82f6', minWidth: '90px' }}>Costo Envío</th>
              <th style={{ padding: '0.75rem 0.5rem', color: '#8b5cf6', minWidth: '90px' }}>Retención Imp.</th>
              <th style={{ padding: '0.75rem 0.5rem', color: '#16a34a', minWidth: '90px' }}>Margen ($)</th>
              <th style={{ padding: '0.75rem 0.5rem', color: '#16a34a', minWidth: '90px' }}>Margen (%)</th>
              <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>Fijo?</th>
              <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>Estatus ML</th>
              <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center', minWidth: '100px' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredMaps.length === 0 ? (
              <tr>
                <td colSpan={14} style={{ textAlign: 'center', padding: '3rem', color: 'var(--caanma-text-muted)', fontWeight: '500' }}>
                  No se encontraron productos que coincidan con los filtros seleccionados.
                </td>
              </tr>
            ) : (
              filteredMaps.map((map) => {
                const p = map.product;
                const isEditing = editingId === map.id;
                const isSaving = savingId === map.id;
                const isUnlinked = map.syncStatus === 'unlinked';

                // Display values
                const dPrecio = map.precioMeli !== null && map.precioMeli !== undefined ? map.precioMeli : p.price;
                const dComision = map.comisionMeli || 0;
                const dEnvio = map.envioMeli || 0;
                const dRetencion = map.retencionMeli || 0;
                const dMargenD = map.margenDinero !== null && map.margenDinero !== undefined ? map.margenDinero : (dPrecio - p.cost - dComision - dEnvio - dRetencion);
                const dMargenP = map.margenPorcentaje !== null && map.margenPorcentaje !== undefined ? map.margenPorcentaje : (dPrecio > 0 ? (dMargenD / dPrecio) * 100 : 0);

                return (
                  <tr key={map.id} style={{ 
                    borderBottom: '1px solid var(--caanma-border)', 
                    backgroundColor: isEditing ? '#f8fafc' : 'transparent',
                    transition: 'background-color 0.2s'
                  }}>
                    {/* Checkbox (only for unlinked products) */}
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
                        {!isUnlinked && map.externalId && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--caanma-text-muted)' }}>
                            ID: <a href={`https://articulo.mercadolibre.com.mx/${map.externalId.replace('MLM', 'MLM-')}`} target="_blank" rel="noreferrer" style={{ color: 'var(--caanma-primary)', textDecoration: 'none' }}>{map.externalId} <ExternalLink size={10} style={{ display: 'inline' }} /></a>
                          </span>
                        )}
                      </div>
                    </td>

                    {/* SKU */}
                    <td style={{ padding: '0.75rem 0.5rem', color: 'var(--caanma-text-muted)' }}>{p.sku || <span style={{ color: '#ef4444', fontStyle: 'italic', fontSize: '0.75rem' }}>Falta SKU</span>}</td>

                    {/* Cost */}
                    <td style={{ padding: '0.75rem 0.5rem' }}>${p.cost.toFixed(2)}</td>

                    {/* Price Local */}
                    <td style={{ padding: '0.75rem 0.5rem', color: '#64748b' }}>${p.price.toFixed(2)}</td>

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

                    {/* Status badge */}
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                      {getStatusBadge(map.syncStatus)}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                      {isUnlinked ? (
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
                        <button 
                          onClick={() => startEditing(map)}
                          style={{ padding: '0.4rem 0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: 'white', color: 'var(--caanma-text)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 'bold' }}
                        >
                          <Edit2 size={12} /> Editar
                        </button>
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
